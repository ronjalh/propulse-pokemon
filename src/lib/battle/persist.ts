import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  battles,
  type BattleWager,
  type TurnLogEntry,
} from "@/lib/db/schema";
import { logCardEvent } from "@/lib/economy/credits";
import { settleWager } from "./wager";
import type { BattleEvent, BattleState } from "./types";

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
  await db
    .update(battles)
    .set({
      endedAt: new Date(),
      winnerId: realWinner,
      finalState,
      phase: "ended",
    })
    .where(sql`${battles.id} = ${battleId}`);

  // Settle any wager (credit payout + wager-card transfer). Idempotent.
  await settleWager(battleId, finalState.winnerId);
}
