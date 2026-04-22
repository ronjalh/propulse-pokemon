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

/** Classic Pokémon stat formula at level 50, no nature multiplier yet. */
export function computeFinalStats(
  base: BaseStats,
  ivs: IVs,
  isShiny: boolean,
): BaseStats {
  const level = 50;
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
