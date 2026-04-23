import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cards, persons, users } from "@/lib/db/schema";
import { generateIVs, rollShiny } from "@/lib/cards/stats";
import { earn, logCardEvent } from "./credits";

// ─────────────────────────────────────────────────────────────────────────────
// 7-day daily-reward cycle
//   Day 1: 50 credits     Day 5: 90 credits
//   Day 2: 60 credits     Day 6: 100 credits
//   Day 3: 70 credits     Day 7: random Propulse card ✨
//   Day 4: 80 credits
//
// Streak advances if you claim within 20–48h of the previous claim.
// Miss two days and the streak resets to day 1. Once day 7 is claimed,
// the cycle wraps back to day 1.
// ─────────────────────────────────────────────────────────────────────────────

export type DailyReward =
  | { day: number; kind: "coins"; amount: number }
  | { day: number; kind: "card" };

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, kind: "coins", amount: 50 },
  { day: 2, kind: "coins", amount: 60 },
  { day: 3, kind: "coins", amount: 70 },
  { day: 4, kind: "coins", amount: 80 },
  { day: 5, kind: "coins", amount: 90 },
  { day: 6, kind: "coins", amount: 100 },
  { day: 7, kind: "card" },
];

const HOURS = (n: number) => n * 60 * 60 * 1000;
const CLAIM_COOLDOWN_MS = HOURS(20);
const STREAK_WINDOW_MS = HOURS(48);

export type RewardStatus = {
  /** The day that will be claimed next (1..7). */
  currentDay: number;
  canClaim: boolean;
  /** When the next claim becomes available, or null if claimable now. */
  nextClaimAt: Date | null;
  /** True if the streak was broken (last claim > 48h ago). */
  streakBroken: boolean;
};

export function computeRewardStatus(
  lastClaimAt: Date | null,
  streakDay: number,
  now: Date = new Date(),
): RewardStatus {
  if (!lastClaimAt) {
    return { currentDay: 1, canClaim: true, nextClaimAt: null, streakBroken: false };
  }
  const elapsed = now.getTime() - lastClaimAt.getTime();
  if (elapsed < CLAIM_COOLDOWN_MS) {
    return {
      currentDay: streakDay,
      canClaim: false,
      nextClaimAt: new Date(lastClaimAt.getTime() + CLAIM_COOLDOWN_MS),
      streakBroken: false,
    };
  }
  if (elapsed >= STREAK_WINDOW_MS) {
    return { currentDay: 1, canClaim: true, nextClaimAt: null, streakBroken: true };
  }
  const nextDay = (streakDay % 7) + 1;
  return { currentDay: nextDay, canClaim: true, nextClaimAt: null, streakBroken: false };
}

export type ClaimResult =
  | { ok: true; day: number; reward: DailyReward; newCardId?: string; personName?: string }
  | { ok: false; reason: "not-yet" | "no-user" };

export async function claimDailyReward(userId: string): Promise<ClaimResult> {
  const rows = await db
    .select({
      lastDailyRewardAt: users.lastDailyRewardAt,
      dailyStreakDay: users.dailyStreakDay,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (rows.length === 0) return { ok: false, reason: "no-user" };

  const status = computeRewardStatus(
    rows[0].lastDailyRewardAt,
    rows[0].dailyStreakDay,
  );
  if (!status.canClaim) return { ok: false, reason: "not-yet" };

  const reward = DAILY_REWARDS[status.currentDay - 1];

  let newCardId: string | undefined;
  let personName: string | undefined;

  if (reward.kind === "coins") {
    await earn({
      userId,
      amount: reward.amount,
      reason: `daily-reward:day-${status.currentDay}`,
    });
  } else {
    // Grant a random Propulse card.
    const allPersons = await db.select().from(persons);
    const person =
      allPersons[Math.floor(Math.random() * allPersons.length)];
    const cardId = crypto.randomUUID();
    await db.insert(cards).values({
      id: cardId,
      personId: person.id,
      ownerId: userId,
      isShiny: rollShiny(cardId),
      ivs: generateIVs(cardId),
      moveIds: [],
    });
    await logCardEvent({
      userId,
      kind: "card_acquire",
      cardId,
      reason: `daily-reward:day-7`,
    });
    newCardId = cardId;
    personName = person.name;
  }

  await db
    .update(users)
    .set({
      lastDailyRewardAt: new Date(),
      dailyStreakDay: status.currentDay,
    })
    .where(eq(users.id, userId));

  return { ok: true, day: status.currentDay, reward, newCardId, personName };
}
