"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function dismissNotificationsAction(): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  await db
    .update(users)
    .set({ lastNotificationsSeenAt: new Date() })
    .where(eq(users.id, session.user.id));
  revalidatePath("/");
  redirect("/");
}
