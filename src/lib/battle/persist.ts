import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { battles, type TurnLogEntry } from "@/lib/db/schema";
import { logCardEvent } from "@/lib/economy/credits";
import type { BattleEvent, BattleState } from "./types";

type PersistOnCreateArgs = {
  battleId: string;
  p1Id: string;
  p2Id: string | null;
  rngSeed: number;
  initialState: BattleState;
};

/** Called when a battle is first created — inserts an empty history row. */
export async function persistBattleCreate({
  battleId,
  p1Id,
  p2Id,
  rngSeed,
  initialState,
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
    })
    .onConflictDoNothing();
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
  await db
    .update(battles)
    .set({
      endedAt: new Date(),
      winnerId: finalState.winnerId,
      finalState,
    })
    .where(sql`${battles.id} = ${battleId}`);
}
