import "server-only";
import Pusher from "pusher";

import {
  BATTLE_EVENT_NAME,
  battleChannelName,
  type BattleEventPayload,
} from "./events";

let cached: Pusher | null = null;

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

/** Publish a typed battle event to every client subscribed to the battle's private channel. */
export async function publishBattleEvent(
  battleId: string,
  event: BattleEventPayload,
): Promise<void> {
  await pusherClient().trigger(battleChannelName(battleId), BATTLE_EVENT_NAME, event);
}

/** Sign a private-channel subscription. Call this from the Pusher auth route. */
export function authorizePrivateChannel(
  socketId: string,
  channelName: string,
): string {
  return pusherClient().authorizeChannel(socketId, channelName).auth;
}
