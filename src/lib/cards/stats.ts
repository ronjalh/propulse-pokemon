import type { BaseStats } from "@/lib/db/schema";

// FNV-1a 32-bit — small, fast, uniform enough for deterministic IVs.
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type IVs = {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
};

const STAT_KEYS: Array<keyof IVs> = [
  "hp",
  "attack",
  "defense",
  "spAttack",
  "spDefense",
  "speed",
];

/** Deterministic IVs 0–31 per stat, seeded by card id. */
export function generateIVs(cardId: string): IVs {
  const out = {} as IVs;
  for (const stat of STAT_KEYS) {
    out[stat] = fnv1a(`${cardId}:iv:${stat}`) % 32;
  }
  return out;
}

/** Shiny ("Feminist") variant roll. Default base rate: 1/64. */
export function rollShiny(cardId: string, baseRate = 64): boolean {
  return fnv1a(`${cardId}:shiny`) % baseRate === 0;
}

/** Maps a card's level (1..5) to its effective battle level. */
export function battleLevelFor(cardLevel: number): number {
  const lvl = Math.max(1, Math.min(5, cardLevel));
  return 50 + (lvl - 1) * 10; // lvl1 → 50, lvl5 → 90
}

/** Classic Pokémon stat formula. Card level defaults to 1 (battle level 50). */
export function computeFinalStats(
  base: BaseStats,
  ivs: IVs,
  isShiny: boolean,
  cardLevel: number = 1,
): BaseStats {
  const level = battleLevelFor(cardLevel);
  const shinyMult = isShiny ? 1.1 : 1;
  const calc = (b: number, iv: number, isHp = false) => {
    const raw = Math.floor(((2 * b + iv) * level) / 100);
    const bonus = isHp ? level + 10 : 5;
    return Math.floor((raw + bonus) * shinyMult);
  };

  return {
    hp: calc(base.hp, ivs.hp, true),
    attack: calc(base.attack, ivs.attack),
    defense: calc(base.defense, ivs.defense),
    spAttack: calc(base.spAttack, ivs.spAttack),
    spDefense: calc(base.spDefense, ivs.spDefense),
    speed: calc(base.speed, ivs.speed),
  };
}

/**
 * How many duplicate cards you need to burn to advance from this level
 * to the next. `null` = already max level.
 *   lvl 1→2: 1 dup
 *   lvl 2→3: 2 dups
 *   lvl 3→4: 3 dups
 *   lvl 4→5: 5 dups
 */
export const LEVEL_UP_COST: Record<number, number | null> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: null,
};

export const MAX_CARD_LEVEL = 5;
