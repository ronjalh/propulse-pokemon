import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  jsonb,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────
// Auth.js v5 (NextAuth beta) — Drizzle adapter tables
// ─────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),

  // domain extensions
  credits: integer("credits").notNull().default(200),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─────────────────────────────────────────────────────────────
// Domain — Propulse roster (88 members)
// ─────────────────────────────────────────────────────────────

export const disciplineEnum = pgEnum("discipline", [
  "Board",
  "Propulsion",
  "Mechanical",
  "Marketing",
  "IT",
  "Business",
  "Software",
  "Electrical",
  "Mentors",
]);

export const pokemonTypeEnum = pgEnum("pokemon_type", [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
]);

export const rarityEnum = pgEnum("rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);

export type BaseStats = {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
};

export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  email: text("email").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  linkedInUrl: text("linkedin_url"),
  discipline: disciplineEnum("discipline").notNull(),
  subDiscipline: text("sub_discipline"),
  primaryType: pokemonTypeEnum("primary_type").notNull(),
  secondaryType: pokemonTypeEnum("secondary_type"),
  baseStats: jsonb("base_stats").$type<BaseStats>().notNull(),
  rarity: rarityEnum("rarity").notNull().default("common"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
