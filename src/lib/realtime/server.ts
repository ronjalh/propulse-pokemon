import "server-only";
import Pusher from "pusher";

import {
  BATTLE_EVENT_NAME,
  battleChannelName,
  type BattleEventPayload,
} from "./events";

let cached: Pusher | null = null;

export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET,
  );
}

function pusherClient(): Pusher {
  if (cached) return cached;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "eu";
  if (!appId || !key || !secret) {
    throw new Error(
      "Pusher server env vars missing — set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET",
    );
  }
  cached = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return cached;
}

/**
 * Publish a typed battle event. Never throws — if Pusher isn't configured or
 * the API call fails, we log a warning and continue. Turn resolution in Redis
 * and Postgres must not be blocked by transient realtime hiccups.
 */
export async function publishBattleEvent(
  battleId: string,
  event: BattleEventPayload,
): Promise<void> {
  if (!isPusherConfigured()) {
    console.warn(
      `[pusher] skipping publish for battle ${battleId} — env vars not set (${event.kind})`,
    );
    return;
  }
  try {
    await pusherClient().trigger(
      battleChannelName(battleId),
      BATTLE_EVENT_NAME,
      event,
    );
  } catch (err) {
    console.warn(
      `[pusher] publish failed for battle ${battleId} / ${event.kind}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Sign a private-channel subscription. Call this from the Pusher auth route. */
export function authorizePrivateChannel(
  socketId: string,
  channelName: string,
): string {
  return pusherClient().authorizeChannel(socketId, channelName).auth;
}
