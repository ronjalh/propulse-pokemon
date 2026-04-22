import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { transactionLog, users, type TransactionKind } from "@/lib/db/schema";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly userId: string,
    public readonly needed: number,
  ) {
    super(`user ${userId} has insufficient credits (needed ${needed})`);
    this.name = "InsufficientCreditsError";
  }
}

export async function getBalance(userId: string): Promise<number> {
  const rows = await db
    .select({ credits: users.credits })
    .from(users)
    .where(sql`${users.id} = ${userId}`)
    .limit(1);
  return rows[0]?.credits ?? 0;
}

type EarnOpts = {
  userId: string;
  amount: number;
  reason: string;
  relatedBattleId?: string | null;
  cardId?: string | null;
  kind?: TransactionKind;
};

/** Add credits and write an audit row. Amount must be positive. */
export async function earn({
  userId,
  amount,
  reason,
  relatedBattleId = null,
  cardId = null,
  kind = "credits_earn",
}: EarnOpts): Promise<{ newBalance: number }> {
  if (amount <= 0) {
    throw new Error(`earn amount must be positive, got ${amount}`);
  }
  const result = await db
    .update(users)
    .set({ credits: sql`${users.credits} + ${amount}` })
    .where(sql`${users.id} = ${userId}`)
    .returning({ credits: users.credits });

  if (result.length === 0) {
    throw new Error(`user ${userId} not found`);
  }

  await db.insert(transactionLog).values({
    userId,
    kind,
    amount,
    reason,
    relatedBattleId,
    cardId,
  });

  return { newBalance: result[0].credits };
}

type SpendOpts = {
  userId: string;
  amount: number;
  reason: string;
  relatedBattleId?: string | null;
  cardId?: string | null;
};

/**
 * Atomic spend: the UPDATE guards against overspend with a WHERE clause, so
 * two concurrent spends can't race below zero. Throws InsufficientCreditsError
 * on overspend. Writes a log row on success.
 */
export async function spend({
  userId,
  amount,
  reason,
  relatedBattleId = null,
  cardId = null,
}: SpendOpts): Promise<{ newBalance: number }> {
  if (amount <= 0) {
    throw new Error(`spend amount must be positive, got ${amount}`);
  }
  const result = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(
      sql`${users.id} = ${userId} AND ${users.credits} >= ${amount}`,
    )
    .returning({ credits: users.credits });

  if (result.length === 0) {
    throw new InsufficientCreditsError(userId, amount);
  }

  await db.insert(transactionLog).values({
    userId,
    kind: "credits_spend",
    amount,
    reason,
    relatedBattleId,
    cardId,
  });

  return { newBalance: result[0].credits };
}

/**
 * Log a non-credits card event (acquire, transfer, consume) for the audit trail.
 * Does not touch the users row.
 */
export async function logCardEvent(opts: {
  userId: string;
  kind: Extract<TransactionKind, "card_acquire" | "card_transfer" | "card_consumed">;
  cardId: string;
  reason: string;
  relatedBattleId?: string | null;
}): Promise<void> {
  await db.insert(transactionLog).values({
    userId: opts.userId,
    kind: opts.kind,
    amount: null,
    cardId: opts.cardId,
    reason: opts.reason,
    relatedBattleId: opts.relatedBattleId ?? null,
  });
}
