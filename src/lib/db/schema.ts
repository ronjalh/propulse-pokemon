import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  primaryKey,
  jsonb,
  pgEnum,
  uuid,
  index,
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
  lastDailyRewardAt: timestamp("last_daily_reward_at", { withTimezone: true }),
  dailyStreakDay: integer("daily_streak_day").notNull().default(0),
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

// ─────────────────────────────────────────────────────────────
// Cards — each pulled copy of a Person
// ─────────────────────────────────────────────────────────────

export type IVs = {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
};

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "restrict" }),
    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    isShiny: boolean("is_shiny").notNull().default(false),
    ivs: jsonb("ivs").$type<IVs>().notNull(),
    moveIds: jsonb("move_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    pulledAt: timestamp("pulled_at").notNull().defaultNow(),
  },
  (t) => [
    index("cards_owner_idx").on(t.ownerId),
    index("cards_person_idx").on(t.personId),
  ],
);

// ─────────────────────────────────────────────────────────────
// Moves — hardcoded move catalog (slugged, edited via admin panel)
// ─────────────────────────────────────────────────────────────

export const moveCategoryEnum = pgEnum("move_category", [
  "physical",
  "special",
  "status",
]);

export const moves = pgTable(
  "moves",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: pokemonTypeEnum("type").notNull(),
    category: moveCategoryEnum("category").notNull(),
    power: integer("power"),
    accuracy: integer("accuracy").notNull(),
    pp: integer("pp").notNull(),
    priority: integer("priority").notNull().default(0),
    effect: text("effect"),
    flavor: text("flavor").notNull(),
  },
  (t) => [index("moves_type_idx").on(t.type)],
);

// ─────────────────────────────────────────────────────────────
// Per-Person Learnsets — who can use which moves
// ─────────────────────────────────────────────────────────────

export const personLearnset = pgTable(
  "person_learnset",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    moveId: text("move_id")
      .notNull()
      .references(() => moves.id, { onDelete: "cascade" }),
    isTm: boolean("is_tm").notNull().default(false),
    learnedAtLevel: integer("learned_at_level"),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.moveId] }),
    index("learnset_person_idx").on(t.personId),
  ],
);

export type User = typeof users.$inferSelect;
export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type Move = typeof moves.$inferSelect;
export type NewMove = typeof moves.$inferInsert;
export type MoveCategory = (typeof moveCategoryEnum.enumValues)[number];
export type LearnsetEntry = typeof personLearnset.$inferSelect;
export type NewLearnsetEntry = typeof personLearnset.$inferInsert;

// ─────────────────────────────────────────────────────────────
// Transaction log — audit trail for every credit / card movement
// ─────────────────────────────────────────────────────────────

export const transactionKindEnum = pgEnum("transaction_kind", [
  "credits_earn",
  "credits_spend",
  "card_acquire",
  "card_transfer",
  "card_consumed",
]);

export const transactionLog = pgTable(
  "transaction_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: transactionKindEnum("kind").notNull(),
    amount: integer("amount"),
    cardId: uuid("card_id").references(() => cards.id, { onDelete: "set null" }),
    relatedBattleId: uuid("related_battle_id"),
    reason: text("reason").notNull(),
  },
  (t) => [
    index("tx_user_at_idx").on(t.userId, t.at),
    index("tx_kind_idx").on(t.kind),
  ],
);

export type Transaction = typeof transactionLog.$inferSelect;
export type NewTransaction = typeof transactionLog.$inferInsert;
export type TransactionKind = (typeof transactionKindEnum.enumValues)[number];

// ─────────────────────────────────────────────────────────────
// Teams — saved 6-card battle teams with move sets
// ─────────────────────────────────────────────────────────────

export type TeamMoveSets = Record<string, string[]>; // cardId → moveId[] (0–4)

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cardIds: jsonb("card_ids").$type<string[]>().notNull(),
    moveSets: jsonb("move_sets").$type<TeamMoveSets>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("teams_user_idx").on(t.userId)],
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

// ─────────────────────────────────────────────────────────────
// Battle history — persisted final state + turn log for replays
// ─────────────────────────────────────────────────────────────

export type TurnLogEntry = {
  turn: number;
  /** Events produced by resolveTurn for this turn. */
  events: unknown[];
  /** State snapshot AFTER this turn resolved. */
  stateAfter: unknown;
};

export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    p1Id: text("p1_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    p2Id: text("p2_id").references(() => users.id, { onDelete: "set null" }),
    winnerId: text("winner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rngSeed: bigint("rng_seed", { mode: "number" }).notNull(),
    initialState: jsonb("initial_state").notNull(),
    finalState: jsonb("final_state"),
    turnLog: jsonb("turn_log").$type<TurnLogEntry[]>().notNull().default([]),
    turnsPlayed: integer("turns_played").notNull().default(0),
  },
  (t) => [
    index("battles_p1_idx").on(t.p1Id, t.createdAt),
    index("battles_p2_idx").on(t.p2Id, t.createdAt),
  ],
);

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;

// ─────────────────────────────────────────────────────────────
// Trades — 1:1 card swap between users with mutual accept
// ─────────────────────────────────────────────────────────────

export const tradeStatusEnum = pgEnum("trade_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offeredCardId: uuid("offered_card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    requestedCardId: uuid("requested_card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    status: tradeStatusEnum("status").notNull().default("pending"),
    message: text("message"),
  },
  (t) => [
    index("trades_from_status_idx").on(t.fromUserId, t.status),
    index("trades_to_status_idx").on(t.toUserId, t.status),
  ],
);

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type TradeStatus = (typeof tradeStatusEnum.enumValues)[number];
