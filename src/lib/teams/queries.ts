import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  cards,
  moves,
  personLearnset,
  persons,
  teams,
  type Team,
} from "@/lib/db/schema";

export type OwnedCard = {
  cardId: string;
  personId: string;
  personName: string;
  discipline: string;
  primaryType: string;
  secondaryType: string | null;
  isShiny: boolean;
  imageUrl: string;
};

export async function ownedCardsForUser(userId: string): Promise<OwnedCard[]> {
  const rows = await db
    .select({
      cardId: cards.id,
      personId: persons.id,
      personName: persons.name,
      discipline: persons.discipline,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      isShiny: cards.isShiny,
      imageUrl: persons.imageUrl,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(eq(cards.ownerId, userId));
  return rows;
}

export type EligibleMoveRow = {
  id: string;
  name: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number;
  pp: number;
  isTm: boolean;
};

/**
 * Build, in one round-trip, a map cardId → array of moves this card's
 * person is eligible to use. Avoids N+1 for the team editor.
 */
export async function eligibleMovesByCardId(
  userCards: { cardId: string; personId: string }[],
): Promise<Map<string, EligibleMoveRow[]>> {
  if (userCards.length === 0) return new Map();
  const personIds = [...new Set(userCards.map((c) => c.personId))];
  const rows = await db
    .select({
      personId: personLearnset.personId,
      isTm: personLearnset.isTm,
      id: moves.id,
      name: moves.name,
      type: moves.type,
      category: moves.category,
      power: moves.power,
      accuracy: moves.accuracy,
      pp: moves.pp,
    })
    .from(personLearnset)
    .innerJoin(moves, eq(personLearnset.moveId, moves.id))
    .where(inArray(personLearnset.personId, personIds));

  const byPerson = new Map<string, EligibleMoveRow[]>();
  for (const r of rows) {
    const bucket = byPerson.get(r.personId) ?? [];
    bucket.push({
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category,
      power: r.power,
      accuracy: r.accuracy,
      pp: r.pp,
      isTm: r.isTm,
    });
    byPerson.set(r.personId, bucket);
  }

  const out = new Map<string, EligibleMoveRow[]>();
  for (const c of userCards) {
    out.set(c.cardId, byPerson.get(c.personId) ?? []);
  }
  return out;
}

export async function listTeamsForUser(userId: string): Promise<Team[]> {
  return db
    .select()
    .from(teams)
    .where(eq(teams.userId, userId))
    .orderBy(teams.updatedAt);
}

export async function getTeam(
  teamId: string,
  userId: string,
): Promise<Team | null> {
  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
