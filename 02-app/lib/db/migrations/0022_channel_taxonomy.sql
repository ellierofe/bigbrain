-- DNA-07b: Channel taxonomy consolidation
-- Adds category + channel to dna_platforms, makes platform_type nullable,
-- backfills ToV format_type vocabulary on existing samples + applications.
-- Single atomic migration. See 04-documentation/reference/channel-taxonomy.md.

-- 1. dna_platforms: drop NOT NULL on deprecated platform_type
ALTER TABLE "dna_platforms" ALTER COLUMN "platform_type" DROP NOT NULL;--> statement-breakpoint

-- 2. dna_platforms: add new columns nullable first so existing rows don't fail
ALTER TABLE "dna_platforms" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "dna_platforms" ADD COLUMN "channel" varchar(50);--> statement-breakpoint

-- 3. dna_platforms: backfill existing rows
--    Live data: 2 Atomic Lounge rows, both platform_type='owned_content' → blog
UPDATE "dna_platforms"
SET "category" = 'owned_content',
    "channel"  = 'blog'
WHERE "category" IS NULL;--> statement-breakpoint

-- 4. dna_platforms: apply NOT NULL constraints after backfill (matches Drizzle schema)
ALTER TABLE "dna_platforms" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dna_platforms" ALTER COLUMN "channel" SET NOT NULL;--> statement-breakpoint

-- 5. dna_tov_samples: format_type vocabulary alignment
--    6 social/linkedin_post → 'social_short'; 8 blog/entertainment_blog stay 'blog' (no-op)
UPDATE "dna_tov_samples" SET "format_type" = 'social_short' WHERE "format_type" = 'social';--> statement-breakpoint
UPDATE "dna_tov_samples" SET "format_type" = 'spoken_audio' WHERE "format_type" = 'spoken';--> statement-breakpoint

-- 6. dna_tov_applications: format_type vocabulary alignment
--    1 social/linkedin_post → 'social_short'
UPDATE "dna_tov_applications" SET "format_type" = 'social_short' WHERE "format_type" = 'social';--> statement-breakpoint
UPDATE "dna_tov_applications" SET "format_type" = 'spoken_audio' WHERE "format_type" = 'spoken';
