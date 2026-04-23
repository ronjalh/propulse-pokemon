import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { listTeamsForUser, ownedCardsForUser } from "@/lib/teams/queries";
import {
  createBattleAction,
  createQuick1v1ChallengeAction,
  createQuickSoloBattleAction,
  createSoloTestBattleAction,
} from "@/lib/battle/actions";

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function NewBattlePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { error } = await searchParams;
  const [teams, ownedCards] = await Promise.all([
    listTeamsForUser(session.user.id),
    ownedCardsForUser(session.user.id),
  ]);
  const readyTeams = teams.filter((t) => t.cardIds.filter(Boolean).length === 6);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">New battle</h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {friendlyError(error)}
        </div>
      )}

      {/* 1v1 vs another player — no team required */}
      {ownedCards.length > 0 && (
        <form
          action={createQuick1v1ChallengeAction}
          className="rounded-lg border p-4 space-y-3"
        >
          <div className="font-semibold">1v1 vs another player</div>
          <p className="text-xs text-muted-foreground">
            Pick one card, share the link. Opponent picks their own card when
            they accept. No team required.
          </p>
          <label className="block text-sm">
            Your card
            <select
              name="cardId"
              required
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
            >
              {ownedCards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.personName}
                  {c.isShiny ? " ✨" : ""} ({c.primaryType}
                  {c.secondaryType ? `/${c.secondaryType}` : ""})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Opponent&rsquo;s Propulse email
            <input
              name="opponentEmail"
              type="email"
              required
              placeholder="navn@propulsentnu.no"
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
            />
          </label>
          <WagerFields ownedCards={[]} creditsOnly />
          <Button type="submit">Send 1v1 challenge</Button>
        </form>
      )}

      {/* Quick 1v1 vs mirror — solo sandbox */}
      {ownedCards.length > 0 && (
        <form
          action={createQuickSoloBattleAction}
          className="rounded-lg border p-4 space-y-3 border-dashed"
        >
          <div className="font-semibold">Quick 1v1 (solo vs mirror)</div>
          <p className="text-xs text-muted-foreground">
            Pick one card. 4 moves will be randomly chosen from its learnset.
            Fastest way to test the combat loop — no team, no opponent.
          </p>
          <label className="block text-sm">
            Card
            <select
              name="cardId"
              required
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
            >
              {ownedCards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.personName}
                  {c.isShiny ? " ✨" : ""} ({c.primaryType}
                  {c.secondaryType ? `/${c.secondaryType}` : ""})
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline">
            Start mirror match
          </Button>
        </form>
      )}

      {readyTeams.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm">
          You need a complete 6-card team for a 6v6 battle.{" "}
          <Link href="/teams" className="underline">
            Build one →
          </Link>
        </div>
      ) : (
        <>
          <form
            action={createBattleAction}
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="font-semibold">Challenge a friend (6v6)</div>
            <label className="block text-sm">
              Your team
              <select
                name="teamId"
                required
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
              >
                {readyTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Opponent&rsquo;s Propulse email
              <input
                name="opponentEmail"
                type="email"
                required
                placeholder="navn@propulsentnu.no"
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
              />
            </label>

            <WagerFields ownedCards={ownedCards} />

            <Button type="submit">Send challenge</Button>
          </form>

          <form
            action={createSoloTestBattleAction}
            className="rounded-lg border p-4 space-y-3 border-dashed"
          >
            <div className="font-semibold">Solo test (vs mirror)</div>
            <p className="text-xs text-muted-foreground">
              Dev aid: fight a copy of your own team to make sure moves land as expected.
            </p>
            <label className="block text-sm">
              Team
              <select
                name="teamId"
                required
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
              >
                {readyTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline">
              Start mirror match
            </Button>
          </form>
        </>
      )}
    </main>
  );
}

function friendlyError(code: string): string {
  if (code === "missing-fields") return "Fill in both team and opponent email.";
  if (code === "cannot-challenge-self") return "You can't challenge yourself — use the solo test instead.";
  if (code.startsWith("own-team-")) return "There's something wrong with your team — open it in the editor and fix it.";
  if (code === "redis-missing") {
    return (
      "Battles need Upstash Redis set up. Create a free database at upstash.com → copy REST URL + token → add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local, then restart the dev server. Pusher keys are also needed for live updates."
    );
  }
  if (code === "insufficient-wager") return "You don't have enough credits for that wager.";
  if (code === "wager-not-owned") return "That wager card isn't yours.";
  if (code === "wager-not-in-team") return "The wager card must be in your selected team.";
  return `Error: ${code}`;
}

function WagerFields({
  ownedCards,
  creditsOnly = false,
}: {
  ownedCards: Awaited<ReturnType<typeof ownedCardsForUser>>;
  creditsOnly?: boolean;
}) {
  return (
    <details className="rounded border bg-muted/30 p-3">
      <summary className="text-sm font-medium cursor-pointer select-none">
        💰 Add stakes (optional)
      </summary>
      <p className="pt-2 text-xs text-muted-foreground">
        Pick either or both. Loser forfeits what they put up, winner takes everything.
      </p>

      <div className="mt-3 rounded border p-3 bg-background/40 space-y-2">
        <div className="text-xs font-semibold text-sky-600">💵 Credit wager</div>
        <label className="block text-xs">
          How much each side puts in (0 = no credit stakes)
          <input
            name="wagerCredits"
            type="number"
            min={0}
            step={10}
            defaultValue={0}
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
          />
        </label>
      </div>

      {!creditsOnly ? (
        <div className="mt-2 rounded border p-3 bg-background/40 space-y-2">
          <div className="text-xs font-semibold text-pink-600">🃏 Card wager</div>
          <label className="block text-xs">
            Pick one of your cards (— none — = no card stakes)
            <select
              name="wagerCardId"
              defaultValue=""
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
            >
              <option value="">— none —</option>
              {ownedCards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.personName}
                  {c.isShiny ? " ✨" : ""} ({c.primaryType}
                  {c.secondaryType ? `/${c.secondaryType}` : ""})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          In 1v1, the card you&rsquo;re playing with is automatically the
          card wager — loser forfeits it. If you just want a friendly match,
          leave the credit wager at 0.
        </p>
      )}
    </details>
  );
}
