import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Battle participant check used by the Pusher auth route to decide whether a
// given user is allowed to subscribe to a battle's private channel.
//
// This is a stub that will be replaced by the real lookup in `battle-session-state`
// (the Redis-backed session store). For now it denies everything by default so
// no one can subscribe until battles exist.
// ─────────────────────────────────────────────────────────────────────────────

export type ParticipantChecker = (
  battleId: string,
  userId: string,
) => Promise<boolean>;

let checker: ParticipantChecker = async () => false;

export function registerParticipantChecker(fn: ParticipantChecker): void {
  checker = fn;
}

export async function isBattleParticipant(
  battleId: string,
  userId: string,
): Promise<boolean> {
  return checker(battleId, userId);
}
