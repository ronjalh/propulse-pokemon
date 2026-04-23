"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards, trades } from "@/lib/db/schema";
import { logCardEvent } from "@/lib/economy/credits";

export async function createTradeAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const fromUserId = session.user.id;

  const toUserId = String(formData.get("toUserId") ?? "");
  const offeredCardId = String(formData.get("offeredCardId") ?? "");
  const requestedCardId = String(formData.get("requestedCardId") ?? "");
  const message = String(formData.get("message") ?? "").slice(0, 200);
  if (!toUserId || !offeredCardId || !requestedCardId) {
    redirect("/trade/new?error=missing-fields");
  }
  if (toUserId === fromUserId) {
    redirect("/trade/new?error=cannot-trade-with-self");
  }

  // Validate ownership on both sides.
  const offered = await db
    .select({ ownerId: cards.ownerId })
    .from(cards)
    .where(eq(cards.id, offeredCardId))
    .limit(1);
  if (offered[0]?.ownerId !== fromUserId) {
    redirect("/trade/new?error=you-dont-own-offered");
  }
  const requested = await db
    .select({ ownerId: cards.ownerId })
    .from(cards)
    .where(eq(cards.id, requestedCardId))
    .limit(1);
  if (requested[0]?.ownerId !== toUserId) {
    redirect("/trade/new?error=they-dont-own-requested");
  }

  await db.insert(trades).values({
    fromUserId,
    toUserId,
    offeredCardId,
    requestedCardId,
    status: "pending",
    message: message || null,
  });

  redirect("/trade");
}

export async function acceptTradeAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const tradeId = String(formData.get("tradeId") ?? "");

  const tradeRows = await db
    .select()
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.toUserId, userId)))
    .limit(1);
  const trade = tradeRows[0];
  if (!trade || trade.status !== "pending") {
    redirect("/trade?error=not-pending");
  }

  // Re-validate ownership — could have changed since offer was made.
  const offered = await db
    .select({ ownerId: cards.ownerId })
    .from(cards)
    .where(eq(cards.id, trade.offeredCardId))
    .limit(1);
  const requested = await db
    .select({ ownerId: cards.ownerId })
    .from(cards)
    .where(eq(cards.id, trade.requestedCardId))
    .limit(1);
  if (
    offered[0]?.ownerId !== trade.fromUserId ||
    requested[0]?.ownerId !== trade.toUserId
  ) {
    // Someone no longer owns their side — auto-reject.
    await db
      .update(trades)
      .set({ status: "rejected", respondedAt: new Date() })
      .where(eq(trades.id, tradeId));
    redirect("/trade?error=ownership-changed");
  }

  // Swap ownerships.
  await db
    .update(cards)
    .set({ ownerId: trade.toUserId })
    .where(eq(cards.id, trade.offeredCardId));
  await db
    .update(cards)
    .set({ ownerId: trade.fromUserId })
    .where(eq(cards.id, trade.requestedCardId));

  // Audit rows — one card_transfer per movement.
  await logCardEvent({
    userId: trade.fromUserId,
    kind: "card_transfer",
    cardId: trade.offeredCardId,
    reason: `trade:${tradeId}:out`,
  });
  await logCardEvent({
    userId: trade.toUserId,
    kind: "card_transfer",
    cardId: trade.offeredCardId,
    reason: `trade:${tradeId}:in`,
  });
  await logCardEvent({
    userId: trade.toUserId,
    kind: "card_transfer",
    cardId: trade.requestedCardId,
    reason: `trade:${tradeId}:out`,
  });
  await logCardEvent({
    userId: trade.fromUserId,
    kind: "card_transfer",
    cardId: trade.requestedCardId,
    reason: `trade:${tradeId}:in`,
  });

  await db
    .update(trades)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(trades.id, tradeId));

  revalidatePath("/trade");
  revalidatePath("/collection");
  redirect("/trade?accepted=1");
}

export async function rejectTradeAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const tradeId = String(formData.get("tradeId") ?? "");
  await db
    .update(trades)
    .set({ status: "rejected", respondedAt: new Date() })
    .where(and(eq(trades.id, tradeId), eq(trades.toUserId, session.user.id)));
  revalidatePath("/trade");
  redirect("/trade");
}

export async function cancelTradeAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const tradeId = String(formData.get("tradeId") ?? "");
  await db
    .update(trades)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(
      and(eq(trades.id, tradeId), eq(trades.fromUserId, session.user.id)),
    );
  revalidatePath("/trade");
  redirect("/trade");
}
