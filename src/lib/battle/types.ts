import type { PokemonType, TypePair } from "@/lib/data/type-mapping";
import type { BaseStats, Move } from "@/lib/db/schema";

export type StatusCondition =
  | "poison"
  | "burn"
  | "paralysis"
  | "sleep"
  | "freeze"
  | "confusion";

export type MoveSlot = {
  move: Move;
  ppLeft: number;
  /** True when this move was learned as a cross-type TM; damage is multiplied by 0.85×. */
  isTm?: boolean;
};

export type BattleCard = {
  cardId: string;
  personName: string;
  types: TypePair;
  level: number;
  maxHp: number;
  currentHp: number;
  stats: BaseStats;
  moves: MoveSlot[];
  status: Exclude<StatusCondition, "confusion"> | null;
  volatile: {
    confusionTurnsLeft: number;
    sleepTurnsLeft: number;
  };
};

export type BattleSide = {
  playerId: string;
  team: BattleCard[];
  activeIndex: number;
};

export type BattleState = {
  battleId: string;
  turn: number;
  rngSeed: number;
  sides: [BattleSide, BattleSide];
  winnerId: string | null;
};

export type Intent =
  | { kind: "move"; playerId: string; moveIndex: number }
  | { kind: "switch"; playerId: string; switchTo: number };

export type BattleEvent =
  | {
      kind: "move-used";
      actorId: string;
      targetId: string;
      moveId: string;
      damage: number;
      crit: boolean;
      effectiveness: number;
      stab: boolean;
    }
  | { kind: "miss"; actorId: string; moveId: string }
  | { kind: "no-effect"; actorId: string; moveId: string }
  | { kind: "switch-in"; playerId: string; cardId: string }
  | {
      kind: "status-inflicted";
      actorId: string;
      status: StatusCondition;
    }
  | {
      kind: "status-tick";
      actorId: string;
      status: StatusCondition;
      damage: number;
    }
  | { kind: "cant-move"; actorId: string; reason: "paralysis" | "sleep" | "freeze" | "confusion" }
  | { kind: "hurt-in-confusion"; actorId: string; damage: number }
  | { kind: "faint"; actorId: string }
  | { kind: "battle-ended"; winnerId: string };

export type AttackingType = PokemonType;
