import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  battles,
  cards,
  persons,
  users,
  type BattleWager,
} from "@/lib/db/schema";
import type { BattleState } from "./types";

export type PendingChallenge = {
  battleId: string;
  createdAt: Date;
  challengerName: string | null;
  challengerEmail: string | null;
  challengerImage: string | null;
  challengerCardName: string | null;
  challengerCardImage: string | null;
  is1v1: boolean;
  wager: BattleWager | null;
};

/** Returns all pending battle challenges where this user is the invitee. */
export async function pendingChallengesFor(
  userId: string,
): Promise<PendingChallenge[]> {
  const rows = await db
    .select({
      id: battles.id,
      createdAt: battles.createdAt,
      p1Id: battles.p1Id,
      initialState: battles.initialState,
      wager: battles.wager,
      challengerName: users.name,
      challengerEmail: users.email,
      challengerImage: users.image,
    })
    .from(battles)
    .innerJoin(users, eq(battles.p1Id, users.id))
    .where(
      and(eq(battles.p2Id, userId), eq(battles.phase, "awaiting_opponent")),
    )
    .orderBy(desc(battles.createdAt));

  if (rows.length === 0) return [];

  // Look up each challenger's first-card image for a nicer banner.
  const cardIds = rows
    .map((r) => {
      const state = r.initialState as BattleState;
      return state.sides?.[0]?.team?.[0]?.cardId ?? null;
    })
    .filter((id): id is string => Boolean(id))
    // Strip any mirror prefix just in case (shouldn't happen here but defensive).
    .map((id) => id.replace(/^mirror-/, ""));

  const cardRows = cardIds.length
    ? await db
        .select({
          cardId: cards.id,
          personName: persons.name,
          imageUrl: persons.imageUrl,
        })
        .from(cards)
        .innerJoin(persons, eq(cards.personId, persons.id))
        .where(eq(cards.id, cardIds[0]))
    : [];
  const cardMeta = new Map(
    cardRows.map((r) => [
      r.cardId,
      { name: r.personName, image: r.imageUrl },
    ]),
  );

  return rows.map((r) => {
    const state = r.initialState as BattleState;
    const challengerCardId = state.sides?.[0]?.team?.[0]?.cardId ?? null;
    const realCardId = challengerCardId?.replace(/^mirror-/, "") ?? null;
    const meta = realCardId ? cardMeta.get(realCardId) : undefined;
    const teamSize = state.sides?.[0]?.team?.length ?? 0;
    return {
      battleId: r.id,
      createdAt: r.createdAt,
      challengerName: r.challengerName,
      challengerEmail: r.challengerEmail,
      challengerImage: r.challengerImage,
      challengerCardName: meta?.name ?? null,
      challengerCardImage: meta?.image ?? null,
      is1v1: teamSize === 1,
      wager: (r.wager as BattleWager | null) ?? null,
    };
  });
}
