import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  moves,
  personLearnset,
  type Move,
  type NewLearnsetEntry,
  type Person,
} from "@/lib/db/schema";
import { MOVES, UNIVERSAL_TM_IDS } from "@/lib/data/moves";

// TM-learned moves deal 0.85× damage — a balance lever so cross-type TM
// slots stay useful without overshadowing native type moves.
export const TM_DAMAGE_MULTIPLIER = 0.85;

// Distribution rules (deterministic per personId so re-seeds are stable):
//   • Primary type: ALL moves of that type (up to 12) → natural learnset
//   • Secondary type: 6 random moves of that type (if person has one)
//   • Universal TMs: 4 random picks from the universal TM pool, flagged isTm
export function assignLearnset(person: Person): NewLearnsetEntry[] {
  const byType = new Map<string, Move[]>();
  for (const m of MOVES as Move[]) {
    const bucket = byType.get(m.type) ?? [];
    bucket.push(m);
    byType.set(m.type, bucket);
  }

  const entries: NewLearnsetEntry[] = [];
  const seen = new Set<string>();

  // Primary type — all of them, staggered learnedAtLevel for flavor.
  const primary = byType.get(person.primaryType) ?? [];
  primary.forEach((m, i) => {
    entries.push({
      personId: person.id,
      moveId: m.id,
      isTm: false,
      learnedAtLevel: 1 + i * 4,
    });
    seen.add(m.id);
  });

  // Secondary type — 6 random moves (deterministic shuffle by personId).
  if (person.secondaryType) {
    const pool = (byType.get(person.secondaryType) ?? []).filter(
      (m) => !seen.has(m.id),
    );
    const secRng = makeDeterministicRng(hashSeed(`${person.id}:secondary`));
    for (const m of shuffle(pool, secRng).slice(0, 6)) {
      entries.push({
        personId: person.id,
        moveId: m.id,
        isTm: false,
        learnedAtLevel: 10 + entries.length,
      });
      seen.add(m.id);
    }
  }

  // Universal TMs — 4 random picks (deterministic).
  const tmPool = (MOVES as Move[]).filter(
    (m) => UNIVERSAL_TM_IDS.has(m.id) && !seen.has(m.id),
  );
  const tmRng = makeDeterministicRng(hashSeed(`${person.id}:tm`));
  for (const m of shuffle(tmPool, tmRng).slice(0, 4)) {
    entries.push({
      personId: person.id,
      moveId: m.id,
      isTm: true,
      learnedAtLevel: null,
    });
    seen.add(m.id);
  }

  return entries;
}

export type EligibleMove = Move & { isTm: boolean; learnedAtLevel: number | null };

/** The set of moves a given Person can legally include on a card. */
export async function eligibleMoves(personId: string): Promise<EligibleMove[]> {
  const rows = await db
    .select({
      // move columns
      id: moves.id,
      name: moves.name,
      type: moves.type,
      category: moves.category,
      power: moves.power,
      accuracy: moves.accuracy,
      pp: moves.pp,
      priority: moves.priority,
      effect: moves.effect,
      flavor: moves.flavor,
      // learnset flags
      isTm: personLearnset.isTm,
      learnedAtLevel: personLearnset.learnedAtLevel,
    })
    .from(personLearnset)
    .innerJoin(moves, eq(personLearnset.moveId, moves.id))
    .where(eq(personLearnset.personId, personId));
  return rows;
}

// ─────────── helpers ────────────────────────────────────────────────────────

function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeDeterministicRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
