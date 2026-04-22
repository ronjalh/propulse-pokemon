import type { BaseStats } from "@/lib/db/schema";

// Total base stat sums follow classic Pokémon conventions:
// non-legendary ~475–505, legendary Mentors ~605.
export const DISCIPLINE_BASE_STATS: Record<string, BaseStats> = {
  Board:      { hp: 80, attack: 75,  defense: 75,  spAttack: 80,  spDefense: 80, speed: 85  }, // 475
  Propulsion: { hp: 85, attack: 100, defense: 70,  spAttack: 90,  spDefense: 65, speed: 85  }, // 495
  Mechanical: { hp: 95, attack: 85,  defense: 110, spAttack: 55,  spDefense: 85, speed: 55  }, // 485
  Marketing:  { hp: 75, attack: 65,  defense: 70,  spAttack: 95,  spDefense: 90, speed: 90  }, // 485
  IT:         { hp: 80, attack: 80,  defense: 80,  spAttack: 90,  spDefense: 80, speed: 95  }, // 505
  Business:   { hp: 85, attack: 80,  defense: 80,  spAttack: 80,  spDefense: 80, speed: 90  }, // 495
  Software:   { hp: 70, attack: 75,  defense: 70,  spAttack: 110, spDefense: 80, speed: 100 }, // 505
  Electrical: { hp: 70, attack: 75,  defense: 65,  spAttack: 105, spDefense: 75, speed: 110 }, // 500
  Mentors:    { hp: 100, attack: 120, defense: 95, spAttack: 110, spDefense: 95, speed: 85 }, // 605 (legendary)
};

export type Rarity = "common" | "rare" | "epic" | "legendary";

export function assignRarity(discipline: string, title: string): Rarity {
  if (discipline === "Mentors") return "legendary";
  if (discipline === "Board") return "epic";
  const t = title.toLowerCase();
  if (t.includes("chief") || t.includes("chairman") || t.includes("officer")) return "rare";
  if (t.includes("lead")) return "rare";
  return "common";
}
