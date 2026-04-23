import { Button } from "@/components/ui/button";
import { joinBattleAction } from "@/lib/battle/actions";
import type { Team } from "@/lib/db/schema";
import type { OwnedCard } from "@/lib/teams/queries";

type WagerInfo = {
  credits: number;
  p1CardId: string | null;
  p2CardId: string | null;
  settled: boolean;
};

type Props = {
  battleId: string;
  mode: "team" | "card";
  teams: Team[];
  cards: OwnedCard[];
  wager?: WagerInfo | null;
};

export function JoinBattle({ battleId, mode, teams, cards, wager }: Props) {
  if (mode === "team") {
    if (teams.length === 0) {
      return (
        <div className="rounded-lg border p-4 text-sm">
          You don&rsquo;t have a complete 6-card team yet.{" "}
          <a href="/teams" className="underline">
            Build one first
          </a>
          .
        </div>
      );
    }
    return (
      <form action={joinBattleAction} className="rounded-lg border p-4 space-y-3">
        <input type="hidden" name="battleId" value={battleId} />
        <label className="block text-sm">
          Your team
          <select
            name="teamId"
            required
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {wager?.p1CardId && (
          <label className="block text-sm">
            Your wager card (one of your 6 — loser forfeits it)
            <select
              name="wagerCardId"
              required
              defaultValue=""
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
            >
              <option value="" disabled>
                — pick one of your cards —
              </option>
              {cards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.personName}
                  {c.isShiny ? " ✨" : ""} ({c.primaryType}
                  {c.secondaryType ? `/${c.secondaryType}` : ""})
                </option>
              ))}
            </select>
          </label>
        )}
        <Button type="submit">
          {wager && wager.credits > 0
            ? `Accept (match ${wager.credits} credits)`
            : "Accept challenge"}
        </Button>
      </form>
    );
  }

  // 1v1 mode — pick a single card from the collection.
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        You don&rsquo;t own any cards yet.{" "}
        <a href="/packs" className="underline">
          Open a pack first
        </a>
        .
      </div>
    );
  }
  return (
    <form action={joinBattleAction} className="rounded-lg border p-4 space-y-3">
      <input type="hidden" name="battleId" value={battleId} />
      <label className="block text-sm">
        Pick a card (4 moves randomly drawn from its learnset)
        <select
          name="cardId"
          required
          className="mt-1 w-full rounded border bg-background p-2 text-sm"
        >
          {cards.map((c) => (
            <option key={c.cardId} value={c.cardId}>
              {c.personName}
              {c.isShiny ? " ✨" : ""} ({c.primaryType}
              {c.secondaryType ? `/${c.secondaryType}` : ""})
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">
        {wager && wager.credits > 0
          ? `Accept 1v1 (match ${wager.credits} credits)`
          : "Accept 1v1"}
      </Button>
    </form>
  );
}
