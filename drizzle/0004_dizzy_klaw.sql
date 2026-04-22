CREATE TYPE "public"."transaction_kind" AS ENUM('credits_earn', 'credits_spend', 'card_acquire', 'card_transfer', 'card_consumed');--> statement-breakpoint
CREATE TABLE "transaction_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"amount" integer,
	"card_id" uuid,
	"related_battle_id" uuid,
	"reason" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_log" ADD CONSTRAINT "transaction_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_log" ADD CONSTRAINT "transaction_log_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tx_user_at_idx" ON "transaction_log" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "tx_kind_idx" ON "transaction_log" USING btree ("kind");