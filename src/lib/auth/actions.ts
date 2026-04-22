"use server";

import { signOut } from "@/auth";

export async function signOutAction(): Promise<never> {
  await signOut({ redirectTo: "/signin" });
  throw new Error("unreachable");
}
