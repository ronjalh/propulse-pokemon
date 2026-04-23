import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  cards,
  moves,
  personLearnset,
  persons,
  teams,
  type TeamMoveSets,
} from "@/lib/db/schema";
import { computeFinalStats, generateIVs } from "@/lib/cards/stats";
import { resolveTypes } from "@/lib/data/type-mapping";
import type { BattleCard, BattleSide, MoveSlot } from "./types";

export type HydrateError = {
  code: "team-not-found" | "not-owned" | "invalid" | "no-moves";
};

/**
 * Turn a saved Team row into a BattleSide ready for the engine.
 * Validates ownership: the cards and the team must belong to `userId`.
 */
export async function hydrateSide(
  teamId: string,
  userId: string,
): Promise<BattleSide | HydrateError> {
  const teamRow = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
    .limit(1);
  if (teamRow.length === 0) return { code: "team-not-found" };
  const team = teamRow[0];
  const filledCardIds = team.cardIds.filter(Boolean);
  if (filledCardIds.length !== 6) return { code: "invalid" };

  // Fetch cards with their persons.
  const rows = await db
    .select({
      cardId: cards.id,
      ownerId: cards.ownerId,
      isShiny: cards.isShiny,
      ivs: cards.ivs,
      personId: persons.id,
      personName: persons.name,
      discipline: persons.discipline,
      subDiscipline: persons.subDiscipline,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      baseStats: persons.baseStats,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(inArray(cards.id, filledCardIds));

  if (rows.length !== filledCardIds.length) return { code: "invalid" };
  for (const r of rows) {
    if (r.ownerId !== userId) return { code: "not-owned" };
  }

  // Fetch all moves referenced across the team, + their TM flag per person.
  const moveIds = new Set<string>();
  for (const ids of Object.values(team.moveSets as TeamMoveSets)) {
    for (const id of ids) moveIds.add(id);
  }
  const moveRows = moveIds.size
    ? await db.select().from(moves).where(inArray(moves.id, [...moveIds]))
    : [];
  const movesById = new Map(moveRows.map((m) => [m.id, m]));

  const personIds = [...new Set(rows.map((r) => r.personId))];
  const learnsetRows = personIds.length
    ? await db
        .select()
        .from(personLearnset)
        .where(inArray(personLearnset.personId, personIds))
    : [];
  const tmFlagBy = new Map<string, boolean>();
  for (const ls of learnsetRows) {
    tmFlagBy.set(`${ls.personId}:${ls.moveId}`, ls.isTm);
  }

  // Preserve the team's card order.
  const byCardId = new Map(rows.map((r) => [r.cardId, r]));
  const battleCards: BattleCard[] = [];
  for (const cardId of filledCardIds) {
    const card = byCardId.get(cardId);
    if (!card) return { code: "invalid" };
    const ivs = card.ivs ?? generateIVs(cardId);
    const stats = computeFinalStats(card.baseStats, ivs, card.isShiny);
    const types = resolveTypes(
      card.discipline as Parameters<typeof resolveTypes>[0],
      card.subDiscipline ?? undefined,
    );
    const moveIds = (team.moveSets as TeamMoveSets)[cardId] ?? [];
    const moveSlots: MoveSlot[] = [];
    for (const id of moveIds) {
      const m = movesById.get(id);
      if (!m) return { code: "invalid" };
      moveSlots.push({
        move: m,
        ppLeft: m.pp,
        isTm: tmFlagBy.get(`${card.personId}:${m.id}`) ?? false,
      });
    }
    if (moveSlots.length === 0) return { code: "invalid" };

    battleCards.push({
      cardId,
      personName: card.personName,
      types,
      level: 50,
      maxHp: stats.hp,
      currentHp: stats.hp,
      stats,
      moves: moveSlots,
      status: null,
      volatile: { confusionTurnsLeft: 0, sleepTurnsLeft: 0 },
    });
  }

  return {
    playerId: userId,
    team: battleCards,
    activeIndex: 0,
  };
}

/**
 * Hydrate a single card into a one-member BattleSide — used by 1v1 quick
 * battles. Picks 4 random moves from the card's eligible learnset so the
 * user doesn't have to build a team first.
 */
export async function hydrateSingleCard(
  cardId: string,
  userId: string,
): Promise<BattleSide | HydrateError> {
  const cardRows = await db
    .select({
      cardId: cards.id,
      ownerId: cards.ownerId,
      isShiny: cards.isShiny,
      ivs: cards.ivs,
      personId: persons.id,
      personName: persons.name,
      discipline: persons.discipline,
      subDiscipline: persons.subDiscipline,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      baseStats: persons.baseStats,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(eq(cards.id, cardId))
    .limit(1);
  if (cardRows.length === 0) return { code: "invalid" };
  const card = cardRows[0];
  if (card.ownerId !== userId) return { code: "not-owned" };

  const learnset = await db
    .select({
      moveId: personLearnset.moveId,
      isTm: personLearnset.isTm,
    })
    .from(personLearnset)
    .where(eq(personLearnset.personId, card.personId));
  if (learnset.length === 0) return { code: "no-moves" };

  const moveIdsForCard = learnset.map((l) => l.moveId);
  const moveRows = await db
    .select()
    .from(moves)
    .where(inArray(moves.id, moveIdsForCard));
  const movesById = new Map(moveRows.map((m) => [m.id, m]));

  // Pick 4 random moves from the learnset.
  const shuffled = learnset.slice().sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 4);

  const ivs = card.ivs ?? generateIVs(cardId);
  const stats = computeFinalStats(card.baseStats, ivs, card.isShiny);
  const types = resolveTypes(
    card.discipline as Parameters<typeof resolveTypes>[0],
    card.subDiscipline ?? undefined,
  );

  const moveSlots: MoveSlot[] = [];
  for (const p of picked) {
    const m = movesById.get(p.moveId);
    if (!m) continue;
    moveSlots.push({ move: m, ppLeft: m.pp, isTm: p.isTm });
  }
  if (moveSlots.length === 0) return { code: "no-moves" };

  const battleCard: BattleCard = {
    cardId,
    personName: card.personName,
    types,
    level: 50,
    maxHp: stats.hp,
    currentHp: stats.hp,
    stats,
    moves: moveSlots,
    status: null,
    volatile: { confusionTurnsLeft: 0, sleepTurnsLeft: 0 },
  };

  return { playerId: userId, team: [battleCard], activeIndex: 0 };
}
