import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("usage: tsx scripts/promote-admin.ts <email>");
    process.exit(1);
  }
  const lower = email.toLowerCase().trim();
  const result = await db
    .update(users)
    .set({ isAdmin: true })
    .where(eq(users.email, lower))
    .returning({ id: users.id, email: users.email });
  if (result.length === 0) {
    console.error(`no user with email ${lower} — have they signed in at least once?`);
    process.exit(1);
  }
  console.log(`✓ promoted ${result[0].email} (${result[0].id}) to admin`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
