"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { BattleCard, BattleEvent, BattleState } from "@/lib/battle/types";

type TurnLogEntry = {
  turn: number;
  events: BattleEvent[];
  stateAfter: BattleState;
};

type Props = {
  initialState: BattleState;
  turnLog: TurnLogEntry[];
  finalState: BattleState;
  meUserId: string;
};

export function ReplayViewer(props: Props) {
  const [index, setIndex] = useState(0); // 0 = initial, 1..N = after turn 1..N

  const state = useMemo<BattleState>(() => {
    if (index === 0) return props.initialState;
    const entry = props.turnLog[index - 1];
    return entry ? entry.stateAfter : props.finalState;
  }, [index, props.initialState, props.turnLog, props.finalState]);

  const eventsThisStep =
    index === 0 ? [] : (props.turnLog[index - 1]?.events ?? []);

  const max = props.turnLog.length;
  const meSideIndex = state.sides.findIndex(
    (s) => s.playerId === props.meUserId,
  );
  const me = state.sides[meSideIndex === -1 ? 0 : meSideIndex];
  const opp = state.sides[1 - (meSideIndex === -1 ? 0 : meSideIndex)];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setIndex(0)}
          disabled={index === 0}
        >
          ⏮
        </Button>
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          ← prev
        </Button>
        <div className="text-sm tabular-nums flex-1 text-center">
          {index === 0 ? "Start" : `Turn ${index}`} of {max}
        </div>
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.min(max, i + 1))}
          disabled={index === max}
        >
          next →
        </Button>
        <Button
          variant="outline"
          onClick={() => setIndex(max)}
          disabled={index === max}
        >
          ⏭
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReplayCard label="Opponent" card={opp.team[opp.activeIndex]} alignRight />
        <ReplayCard label="You" card={me.team[me.activeIndex]} />
      </div>

      <div className="rounded-lg border p-3 text-xs font-mono space-y-0.5 max-h-56 overflow-auto">
        {eventsThisStep.length === 0 ? (
          <div className="text-muted-foreground">
            {index === 0
              ? "Initial state — scroll forward to play through the battle."
              : "(no engine events for this step)"}
          </div>
        ) : (
          eventsThisStep.map((e, i) => (
            <div key={i}>{renderEvent(e, state)}</div>
          ))
        )}
      </div>

      {state.winnerId && index === max && (
        <div
          className={`rounded-lg border p-4 text-center ${
            state.winnerId === props.meUserId
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="text-xl font-bold">
            {state.winnerId === props.meUserId ? "You won this battle" : "You lost this battle"}
          </div>
        </div>
      )}
    </div>
  );
}

function ReplayCard({
  label,
  card,
  alignRight,
}: {
  label: string;
  card: BattleCard;
  alignRight?: boolean;
}) {
  const pct = Math.max(0, (card.currentHp / card.maxHp) * 100);
  const barColour =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive";
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        card.currentHp === 0 ? "opacity-50 grayscale" : ""
      } ${alignRight ? "text-right" : ""}`}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-semibold">{card.personName}</div>
      <div className="text-xs text-muted-foreground">
        {card.types.join(" / ")}
        {card.status ? ` · ${card.status}` : ""}
      </div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className={`h-full ${barColour}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs tabular-nums">
        {card.currentHp} / {card.maxHp} HP
      </div>
    </div>
  );
}

function nameFor(cardId: string, state: BattleState): string {
  for (const side of state.sides) {
    for (const c of side.team) {
      if (c.cardId === cardId) return c.personName;
    }
  }
  return cardId.slice(0, 6);
}

function renderEvent(event: BattleEvent, state: BattleState): string {
  switch (event.kind) {
    case "move-used": {
      const who = nameFor(event.actorId, state);
      const target = nameFor(event.targetId, state);
      const tags = [
        event.crit ? "crit!" : null,
        event.effectiveness > 1 ? "super effective" : null,
        event.effectiveness < 1 && event.effectiveness > 0 ? "not very effective" : null,
        event.stab ? "STAB" : null,
      ].filter(Boolean);
      const tagStr = tags.length ? ` (${tags.join(", ")})` : "";
      return `${who} used ${event.moveId} on ${target} — ${event.damage} dmg${tagStr}`;
    }
    case "miss":
      return `${nameFor(event.actorId, state)} missed!`;
    case "no-effect":
      return `${nameFor(event.actorId, state)}'s move had no effect.`;
    case "switch-in":
      return `${event.playerId} sent in ${nameFor(event.cardId, state)}`;
    case "status-inflicted":
      return `${nameFor(event.actorId, state)} is now ${event.status}.`;
    case "status-tick":
      return `${nameFor(event.actorId, state)} took ${event.damage} ${event.status} damage.`;
    case "cant-move":
      return `${nameFor(event.actorId, state)} couldn't move (${event.reason}).`;
    case "hurt-in-confusion":
      return `${nameFor(event.actorId, state)} hurt itself in confusion — ${event.damage} dmg.`;
    case "faint":
      return `${nameFor(event.actorId, state)} fainted!`;
    case "battle-ended":
      return `Battle ended. Winner: ${event.winnerId}`;
    default: {
      const _exhaustive: never = event;
      return JSON.stringify(event);
    }
  }
}
