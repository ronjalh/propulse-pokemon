"use server";

import { and, eq, not } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { earn, spend, InsufficientCreditsError } from "@/lib/economy/credits";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const [me] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!me?.isAdmin) redirect("/");
  return session.user.id;
}

export async function grantCreditsAction(formData: FormData): Promise<never> {
  const adminUserId = await requireAdmin();
  const session = await auth();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const amountRaw = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").slice(0, 200) || "admin grant";
  if (!email) redirect("/admin?error=missing-fields");
  if (!Number.isFinite(amountRaw) || amountRaw <= 0 || !Number.isInteger(amountRaw)) {
    redirect("/admin?error=bad-amount");
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!target) redirect("/admin?error=no-such-user");

  await earn({
    userId: target.id,
    amount: amountRaw,
    reason: `admin-grant:${session?.user?.email ?? adminUserId}:${reason}`,
  });

  revalidatePath("/admin");
  redirect(`/admin?granted=${amountRaw}`);
}

/** Flip the isAdmin flag on another user. Safety: can't demote yourself. */
export async function toggleAdminAction(formData: FormData): Promise<never> {
  const adminUserId = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId) redirect("/admin");
  if (targetId === adminUserId) redirect("/admin?error=cannot-self-demote");

  const [target] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) redirect("/admin?error=no-such-user");

  await db
    .update(users)
    .set({ isAdmin: !target.isAdmin })
    .where(and(eq(users.id, targetId), not(eq(users.id, adminUserId))));

  revalidatePath("/admin");
  redirect("/admin");
}

/** Flip the banned flag on another user. Safety: can't ban yourself. */
export async function toggleBanAction(formData: FormData): Promise<never> {
  const adminUserId = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId) redirect("/admin");
  if (targetId === adminUserId) redirect("/admin?error=cannot-self-ban");

  const [target] = await db
    .select({ banned: users.banned })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) redirect("/admin?error=no-such-user");

  await db
    .update(users)
    .set({ banned: !target.banned })
    .where(and(eq(users.id, targetId), not(eq(users.id, adminUserId))));

  revalidatePath("/admin");
  redirect("/admin");
}

export async function removeCreditsAction(formData: FormData): Promise<never> {
  const adminUserId = await requireAdmin();
  const session = await auth();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const amountRaw = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").slice(0, 200) || "admin removal";
  if (!email) redirect("/admin?error=missing-fields");
  if (!Number.isFinite(amountRaw) || amountRaw <= 0 || !Number.isInteger(amountRaw)) {
    redirect("/admin?error=bad-amount");
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!target) redirect("/admin?error=no-such-user");

  try {
    await spend({
      userId: target.id,
      amount: amountRaw,
      reason: `admin-removal:${session?.user?.email ?? adminUserId}:${reason}`,
    });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      redirect("/admin?error=insufficient-credits");
    }
    throw e;
  }

  revalidatePath("/admin");
  redirect(`/admin?removed=${amountRaw}`);
}
