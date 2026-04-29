import "server-only";
import { Redis } from "@upstash/redis";

import { resolveTurn, checkWinCondition } from "./engine";
import {
  persistBattleCreate,
  persistBattleEnd,
  persistBattlePhase,
  persistTurn,
} from "./persist";
import type { BattleSide, BattleState, Intent } from "./types";
import type { BattleWager } from "@/lib/db/schema";
import type { SlimTurnDelta } from "@/lib/realtime/events";
import { publishBattleEvent } from "@/lib/realtime/server";

function slimStateFor(state: BattleState): SlimTurnDelta {
  return {
    turn: state.turn,
    winnerId: state.winnerId,
    sides: state.sides.map((s) => ({
      playerId: s.playerId,
      activeIndex: s.activeIndex,
      team: s.team.map((c) => ({
        cardId: c.cardId,
        currentHp: c.currentHp,
        status: c.status,
        confusionTurnsLeft: c.volatile.confusionTurnsLeft,
        sleepTurnsLeft: c.volatile.sleepTurnsLeft,
        ppLeft: c.moves.map((m) => m.ppLeft),
        currentEnergy: c.currentEnergy ?? 0,
      })),
    })) as SlimTurnDelta["sides"],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis-backed battle session store
//
// State lives in Upstash Redis so it's fast, shared across serverless
// invocations, and ephemeral by design. Final battle state is persisted to
// Postgres by the `battle-history` skill when a battle ends.
//
// Key schema:
//   battle:<id>          → JSON BattleState (with version)
//   battle:<id>:intent:<turn>:<playerId> → JSON Intent (per-turn inbox)
//
// Invariants
// - Client NEVER writes state directly; only intents.
// - Every state transition goes through `submitIntent` → engine → CAS → publish.
// - Concurrent writers collide on the version number and one retries.
// ─────────────────────────────────────────────────────────────────────────────

export const BATTLE_TTL_SECONDS = 60 * 60 * 2; // 2h — plenty of slack for a full battle
export const TURN_TIMER_MS = 45_000;
export const RECONNECT_GRACE_MS = 60_000;

let redisClient: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function redis(): Redis {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis env missing — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN",
    );
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

// ── State is versioned so we can compare-and-set without a Lua script ──────

export type BattlePhase = "awaiting_opponent" | "live" | "ended";

export type VersionedState = BattleState & {
  version: number;
  deadlineMs: number;
  phase: BattlePhase;
  /** If phase=awaiting_opponent, this is the user (id OR email) we're waiting on. */
  pendingOpponent: { userId?: string; email?: string } | null;
};

const stateKey = (battleId: string) => `battle:${battleId}`;
const intentKey = (battleId: string, turn: number, playerId: string) =>
  `battle:${battleId}:intent:${turn}:${playerId}`;

export async function getState(battleId: string): Promise<VersionedState | null> {
  const raw = await redis().get<VersionedState>(stateKey(battleId));
  return raw ?? null;
}

export async function setState(
  battleId: string,
  state: VersionedState,
): Promise<void> {
  await redis().set(stateKey(battleId), state, { ex: BATTLE_TTL_SECONDS });
}

/**
 * Compare-and-set. Succeeds iff Redis currently holds `expected.version` for
 * this battle. Uses Upstash's EVAL to do the read-check-write atomically.
 */
export async function cas(
  battleId: string,
  expectedVersion: number,
  next: VersionedState,
): Promise<{ ok: boolean; currentVersion?: number }> {
  const script = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return {-1} end
    local ok, parsed = pcall(cjson.decode, raw)
    if not ok then return {-2} end
    if parsed.version ~= tonumber(ARGV[1]) then
      return {parsed.version}
    end
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
    return {tonumber(ARGV[1]) + 1}
  `;
  const res = (await redis().eval(
    script,
    [stateKey(battleId)],
    [String(expectedVersion), JSON.stringify(next), String(BATTLE_TTL_SECONDS)],
  )) as number[];
  const observedVersion = res[0];
  if (observedVersion === -1 || observedVersion === -2) {
    return { ok: false };
  }
  if (observedVersion === expectedVersion + 1) {
    return { ok: true, currentVersion: observedVersion };
  }
  return { ok: false, currentVersion: observedVersion };
}

// ── Participant lookup (used by the Pusher auth route) ──────────────────────

export async function getParticipants(battleId: string): Promise<string[]> {
  const state = await getState(battleId);
  if (!state) return [];
  return state.sides.map((s) => s.playerId);
}

export async function isBattleParticipant(
  battleId: string,
  userId: string,
): Promise<boolean> {
  const ids = await getParticipants(battleId);
  return ids.includes(userId);
}

// ── Battle lifecycle ────────────────────────────────────────────────────────

export async function createBattle(
  battleId: string,
  state: BattleState,
  wager?: BattleWager | null,
): Promise<VersionedState> {
  const initial: VersionedState = {
    ...state,
    version: 0,
    deadlineMs: Date.now() + TURN_TIMER_MS,
    phase: "live",
    pendingOpponent: null,
  };
  await setState(battleId, initial);
  await persistBattleCreate({
    battleId,
    p1Id: state.sides[0].playerId,
    p2Id: realPlayerId(state.sides[1].playerId),
    rngSeed: state.rngSeed,
    initialState: state,
    wager,
  });
  await publishBattleEvent(battleId, {
    kind: "turn-start",
    turn: initial.turn,
    deadlineMs: initial.deadlineMs,
  });
  return initial;
}

/**
 * Skip persisting `mirror:<id>` and `pending:<email>` pseudo-player-ids
 * to the DB fk column — they reference nothing.
 */
function realPlayerId(id: string): string | null {
  if (id.startsWith("mirror:")) return null;
  if (id.startsWith("pending:")) return null;
  return id;
}

/**
 * Create a battle that's waiting for the opponent to accept. Side 0 is
 * the challenger (fully hydrated), side 1 is a placeholder with only
 * playerId = opponent's userId (or email-pending lookup).
 */
export async function createPendingBattle(
  battleId: string,
  state: BattleState,
  pendingOpponent: { userId?: string; email?: string },
  wager?: BattleWager | null,
): Promise<VersionedState> {
  const initial: VersionedState = {
    ...state,
    version: 0,
    deadlineMs: 0,
    phase: "awaiting_opponent",
    pendingOpponent,
  };
  await setState(battleId, initial);
  await persistBattleCreate({
    battleId,
    p1Id: state.sides[0].playerId,
    p2Id: realPlayerId(state.sides[1].playerId),
    rngSeed: state.rngSeed,
    initialState: state,
    wager,
    phase: "awaiting_opponent",
  });
  return initial;
}

/**
 * Opponent accepts the challenge — fill side 1 and flip phase to live.
 * Returns { ok: false } if the battle is in the wrong state.
 */
export async function joinPendingBattle(
  battleId: string,
  userId: string,
  opponentSide: BattleState["sides"][number],
): Promise<{ ok: true; state: VersionedState } | { ok: false; reason: string }> {
  const state = await getState(battleId);
  if (!state) return { ok: false, reason: "no-such-battle" };
  if (state.phase !== "awaiting_opponent") {
    return { ok: false, reason: "wrong-phase" };
  }
  const pending = state.pendingOpponent;
  if (pending?.userId && pending.userId !== userId) {
    return { ok: false, reason: "not-invited" };
  }

  const next: VersionedState = {
    ...state,
    sides: [state.sides[0], { ...opponentSide, playerId: userId }] as BattleState["sides"],
    phase: "live",
    version: state.version + 1,
    deadlineMs: Date.now() + TURN_TIMER_MS,
    pendingOpponent: null,
  };
  const casRes = await cas(battleId, state.version, next);
  if (!casRes.ok) return { ok: false, reason: "race-lost" };

  // Mirror Redis phase to Postgres so the pending-challenge banner stops
  // showing this battle as awaiting.
  await persistBattlePhase(battleId, "live");

  await publishBattleEvent(battleId, {
    kind: "turn-start",
    turn: next.turn,
    deadlineMs: next.deadlineMs,
  });
  return { ok: true, state: next };
}

// ── Per-turn intent inbox ──────────────────────────────────────────────────

export async function submitIntent(
  battleId: string,
  userId: string,
  intent: Intent,
): Promise<{ status: "queued" | "resolved" | "rejected"; reason?: string }> {
  const state = await getState(battleId);
  if (!state) return { status: "rejected", reason: "no-such-battle" };
  if (state.winnerId) return { status: "rejected", reason: "battle-ended" };
  if (intent.playerId !== userId) {
    return { status: "rejected", reason: "cannot-play-for-other-player" };
  }
  if (!state.sides.some((s) => s.playerId === userId)) {
    return { status: "rejected", reason: "not-a-participant" };
  }

  // Stash this player's intent for this turn (overwrites any prior intent
  // from the same player — they're allowed to change their mind until the
  // opponent locks in).
  const key = intentKey(battleId, state.turn, userId);
  await redis().set(key, intent, { ex: 5 * 60 });

  // Solo-test (mirror) battles: auto-submit a random intent for the mirror side
  // so there's actually someone to fight. Detected by the `mirror:` playerId prefix.
  const mirrorSide = state.sides.find((s) => s.playerId.startsWith("mirror:"));
  if (mirrorSide) {
    const mirrorIntent = pickRandomAiIntent(mirrorSide);
    const mirrorKey = intentKey(battleId, state.turn, mirrorSide.playerId);
    await redis().set(mirrorKey, mirrorIntent, { ex: 5 * 60 });
  }

  // Do we have both players' intents now?
  const keys = state.sides.map((s) => intentKey(battleId, state.turn, s.playerId));
  const [a, b] = await redis().mget<Intent[]>(...keys);
  if (!a || !b) return { status: "queued" };

  // Both in — resolve the turn (with CAS to handle concurrent resolution attempts).
  const result = resolveTurn(state, [a, b]);
  const next: VersionedState = {
    ...result.newState,
    version: state.version + 1,
    deadlineMs: Date.now() + TURN_TIMER_MS,
    phase: result.newState.winnerId ? "ended" : "live",
    pendingOpponent: null,
  };
  const casRes = await cas(battleId, state.version, next);
  if (!casRes.ok) {
    // Another worker won the race — it already published turn-resolved.
    return { status: "queued", reason: "race-lost" };
  }

  // Clear per-turn inbox so the next turn starts fresh.
  await redis().del(...keys);

  // Persist this turn to Postgres for replay.
  await persistTurn(battleId, {
    turn: state.turn,
    events: result.events,
    stateAfter: result.newState,
  });

  if (next.winnerId) {
    await persistBattleEnd(battleId, result.newState);
    await publishBattleEvent(battleId, {
      kind: "battle-ended",
      winnerId: next.winnerId,
    });
  } else {
    await publishBattleEvent(battleId, {
      kind: "turn-start",
      turn: next.turn,
      deadlineMs: next.deadlineMs,
    });
  }

  return { status: "resolved" };
}

// ── Turn timer enforcement ─────────────────────────────────────────────────
//
// Enforcement is pull-based: a cron job or Vercel Cron hits
// `/api/battle/sweep-timeouts` which calls `enforceTurnTimeout` for each
// active battle. If the deadline has passed and only one player has
// submitted, the slacker auto-forfeits. If neither has, the match is a draw.
// (Upstash QStash could push-trigger this later — same handler works.)

export async function enforceTurnTimeout(battleId: string): Promise<
  | { status: "still-live" }
  | { status: "forfeit"; forfeiterId: string }
  | { status: "battle-already-ended" }
  | { status: "no-such-battle" }
> {
  const state = await getState(battleId);
  if (!state) return { status: "no-such-battle" };
  if (state.winnerId) return { status: "battle-already-ended" };
  if (Date.now() < state.deadlineMs) return { status: "still-live" };

  const keys = state.sides.map((s) => intentKey(battleId, state.turn, s.playerId));
  const [a, b] = await redis().mget<Intent[]>(...keys);

  let forfeiterId: string;
  if (a && !b) forfeiterId = state.sides[1].playerId;
  else if (b && !a) forfeiterId = state.sides[0].playerId;
  else forfeiterId = state.sides[0].playerId; // neither acted → p1 forfeits by convention

  const winnerId =
    state.sides.find((s) => s.playerId !== forfeiterId)?.playerId ?? null;
  const next: VersionedState = {
    ...state,
    winnerId,
    version: state.version + 1,
    deadlineMs: Date.now(),
  };
  const casRes = await cas(battleId, state.version, next);
  if (!casRes.ok) return { status: "still-live" }; // someone else resolved first

  await redis().del(...keys);
  await persistBattleEnd(battleId, next);
  await publishBattleEvent(battleId, {
    kind: "battle-ended",
    winnerId: winnerId ?? forfeiterId, // engine unions require a string
  });

  return { status: "forfeit", forfeiterId };
}

/**
 * Abandon an active battle — forfeits the caller (opponent wins). Safe to
 * call from a panic-button server action when the UI glitches out or the
 * turn timer isn't triggering. No-ops on already-ended battles.
 */
export async function abandonBattle(
  battleId: string,
  userId: string,
): Promise<
  | { ok: true; winnerId: string | null }
  | { ok: false; reason: string }
> {
  const state = await getState(battleId);
  if (!state) return { ok: false, reason: "no-such-battle" };
  if (state.winnerId || state.phase === "ended") {
    return { ok: true, winnerId: state.winnerId };
  }
  const mySideIndex = state.sides.findIndex((s) => s.playerId === userId);
  const isMirrorOwner =
    mySideIndex === -1 && state.sides[1].playerId === `mirror:${userId}`;
  if (mySideIndex === -1 && !isMirrorOwner) {
    return { ok: false, reason: "not-a-participant" };
  }
  const forfeiterSideIndex = isMirrorOwner ? 0 : mySideIndex;
  const winnerSide = state.sides[1 - forfeiterSideIndex];
  const winnerId = winnerSide.playerId.startsWith("mirror:")
    ? null
    : winnerSide.playerId;

  const next: VersionedState = {
    ...state,
    winnerId,
    phase: "ended",
    version: state.version + 1,
    deadlineMs: Date.now(),
    pendingOpponent: null,
  };
  const casRes = await cas(battleId, state.version, next);
  if (!casRes.ok) return { ok: false, reason: "race-lost" };

  // Clear any pending intent keys for good measure.
  const keys = state.sides.map((s) =>
    intentKey(battleId, state.turn, s.playerId),
  );
  await redis().del(...keys).catch(() => {});

  await persistBattleEnd(battleId, next);
  await publishBattleEvent(battleId, {
    kind: "battle-ended",
    winnerId: winnerId ?? state.sides[0].playerId,
  });
  return { ok: true, winnerId };
}

// Re-export for callers that want to compose their own flow.
export { checkWinCondition };

// ── Mirror-battle AI ────────────────────────────────────────────────────────
//
// Dumb random picker for the "solo test vs mirror" dev-aid mode. Picks a
// move with remaining PP on the active card; falls back to switching to a
// living card if the active one is out of PP; final fallback is move 0.
function pickRandomAiIntent(side: BattleSide): Intent {
  const active = side.team[side.activeIndex];
  if (active && active.currentHp > 0) {
    const viable = active.moves
      .map((slot, i) => ({ slot, i }))
      .filter((x) => x.slot.ppLeft > 0);
    if (viable.length > 0) {
      const pick = viable[Math.floor(Math.random() * viable.length)];
      return { kind: "move", playerId: side.playerId, moveIndex: pick.i };
    }
  }
  const livingIdx = side.team
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.currentHp > 0 && x.i !== side.activeIndex)
    .map((x) => x.i);
  if (livingIdx.length > 0) {
    return {
      kind: "switch",
      playerId: side.playerId,
      switchTo: livingIdx[Math.floor(Math.random() * livingIdx.length)],
    };
  }
  return { kind: "move", playerId: side.playerId, moveIndex: 0 };
}
