CREATE TYPE "public"."trade_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"offered_card_id" uuid NOT NULL,
	"requested_card_id" uuid NOT NULL,
	"status" "trade_status" DEFAULT 'pending' NOT NULL,
	"message" text
);
--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_offered_card_id_cards_id_fk" FOREIGN KEY ("offered_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_requested_card_id_cards_id_fk" FOREIGN KEY ("requested_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trades_from_status_idx" ON "trades" USING btree ("from_user_id","status");--> statement-breakpoint
CREATE INDEX "trades_to_status_idx" ON "trades" USING btree ("to_user_id","status");