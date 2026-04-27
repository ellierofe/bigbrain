ALTER TABLE "dna_offers" ADD COLUMN "voc_mapping" jsonb;
ALTER TABLE "dna_offers" ADD COLUMN "customer_journey" jsonb;
ALTER TABLE "dna_offers" DROP COLUMN IF EXISTS "customer_journey_stage";
