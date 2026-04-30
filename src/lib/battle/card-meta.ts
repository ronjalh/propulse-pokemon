import "server-only";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  cards,
  persons,
  type BaseStats,
  type IVs,
} from "@/lib/db/schema";
import { resolveRealCardId } from "./card-id";

export type CardMeta = {
  cardId: string;
  isShiny: boolean;
  ivs: IVs;
  /** Card progression level (1..5), as stored in the cards table. Distinct
   *  from BattleCard.level which is the Pokémon-formula battle level (50..90). */
  level: number;
  personName: string;
  title: string;
  imageUrl: string;
  discipline: string;
  subDiscipline: string | null;
  primaryType: string;
  secondaryType: string | null;
  rarity: "common" | "rare" | "epic" | "legendary";
  baseStats: BaseStats;
};

/** Batch-fetch presentation data (name, image, stats) for a list of card ids.
 *  Accepts mirror-prefixed ids (`mirror-<uuid>`) and looks them up under the
 *  original uuid, aliasing the result back to the battle cardId. */
export async function fetchCardMeta(
  cardIds: string[],
): Promise<Record<string, CardMeta>> {
  if (cardIds.length === 0) return {};

  // Map battle-cardId → real-cardId for the DB lookup. Only real UUIDs hit
  // the cards table; mirror cards are aliased to their source.
  const battleToReal = new Map<string, string>();
  const realIds = new Set<string>();
  for (const id of cardIds) {
    const real = resolveRealCardId(id);
    battleToReal.set(id, real);
    realIds.add(real);
  }

  const rows = await db
    .select({
      cardId: cards.id,
      isShiny: cards.isShiny,
      ivs: cards.ivs,
      level: cards.level,
      personName: persons.name,
      title: persons.title,
      imageUrl: persons.imageUrl,
      discipline: persons.discipline,
      subDiscipline: persons.subDiscipline,
      primaryType: persons.primaryType,
      secondaryType: persons.secondaryType,
      rarity: persons.rarity,
      baseStats: persons.baseStats,
    })
    .from(cards)
    .innerJoin(persons, eq(cards.personId, persons.id))
    .where(inArray(cards.id, [...realIds]));

  const byReal = new Map(rows.map((r) => [r.cardId, r]));

  const out: Record<string, CardMeta> = {};
  for (const battleId of cardIds) {
    const real = battleToReal.get(battleId)!;
    const meta = byReal.get(real);
    if (!meta) continue;
    // Re-key to the battle cardId so downstream `cardMeta[card.cardId]` works.
    out[battleId] = { ...meta, cardId: battleId };
  }
  return out;
}
