"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Skull } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PropulseCard } from "@/components/card/PropulseCard";
import { abandonBattleAction } from "@/lib/battle/actions";
import type { CardMeta } from "@/lib/battle/card-meta";
import type { BattleCard, BattleEvent, BattleSide, BattleState, Intent } from "@/lib/battle/types";
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
  /** Track which turn numbers we've already shown events for so Pusher and
   *  polling don't both log the same turn. */
  const loggedTurnsRef = useRef<Set<number>>(new Set());

  /** Per-card hit animation trigger. `key` increments to retrigger Framer
   *  Motion. `amount` drives the floating damage number. */
  const [hits, setHits] = useState<
    Record<string, { amount: number; key: number }>
  >({});
  const hitSeq = useRef(0);
  function triggerHit(cardId: string, amount: number) {
    hitSeq.current += 1;
    const key = hitSeq.current;
    setHits((h) => ({ ...h, [cardId]: { amount, key } }));
    // Clear after 1.5s so AnimatePresence removes the motion-div cleanly.
    setTimeout(() => {
      setHits((h) => {
        if (h[cardId]?.key !== key) return h;
        const next = { ...h };
        delete next[cardId];
        return next;
      });
    }, 1500);
  }

  function pushLog(text: string) {
    logSeq.current += 1;
    setLog((prev) => [...prev, { id: logSeq.current, text }].slice(-50));
  }

  function logTurnOnce(
    turn: number,
    events: BattleEvent[],
    stateForNames: BattleState,
  ) {
    if (loggedTurnsRef.current.has(turn)) return;
    loggedTurnsRef.current.add(turn);
    for (const e of events) {
      pushLog(renderEvent(e, stateForNames, meSideIndex));
      // Trigger hit animation for damage events so the target card shakes
      // and a floating damage number appears.
      if (e.kind === "move-used" && e.damage > 0) {
        triggerHit(e.targetId, e.damage);
      } else if (e.kind === "status-tick" && e.damage > 0) {
        triggerHit(e.actorId, e.damage);
      } else if (e.kind === "hurt-in-confusion" && e.damage > 0) {
        triggerHit(e.actorId, e.damage);
      }
    }
  }

  // Polling fallback — fetch state every 2s so the UI stays in sync even if
  // Pusher drops events or isn't configured. Also replays any turn events
  // the client missed via the `recentTurns` field.
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
          recentTurns?: { turn: number; events: BattleEvent[] }[];
        };
        // Log any turns we haven't seen yet (pre-state-update names are fine —
        // cards don't rename mid-battle).
        if (slim.recentTurns?.length) {
          for (const t of slim.recentTurns) {
            logTurnOnce(t.turn, t.events, state);
          }
        }
        setState((prev) => {
          if (slim.turn < prev.turn) return prev;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, state.winnerId, state.turn, meSideIndex]);

  // Stream battle events from Pusher.
  useBattleChannel(battleId, (event: BattleEventPayload) => {
    switch (event.kind) {
      case "turn-start":
        setIntentSent(false);
        setDeadlineMs(event.deadlineMs);
        pushLog(`Turn ${event.turn} — choose an action.`);
        break;
      case "turn-resolved": {
        // Log events for this turn (once — polling fallback uses the same
        // loggedTurns set so we don't double-log).
        logTurnOnce(event.turn, event.events, state);
        setState((prev) => applyDelta(prev, event.delta));
        break;
      }
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
        pushLog(renderEvent(event as BattleEvent, state, meSideIndex));
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
        // Pretty-log what the player picked so they can sanity-check before
        // the turn resolves.
        const myActive = state.sides[meSideIndex].team[state.sides[meSideIndex].activeIndex];
        if (intent.kind === "move") {
          const slot = myActive.moves[intent.moveIndex];
          pushLog(
            `You chose: ${myActive.personName} · ${slot?.move.name ?? "move"} — waiting for opponent…`,
          );
        } else {
          const target = state.sides[meSideIndex].team[intent.switchTo];
          pushLog(
            `You chose: switch to ${target?.personName ?? "…"} — waiting for opponent…`,
          );
        }
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

  // Reset intentSent whenever the turn number advances, no matter whether
  // that came through Pusher or polling. Prevents the "WAITING FOR OPPONENT"
  // banner from getting stuck after state already moved on.
  useEffect(() => {
    setIntentSent(false);
  }, [state.turn]);

  return (
    <div className="space-y-4">
      {/* Mobile: opponent stacks on top (DOM order). Desktop: YOU on left,
          opponent on right — swapped via Tailwind `order` utilities. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:order-2">
          <CardPanel
            side="opponent"
            card={opp}
            battleSide={oppSide}
            meta={cardMeta[opp.cardId]}
            opponentInfo={opponentInfo}
            hit={hits[opp.cardId]}
          />
        </div>
        <div className="md:order-1">
          <CardPanel
            side="me"
            card={me}
            battleSide={mySide}
            meta={cardMeta[me.cardId]}
            hit={hits[me.cardId]}
          />
        </div>
      </div>

      {ended ? (
        <EndScreen state={state} meSideIndex={meSideIndex} />
      ) : (
        <div className="rounded-lg border p-3 space-y-3">
          {/* Big turn-state banner — impossible to miss whose turn it is. */}
          <TurnBanner
            turn={state.turn}
            state={
              intentSent
                ? "waiting"
                : mustSwitch
                  ? "must-switch"
                  : "your-turn"
            }
            deadlineMs={deadlineMs}
            activeName={me.personName}
          />

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
              {me.moves.map((slot, i) => {
                const effectTag = slot.move.effect
                  ? ` · effect: ${slot.move.effect.replace(/_/g, " ")}`
                  : "";
                const tooltip = `${slot.move.name}\n${slot.move.flavor}\n\n${slot.move.type} · ${slot.move.category}${
                  slot.move.power ? ` · ${slot.move.power} BP` : ""
                } · ${slot.move.accuracy}% accuracy · ${slot.ppLeft}/${slot.move.pp} PP${
                  slot.isTm ? " · TM (0.85× dmg)" : ""
                }${effectTag}`;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    title={tooltip}
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
                    className="justify-between h-auto py-2 text-left group/move"
                  >
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-1.5">
                        {slot.move.name}
                        <Info className="size-3 opacity-40 group-hover/move:opacity-80 transition-opacity shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {slot.move.type} · {slot.move.category}
                        {slot.move.power ? ` · ${slot.move.power}BP` : ""}
                        {slot.isTm ? " · TM" : ""}
                      </div>
                      <div className="text-xs text-muted-foreground/80 truncate mt-0.5 italic">
                        {slot.move.flavor}
                      </div>
                    </div>
                    <div className="text-xs tabular-nums shrink-0 ml-2">
                      {slot.ppLeft}/{slot.move.pp}
                    </div>
                  </Button>
                );
              })}
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
                  <div className="text-xs text-muted-foreground">
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
  battleSide,
  meta,
  opponentInfo,
  hit,
}: {
  side: "opponent" | "me";
  card: BattleCard;
  battleSide: BattleSide;
  meta: CardMeta | undefined;
  opponentInfo?: OpponentInfo;
  hit?: { amount: number; key: number };
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
    <motion.div
      // Card-shake on hit. Key change retriggers the animation.
      animate={
        hit
          ? { x: [0, -6, 5, -4, 3, -2, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.45, ease: "easeInOut" }}
      key={`panel-${hit?.key ?? 0}`}
      className={`relative rounded-lg border-2 p-3 flex gap-3 ${themeClass} ${
        card.currentHp === 0 ? "opacity-60 grayscale" : ""
      } ${side === "opponent" ? "flex-row-reverse text-right" : ""}`}
    >
      {/* Floating damage number on hit. */}
      <AnimatePresence>
        {hit && (
          <motion.div
            key={hit.key}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1.15 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 z-20 text-3xl font-black text-rose-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          >
            -{hit.amount}
          </motion.div>
        )}
      </AnimatePresence>
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
            className={`h-full ${barColour} transition-[width] duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs tabular-nums">
          {card.currentHp} / {card.maxHp} HP
        </div>
        <TeamRoster side={side} battleSide={battleSide} />
      </div>
    </motion.div>
  );
}

/** A compact roster of the side's team: filled dot for alive, skull for fainted,
 *  the active card's dot has a ring. Hide entirely for 1v1 mode (nothing to track). */
function TeamRoster({
  side,
  battleSide,
}: {
  side: "opponent" | "me";
  battleSide: BattleSide;
}) {
  if (battleSide.team.length <= 1) return null;
  const aliveColour = side === "opponent" ? "bg-rose-500" : "bg-sky-500";
  const activeRing =
    side === "opponent" ? "ring-2 ring-rose-300" : "ring-2 ring-sky-300";
  const fainted = battleSide.team.filter((c) => c.currentHp <= 0).length;
  return (
    <div
      className={`flex items-center gap-1 pt-1 ${
        side === "opponent" ? "justify-end" : ""
      }`}
      aria-label={`${fainted} of ${battleSide.team.length} fainted`}
    >
      {battleSide.team.map((c, i) => {
        const dead = c.currentHp <= 0;
        const isActive = i === battleSide.activeIndex;
        if (dead) {
          return (
            <Skull
              key={c.cardId}
              className="size-4 text-muted-foreground/80"
              aria-label={`${c.personName} fainted`}
            />
          );
        }
        return (
          <div
            key={c.cardId}
            className={`size-3 rounded-full ${aliveColour} ${
              isActive ? activeRing : "opacity-70"
            }`}
            aria-label={`${c.personName} — ${c.currentHp}/${c.maxHp} HP${
              isActive ? " (active)" : ""
            }`}
            title={`${c.personName} (${c.currentHp}/${c.maxHp})`}
          />
        );
      })}
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

/** Prominent banner at the top of the action panel: YOUR TURN / WAITING / FAINTED. */
function TurnBanner({
  state,
  turn,
  deadlineMs,
  activeName,
}: {
  state: "your-turn" | "waiting" | "must-switch";
  turn: number;
  deadlineMs: number;
  activeName: string;
}) {
  const styles =
    state === "your-turn"
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : state === "must-switch"
        ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 animate-pulse"
        : "border-muted-foreground/30 bg-muted/40 text-muted-foreground";
  const label =
    state === "your-turn"
      ? "YOUR TURN"
      : state === "must-switch"
        ? `⚠ ${activeName.toUpperCase()} FAINTED — PICK A REPLACEMENT`
        : "WAITING FOR OPPONENT…";
  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 flex items-center justify-between gap-3 font-bold ${styles}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide opacity-75 tabular-nums">
          Turn {turn}
        </span>
        <span className="text-base tracking-wide">{label}</span>
      </div>
      <TurnTimer deadlineMs={deadlineMs} disabled={state !== "your-turn"} />
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
  // Start null so SSR and first client render match. Populate on mount.
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadlineMs - Date.now()));
    tick();
    if (disabled) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadlineMs, disabled]);
  const s = remaining == null ? null : Math.ceil(remaining / 1000);
  return (
    <div
      className={`font-mono text-sm tabular-nums ${
        s != null && s < 10 ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {s == null ? "—" : `${s}s`}
    </div>
  );
}

function EventLog({ log }: { log: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Auto-scroll to the newest line whenever the log grows.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);
  return (
    <div
      ref={ref}
      className="rounded-lg border p-3 h-56 overflow-auto text-sm font-mono space-y-0.5 bg-muted/20"
    >
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

type Ctx = { state: BattleState; meSideIndex: number };

/** Find which side owns a given cardId. Returns -1 if not on any side. */
function sideIndexOf(cardId: string, state: BattleState): number {
  for (let i = 0; i < state.sides.length; i++) {
    if (state.sides[i].team.some((c) => c.cardId === cardId)) return i;
  }
  return -1;
}

/** "You · Milton" or "Foe · Simen". */
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

/** Returns a user-facing display name for a move (falls back to moveId slug). */
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
          return `${move} failed — the target's already affected.`;
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
          ? `${event.winnerId.slice(0, 8)}`
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
