import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import {
  eligibleMovesByCardId,
  getTeam,
  ownedCardsForUser,
} from "@/lib/teams/queries";
import { TeamEditor } from "./TeamEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function TeamEditorPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { id } = await params;

  const team = await getTeam(id, session.user.id);
  if (!team) notFound();

  const owned = await ownedCardsForUser(session.user.id);
  const eligibleByCard = await eligibleMovesByCardId(
    owned.map((c) => ({ cardId: c.cardId, personId: c.personId })),
  );

  // Flatten eligibility map to a plain object for client serialization.
  const eligiblePlain: Record<string, NonNullable<ReturnType<typeof eligibleByCard.get>>> = {};
  for (const [cardId, moves] of eligibleByCard) {
    if (moves) eligiblePlain[cardId] = moves;
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/teams" className="text-sm text-muted-foreground hover:underline">
          ← Teams
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <TeamEditor
        teamId={team.id}
        initialName={team.name}
        initialCardIds={team.cardIds}
        initialMoveSets={team.moveSets}
        ownedCards={owned}
        eligibleByCard={eligiblePlain}
      />
    </main>
  );
}
