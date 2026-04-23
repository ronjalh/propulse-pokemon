"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashSeed } from "./rng";
import { hydrateSide } from "./hydrate";
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
  if (!teamId || !opponentEmailRaw) {
    redirect("/battle/new?error=missing-fields");
  }
  if (opponentEmailRaw === session.user.email?.toLowerCase()) {
    redirect("/battle/new?error=cannot-challenge-self");
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

  const battleId = crypto.randomUUID();

  if (opp.length === 0) {
    // Opponent hasn't signed up yet — store by email, they'll be bound on join.
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
    await createPendingBattle(battleId, state, { email: opponentEmailRaw });
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
    await createPendingBattle(battleId, state, { userId: opp[0].id, email: opp[0].email });
  }

  redirect(`/battle/${battleId}`);
}

export async function joinBattleAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const battleId = String(formData.get("battleId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!battleId || !teamId) redirect("/");

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

  const side = await hydrateSide(teamId, userId);
  if ("code" in side) redirect(`/battle/${battleId}?error=join-team-${side.code}`);

  const result = await joinPendingBattle(battleId, userId, side);
  if (!result.ok) redirect(`/battle/${battleId}?error=${result.reason}`);

  redirect(`/battle/${battleId}`);
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
