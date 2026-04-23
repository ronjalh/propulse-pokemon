import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { deleteBattleAction } from "@/lib/battle/actions";
import { battleHistoryForUser } from "@/lib/battle/history-queries";

export default async function BattleHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const rows = await battleHistoryForUser(userId);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={userId} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Battle History</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No battles yet.{" "}
          <Link href="/battle/new" className="underline">
            Start one →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const iAmP1 = row.p1Id === userId;
            const opponentEmail = iAmP1 ? row.p2Email : row.p1Email;
            const opponentLabel =
              opponentEmail ?? (iAmP1 ? "mirror/pending" : "(unknown)");
            // `endedAt` is the authoritative "is this battle over" signal.
            // `winnerId` can be null even for a finished battle (mirror /
            // pending opponent won — FK-unconstrained pseudo-id stripped to null).
            const outcome =
              row.endedAt == null
                ? "ongoing"
                : row.winnerId === userId
                  ? "win"
                  : "loss";
            const outcomeClass =
              outcome === "win"
                ? "text-emerald-500"
                : outcome === "loss"
                  ? "text-destructive"
                  : "text-muted-foreground";
            return (
              <li
                key={row.id}
                className="rounded-lg border p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <span className={outcomeClass}>
                      {outcome === "win"
                        ? "Victory"
                        : outcome === "loss"
                          ? "Defeat"
                          : "In progress"}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      vs {opponentLabel}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()} · {row.turnsPlayed} turn
                    {row.turnsPlayed === 1 ? "" : "s"}
                  </div>
                </div>
                <Link
                  href={`/battle/${row.id}/replay`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Replay →
                </Link>
                <form action={deleteBattleAction}>
                  <input type="hidden" name="battleId" value={row.id} />
                  <button
                    type="submit"
                    aria-label="Delete battle"
                    title="Delete this battle"
                    className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
