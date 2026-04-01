-- Run this after initial prisma migrate to add bilingual full-text search

-- Enable unaccent extension for better RU/EN search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add generated searchVector column (bilingual EN + RU)
ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(description, '')), 'B')
  ) STORED;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS listing_search_idx
  ON "Listing" USING GIN ("searchVector");

-- Geo search helper function (Haversine)
CREATE OR REPLACE FUNCTION listings_within_radius(
  p_lat FLOAT,
  p_lng FLOAT,
  p_radius_km FLOAT
)
RETURNS TABLE (id TEXT, distance_km FLOAT) AS $$
  SELECT
    id,
    6371 * acos(
      cos(radians(p_lat)) * cos(radians(lat)) *
      cos(radians(lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(lat))
    ) AS distance_km
  FROM "Listing"
  WHERE lat IS NOT NULL AND lng IS NOT NULL
    AND "deletedAt" IS NULL
    AND "isPublished" = true
  HAVING 6371 * acos(
    cos(radians(p_lat)) * cos(radians(lat)) *
    cos(radians(lng) - radians(p_lng)) +
    sin(radians(p_lat)) * sin(radians(lat))
  ) <= p_radius_km
  ORDER BY distance_km;
$$ LANGUAGE sql STABLE;
