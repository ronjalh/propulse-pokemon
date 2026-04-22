import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { moves } from "../src/lib/db/schema";
import { MOVES } from "../src/lib/data/moves";

async function main() {
  console.log(`Seeding ${MOVES.length} moves…`);

  let inserted = 0;
  let updated = 0;

  for (const m of MOVES) {
    const res = await db
      .insert(moves)
      .values(m)
      .onConflictDoUpdate({
        target: moves.id,
        set: {
          name: sql`EXCLUDED.name`,
          type: sql`EXCLUDED.type`,
          category: sql`EXCLUDED.category`,
          power: sql`EXCLUDED.power`,
          accuracy: sql`EXCLUDED.accuracy`,
          pp: sql`EXCLUDED.pp`,
          priority: sql`EXCLUDED.priority`,
          effect: sql`EXCLUDED.effect`,
          flavor: sql`EXCLUDED.flavor`,
        },
      })
      .returning({ id: moves.id });

    if (res.length) inserted++;
  }

  // `inserted` above counts all upserted rows; split properly by checking pre-existing.
  // For simplicity we report total; exact insert-vs-update split isn't load-bearing.
  updated = 0;
  console.log(`✓ upserted: ${inserted} moves`);

  // Sanity: count by type
  const counts = await db
    .select({
      type: moves.type,
      n: sql<number>`count(*)::int`,
    })
    .from(moves)
    .groupBy(moves.type)
    .orderBy(moves.type);

  console.log("\nMoves per type:");
  for (const r of counts) console.log(`  ${r.type.padEnd(10)} ${r.n}`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
