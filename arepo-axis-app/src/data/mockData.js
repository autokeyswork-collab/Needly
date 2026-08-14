export const CATEGORIES = ["Restaurant", "Grills", "Supermarket", "Local Market", "Pharmacy"];

export const CATEGORY_TINT = {
  Restaurant: "#FFF1DA",
  Grills: "#FCE8E6",
  Supermarket: "#E7E9F1",
  "Local Market": "#E5F2E9",
  Pharmacy: "#E3F0F7",
};

export const INITIAL_VENDORS = [
  {
    id: "v1", name: "Mama Risi Kitchen", area: "Arepo", category: "Restaurant", eta: "25\u201335 min", rating: 4.7, emoji: "\uD83C\uDF5B",
    items: [
      { id: "p1", name: "Jollof Rice & Chicken", price: 2500, emoji: "\uD83C\uDF5B" },
      { id: "p2", name: "Efo Riro & Swallow", price: 2200, emoji: "\uD83C\uDF72" },
      { id: "p3", name: "Peppered Turkey (Plate)", price: 3000, emoji: "\uD83C\uDF57" },
    ],
  },
  {
    id: "v2", name: "Axis Grill House", area: "Axis", category: "Grills", eta: "30\u201340 min", rating: 4.5, emoji: "\uD83C\uDF62",
    items: [
      { id: "p4", name: "Suya Platter", price: 3500, emoji: "\uD83C\uDF62" },
      { id: "p5", name: "Grilled Fish & Plantain", price: 4000, emoji: "\uD83D\uDC1F" },
    ],
  },
  {
    id: "v3", name: "Arepo Fresh Market", area: "Arepo", category: "Local Market", eta: "40\u201355 min", rating: 4.6, emoji: "\uD83E\uDD6C",
    items: [
      { id: "p6", name: "Tomatoes (Basket)", price: 4500, emoji: "\uD83C\uDF45", subcategory: "Peppers" },
      { id: "p7", name: "Scotch Bonnet Pepper (Bag)", price: 3200, emoji: "\uD83C\uDF36\uFE0F", subcategory: "Peppers" },
      { id: "p30", name: "Tatashe Pepper (Bag)", price: 3000, emoji: "\uD83C\uDF36\uFE0F", subcategory: "Peppers" },
      { id: "p8", name: "Sweet Potatoes (5kg)", price: 3800, emoji: "\uD83C\uDF60", subcategory: "Tubers & Grains" },
      { id: "p31", name: "Yam Tuber", price: 2500, emoji: "\uD83C\uDF60", subcategory: "Tubers & Grains" },
      { id: "p32", name: "Garri (Bag)", price: 2800, emoji: "\uD83C\uDF3E", subcategory: "Tubers & Grains" },
      { id: "p33", name: "Frozen Chicken (Whole)", price: 5500, emoji: "\uD83D\uDC14", subcategory: "Frozen Food" },
      { id: "p34", name: "Frozen Turkey Wings", price: 4800, emoji: "\uD83C\uDF57", subcategory: "Frozen Food" },
      { id: "p35", name: "Frozen Titus Fish", price: 4200, emoji: "\uD83D\uDC1F", subcategory: "Frozen Food" },
      { id: "p36", name: "Crate of Eggs (30pcs)", price: 3300, emoji: "\uD83E\uDD5A", subcategory: "Eggs" },
      { id: "p37", name: "Half Crate of Eggs (15pcs)", price: 1750, emoji: "\uD83E\uDD5A", subcategory: "Eggs" },
      { id: "p38", name: "Ugu Leaves (Bag)", price: 1200, emoji: "\uD83E\uDD6C", subcategory: "Soup Ingredients" },
      { id: "p39", name: "Crayfish (Bag)", price: 2600, emoji: "\uD83E\uDD90", subcategory: "Soup Ingredients" },
      { id: "p40", name: "Stock Fish (Piece)", price: 3500, emoji: "\uD83D\uDC1F", subcategory: "Soup Ingredients" },
      { id: "p41", name: "Locust Beans - Iru (Bag)", price: 900, emoji: "\uD83E\uDED8", subcategory: "Soup Ingredients" },
    ],
  },
  {
    id: "v4", name: "QuickBasket Supermarket", area: "Axis", category: "Supermarket", eta: "20\u201330 min", rating: 4.8, emoji: "\uD83D\uDED2",
    items: [
      { id: "p9", name: "Rice (5kg Bag)", price: 6800, emoji: "\uD83C\uDF3E", subcategory: "Staples" },
      { id: "p10", name: "Vegetable Oil (2L)", price: 5200, emoji: "\uD83D\uDEE2\uFE0F", subcategory: "Staples" },
      { id: "p11", name: "Milk Carton (1L)", price: 1600, emoji: "\uD83E\uDD5B", subcategory: "Staples" },
      { id: "p17", name: "Omo Detergent (1kg)", price: 1200, emoji: "\uD83E\uDDFA", subcategory: "Detergent" },
      { id: "p18", name: "Ariel Powder (900g)", price: 1400, emoji: "\uD83E\uDDFC", subcategory: "Detergent" },
      { id: "p19", name: "Coca-Cola (35cl)", price: 350, emoji: "\uD83E\uDD64", subcategory: "Soft Drinks" },
      { id: "p20", name: "Fanta Bottle (50cl)", price: 450, emoji: "\uD83E\uDDC3", subcategory: "Soft Drinks" },
      { id: "p21", name: "Bigi Cola (60cl)", price: 500, emoji: "\uD83E\uDD64", subcategory: "Soft Drinks" },
      { id: "p22", name: "Star Lager (60cl)", price: 900, emoji: "\uD83C\uDF7A", subcategory: "Alcoholic" },
      { id: "p23", name: "Guinness Stout (60cl)", price: 1000, emoji: "\uD83C\uDF7A", subcategory: "Alcoholic" },
      { id: "p24", name: "Smirnoff Ice (33cl)", price: 1200, emoji: "\uD83C\uDF79", subcategory: "Alcoholic" },
      { id: "p25", name: "Digestive Biscuits (200g)", price: 800, emoji: "\uD83C\uDF6A", subcategory: "Biscuits" },
      { id: "p26", name: "Cabin Biscuits (Pack)", price: 600, emoji: "\uD83C\uDF6A", subcategory: "Biscuits" },
      { id: "p27", name: "Cadbury Bournvita (400g)", price: 2200, emoji: "\uD83C\uDF6B", subcategory: "Sweets & Chocolate" },
      { id: "p28", name: "Trebor Mints (Pack)", price: 300, emoji: "\uD83C\uDF6C", subcategory: "Sweets & Chocolate" },
      { id: "p29", name: "KitKat Chocolate (4 finger)", price: 700, emoji: "\uD83C\uDF6B", subcategory: "Sweets & Chocolate" },
    ],
  },
  {
    id: "v5", name: "Sweet Treats Bakery", area: "Arepo", category: "Restaurant", eta: "15\u201325 min", rating: 4.9, emoji: "\uD83C\uDF70",
    items: [
      { id: "p12", name: "Red Velvet Slice", price: 1800, emoji: "\uD83C\uDF70" },
      { id: "p13", name: "Meat Pie (Pack of 4)", price: 2000, emoji: "\uD83E\uDD67" },
      { id: "p14", name: "Chin Chin (500g)", price: 1500, emoji: "\uD83C\uDF6A" },
    ],
  },
  {
    id: "v6", name: "Axis Spice Corner", area: "Axis", category: "Restaurant", eta: "25\u201335 min", rating: 4.4, emoji: "\uD83C\uDF5A",
    items: [
      { id: "p15", name: "Native Jollof & Beef", price: 2800, emoji: "\uD83C\uDF5B" },
      { id: "p16", name: "Ofada Rice Special", price: 3100, emoji: "\uD83C\uDF5A" },
    ],
  },
  {
    id: "v7", name: "Arepo Bonfire Grill", area: "Arepo", category: "Grills", eta: "25\u201335 min", rating: 4.6, emoji: "\uD83D\uDD25",
    items: [
      { id: "p42", name: "Grilled Chicken (Half)", price: 3200, emoji: "\uD83C\uDF57" },
      { id: "p43", name: "Beef Kebab (Skewer)", price: 1500, emoji: "\uD83C\uDF62" },
      { id: "p44", name: "Grilled Plantain - Bole", price: 800, emoji: "\uD83C\uDF4C" },
    ],
  },
  {
    id: "v8", name: "Arepo Health Pharmacy", area: "Arepo", category: "Pharmacy", eta: "20\u201330 min", rating: 4.8, emoji: "\uD83D\uDC8A",
    items: [
      { id: "p45", name: "Paracetamol Tablets (Pack)", price: 800, emoji: "\uD83D\uDC8A", subcategory: "Pain Relief" },
      { id: "p46", name: "Ibuprofen Tablets (Pack)", price: 900, emoji: "\uD83D\uDC8A", subcategory: "Pain Relief" },
      { id: "p47", name: "Vitamin C Tablets", price: 1200, emoji: "\uD83C\uDF4A", subcategory: "Vitamins & Supplements" },
      { id: "p48", name: "Multivitamin Capsules", price: 1800, emoji: "\uD83D\uDC8A", subcategory: "Vitamins & Supplements" },
      { id: "p49", name: "Plasters (Box)", price: 500, emoji: "🩹", subcategory: "First Aid" },
      { id: "p50", name: "Antiseptic Solution", price: 1100, emoji: "\uD83E\uDDF4", subcategory: "First Aid" },
      { id: "p51", name: "Hand Sanitizer (250ml)", price: 700, emoji: "\uD83E\uDDF4", subcategory: "Personal Care" },
      { id: "p52", name: "Face Masks (Pack of 10)", price: 1000, emoji: "\uD83D\uDE37", subcategory: "Personal Care" },
      { id: "p53", name: "Baby Wipes (Pack)", price: 1300, emoji: "\uD83C\uDF7C", subcategory: "Baby Care" },
    ],
  },
];

export const STATUS_FLOW = ["placed", "accepted", "ready", "picked_up", "delivered"];

export const STATUS_LABEL = {
  placed: "Order placed",
  accepted: "Vendor preparing",
  ready: "Ready for pickup",
  picked_up: "Out for delivery",
  delivered: "Delivered",
};
