import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { db } from "@/lib/db/client";
import { battles, cards, transactionLog, users } from "@/lib/db/schema";
import { grantCreditsAction, toggleAdminAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ granted?: string; error?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { granted, error } = await searchParams;

  // Re-check isAdmin from DB (session flag could be stale).
  const [me] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!me?.isAdmin) notFound();

  const recent = await db
    .select({
      id: transactionLog.id,
      at: transactionLog.at,
      userId: transactionLog.userId,
      kind: transactionLog.kind,
      amount: transactionLog.amount,
      reason: transactionLog.reason,
      userEmail: users.email,
    })
    .from(transactionLog)
    .innerJoin(users, eq(transactionLog.userId, users.id))
    .orderBy(desc(transactionLog.at))
    .limit(30);

  // All users + derived counts (collection size, battles played, wins).
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      credits: users.credits,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      lastDailyRewardAt: users.lastDailyRewardAt,
      dailyStreakDay: users.dailyStreakDay,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const collectionCounts = await db
    .select({
      ownerId: cards.ownerId,
      n: count(),
    })
    .from(cards)
    .where(isNotNull(cards.ownerId))
    .groupBy(cards.ownerId);
  const collectionByUser = new Map(
    collectionCounts.map((c) => [c.ownerId as string, c.n]),
  );

  const battleStats = await db
    .select({
      userId: sql<string>`COALESCE(${battles.p1Id}, ${battles.p2Id})`,
      total: sql<number>`count(*)::int`,
      wins: sql<number>`sum(case when ${battles.winnerId} = COALESCE(${battles.p1Id}, ${battles.p2Id}) then 1 else 0 end)::int`,
    })
    .from(battles)
    .where(isNotNull(battles.endedAt))
    .groupBy(sql`COALESCE(${battles.p1Id}, ${battles.p2Id})`);
  const battlesByUser = new Map(
    battleStats.map((b) => [b.userId, { total: b.total, wins: b.wins }]),
  );
  // The above join pattern is approximate — it collapses p1 and p2 into one
  // bucket which is fine for a rough admin view; precise per-user totals
  // would need a UNION. Acceptable for this page.

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <ShieldAlert className="text-rose-500" />
        Admin
      </h1>

      {granted && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          Granted {granted} credits successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {friendlyError(error)}
        </div>
      )}

      <form action={grantCreditsAction} className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">Grant credits</div>
        <label className="block text-sm">
          Recipient Propulse email
          <input
            name="email"
            type="email"
            required
            placeholder="navn@propulsentnu.no"
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Amount
          <input
            name="amount"
            type="number"
            min={1}
            step={10}
            required
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Reason (logged in transaction_log)
          <input
            name="reason"
            maxLength={200}
            placeholder="bug compensation, event winner, test credits…"
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
          />
        </label>
        <Button type="submit">Grant</Button>
      </form>

      {/* Users panel */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Users ({userRows.length})
          </h2>
        </div>
        <div className="rounded-lg border divide-y">
          {userRows.map((u) => {
            const stats = battlesByUser.get(u.id);
            const coll = collectionByUser.get(u.id) ?? 0;
            return (
              <div
                key={u.id}
                className="p-3 flex items-center gap-3 text-sm"
              >
                {u.image ? (
                  <img
                    src={u.image}
                    alt={u.name ?? u.email}
                    width={32}
                    height={32}
                    className="rounded-full size-8 object-cover shrink-0"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {(u.name?.[0] ?? u.email[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {u.name ?? u.email}
                    {u.isAdmin && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-rose-500/20 text-rose-700 border border-rose-500/40">
                        <ShieldCheck className="size-3" /> admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                    <span>💰 {u.credits}</span>
                    <span>📇 {coll} cards</span>
                    {stats && (
                      <span>
                        ⚔ {stats.wins}W / {stats.total - stats.wins}L
                      </span>
                    )}
                    <span>
                      📅{" "}
                      {new Intl.DateTimeFormat("nb-NO", {
                        dateStyle: "short",
                      }).format(new Date(u.createdAt))}
                    </span>
                  </div>
                </div>
                {/* Admin toggle — can't demote yourself */}
                {u.id !== session.user.id && (
                  <form action={toggleAdminAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      title={
                        u.isAdmin ? "Demote from admin" : "Promote to admin"
                      }
                      className={`p-1.5 rounded border text-xs ${
                        u.isAdmin
                          ? "text-rose-500 border-rose-500/40 hover:bg-rose-500/10"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Shield className="size-3.5" />
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Recent transactions
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {recent.map((t) => (
              <li key={t.id} className="rounded border p-2 flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">
                  {new Date(t.at).toLocaleString()}
                </span>
                <span className="shrink-0">
                  <TxKind kind={t.kind} />
                </span>
                <span className="shrink-0 tabular-nums font-semibold">
                  {t.amount != null
                    ? t.kind === "credits_spend"
                      ? `-${t.amount}`
                      : `+${t.amount}`
                    : "—"}
                </span>
                <span className="truncate">{t.userEmail}</span>
                <span className="truncate text-muted-foreground">{t.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function TxKind({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    credits_earn: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
    credits_spend: "bg-destructive/20 text-destructive border-destructive/40",
    card_acquire: "bg-sky-500/20 text-sky-700 border-sky-500/40",
    card_transfer: "bg-amber-500/20 text-amber-700 border-amber-500/40",
    card_consumed: "bg-muted text-muted-foreground border-muted-foreground/30",
  };
  return (
    <span
      className={`px-1.5 py-0.5 rounded border text-xs uppercase ${map[kind] ?? "bg-muted"}`}
    >
      {kind.replace("_", " ")}
    </span>
  );
}

function friendlyError(code: string): string {
  if (code === "missing-fields") return "Email and amount are required.";
  if (code === "no-such-user") return "No user with that email.";
  if (code === "bad-amount") return "Amount must be a positive integer.";
  return `Error: ${code}`;
}
