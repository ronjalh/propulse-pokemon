import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  cards,
  moves,
  personLearnset,
  persons,
  teams,
  type BaseStats,
  type IVs,
  type Team,
} from "@/lib/db/schema";

export type OwnedCard = {
  cardId: string;
  personId: string;
  personName: string;
  title: string;
  discipline: string;
  subDiscipline: string | null;
  primaryType: string;
  secondaryType: string | null;
  rarity: "common" | "rare" | "epic" | "legendary";
  baseStats: BaseStats;
  ivs: IVs;
  isShiny: boolean;
  imageUrl: string;
};

export async function ownedCardsForUser(userId: string): Promise<OwnedCard[]> {
  const rows = await db
    .select({
      cardId: cards.id,
      personId: persons.id,
      personName: persons.name,
      title: persons.title,
      discipline: persons.discipline,
      subDiscipline: persons.subDiscipline,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      rarity: persons.rarity,
      baseStats: persons.baseStats,
      ivs: cards.ivs,
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

export type TeamPreviewCard = {
  cardId: string;
  personName: string;
  imageUrl: string;
  primaryType: string;
  secondaryType: string | null;
};

/** Batch-fetch preview data for the first N cards of each team. */
export async function previewCardsForTeams(
  teamsList: Team[],
  perTeam = 6,
): Promise<Record<string, TeamPreviewCard[]>> {
  const allIds = teamsList.flatMap((t) =>
    t.cardIds.filter(Boolean).slice(0, perTeam),
  );
  if (allIds.length === 0) return {};
  const rows = await db
    .select({
      cardId: cards.id,
      personName: persons.name,
      imageUrl: persons.imageUrl,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(inArray(cards.id, allIds));
  const byId = new Map<string, TeamPreviewCard>(
    rows.map((r) => [r.cardId, r as TeamPreviewCard]),
  );
  const out: Record<string, TeamPreviewCard[]> = {};
  for (const t of teamsList) {
    const preview: TeamPreviewCard[] = [];
    for (const id of t.cardIds.filter(Boolean).slice(0, perTeam)) {
      const row = byId.get(id);
      if (row) preview.push(row);
    }
    out[t.id] = preview;
  }
  return out;
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
