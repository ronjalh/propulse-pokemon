import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { battles, users } from "@/lib/db/schema";
import type { BattleState } from "./types";

export type LeaderboardMode = "1v1" | "6v6" | "rating";

export type LeaderboardEntry = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  wins: number;
  losses: number;
  winRate: number; // 0..100
  rating: number; // Elo rating
};

/**
 * Aggregate finished PvP battles by team-size mode. Only counts battles
 * where both sides are real users (no mirror, no pending) and a winner
 * was decided.
 */
export async function leaderboardFor(
  mode: LeaderboardMode,
): Promise<LeaderboardEntry[]> {
  if (mode === "rating") return ratingLeaderboard();
  const teamSize = mode === "1v1" ? 1 : 6;

  const rows = await db
    .select({
      p1Id: battles.p1Id,
      p2Id: battles.p2Id,
      winnerId: battles.winnerId,
      initialState: battles.initialState,
    })
    .from(battles)
    .where(
      and(
        eq(battles.phase, "ended"),
        isNotNull(battles.winnerId),
        isNotNull(battles.p2Id),
        // jsonb path: sides[0].team — array length determines mode
        sql`jsonb_array_length(${battles.initialState}->'sides'->0->'team') = ${teamSize}`,
      ),
    );

  type Tally = { wins: number; losses: number };
  const byUser = new Map<string, Tally>();
  const inc = (uid: string, key: keyof Tally) => {
    const t = byUser.get(uid) ?? { wins: 0, losses: 0 };
    t[key] += 1;
    byUser.set(uid, t);
  };

  for (const r of rows) {
    if (!r.p1Id || !r.p2Id || !r.winnerId) continue;
    // Defensive: extra check on the state shape in case the index/path query
    // ever drifted.
    const state = r.initialState as BattleState;
    if (state.sides?.[0]?.team?.length !== teamSize) continue;

    if (r.winnerId === r.p1Id) {
      inc(r.p1Id, "wins");
      inc(r.p2Id, "losses");
    } else if (r.winnerId === r.p2Id) {
      inc(r.p2Id, "wins");
      inc(r.p1Id, "losses");
    }
  }

  if (byUser.size === 0) return [];

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      rating: users.rating,
    })
    .from(users);
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const entries: LeaderboardEntry[] = [];
  for (const [uid, t] of byUser) {
    const u = userById.get(uid);
    if (!u) continue; // user deleted — drop from board
    const total = t.wins + t.losses;
    entries.push({
      userId: uid,
      email: u.email,
      name: u.name,
      image: u.image,
      wins: t.wins,
      losses: t.losses,
      winRate: total === 0 ? 0 : Math.round((t.wins / total) * 100),
      rating: u.rating,
    });
  }

  // Rank by wins desc, then win-rate desc, then alphabetical for stability.
  entries.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.winRate !== b.winRate) return b.winRate - a.winRate;
    return (a.name ?? a.email).localeCompare(b.name ?? b.email);
  });

  return entries;
}

/**
 * Rating board: every user with at least one PvP match, sorted by Elo
 * rating. Includes their cumulative cross-mode wins/losses for context.
 */
async function ratingLeaderboard(): Promise<LeaderboardEntry[]> {
  // All ended PvP battles to derive total W/L per user.
  const pvpRows = await db
    .select({
      p1Id: battles.p1Id,
      p2Id: battles.p2Id,
      winnerId: battles.winnerId,
    })
    .from(battles)
    .where(
      and(
        eq(battles.phase, "ended"),
        isNotNull(battles.winnerId),
        isNotNull(battles.p2Id),
      ),
    );

  const tally = new Map<string, { wins: number; losses: number }>();
  const inc = (uid: string, key: "wins" | "losses") => {
    const t = tally.get(uid) ?? { wins: 0, losses: 0 };
    t[key] += 1;
    tally.set(uid, t);
  };
  for (const r of pvpRows) {
    if (!r.p1Id || !r.p2Id || !r.winnerId) continue;
    if (r.p1Id.startsWith("mirror:") || r.p2Id.startsWith("mirror:")) continue;
    if (r.winnerId === r.p1Id) {
      inc(r.p1Id, "wins");
      inc(r.p2Id, "losses");
    } else if (r.winnerId === r.p2Id) {
      inc(r.p2Id, "wins");
      inc(r.p1Id, "losses");
    }
  }

  // Pull every user that has played at least one match (rating != 1000 OR
  // appears in the tally). Sorted by rating desc.
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      rating: users.rating,
    })
    .from(users)
    .orderBy(desc(users.rating));

  const entries: LeaderboardEntry[] = [];
  for (const u of userRows) {
    const t = tally.get(u.id);
    // Include only users who have a battle history. Default-rated users with
    // zero matches are excluded to keep the board meaningful.
    if (!t || t.wins + t.losses === 0) continue;
    const total = t.wins + t.losses;
    entries.push({
      userId: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      wins: t.wins,
      losses: t.losses,
      winRate: total === 0 ? 0 : Math.round((t.wins / total) * 100),
      rating: u.rating,
    });
  }

  return entries;
}
