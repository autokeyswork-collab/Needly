CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
  "discountValue" INTEGER NOT NULL,
  "minSpend" INTEGER NOT NULL DEFAULT 0,
  "usageLimit" INTEGER NOT NULL DEFAULT 100,
  "timesUsed" INTEGER NOT NULL DEFAULT 0,
  "placement" TEXT NOT NULL DEFAULT 'COUPON',
  "bannerImageUrl" TEXT,
  "bannerKicker" TEXT,
  "bannerTitle" TEXT,
  "bannerBody" TEXT,
  "bannerCta" TEXT,
  "bannerBadge" TEXT,
  "destinationCategory" TEXT,
  "location" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_code_key" ON "Promotion"("code");

ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "placement" TEXT NOT NULL DEFAULT 'COUPON';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerImageUrl" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerKicker" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerTitle" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerBody" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerCta" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerBadge" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "destinationCategory" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
