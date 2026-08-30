ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENT';

CREATE TABLE IF NOT EXISTS "Hub" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT 'Abeokuta',
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Agent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hubId" TEXT,
  "zone" TEXT NOT NULL DEFAULT 'Abeokuta',
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bankName" TEXT,
  "bankAccountNumber" TEXT,
  "bankAccountName" TEXT,
  "idType" TEXT,
  "idNumber" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verificationNotes" TEXT,
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Agent_userId_key" ON "Agent"("userId");
CREATE INDEX IF NOT EXISTS "Agent_hubId_idx" ON "Agent"("hubId");
CREATE INDEX IF NOT EXISTS "Agent_zone_isOnline_idx" ON "Agent"("zone", "isOnline");
CREATE INDEX IF NOT EXISTS "Hub_area_active_idx" ON "Hub"("area", "active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Agent_userId_fkey'
      AND table_name = 'Agent'
  ) THEN
    ALTER TABLE "Agent"
      ADD CONSTRAINT "Agent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Agent_hubId_fkey'
      AND table_name = 'Agent'
  ) THEN
    ALTER TABLE "Agent"
      ADD CONSTRAINT "Agent_hubId_fkey"
      FOREIGN KEY ("hubId") REFERENCES "Hub"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "agentId" TEXT,
  ADD COLUMN IF NOT EXISTS "hubId" TEXT,
  ADD COLUMN IF NOT EXISTS "fulfillmentType" TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "agentPickupStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "agentPickedUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "hubReceivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_agentId_idx" ON "Order"("agentId");
CREATE INDEX IF NOT EXISTS "Order_hubId_idx" ON "Order"("hubId");
CREATE INDEX IF NOT EXISTS "Order_fulfillmentType_agentPickupStatus_idx" ON "Order"("fulfillmentType", "agentPickupStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Order_agentId_fkey'
      AND table_name = 'Order'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "Agent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Order_hubId_fkey'
      AND table_name = 'Order'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_hubId_fkey"
      FOREIGN KEY ("hubId") REFERENCES "Hub"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Hub" ("id", "name", "area", "address", "latitude", "longitude")
VALUES ('hub-abeokuta-main', 'Needly Abeokuta Hub', 'Abeokuta', 'Kuto, Abeokuta, Ogun State', 7.1475, 3.3619)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "area" = EXCLUDED."area",
  "address" = EXCLUDED."address",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
