export const POKEMON_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export type TypePair = readonly [PokemonType] | readonly [PokemonType, PokemonType];

type DisciplineKey =
  | "Board"
  | "Propulsion"
  | "Mechanical"
  | "Marketing"
  | "IT"
  | "Business"
  | "Software"
  | "Electrical"
  | "Mentors";

const DISCIPLINE_BASE: Record<DisciplineKey, TypePair> = {
  Board: ["Psychic"],
  Propulsion: ["Fire"],
  Mechanical: ["Steel"],
  Marketing: ["Fairy"],
  IT: ["Dark"],
  Business: ["Normal"],
  Software: ["Ghost"],
  Electrical: ["Electric"],
  Mentors: ["Dragon"],
};

const SUB_DISCIPLINE_OVERRIDES: Record<string, TypePair> = {
  "Propulsion/Thrust Chamber": ["Fire", "Fighting"],
  "Propulsion/Feed System": ["Fire", "Water"],
  "Mechanical/Inner Structure": ["Steel", "Rock"],
  "Mechanical/Outer Structure": ["Steel", "Flying"],
  "Mechanical/Recovery": ["Steel", "Flying"],
  "Mechanical/Launch Site": ["Steel", "Ground"],
  "IT/Developer": ["Dark", "Ghost"],
  "IT/DevOps": ["Dark", "Steel"],
  "Software/Engine Software": ["Ghost", "Fire"],
  "Software/Recovery Software": ["Ghost", "Flying"],
  "Software/Telemetry": ["Ghost", "Psychic"],
};

export function resolveTypes(
  discipline: DisciplineKey,
  subDiscipline?: string,
): TypePair {
  if (subDiscipline) {
    const key = `${discipline}/${subDiscipline}`;
    const override = SUB_DISCIPLINE_OVERRIDES[key];
    if (override) return override;
  }
  return DISCIPLINE_BASE[discipline];
}

export const TYPE_EFFECTIVENESS: Record<
  PokemonType,
  { strongAgainst: readonly PokemonType[]; weakAgainst: readonly PokemonType[]; immuneTo?: readonly PokemonType[] }
> = {
  Normal: { strongAgainst: [], weakAgainst: ["Rock", "Steel"], immuneTo: ["Ghost"] },
  Fire: { strongAgainst: ["Grass", "Ice", "Bug", "Steel"], weakAgainst: ["Fire", "Water", "Rock", "Dragon"] },
  Water: { strongAgainst: ["Fire", "Ground", "Rock"], weakAgainst: ["Water", "Grass", "Dragon"] },
  Electric: { strongAgainst: ["Water", "Flying"], weakAgainst: ["Electric", "Grass", "Dragon"], immuneTo: ["Ground"] },
  Grass: { strongAgainst: ["Water", "Ground", "Rock"], weakAgainst: ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"] },
  Ice: { strongAgainst: ["Grass", "Ground", "Flying", "Dragon"], weakAgainst: ["Fire", "Water", "Ice", "Steel"] },
  Fighting: { strongAgainst: ["Normal", "Ice", "Rock", "Dark", "Steel"], weakAgainst: ["Poison", "Flying", "Psychic", "Bug", "Fairy"], immuneTo: ["Ghost"] },
  Poison: { strongAgainst: ["Grass", "Fairy"], weakAgainst: ["Poison", "Ground", "Rock", "Ghost"], immuneTo: ["Steel"] },
  Ground: { strongAgainst: ["Fire", "Electric", "Poison", "Rock", "Steel"], weakAgainst: ["Grass", "Bug"], immuneTo: ["Flying"] },
  Flying: { strongAgainst: ["Grass", "Fighting", "Bug"], weakAgainst: ["Electric", "Rock", "Steel"] },
  Psychic: { strongAgainst: ["Fighting", "Poison"], weakAgainst: ["Psychic", "Steel"], immuneTo: ["Dark"] },
  Bug: { strongAgainst: ["Grass", "Psychic", "Dark"], weakAgainst: ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"] },
  Rock: { strongAgainst: ["Fire", "Ice", "Flying", "Bug"], weakAgainst: ["Fighting", "Ground", "Steel"] },
  Ghost: { strongAgainst: ["Psychic", "Ghost"], weakAgainst: ["Dark"], immuneTo: ["Normal"] },
  Dragon: { strongAgainst: ["Dragon"], weakAgainst: ["Steel"], immuneTo: ["Fairy"] },
  Dark: { strongAgainst: ["Psychic", "Ghost"], weakAgainst: ["Fighting", "Dark", "Fairy"] },
  Steel: { strongAgainst: ["Ice", "Rock", "Fairy"], weakAgainst: ["Fire", "Water", "Electric", "Steel"] },
  Fairy: { strongAgainst: ["Fighting", "Dragon", "Dark"], weakAgainst: ["Fire", "Poison", "Steel"] },
};

export function typeMultiplier(attack: PokemonType, defenders: TypePair): number {
  const chart = TYPE_EFFECTIVENESS[attack];
  let mult = 1;
  for (const def of defenders) {
    if (chart.immuneTo?.includes(def)) return 0;
    if (chart.strongAgainst.includes(def)) mult *= 2;
    else if (chart.weakAgainst.includes(def)) mult *= 0.5;
  }
  return mult;
}
