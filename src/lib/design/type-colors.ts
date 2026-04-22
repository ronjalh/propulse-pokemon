import type { PokemonType } from "@/lib/data/type-mapping";

/** Classic Pokémon type color palette. Hex for inline style and gradients. */
export const TYPE_COLORS: Record<PokemonType, string> = {
  Normal: "#A8A878",
  Fire: "#F08030",
  Water: "#6890F0",
  Electric: "#F8D030",
  Grass: "#78C850",
  Ice: "#98D8D8",
  Fighting: "#C03028",
  Poison: "#A040A0",
  Ground: "#E0C068",
  Flying: "#A890F0",
  Psychic: "#F85888",
  Bug: "#A8B820",
  Rock: "#B8A038",
  Ghost: "#705898",
  Dragon: "#7038F8",
  Dark: "#705848",
  Steel: "#B8B8D0",
  Fairy: "#EE99AC",
};

/** Darker tint (for text on light gradients). */
export const TYPE_COLORS_DARK: Record<PokemonType, string> = {
  Normal: "#6D6D4E",
  Fire: "#9C531F",
  Water: "#445E9C",
  Electric: "#A1871F",
  Grass: "#4E8234",
  Ice: "#638D8D",
  Fighting: "#7D1F1A",
  Poison: "#682A68",
  Ground: "#927D44",
  Flying: "#6D5E9C",
  Psychic: "#A13959",
  Bug: "#6D7815",
  Rock: "#786824",
  Ghost: "#493963",
  Dragon: "#4924A1",
  Dark: "#49392F",
  Steel: "#787887",
  Fairy: "#9B6470",
};

export function rarityBorderClass(
  rarity: "common" | "rare" | "epic" | "legendary",
): string {
  switch (rarity) {
    case "legendary":
      return "border-amber-400 ring-2 ring-amber-300/50";
    case "epic":
      return "border-purple-400 ring-1 ring-purple-300/50";
    case "rare":
      return "border-blue-400";
    default:
      return "border-zinc-400/30";
  }
}
