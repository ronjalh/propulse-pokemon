"use server";

import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards, persons, type NewCard, type Person } from "@/lib/db/schema";
import { generateIVs, rollShiny } from "@/lib/cards/stats";
import { InsufficientCreditsError, logCardEvent, spend } from "@/lib/economy/credits";
import { PACKS, type PackType, type RarityWeights } from "./types";

type Rarity = "common" | "rare" | "epic" | "legendary";

function weightedRarity(weights: RarityWeights): Rarity {
  const total = weights.common + weights.rare + weights.epic + weights.legendary;
  let r = Math.random() * total;
  for (const rarity of ["common", "rare", "epic", "legendary"] as const) {
    r -= weights[rarity];
    if (r <= 0) return rarity;
  }
  return "common";
}

function pickPerson(pool: Person[], rarity: Rarity): Person {
  const filtered = pool.filter((p) => p.rarity === rarity);
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export async function openPackAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const packType = formData.get("packType") as PackType;
  const config = PACKS[packType];
  if (!config) redirect("/packs?error=invalid");

  const pool = config.disciplineFilter
    ? await db
        .select()
        .from(persons)
        .where(
          inArray(
            persons.discipline,
            config.disciplineFilter as Array<Person["discipline"]>,
          ),
        )
    : await db.select().from(persons);

  if (pool.length === 0) throw new Error("Empty person pool");

  try {
    await spend({
      userId,
      amount: config.costCredits,
      reason: `pack:${packType}`,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      redirect("/packs?error=insufficient");
    }
    throw err;
  }

  const rolls: NewCard[] = [];
  for (let i = 0; i < config.cardCount; i++) {
    let rarity = weightedRarity(config.weights);
    if (i === 0 && config.guaranteeRarePlus && rarity === "common") {
      rarity = "rare";
    }
    const person = pickPerson(pool, rarity);
    const cardId = crypto.randomUUID();
    rolls.push({
      id: cardId,
      personId: person.id,
      ownerId: userId,
      isShiny: rollShiny(cardId, config.shinyDenominator),
      ivs: generateIVs(cardId),
      moveIds: [],
    });
  }

  const inserted = await db
    .insert(cards)
    .values(rolls)
    .returning({ id: cards.id });

  for (const c of inserted) {
    await logCardEvent({
      userId,
      kind: "card_acquire",
      cardId: c.id,
      reason: `pack:${packType}`,
    });
  }

  const ids = inserted.map((c) => c.id).join(",");
  redirect(`/packs/result?ids=${ids}`);
}

