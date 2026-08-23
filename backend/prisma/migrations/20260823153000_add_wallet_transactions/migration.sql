CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "gateway" TEXT NOT NULL DEFAULT 'flutterwave',
  "gatewayTransactionId" TEXT,
  "providerReference" TEXT,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction"("reference");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
