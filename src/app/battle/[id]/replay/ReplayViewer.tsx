"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PropulseCard } from "@/components/card/PropulseCard";
import type { CardMeta } from "@/lib/battle/card-meta";
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
  cardMeta: Record<string, CardMeta>;
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
        <ReplayCard
          label="Opponent"
          card={opp.team[opp.activeIndex]}
          meta={props.cardMeta[opp.team[opp.activeIndex]?.cardId ?? ""]}
          alignRight
        />
        <ReplayCard
          label="You"
          card={me.team[me.activeIndex]}
          meta={props.cardMeta[me.team[me.activeIndex]?.cardId ?? ""]}
        />
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
            <div key={i}>{renderEvent(e, state, meSideIndex === -1 ? 0 : meSideIndex)}</div>
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
  meta,
  alignRight,
}: {
  label: string;
  card: BattleCard;
  meta: CardMeta | undefined;
  alignRight?: boolean;
}) {
  const pct = Math.max(0, (card.currentHp / card.maxHp) * 100);
  const barColour =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive";
  return (
    <div
      className={`rounded-lg border p-3 flex gap-3 ${
        card.currentHp === 0 ? "opacity-60 grayscale" : ""
      } ${alignRight ? "flex-row-reverse text-right" : ""}`}
    >
      {meta && (
        <div className="shrink-0">
          <PropulseCard
            size="sm"
            card={{ id: meta.cardId, isShiny: meta.isShiny, ivs: meta.ivs }}
            person={{
              name: meta.personName,
              title: meta.title,
              imageUrl: meta.imageUrl,
              discipline: meta.discipline as never,
              subDiscipline: meta.subDiscipline,
              primaryType: meta.primaryType as never,
              secondaryType: meta.secondaryType as never,
              baseStats: meta.baseStats,
              rarity: meta.rarity,
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="font-semibold truncate">{card.personName}</div>
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
    </div>
  );
}

type Ctx = { state: BattleState; meSideIndex: number };

function sideIndexOf(cardId: string, state: BattleState): number {
  for (let i = 0; i < state.sides.length; i++) {
    if (state.sides[i].team.some((c) => c.cardId === cardId)) return i;
  }
  return -1;
}

function labelledName(cardId: string, ctx: Ctx): string {
  const side = sideIndexOf(cardId, ctx.state);
  const name = (() => {
    for (const s of ctx.state.sides) {
      for (const c of s.team) {
        if (c.cardId === cardId) return c.personName;
      }
    }
    return cardId.slice(0, 6);
  })();
  if (side === -1) return name;
  return side === ctx.meSideIndex ? `You · ${name}` : `Foe · ${name}`;
}

function moveLabel(ev: { moveId: string; moveName?: string }): string {
  return ev.moveName ?? ev.moveId.replace(/_/g, " ");
}

function ownerLabel(playerId: string, ctx: Ctx): string {
  const idx = ctx.state.sides.findIndex((s) => s.playerId === playerId);
  if (idx === -1) return playerId.slice(0, 8);
  return idx === ctx.meSideIndex ? "You" : "Foe";
}

function renderEvent(event: BattleEvent, state: BattleState, meSideIndex: number): string {
  const ctx: Ctx = { state, meSideIndex };
  switch (event.kind) {
    case "move-used": {
      const who = labelledName(event.actorId, ctx);
      const target = labelledName(event.targetId, ctx);
      const name = moveLabel(event);
      const tags = [
        event.crit ? "CRIT!" : null,
        event.effectiveness >= 2 ? "super effective" : null,
        event.effectiveness > 0 && event.effectiveness < 1 ? "not very effective" : null,
        event.stab ? "STAB" : null,
      ].filter(Boolean);
      const tagStr = tags.length ? ` · ${tags.join(", ")}` : "";
      return `${who} used ${name} on ${target} — ${event.damage} dmg${tagStr}`;
    }
    case "miss":
      return `${labelledName(event.actorId, ctx)}'s ${moveLabel(event)} missed!`;
    case "no-effect": {
      const who = labelledName(event.actorId, ctx);
      const move = moveLabel(event);
      switch (event.reason) {
        case "immune":
          return `${move} has no effect on that target (immune).`;
        case "no-pp":
          return `${who} has no PP left on ${move}!`;
        case "status-failed":
          return `${move} failed — target already affected.`;
        case "no-handler":
          return `${move} fizzled (effect not yet implemented).`;
        case "invalid-slot":
          return `${who} fumbled — invalid move slot.`;
        default:
          return `${who}'s ${move} had no effect.`;
      }
    }
    case "switch-in": {
      const owner = ownerLabel(event.playerId, ctx);
      return `${owner} sent in ${labelledName(event.cardId, ctx).replace(/^(You|Foe) · /, "")}.`;
    }
    case "status-inflicted":
      return `${labelledName(event.actorId, ctx)} is now ${event.status}!`;
    case "status-tick":
      return `${labelledName(event.actorId, ctx)} took ${event.damage} ${event.status} damage.`;
    case "cant-move":
      return `${labelledName(event.actorId, ctx)} couldn't move (${event.reason}).`;
    case "hurt-in-confusion":
      return `${labelledName(event.actorId, ctx)} hurt itself in confusion — ${event.damage} dmg.`;
    case "faint":
      return `${labelledName(event.actorId, ctx)} fainted!`;
    case "battle-ended": {
      const sideIdx = state.sides.findIndex((s) => s.playerId === event.winnerId);
      const winner =
        sideIdx === -1
          ? event.winnerId.slice(0, 8)
          : sideIdx === meSideIndex
            ? "You"
            : "Foe";
      return `Battle ended — ${winner} wins.`;
    }
    default: {
      const _exhaustive: never = event;
      return JSON.stringify(event);
    }
  }
}
