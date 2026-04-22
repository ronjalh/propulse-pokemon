import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) redirect("/signin");

  const userId = session.user.id;

  const [collection, pokedex] = await Promise.all([
    db
      .select({ n: count() })
      .from(cards)
      .where(eq(cards.ownerId, userId))
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(persons).then((r) => r[0]?.n ?? 0),
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-8">
      <header className="w-full max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ""}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <div className="font-semibold leading-tight">
              {session.user.name ?? session.user.email}
            </div>
            <div className="text-xs text-muted-foreground">
              {session.user.email}
            </div>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <div className="w-full max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Propulse Pokemon</h1>
        <p className="text-muted-foreground">
          Collect the 2026 Fossekall team, battle your friends.
        </p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
        <StatCard label="Propulse Credits" value={session.user.credits} />
        <StatCard
          label="Pokédex"
          value={`${collection} / ${pokedex}`}
          hint="cards owned / total persons"
        />
      </div>

      <nav className="w-full max-w-2xl grid grid-cols-2 gap-3">
        <NavLink href="/packs" label="Open a pack" />
        <NavLink href="/pokedex" label="Pokédex" />
        <NavLink href="/battle" label="Battle" disabled />
        <NavLink href="/trade" label="Trade" disabled />
      </nav>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function NavLink({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="rounded-lg border p-4 text-center text-muted-foreground cursor-not-allowed">
        {label}
        <div className="text-xs mt-1">coming soon</div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border p-4 text-center hover:bg-accent transition-colors"
    >
      {label}
    </Link>
  );
}
