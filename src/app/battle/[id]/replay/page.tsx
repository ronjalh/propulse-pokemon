import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { getBattleForReplay } from "@/lib/battle/history-queries";
import { ReplayViewer } from "./ReplayViewer";

type PageProps = { params: Promise<{ id: string }> };

export default async function ReplayPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { id } = await params;

  const battle = await getBattleForReplay(id, session.user.id);
  if (!battle) notFound();

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/battle/history"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← History
        </Link>
        <CreditsBadge userId={session.user.id} />
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        Replay · {battle.turnsPlayed} turns
      </h1>

      <ReplayViewer
        initialState={battle.initialState as never}
        turnLog={battle.turnLog as never}
        finalState={(battle.finalState ?? battle.initialState) as never}
        meUserId={session.user.id}
      />
    </main>
  );
}
