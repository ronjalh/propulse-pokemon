CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"owner_id" text,
	"is_shiny" boolean DEFAULT false NOT NULL,
	"ivs" jsonb NOT NULL,
	"move_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pulled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_owner_idx" ON "cards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cards_person_idx" ON "cards" USING btree ("person_id");