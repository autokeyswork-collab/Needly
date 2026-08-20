const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

async function makeUser({ name, email, role }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash, approved: true },
  });
}

async function main() {
  console.log("Seeding demo accounts + Needly vendors...");

  await prisma.vendor.deleteMany({
    where: {
      orders: { none: {} },
    },
  });

  const superAdmin = await makeUser({ name: "Super Admin", email: "superadmin@demo.needly", role: "SUPER_ADMIN" });
  const customer = await makeUser({ name: "Ada Customer", email: "customer@demo.needly", role: "CUSTOMER" });
  const admin = await makeUser({ name: "Admin", email: "admin@demo.needly", role: "ADMIN" });
  const manager = await makeUser({ name: "Amaka O.", email: "manager@demo.needly", role: "MANAGER" });

  const riderUser = await makeUser({ name: "Tunde A.", email: "rider@demo.needly", role: "RIDER" });
  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: { zone: "Abeokuta", latitude: 7.1518, longitude: 3.3489 },
    create: { userId: riderUser.id, zone: "Abeokuta", isOnline: true, latitude: 7.1518, longitude: 3.3489 },
  });

  // --- Local Market Hub ---
  const localMarket = await prisma.vendor.upsert({
    where: { managerId: manager.id },
    update: {
      name: "Kuto Fresh Market", area: "Kuto", category: "Local Market", eta: "35–50 min", emoji: "🥬",
      address: "Kuto Market, Abeokuta", latitude: 7.1488, longitude: 3.3515,
    },
    create: {
      managerId: manager.id,
      name: "Kuto Fresh Market", area: "Kuto", category: "Local Market", eta: "35–50 min", emoji: "🥬",
      address: "Kuto Market, Abeokuta", latitude: 7.1488, longitude: 3.3515,
    },
  });
  const localMarketProducts = [
    { name: "Tomatoes (Basket)", price: 4500, emoji: "🍅", subcategory: "Peppers & Vegetables" },
    { name: "Scotch Bonnet Pepper (Bag)", price: 3200, emoji: "🌶️", subcategory: "Peppers & Vegetables" },
    { name: "Yam Tuber (Large)", price: 2500, emoji: "🍠", subcategory: "Tubers & Grains" },
    { name: "White Garri (5kg Bag)", price: 2800, emoji: "🌾", subcategory: "Tubers & Grains" },
    { name: "Frozen Chicken (Whole)", price: 5500, emoji: "🐔", subcategory: "Meat & Poultry" },
    { name: "Crate of Eggs (30pcs)", price: 3300, emoji: "🥚", subcategory: "Eggs" },
    { name: "Fresh Ugu Leaves (Bag)", price: 1200, emoji: "🥬", subcategory: "Peppers & Vegetables" },
  ];
  for (const p of localMarketProducts) {
    const existing = await prisma.product.findFirst({ where: { vendorId: localMarket.id, name: p.name } });
    if (!existing) await prisma.product.create({ data: { vendorId: localMarket.id, ...p } });
  }

  // --- Abeokuta Vendor Roster ---
  const vendorConfigs = [
    {
      email: "surulere@demo.needly", name: "Surulere Canteen (Owner)",
      vendor: { name: "Surulere Food Canteen", area: "Ita Eko", category: "Restaurant", eta: "20–35 min", emoji: "🍲", address: "Ita Eko Junction, Abeokuta", latitude: 7.1580, longitude: 3.3490 },
      products: [
        { name: "Amala & Abula (Gbegiri + Ewedu) with Goat Meat", price: 2800, emoji: "🍲", subcategory: "Swallow & Soup" },
        { name: "Amala & Ogun Ogun Assorted Meat", price: 3200, emoji: "🍲", subcategory: "Swallow & Soup" },
        { name: "Eba & Egusi Soup with Beef", price: 2500, emoji: "🍲", subcategory: "Swallow & Soup" },
        { name: "Fried Fish Portion (Huge)", price: 1500, emoji: "🐟", subcategory: "Proteins" },
      ],
    },
    {
      email: "mamarisi@demo.needly", name: "Mama Risi (Owner)",
      vendor: { name: "Mama Risi Kitchen", area: "Adigbe", category: "Restaurant", eta: "25–35 min", emoji: "🍲", address: "Adigbe Road, Abeokuta", latitude: 7.1784, longitude: 3.4024 },
      products: [
        { name: "Jollof Rice & Chicken", price: 2500, emoji: "🍛", subcategory: "Rice Dishes", addOns: [
          { name: "Fried Plantain", price: 500 }, { name: "Salad / Coleslaw", price: 400 },
          { name: "Spaghetti", price: 600 }, { name: "Boiled Egg", price: 300 },
        ] },
        { name: "Efo Riro & Swallow", price: 2200, emoji: "🍲", subcategory: "Swallow & Soup" },
        { name: "Peppered Turkey (Plate)", price: 3000, emoji: "🍗" },
      ],
    },
    {
      email: "yellowcity@demo.needly", name: "Yellow City (Owner)",
      vendor: { name: "Yellow City Bukka", area: "Panseke", category: "Restaurant", eta: "25–35 min", emoji: "🍛", address: "Panseke Commercial Hub, Abeokuta", latitude: 7.1583, longitude: 3.3658 },
      products: [
        { name: "Classic Jollof Rice & Fried Chicken", price: 2600, emoji: "🍛", subcategory: "Rice Dishes" },
        { name: "Special Fried Rice & Turkey Wing", price: 3000, emoji: "🍗", subcategory: "Rice Dishes" },
        { name: "Peppered Asun Portion", price: 2200, emoji: "🍢", subcategory: "Proteins" },
      ],
    },
    {
      email: "ofada@demo.needly", name: "Ofada Spot (Owner)",
      vendor: { name: "Ofada Rice Spot", area: "Ibara", category: "Restaurant", eta: "20–30 min", emoji: "🍃", address: "Ibara Housing Estate Road, Abeokuta", latitude: 7.1510, longitude: 3.3520 },
      products: [
        { name: "Special Leaf Ofada Rice & Ayamase Sauce", price: 3200, emoji: "🍛", subcategory: "Ofada Specials" },
        { name: "Ofada Rice with Boiled Egg & Dodo", price: 2800, emoji: "🍃", subcategory: "Ofada Specials" },
      ],
    },
    {
      email: "justrite@demo.needly", name: "Justrite (Owner)",
      vendor: { name: "Justrite Supermarket", area: "Oke-Ilewo", category: "Supermarket", eta: "20–30 min", emoji: "🛒", address: "Lalubu Street, Oke-Ilewo, Abeokuta", latitude: 7.1545, longitude: 3.3550 },
      products: [
        { name: "Mama Gold Rice (5kg Bag)", price: 7200, emoji: "🌾", subcategory: "Staples" },
        { name: "Kings Vegetable Oil (2L)", price: 5400, emoji: "🛢️", subcategory: "Staples" },
        { name: "Peak Full Cream Milk (Carton 1L)", price: 1650, emoji: "🥛", subcategory: "Dairy & Beverages" },
        { name: "Milo Chocolate Drink (400g)", price: 2400, emoji: "☕", subcategory: "Dairy & Beverages" },
      ],
    },
    {
      email: "foodco@demo.needly", name: "Foodco (Owner)",
      vendor: { name: "Foodco Supermarket & Bakery", area: "Oke-Ilewo", category: "Supermarket", eta: "20–30 min", emoji: "🛍️", address: "Oke-Ilewo Main Road, Abeokuta", latitude: 7.1557, longitude: 3.3539 },
      products: [
        { name: "Fresh Foodco Loaf Bread", price: 1200, emoji: "🍞", subcategory: "Bakery" },
        { name: "Kellogg's Cornflakes (375g)", price: 2100, emoji: "🥣", subcategory: "Breakfast" },
      ],
    },
    {
      email: "pansekesuya@demo.needly", name: "Panseke Suya (Owner)",
      vendor: { name: "Panseke Suya & BBQ Hub", area: "Panseke", category: "Grills", eta: "30–40 min", emoji: "🍢", address: "Panseke Flyover Junction, Abeokuta", latitude: 7.1583, longitude: 3.3658 },
      products: [
        { name: "Special Beef Suya Platter", price: 3500, emoji: "🍢", subcategory: "Suya" },
        { name: "Chicken Suya (Whole Quarter)", price: 2800, emoji: "🍗", subcategory: "Suya" },
        { name: "Spicy Asun Goat Meat Portion", price: 3000, emoji: "🔥", subcategory: "Asun & BBQ" },
      ],
    },
    {
      email: "justritepharm@demo.needly", name: "Justrite Pharmacy (Owner)",
      vendor: { name: "Justrite Pharmacy", area: "Oke-Ilewo", category: "Pharmacy", eta: "20–30 min", emoji: "💊", address: "Lalubu Street, Oke-Ilewo, Abeokuta", latitude: 7.1539, longitude: 3.3568 },
      products: [
        { name: "Paracetamol Extra Tablets (Pack)", price: 850, emoji: "💊", subcategory: "Pain Relief" },
        { name: "Vitamin C 1000mg Effervescent", price: 2400, emoji: "🍊", subcategory: "Vitamins" },
      ],
    },
    {
      email: "greenlegacy@demo.needly", name: "Green Legacy (Owner)",
      vendor: { name: "Green Legacy Resort Restaurant", area: "Hilltop", category: "Stay & Dine", eta: "30–45 min", emoji: "🏨", address: "Olusegun Obasanjo Presidential Library (OOPL), Hilltop, Abeokuta", latitude: 7.1420, longitude: 3.3600 },
      products: [
        { name: "Executive Sunday Buffet Pass", price: 12000, emoji: "🍽️", subcategory: "Buffet & Dining" },
        { name: "Grilled Croaker Fish & French Fries", price: 7500, emoji: "🐟", subcategory: "Mains" },
      ],
    },
  ];

  for (const cfg of vendorConfigs) {
    const owner = await makeUser({ name: cfg.name, email: cfg.email, role: "VENDOR" });
    const vendor = await prisma.vendor.upsert({
      where: { ownerId: owner.id },
      update: cfg.vendor,
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

  console.log("Seeding complete! Abeokuta vendors populated cleanly.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
