const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123"; // change immediately in any non-local environment

async function makeUser({ name, email, role }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    // Demo accounts are pre-approved so the seed script produces a
    // working demo out of the box — VENDOR/RIDER self-registrations
    // outside this script still land pending, per auth.routes.js.
    create: { name, email, role, passwordHash, approved: true },
  });
}

async function main() {
  console.log("Seeding demo accounts + vendors...");

  const customer = await makeUser({ name: "Ada Customer", email: "customer@demo.route", role: "CUSTOMER" });
  const admin = await makeUser({ name: "Admin", email: "admin@demo.route", role: "ADMIN" });
  const manager = await makeUser({ name: "Amaka O.", email: "manager@demo.route", role: "MANAGER" });

  const riderUser = await makeUser({ name: "Tunde A.", email: "rider@demo.route", role: "RIDER" });
  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: { userId: riderUser.id, zone: "Arepo/Axis", isOnline: true },
  });

  // --- Local Market: manager-run, no vendor owner (per product spec) ---
  const localMarket = await prisma.vendor.upsert({
    where: { managerId: manager.id },
    update: {},
    create: {
      managerId: manager.id,
      name: "Arepo Fresh Market", area: "Arepo", category: "Local Market", eta: "40–55 min", emoji: "🥬",
    },
  });
  const localMarketProducts = [
    { name: "Tomatoes (Basket)", price: 4500, emoji: "🍅", subcategory: "Peppers" },
    { name: "Frozen Chicken (Whole)", price: 5500, emoji: "🐔", subcategory: "Frozen Food" },
    { name: "Crate of Eggs (30pcs)", price: 3300, emoji: "🥚", subcategory: "Eggs" },
    { name: "Ugu Leaves (Bag)", price: 1200, emoji: "🥬", subcategory: "Soup Ingredients" },
  ];
  for (const p of localMarketProducts) {
    const existing = await prisma.product.findFirst({ where: { vendorId: localMarket.id, name: p.name } });
    if (!existing) await prisma.product.create({ data: { vendorId: localMarket.id, ...p } });
  }

  // --- Vendors ---
  const vendorConfigs = [
    {
      email: "mamarisi@demo.route", name: "Mama Risi (Owner)",
      vendor: { name: "Mama Risi Kitchen", area: "Arepo", category: "Restaurant", eta: "25–35 min", emoji: "🍛" },
      products: [
        { name: "Jollof Rice & Chicken", price: 2500, emoji: "🍛", addOns: [
          { name: "Fried Plantain", price: 500 }, { name: "Salad / Coleslaw", price: 400 },
          { name: "Spaghetti", price: 600 }, { name: "Boiled Egg", price: 300 },
        ] },
        { name: "Efo Riro & Swallow", price: 2200, emoji: "🥘", addOns: [
          { name: "Extra Fried Fish", price: 900 }, { name: "Extra Swallow", price: 500 },
        ] },
        { name: "Peppered Turkey (Plate)", price: 3000, emoji: "🍗" },
      ],
    },
    {
      email: "axisgrill@demo.route", name: "Axis Grill (Owner)",
      vendor: { name: "Axis Grill House", area: "Axis", category: "Grills", eta: "30–40 min", emoji: "🍢" },
      products: [
        { name: "Suya Platter", price: 3500, emoji: "🍢" },
        { name: "Grilled Fish & Plantain", price: 4000, emoji: "🐟" },
      ],
    },
    {
      email: "quickbasket@demo.route", name: "QuickBasket (Owner)",
      vendor: { name: "QuickBasket Supermarket", area: "Axis", category: "Supermarket", eta: "20–30 min", emoji: "🛒" },
      products: [
        { name: "Rice (5kg Bag)", price: 6800, emoji: "🌾", subcategory: "Staples" },
        { name: "Omo Detergent (1kg)", price: 1200, emoji: "🧺", subcategory: "Detergent" },
        { name: "Coca-Cola (35cl)", price: 350, emoji: "🥤", subcategory: "Soft Drinks" },
      ],
    },
    {
      email: "pharmacy@demo.route", name: "Health Pharmacy (Owner)",
      vendor: { name: "Arepo Health Pharmacy", area: "Arepo", category: "Pharmacy", eta: "20–30 min", emoji: "💊" },
      products: [
        { name: "Paracetamol Tablets (Pack)", price: 800, emoji: "💊", subcategory: "Pain Relief" },
        { name: "Vitamin C Tablets", price: 1200, emoji: "🍊", subcategory: "Vitamins & Supplements" },
      ],
    },
  ];

  for (const cfg of vendorConfigs) {
    const owner = await makeUser({ name: cfg.name, email: cfg.email, role: "VENDOR" });
    const vendor = await prisma.vendor.upsert({
      where: { ownerId: owner.id },
      update: {},
      create: { ownerId: owner.id, ...cfg.vendor },
    });

    for (const p of cfg.products) {
      const existing = await prisma.product.findFirst({ where: { vendorId: vendor.id, name: p.name } });
      if (existing) continue;
      await prisma.product.create({
        data: {
          vendorId: vendor.id,
          name: p.name,
          price: p.price,
          emoji: p.emoji,
          subcategory: p.subcategory,
          addOns: p.addOns ? { create: p.addOns } : undefined,
        },
      });
    }
  }

  console.log("Done. Demo login for every account: password = 'password123'");
  console.log("Try: customer@demo.route / mamarisi@demo.route / rider@demo.route / manager@demo.route (Local Market) / admin@demo.route");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
