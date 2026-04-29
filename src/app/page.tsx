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
  ShieldAlert,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { AdminGrantBanner } from "@/components/layout/AdminGrantBanner";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { PendingChallengeBanner } from "@/components/layout/PendingChallengeBanner";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PropulseLogo } from "@/components/icons/PropulseLogo";
import { TreasureChest } from "@/components/icons/TreasureChest";
import { db } from "@/lib/db/client";
import { cards, persons, users } from "@/lib/db/schema";
import { getBalance } from "@/lib/economy/credits";
import { count, eq, sql } from "drizzle-orm";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) redirect("/signin");

  const userId = session.user.id;

  const [uniquePersons, totalCards, pokedex, balance, meRow] = await Promise.all([
    // Pokédex progress = number of distinct Persons you own any card of.
    db
      .select({ n: sql<number>`count(distinct ${cards.personId})::int` })
      .from(cards)
      .where(eq(cards.ownerId, userId))
      .then((r) => r[0]?.n ?? 0),
    // Raw card count for the hint line (duplicates included).
    db
      .select({ n: count() })
      .from(cards)
      .where(eq(cards.ownerId, userId))
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(persons).then((r) => r[0]?.n ?? 0),
    getBalance(userId),
    db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0]),
  ]);
  const isAdmin = meRow?.isAdmin ?? false;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-8">
      <header className="w-full max-w-2xl flex items-center justify-between">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-accent transition-colors"
          aria-label="Open my profile"
        >
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ""}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-sky-500/40"
            />
          )}
          <div>
            <div className="font-semibold leading-tight">
              {session.user.name ?? session.user.email}
            </div>
            <div className="text-sm text-muted-foreground">
              {session.user.email}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <CreditsBadge userId={userId} />
          <ThemeToggle />
        </div>
      </header>

      <PendingChallengeBanner userId={userId} />
      <AdminGrantBanner userId={userId} />

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
          value={`${uniquePersons} / ${pokedex}`}
          hint={`${totalCards} card${totalCards === 1 ? "" : "s"} total`}
        />
      </div>

      <nav className="w-full max-w-2xl grid grid-cols-2 gap-3">
        <NavLink
          href="/rewards"
          label="Daily Rewards"
          customIcon={<TreasureChest state="closed" size={28} />}
        />
        <NavLink href="/packs" label="Open a pack" icon={Package} />
        <NavLink href="/collection" label="My Collection" icon={Layers} />
        <NavLink href="/pokedex" label="Pokédex" icon={BookOpen} />
        <NavLink href="/teams" label="My Teams" icon={Users} />
        <NavLink href="/battle/new" label="Battle" icon={Swords} />
        <NavLink href="/leaderboard" label="Leaderboard" icon={Trophy} />
        <NavLink
          href="/battle/history"
          label="Battle History"
          icon={History}
        />
        <NavLink href="/trade" label="Trade" icon={Handshake} />
        {isAdmin && (
          <NavLink
            href="/admin"
            label="Admin"
            icon={ShieldAlert}
            accent="rose"
          />
        )}
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
      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  customIcon,
  disabled,
  accent = "sky",
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  disabled?: boolean;
  accent?: "sky" | "rose";
}) {
  const iconNode = customIcon ?? (Icon ? <Icon className="size-6" /> : null);
  const iconColour = accent === "rose" ? "text-rose-500" : "text-sky-500";
  const borderColour =
    accent === "rose" ? "border-rose-500/40" : "";
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
      className={`rounded-lg border p-4 text-center hover:bg-accent transition-colors flex flex-col items-center gap-1.5 font-medium ${borderColour}`}
    >
      <span className={iconColour}>{iconNode}</span>
      <span>{label}</span>
    </Link>
  );
}
