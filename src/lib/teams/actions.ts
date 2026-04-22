"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { teams, type TeamMoveSets } from "@/lib/db/schema";
import {
  eligibleMovesByCardId,
  ownedCardsForUser,
} from "./queries";
import {
  TEAM_SIZE,
  validateTeam,
  type TeamDraft,
} from "./validation";

export async function createTeamAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const name = String(formData.get("name") ?? "").trim() || "Untitled Team";

  const inserted = await db
    .insert(teams)
    .values({
      userId,
      name,
      cardIds: new Array(TEAM_SIZE).fill("") as string[],
      moveSets: {} as TeamMoveSets,
    })
    .returning({ id: teams.id });

  redirect(`/teams/${inserted[0].id}`);
}

export async function deleteTeamAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const id = String(formData.get("teamId") ?? "");
  if (!id) redirect("/teams");

  await db
    .delete(teams)
    .where(and(eq(teams.id, id), eq(teams.userId, session.user.id)));

  revalidatePath("/teams");
  redirect("/teams");
}

export async function saveTeamAction(
  teamId: string,
  draft: TeamDraft,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  // Ownership-scoped fetch of user's cards and their eligibility map.
  const owned = await ownedCardsForUser(userId);
  const eligible = await eligibleMovesByCardId(
    owned.map((c) => ({ cardId: c.cardId, personId: c.personId })),
  );
  const eligibleIdsByCard = new Map<string, Set<string>>();
  for (const [cardId, moves] of eligible) {
    eligibleIdsByCard.set(cardId, new Set(moves.map((m) => m.id)));
  }

  const errors = validateTeam(draft, eligibleIdsByCard);
  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e) => `${e.field}: ${e.message}`) };
  }

  await db
    .update(teams)
    .set({
      name: draft.name.trim(),
      cardIds: draft.cardIds,
      moveSets: draft.moveSets,
      updatedAt: new Date(),
    })
    .where(and(eq(teams.id, teamId), eq(teams.userId, userId)));

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true };
}
