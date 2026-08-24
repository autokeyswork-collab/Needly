CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "flow" TEXT NOT NULL DEFAULT 'BUY',
  "description" TEXT,
  "icon" TEXT,
  "imageKey" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

INSERT INTO "Category" (
  "id", "key", "label", "flow", "description", "icon", "imageKey", "position", "active", "location", "updatedAt"
) VALUES
  ('cat-local-market', 'Local Market', 'Open Market', 'BUY', 'Fresh local market sellers', 'basket', 'Local Market', 1, true, 'Abeokuta', NOW()),
  ('cat-restaurant', 'Restaurant', 'Food', 'BUY', 'Restaurants and food vendors', 'food', 'Restaurant', 2, true, 'Abeokuta', NOW()),
  ('cat-auto', 'Auto', 'Auto', 'BOOK', 'Mechanics, car wash and auto support', 'car', 'Auto', 3, true, 'Abeokuta', NOW()),
  ('cat-home-services', 'Home Services', 'Home Services', 'BOOK', 'Cleaners, laundry and repairs', 'home-service', 'Home Services', 4, true, 'Abeokuta', NOW()),
  ('cat-pharmacy', 'Pharmacy', 'Health', 'BUY', 'Pharmacies and medical supplies', 'medicine', 'Pharmacy', 5, true, 'Abeokuta', NOW()),
  ('cat-services', 'Services', 'Services', 'BOOK', 'Book verified service providers', 'tools', 'Services', 6, true, 'Abeokuta', NOW()),
  ('cat-stay-dine', 'Stay & Dine', 'Stay & Dine', 'RESERVE', 'Hotels, restaurants and reservations', 'hotel', 'Stay & Dine', 7, true, 'Abeokuta', NOW()),
  ('cat-learn', 'Learn', 'Learn', 'BOOK', 'Tutors and learning providers', 'learn', 'Learn', 8, true, 'Abeokuta', NOW()),
  ('cat-utilities', 'Utilities', 'Utilities', 'BOOK', 'Gas, water and utility services', 'utility', 'Utilities', 9, true, 'Abeokuta', NOW()),
  ('cat-supermarket', 'Supermarket', 'Shop', 'BUY', 'Everyday groceries and essentials', 'shopping-bag', 'Supermarket', 10, true, 'Abeokuta', NOW()),
  ('cat-grills', 'Grills', 'Grills', 'BUY', 'Grilled food vendors', 'grill', 'Grills', 11, true, 'Abeokuta', NOW())
ON CONFLICT ("key") DO NOTHING;
