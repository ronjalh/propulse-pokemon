import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

import { enforceTurnTimeout } from "@/lib/battle/session";

// Intended to be invoked by Vercel Cron (or Upstash QStash) every ~15 seconds.
// Guarded by a shared secret in the `authorization: Bearer …` header.

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "redis not configured" }, { status: 500 });
  }
  const redis = new Redis({ url, token });

  // Scan keys that look like `battle:<id>` (exclude the per-turn intent inboxes).
  const battleIds: string[] = [];
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: "battle:*",
      count: 100,
    });
    cursor = Number(nextCursor);
    for (const k of keys as string[]) {
      if (k.split(":").length === 2) {
        battleIds.push(k.slice("battle:".length));
      }
    }
  } while (cursor !== 0);

  const results = await Promise.all(
    battleIds.map((id) =>
      enforceTurnTimeout(id).then((r) => ({ id, ...r })).catch((e) => ({
        id,
        status: "error" as const,
        error: String(e),
      })),
    ),
  );

  return NextResponse.json({ scanned: battleIds.length, results });
}
