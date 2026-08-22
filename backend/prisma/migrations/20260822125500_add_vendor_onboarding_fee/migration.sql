ALTER TABLE "Vendor"
ADD COLUMN "onboardingFeeAmount" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN "onboardingFeeStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "onboardingPaymentReference" TEXT,
ADD COLUMN "onboardingPaidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Vendor_onboardingPaymentReference_key" ON "Vendor"("onboardingPaymentReference");
