"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { cards } from "@/lib/db/schema";
import { logCardEvent } from "@/lib/economy/credits";
import { LEVEL_UP_COST, MAX_CARD_LEVEL } from "./stats";

export async function levelUpCardAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const targetId = String(formData.get("targetId") ?? "");
  const fodderIds = formData.getAll("fodderIds").map((v) => String(v));
  const uniqueFodder = [...new Set(fodderIds)];
  if (uniqueFodder.length !== fodderIds.length) {
    redirect(`/collection/${targetId}/level-up?error=duplicate-fodder`);
  }
  if (uniqueFodder.includes(targetId)) {
    redirect(`/collection/${targetId}/level-up?error=cant-eat-self`);
  }

  const [target] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, targetId), eq(cards.ownerId, userId)))
    .limit(1);
  if (!target) redirect(`/collection`);

  const cost = LEVEL_UP_COST[target.level];
  if (cost == null) {
    redirect(`/collection/${targetId}/level-up?error=already-max`);
  }
  if (uniqueFodder.length !== cost) {
    redirect(`/collection/${targetId}/level-up?error=wrong-fodder-count`);
  }

  // Validate fodder: owned by user, same person, exists.
  const fodderRows = await db
    .select()
    .from(cards)
    .where(inArray(cards.id, uniqueFodder));
  if (fodderRows.length !== uniqueFodder.length) {
    redirect(`/collection/${targetId}/level-up?error=fodder-not-found`);
  }
  for (const f of fodderRows) {
    if (f.ownerId !== userId) {
      redirect(`/collection/${targetId}/level-up?error=fodder-not-owned`);
    }
    if (f.personId !== target.personId) {
      redirect(`/collection/${targetId}/level-up?error=fodder-wrong-person`);
    }
  }

  // Apply: delete fodder, bump target level.
  await db.delete(cards).where(inArray(cards.id, uniqueFodder));
  await db
    .update(cards)
    .set({ level: Math.min(target.level + 1, MAX_CARD_LEVEL) })
    .where(eq(cards.id, targetId));

  // Audit rows: card_consumed per fodder.
  for (const f of fodderRows) {
    await logCardEvent({
      userId,
      kind: "card_consumed",
      cardId: f.id,
      reason: `level-up:${targetId}:to-lvl-${target.level + 1}`,
    });
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${targetId}/level-up`);
  redirect(`/collection/${targetId}/level-up`);
}
