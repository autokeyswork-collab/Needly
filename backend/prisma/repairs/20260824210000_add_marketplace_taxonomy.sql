ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "image" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerImage" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CATEGORY',
  ADD COLUMN IF NOT EXISTS "parentId" TEXT,
  ADD COLUMN IF NOT EXISTS "divisionId" TEXT,
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showOnHomepage" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "customFields" JSONB,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "Category"
SET
  "slug" = CASE
    WHEN "type" = 'DIVISION' THEN COALESCE("slug", lower(regexp_replace("key", '[^a-zA-Z0-9]+', '-', 'g')))
    WHEN "key" IN ('Auto', 'Home Services', 'Services', 'Learn', 'Utilities') THEN 'services/' || lower(regexp_replace("key", '[^a-zA-Z0-9]+', '-', 'g'))
    WHEN "key" IN ('Stay & Dine') THEN 'rentals/' || lower(regexp_replace("key", '[^a-zA-Z0-9]+', '-', 'g'))
    ELSE COALESCE("slug", 'open-market/' || lower(regexp_replace("key", '[^a-zA-Z0-9]+', '-', 'g')))
  END,
  "type" = COALESCE("type", 'CATEGORY'),
  "showOnHomepage" = COALESCE("showOnHomepage", true),
  "isFeatured" = COALESCE("isFeatured", false),
  "updatedAt" = NOW();

WITH ranked AS (
  SELECT "id", "slug", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS rn
  FROM "Category"
  WHERE "slug" IS NOT NULL
)
UPDATE "Category" c
SET "slug" = c."slug" || '-' || c."id"
FROM ranked r
WHERE c."id" = r."id" AND r.rn > 1;

WITH reserved_seed_slugs("id", "key", "slug") AS (
  VALUES
    ('div-open-market', 'open-market', 'open-market'),
    ('div-services', 'services', 'services'),
    ('div-rentals', 'rentals', 'rentals'),
    ('div-jobs-gigs', 'jobs-gigs', 'jobs-gigs'),
    ('cat-open-electronics', 'open-market-electronics', 'open-market/electronics'),
    ('cat-open-fashion', 'open-market-fashion', 'open-market/fashion'),
    ('cat-open-home-living', 'open-market-home-living', 'open-market/home-living'),
    ('cat-open-food-groceries', 'open-market-food-groceries', 'open-market/food-groceries'),
    ('cat-open-beauty', 'open-market-beauty-personal-care', 'open-market/beauty-personal-care'),
    ('cat-open-agriculture', 'open-market-agriculture', 'open-market/agriculture'),
    ('cat-services-home', 'services-home-services', 'services/home-services'),
    ('cat-services-auto', 'services-automotive', 'services/automotive'),
    ('cat-services-digital', 'services-technology-digital', 'services/technology-digital'),
    ('cat-services-professional', 'services-professional', 'services/professional-services'),
    ('cat-services-education', 'services-education-training', 'services/education-training'),
    ('cat-rentals-vehicles', 'rentals-vehicles', 'rentals/vehicles'),
    ('cat-rentals-property', 'rentals-property', 'rentals/property'),
    ('cat-rentals-equipment', 'rentals-equipment', 'rentals/equipment'),
    ('cat-jobs-technology', 'jobs-gigs-technology', 'jobs-gigs/technology'),
    ('cat-jobs-delivery', 'jobs-gigs-delivery-logistics', 'jobs-gigs/delivery-logistics'),
    ('cat-jobs-creative', 'jobs-gigs-creative', 'jobs-gigs/creative'),
    ('cat-jobs-construction', 'jobs-gigs-construction', 'jobs-gigs/construction')
)
UPDATE "Category" c
SET "slug" = c."slug" || '-legacy-' || substr(md5(c."id"), 1, 8),
    "updatedAt" = NOW()
FROM reserved_seed_slugs seed
WHERE c."slug" = seed."slug"
  AND c."id" <> seed."id"
  AND c."key" <> seed."key";

INSERT INTO "Category" (
  "id", "key", "label", "slug", "flow", "description", "icon", "imageKey", "type", "position", "active", "location", "isFeatured", "showOnHomepage", "updatedAt"
) VALUES
  ('div-open-market', 'open-market', 'Open Market', 'open-market', 'BUY', 'Buy and sell physical products from local vendors.', 'basket', 'Local Market', 'DIVISION', 1, true, 'Abeokuta', true, true, NOW()),
  ('div-services', 'services', 'Services', 'services', 'BOOK', 'Book trusted people to perform services.', 'tools', 'Services', 'DIVISION', 2, true, 'Abeokuta', true, true, NOW()),
  ('div-rentals', 'rentals', 'Rentals', 'rentals', 'RESERVE', 'Rent vehicles, properties, equipment and event items.', 'home', 'Rentals', 'DIVISION', 3, true, 'Abeokuta', true, true, NOW()),
  ('div-jobs-gigs', 'jobs-gigs', 'Jobs & Gigs', 'jobs-gigs', 'BOOK', 'Find employment, freelance work and task-based opportunities.', 'briefcase', 'Jobs', 'DIVISION', 4, true, 'Abeokuta', true, true, NOW())
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "slug" = EXCLUDED."slug",
  "flow" = EXCLUDED."flow",
  "description" = EXCLUDED."description",
  "icon" = EXCLUDED."icon",
  "imageKey" = EXCLUDED."imageKey",
  "type" = EXCLUDED."type",
  "position" = EXCLUDED."position",
  "active" = EXCLUDED."active",
  "location" = EXCLUDED."location",
  "isFeatured" = EXCLUDED."isFeatured",
  "showOnHomepage" = EXCLUDED."showOnHomepage",
  "updatedAt" = NOW();

INSERT INTO "Category" (
  "id", "key", "label", "slug", "flow", "description", "icon", "imageKey", "type", "parentId", "divisionId", "position", "active", "location", "isFeatured", "showOnHomepage", "customFields", "updatedAt"
) VALUES
  ('cat-open-electronics', 'open-market-electronics', 'Electronics', 'open-market/electronics', 'BUY', 'Phones, laptops, TVs and everyday gadgets.', 'phone', 'Electronics', 'CATEGORY', 'div-open-market', 'div-open-market', 1, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-open-fashion', 'open-market-fashion', 'Fashion', 'open-market/fashion', 'BUY', 'Clothing, shoes, bags and accessories.', 'shirt', 'Fashion', 'CATEGORY', 'div-open-market', 'div-open-market', 2, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-open-home-living', 'open-market-home-living', 'Home & Living', 'open-market/home-living', 'BUY', 'Furniture, homeware and daily household needs.', 'home', 'Home Services', 'CATEGORY', 'div-open-market', 'div-open-market', 3, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-open-food-groceries', 'open-market-food-groceries', 'Food & Groceries', 'open-market/food-groceries', 'BUY', 'Fresh food, groceries and Abeokuta market produce.', 'basket', 'Local Market', 'CATEGORY', 'div-open-market', 'div-open-market', 4, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-open-beauty', 'open-market-beauty-personal-care', 'Beauty & Personal Care', 'open-market/beauty-personal-care', 'BUY', 'Beauty, health and personal care products.', 'sparkles', 'Pharmacy', 'CATEGORY', 'div-open-market', 'div-open-market', 5, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-open-agriculture', 'open-market-agriculture', 'Agriculture', 'open-market/agriculture', 'BUY', 'Farm produce, livestock inputs and farm equipment.', 'leaf', 'Local Market', 'CATEGORY', 'div-open-market', 'div-open-market', 6, true, 'Abeokuta', false, true, '[]'::jsonb, NOW()),
  ('cat-services-home', 'services-home-services', 'Home Services', 'services/home-services', 'BOOK', 'Cleaning, plumbing, electrical, laundry and repairs.', 'tools', 'Home Services', 'CATEGORY', 'div-services', 'div-services', 1, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-services-auto', 'services-automotive', 'Automotive', 'services/automotive', 'BOOK', 'Mechanics, car wash, vulcanizers and drivers.', 'car', 'Auto', 'CATEGORY', 'div-services', 'div-services', 2, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-services-digital', 'services-technology-digital', 'Technology & Digital', 'services/technology-digital', 'BOOK', 'Web, design, repairs and digital support.', 'laptop', 'Learn', 'CATEGORY', 'div-services', 'div-services', 3, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-services-professional', 'services-professional', 'Professional Services', 'services/professional-services', 'BOOK', 'Legal, accounting, consulting and business services.', 'briefcase', 'Services', 'CATEGORY', 'div-services', 'div-services', 4, true, 'Abeokuta', false, true, '[]'::jsonb, NOW()),
  ('cat-services-education', 'services-education-training', 'Education & Training', 'services/education-training', 'BOOK', 'Tutors, lessons and training providers.', 'graduation-cap', 'Learn', 'CATEGORY', 'div-services', 'div-services', 5, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-rentals-vehicles', 'rentals-vehicles', 'Vehicles', 'rentals/vehicles', 'RESERVE', 'Cars, buses, bikes and drivers for rent.', 'car', 'Auto', 'CATEGORY', 'div-rentals', 'div-rentals', 1, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-rentals-property', 'rentals-property', 'Property', 'rentals/property', 'RESERVE', 'Homes, shops, halls and short stays.', 'building', 'Stay & Dine', 'CATEGORY', 'div-rentals', 'div-rentals', 2, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-rentals-equipment', 'rentals-equipment', 'Equipment', 'rentals/equipment', 'RESERVE', 'Work tools, event equipment and machines.', 'wrench', 'Services', 'CATEGORY', 'div-rentals', 'div-rentals', 3, true, 'Abeokuta', false, true, '[]'::jsonb, NOW()),
  ('cat-jobs-technology', 'jobs-gigs-technology', 'Technology', 'jobs-gigs/technology', 'BOOK', 'Software, design, data and digital work.', 'laptop', 'Learn', 'CATEGORY', 'div-jobs-gigs', 'div-jobs-gigs', 1, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-jobs-delivery', 'jobs-gigs-delivery-logistics', 'Delivery & Logistics', 'jobs-gigs/delivery-logistics', 'BOOK', 'Riders, drivers and dispatch work.', 'bike', 'Utilities', 'CATEGORY', 'div-jobs-gigs', 'div-jobs-gigs', 2, true, 'Abeokuta', true, true, '[]'::jsonb, NOW()),
  ('cat-jobs-creative', 'jobs-gigs-creative', 'Creative', 'jobs-gigs/creative', 'BOOK', 'Media, design, photography and creative gigs.', 'camera', 'Services', 'CATEGORY', 'div-jobs-gigs', 'div-jobs-gigs', 3, true, 'Abeokuta', false, true, '[]'::jsonb, NOW()),
  ('cat-jobs-construction', 'jobs-gigs-construction', 'Construction', 'jobs-gigs/construction', 'BOOK', 'Skilled trades and construction tasks.', 'hammer', 'Home Services', 'CATEGORY', 'div-jobs-gigs', 'div-jobs-gigs', 4, true, 'Abeokuta', false, true, '[]'::jsonb, NOW())
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "slug" = EXCLUDED."slug",
  "flow" = EXCLUDED."flow",
  "description" = EXCLUDED."description",
  "icon" = EXCLUDED."icon",
  "imageKey" = EXCLUDED."imageKey",
  "type" = EXCLUDED."type",
  "parentId" = EXCLUDED."parentId",
  "divisionId" = EXCLUDED."divisionId",
  "position" = EXCLUDED."position",
  "active" = EXCLUDED."active",
  "location" = EXCLUDED."location",
  "isFeatured" = EXCLUDED."isFeatured",
  "showOnHomepage" = EXCLUDED."showOnHomepage",
  "updatedAt" = NOW();

UPDATE "Category"
SET
  "divisionId" = CASE
    WHEN "divisionId" IS NOT NULL THEN "divisionId"
    WHEN "key" IN ('Local Market', 'Restaurant', 'Pharmacy', 'Supermarket', 'Grills') THEN 'div-open-market'
    WHEN "key" IN ('Auto', 'Home Services', 'Services', 'Learn', 'Utilities') THEN 'div-services'
    WHEN "key" IN ('Stay & Dine') THEN 'div-rentals'
    ELSE "divisionId"
  END,
  "parentId" = CASE
    WHEN "parentId" IS NOT NULL THEN "parentId"
    WHEN "key" IN ('Local Market', 'Restaurant', 'Pharmacy', 'Supermarket', 'Grills') THEN 'div-open-market'
    WHEN "key" IN ('Auto', 'Home Services', 'Services', 'Learn', 'Utilities') THEN 'div-services'
    WHEN "key" IN ('Stay & Dine') THEN 'div-rentals'
    ELSE "parentId"
  END,
  "isFeatured" = CASE WHEN "position" <= 10 THEN true ELSE "isFeatured" END,
  "showOnHomepage" = true,
  "updatedAt" = NOW()
WHERE "type" <> 'DIVISION';

UPDATE "Category" child
SET "parentId" = NULL
WHERE "parentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Category" parent WHERE parent."id" = child."parentId");

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Category_divisionId_idx" ON "Category"("divisionId");
CREATE INDEX IF NOT EXISTS "Category_type_active_position_idx" ON "Category"("type", "active", "position");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Category_parentId_fkey'
      AND table_name = 'Category'
  ) THEN
    ALTER TABLE "Category"
      ADD CONSTRAINT "Category_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
