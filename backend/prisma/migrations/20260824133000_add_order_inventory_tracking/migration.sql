ALTER TABLE "Order" ADD COLUMN "inventoryReleasedAt" TIMESTAMP(3);

ALTER TABLE "OrderItem" ADD COLUMN "productId" TEXT;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
