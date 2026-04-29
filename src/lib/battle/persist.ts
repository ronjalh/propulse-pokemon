import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  battles,
  users,
  type BattleWager,
  type TurnLogEntry,
} from "@/lib/db/schema";
import { earn, logCardEvent } from "@/lib/economy/credits";
import { eloDelta } from "./elo";
import { settleWager } from "./wager";
import type { BattleEvent, BattleState } from "./types";

/** Flat credit reward for winning a real PvP match. */
export const PVP_WIN_REWARD = 5;

type PersistOnCreateArgs = {
  battleId: string;
  p1Id: string;
  p2Id: string | null;
  rngSeed: number;
  initialState: BattleState;
  wager?: BattleWager | null;
  phase?: "awaiting_opponent" | "live";
};

/** Called when a battle is first created — inserts an empty history row. */
export async function persistBattleCreate({
  battleId,
  p1Id,
  p2Id,
  rngSeed,
  initialState,
  wager,
  phase = "live",
}: PersistOnCreateArgs): Promise<void> {
  await db
    .insert(battles)
    .values({
      id: battleId,
      p1Id,
      p2Id,
      rngSeed,
      initialState,
      turnLog: [] as TurnLogEntry[],
      turnsPlayed: 0,
      wager: wager ?? null,
      phase,
    })
    .onConflictDoNothing();
}

/** Flip the battles row's phase (call when joining or ending). */
export async function persistBattlePhase(
  battleId: string,
  phase: "awaiting_opponent" | "live" | "ended",
): Promise<void> {
  await db
    .update(battles)
    .set({ phase })
    .where(sql`${battles.id} = ${battleId}`);
}

/** Called on every resolved turn — appends an entry to turn_log. */
export async function persistTurn(
  battleId: string,
  entry: TurnLogEntry,
): Promise<void> {
  await db
    .update(battles)
    .set({
      turnLog: sql`${battles.turnLog} || ${JSON.stringify([entry])}::jsonb`,
      turnsPlayed: sql`${battles.turnsPlayed} + 1`,
    })
    .where(sql`${battles.id} = ${battleId}`);
}

/** Called when the battle ends — writes winner + finalState + endedAt. */
export async function persistBattleEnd(
  battleId: string,
  finalState: BattleState,
): Promise<void> {
  // `winnerId` is an FK to users.id — strip pseudo-player-ids like
  // `mirror:<id>` or `pending:<email>` to null so the update doesn't
  // violate the constraint (which would leave the row stuck "in progress").
  const realWinner =
    finalState.winnerId &&
    !finalState.winnerId.startsWith("mirror:") &&
    !finalState.winnerId.startsWith("pending:")
      ? finalState.winnerId
      : null;

  // Read prior phase so the PvP reward is awarded only ONCE per battle.
  const [prior] = await db
    .select({ p1Id: battles.p1Id, p2Id: battles.p2Id, phase: battles.phase })
    .from(battles)
    .where(sql`${battles.id} = ${battleId}`)
    .limit(1);

  await db
    .update(battles)
    .set({
      endedAt: new Date(),
      winnerId: realWinner,
      finalState,
      phase: "ended",
    })
    .where(sql`${battles.id} = ${battleId}`);

  // Settle any legacy wager (credit payout + wager-card transfer). Idempotent.
  // Wager UI is gone but old battles in the DB may still carry one.
  await settleWager(battleId, finalState.winnerId);

  // PvP win reward + Elo update — only on the first transition to ended,
  // only when both sides are real users (no mirror), only when there's a
  // real winner.
  if (
    prior &&
    prior.phase !== "ended" &&
    realWinner &&
    prior.p1Id &&
    prior.p2Id &&
    !prior.p1Id.startsWith("mirror:") &&
    !prior.p2Id.startsWith("mirror:")
  ) {
    await earn({
      userId: realWinner,
      amount: PVP_WIN_REWARD,
      reason: `pvp-win:${battleId}`,
      relatedBattleId: battleId,
    });

    // Elo: read both ratings, compute delta, write back.
    const loserId = realWinner === prior.p1Id ? prior.p2Id : prior.p1Id;
    const ratingRows = await db
      .select({ id: users.id, rating: users.rating })
      .from(users)
      .where(sql`${users.id} IN (${realWinner}, ${loserId})`);
    const winnerRow = ratingRows.find((r) => r.id === realWinner);
    const loserRow = ratingRows.find((r) => r.id === loserId);
    if (winnerRow && loserRow) {
      const delta = eloDelta(winnerRow.rating, loserRow.rating);
      await db
        .update(users)
        .set({ rating: winnerRow.rating + delta.winner })
        .where(eq(users.id, realWinner));
      await db
        .update(users)
        .set({ rating: Math.max(0, loserRow.rating + delta.loser) })
        .where(eq(users.id, loserId));
    }
  }
}
