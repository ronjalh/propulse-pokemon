"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { claimDailyReward } from "@/lib/economy/daily-rewards";

export async function claimDailyRewardAction(): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const result = await claimDailyReward(session.user.id);
  if (!result.ok) {
    redirect(`/rewards?error=${result.reason}`);
  }
  const params = new URLSearchParams({
    claimed: String(result.day),
    kind: result.reward.kind,
  });
  if (result.reward.kind === "coins") {
    params.set("amount", String(result.reward.amount));
  } else if (result.personName) {
    params.set("person", result.personName);
  }
  redirect(`/rewards?${params.toString()}`);
}
