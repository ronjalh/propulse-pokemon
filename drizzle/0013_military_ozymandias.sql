ALTER TABLE "battles" ADD COLUMN "phase" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
CREATE INDEX "battles_p2_phase_idx" ON "battles" USING btree ("p2_id","phase");