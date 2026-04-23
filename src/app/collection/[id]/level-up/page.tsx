import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { ArrowUp, Flame } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { PropulseCard } from "@/components/card/PropulseCard";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { LEVEL_UP_COST, MAX_CARD_LEVEL } from "@/lib/cards/stats";
import { levelUpCardAction } from "@/lib/cards/level-up";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function LevelUpPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const { id: targetId } = await params;
  const { error } = await searchParams;

  const [target] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, targetId), eq(cards.ownerId, userId)))
    .limit(1);
  if (!target) notFound();

  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.id, target.personId))
    .limit(1);
  if (!person) notFound();

  // Other cards of the same person that could be consumed.
  const fodder = await db
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.ownerId, userId),
        eq(cards.personId, target.personId),
        ne(cards.id, targetId),
      ),
    );

  const cost = LEVEL_UP_COST[target.level];
  const isMaxed = cost == null;

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/collection"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Collection
        </Link>
        <CreditsBadge userId={userId} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <ArrowUp className="text-emerald-500" /> Level up
      </h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {friendlyError(error)}
        </div>
      )}

      <div className="flex flex-wrap gap-6 items-start">
        <PropulseCard
          size="md"
          card={{
            id: target.id,
            isShiny: target.isShiny,
            ivs: target.ivs,
            level: target.level,
          }}
          person={person}
        />
        <div className="flex-1 min-w-[16rem] space-y-3">
          <div>
            <div className="text-sm font-semibold">{person.name}</div>
            <div className="text-xs text-muted-foreground">
              Currently <b>LV {target.level}</b> of {MAX_CARD_LEVEL}
            </div>
          </div>
          {isMaxed ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              This card is already at the maximum level.
            </div>
          ) : (
            <div className="rounded-lg border p-3 text-sm">
              To reach <b>LV {target.level + 1}</b> you need to consume{" "}
              <b>{cost}</b> duplicate copy{cost === 1 ? "" : "s"} of{" "}
              {person.name}. Consumed cards are deleted.
              <div className="mt-1 text-xs text-muted-foreground">
                You currently have <b>{fodder.length}</b> duplicate{fodder.length === 1 ? "" : "s"} available.
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMaxed && fodder.length >= (cost ?? 0) && (
        <form action={levelUpCardAction} className="rounded-lg border p-4 space-y-3">
          <input type="hidden" name="targetId" value={targetId} />
          <div className="text-sm font-semibold">
            Pick {cost} duplicate{cost === 1 ? "" : "s"} to consume
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {fodder.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-accent has-[input:checked]:border-rose-500 has-[input:checked]:bg-rose-500/10"
              >
                <input type="checkbox" name="fodderIds" value={f.id} className="shrink-0" />
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  width={32}
                  height={32}
                  className="rounded-full size-8 object-cover shrink-0"
                />
                <div className="min-w-0 text-left">
                  <div className="text-xs font-medium truncate">
                    {person.name}
                    {f.isShiny ? " ✨" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    LV {f.level}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full">
            <Flame className="size-4 mr-1" />
            Consume {cost} and level up
          </Button>
          <p className="text-xs text-muted-foreground">
            Select exactly {cost} card{cost === 1 ? "" : "s"}. Fewer or more will be rejected.
          </p>
        </form>
      )}

      {!isMaxed && fodder.length < (cost ?? 0) && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Not enough duplicates yet — you have <b>{fodder.length}</b> but need{" "}
          <b>{cost}</b>. Open more packs to find additional copies of{" "}
          {person.name}.
        </div>
      )}
    </main>
  );
}

function friendlyError(code: string): string {
  if (code === "already-max") return "This card is already at max level.";
  if (code === "wrong-fodder-count") return "Wrong number of duplicate cards selected.";
  if (code === "cant-eat-self") return "You can't consume the card you're trying to level up.";
  if (code === "duplicate-fodder") return "Duplicate fodder selection.";
  if (code === "fodder-not-found") return "One of the selected cards doesn't exist.";
  if (code === "fodder-not-owned") return "You don't own one of the selected cards.";
  if (code === "fodder-wrong-person") return "Fodder must be the same Person as the target.";
  return `Error: ${code}`;
}
