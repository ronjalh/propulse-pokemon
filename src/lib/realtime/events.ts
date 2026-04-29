import type { BattleEvent as EngineEvent } from "@/lib/battle/types";

// Slim payload — Pusher caps events at 10KB, so we can't send the full state.
// Only the fields the UI needs to visually update.
export type SlimTurnDelta = {
  turn: number;
  winnerId: string | null;
  sides: [SlimSide, SlimSide];
};
export type SlimSide = {
  playerId: string;
  activeIndex: number;
  team: SlimCard[];
};
export type SlimCard = {
  cardId: string;
  currentHp: number;
  status: string | null;
  confusionTurnsLeft: number;
  sleepTurnsLeft: number;
  /** PP remaining for each of this card's move slots, in order. */
  ppLeft: number[];
  /** Energy banked. Spent on moves; +1 each end-of-turn for the active card. */
  currentEnergy: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Transport-level events sent over Pusher — thin wrappers around the engine's
// in-memory `BattleEvent` union plus lifecycle events that only make sense
// over the wire (connect/disconnect, turn lifecycle, team lock-in).
//
// Discriminator field is `kind` — matches the engine convention.
// ─────────────────────────────────────────────────────────────────────────────

export type TurnLifecycleEvent =
  | { kind: "team-locked"; playerId: string }
  | { kind: "turn-start"; turn: number; deadlineMs: number }
  | {
      kind: "turn-resolved";
      turn: number;
      events: EngineEvent[];
      /** Slim delta of the new state — full state exceeds Pusher's 10KB limit. */
      delta: SlimTurnDelta;
    }
  | { kind: "player-disconnected"; playerId: string }
  | { kind: "player-reconnected"; playerId: string };

// The transport union includes every engine event so clients that only listen
// to Pusher see identical types to what the engine produces server-side.
export type BattleEventPayload = EngineEvent | TurnLifecycleEvent;

export type BattleEventKind = BattleEventPayload["kind"];

/** Pusher channel name for a given battle id. Private channel (ACL-gated). */
export function battleChannelName(battleId: string): string {
  return `private-battle-${battleId}`;
}

/** Pusher event name we publish under on each battle channel. */
export const BATTLE_EVENT_NAME = "battle.event";
