CREATE TABLE "person_learnset" (
	"person_id" uuid NOT NULL,
	"move_id" text NOT NULL,
	"is_tm" boolean DEFAULT false NOT NULL,
	"learned_at_level" integer,
	CONSTRAINT "person_learnset_person_id_move_id_pk" PRIMARY KEY("person_id","move_id")
);
--> statement-breakpoint
ALTER TABLE "person_learnset" ADD CONSTRAINT "person_learnset_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_learnset" ADD CONSTRAINT "person_learnset_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learnset_person_idx" ON "person_learnset" USING btree ("person_id");