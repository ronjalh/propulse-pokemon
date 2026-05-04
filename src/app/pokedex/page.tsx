import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export default async function PokedexPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  // For each person: count how many cards the user owns + whether any are shiny.
  const owned = await db
    .select({
      personId: cards.personId,
      count: sql<number>`count(*)::int`.as("count"),
      shinyCount: sql<number>`count(*) filter (where ${cards.isShiny})::int`.as(
        "shiny_count",
      ),
    })
    .from(cards)
    .where(eq(cards.ownerId, userId))
    .groupBy(cards.personId);

  const ownedByPerson = new Map(owned.map((o) => [o.personId, o]));

  const allPersons = await db
    .select()
    .from(persons)
    .orderBy(persons.discipline, persons.name);

  const totalCards = owned.reduce((sum, o) => sum + o.count, 0);
  const totalShiny = owned.reduce((sum, o) => sum + o.shinyCount, 0);
  const uniqueOwned = owned.length;

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <div className="text-sm space-x-4">
          <span>
            <strong className="tabular-nums">
              {uniqueOwned}
            </strong>
            <span className="text-muted-foreground">/{allPersons.length}</span>{" "}
            unique
          </span>
          <span className="text-muted-foreground">
            {totalCards} total · {totalShiny} shiny
          </span>
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Pokédex</h1>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {allPersons.map((p) => {
          const o = ownedByPerson.get(p.id);
          const isOwned = !!o;
          const hasShiny = (o?.shinyCount ?? 0) > 0;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-lg border p-2 text-center space-y-1",
                !isOwned && "opacity-40",
                hasShiny && "ring-2 ring-pink-400",
              )}
              title={isOwned ? `${p.name} — ${o.count} owned` : "Not owned yet"}
            >
              <div className="relative aspect-square rounded bg-muted overflow-hidden">
                <Image
                  src={p.imageUrl}
                  alt={isOwned ? p.name : "???"}
                  fill
                  sizes="120px"
                  className={cn(
                    "object-cover",
                    !isOwned && "brightness-0",
                  )}
                  unoptimized
                />
                {isOwned && o.count > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[0.6rem] px-1.5 py-0.5 rounded">
                    ×{o.count}
                  </div>
                )}
              </div>
              <div className="text-[0.65rem] font-semibold truncate">
                {isOwned ? p.name : "???"}
              </div>
              <div className="text-xs text-muted-foreground uppercase">
                {p.discipline}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
