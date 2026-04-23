import { desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { battles, users, type Battle } from "@/lib/db/schema";

export type BattleHistoryRow = Battle & {
  p1Email: string | null;
  p2Email: string | null;
};

export async function battleHistoryForUser(
  userId: string,
): Promise<BattleHistoryRow[]> {
  // Left joins so we see the emails where they exist (mirror/pending rows
  // have null p2Id so the join returns null, which is fine).
  const u2 = users;
  const u1 = users; // drizzle doesn't need separate aliases here since we use distinct joins
  const rows = await db
    .select({
      battle: battles,
      p1Email: u1.email,
    })
    .from(battles)
    .leftJoin(u1, eq(battles.p1Id, u1.id))
    .where(or(eq(battles.p1Id, userId), eq(battles.p2Id, userId)))
    .orderBy(desc(battles.createdAt));

  // Second pass for p2 emails (drizzle aliasing would let us do it in one join
  // but this is simpler to read).
  const p2Ids = rows
    .map((r) => r.battle.p2Id)
    .filter((id): id is string => Boolean(id));
  const p2Emails = p2Ids.length
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(or(...p2Ids.map((id) => eq(users.id, id))))
    : [];
  const p2EmailById = new Map(p2Emails.map((r) => [r.id, r.email]));

  return rows.map((r) => ({
    ...r.battle,
    p1Email: r.p1Email,
    p2Email: r.battle.p2Id ? p2EmailById.get(r.battle.p2Id) ?? null : null,
  }));
}

export async function getBattleForReplay(
  battleId: string,
  userId: string,
): Promise<Battle | null> {
  const rows = await db
    .select()
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  const b = rows[0];
  if (!b) return null;
  if (b.p1Id !== userId && b.p2Id !== userId) return null;
  return b;
}
