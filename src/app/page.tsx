import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Handshake,
  History,
  Layers,
  Package,
  Swords,
  User,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { PropulseLogo } from "@/components/icons/PropulseLogo";
import { TreasureChest } from "@/components/icons/TreasureChest";
import { db } from "@/lib/db/client";
import { cards, persons } from "@/lib/db/schema";
import { getBalance } from "@/lib/economy/credits";
import { count, eq } from "drizzle-orm";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) redirect("/signin");

  const userId = session.user.id;

  const [collection, pokedex, balance] = await Promise.all([
    db
      .select({ n: count() })
      .from(cards)
      .where(eq(cards.ownerId, userId))
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(persons).then((r) => r[0]?.n ?? 0),
    getBalance(userId),
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
        <div className="flex items-center gap-2">
          <CreditsBadge userId={userId} />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="w-full max-w-2xl flex items-center gap-4">
        <PropulseLogo size={72} />
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Propulse Pokemon</h1>
          <p className="text-muted-foreground">
            Collect the 2026 Fossekall team, battle your friends.
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
        <StatCard label="Propulse Credits" value={balance} />
        <StatCard
          label="Pokédex"
          value={`${collection} / ${pokedex}`}
          hint="cards owned / total persons"
        />
      </div>

      <nav className="w-full max-w-2xl grid grid-cols-2 gap-3">
        <NavLink
          href="/rewards"
          label="Daily Rewards"
          customIcon={<TreasureChest state="closed" size={28} />}
        />
        <NavLink href="/profile" label="My Profile" icon={User} />
        <NavLink href="/packs" label="Open a pack" icon={Package} />
        <NavLink href="/collection" label="My Collection" icon={Layers} />
        <NavLink href="/pokedex" label="Pokédex" icon={BookOpen} />
        <NavLink href="/teams" label="My Teams" icon={Users} />
        <NavLink href="/battle/new" label="Battle" icon={Swords} />
        <NavLink
          href="/battle/history"
          label="Battle History"
          icon={History}
        />
        <NavLink href="/trade" label="Trade" icon={Handshake} disabled />
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
  icon: Icon,
  customIcon,
  disabled,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  disabled?: boolean;
}) {
  const iconNode = customIcon ?? (Icon ? <Icon className="size-6" /> : null);
  if (disabled) {
    return (
      <div className="rounded-lg border p-4 text-center text-muted-foreground cursor-not-allowed flex flex-col items-center gap-1.5">
        <span className="text-muted-foreground/60">{iconNode}</span>
        <span>{label}</span>
        <span className="text-xs">coming soon</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border p-4 text-center hover:bg-accent transition-colors flex flex-col items-center gap-1.5 font-medium"
    >
      <span className="text-sky-500">{iconNode}</span>
      <span>{label}</span>
    </Link>
  );
}
