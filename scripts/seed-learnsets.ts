import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { personLearnset, persons } from "../src/lib/db/schema";
import { assignLearnset } from "../src/lib/moves/learning";

async function main() {
  const all = await db.select().from(persons);
  console.log(`Assigning learnsets to ${all.length} persons…`);

  let totalEntries = 0;
  for (const person of all) {
    const entries = assignLearnset(person);
    if (!entries.length) continue;
    await db
      .insert(personLearnset)
      .values(entries)
      .onConflictDoUpdate({
        target: [personLearnset.personId, personLearnset.moveId],
        set: {
          isTm: sql`EXCLUDED.is_tm`,
          learnedAtLevel: sql`EXCLUDED.learned_at_level`,
        },
      });
    totalEntries += entries.length;
  }

  const rowCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(personLearnset);

  console.log(`✓ upserted ${totalEntries} learnset entries`);
  console.log(`  total rows in person_learnset: ${rowCount[0]?.n ?? 0}`);

  const tmCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(personLearnset)
    .where(sql`is_tm = true`);
  console.log(`  of which TM-learned: ${tmCount[0]?.n ?? 0}`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
