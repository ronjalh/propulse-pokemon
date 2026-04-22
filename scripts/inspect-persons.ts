import { db } from "../src/lib/db/client";
import { persons } from "../src/lib/db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  const sample = await db
    .select()
    .from(persons)
    .where(
      or(
        eq(persons.email, "ronja.hetland@propulsentnu.no"),
        eq(persons.email, "simen.fritsvold@propulsentnu.no"),
        eq(persons.email, "stian.alseth@propulsentnu.no"),
        eq(persons.email, "even.drugli@propulsentnu.no"),
        eq(persons.email, "lucas.vo@propulsentnu.no"),
        eq(persons.email, "ola.flaata@propulsentnu.no"),
        eq(persons.email, "milton.heen@propulsentnu.no"),
      ),
    );

  for (const p of sample) {
    const types = p.secondaryType ? `${p.primaryType}/${p.secondaryType}` : p.primaryType;
    console.log(
      `${p.name.padEnd(28)} ${p.discipline.padEnd(12)} ${(p.subDiscipline ?? "-").padEnd(18)} ${types.padEnd(20)} ${p.rarity}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
