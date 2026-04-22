import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { listTeamsForUser } from "@/lib/teams/queries";
import { createTeamAction, deleteTeamAction } from "@/lib/teams/actions";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const teams = await listTeamsForUser(session.user.id);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
        <form action={createTeamAction}>
          <input type="hidden" name="name" value="New Team" />
          <Button type="submit">+ New team</Button>
        </form>
      </div>

      {teams.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No teams yet. Hit &ldquo;New team&rdquo; to build your first 6-card lineup.
        </p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => {
            const filled = team.cardIds.filter(Boolean).length;
            const complete = filled === 6;
            return (
              <li
                key={team.id}
                className="rounded-lg border p-4 flex items-center gap-4"
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="flex-1 hover:underline"
                >
                  <div className="font-semibold">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {filled}/6 cards {complete ? "· ready" : "· incomplete"}
                  </div>
                </Link>
                <form action={deleteTeamAction}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
