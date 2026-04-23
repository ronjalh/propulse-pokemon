import "server-only";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  cards,
  persons,
  type BaseStats,
  type IVs,
} from "@/lib/db/schema";

export type CardMeta = {
  cardId: string;
  isShiny: boolean;
  ivs: IVs;
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

/** Batch-fetch presentation data (name, image, stats) for a list of card ids. */
export async function fetchCardMeta(
  cardIds: string[],
): Promise<Record<string, CardMeta>> {
  if (cardIds.length === 0) return {};
  const rows = await db
    .select({
      cardId: cards.id,
      isShiny: cards.isShiny,
      ivs: cards.ivs,
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
    .where(inArray(cards.id, cardIds));

  const out: Record<string, CardMeta> = {};
  for (const r of rows) out[r.cardId] = r;
  return out;
}
