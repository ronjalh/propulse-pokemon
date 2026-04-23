import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Coins } from "lucide-react";

import { auth } from "@/auth";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { fetchCardMeta } from "@/lib/battle/card-meta";
import { getState } from "@/lib/battle/session";
import { db } from "@/lib/db/client";
import { battles as battlesTable, users } from "@/lib/db/schema";
import { listTeamsForUser, ownedCardsForUser } from "@/lib/teams/queries";
import { JoinBattle } from "./JoinBattle";
import { BattleScreen } from "./BattleScreen";

function WagerSummary({
  wager,
  wagerCardName,
}: {
  wager: { credits: number; p1CardId: string | null };
  wagerCardName?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-center gap-2">
      <Coins className="text-amber-500 shrink-0" />
      <div>
        <div className="font-medium">Wagered match</div>
        <div className="text-xs text-muted-foreground">
          {wager.credits > 0 && (
            <>
              {wager.credits} credits per side · winner takes {wager.credits * 2}
            </>
          )}
          {wager.credits > 0 && wager.p1CardId && " · "}
          {wager.p1CardId && (
            <>
              challenger wagered <b>{wagerCardName ?? "a card"}</b> — you must
              wager one of yours too
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function BattlePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { id: battleId } = await params;
  const { error } = await searchParams;

  const state = await getState(battleId);
  if (!state) notFound();

  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase() ?? "";
  const placeholderEmail = state.sides[1].playerId.startsWith("pending:")
    ? state.sides[1].playerId.slice("pending:".length)
    : null;
  const isParticipant =
    state.sides.some((s) => s.playerId === userId) ||
    state.pendingOpponent?.userId === userId ||
    placeholderEmail === userEmail;
  if (!isParticipant) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">
          You&rsquo;re not a participant in this battle.
        </div>
      </main>
    );
  }

  const header = (
    <div className="flex items-center justify-between mb-4">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>
      <CreditsBadge userId={userId} />
    </div>
  );

  if (state.phase === "awaiting_opponent") {
    // Fetch the battle row to read wager details.
    const battleRows = await db
      .select({ wager: battlesTable.wager })
      .from(battlesTable)
      .where(eq(battlesTable.id, battleId))
      .limit(1);
    const wager = battleRows[0]?.wager as
      | { credits: number; p1CardId: string | null; p2CardId: string | null; settled: boolean }
      | null;
    const wagerCard = wager?.p1CardId
      ? (await fetchCardMeta([wager.p1CardId]))[wager.p1CardId]
      : null;

    const iAmChallenger = state.sides[0].playerId === userId;
    if (iAmChallenger) {
      const shareLink = `/battle/${battleId}`;
      return (
        <main className="min-h-screen p-6 max-w-2xl mx-auto">
          {header}
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Waiting for opponent…
          </h1>
          <p className="text-sm text-muted-foreground">
            Share this link with{" "}
            <span className="font-mono">{state.pendingOpponent?.email}</span>:
          </p>
          <div className="mt-3 rounded-md border p-3 font-mono text-sm break-all">
            {shareLink}
          </div>
          {wager && <WagerSummary wager={wager} wagerCardName={wagerCard?.personName} />}
          <p className="mt-3 text-xs text-muted-foreground">
            Refresh this page once they&rsquo;ve joined.
          </p>
        </main>
      );
    }
    // Invitee view — pick a team (or single card for 1v1) to accept with.
    const is1v1 = state.sides[0].team.length === 1;
    const myTeams = is1v1 ? [] : await listTeamsForUser(userId);
    const readyTeams = myTeams.filter(
      (t) => t.cardIds.filter(Boolean).length === 6,
    );
    const myCards = is1v1 ? await ownedCardsForUser(userId) : [];
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
        {header}
        <h1 className="text-2xl font-bold tracking-tight">
          {is1v1 ? "1v1 challenge" : "Battle challenge"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {state.sides[0].playerId} challenged you.{" "}
          {is1v1 ? "Pick a single card to accept." : "Pick a team to accept."}
        </p>
        {wager && <WagerSummary wager={wager} wagerCardName={wagerCard?.personName} />}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <JoinBattle
          battleId={battleId}
          mode={is1v1 ? "card" : "team"}
          teams={readyTeams}
          cards={myCards}
          wager={wager}
        />
      </main>
    );
  }

  // phase === "live" or "ended" → real battle screen
  const meSideIndex = state.sides.findIndex((s) => s.playerId === userId);
  // Handle solo-mirror battles: userId appears only as side 0, mirror:<id> as side 1
  const effectiveMeIndex =
    meSideIndex === -1 && state.sides[1].playerId === `mirror:${userId}`
      ? 0
      : meSideIndex;

  // Fetch presentation data for every card in both teams so we can render
  // full PropulseCards in the battle UI (images, stats, type gradient).
  const allCardIds = state.sides.flatMap((s) => s.team.map((c) => c.cardId));
  const cardMeta = await fetchCardMeta(allCardIds);

  // Opponent profile for the battle header (name/avatar).
  const oppPlayerId = state.sides[1 - effectiveMeIndex].playerId;
  const isMirror = oppPlayerId.startsWith("mirror:");
  const isPendingEmail = oppPlayerId.startsWith("pending:");
  let opponentInfo: {
    displayName: string;
    imageUrl: string | null;
    isMirror: boolean;
  };
  if (isMirror) {
    opponentInfo = {
      displayName: "Mirror (you)",
      imageUrl: session.user.image ?? null,
      isMirror: true,
    };
  } else if (isPendingEmail) {
    opponentInfo = {
      displayName: oppPlayerId.slice("pending:".length),
      imageUrl: null,
      isMirror: false,
    };
  } else {
    const opp = await db
      .select({ name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, oppPlayerId))
      .limit(1);
    const row = opp[0];
    opponentInfo = {
      displayName: row?.name ?? row?.email ?? oppPlayerId.slice(0, 8),
      imageUrl: row?.image ?? null,
      isMirror: false,
    };
  }

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      {header}
      <BattleScreen
        battleId={battleId}
        initialState={state}
        meSideIndex={effectiveMeIndex}
        cardMeta={cardMeta}
        opponentInfo={opponentInfo}
      />
    </main>
  );
}
