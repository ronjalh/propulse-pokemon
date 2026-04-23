CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"p1_id" text NOT NULL,
	"p2_id" text,
	"winner_id" text,
	"rng_seed" integer NOT NULL,
	"initial_state" jsonb NOT NULL,
	"final_state" jsonb,
	"turn_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"turns_played" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_p1_id_users_id_fk" FOREIGN KEY ("p1_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_p2_id_users_id_fk" FOREIGN KEY ("p2_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battles_p1_idx" ON "battles" USING btree ("p1_id","created_at");--> statement-breakpoint
CREATE INDEX "battles_p2_idx" ON "battles" USING btree ("p2_id","created_at");