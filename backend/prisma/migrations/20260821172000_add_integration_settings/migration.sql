CREATE TABLE "IntegrationSetting" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "isSecret" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationSetting_provider_key_key" ON "IntegrationSetting"("provider", "key");
