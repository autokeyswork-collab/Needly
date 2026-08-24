export const CATEGORIES = ["Restaurant", "Grills", "Supermarket", "Local Market", "Pharmacy", "Stay & Dine"];

export const MARKETPLACE_SHORTCUTS = [
  { key: "Supermarket", emoji: "🛒", title: "Shop", subtitle: "Everyday groceries and essentials", flow: "BUY" },
  { key: "Restaurant", emoji: "🍲", title: "Food", subtitle: "Restaurants and food vendors", flow: "BUY" },
  { key: "Grills", emoji: "🍢", title: "Grills", subtitle: "Grilled food vendors", flow: "BUY" },
  { key: "Local Market", emoji: "🥬", title: "Open Market", subtitle: "Fresh local market sellers", flow: "BUY" },
  { key: "Pharmacy", emoji: "💊", title: "Health", subtitle: "Pharmacies and medical supplies", flow: "BUY" },
  { key: "Stay & Dine", emoji: "🏨", title: "Stay & Dine", subtitle: "Hotels, restaurants and reservations", flow: "RESERVE" },
  { key: "Services", emoji: "🧰", title: "Services", subtitle: "Book verified service providers", flow: "BOOK" },
  { key: "Home Services", emoji: "🏠", title: "Home Services", subtitle: "Cleaners, laundry and repairs", flow: "BOOK" },
  { key: "Auto", emoji: "🚙", title: "Auto", subtitle: "Mechanics, car wash and auto support", flow: "BOOK" },
  { key: "Learn", emoji: "🎓", title: "Learn", subtitle: "Tutors and learning providers", flow: "BOOK" },
  { key: "Utilities", emoji: "💧", title: "Utilities", subtitle: "Gas, water and utility services", flow: "BOOK" },
];

export const TRANSACTION_TRACKS = [
  { label: "BUY", detail: "Products, cart, payment, delivery" },
  { label: "BOOK", detail: "Provider, schedule, location, service" },
  { label: "RESERVE", detail: "Place, date/time, people or rooms" },
];

export const CATEGORY_TINT = {
  Restaurant: "#FFF1DA",
  Grills: "#FCE8E6",
  Supermarket: "#E7E9F1",
  "Local Market": "#E5F2E9",
  Pharmacy: "#E3F0F7",
  "Stay & Dine": "#FDF2F8",
  Services: "#EDE9FF",
  "Home Services": "#EDE9FF",
  Auto: "#E3F0F7",
  Learn: "#F8F5FF",
  Utilities: "#E5F2E9",
};

export const STATUS_FLOW = ["placed", "accepted", "ready", "picked_up", "delivered"];

export const STATUS_LABEL = {
  placed: "Order placed",
  accepted: "Vendor preparing",
  ready: "Ready for pickup",
  picked_up: "Out for delivery",
  delivered: "Delivered",
};
