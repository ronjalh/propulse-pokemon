import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getState, isBattleParticipant } from "@/lib/battle/session";
import { db } from "@/lib/db/client";
import { battles, type TurnLogEntry } from "@/lib/db/schema";

/** Client polling fallback for when Pusher isn't configured or drops events. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id: battleId } = await params;

  const allowed = await isBattleParticipant(battleId, session.user.id);
  // Also allow mirror-battle owner (playerId = mirror:<userId>).
  const state = await getState(battleId);
  if (!state) {
    return NextResponse.json({ error: "no-such-battle" }, { status: 404 });
  }
  const isOwner =
    state.sides.some((s) => s.playerId === session.user.id) ||
    state.sides.some(
      (s) => s.playerId === `mirror:${session.user.id}`,
    );
  if (!allowed && !isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Recent turn events from the persisted log so polling clients can replay
  // any events they missed (e.g. when Pusher drops the live stream).
  const [battleRow] = await db
    .select({ turnLog: battles.turnLog })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  const turnLog = (battleRow?.turnLog ?? []) as TurnLogEntry[];
  const recentTurns = turnLog.slice(-8).map((t) => ({
    turn: t.turn,
    events: t.events,
  }));

  // Slim projection — same shape as SlimTurnDelta, plus deadline + phase + recent events.
  return NextResponse.json({
    turn: state.turn,
    winnerId: state.winnerId,
    phase: state.phase,
    deadlineMs: state.deadlineMs,
    version: state.version,
    sides: state.sides.map((s) => ({
      playerId: s.playerId,
      activeIndex: s.activeIndex,
      team: s.team.map((c) => ({
        cardId: c.cardId,
        currentHp: c.currentHp,
        status: c.status,
        confusionTurnsLeft: c.volatile.confusionTurnsLeft,
        sleepTurnsLeft: c.volatile.sleepTurnsLeft,
        ppLeft: c.moves.map((m) => m.ppLeft),
        currentEnergy: c.currentEnergy ?? 0,
      })),
    })),
    recentTurns,
  });
}
