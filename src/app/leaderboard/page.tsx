import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { leaderboardFor, type LeaderboardEntry } from "@/lib/battle/leaderboard";

type PageProps = {
  searchParams: Promise<{ mode?: "1v1" | "6v6" | "rating" }>;
};

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { mode = "rating" } = await searchParams;
  const safeMode: "1v1" | "6v6" | "rating" =
    mode === "6v6" ? "6v6" : mode === "1v1" ? "1v1" : "rating";

  const entries = await leaderboardFor(safeMode);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Trophy className="text-amber-500" /> Leaderboard
      </h1>

      <div className="flex gap-2 text-sm flex-wrap">
        <ModeTab href="/leaderboard?mode=rating" active={safeMode === "rating"}>
          Rating (Elo)
        </ModeTab>
        <ModeTab href="/leaderboard?mode=1v1" active={safeMode === "1v1"}>
          1v1 wins
        </ModeTab>
        <ModeTab href="/leaderboard?mode=6v6" active={safeMode === "6v6"}>
          6v6 wins
        </ModeTab>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No completed{" "}
          {safeMode === "rating" ? "rated" : safeMode} matches yet. Be the
          first — <Link href="/battle/new" className="underline">challenge someone</Link>
          .
        </div>
      ) : (
        <ol className="space-y-2">
          {entries.map((e, i) => (
            <Row
              key={e.userId}
              rank={i + 1}
              entry={e}
              isMe={e.userId === session.user.id}
              showRating={safeMode === "rating"}
            />
          ))}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Counts only finished battles between two real Propulse members. Solo
        mirror matches and unfinished battles are excluded. Rating uses Elo
        (start at 1000, ±16 per even match) and updates only on real PvP wins.
      </p>
    </main>
  );
}

function ModeTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded border font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "hover:bg-accent text-muted-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function Row({
  rank,
  entry,
  isMe,
  showRating,
}: {
  rank: number;
  entry: LeaderboardEntry;
  isMe: boolean;
  showRating: boolean;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <li
      className={`rounded-lg border p-3 flex items-center gap-3 ${
        isMe ? "border-sky-500/60 bg-sky-500/10 ring-2 ring-sky-400/40" : ""
      }`}
    >
      <div className="w-10 text-center text-lg font-bold tabular-nums shrink-0">
        {medal ?? `#${rank}`}
      </div>
      {entry.image ? (
        <Image
          src={entry.image}
          alt={entry.name ?? entry.email}
          width={40}
          height={40}
          className="rounded-full size-10 object-cover shrink-0"
          unoptimized
        />
      ) : (
        <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold shrink-0">
          {(entry.name?.[0] ?? entry.email[0] ?? "?").toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {entry.name ?? entry.email} {isMe && <span className="text-xs text-sky-600">(you)</span>}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {entry.email}
        </div>
      </div>
      {showRating ? (
        <div className="text-right shrink-0">
          <div className="font-bold text-lg tabular-nums text-amber-500">
            {entry.rating}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {entry.wins}W · {entry.losses}L
          </div>
        </div>
      ) : (
        <div className="text-right shrink-0">
          <div className="font-bold text-lg tabular-nums text-emerald-500">
            {entry.wins}W
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {entry.losses}L · {entry.winRate}%
          </div>
        </div>
      )}
    </li>
  );
}
