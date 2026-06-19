-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('STAY', 'SALE', 'EXPERIENCE', 'SERVICE');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "kind" "ListingKind" NOT NULL DEFAULT 'SERVICE';

-- Backfill existing rows from category + listingType
-- (keep in sync with deriveListingKind() in src/modules/listings/listing-kind.util.ts)
UPDATE "Listing" l SET "kind" = (CASE
  WHEN c.slug IN ('real-estate', 'apartments', 'villas') AND l."listingType" = 'buy' THEN 'SALE'
  WHEN c.slug IN ('real-estate', 'apartments', 'villas') THEN 'STAY'
  WHEN c.slug = 'excursions' THEN 'EXPERIENCE'
  ELSE 'SERVICE'
END)::"ListingKind"
FROM "Category" c
WHERE l."categoryId" = c.id;
