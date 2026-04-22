CREATE TYPE "public"."move_category" AS ENUM('physical', 'special', 'status');--> statement-breakpoint
CREATE TABLE "moves" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "pokemon_type" NOT NULL,
	"category" "move_category" NOT NULL,
	"power" integer,
	"accuracy" integer NOT NULL,
	"pp" integer NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effect" text,
	"flavor" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "moves_type_idx" ON "moves" USING btree ("type");