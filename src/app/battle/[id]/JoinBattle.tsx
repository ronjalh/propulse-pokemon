import { Button } from "@/components/ui/button";
import { joinBattleAction } from "@/lib/battle/actions";
import type { Team } from "@/lib/db/schema";
import type { OwnedCard } from "@/lib/teams/queries";

type Props = {
  battleId: string;
  mode: "team" | "card";
  teams: Team[];
  cards: OwnedCard[];
};

export function JoinBattle({ battleId, mode, teams, cards }: Props) {
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
        <Button type="submit">Accept challenge</Button>
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
      <Button type="submit">Accept 1v1</Button>
    </form>
  );
}
