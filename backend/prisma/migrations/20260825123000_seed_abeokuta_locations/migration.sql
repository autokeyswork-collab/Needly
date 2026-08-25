CREATE TABLE IF NOT EXISTS "Location" (
  "id" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'Ogun',
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CITY',
  "parentId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deliveryFee" INTEGER NOT NULL DEFAULT 500,
  "maxDistance" INTEGER NOT NULL DEFAULT 25,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'Ogun';

INSERT INTO "Location" ("id", "state", "name", "type", "active", "deliveryFee", "maxDistance", "createdAt") VALUES
  ('ogun-abeokuta', 'Ogun', 'Abeokuta', 'CITY', true, 500, 25, NOW()),
  ('abeokuta-kuto', 'Ogun', 'Kuto', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-panseke', 'Ogun', 'Panseke', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-lafenwa', 'Ogun', 'Lafenwa', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-adatan', 'Ogun', 'Adatan', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-asero', 'Ogun', 'Asero', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-obantoko', 'Ogun', 'Obantoko', 'AREA', true, 700, 16, NOW()),
  ('abeokuta-camp', 'Ogun', 'Camp', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-sapon', 'Ogun', 'Sapon', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-oke-ilewo', 'Ogun', 'Oke-Ilewo', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-ibara', 'Ogun', 'Ibara', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-ita-eko', 'Ogun', 'Ita-Eko', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-omida', 'Ogun', 'Omida', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-isale-igbein', 'Ogun', 'Isale-Igbein', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-oke-mosan', 'Ogun', 'Oke-Mosan', 'AREA', true, 700, 16, NOW()),
  ('abeokuta-eleweran', 'Ogun', 'Eleweran', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-onikolobo', 'Ogun', 'Onikolobo', 'AREA', true, 500, 12, NOW()),
  ('abeokuta-rounder', 'Ogun', 'Rounder', 'AREA', true, 700, 16, NOW()),
  ('abeokuta-quarry-road', 'Ogun', 'Quarry Road', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-idi-aba', 'Ogun', 'Idi-Aba', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-abiola-way', 'Ogun', 'Abiola Way', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-olomore', 'Ogun', 'Olomore', 'AREA', true, 600, 14, NOW()),
  ('abeokuta-kobape', 'Ogun', 'Kobape', 'AREA', true, 900, 22, NOW()),
  ('abeokuta-laderin', 'Ogun', 'Laderin', 'AREA', true, 700, 16, NOW()),
  ('abeokuta-olorunsogo', 'Ogun', 'Olorunsogo', 'AREA', true, 600, 14, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "state" = EXCLUDED."state",
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "active" = EXCLUDED."active",
  "deliveryFee" = EXCLUDED."deliveryFee",
  "maxDistance" = EXCLUDED."maxDistance";
