"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PropulseCard } from "@/components/card/PropulseCard";
import { abandonBattleAction } from "@/lib/battle/actions";
import type { CardMeta } from "@/lib/battle/card-meta";
import type { BattleCard, BattleEvent, BattleState, Intent } from "@/lib/battle/types";
import { useBattleChannel } from "@/lib/realtime/client";
import type { BattleEventPayload, SlimTurnDelta } from "@/lib/realtime/events";

type OpponentInfo = {
  displayName: string;
  imageUrl: string | null;
  isMirror: boolean;
};

type Props = {
  battleId: string;
  initialState: BattleState & { phase?: string; deadlineMs?: number };
  meSideIndex: number; // 0 or 1; for mirror, 0
  cardMeta: Record<string, CardMeta>;
  opponentInfo: OpponentInfo;
};

type LogLine = { id: number; text: string };

/** Apply a slim delta from Pusher onto a full BattleState kept in client state. */
function applyDelta(state: BattleState, delta: SlimTurnDelta): BattleState {
  const sides = state.sides.map((side, idx) => {
    const slim = delta.sides[idx];
    if (!slim || slim.playerId !== side.playerId) return side;
    const team = side.team.map((c) => {
      const slimCard = slim.team.find((x) => x.cardId === c.cardId);
      if (!slimCard) return c;
      return {
        ...c,
        currentHp: slimCard.currentHp,
        status: slimCard.status as BattleCard["status"],
        volatile: {
          confusionTurnsLeft: slimCard.confusionTurnsLeft,
          sleepTurnsLeft: slimCard.sleepTurnsLeft,
        },
        moves: c.moves.map((m, i) => ({
          ...m,
          ppLeft: slimCard.ppLeft[i] ?? m.ppLeft,
        })),
      };
    });
    return { ...side, activeIndex: slim.activeIndex, team };
  }) as [BattleState["sides"][0], BattleState["sides"][1]];
  return { ...state, turn: delta.turn, winnerId: delta.winnerId, sides };
}

export function BattleScreen({
  battleId,
  initialState,
  meSideIndex,
  cardMeta,
  opponentInfo,
}: Props) {
  const [state, setState] = useState<BattleState>(initialState);
  const [deadlineMs, setDeadlineMs] = useState<number>(
    (initialState as { deadlineMs?: number }).deadlineMs ?? Date.now() + 45_000,
  );
  const [log, setLog] = useState<LogLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<"moves" | "switch">("moves");
  const [intentSent, setIntentSent] = useState(false);
  const logSeq = useRef(0);

  function pushLog(text: string) {
    logSeq.current += 1;
    setLog((prev) => [...prev, { id: logSeq.current, text }].slice(-30));
  }

  // Polling fallback — fetch state every 2s so the UI stays in sync even if
  // Pusher drops events or isn't configured. Live Pusher events (below) will
  // usually arrive sooner; poll just catches anything missed.
  useEffect(() => {
    if (state.winnerId) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/battle/${battleId}/state`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const slim = (await res.json()) as SlimTurnDelta & {
          deadlineMs: number;
          phase: string;
          version: number;
        };
        setState((prev) => {
          // Skip if we already have this turn or a newer one (Pusher won the race).
          if (slim.turn < prev.turn) return prev;
          if (slim.turn === prev.turn && slim.winnerId === prev.winnerId) {
            // Still merge — active-index / hp could have changed within turn.
            return applyDelta(prev, slim);
          }
          return applyDelta(prev, slim);
        });
        setDeadlineMs((prev) =>
          slim.deadlineMs && slim.deadlineMs > 0 ? slim.deadlineMs : prev,
        );
        if (slim.turn > state.turn) setIntentSent(false);
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [battleId, state.winnerId, state.turn]);

  // Stream battle events from Pusher.
  useBattleChannel(battleId, (event: BattleEventPayload) => {
    switch (event.kind) {
      case "turn-start":
        setIntentSent(false);
        setDeadlineMs(event.deadlineMs);
        pushLog(`Turn ${event.turn} — choose an action.`);
        break;
      case "turn-resolved":
        setState((prev) => {
          const next = applyDelta(prev, event.delta);
          for (const e of event.events) pushLog(renderEvent(e, next));
          return next;
        });
        break;
      case "battle-ended":
        pushLog(`Battle ended — winner: ${event.winnerId}`);
        setState((prev) => ({ ...prev, winnerId: event.winnerId }));
        break;
      case "player-disconnected":
        pushLog(`${event.playerId} disconnected`);
        break;
      case "player-reconnected":
        pushLog(`${event.playerId} reconnected`);
        break;
      case "team-locked":
        pushLog(`${event.playerId} locked in their team.`);
        break;
      default:
        pushLog(renderEvent(event as BattleEvent, state));
    }
  });

  async function submitIntent(intent: Intent) {
    if (intentSent) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/battle/${battleId}/intent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intent),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setIntentSent(true);
        pushLog(`Submitted — waiting for opponent…`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const mySide = state.sides[meSideIndex];
  const oppSide = state.sides[1 - meSideIndex];
  const me = mySide.team[mySide.activeIndex];
  const opp = oppSide.team[oppSide.activeIndex];

  const ended = state.winnerId !== null;
  const mustSwitch = !ended && me.currentHp <= 0;

  // Auto-flip to switch menu when your active card is knocked out.
  useEffect(() => {
    if (mustSwitch && menu !== "switch") setMenu("switch");
  }, [mustSwitch, menu]);

  return (
    <div className="space-y-4">
      {/* Mobile: opponent stacks on top (DOM order). Desktop: YOU on left,
          opponent on right — swapped via Tailwind `order` utilities. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:order-2">
          <CardPanel
            side="opponent"
            card={opp}
            meta={cardMeta[opp.cardId]}
            opponentInfo={opponentInfo}
          />
        </div>
        <div className="md:order-1">
          <CardPanel side="me" card={me} meta={cardMeta[me.cardId]} />
        </div>
      </div>

      {ended ? (
        <EndScreen state={state} meSideIndex={meSideIndex} />
      ) : (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              Turn {state.turn} ·{" "}
              {intentSent
                ? "waiting for opponent…"
                : mustSwitch
                  ? "pick a replacement"
                  : "choose an action"}
            </div>
            <TurnTimer deadlineMs={deadlineMs} disabled={intentSent} />
          </div>

          {mustSwitch && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <b>{me.personName}</b> fainted — send in a replacement.
            </div>
          )}

          <div className="flex gap-2 text-xs">
            <button
              className={`px-2 py-1 rounded border ${menu === "moves" ? "bg-muted" : ""} ${
                mustSwitch ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => !mustSwitch && setMenu("moves")}
              disabled={mustSwitch}
            >
              Moves
            </button>
            <button
              className={`px-2 py-1 rounded border ${menu === "switch" ? "bg-muted" : ""}`}
              onClick={() => setMenu("switch")}
            >
              Switch
            </button>
          </div>

          {menu === "moves" ? (
            <div className="grid grid-cols-2 gap-2">
              {me.moves.map((slot, i) => (
                <Button
                  key={i}
                  variant="outline"
                  disabled={
                    submitting || intentSent || slot.ppLeft <= 0 || me.currentHp <= 0
                  }
                  onClick={() =>
                    submitIntent({
                      kind: "move",
                      playerId: mySide.playerId,
                      moveIndex: i,
                    })
                  }
                  className="justify-between h-auto py-2 text-left"
                >
                  <div>
                    <div className="font-medium">{slot.move.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {slot.move.type} · {slot.move.category}
                      {slot.move.power ? ` · ${slot.move.power}BP` : ""}
                      {slot.isTm ? " · TM" : ""}
                    </div>
                  </div>
                  <div className="text-xs tabular-nums">
                    {slot.ppLeft}/{slot.move.pp}
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mySide.team.map((c, i) => (
                <Button
                  key={c.cardId}
                  variant="outline"
                  disabled={
                    submitting ||
                    intentSent ||
                    i === mySide.activeIndex ||
                    c.currentHp <= 0
                  }
                  onClick={() =>
                    submitIntent({
                      kind: "switch",
                      playerId: mySide.playerId,
                      switchTo: i,
                    })
                  }
                  className="h-auto py-2 flex flex-col items-center"
                >
                  <div className="text-xs font-medium">{c.personName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.currentHp}/{c.maxHp} HP
                  </div>
                </Button>
              ))}
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive">{error}</div>
          )}
        </div>
      )}

      <EventLog log={log} />

      {!ended && (
        <form action={abandonBattleAction} className="flex justify-end">
          <input type="hidden" name="battleId" value={battleId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            Abandon battle
          </Button>
        </form>
      )}
    </div>
  );
}

function CardPanel({
  side,
  card,
  meta,
  opponentInfo,
}: {
  side: "opponent" | "me";
  card: BattleCard;
  meta: CardMeta | undefined;
  opponentInfo?: OpponentInfo;
}) {
  const pct = Math.max(0, (card.currentHp / card.maxHp) * 100);
  const barColour =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive";

  // Clearly-different tints so you never confuse the two panels.
  const themeClass =
    side === "opponent"
      ? "border-rose-500/40 bg-rose-500/10"
      : "border-sky-500/40 bg-sky-500/10";
  const headerLabel = side === "opponent" ? "Opponent" : "You";

  return (
    <div
      className={`rounded-lg border-2 p-3 flex gap-3 ${themeClass} ${
        card.currentHp === 0 ? "opacity-60 grayscale" : ""
      } ${side === "opponent" ? "flex-row-reverse text-right" : ""}`}
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
        <div
          className={`flex items-center gap-2 ${side === "opponent" ? "flex-row-reverse" : ""}`}
        >
          {side === "opponent" && opponentInfo && (
            <OpponentAvatar info={opponentInfo} />
          )}
          <div className={side === "opponent" ? "text-right" : ""}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {headerLabel}
            </div>
            {side === "opponent" && opponentInfo && (
              <div className="text-sm font-medium truncate max-w-[12rem]">
                {opponentInfo.displayName}
              </div>
            )}
          </div>
        </div>
        <div className="font-semibold truncate">{card.personName}</div>
        <div className="text-xs text-muted-foreground">
          {card.types.join(" / ")} · Lv {card.level}
          {card.status ? ` · ${card.status}` : ""}
        </div>
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div
            className={`h-full ${barColour} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs tabular-nums">
          {card.currentHp} / {card.maxHp} HP
        </div>
      </div>
    </div>
  );
}

function OpponentAvatar({ info }: { info: OpponentInfo }) {
  const letter = (info.displayName.trim()[0] ?? "?").toUpperCase();
  if (info.imageUrl) {
    return (
      <Image
        src={info.imageUrl}
        alt={info.displayName}
        width={40}
        height={40}
        className="rounded-full ring-2 ring-rose-400/60 shrink-0"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="w-10 h-10 rounded-full bg-rose-500/30 ring-2 ring-rose-400/60 flex items-center justify-center text-sm font-bold shrink-0"
    >
      {letter}
    </div>
  );
}

function TurnTimer({
  deadlineMs,
  disabled,
}: {
  deadlineMs: number;
  disabled: boolean;
}) {
  const [remaining, setRemaining] = useState(
    Math.max(0, deadlineMs - Date.now()),
  );
  useEffect(() => {
    if (disabled) return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, deadlineMs - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, [deadlineMs, disabled]);
  const s = Math.ceil(remaining / 1000);
  return (
    <div
      className={`font-mono text-sm tabular-nums ${
        s < 10 ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {s}s
    </div>
  );
}

function EventLog({ log }: { log: LogLine[] }) {
  return (
    <div className="rounded-lg border p-3 h-48 overflow-auto text-xs font-mono space-y-0.5">
      {log.length === 0 ? (
        <div className="text-muted-foreground">Battle log — events will appear here.</div>
      ) : (
        log.map((l) => <div key={l.id}>{l.text}</div>)
      )}
    </div>
  );
}

function EndScreen({
  state,
  meSideIndex,
}: {
  state: BattleState;
  meSideIndex: number;
}) {
  const iWon = state.winnerId === state.sides[meSideIndex].playerId;
  return (
    <div
      className={`rounded-lg border p-4 text-center ${
        iWon
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <div className="text-2xl font-bold">
        {iWon ? "Victory!" : "Defeat"}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {iWon
          ? "You win this match."
          : `${state.winnerId} wins this match.`}
      </div>
    </div>
  );
}

// ── Event rendering ────────────────────────────────────────────────────────

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
