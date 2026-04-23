"use server";

import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { battles, cards, users, type BattleWager } from "@/lib/db/schema";
import { InsufficientCreditsError, spend } from "@/lib/economy/credits";
import { refundWager } from "./wager";
import { hashSeed } from "./rng";
import { hydrateSide, hydrateSingleCard } from "./hydrate";
import {
  abandonBattle,
  createPendingBattle,
  createBattle,
  getState,
  isRedisConfigured,
  joinPendingBattle,
} from "./session";
import type { BattleState } from "./types";

export async function createBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!isRedisConfigured()) redirect("/battle/new?error=redis-missing");
  const userId = session.user.id;

  const teamId = String(formData.get("teamId") ?? "");
  const opponentEmailRaw = String(formData.get("opponentEmail") ?? "").trim().toLowerCase();
  const wagerCredits = parseWagerCredits(formData.get("wagerCredits"));
  const wagerCardId = (formData.get("wagerCardId") as string) || null;
  if (!teamId || !opponentEmailRaw) {
    redirect("/battle/new?error=missing-fields");
  }
  if (opponentEmailRaw === session.user.email?.toLowerCase()) {
    redirect("/battle/new?error=cannot-challenge-self");
  }

  // Validate the wager card belongs to the user and is in the team.
  if (wagerCardId) {
    const own = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(eq(cards.id, wagerCardId))
      .limit(1);
    if (own[0]?.ownerId !== userId) {
      redirect("/battle/new?error=wager-not-owned");
    }
  }

  // Resolve opponent (must already exist — i.e. signed in before at least once).
  const opp = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, opponentEmailRaw))
    .limit(1);

  const ownSide = await hydrateSide(teamId, userId);
  if ("code" in ownSide) {
    redirect(`/battle/new?error=own-team-${ownSide.code}`);
  }
  if (wagerCardId && !ownSide.team.some((c) => c.cardId === wagerCardId)) {
    redirect("/battle/new?error=wager-not-in-team");
  }

  // Escrow credits up-front (fails cleanly if not enough).
  if (wagerCredits > 0) {
    try {
      await spend({
        userId,
        amount: wagerCredits,
        reason: `battle-wager-escrow:create`,
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        redirect("/battle/new?error=insufficient-wager");
      }
      throw err;
    }
  }

  const battleId = crypto.randomUUID();
  const wager: BattleWager | null =
    wagerCredits > 0 || wagerCardId
      ? {
          credits: wagerCredits,
          p1CardId: wagerCardId,
          p2CardId: null, // set by invitee on join
          settled: false,
        }
      : null;

  if (opp.length === 0) {
    const state: BattleState = {
      battleId,
      turn: 1,
      rngSeed: hashSeed(battleId),
      sides: [
        ownSide,
        {
          playerId: `pending:${opponentEmailRaw}`,
          team: [],
          activeIndex: 0,
        },
      ],
      winnerId: null,
    };
    await createPendingBattle(battleId, state, { email: opponentEmailRaw }, wager);
  } else {
    const state: BattleState = {
      battleId,
      turn: 1,
      rngSeed: hashSeed(battleId),
      sides: [
        ownSide,
        {
          playerId: opp[0].id,
          team: [],
          activeIndex: 0,
        },
      ],
      winnerId: null,
    };
    await createPendingBattle(
      battleId,
      state,
      { userId: opp[0].id, email: opp[0].email },
      wager,
    );
  }

  redirect(`/battle/${battleId}`);
}

function parseWagerCredits(raw: FormDataEntryValue | null): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Challenge someone to a 1v1 with a single card (no team required). */
export async function createQuick1v1ChallengeAction(
  formData: FormData,
): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!isRedisConfigured()) redirect("/battle/new?error=redis-missing");
  const userId = session.user.id;

  const cardId = String(formData.get("cardId") ?? "");
  const opponentEmailRaw = String(formData.get("opponentEmail") ?? "").trim().toLowerCase();
  const wagerCredits = parseWagerCredits(formData.get("wagerCredits"));
  if (!cardId || !opponentEmailRaw) {
    redirect("/battle/new?error=missing-fields");
  }
  if (opponentEmailRaw === session.user.email?.toLowerCase()) {
    redirect("/battle/new?error=cannot-challenge-self");
  }

  const ownSide = await hydrateSingleCard(cardId, userId);
  if ("code" in ownSide) {
    redirect(`/battle/new?error=own-team-${ownSide.code}`);
  }

  // In 1v1, the picked card IS the wager card by definition.
  const p1CardId = cardId;

  if (wagerCredits > 0) {
    try {
      await spend({
        userId,
        amount: wagerCredits,
        reason: `battle-wager-escrow:create-1v1`,
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        redirect("/battle/new?error=insufficient-wager");
      }
      throw err;
    }
  }

  const opp = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, opponentEmailRaw))
    .limit(1);

  const battleId = crypto.randomUUID();
  const state: BattleState = {
    battleId,
    turn: 1,
    rngSeed: hashSeed(battleId),
    sides: [
      ownSide,
      {
        playerId: opp.length
          ? opp[0].id
          : `pending:${opponentEmailRaw}`,
        team: [],
        activeIndex: 0,
      },
    ],
    winnerId: null,
  };
  const wager: BattleWager | null =
    wagerCredits > 0
      ? { credits: wagerCredits, p1CardId, p2CardId: null, settled: false }
      : null;
  await createPendingBattle(
    battleId,
    state,
    opp.length
      ? { userId: opp[0].id, email: opp[0].email }
      : { email: opponentEmailRaw },
    wager,
  );

  redirect(`/battle/${battleId}`);
}

export async function joinBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const battleId = String(formData.get("battleId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  if (!battleId || (!teamId && !cardId)) redirect("/");

  const state = await getState(battleId);
  if (!state) redirect(`/battle/${battleId}?error=no-such-battle`);

  // Validate invitation: either pending.userId matches, or the placeholder
  // "pending:<email>" playerId matches this user's email.
  const pending = state.pendingOpponent;
  const placeholderEmail = state.sides[1].playerId.startsWith("pending:")
    ? state.sides[1].playerId.slice("pending:".length)
    : null;
  const invited =
    pending?.userId === userId ||
    (placeholderEmail && placeholderEmail === session.user.email?.toLowerCase());
  if (!invited) redirect(`/battle/${battleId}?error=not-invited`);

  // Pick the right hydrate path based on the challenger's team size.
  const is1v1 = state.sides[0].team.length === 1;
  const side = is1v1
    ? await hydrateSingleCard(String(formData.get("cardId") ?? ""), userId)
    : await hydrateSide(teamId, userId);
  if ("code" in side) redirect(`/battle/${battleId}?error=join-team-${side.code}`);

  // Match the wager if the battle has one.
  const battleRows = await db
    .select({ wager: battles.wager })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  const wager = battleRows[0]?.wager as BattleWager | null;
  if (wager) {
    const myWagerCardId = (formData.get("wagerCardId") as string) || null;
    if (wager.p1CardId && !myWagerCardId) {
      redirect(`/battle/${battleId}?error=need-wager-card`);
    }
    if (myWagerCardId) {
      const ownsCard = side.team.some((c) => c.cardId === myWagerCardId);
      if (!ownsCard) {
        redirect(`/battle/${battleId}?error=wager-not-in-team`);
      }
    }
    // Escrow credits from invitee
    if (wager.credits > 0) {
      try {
        await spend({
          userId,
          amount: wager.credits,
          reason: `battle-wager-escrow:join`,
        });
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          redirect(`/battle/${battleId}?error=insufficient-wager`);
        }
        throw err;
      }
    }
    // Lock in invitee's wager card
    await db
      .update(battles)
      .set({
        wager: { ...wager, p2CardId: myWagerCardId ?? null } satisfies BattleWager,
      })
      .where(eq(battles.id, battleId));
  }

  const result = await joinPendingBattle(battleId, userId, side);
  if (!result.ok) redirect(`/battle/${battleId}?error=${result.reason}`);

  redirect(`/battle/${battleId}`);
}

/**
 * Remove a battle from history. Participant-gated. Also clears any lingering
 * Redis state + intent keys so a stuck in-progress battle is fully cleaned up.
 */
export async function deleteBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const battleId = String(formData.get("battleId") ?? "");
  if (!battleId) redirect("/battle/history");

  // Only delete if this user is a participant.
  await db
    .delete(battles)
    .where(
      and(
        eq(battles.id, battleId),
        or(eq(battles.p1Id, userId), eq(battles.p2Id, userId)),
      ),
    );

  // Best-effort Redis cleanup; if Redis isn't configured, silently skip.
  if (isRedisConfigured()) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.del(`battle:${battleId}`);
      // Drop any intent keys — iterate possible shape `battle:<id>:intent:*`
      // via SCAN so we don't depend on exact turn numbers.
      let cursor = 0;
      do {
        const [next, keys] = await redis.scan(cursor, {
          match: `battle:${battleId}:intent:*`,
          count: 100,
        });
        cursor = Number(next);
        if ((keys as string[]).length) await redis.del(...(keys as string[]));
      } while (cursor !== 0);
    } catch {
      /* ignore */
    }
  }

  revalidatePath("/battle/history");
  redirect("/battle/history");
}

/** Panic button: end a battle you're stuck in. Abandoner forfeits. */
export async function abandonBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const battleId = String(formData.get("battleId") ?? "");
  if (!battleId) redirect("/");
  await abandonBattle(battleId, session.user.id);
  redirect("/battle/history");
}

/**
 * Quick 1v1 solo test: user picks a single card and fights a mirror of it.
 * Moves are auto-picked randomly from the card's learnset — no team needed.
 */
export async function createQuickSoloBattleAction(
  formData: FormData,
): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!isRedisConfigured()) redirect("/battle/new?error=redis-missing");
  const userId = session.user.id;
  const cardId = String(formData.get("cardId") ?? "");
  if (!cardId) redirect("/battle/new?error=missing-fields");

  const ownSide = await hydrateSingleCard(cardId, userId);
  if ("code" in ownSide) redirect(`/battle/new?error=own-team-${ownSide.code}`);

  const mirrorSide = {
    ...ownSide,
    playerId: `mirror:${userId}`,
    team: ownSide.team.map((c) => ({
      ...c,
      currentHp: c.maxHp,
      moves: c.moves.map((m) => ({ ...m, ppLeft: m.move.pp })),
    })),
  };

  const battleId = crypto.randomUUID();
  const state: BattleState = {
    battleId,
    turn: 1,
    rngSeed: hashSeed(battleId),
    sides: [ownSide, mirrorSide],
    winnerId: null,
  };
  await createBattle(battleId, state);
  redirect(`/battle/${battleId}`);
}

/** Start a solo test battle vs a mirror copy of your own team (dev aid). */
export async function createSoloTestBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!isRedisConfigured()) redirect("/battle/new?error=redis-missing");
  const userId = session.user.id;
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) redirect("/battle/new?error=missing-fields");

  const ownSide = await hydrateSide(teamId, userId);
  if ("code" in ownSide) redirect(`/battle/new?error=own-team-${ownSide.code}`);

  // Mirror side: same team cards but fresh HP, opponentId = same userId tagged.
  // For dev only — a real battle can't have both sides as the same player.
  const mirrorSide = {
    ...ownSide,
    playerId: `mirror:${userId}`,
    team: ownSide.team.map((c) => ({
      ...c,
      currentHp: c.maxHp,
      moves: c.moves.map((m) => ({ ...m, ppLeft: m.move.pp })),
    })),
  };

  const battleId = crypto.randomUUID();
  const state: BattleState = {
    battleId,
    turn: 1,
    rngSeed: hashSeed(battleId),
    sides: [ownSide, mirrorSide],
    winnerId: null,
  };
  await createBattle(battleId, state);
  redirect(`/battle/${battleId}`);
}
