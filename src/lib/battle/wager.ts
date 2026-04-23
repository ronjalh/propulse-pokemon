import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { battles, cards, type BattleWager } from "@/lib/db/schema";
import { earn, logCardEvent } from "@/lib/economy/credits";

/**
 * Settle a finished battle's wager: award pot to winner and transfer the
 * loser's wager card. Safe to call multiple times — checks `settled` flag
 * so double-settlement can't happen.
 */
export async function settleWager(
  battleId: string,
  winnerId: string | null,
): Promise<void> {
  const rows = await db
    .select({
      p1Id: battles.p1Id,
      p2Id: battles.p2Id,
      wager: battles.wager,
    })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  const wager = row.wager as BattleWager | null;
  if (!wager || wager.settled) return;

  const pot = wager.credits * 2;
  const realWinner =
    winnerId &&
    !winnerId.startsWith("mirror:") &&
    !winnerId.startsWith("pending:")
      ? winnerId
      : null;

  if (realWinner && pot > 0) {
    await earn({
      userId: realWinner,
      amount: pot,
      reason: `battle-wager:${battleId}`,
      relatedBattleId: battleId,
    });
  } else if (!realWinner && pot > 0) {
    // No real winner (mirror win, draw, forfeit by only real player): refund.
    for (const pid of [row.p1Id, row.p2Id]) {
      if (pid && !pid.startsWith("mirror:") && !pid.startsWith("pending:")) {
        await earn({
          userId: pid,
          amount: wager.credits,
          reason: `battle-wager-refund:${battleId}`,
          relatedBattleId: battleId,
        });
      }
    }
  }

  // Transfer the loser's wager card to the winner.
  if (realWinner) {
    const loserCard =
      realWinner === row.p1Id ? wager.p2CardId : wager.p1CardId;
    if (loserCard) {
      await db
        .update(cards)
        .set({ ownerId: realWinner })
        .where(eq(cards.id, loserCard));
      const loserId = realWinner === row.p1Id ? row.p2Id : row.p1Id;
      if (loserId) {
        await logCardEvent({
          userId: loserId,
          kind: "card_transfer",
          cardId: loserCard,
          reason: `battle-wager:${battleId}:out`,
          relatedBattleId: battleId,
        });
      }
      await logCardEvent({
        userId: realWinner,
        kind: "card_transfer",
        cardId: loserCard,
        reason: `battle-wager:${battleId}:in`,
        relatedBattleId: battleId,
      });
    }
  }

  await db
    .update(battles)
    .set({ wager: sql`jsonb_set(${battles.wager}, '{settled}', 'true'::jsonb)` })
    .where(eq(battles.id, battleId));
}

/** Pre-accept cancellation: refund both players their escrowed credits. */
export async function refundWager(battleId: string): Promise<void> {
  const rows = await db
    .select({
      p1Id: battles.p1Id,
      p2Id: battles.p2Id,
      wager: battles.wager,
    })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  const wager = row.wager as BattleWager | null;
  if (!wager || wager.settled || wager.credits <= 0) return;

  for (const pid of [row.p1Id, row.p2Id]) {
    if (pid && !pid.startsWith("mirror:") && !pid.startsWith("pending:")) {
      await earn({
        userId: pid,
        amount: wager.credits,
        reason: `battle-wager-refund:${battleId}`,
        relatedBattleId: battleId,
      });
    }
  }

  await db
    .update(battles)
    .set({ wager: sql`jsonb_set(${battles.wager}, '{settled}', 'true'::jsonb)` })
    .where(eq(battles.id, battleId));
}
