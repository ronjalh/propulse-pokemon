import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Coins, Lock, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { TreasureChest } from "@/components/icons/TreasureChest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  DAILY_REWARDS,
  computeRewardStatus,
} from "@/lib/economy/daily-rewards";
import { claimDailyRewardAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    claimed?: string;
    kind?: string;
    amount?: string;
    person?: string;
    error?: string;
  }>;
};

export default async function RewardsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { claimed, kind, amount, person, error } = await searchParams;

  const rows = await db
    .select({
      lastDailyRewardAt: users.lastDailyRewardAt,
      dailyStreakDay: users.dailyStreakDay,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const status = computeRewardStatus(
    rows[0]?.lastDailyRewardAt ?? null,
    rows[0]?.dailyStreakDay ?? 0,
  );
  const lastClaimedDay = rows[0]?.dailyStreakDay ?? 0;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <TreasureChest state="closed" size={40} />
        Daily Rewards
      </h1>

      {claimed && kind === "coins" && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm flex items-center gap-2">
          <Coins className="text-amber-500" />
          Day {claimed} claimed — <b>+{amount}</b> Propulse Credits!
        </div>
      )}
      {claimed && kind === "card" && (
        <div className="rounded-lg border border-pink-500/40 bg-pink-500/10 p-4 text-sm flex items-center gap-2">
          <Sparkles className="text-pink-500" />
          Day 7 chest opened — you got <b>{person ?? "a new card"}</b>!{" "}
          <Link href="/collection" className="underline ml-1">
            See it →
          </Link>
        </div>
      )}
      {error === "not-yet" && status.nextClaimAt && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Come back at {status.nextClaimAt.toLocaleString()} for your next chest.
        </div>
      )}

      {/* Treasure chest (claim button) */}
      <form action={claimDailyRewardAction} className="text-center">
        <button
          type="submit"
          disabled={!status.canClaim}
          className={`group mx-auto flex flex-col items-center gap-3 p-8 rounded-2xl border-2 transition-all ${
            status.canClaim
              ? "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 hover:scale-105 cursor-pointer"
              : "border-muted-foreground/30 bg-muted/30 cursor-not-allowed opacity-60"
          }`}
        >
          <div className="transition-transform group-hover:-translate-y-1">
            <TreasureChest
              state={status.canClaim ? "closed" : "closed"}
              size={140}
              className={status.canClaim ? "drop-shadow-[0_0_20px_rgba(255,208,80,0.5)]" : ""}
            />
          </div>
          <div className="text-lg font-bold">
            {status.canClaim
              ? `Open Day ${status.currentDay} chest`
              : "Already claimed today"}
          </div>
          <div className="text-xs text-muted-foreground">
            {status.canClaim
              ? renderReward(status.currentDay)
              : status.nextClaimAt
                ? `Next chest unlocks in ${formatCountdown(status.nextClaimAt)}`
                : ""}
          </div>
          {status.streakBroken && (
            <div className="text-xs text-destructive">
              Streak broken — restarting from day 1.
            </div>
          )}
        </button>
      </form>

      {/* 7-day calendar */}
      <div>
        <div className="text-sm font-semibold mb-2">This week</div>
        <div className="grid grid-cols-7 gap-2">
          {DAILY_REWARDS.map((r) => {
            const isToday = r.day === status.currentDay;
            const isClaimed =
              !status.canClaim
                ? r.day <= lastClaimedDay
                : r.day < status.currentDay;
            return (
              <div
                key={r.day}
                className={`rounded-lg border p-2 text-center text-xs ${
                  isToday && status.canClaim
                    ? "border-amber-500/60 bg-amber-500/10 font-semibold"
                    : isClaimed
                      ? "border-emerald-500/40 bg-emerald-500/10 opacity-70"
                      : "border-muted-foreground/20 bg-muted/20"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Day {r.day}
                </div>
                <div className="mt-1">
                  {r.kind === "coins" ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <Coins className="size-4 text-amber-500" />
                      <span className="tabular-nums">{r.amount}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <Sparkles className="size-4 text-pink-500" />
                      <span>Card</span>
                    </div>
                  )}
                </div>
                {isClaimed && !isToday && (
                  <Lock className="size-3 mx-auto mt-1 text-muted-foreground/60" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function renderReward(day: number): string {
  const r = DAILY_REWARDS[day - 1];
  if (r.kind === "coins") return `+${r.amount} Propulse Credits`;
  return "A random Propulse card ✨";
}

function formatCountdown(target: Date): string {
  const ms = Math.max(0, target.getTime() - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
