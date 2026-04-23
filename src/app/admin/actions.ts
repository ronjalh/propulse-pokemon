"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { earn } from "@/lib/economy/credits";

export async function grantCreditsAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // Authoritative admin check from the DB row (session flag could be stale).
  const [me] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!me?.isAdmin) redirect("/");

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
    reason: `admin-grant:${session.user.email}:${reason}`,
  });

  revalidatePath("/admin");
  redirect(`/admin?granted=${amountRaw}`);
}
