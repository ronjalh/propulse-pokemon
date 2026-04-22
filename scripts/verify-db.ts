import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("Tables in Neon:");
  for (const row of tables as Array<{ table_name: string }>) {
    console.log("  - " + row.table_name);
  }

  const enums = await sql`
    SELECT typname FROM pg_type
    WHERE typtype = 'e'
    ORDER BY typname
  `;
  console.log("\nEnums:");
  for (const row of enums as Array<{ typname: string }>) {
    console.log("  - " + row.typname);
  }
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
