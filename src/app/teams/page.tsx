import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2, ChevronRight } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import {
  listTeamsForUser,
  previewCardsForTeams,
  type TeamPreviewCard,
} from "@/lib/teams/queries";
import { createTeamAction, deleteTeamAction } from "@/lib/teams/actions";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const teams = await listTeamsForUser(session.user.id);
  const previews = await previewCardsForTeams(teams, 6);

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
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
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((team) => {
            const filled = team.cardIds.filter(Boolean).length;
            const complete = filled === 6;
            const preview = previews[team.id] ?? [];
            return (
              <div
                key={team.id}
                className="group rounded-lg border hover:border-sky-500/60 transition-colors flex flex-col"
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="flex-1 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{team.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {filled}/6 cards{" "}
                        <span
                          className={
                            complete ? "text-emerald-500" : "text-amber-500"
                          }
                        >
                          {complete ? "· ready" : "· incomplete"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {/* Preview row — all 6 slots, filled or empty */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {preview.map((p) => (
                      <PreviewThumb key={p.cardId} card={p} />
                    ))}
                    {Array.from({ length: 6 - preview.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="aspect-square rounded-full border-2 border-dashed border-muted-foreground/20"
                      />
                    ))}
                  </div>
                </Link>

                <div className="border-t px-3 py-2 flex justify-end">
                  <form action={deleteTeamAction}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <button
                      type="submit"
                      aria-label="Delete team"
                      title="Delete team"
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function PreviewThumb({ card }: { card: TeamPreviewCard }) {
  const types = card.secondaryType
    ? `${card.primaryType}/${card.secondaryType}`
    : card.primaryType;
  return (
    <div className="relative group/thumb aspect-square">
      <div className="size-full rounded-full overflow-hidden ring-2 ring-sky-500/60 bg-muted">
        <Image
          src={card.imageUrl}
          alt={card.personName}
          width={64}
          height={64}
          className="object-cover size-full"
        />
      </div>
      <div
        className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-0.5 text-xs font-medium shadow opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10"
      >
        {card.personName} · {types}
      </div>
    </div>
  );
}
