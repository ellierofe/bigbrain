ALTER TABLE "dna_audience_segments" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "dna_audience_segments" DROP COLUMN "is_active";
