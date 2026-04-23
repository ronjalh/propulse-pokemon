import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, isNotNull, or, sql } from "drizzle-orm";
import { LogOut, Sparkles, Swords, Trophy } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { PropulseCard } from "@/components/card/PropulseCard";
import { db } from "@/lib/db/client";
import { battles, cards, persons } from "@/lib/db/schema";
import { signOutAction } from "@/lib/auth/actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const email = session.user.email?.toLowerCase() ?? "";

  // Match auth email → Propulse Person to show as the user's identity card.
  const meRoster = await db
    .select()
    .from(persons)
    .where(eq(persons.email, email))
    .limit(1);
  const propulsePerson = meRoster[0] ?? null;

  // Collection: total cards (with duplicates) and distinct persons owned.
  const [collectionRow] = await db
    .select({ n: count() })
    .from(cards)
    .where(eq(cards.ownerId, userId));
  const [uniquePersonsRow] = await db
    .select({ n: sql<number>`count(distinct ${cards.personId})::int` })
    .from(cards)
    .where(eq(cards.ownerId, userId));
  const [shinyRow] = await db
    .select({ n: count() })
    .from(cards)
    .where(and(eq(cards.ownerId, userId), eq(cards.isShiny, true)));
  const [pokedexRow] = await db.select({ n: count() }).from(persons);

  // Battle record — count ended battles, split by winner.
  const [battleRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      wins: sql<number>`sum(case when ${battles.winnerId} = ${userId} then 1 else 0 end)::int`,
    })
    .from(battles)
    .where(
      and(
        or(eq(battles.p1Id, userId), eq(battles.p2Id, userId)),
        isNotNull(battles.endedAt),
      ),
    );
  const totalBattles = battleRow?.total ?? 0;
  const wins = battleRow?.wins ?? 0;
  const losses = totalBattles - wins;
  const winRate = totalBattles === 0 ? 0 : Math.round((wins / totalBattles) * 100);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={userId} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>

      <div className="grid gap-6 md:grid-cols-[auto_1fr] items-start">
        {/* Propulse identity card */}
        <div>
          {propulsePerson ? (
            <PropulseCard
              size="md"
              card={{
                // Synthetic card — average IVs so stats are representative.
                id: `profile:${userId}`,
                isShiny: false,
                ivs: {
                  hp: 15,
                  attack: 15,
                  defense: 15,
                  spAttack: 15,
                  spDefense: 15,
                  speed: 15,
                },
              }}
              person={propulsePerson}
            />
          ) : (
            <div className="w-60 h-[23rem] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-4">
              <div className="text-4xl mb-2">👤</div>
              <div className="font-semibold text-sm">Not on the 2026 roster</div>
              <div className="text-xs text-muted-foreground mt-1">
                Your email {email} doesn&rsquo;t match any Propulse member in
                the Fossekall roster. You can still play as any card you pull.
              </div>
            </div>
          )}
        </div>

        {/* Stat blocks */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Account
            </div>
            <div className="font-medium">{session.user.name ?? email}</div>
            <div className="text-xs text-muted-foreground">{email}</div>
            {propulsePerson && (
              <div className="text-xs text-muted-foreground mt-1">
                {propulsePerson.title} · {propulsePerson.discipline}
                {propulsePerson.subDiscipline
                  ? ` · ${propulsePerson.subDiscipline}`
                  : ""}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox
              icon={<Trophy className="size-5 text-amber-500" />}
              label="Battle record"
              value={`${wins} W · ${losses} L`}
              hint={totalBattles > 0 ? `${winRate}% win rate` : "no battles yet"}
            />
            <StatBox
              icon={<Swords className="size-5 text-sky-500" />}
              label="Battles played"
              value={String(totalBattles)}
            />
            <StatBox
              icon={<Sparkles className="size-5 text-pink-500" />}
              label="Shinies"
              value={String(shinyRow?.n ?? 0)}
              hint={`of ${collectionRow?.n ?? 0} owned`}
            />
            <StatBox
              icon={
                <div className="size-5 rounded bg-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-600">
                  {pokedexRow?.n ?? 0}
                </div>
              }
              label="Pokédex"
              value={`${uniquePersonsRow?.n ?? 0} / ${pokedexRow?.n ?? 0}`}
              hint={`${collectionRow?.n ?? 0} cards incl. duplicates`}
            />
          </div>

          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4 mr-1" /> Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function StatBox({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
