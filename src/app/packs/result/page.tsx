import Link from "next/link";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PackReveal } from "./PackReveal";

type PageProps = {
  searchParams: Promise<{ ids?: string }>;
};

export default async function PackResultPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").filter(Boolean);
  if (ids.length === 0) redirect("/packs");

  const cardRows = await db
    .select()
    .from(cards)
    .where(inArray(cards.id, ids));

  const personIds = [...new Set(cardRows.map((c) => c.personId))];
  const personRows = await db
    .select()
    .from(persons)
    .where(inArray(persons.id, personIds));

  const personById = new Map(personRows.map((p) => [p.id, p]));

  // Preserve order from the searchParams
  const ordered = ids
    .map((id) => cardRows.find((c) => c.id === id))
    .filter((c): c is typeof cardRows[number] => Boolean(c))
    .map((c) => ({ card: c, person: personById.get(c.personId)! }))
    .filter((pair) => pair.person);

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-center">
        Pack opened!
      </h1>

      <PackReveal pairs={ordered} />

      <div className="flex gap-3 justify-center">
        <Button render={<Link href="/packs" />} nativeButton={false}>
          Open another
        </Button>
        <Button
          render={<Link href="/pokedex" />}
          nativeButton={false}
          variant="outline"
        >
          View Pokédex
        </Button>
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost">
          Home
        </Button>
      </div>
    </main>
  );
}
