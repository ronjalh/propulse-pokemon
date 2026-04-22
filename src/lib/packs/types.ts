export type PackType = "base" | "premium" | "mentor";

export type RarityWeights = {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
};

export type PackConfig = {
  type: PackType;
  displayName: string;
  description: string;
  costCredits: number;
  cardCount: number;
  shinyDenominator: number;
  weights: RarityWeights;
  /** If true, the first card is forced rare+. */
  guaranteeRarePlus: boolean;
  /** Restrict pool to these disciplines only. */
  disciplineFilter?: string[];
};

export const PACKS: Record<PackType, PackConfig> = {
  base: {
    type: "base",
    displayName: "Base Pack",
    description: "Standard 5-card pull with at least one Rare+.",
    costCredits: 100,
    cardCount: 5,
    shinyDenominator: 64,
    weights: { common: 70, rare: 25, epic: 4, legendary: 1 },
    guaranteeRarePlus: true,
  },
  premium: {
    type: "premium",
    displayName: "Premium Pack",
    description: "Better odds, higher shiny rate.",
    costCredits: 250,
    cardCount: 5,
    shinyDenominator: 32,
    weights: { common: 50, rare: 35, epic: 12, legendary: 3 },
    guaranteeRarePlus: true,
  },
  mentor: {
    type: "mentor",
    displayName: "Mentor Pack",
    description: "Only Board and Mentor-tier members.",
    costCredits: 500,
    cardCount: 5,
    shinyDenominator: 32,
    weights: { common: 0, rare: 30, epic: 50, legendary: 20 },
    guaranteeRarePlus: true,
    disciplineFilter: ["Board", "Mentors"],
  },
};
