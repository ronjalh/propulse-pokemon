ALTER TABLE "users" ADD COLUMN "last_daily_reward_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_streak_day" integer DEFAULT 0 NOT NULL;