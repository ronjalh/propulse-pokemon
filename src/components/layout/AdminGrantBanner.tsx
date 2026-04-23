import { and, desc, eq, gt, ilike, sql } from "drizzle-orm";
import { Coins, Gift } from "lucide-react";

import { db } from "@/lib/db/client";
import { transactionLog, users } from "@/lib/db/schema";
import { dismissNotificationsAction } from "./notifications-actions";

type GrantRow = {
  id: string;
  at: Date;
  amount: number | null;
  reason: string;
};

/**
 * Banner shown on the homepage when an admin has granted credits that the
 * user hasn't dismissed yet. Reads `last_notifications_seen_at` on users and
 * shows everything newer.
 */
export async function AdminGrantBanner({ userId }: { userId: string }) {
  const [me] = await db
    .select({ lastSeen: users.lastNotificationsSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const since = me?.lastSeen ?? new Date(0);

  const rows = (await db
    .select({
      id: transactionLog.id,
      at: transactionLog.at,
      amount: transactionLog.amount,
      reason: transactionLog.reason,
    })
    .from(transactionLog)
    .where(
      and(
        eq(transactionLog.userId, userId),
        eq(transactionLog.kind, "credits_earn"),
        ilike(transactionLog.reason, "admin-grant:%"),
        gt(transactionLog.at, since),
      ),
    )
    .orderBy(desc(transactionLog.at))) as GrantRow[];

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="w-full max-w-2xl rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Gift className="text-amber-500" /> Admin grant
        {rows.length > 1 && <span className="text-muted-foreground font-normal">· {rows.length} new</span>}
        <span className="ml-auto inline-flex items-center gap-1 text-amber-600 font-bold">
          <Coins className="size-4" />
          +{total}
        </span>
      </div>
      <ul className="text-sm space-y-1">
        {rows.map((r) => {
          const parsed = parseGrantReason(r.reason);
          return (
            <li key={r.id} className="flex items-start gap-2">
              <span className="tabular-nums font-semibold text-amber-600 shrink-0">
                +{r.amount}
              </span>
              <span className="flex-1">
                {parsed.reason ? (
                  <>&ldquo;{parsed.reason}&rdquo; </>
                ) : (
                  "No reason given "
                )}
                <span className="text-muted-foreground text-xs">
                  — from {parsed.adminEmail ?? "admin"} ·{" "}
                  {new Date(r.at).toLocaleString()}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <form action={dismissNotificationsAction} className="flex justify-end">
        <button
          type="submit"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Got it, dismiss
        </button>
      </form>
    </div>
  );
}

function parseGrantReason(raw: string): {
  adminEmail: string | null;
  reason: string | null;
} {
  // Format: "admin-grant:<admin-email>:<free-text reason>"
  const rest = raw.slice("admin-grant:".length);
  const firstColon = rest.indexOf(":");
  if (firstColon === -1) {
    return { adminEmail: rest || null, reason: null };
  }
  const adminEmail = rest.slice(0, firstColon);
  const reason = rest.slice(firstColon + 1).trim();
  return { adminEmail: adminEmail || null, reason: reason || null };
}
