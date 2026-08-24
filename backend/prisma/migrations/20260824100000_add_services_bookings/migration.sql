CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "description" TEXT,
  "emoji" TEXT NOT NULL DEFAULT '🛠️',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "address" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_customerId_fkey') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_serviceId_fkey') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_serviceId_idx" ON "Booking"("serviceId");
