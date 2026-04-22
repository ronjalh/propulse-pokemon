import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { persons } from "../src/lib/db/schema";
import { resolveTypes } from "../src/lib/data/type-mapping";
import { DISCIPLINE_BASE_STATS, assignRarity } from "../src/lib/data/base-stats";

type RawMember = {
  name: string;
  title: string;
  image: string;
  linkedIn: string;
  email: string;
};

type Flat = RawMember & {
  discipline: string;
  subDiscipline?: string;
};

// Higher priority wins when a Person appears under multiple disciplines.
// Mentors = 1 (highest), common roles = 3 (lowest).
const DISCIPLINE_PRIORITY: Record<string, number> = {
  Mentors: 1,
  Board: 2,
  Propulsion: 3,
  Mechanical: 3,
  Software: 3,
  Electrical: 3,
  IT: 3,
  Marketing: 3,
  Business: 3,
};

function flatten(roster: {
  disciplines: Array<{
    name: string;
    members: RawMember[];
    subDisciplines?: Array<{ name: string; members: RawMember[] }>;
  }>;
}): Flat[] {
  const out: Flat[] = [];
  for (const d of roster.disciplines) {
    for (const m of d.members) out.push({ ...m, discipline: d.name });
    for (const sub of d.subDisciplines ?? []) {
      for (const m of sub.members) {
        out.push({ ...m, discipline: d.name, subDiscipline: sub.name });
      }
    }
  }
  return out;
}

function dedupe(members: Flat[]): Flat[] {
  const byEmail = new Map<string, Flat>();
  for (const m of members) {
    const email = m.email.toLowerCase().trim();
    const prev = byEmail.get(email);
    if (!prev) {
      byEmail.set(email, m);
      continue;
    }
    const prevPri = DISCIPLINE_PRIORITY[prev.discipline] ?? 3;
    const newPri = DISCIPLINE_PRIORITY[m.discipline] ?? 3;
    if (newPri < prevPri) byEmail.set(email, m);
  }
  return Array.from(byEmail.values());
}

async function main() {
  const rosterPath = join(process.cwd(), "src", "lib", "data", "roster.json");
  const roster = JSON.parse(readFileSync(rosterPath, "utf-8"));

  const flat = flatten(roster);
  const unique = dedupe(flat);
  console.log(`Flat entries: ${flat.length}  →  unique persons: ${unique.length}`);

  let inserted = 0;
  let updated = 0;

  for (const m of unique) {
    const types = resolveTypes(
      m.discipline as Parameters<typeof resolveTypes>[0],
      m.subDiscipline,
    );
    const email = m.email.toLowerCase().trim();
    const linkedIn = m.linkedIn?.trim() ? m.linkedIn.trim() : null;

    const result = await db
      .insert(persons)
      .values({
        name: m.name,
        title: m.title.trim(),
        email,
        imageUrl: m.image,
        linkedInUrl: linkedIn,
        discipline: m.discipline as "Board",
        subDiscipline: m.subDiscipline ?? null,
        primaryType: types[0],
        secondaryType: types.length > 1 ? types[1] : null,
        baseStats: DISCIPLINE_BASE_STATS[m.discipline],
        rarity: assignRarity(m.discipline, m.title),
      })
      .onConflictDoUpdate({
        target: persons.email,
        set: {
          name: sql`EXCLUDED.name`,
          title: sql`EXCLUDED.title`,
          imageUrl: sql`EXCLUDED.image_url`,
          linkedInUrl: sql`EXCLUDED.linkedin_url`,
          discipline: sql`EXCLUDED.discipline`,
          subDiscipline: sql`EXCLUDED.sub_discipline`,
          primaryType: sql`EXCLUDED.primary_type`,
          secondaryType: sql`EXCLUDED.secondary_type`,
          baseStats: sql`EXCLUDED.base_stats`,
          rarity: sql`EXCLUDED.rarity`,
        },
      })
      .returning({ id: persons.id, createdAt: persons.createdAt });

    // createdAt ≈ now means this was an insert
    const row = result[0];
    if (row && Date.now() - row.createdAt.getTime() < 5000) inserted++;
    else updated++;
  }

  console.log(`✓ inserted: ${inserted}, updated: ${updated}`);

  // Sanity counts by discipline
  const counts = await db
    .select({
      discipline: persons.discipline,
      n: sql<number>`count(*)::int`,
    })
    .from(persons)
    .groupBy(persons.discipline)
    .orderBy(persons.discipline);

  console.log("\nPersons per discipline:");
  for (const r of counts) console.log(`  ${r.discipline.padEnd(12)} ${r.n}`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
