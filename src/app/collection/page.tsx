import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { PropulseCard } from "@/components/card/PropulseCard";

type PageProps = {
  searchParams: Promise<{
    sort?: "recent" | "rarity" | "shiny";
    discipline?: string;
  }>;
};

const SORT_OPTIONS = [
  { key: "recent", label: "Newest" },
  { key: "rarity", label: "Rarity" },
  { key: "shiny", label: "Shiny first" },
] as const;

const RARITY_RANK = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

export default async function CollectionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { sort = "recent", discipline } = await searchParams;

  const ownedCards = await db
    .select()
    .from(cards)
    .where(eq(cards.ownerId, session.user.id))
    .orderBy(desc(cards.pulledAt));

  if (ownedCards.length === 0) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
        <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
          <p className="text-muted-foreground">
            You haven&apos;t pulled any cards yet.
          </p>
          <Link
            href="/packs"
            className="inline-block px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium"
          >
            Open your first pack
          </Link>
        </div>
      </main>
    );
  }

  const personIds = [...new Set(ownedCards.map((c) => c.personId))];
  const personRows = await db
    .select()
    .from(persons)
    .where(inArray(persons.id, personIds));
  const personById = new Map(personRows.map((p) => [p.id, p]));

  let pairs = ownedCards
    .map((c) => ({ card: c, person: personById.get(c.personId)! }))
    .filter((p) => p.person);

  if (discipline) {
    pairs = pairs.filter((p) => p.person.discipline === discipline);
  }

  if (sort === "rarity") {
    pairs.sort(
      (a, b) =>
        RARITY_RANK[a.person.rarity] - RARITY_RANK[b.person.rarity] ||
        a.person.name.localeCompare(b.person.name),
    );
  } else if (sort === "shiny") {
    pairs.sort(
      (a, b) =>
        Number(b.card.isShiny) - Number(a.card.isShiny) ||
        b.card.pulledAt.getTime() - a.card.pulledAt.getTime(),
    );
  }

  const shinyCount = ownedCards.filter((c) => c.isShiny).length;
  const uniquePersons = new Set(ownedCards.map((c) => c.personId)).size;

  const disciplines = [...new Set(personRows.map((p) => p.discipline))].sort();

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <div className="text-sm text-muted-foreground">
          <strong className="tabular-nums text-foreground">
            {ownedCards.length}
          </strong>{" "}
          cards · {uniquePersons} unique · {shinyCount} shiny
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-2">Sort:</span>
        {SORT_OPTIONS.map((o) => (
          <Link
            key={o.key}
            href={{
              pathname: "/collection",
              query: { sort: o.key, ...(discipline ? { discipline } : {}) },
            }}
            className={`text-xs px-2 py-1 rounded border ${
              sort === o.key ? "bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            {o.label}
          </Link>
        ))}

        <span className="text-xs text-muted-foreground ml-4 mr-2">
          Discipline:
        </span>
        <Link
          href={{ pathname: "/collection", query: { sort } }}
          className={`text-xs px-2 py-1 rounded border ${
            !discipline ? "bg-foreground text-background" : "hover:bg-accent"
          }`}
        >
          All
        </Link>
        {disciplines.map((d) => (
          <Link
            key={d}
            href={{ pathname: "/collection", query: { sort, discipline: d } }}
            className={`text-xs px-2 py-1 rounded border ${
              discipline === d
                ? "bg-foreground text-background"
                : "hover:bg-accent"
            }`}
          >
            {d}
          </Link>
        ))}
      </div>

      {pairs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No cards match that filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {pairs.map((pair) => (
            <PropulseCard
              key={pair.card.id}
              card={pair.card}
              person={pair.person}
              size="md"
            />
          ))}
        </div>
      )}
    </main>
  );
}
