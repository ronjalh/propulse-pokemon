"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { TeamMoveSets } from "@/lib/db/schema";
import { saveTeamAction } from "@/lib/teams/actions";
import {
  MOVES_PER_CARD,
  TEAM_SIZE,
  validateTeam,
} from "@/lib/teams/validation";
import type {
  EligibleMoveRow,
  OwnedCard,
} from "@/lib/teams/queries";
import { typeMultiplier, TYPE_EFFECTIVENESS, type PokemonType } from "@/lib/data/type-mapping";

type Props = {
  teamId: string;
  initialName: string;
  initialCardIds: string[];
  initialMoveSets: TeamMoveSets;
  ownedCards: OwnedCard[];
  eligibleByCard: Record<string, EligibleMoveRow[]>;
};

export function TeamEditor(props: Props) {
  const [name, setName] = useState(props.initialName);
  const [cardIds, setCardIds] = useState<string[]>(() => {
    const padded = [...props.initialCardIds];
    while (padded.length < TEAM_SIZE) padded.push("");
    return padded.slice(0, TEAM_SIZE);
  });
  const [moveSets, setMoveSets] = useState<TeamMoveSets>(props.initialMoveSets);
  const [saveState, setSaveState] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; errors: string[] }
  >({ kind: "idle" });
  const [, startTransition] = useTransition();

  const cardsById = useMemo(() => {
    const m = new Map<string, OwnedCard>();
    for (const c of props.ownedCards) m.set(c.cardId, c);
    return m;
  }, [props.ownedCards]);

  const selectedSet = new Set(cardIds.filter(Boolean));

  // Live client-side validation — server validates again authoritatively.
  const clientErrors = useMemo(() => {
    const eligibleIds = new Map<string, Set<string>>();
    for (const [cardId, moves] of Object.entries(props.eligibleByCard)) {
      eligibleIds.set(cardId, new Set(moves.map((m) => m.id)));
    }
    const draft = {
      name,
      cardIds: cardIds.filter(Boolean),
      moveSets,
    };
    return validateTeam(draft, eligibleIds);
  }, [name, cardIds, moveSets, props.eligibleByCard]);

  const complete = clientErrors.length === 0;

  function setSlot(slotIndex: number, newCardId: string) {
    setCardIds((prev) => {
      const next = [...prev];
      const oldCardId = next[slotIndex];
      next[slotIndex] = newCardId;
      return next;
    });
    // When a card slot changes, drop any move-set bound to the previous card
    // for that slot — but keep other cards' sets intact.
    setMoveSets((prev) => {
      const next = { ...prev };
      const oldCardId = cardIds[slotIndex];
      if (oldCardId && !cardIds.includes(oldCardId)) delete next[oldCardId];
      // Fresh empty move list for the newly assigned card, if any.
      if (newCardId && !next[newCardId]) next[newCardId] = [];
      return next;
    });
  }

  function setMoveAt(cardId: string, moveSlot: number, newMoveId: string) {
    setMoveSets((prev) => {
      const current = prev[cardId] ?? [];
      const padded = [...current];
      while (padded.length < MOVES_PER_CARD) padded.push("");
      padded[moveSlot] = newMoveId;
      const compact = padded.filter(Boolean);
      return { ...prev, [cardId]: compact };
    });
  }

  async function save() {
    setSaveState({ kind: "saving" });
    startTransition(async () => {
      const result = await saveTeamAction(props.teamId, {
        name,
        cardIds: cardIds.filter(Boolean),
        moveSets,
      });
      if (result.ok) {
        setSaveState({ kind: "saved" });
        setTimeout(() => setSaveState({ kind: "idle" }), 2000);
      } else {
        setSaveState({ kind: "error", errors: result.errors });
      }
    });
  }

  // Type coverage — count team offensive types + best multiplier vs each defender type.
  const coverage = useMemo(() => buildCoverage(cardIds, moveSets, props.eligibleByCard), [
    cardIds,
    moveSets,
    props.eligibleByCard,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-2xl font-bold bg-transparent border-b border-transparent focus:border-border outline-none"
          placeholder="Team name"
          aria-label="Team name"
        />
        <Button onClick={save} disabled={!complete || saveState.kind === "saving"}>
          {saveState.kind === "saving"
            ? "Saving…"
            : saveState.kind === "saved"
              ? "Saved ✓"
              : "Save"}
        </Button>
      </div>

      {saveState.kind === "error" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <div className="font-medium mb-1">Save failed</div>
          <ul className="list-disc list-inside">
            {saveState.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {cardIds.map((cardId, slotIndex) => (
          <CardSlot
            key={slotIndex}
            slotIndex={slotIndex}
            cardId={cardId}
            onCardChange={(id) => setSlot(slotIndex, id)}
            ownedCards={props.ownedCards}
            selectedSet={selectedSet}
            card={cardId ? cardsById.get(cardId) : undefined}
            moves={cardId ? (moveSets[cardId] ?? []) : []}
            eligibleMoves={cardId ? (props.eligibleByCard[cardId] ?? []) : []}
            onMoveChange={(moveSlot, moveId) => cardId && setMoveAt(cardId, moveSlot, moveId)}
          />
        ))}
      </div>

      {clientErrors.length > 0 && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="font-medium mb-1">Incomplete:</div>
          <ul className="list-disc list-inside text-muted-foreground">
            {clientErrors.slice(0, 6).map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
            {clientErrors.length > 6 && (
              <li className="opacity-60">… {clientErrors.length - 6} more</li>
            )}
          </ul>
        </div>
      )}

      <CoveragePreview coverage={coverage} />
    </div>
  );
}

function CardSlot(props: {
  slotIndex: number;
  cardId: string;
  onCardChange: (id: string) => void;
  ownedCards: OwnedCard[];
  selectedSet: Set<string>;
  card: OwnedCard | undefined;
  moves: string[];
  eligibleMoves: EligibleMoveRow[];
  onMoveChange: (slot: number, id: string) => void;
}) {
  const available = props.ownedCards.filter(
    (c) => c.cardId === props.cardId || !props.selectedSet.has(c.cardId),
  );
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono w-6">
          #{props.slotIndex + 1}
        </span>
        <select
          value={props.cardId}
          onChange={(e) => props.onCardChange(e.target.value)}
          className="flex-1 rounded border bg-background p-1.5 text-sm"
        >
          <option value="">— select card —</option>
          {available.map((c) => (
            <option key={c.cardId} value={c.cardId}>
              {c.personName}
              {c.isShiny ? " ✨" : ""} ({c.primaryType}
              {c.secondaryType ? `/${c.secondaryType}` : ""})
            </option>
          ))}
        </select>
      </div>
      {props.card ? (
        <div className="space-y-1.5 pl-8">
          {Array.from({ length: MOVES_PER_CARD }).map((_, moveSlot) => {
            const selected = props.moves[moveSlot] ?? "";
            const otherSelected = new Set(
              props.moves.filter((_, i) => i !== moveSlot),
            );
            return (
              <select
                key={moveSlot}
                value={selected}
                onChange={(e) => props.onMoveChange(moveSlot, e.target.value)}
                className="w-full rounded border bg-background p-1.5 text-xs"
              >
                <option value="">— move {moveSlot + 1} —</option>
                {props.eligibleMoves.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={otherSelected.has(m.id)}
                  >
                    {m.name} ({m.type}, {m.category}
                    {m.power ? `, ${m.power}BP` : ""}
                    {m.isTm ? ", TM" : ""})
                  </option>
                ))}
              </select>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground pl-8">
          Pick a card to choose moves.
        </div>
      )}
    </div>
  );
}

// ── Coverage ────────────────────────────────────────────────────────────────

type Coverage = { type: PokemonType; best: number; count: number };

const ALL_TYPES = Object.keys(TYPE_EFFECTIVENESS) as PokemonType[];

function buildCoverage(
  cardIds: string[],
  moveSets: TeamMoveSets,
  eligibleByCard: Record<string, EligibleMoveRow[]>,
): Coverage[] {
  const offensiveTypes: PokemonType[] = [];
  for (const cardId of cardIds) {
    if (!cardId) continue;
    const pool = eligibleByCard[cardId] ?? [];
    const ids = moveSets[cardId] ?? [];
    for (const moveId of ids) {
      const m = pool.find((p) => p.id === moveId);
      if (m && m.category !== "status" && m.power != null && m.power > 0) {
        offensiveTypes.push(m.type as PokemonType);
      }
    }
  }
  return ALL_TYPES.map((def) => {
    let best = 0;
    let count = 0;
    for (const atk of offensiveTypes) {
      const mult = typeMultiplier(atk, [def]);
      if (mult > best) best = mult;
      if (mult >= 2) count += 1;
    }
    return { type: def, best, count };
  });
}

function CoveragePreview({ coverage }: { coverage: Coverage[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-semibold mb-2">Offensive type coverage</div>
      <div className="grid grid-cols-6 gap-1 text-xs">
        {coverage.map((c) => {
          const label =
            c.best === 0 ? "×0" : c.best === 4 ? "×4" : c.best === 2 ? "×2" : c.best === 0.5 ? "×½" : c.best === 0.25 ? "×¼" : "×1";
          const colour =
            c.best >= 2
              ? "bg-emerald-500/20 border-emerald-500/50"
              : c.best === 1
                ? "bg-muted"
                : c.best === 0
                  ? "bg-destructive/20 border-destructive/40"
                  : "bg-amber-500/10 border-amber-500/30";
          return (
            <div
              key={c.type}
              className={`rounded border px-2 py-1 ${colour}`}
              title={`${c.count} moves hit ${c.type} super-effectively`}
            >
              <div className="font-medium">{c.type}</div>
              <div className="tabular-nums opacity-70">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
