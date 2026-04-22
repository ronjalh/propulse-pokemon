"use client";

import PusherClient, { type Channel } from "pusher-js";
import { useEffect, useRef } from "react";

import {
  BATTLE_EVENT_NAME,
  battleChannelName,
  type BattleEventPayload,
} from "./events";

let cachedClient: PusherClient | null = null;

function getClient(): PusherClient {
  if (cachedClient) return cachedClient;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu";
  if (!key) {
    throw new Error("NEXT_PUBLIC_PUSHER_KEY missing — cannot connect to Pusher");
  }
  cachedClient = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/pusher/auth",
  });
  return cachedClient;
}

/** Subscribe to a battle's event stream. Unsubscribes automatically on unmount. */
export function useBattleChannel(
  battleId: string | null | undefined,
  onEvent: (event: BattleEventPayload) => void,
): void {
  // Capture the latest handler in a ref so re-subscribes don't churn.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!battleId) return;
    const client = getClient();
    const channelName = battleChannelName(battleId);
    const channel: Channel = client.subscribe(channelName);

    const listener = (payload: BattleEventPayload) => {
      handlerRef.current(payload);
    };
    channel.bind(BATTLE_EVENT_NAME, listener);

    return () => {
      channel.unbind(BATTLE_EVENT_NAME, listener);
      client.unsubscribe(channelName);
    };
  }, [battleId]);
}
