import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cards, persons, trades, users, type Trade } from "@/lib/db/schema";

export type TradeCardDetail = {
  cardId: string;
  personName: string;
  imageUrl: string;
  primaryType: string;
  secondaryType: string | null;
  isShiny: boolean;
};

export type TradeRow = Trade & {
  fromEmail: string | null;
  toEmail: string | null;
  offered: TradeCardDetail | null;
  requested: TradeCardDetail | null;
};

/** Fetch a card's summary including its person info. */
async function cardDetails(
  cardIds: string[],
): Promise<Map<string, TradeCardDetail>> {
  if (cardIds.length === 0) return new Map();
  const rows = await db
    .select({
      cardId: cards.id,
      personName: persons.name,
      imageUrl: persons.imageUrl,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      isShiny: cards.isShiny,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(or(...cardIds.map((id) => eq(cards.id, id))));
  return new Map(rows.map((r) => [r.cardId, r]));
}

export async function listTradesForUser(userId: string): Promise<TradeRow[]> {
  const rows = await db
    .select()
    .from(trades)
    .where(or(eq(trades.fromUserId, userId), eq(trades.toUserId, userId)))
    .orderBy(desc(trades.createdAt));

  const userIds = new Set<string>();
  const cardIds = new Set<string>();
  for (const r of rows) {
    userIds.add(r.fromUserId);
    userIds.add(r.toUserId);
    cardIds.add(r.offeredCardId);
    cardIds.add(r.requestedCardId);
  }

  const userRows = userIds.size
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(or(...[...userIds].map((id) => eq(users.id, id))))
    : [];
  const emailById = new Map(userRows.map((r) => [r.id, r.email]));
  const detailsById = await cardDetails([...cardIds]);

  return rows.map((t) => ({
    ...t,
    fromEmail: emailById.get(t.fromUserId) ?? null,
    toEmail: emailById.get(t.toUserId) ?? null,
    offered: detailsById.get(t.offeredCardId) ?? null,
    requested: detailsById.get(t.requestedCardId) ?? null,
  }));
}

export async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string; name: string | null; image: string | null } | null> {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}

/** All cards owned by a user with person info — used when picking trade sides. */
export async function collectionDetails(
  userId: string,
): Promise<TradeCardDetail[]> {
  const rows = await db
    .select({
      cardId: cards.id,
      personName: persons.name,
      imageUrl: persons.imageUrl,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      isShiny: cards.isShiny,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(eq(cards.ownerId, userId));
  return rows;
}

export async function getPendingTrade(
  tradeId: string,
  viewerId: string,
): Promise<Trade | null> {
  const rows = await db
    .select()
    .from(trades)
    .where(
      and(
        eq(trades.id, tradeId),
        or(eq(trades.fromUserId, viewerId), eq(trades.toUserId, viewerId)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
