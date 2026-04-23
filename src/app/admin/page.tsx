import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { db } from "@/lib/db/client";
import { transactionLog, users } from "@/lib/db/schema";
import { grantCreditsAction } from "./actions";

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
      className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${map[kind] ?? "bg-muted"}`}
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
