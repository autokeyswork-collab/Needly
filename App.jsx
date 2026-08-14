import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ---------------------------------------------------------
   ROUTE — a delivery marketplace prototype for Arepo & Axis
   Single-file demo: Customer / Vendor / Rider / Admin
   All four share one live `orders` state to simulate the
   real flow: placed → accepted → ready → picked up → delivered
--------------------------------------------------------- */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');`;

const COLORS = {
  ink: "#14171F",
  paper: "#F5F4F0",
  panel: "#FFFFFF",
  indigo: "#232B4D",
  mango: "#FF9E1B",
  green: "#2F7A4F",
  chili: "#E14B3C",
  line: "#DEDACE",
  mute: "#6B6F76",
};

const CATEGORIES = ["Restaurant", "Grills", "Supermarket", "Local Market", "Pharmacy"];

const CATEGORY_TINT = {
  Restaurant: "#FFF1DA",
  Grills: "#FCE8E6",
  Supermarket: "#E7E9F1",
  "Local Market": "#E5F2E9",
  Pharmacy: "#E3F0F7",
};

const COMMON_SIDES = [
  { id: "add-plantain", name: "Fried Plantain", price: 500 },
  { id: "add-salad", name: "Salad / Coleslaw", price: 400 },
  { id: "add-spaghetti", name: "Spaghetti", price: 600 },
  { id: "add-egg", name: "Boiled Egg", price: 300 },
];

const INITIAL_VENDORS = [
  { id: "v1", name: "Mama Risi Kitchen", area: "Arepo", category: "Restaurant", eta: "25–35 min", rating: 4.7, emoji: "🍛", isOpen: true, isActive: true, ownerName: "Risikat Adewale", ownerPhone: "0803 220 1141", businessRegNumber: "BN-2184773", ownerIdType: "NIN", ownerIdNumber: "10293847561", verified: true, verificationNotes: "CAC and owner NIN checked, matches.",
    items: [
      { id: "p1", name: "Jollof Rice & Chicken", price: 2500, emoji: "🍛", isAvailable: true, addOns: COMMON_SIDES },
      { id: "p2", name: "Efo Riro & Swallow", price: 2200, emoji: "🥘", isAvailable: true, addOns: [COMMON_SIDES[3], { id: "add-fish", name: "Extra Fried Fish", price: 900 }, { id: "add-swallow", name: "Extra Swallow", price: 500 }] },
      { id: "p3", name: "Peppered Turkey (Plate)", price: 3000, emoji: "🍗", isAvailable: true, addOns: [COMMON_SIDES[0], COMMON_SIDES[1]] },
    ] },
  { id: "v2", name: "Axis Grill House", area: "Axis", category: "Grills", eta: "30–40 min", rating: 4.5, emoji: "🍢", isOpen: true, isActive: true, ownerName: "Emeka Obi", ownerPhone: "0810 442 7736", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p4", name: "Suya Platter", price: 3500, emoji: "🍢", isAvailable: true },
      { id: "p5", name: "Grilled Fish & Plantain", price: 4000, emoji: "🐟", isAvailable: true },
    ] },
  { id: "v3", name: "Arepo Fresh Market", area: "Arepo", category: "Local Market", eta: "40–55 min", rating: 4.6, emoji: "🥬", isOpen: true, isActive: true, managerName: "Funmi Balogun", managerPhone: "0701 883 5502", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p6", name: "Tomatoes (Basket)", price: 4500, emoji: "🍅", isAvailable: true, subcategory: "Peppers" },
      { id: "p7", name: "Scotch Bonnet Pepper (Bag)", price: 3200, emoji: "🌶️", isAvailable: true, subcategory: "Peppers" },
      { id: "p30", name: "Tatashe Pepper (Bag)", price: 3000, emoji: "🌶️", isAvailable: true, subcategory: "Peppers" },
      { id: "p8", name: "Sweet Potatoes (5kg)", price: 3800, emoji: "🍠", isAvailable: true, subcategory: "Tubers & Grains" },
      { id: "p31", name: "Yam Tuber", price: 2500, emoji: "🍠", isAvailable: true, subcategory: "Tubers & Grains" },
      { id: "p32", name: "Garri (Bag)", price: 2800, emoji: "🌾", isAvailable: true, subcategory: "Tubers & Grains" },
      { id: "p33", name: "Frozen Chicken (Whole)", price: 5500, emoji: "🐔", isAvailable: true, subcategory: "Frozen Food" },
      { id: "p34", name: "Frozen Turkey Wings", price: 4800, emoji: "🍗", isAvailable: true, subcategory: "Frozen Food" },
      { id: "p35", name: "Frozen Titus Fish", price: 4200, emoji: "🐟", isAvailable: true, subcategory: "Frozen Food" },
      { id: "p36", name: "Crate of Eggs (30pcs)", price: 3300, emoji: "🥚", isAvailable: true, subcategory: "Eggs" },
      { id: "p37", name: "Half Crate of Eggs (15pcs)", price: 1750, emoji: "🥚", isAvailable: true, subcategory: "Eggs" },
      { id: "p38", name: "Ugu Leaves (Bag)", price: 1200, emoji: "🥬", isAvailable: true, subcategory: "Soup Ingredients" },
      { id: "p39", name: "Crayfish (Bag)", price: 2600, emoji: "🦐", isAvailable: true, subcategory: "Soup Ingredients" },
      { id: "p40", name: "Stock Fish (Piece)", price: 3500, emoji: "🐟", isAvailable: true, subcategory: "Soup Ingredients" },
      { id: "p41", name: "Locust Beans - Iru (Bag)", price: 900, emoji: "🫘", isAvailable: true, subcategory: "Soup Ingredients" },
    ] },
  { id: "v4", name: "QuickBasket Supermarket", area: "Axis", category: "Supermarket", eta: "20–30 min", rating: 4.8, emoji: "🛒", isOpen: true, isActive: true, ownerName: "Tolu Adeyemi", ownerPhone: "0816 990 3324", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p9", name: "Rice (5kg Bag)", price: 6800, emoji: "🌾", isAvailable: true, subcategory: "Staples" },
      { id: "p10", name: "Vegetable Oil (2L)", price: 5200, emoji: "🛢️", isAvailable: true, subcategory: "Staples" },
      { id: "p11", name: "Milk Carton (1L)", price: 1600, emoji: "🥛", isAvailable: true, subcategory: "Staples" },
      { id: "p17", name: "Omo Detergent (1kg)", price: 1200, emoji: "🧺", isAvailable: true, subcategory: "Detergent" },
      { id: "p18", name: "Ariel Powder (900g)", price: 1400, emoji: "🧼", isAvailable: true, subcategory: "Detergent" },
      { id: "p19", name: "Coca-Cola (35cl)", price: 350, emoji: "🥤", isAvailable: true, subcategory: "Soft Drinks" },
      { id: "p20", name: "Fanta Bottle (50cl)", price: 450, emoji: "🧃", isAvailable: true, subcategory: "Soft Drinks" },
      { id: "p21", name: "Bigi Cola (60cl)", price: 500, emoji: "🥤", isAvailable: true, subcategory: "Soft Drinks" },
      { id: "p22", name: "Star Lager (60cl)", price: 900, emoji: "🍺", isAvailable: true, subcategory: "Alcoholic" },
      { id: "p23", name: "Guinness Stout (60cl)", price: 1000, emoji: "🍺", isAvailable: true, subcategory: "Alcoholic" },
      { id: "p24", name: "Smirnoff Ice (33cl)", price: 1200, emoji: "🍹", isAvailable: true, subcategory: "Alcoholic" },
      { id: "p25", name: "Digestive Biscuits (200g)", price: 800, emoji: "🍪", isAvailable: true, subcategory: "Biscuits" },
      { id: "p26", name: "Cabin Biscuits (Pack)", price: 600, emoji: "🍪", isAvailable: true, subcategory: "Biscuits" },
      { id: "p27", name: "Cadbury Bournvita (400g)", price: 2200, emoji: "🍫", isAvailable: true, subcategory: "Sweets & Chocolate" },
      { id: "p28", name: "Trebor Mints (Pack)", price: 300, emoji: "🍬", isAvailable: true, subcategory: "Sweets & Chocolate" },
      { id: "p29", name: "KitKat Chocolate (4 finger)", price: 700, emoji: "🍫", isAvailable: true, subcategory: "Sweets & Chocolate" },
    ] },
  { id: "v5", name: "Sweet Treats Bakery", area: "Arepo", category: "Restaurant", eta: "15–25 min", rating: 4.9, emoji: "🍰", isOpen: true, isActive: true, ownerName: "Blessing Nwosu", ownerPhone: "0902 118 6650", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p12", name: "Red Velvet Slice", price: 1800, emoji: "🍰", isAvailable: true },
      { id: "p13", name: "Meat Pie (Pack of 4)", price: 2000, emoji: "🥧", isAvailable: true },
      { id: "p14", name: "Chin Chin (500g)", price: 1500, emoji: "🍪", isAvailable: true },
    ] },
  { id: "v6", name: "Axis Spice Corner", area: "Axis", category: "Restaurant", eta: "25–35 min", rating: 4.4, emoji: "🍚", isOpen: true, isActive: true, ownerName: "Ngozi Eze", ownerPhone: "0813 771 4498", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p15", name: "Native Jollof & Beef", price: 2800, emoji: "🍛", isAvailable: true, addOns: COMMON_SIDES },
      { id: "p16", name: "Ofada Rice Special", price: 3100, emoji: "🍚", isAvailable: true, addOns: [COMMON_SIDES[3], { id: "add-sauce", name: "Extra Ayamase Sauce", price: 500 }, { id: "add-beef", name: "Extra Beef", price: 800 }] },
    ] },
  { id: "v7", name: "Arepo Bonfire Grill", area: "Arepo", category: "Grills", eta: "25–35 min", rating: 4.6, emoji: "🔥", isOpen: true, isActive: true, ownerName: "Segun Bakare", ownerPhone: "0807 335 2291", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p42", name: "Grilled Chicken (Half)", price: 3200, emoji: "🍗", isAvailable: true },
      { id: "p43", name: "Beef Kebab (Skewer)", price: 1500, emoji: "🍢", isAvailable: true },
      { id: "p44", name: "Grilled Plantain - Bole", price: 800, emoji: "🍌", isAvailable: true },
    ] },
  { id: "v8", name: "Arepo Health Pharmacy", area: "Arepo", category: "Pharmacy", eta: "20–30 min", rating: 4.8, emoji: "💊", isOpen: true, isActive: true, ownerName: "Dr. Aisha Mohammed", ownerPhone: "0705 664 8817", businessRegNumber: "", ownerIdType: "", ownerIdNumber: "", verified: false, verificationNotes: "",
    items: [
      { id: "p45", name: "Paracetamol Tablets (Pack)", price: 800, emoji: "💊", isAvailable: true, subcategory: "Pain Relief" },
      { id: "p46", name: "Ibuprofen Tablets (Pack)", price: 900, emoji: "💊", isAvailable: true, subcategory: "Pain Relief" },
      { id: "p47", name: "Vitamin C Tablets", price: 1200, emoji: "🍊", isAvailable: true, subcategory: "Vitamins & Supplements" },
      { id: "p48", name: "Multivitamin Capsules", price: 1800, emoji: "💊", isAvailable: true, subcategory: "Vitamins & Supplements" },
      { id: "p49", name: "Plasters (Box)", price: 500, emoji: "🩹", isAvailable: true, subcategory: "First Aid" },
      { id: "p50", name: "Antiseptic Solution", price: 1100, emoji: "🧴", isAvailable: true, subcategory: "First Aid" },
      { id: "p51", name: "Hand Sanitizer (250ml)", price: 700, emoji: "🧴", isAvailable: true, subcategory: "Personal Care" },
      { id: "p52", name: "Face Masks (Pack of 10)", price: 1000, emoji: "😷", isAvailable: true, subcategory: "Personal Care" },
      { id: "p53", name: "Baby Wipes (Pack)", price: 1300, emoji: "🍼", isAvailable: true, subcategory: "Baby Care" },
    ] },
];

// Real rider roster, replacing the old RIDER_DIRECTORY (a single hardcoded
// entry with no admin-manageable data behind it). Mirrors INITIAL_VENDORS:
// Admin can suspend/reactivate here the same way, and RiderApp gets a
// demo identity switcher the same way CustomerApp already has one.
const INITIAL_RIDERS = [
  { id: "r1", name: "Tunde A.", phone: "0812 774 3390", zone: "Arepo/Axis", rating: 4.9, emoji: "🛵", isOnline: true, isActive: true, bankName: "GTBank", bankAccountNumber: "0123456789", bankAccountName: "Tunde Adewale", idType: "NIN", idNumber: "12345678901", verified: true, verificationNotes: "Checked in person, matches bank account name." },
  { id: "r2", name: "Chioma K.", phone: "0908 221 6674", zone: "Arepo/Axis", rating: 4.7, emoji: "🛵", isOnline: false, isActive: true, bankName: "", bankAccountNumber: "", bankAccountName: "", idType: "", idNumber: "", verified: false, verificationNotes: "" },
  { id: "r3", name: "Yusuf B.", phone: "0704 559 1128", zone: "Arepo/Axis", rating: 4.8, emoji: "🛵", isOnline: false, isActive: true, bankName: "", bankAccountNumber: "", bankAccountName: "", idType: "", idNumber: "", verified: false, verificationNotes: "" },
];

const STATUS_FLOW = ["placed", "accepted", "ready", "picked_up", "delivered"];
const STATUS_LABEL = {
  placed: "Order placed",
  accepted: "Vendor preparing",
  ready: "Ready for pickup",
  picked_up: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Order declined",
};

let orderCounter = 1042;
const fmtNaira = (n) => `₦${n.toLocaleString()}`;

// Shared "time since" formatter — every timestamped record in the app
// (orders, disputes, operational issues) renders through this, so the
// granularity is consistent: minutes within the hour, hours within the
// day, days within the week, then a plain date beyond that.
function timeAgo(ts, now = Date.now()) {
  if (!ts) return "";
  const diffMs = Math.max(0, now - ts);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- shared bits ---------- */

function GlobalStyle() {
  return (
    <style>{`
      ${FONT_IMPORT}
      * { box-sizing: border-box; }
      body { margin: 0; }
      .rt-app {
        font-family: 'Inter', sans-serif;
        background: ${COLORS.paper};
        color: ${COLORS.ink};
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .rt-display { font-family: 'Archivo Black', sans-serif; }
      .rt-mono { font-family: 'IBM Plex Mono', monospace; }
      button { font-family: inherit; cursor: pointer; }
      button:focus-visible, a:focus-visible, input:focus-visible {
        outline: 2px solid ${COLORS.mango}; outline-offset: 2px;
      }
      .rt-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .rt-scroll::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 4px; }
    `}</style>
  );
}

/* Signature nav: a delivery route line — one stop per interface */
function RouteSwitcher({ role, setRole, orders }) {
  const stops = [
    { key: "customer", label: "Customer" },
    { key: "vendor", label: "Vendor" },
    { key: "manager", label: "Manager" },
    { key: "rider", label: "Rider" },
    { key: "admin", label: "Admin" },
  ];
  const activeIdx = stops.findIndex((s) => s.key === role);
  const pendingManagerCount = orders.filter(
    (o) => o.vendor.id === LOCAL_MARKET_VENDOR.id && o.status === "placed" && o.paymentStatus === "paid"
  ).length;

  return (
    <div style={{
      background: COLORS.indigo, padding: "18px 20px 22px", position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="rt-display" style={{ color: "#fff", fontSize: 20, letterSpacing: 0.5 }}>
          ROUTE
        </div>
        <div className="rt-mono" style={{ color: COLORS.mango, fontSize: 11, letterSpacing: 1 }}>
          AREPO ⇄ AXIS
        </div>
      </div>

      <div style={{ position: "relative", height: 44 }}>
        <div style={{
          position: "absolute", top: 10, left: "6%", right: "6%", height: 2,
          background: `repeating-linear-gradient(to right, ${COLORS.mango} 0 6px, transparent 6px 12px)`,
        }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
          {stops.map((s, i) => {
            const isActive = s.key === role;
            const isPassed = i <= activeIdx;
            const badge = s.key === "manager" ? pendingManagerCount : 0;
            return (
              <button
                key={s.key}
                onClick={() => setRole(s.key)}
                style={{
                  background: "none", border: "none", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6, flex: 1, padding: 0, position: "relative",
                }}
                aria-current={isActive ? "true" : undefined}
              >
                {badge > 0 && (
                  <span className="rt-mono" style={{
                    position: "absolute", top: -6, right: "28%", background: COLORS.chili, color: "#fff",
                    borderRadius: 10, fontSize: 9.5, fontWeight: 700, padding: "1px 5px", minWidth: 14,
                    textAlign: "center", border: `2px solid ${COLORS.indigo}`,
                  }}>
                    {badge}
                  </span>
                )}
                <span style={{
                  width: isActive ? 18 : 12, height: isActive ? 18 : 12, borderRadius: "50%",
                  background: isPassed ? COLORS.mango : "rgba(255,255,255,0.35)",
                  border: isActive ? "3px solid #fff" : "none",
                  boxShadow: isActive ? "0 0 0 4px rgba(255,158,27,0.25)" : "none",
                  transition: "all 0.15s ease",
                }} />
                <span style={{
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  fontSize: 11.5, fontWeight: isActive ? 700 : 500,
                }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#EFEDE6", fg: COLORS.ink },
    mango: { bg: "#FFF1DA", fg: "#95580A" },
    green: { bg: "#E5F2E9", fg: COLORS.green },
    chili: { bg: "#FCE8E6", fg: COLORS.chili },
    indigo: { bg: "#E7E9F1", fg: COLORS.indigo },
  };
  const t = tones[tone];
  return (
    <span className="rt-mono" style={{
      background: t.bg, color: t.fg, fontSize: 10.5, padding: "3px 8px",
      borderRadius: 20, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Thumb({ emoji, category, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, minWidth: size, borderRadius: 12,
      background: CATEGORY_TINT[category] || "#EFEDE6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, flexShrink: 0,
    }}>
      {emoji}
    </div>
  );
}

function StatusPillFor(status) {
  const map = {
    placed: "neutral", accepted: "mango", ready: "indigo", picked_up: "mango", delivered: "green", cancelled: "chili",
  };
  return <Pill tone={map[status]}>{STATUS_LABEL[status].toUpperCase()}</Pill>;
}

const CASE_STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
const CASE_STATUS_TONE = { open: "chili", in_progress: "mango", resolved: "green" };
function CaseStatusPill(status) {
  return <Pill tone={CASE_STATUS_TONE[status]}>{CASE_STATUS_LABEL[status].toUpperCase()}</Pill>;
}

function StarRating({ value, onChange, size = 22 }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            border: "none", background: "none", padding: 0, fontSize: size,
            color: n <= value ? COLORS.mango : COLORS.line, lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ---------------- CUSTOMER ---------------- */

const LOCAL_MARKET_VENDOR = INITIAL_VENDORS.find((v) => v.category === "Local Market");

// Cart lines are keyed by "itemId" alone (no add-ons) or "itemId::addOnId1,addOnId2"
// (with add-ons), so different add-on combos of the same dish become separate lines.
// Cart lines are keyed by "itemId" alone (no add-ons) or
// "itemId::addOnId1:qty1,addOnId2:qty2" (with add-ons and their chosen
// quantities), so different add-on combos/quantities of the same dish
// become separate cart lines.
function makeLineKey(itemId, addOnQtys) {
  const entries = Object.entries(addOnQtys || {})
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.length ? `${itemId}::${entries.map(([id, qty]) => `${id}:${qty}`).join(",")}` : itemId;
}
function parseLineKey(key) {
  const [itemId, addOnStr] = key.split("::");
  const addOnQtys = {};
  if (addOnStr) {
    addOnStr.split(",").forEach((pair) => {
      const [id, qty] = pair.split(":");
      addOnQtys[id] = Number(qty) || 1;
    });
  }
  return { itemId, addOnQtys };
}

function groupBySubcategory(items) {
  const order = [];
  const map = {};
  items.forEach((i) => {
    const key = i.subcategory || "Other";
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(i);
  });
  return order.map((key) => ({ label: key, items: map[key] }));
}

// Baseline order-count activity per area, per time period, so the number
// feels like a real live area from the first session instead of just
// today's handful of test orders. Live orders placed in this session are
// added on top of whichever period they fall into (an order placed today
// counts toward day, week, month, AND year). Replace this with a real
// `COUNT(*) ... WHERE created_at >= <period start>` query once there's a
// backend tracking actual order history per area.
const AREA_ACTIVITY_SEED = {
  day: { Arepo: 128, Axis: 94 },
  week: { Arepo: 890, Axis: 640 },
  month: { Arepo: 3650, Axis: 2600 },
  year: { Arepo: 41200, Axis: 29800 },
};
const PERIOD_LABEL = { day: "today", week: "this week", month: "this month", year: "this year" };

// This prototype has no real customer accounts — only one Customer role.
// This lets you simulate different customers placing orders, so Admin's
// customer-tracking view (new/frequent/badged customers) has something real
// to compute from. Swap for real logged-in identity once auth exists.
const DEMO_CUSTOMERS = ["Ada C.", "Ifeoma B.", "Chidi O.", "Bola A.", "Emeka N."];
const DEMO_CUSTOMER_PROFILES = {
  "Ada C.": { phone: "0803 123 4567" },
  "Ifeoma B.": { phone: "0805 234 5678" },
  "Chidi O.": { phone: "0812 345 6789" },
  "Bola A.": { phone: "0706 456 7890" },
  "Emeka N.": { phone: "0909 567 8901" },
};

// Blends a vendor's seed rating with any real reviews submitted this
// session, weighting the seed as if it already represents this many past
// reviews — so one or two live 5-stars don't swing the number wildly.
// Replace with a real AVG(rating) query once reviews are persisted.
const SEED_REVIEW_WEIGHT = 50;
function displayRating(vendor, reviews) {
  const vendorReviews = reviews.filter((r) => r.vendorId === vendor.id);
  if (vendorReviews.length === 0) return vendor.rating;
  const liveSum = vendorReviews.reduce((s, r) => s + r.vendorRating, 0);
  const blended = (vendor.rating * SEED_REVIEW_WEIGHT + liveSum) / (SEED_REVIEW_WEIGHT + vendorReviews.length);
  return Math.round(blended * 10) / 10;
}

function CustomerApp({ orders, placeOrder, disputes, raiseDispute, vendors, socialProofPeriod, raiseOperationalIssue, confirmPayment, cancelOrder, reviews, submitReview, riders }) {
  const [customerName, setCustomerName] = useState(DEMO_CUSTOMERS[0]);
  const [customerPhone, setCustomerPhone] = useState(DEMO_CUSTOMER_PROFILES[DEMO_CUSTOMERS[0]].phone);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  // Keyed by customer identity since this demo can switch between several —
  // each simulated customer keeps their own favorites list.
  const [favoritesByCustomer, setFavoritesByCustomer] = useState({});
  const myFavorites = favoritesByCustomer[customerName] || [];
  const toggleFavorite = (vendorId) => {
    setFavoritesByCustomer((prev) => {
      const current = prev[customerName] || [];
      const next = current.includes(vendorId) ? current.filter((id) => id !== vendorId) : [...current, vendorId];
      return { ...prev, [customerName]: next };
    });
  };
  const [category, setCategory] = useState("Restaurant");
  const [vendorId, setVendorId] = useState(null);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("browse"); // browse | vendor | cart | tracking
  const [myOrderId, setMyOrderId] = useState(null);
  const [expandedMyOrderId, setExpandedMyOrderId] = useState(null);
  const [subFilter, setSubFilter] = useState("All");
  const [marketSubFilter, setMarketSubFilter] = useState("All");
  const [reportOpen, setReportOpen] = useState(false);
  const [supportOrderId, setSupportOrderId] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportOtherNote, setSupportOtherNote] = useState(null); // null = not writing one; string = note text
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [disputeOtherNote, setDisputeOtherNote] = useState(null); // null = not writing one; string = note text
  const [vendorStars, setVendorStars] = useState(0);
  const [riderStars, setRiderStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [customizingItemId, setCustomizingItemId] = useState(null);
  const [selectedAddOnQtys, setSelectedAddOnQtys] = useState({});

  const localMarketVendor = vendors.find((v) => v.id === LOCAL_MARKET_VENDOR.id);
  const isLocalMarket = category === "Local Market";
  // Local Market always maps to the one local-market vendor regardless of
  // vendorId — vendorId can legitimately be null here (e.g. right after
  // "Order something else" resets it) while the category is still Local
  // Market, and cart/checkout must keep working in that case.
  const vendor = isLocalMarket ? localMarketVendor : (vendors.find((v) => v.id === vendorId) || null);
  const filteredVendors = vendors.filter((v) => v.category === category);

  const selectCategory = (c) => {
    setCategory(c);
    setCart({});
    setMarketSubFilter("All");
    if (c === "Local Market") {
      setVendorId(LOCAL_MARKET_VENDOR.id);
    } else {
      setVendorId(null);
    }
  };
  const cartLines = vendor
    ? Object.keys(cart)
        .filter((k) => cart[k] > 0)
        .map((k) => {
          const { itemId, addOnQtys } = parseLineKey(k);
          const item = vendor.items.find((i) => i.id === itemId);
          if (!item) return null;
          const addOns = Object.entries(addOnQtys)
            .map(([id, qty]) => {
              const addOn = (item.addOns || []).find((a) => a.id === id);
              return addOn ? { ...addOn, qty } : null;
            })
            .filter(Boolean);
          const unitPrice = item.price + addOns.reduce((s, a) => s + a.price * a.qty, 0);
          return { key: k, item, addOns, qty: cart[k], unitPrice };
        })
        .filter(Boolean)
    : [];
  const cartTotal = cartLines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  const addItem = (key) => setCart((c) => ({ ...c, [key]: (c[key] || 0) + 1 }));
  const removeItem = (key) => setCart((c) => ({ ...c, [key]: Math.max(0, (c[key] || 0) - 1) }));

  const openCustomize = (item) => { setCustomizingItemId(item.id); setSelectedAddOnQtys({}); };
  const incrementAddOn = (addOnId) => setSelectedAddOnQtys((prev) => ({ ...prev, [addOnId]: (prev[addOnId] || 0) + 1 }));
  const decrementAddOn = (addOnId) => setSelectedAddOnQtys((prev) => ({ ...prev, [addOnId]: Math.max(0, (prev[addOnId] || 0) - 1) }));
  const confirmCustomize = (item) => {
    addItem(makeLineKey(item.id, selectedAddOnQtys));
    setCustomizingItemId(null);
  };

  const formatAddOns = (addOns) => addOns.map((a) => (a.qty > 1 ? `${a.qty}× ${a.name}` : a.name)).join(", ");

  const checkout = () => {
    const id = placeOrder(vendor, cartLines.map((l) => ({
      id: l.key,
      name: l.item.name + (l.addOns.length ? ` + ${formatAddOns(l.addOns)}` : ""),
      price: l.unitPrice,
      qty: l.qty,
      emoji: l.item.emoji,
    })), cartTotal, customerName, deliveryAddress.trim(), customerPhone.trim());
    setMyOrderId(id);
    setCart({});
    setReportOpen(false);
    setDisputeOtherNote(null);
    setVendorStars(0);
    setRiderStars(0);
    setReviewComment("");
    setView("tracking");
  };

  const myOrder = orders.find((o) => o.id === myOrderId);
  const existingDispute = myOrder ? disputes.find((d) => d.orderId === myOrder.id) : null;
  const myReview = myOrder ? reviews.find((r) => r.orderId === myOrder.id) : null;
  const myActiveOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");

  // Rebuilds the cart from a past order's line keys (order.items[].id was
  // stored as the original cart line key at checkout — see the `id: l.key`
  // mapping there), so quantities and add-on combos come back exactly as
  // they were. Prices are looked up fresh against the current vendor.items,
  // so this naturally reflects any price changes since the original order;
  // any item that's since been removed just won't appear (cartLines already
  // filters out lines with no matching item).
  const reorder = (order) => {
    const newCart = {};
    order.items.forEach((i) => { newCart[i.id] = i.qty; });
    setCart(newCart);
    setCategory(order.vendor.category);
    setVendorId(order.vendor.category === "Local Market" ? LOCAL_MARKET_VENDOR.id : order.vendor.id);
    setSubFilter("All");
    setView("cart");
  };
  const activePeriodSeed = AREA_ACTIVITY_SEED[socialProofPeriod] || AREA_ACTIVITY_SEED.day;
  const areaActivity = Object.fromEntries(
    Object.entries(activePeriodSeed).map(([area, seed]) => [
      area,
      seed + orders.filter((o) => o.vendor.area === area).length,
    ])
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {view === "browse" && (
        <>
          <div style={{ padding: "14px 20px 0" }}>
            <label className="rt-mono" style={{ fontSize: 10, color: COLORS.mute, letterSpacing: 0.4 }}>ORDERING AS (DEMO)</label>
            <select
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setCustomerPhone(DEMO_CUSTOMER_PROFILES[e.target.value].phone);
              }}
              style={{
                display: "block", width: "100%", marginTop: 4, padding: "8px 10px",
                borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel, fontSize: 13.5, fontWeight: 600,
              }}
            >
              {DEMO_CUSTOMERS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "12px 20px 0" }}>
            <button onClick={() => { setSupportSubmitted(false); setSupportOrderId(""); setSupportOtherNote(null); setView("support"); }} style={{
              border: `1px solid ${COLORS.line}`, background: "none", color: COLORS.mute,
              fontWeight: 700, fontSize: 12.5, padding: "8px 12px", borderRadius: 20, flexShrink: 0,
            }}>
              Need help?
            </button>
            <button onClick={() => setView("favorites")} style={{
              border: `1px solid ${COLORS.line}`, background: "none", color: COLORS.chili,
              fontWeight: 700, fontSize: 12.5, padding: "8px 12px", borderRadius: 20,
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}>
              ♥ {myFavorites.length > 0 ? myFavorites.length : ""}
            </button>
            <button onClick={() => setView("orders")} style={{
              border: `1px solid ${COLORS.line}`, background: COLORS.panel, color: COLORS.ink,
              fontWeight: 700, fontSize: 12.5, padding: "8px 12px", borderRadius: 20,
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}>
              My Orders
              {myActiveOrders.length > 0 && (
                <span className="rt-mono" style={{
                  background: COLORS.mango, color: "#fff", borderRadius: 10, fontSize: 10.5,
                  padding: "1px 6px", fontWeight: 700,
                }}>
                  {myActiveOrders.length}
                </span>
              )}
            </button>
          </div>

          {socialProofPeriod !== "off" && (
            <div style={{ padding: "12px 20px 0" }}>
              <div style={{
                background: "#FFF1DA", border: `1px solid ${COLORS.mango}`, borderRadius: 12,
                padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6,
              }}>
                🔥 <strong>{areaActivity.Arepo}</strong> orders delivered in Arepo {PERIOD_LABEL[socialProofPeriod]} · <strong>{areaActivity.Axis}</strong> in Axis
              </div>
            </div>
          )}

          <div className="rt-scroll" style={{ display: "flex", gap: 8, padding: "16px 20px 8px", overflowX: "auto" }}>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => selectCategory(c)} style={{
                border: "none", padding: "8px 14px", borderRadius: 20, fontSize: 13.5, fontWeight: 600,
                background: category === c ? COLORS.ink : COLORS.panel,
                color: category === c ? "#fff" : COLORS.ink,
                boxShadow: category === c ? "none" : `inset 0 0 0 1px ${COLORS.line}`,
                whiteSpace: "nowrap",
              }}>
                {c}
              </button>
            ))}
          </div>

          {isLocalMarket ? (
            <div style={{ padding: "6px 20px 90px" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5 }}>{LOCAL_MARKET_VENDOR.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <Pill tone="indigo">{LOCAL_MARKET_VENDOR.area}</Pill>
                  {localMarketVendor.isActive === false ? (
                    <Pill tone="chili">Unavailable</Pill>
                  ) : localMarketVendor.isOpen ? (
                    <span style={{ fontSize: 12.5, color: COLORS.mute }}>{LOCAL_MARKET_VENDOR.eta}</span>
                  ) : (
                    <Pill tone="chili">Closed</Pill>
                  )}
                </div>
              </div>

              {localMarketVendor.isActive === false ? (
                <div style={{
                  background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 14, fontSize: 13.5,
                }}>
                  Arepo Fresh Market is currently unavailable. Check back soon.
                </div>
              ) : !localMarketVendor.isOpen ? (
                <div style={{
                  background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 14, fontSize: 13.5,
                }}>
                  Arepo Fresh Market is currently closed. Check back soon.
                </div>
              ) : (
              <>
              <div className="rt-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
                {["All", ...new Set(localMarketVendor.items.map((i) => i.subcategory))].map((s) => (
                  <button key={s} onClick={() => setMarketSubFilter(s)} style={{
                    border: "none", padding: "7px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                    background: marketSubFilter === s ? COLORS.ink : COLORS.panel,
                    color: marketSubFilter === s ? "#fff" : COLORS.ink,
                    boxShadow: marketSubFilter === s ? "none" : `inset 0 0 0 1px ${COLORS.line}`,
                    whiteSpace: "nowrap",
                  }}>
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {groupBySubcategory(
                  marketSubFilter === "All"
                    ? localMarketVendor.items
                    : localMarketVendor.items.filter((i) => i.subcategory === marketSubFilter)
                ).map((group) => (
                  <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {marketSubFilter === "All" && (
                      <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.5 }}>
                        {group.label.toUpperCase()}
                      </div>
                    )}
                    {group.items.map((i) => (
                      <div key={i.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12, gap: 12,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Thumb emoji={i.emoji} category="Local Market" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{i.name}</div>
                            <div className="rt-mono" style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(i.price)}</div>
                          </div>
                        </div>
                        {cart[i.id] ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => removeItem(i.id)} style={qtyBtnStyle}>−</button>
                            <span style={{ minWidth: 16, textAlign: "center", fontWeight: 700 }}>{cart[i.id]}</span>
                            <button onClick={() => addItem(i.id)} style={qtyBtnStyle}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addItem(i.id)} style={{
                            border: "none", background: COLORS.mango, color: "#fff", fontWeight: 700,
                            padding: "8px 14px", borderRadius: 20, fontSize: 13,
                          }}>
                            Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          ) : (
            <div style={{ padding: "10px 20px 90px", display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredVendors.map((v) => {
                const isFavorite = myFavorites.includes(v.id);
                const orderable = v.isOpen && v.isActive !== false;
                return (
                <div
                  key={v.id}
                  onClick={() => { if (orderable) { setVendorId(v.id); setCart({}); setSubFilter("All"); setView("vendor"); } }}
                  style={{
                    textAlign: "left", background: COLORS.panel, border: `1px solid ${COLORS.line}`,
                    borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14,
                    opacity: orderable ? 1 : 0.55, cursor: orderable ? "pointer" : "not-allowed",
                  }}
                >
                  <Thumb emoji={v.emoji} category={v.category} size={52} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, fontSize: 15.5 }}>{v.name}</span>
                      <span className="rt-mono" style={{ fontSize: 12, color: COLORS.mute }}>★ {displayRating(v, reviews)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Pill tone="indigo">{v.area}</Pill>
                      {v.isActive === false ? (
                        <Pill tone="chili">Unavailable</Pill>
                      ) : v.isOpen ? (
                        <span style={{ fontSize: 12.5, color: COLORS.mute }}>{v.eta}</span>
                      ) : (
                        <Pill tone="chili">Closed</Pill>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(v.id); }}
                    style={{
                      border: "none", background: "none", fontSize: 20, padding: 4, flexShrink: 0,
                      color: isFavorite ? COLORS.chili : COLORS.line,
                    }}
                  >
                    {isFavorite ? "♥" : "♡"}
                  </button>
                </div>
                );
              })}
              {filteredVendors.length === 0 && (
                <p style={{ color: COLORS.mute, fontSize: 14 }}>No vendors in this category yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {view === "vendor" && vendor && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <button onClick={() => setView("browse")} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <Thumb emoji={vendor.emoji} category={vendor.category} size={48} />
            <h2 className="rt-display" style={{ fontSize: 19, margin: 0 }}>{vendor.name}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Pill tone="indigo">{vendor.area}</Pill>
            {vendor.isActive === false ? (
              <Pill tone="chili">Unavailable</Pill>
            ) : vendor.isOpen ? (
              <span style={{ fontSize: 12.5, color: COLORS.mute }}>{vendor.eta}</span>
            ) : (
              <Pill tone="chili">Closed</Pill>
            )}
          </div>

          {vendor.isActive === false ? (
            <div style={{
              background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13.5,
            }}>
              {vendor.name} is currently unavailable. You can still browse the menu.
            </div>
          ) : !vendor.isOpen && (
            <div style={{
              background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13.5,
            }}>
              {vendor.name} is currently closed and not accepting new orders. You can still browse the menu.
            </div>
          )}

          {vendor.items.some((i) => i.subcategory) && (
            <div className="rt-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
              {["All", ...new Set(vendor.items.map((i) => i.subcategory))].map((s) => (
                <button key={s} onClick={() => setSubFilter(s)} style={{
                  border: "none", padding: "7px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                  background: subFilter === s ? COLORS.ink : COLORS.panel,
                  color: subFilter === s ? "#fff" : COLORS.ink,
                  boxShadow: subFilter === s ? "none" : `inset 0 0 0 1px ${COLORS.line}`,
                  whiteSpace: "nowrap",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {groupBySubcategory(
              subFilter === "All" ? vendor.items : vendor.items.filter((i) => i.subcategory === subFilter)
            ).map((group) => (
              <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vendor.items.some((i) => i.subcategory) && subFilter === "All" && (
                  <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.5 }}>
                    {group.label.toUpperCase()}
                  </div>
                )}
                {group.items.map((i) => {
                  const hasAddOns = i.addOns && i.addOns.length > 0;
                  const canOrder = vendor.isOpen && vendor.isActive !== false && i.isAvailable !== false;
                  const existingLines = hasAddOns
                    ? Object.keys(cart).filter((k) => cart[k] > 0 && parseLineKey(k).itemId === i.id)
                    : [];
                  return (
                  <div key={i.id} style={{
                    display: "flex", flexDirection: "column", gap: 10,
                    background: COLORS.panel, border: `1px solid ${i.isAvailable === false ? COLORS.chili : COLORS.line}`, borderRadius: 12, padding: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: i.isAvailable === false ? 0.55 : 1 }}>
                        <Thumb emoji={i.emoji} category={vendor.category} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{i.name}</div>
                          <div className="rt-mono" style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(i.price)}</div>
                        </div>
                      </div>
                      {i.isAvailable === false ? (
                        <Pill tone="chili">Unavailable</Pill>
                      ) : (
                        <>
                          {!hasAddOns && (
                            cart[i.id] ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button onClick={() => removeItem(i.id)} style={qtyBtnStyle}>−</button>
                                <span style={{ minWidth: 16, textAlign: "center", fontWeight: 700 }}>{cart[i.id]}</span>
                                <button onClick={() => addItem(i.id)} style={qtyBtnStyle}>+</button>
                              </div>
                            ) : (
                              <button disabled={!canOrder} onClick={() => addItem(i.id)} style={{
                                border: "none", background: COLORS.mango, color: "#fff", fontWeight: 700,
                                padding: "8px 14px", borderRadius: 20, fontSize: 13,
                                opacity: canOrder ? 1 : 0.4, cursor: canOrder ? "pointer" : "not-allowed",
                              }}>
                                Add
                              </button>
                            )
                          )}
                          {hasAddOns && (
                            <button disabled={!canOrder} onClick={() => openCustomize(i)} style={{
                              border: `1px solid ${COLORS.mango}`, background: "none", color: COLORS.mango, fontWeight: 700,
                              padding: "8px 14px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap",
                              opacity: canOrder ? 1 : 0.4, cursor: canOrder ? "pointer" : "not-allowed",
                            }}>
                              Add · Customize
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {hasAddOns && existingLines.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2, borderTop: `1px dashed ${COLORS.line}` }}>
                        {existingLines.map((key) => {
                          const { addOnQtys } = parseLineKey(key);
                          const addOnsWithQty = Object.entries(addOnQtys)
                            .map(([id, qty]) => {
                              const a = i.addOns.find((x) => x.id === id);
                              return a ? { ...a, qty } : null;
                            })
                            .filter(Boolean);
                          return (
                            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
                              <span style={{ fontSize: 12.5, color: COLORS.mute }}>
                                {addOnsWithQty.length ? `+ ${formatAddOns(addOnsWithQty)}` : "No add-ons"}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button onClick={() => removeItem(key)} style={qtyBtnStyle}>−</button>
                                <span style={{ minWidth: 14, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{cart[key]}</span>
                                <button onClick={() => addItem(key)} style={qtyBtnStyle}>+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {customizingItemId === i.id && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, borderTop: `1px dashed ${COLORS.line}` }}>
                        <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.3, paddingTop: 6 }}>
                          ADD-ONS (OPTIONAL) · PICK ANY QUANTITY
                        </div>
                        {i.addOns.map((a) => {
                          const qty = selectedAddOnQtys[a.id] || 0;
                          return (
                            <div key={a.id} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              border: `1px solid ${qty > 0 ? COLORS.mango : COLORS.line}`,
                              background: qty > 0 ? "#FFF1DA" : "#fff", borderRadius: 10, padding: "8px 10px",
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: qty > 0 ? 700 : 500 }}>{a.name}</div>
                                <div className="rt-mono" style={{ fontSize: 11.5, color: COLORS.mute }}>{fmtNaira(a.price)} each</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button onClick={() => decrementAddOn(a.id)} disabled={qty === 0} style={{ ...qtyBtnStyle, opacity: qty === 0 ? 0.35 : 1 }}>−</button>
                                <span style={{ minWidth: 14, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{qty}</span>
                                <button onClick={() => incrementAddOn(a.id)} style={qtyBtnStyle}>+</button>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={() => setCustomizingItemId(null)} style={{
                            flex: 1, border: `1px solid ${COLORS.line}`, background: "none", color: COLORS.mute,
                            fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 20,
                          }}>
                            Cancel
                          </button>
                          <button onClick={() => confirmCustomize(i)} style={{
                            flex: 2, border: "none", background: COLORS.mango, color: "#fff", fontWeight: 700,
                            fontSize: 13, padding: "9px 0", borderRadius: 20,
                          }}>
                            Add to cart · {fmtNaira(i.price + Object.entries(selectedAddOnQtys).reduce((s, [id, qty]) => s + (i.addOns.find((a) => a.id === id)?.price || 0) * qty, 0))}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "cart" && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <button onClick={() => setView("vendor")} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back to menu
          </button>
          <h2 className="rt-display" style={{ fontSize: 19, margin: "0 0 14px" }}>Your Order</h2>

          {cartLines.some((l) => l.item.isAvailable === false) && (
            <div style={{
              background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13.5,
            }}>
              Some items in your cart just became unavailable — remove them below before placing your order.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {cartLines.map((l) => {
              const unavailable = l.item.isAvailable === false;
              return (
                <div key={l.key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14,
                  ...(unavailable ? { background: "#FCE8E6", borderRadius: 8, padding: "8px 10px" } : {}),
                }}>
                  <span>
                    {l.qty} × {l.item.name}
                    {l.addOns.length > 0 && (
                      <span style={{ display: "block", fontSize: 12, color: COLORS.mute }}>
                        + {formatAddOns(l.addOns)}
                      </span>
                    )}
                    {unavailable && (
                      <span style={{ display: "block", fontSize: 12, color: COLORS.chili, fontWeight: 600, marginTop: 2 }}>
                        😔 No longer available
                      </span>
                    )}
                  </span>
                  {unavailable ? (
                    <button onClick={() => setCart((c) => ({ ...c, [l.key]: 0 }))} style={{
                      border: "none", background: COLORS.chili, color: "#fff", fontWeight: 700,
                      fontSize: 12, padding: "6px 12px", borderRadius: 20,
                    }}>
                      Remove
                    </button>
                  ) : (
                    <span className="rt-mono">{fmtNaira(l.unitPrice * l.qty)}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: `1px dashed ${COLORS.line}`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Total</span>
            <span className="rt-mono">{fmtNaira(cartTotal)}</span>
          </div>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.3 }}>DELIVERY ADDRESS</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House/street, closest landmark, area (e.g. Arepo)…"
                rows={2}
                style={{
                  display: "block", width: "100%", marginTop: 4, padding: "10px 12px",
                  borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel,
                  fontSize: 14, fontFamily: "inherit", resize: "vertical",
                }}
              />
            </div>
            <div>
              <label className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.3 }}>PHONE NUMBER</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Rider will call this number"
                style={{
                  display: "block", width: "100%", marginTop: 4, padding: "10px 12px",
                  borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel, fontSize: 14,
                }}
              />
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, background: "#E5F2E9",
            border: `1px solid ${COLORS.green}`, borderRadius: 12, padding: "10px 12px", marginTop: 14, fontSize: 12.5,
          }}>
            <span style={{ fontSize: 15 }}>🛡️</span>
            <span>Not happy with your order? We'll sort it out in minutes — just report it from your order tracking screen.</span>
          </div>

          <button
            onClick={checkout}
            disabled={
              cartLines.length === 0 ||
              cartLines.some((l) => l.item.isAvailable === false) ||
              !deliveryAddress.trim() ||
              !customerPhone.trim()
            }
            style={{
              marginTop: 14, width: "100%", border: "none", background: COLORS.ink, color: "#fff",
              fontWeight: 700, padding: "14px 0", borderRadius: 12, fontSize: 15,
              opacity: (
                cartLines.length === 0 ||
                cartLines.some((l) => l.item.isAvailable === false) ||
                !deliveryAddress.trim() ||
                !customerPhone.trim()
              ) ? 0.4 : 1,
            }}
          >
            Place order · {fmtNaira(cartTotal)}
          </button>
          {!deliveryAddress.trim() && (
            <p style={{ fontSize: 12, color: COLORS.mute, marginTop: 8, textAlign: "center" }}>
              Add a delivery address to place your order.
            </p>
          )}
        </div>
      )}

      {view === "support" && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <button onClick={() => setView("browse")} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back
          </button>
          <h2 className="rt-display" style={{ fontSize: 19, margin: "0 0 6px" }}>Something's wrong with the app?</h2>
          <p style={{ fontSize: 13.5, color: COLORS.mute, marginTop: 0, marginBottom: 18 }}>
            This is for app or payment problems — like being charged with no order showing up, a crash during
            checkout, or an order stuck and not updating. Not about food quality or a late delivery — for that,
            use "Report an issue" from the order's tracking screen instead.
          </p>

          {supportSubmitted ? (
            <div style={{ background: "#E5F2E9", border: `1px solid ${COLORS.green}`, borderRadius: 12, padding: 14, fontSize: 13.5 }}>
              🛡️ Got it — this goes straight to our team, not a vendor. We'll sort it out in minutes.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  "Charged but no order appeared",
                  "App crashed during checkout",
                  "Order stuck / not updating",
                  "Charged the wrong amount",
                  "Other",
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      if (reason === "Other") { setSupportOtherNote(""); return; }
                      raiseOperationalIssue(reason, supportOrderId || null, "customer", customerName);
                      setSupportSubmitted(true);
                    }}
                    style={{
                      textAlign: "left", border: `1px solid ${COLORS.line}`, background: COLORS.panel,
                      borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 600,
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {supportOtherNote !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <textarea
                    value={supportOtherNote}
                    onChange={(e) => setSupportOtherNote(e.target.value)}
                    placeholder="Tell us what happened…"
                    rows={3}
                    style={{
                      border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px",
                      fontSize: 14, fontFamily: "inherit", resize: "vertical",
                    }}
                  />
                  <button
                    onClick={() => {
                      const note = supportOtherNote.trim();
                      raiseOperationalIssue(note ? `Other: ${note}` : "Other", supportOrderId || null, "customer", customerName);
                      setSupportSubmitted(true);
                      setSupportOtherNote(null);
                    }}
                    style={{
                      alignSelf: "flex-start", border: "none", background: COLORS.ink, color: "#fff",
                      fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 20,
                    }}
                  >
                    Submit
                  </button>
                </div>
              )}

              {orders.length > 0 && (
                <div>
                  <label className="rt-mono" style={{ fontSize: 11, color: COLORS.mute }}>LINK TO AN ORDER (OPTIONAL)</label>
                  <select value={supportOrderId} onChange={(e) => setSupportOrderId(e.target.value)} style={{
                    display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
                    borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel, fontSize: 14,
                  }}>
                    <option value="">No specific order</option>
                    {[...orders].reverse().map((o) => (
                      <option key={o.id} value={o.id}>#{o.id} — {o.vendor.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {view === "favorites" && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <button onClick={() => setView("browse")} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back
          </button>
          <h2 className="rt-display" style={{ fontSize: 19, margin: "0 0 14px" }}>Your Favorites</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {vendors.filter((v) => myFavorites.includes(v.id)).map((v) => (
              <button
                key={v.id}
                onClick={() => { setVendorId(v.id); setCart({}); setSubFilter("All"); setCategory(v.category); setView("vendor"); }}
                style={{
                  textAlign: "left", background: COLORS.panel, border: `1px solid ${COLORS.line}`,
                  borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14,
                }}
              >
                <Thumb emoji={v.emoji} category={v.category} size={52} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 15.5 }}>{v.name}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Pill tone="indigo">{v.area}</Pill>
                    {v.isActive === false ? (
                      <Pill tone="chili">Unavailable</Pill>
                    ) : v.isOpen ? (
                      <span style={{ fontSize: 12.5, color: COLORS.mute }}>{v.eta}</span>
                    ) : (
                      <Pill tone="chili">Closed</Pill>
                    )}
                  </div>
                </div>
                <span style={{ color: COLORS.chili, fontSize: 18 }}>♥</span>
              </button>
            ))}
            {myFavorites.length === 0 && (
              <p style={{ color: COLORS.mute, fontSize: 14 }}>
                No favorites yet — tap the heart on any vendor to save it here.
              </p>
            )}
          </div>
        </div>
      )}

      {view === "orders" && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <button onClick={() => setView("browse")} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 13, marginBottom: 10, padding: 0 }}>
            ← Back
          </button>
          <h2 className="rt-display" style={{ fontSize: 19, margin: "0 0 14px" }}>My Orders</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...orders].reverse().map((o) => {
              const canReorder = o.status === "delivered" || o.status === "cancelled";
              return (
                <div key={o.id} style={{
                  background: COLORS.panel, border: `1px solid ${COLORS.line}`,
                  borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <button
                    onClick={() => { setMyOrderId(o.id); setReportOpen(false); setDisputeOtherNote(null); setVendorStars(0); setRiderStars(0); setReviewComment(""); setView("tracking"); }}
                    style={{ textAlign: "left", background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id} · {timeAgo(o.createdAt)}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {o.paymentStatus === "pending" && o.status !== "cancelled" && <Pill tone="mango">Payment needed</Pill>}
                        {StatusPillFor(o.status)}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>{o.vendor.name}</span>
                      <span className="rt-mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmtNaira(o.total)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setExpandedMyOrderId(expandedMyOrderId === o.id ? null : o.id)}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", color: COLORS.indigo, fontWeight: 700, fontSize: 12, padding: 0, cursor: "pointer" }}
                  >
                    {expandedMyOrderId === o.id ? "Hide items ▲" : `View items (${o.items.length}) ▼`}
                  </button>
                  {expandedMyOrderId === o.id && (
                    <div style={{ background: COLORS.paper, borderRadius: 10, padding: 10 }}>
                      {o.items.map((i) => (
                        <div key={i.id} style={{ fontSize: 13, color: COLORS.ink, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                      ))}
                    </div>
                  )}
                  {canReorder && (
                    <button
                      onClick={(e) => { e.stopPropagation(); reorder(o); }}
                      style={{
                        alignSelf: "flex-start", border: `1px solid ${COLORS.mango}`, background: "none", color: "#B8710A",
                        fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 20, marginTop: 2,
                      }}
                    >
                      ↻ Reorder
                    </button>
                  )}
                </div>
              );
            })}
            {orders.length === 0 && (
              <p style={{ color: COLORS.mute, fontSize: 14 }}>No orders yet — go place one!</p>
            )}
          </div>
        </div>
      )}

      {view === "tracking" && myOrder && (
        <div style={{ padding: "16px 20px 100px", flex: 1 }}>
          <h2 className="rt-display" style={{ fontSize: 19, margin: "0 0 6px" }}>Order #{myOrder.id}</h2>
          <p style={{ color: COLORS.mute, fontSize: 13.5, marginTop: 0 }}>{myOrder.vendor.name} · {fmtNaira(myOrder.total)}</p>
          {myOrder.deliveryAddress && (
            <p style={{ color: COLORS.mute, fontSize: 12.5, marginTop: -2, marginBottom: 4 }}>
              📍 {myOrder.deliveryAddress}{myOrder.customerPhone ? ` · ${myOrder.customerPhone}` : ""}
            </p>
          )}

          {myOrder.status !== "cancelled" && myOrder.paymentStatus === "pending" && (
            <div style={{
              background: "#FFF1DA", border: `1px solid ${COLORS.mango}`, borderRadius: 12, padding: 14, marginTop: 14, marginBottom: 4,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Payment required</div>
              <div style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>
                {myOrder.vendor.name} won't see this order until payment is confirmed.
              </div>
              <button
                onClick={() => {
                  setPayingOrderId(myOrder.id);
                  setTimeout(() => { confirmPayment(myOrder.id); setPayingOrderId(null); }, 900);
                }}
                disabled={payingOrderId === myOrder.id}
                style={{
                  width: "100%", border: "none", background: COLORS.ink, color: "#fff", fontWeight: 700,
                  padding: "12px 0", borderRadius: 12, fontSize: 14.5,
                  opacity: payingOrderId === myOrder.id ? 0.6 : 1,
                }}
              >
                {payingOrderId === myOrder.id ? "Processing payment…" : `Pay ${fmtNaira(myOrder.total)}`}
              </button>
            </div>
          )}

          {myOrder.status === "placed" && myOrder.paymentStatus !== "refunded" && (
            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <button
                onClick={() => cancelOrder(myOrder.id)}
                style={{
                  border: `1px solid ${COLORS.line}`, background: "none", color: COLORS.mute,
                  fontWeight: 600, fontSize: 12.5, padding: "8px 14px", borderRadius: 20,
                }}
              >
                Cancel this order
              </button>
            </div>
          )}

          {myOrder.status === "cancelled" ? (
            <div style={{
              background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: COLORS.chili, marginBottom: 4 }}>
                {myOrder.cancelReason ? `${myOrder.vendor.name} couldn't take your order` : "Order cancelled"}
              </div>
              <div style={{ fontSize: 13.5, marginBottom: myOrder.cancelReason ? 10 : 0 }}>
                {myOrder.cancelReason && <>{myOrder.cancelReason} — sorry about that!<br /></>}
                {myOrder.paymentStatus === "refunded"
                  ? `Your payment of ${fmtNaira(myOrder.total)} has been refunded — it should reflect in a few minutes.`
                  : "You haven't been charged for this order."}
              </div>
              <button
                onClick={() => setView("browse")}
                style={{
                  border: "none", background: COLORS.ink, color: "#fff", fontWeight: 700, fontSize: 13,
                  padding: "10px 16px", borderRadius: 20,
                }}
              >
                Try another vendor →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 20 }}>
              {STATUS_FLOW.map((s, idx) => {
                const currentIdx = STATUS_FLOW.indexOf(myOrder.status);
                const done = idx <= currentIdx;
                return (
                  <div key={s} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: done ? COLORS.green : COLORS.line,
                      }} />
                      {idx < STATUS_FLOW.length - 1 && (
                        <div style={{ width: 2, flex: 1, minHeight: 24, background: done ? COLORS.green : COLORS.line }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 20 }}>
                      <div style={{ fontWeight: done ? 700 : 500, fontSize: 14, color: done ? COLORS.ink : COLORS.mute }}>
                        {STATUS_LABEL[s]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {myOrder.rider && (() => {
            const assignedRider = riders.find((r) => r.name === myOrder.rider);
            return (
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12,
              marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "#FFF1DA",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0,
              }}>
                {assignedRider?.emoji || "🛵"}
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.mute }}>Your rider</div>
                <div style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {myOrder.rider}
                  {assignedRider && (
                    <span className="rt-mono" style={{ fontSize: 12, color: COLORS.mute, fontWeight: 500 }}>
                      ★ {assignedRider.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })()}

          {myOrder.status === "delivered" && (
            <div style={{ marginBottom: 16 }}>
              {myReview ? (
                <div style={{ background: "#E5F2E9", border: `1px solid ${COLORS.green}`, borderRadius: 12, padding: 12, fontSize: 13.5 }}>
                  Thanks for your feedback! You rated {myOrder.vendor.name} {myReview.vendorRating}★
                  {myReview.riderRating ? ` and your rider ${myReview.riderRating}★` : ""}.
                </div>
              ) : (
                <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Rate your order</div>
                  <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 6 }}>{myOrder.vendor.name}</div>
                  <StarRating value={vendorStars} onChange={setVendorStars} />
                  {myOrder.rider && (
                    <>
                      <div style={{ fontSize: 12.5, color: COLORS.mute, margin: "12px 0 6px" }}>Your rider, {myOrder.rider}</div>
                      <StarRating value={riderStars} onChange={setRiderStars} />
                    </>
                  )}
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Anything you'd like to add? (optional)"
                    rows={2}
                    style={{
                      display: "block", width: "100%", marginTop: 12, padding: "10px 12px",
                      borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel,
                      fontSize: 14, fontFamily: "inherit", resize: "vertical",
                    }}
                  />
                  <button
                    onClick={() => {
                      submitReview(myOrder, vendorStars, riderStars, reviewComment.trim(), customerName);
                      setVendorStars(0); setRiderStars(0); setReviewComment("");
                    }}
                    disabled={vendorStars === 0}
                    style={{
                      marginTop: 12, border: "none", background: COLORS.ink, color: "#fff", fontWeight: 700,
                      fontSize: 13.5, padding: "10px 18px", borderRadius: 20,
                      opacity: vendorStars === 0 ? 0.4 : 1,
                    }}
                  >
                    Submit rating
                  </button>
                </div>
              )}
            </div>
          )}

          {myOrder.status === "delivered" && (
            <div style={{ marginBottom: 16 }}>
              {existingDispute ? (
                <div style={{ background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, fontSize: 13.5 }}>
                  Issue reported: <strong>{existingDispute.reason}</strong> — our team is looking into it.
                </div>
              ) : reportOpen ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, color: COLORS.mute }}>What went wrong?</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {["Missing item", "Wrong item", "Poor food quality", "Item damaged", "Arrived late", "Other"].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => (reason === "Other" ? setDisputeOtherNote("") : raiseDispute(myOrder, reason))}
                        style={{
                          border: `1px solid ${COLORS.line}`, background: COLORS.panel, borderRadius: 20,
                          padding: "7px 13px", fontSize: 12.5, fontWeight: 600,
                        }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  {disputeOtherNote !== null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      <textarea
                        value={disputeOtherNote}
                        onChange={(e) => setDisputeOtherNote(e.target.value)}
                        placeholder="Tell us what happened…"
                        rows={3}
                        style={{
                          border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px",
                          fontSize: 14, fontFamily: "inherit", resize: "vertical",
                        }}
                      />
                      <button
                        onClick={() => {
                          const note = disputeOtherNote.trim();
                          raiseDispute(myOrder, note ? `Other: ${note}` : "Other");
                          setDisputeOtherNote(null);
                        }}
                        style={{
                          alignSelf: "flex-start", border: "none", background: COLORS.ink, color: "#fff",
                          fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 20,
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setReportOpen(true)} style={{
                  border: `1px solid ${COLORS.chili}`, background: "none", color: COLORS.chili,
                  fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 20,
                }}>
                  Report an issue
                </button>
              )}
            </div>
          )}

          {(myOrder.status === "delivered" || myOrder.status === "cancelled") && (
            <button onClick={() => reorder(myOrder)} style={{
              display: "block", width: "100%", border: `1px solid ${COLORS.mango}`, background: "none", color: "#B8710A",
              fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 12, marginBottom: 14,
            }}>
              ↻ Reorder this
            </button>
          )}

          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={() => setView("orders")} style={{
              border: "none", background: "none", color: COLORS.mute, fontWeight: 700, fontSize: 13.5, padding: 0,
            }}>
              ← My Orders
            </button>
            <button onClick={() => { setView("browse"); setVendorId(null); }} style={{
              border: "none", background: "none", color: COLORS.indigo, fontWeight: 700, fontSize: 13.5, padding: 0,
            }}>
              Order something else
            </button>
          </div>
        </div>
      )}

      {(view === "vendor" || view === "browse") && cartCount > 0 && (
        <button onClick={() => setView("cart")} style={{
          position: "fixed", bottom: 18, left: 20, right: 20, maxWidth: 460, margin: "0 auto",
          border: "none", background: cartLines.some((l) => l.item.isAvailable === false) ? COLORS.chili : COLORS.mango,
          color: "#fff", fontWeight: 700, fontSize: 14.5,
          padding: "14px 18px", borderRadius: 14, display: "flex", justifyContent: "space-between",
          boxShadow: "0 8px 24px rgba(255,158,27,0.35)",
        }}>
          <span>
            {cartLines.some((l) => l.item.isAvailable === false)
              ? "⚠ Review cart — an item became unavailable"
              : `View cart · ${cartCount} item${cartCount > 1 ? "s" : ""}`}
          </span>
          <span className="rt-mono">{fmtNaira(cartTotal)}</span>
        </button>
      )}
    </div>
  );
}

const qtyBtnStyle = {
  width: 26, height: 26, borderRadius: "50%", border: `1px solid ${COLORS.line}`,
  background: "#fff", fontWeight: 700, fontSize: 15, lineHeight: "1",
};

/* ---------------- VENDOR ---------------- */

function VendorApp({ orders, advanceOrder, cancelOrder, vendors, updatePrice, addProduct, disputes, toggleVendorOpen, addAddOn, removeAddOn, toggleProductAvailable }) {
  const sellableVendors = vendors.filter((v) => v.category !== "Local Market");
  const [activeVendorId, setActiveVendorId] = useState(sellableVendors[0].id);
  const activeVendor = vendors.find((v) => v.id === activeVendorId);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);
  // PAID or REFUNDED, not strictly PAID — a declined order flips to
  // "refunded" the instant it's cancelled (see cancelOrder below), so
  // requiring strictly "paid" here meant a vendor's own declined orders
  // would vanish from their view the moment they declined them, and the
  // Declined section below could never show anything, for any order, ever.
  const myOrders = orders.filter((o) => o.vendor.id === activeVendorId && (o.paymentStatus === "paid" || o.paymentStatus === "refunded"));
  const queue = myOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const history = myOrders.filter((o) => o.status === "delivered");
  const declined = myOrders.filter((o) => o.status === "cancelled");
  const myDisputes = disputes.filter((d) => d.vendorId === activeVendorId);
  const openDisputes = myDisputes.filter((d) => d.status === "open");
  // Revenue counts PAID orders only — a refunded order stays visible above
  // for record-keeping (that's the Declined section) but doesn't count as
  // money made, since it went back to the customer.
  const paidOrders = myOrders.filter((o) => o.paymentStatus === "paid");
  const todayRevenue = paidOrders.reduce((s, o) => s + o.total, 0);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newEmoji, setNewEmoji] = useState("🍽️");
  const [manageAddOnsItemId, setManageAddOnsItemId] = useState(null);
  const [newAddOnName, setNewAddOnName] = useState("");
  const [newAddOnPrice, setNewAddOnPrice] = useState("");

  const startEdit = (item) => { setEditingItemId(item.id); setEditPrice(String(item.price)); };
  const saveEdit = (itemId) => {
    const price = parseInt(editPrice, 10);
    if (!isNaN(price) && price > 0) updatePrice(activeVendorId, itemId, price);
    setEditingItemId(null);
  };

  const submitNewProduct = () => {
    const price = parseInt(newPrice, 10);
    if (!newName.trim() || isNaN(price) || price <= 0) return;
    addProduct(activeVendorId, {
      id: `custom-${Date.now()}`, name: newName.trim(), price, emoji: newEmoji || "🍽️",
    });
    setNewName(""); setNewPrice(""); setNewEmoji("🍽️"); setShowAddForm(false);
  };

  const openManageAddOns = (item) => {
    setManageAddOnsItemId(manageAddOnsItemId === item.id ? null : item.id);
    setNewAddOnName(""); setNewAddOnPrice("");
  };
  const submitNewAddOn = (itemId) => {
    const price = parseInt(newAddOnPrice, 10);
    if (!newAddOnName.trim() || isNaN(price) || price <= 0) return;
    addAddOn(activeVendorId, itemId, {
      id: `addon-${Date.now()}`, name: newAddOnName.trim(), price,
    });
    setNewAddOnName(""); setNewAddOnPrice("");
  };

  return (
    <div style={{ padding: "16px 20px 40px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <label className="rt-mono" style={{ fontSize: 11, color: COLORS.mute }}>SIGNED IN AS</label>
          <select value={activeVendorId} onChange={(e) => setActiveVendorId(e.target.value)} style={{
            display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
            borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.panel, fontSize: 14, fontWeight: 600,
          }}>
            {sellableVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => activeVendor.isActive !== false && toggleVendorOpen(activeVendorId)}
          disabled={activeVendor.isActive === false}
          style={{
            border: "none", borderRadius: 20, padding: "10px 14px", fontWeight: 700, fontSize: 12.5,
            background: activeVendor.isActive === false ? COLORS.chili : activeVendor.isOpen ? COLORS.green : COLORS.chili, color: "#fff", whiteSpace: "nowrap",
            cursor: activeVendor.isActive === false ? "not-allowed" : "pointer",
          }}
        >
          {activeVendor.isActive === false ? "⊘ Suspended" : activeVendor.isOpen ? "● Open" : "○ Closed"}
        </button>
      </div>

      {activeVendor.isActive === false ? (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          Your store has been <strong>suspended</strong> by Route. Contact support if you believe this is a mistake — customers can't see you in Browse or place new orders until this is lifted.
        </div>
      ) : !activeVendor.isOpen && (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          Your store is <strong>closed</strong> — customers can't see you in Browse or place new orders. Orders already in progress are unaffected.
        </div>
      )}

      {openDisputes.length > 0 && (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          <strong style={{ color: COLORS.chili }}>{openDisputes.length} open dispute{openDisputes.length > 1 ? "s" : ""}</strong> on your orders — see below.
        </div>
      )}

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div className="rt-mono" style={{ fontSize: 10, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 }}>
          REVENUE TODAY — this session only, resets on reload until orders persist in a backend
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="rt-display" style={{ fontSize: 22 }}>{fmtNaira(todayRevenue)}</span>
          <span style={{ fontSize: 13, color: COLORS.mute }}>{paidOrders.length} paid order{paidOrders.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <h2 className="rt-display" style={{ fontSize: 17, margin: "0 0 12px" }}>Active orders ({queue.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
        {queue.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No active orders right now.</p>}
        {queue.map((o) => (
          <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id} · {timeAgo(o.createdAt)}</span>
              {StatusPillFor(o.status)}
            </div>
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              {o.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{i.qty} × {i.name}</span>
                  <span className="rt-mono">{fmtNaira(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="rt-mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{fmtNaira(o.total)}</span>
              {o.status === "placed" && decliningOrderId !== o.id && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setDecliningOrderId(o.id)} style={{
                    border: `1px solid ${COLORS.chili}`, background: "none", color: COLORS.chili, fontWeight: 700,
                    fontSize: 12.5, padding: "8px 12px", borderRadius: 20,
                  }}>
                    Decline
                  </button>
                  <button onClick={() => advanceOrder(o.id, "accepted")} style={actionBtn(COLORS.ink)}>Accept order</button>
                </div>
              )}
            </div>
            {o.status === "placed" && decliningOrderId === o.id && (
              <div style={{ background: COLORS.paper, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>Why are you declining this order?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                  {["Item(s) out of stock", "Kitchen too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => {
                        if (reason === "Other") { setDeclineOtherNote(""); return; }
                        cancelOrder(o.id, reason);
                        setDecliningOrderId(null);
                      }}
                      style={{ border: `1px solid ${COLORS.line}`, background: "#fff", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                {declineOtherNote !== null && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={declineOtherNote} onChange={(e) => setDeclineOtherNote(e.target.value)}
                      placeholder="Say a bit more…" style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5 }}
                    />
                    <button
                      onClick={() => { cancelOrder(o.id, declineOtherNote.trim() || "Other"); setDecliningOrderId(null); setDeclineOtherNote(null); }}
                      style={actionBtn(COLORS.chili)}
                    >
                      Send
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}
                  style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 12, marginTop: 8, padding: 0 }}
                >
                  Never mind
                </button>
              </div>
            )}
              {o.status === "accepted" && (
                <button onClick={() => advanceOrder(o.id, "ready")} style={actionBtn(COLORS.green)}>Mark ready</button>
              )}
              {(o.status === "ready" || o.status === "picked_up") && (
                <Pill tone="mango">Waiting on rider</Pill>
              )}
          </div>
        ))}
      </div>

      <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Completed today ({history.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 26 }}>
        {history.map((o) => {
          const expanded = expandedHistoryId === o.id;
          return (
            <div key={o.id} style={{ background: expanded ? COLORS.panel : "transparent", border: expanded ? `1px solid ${COLORS.line}` : "none", borderRadius: expanded ? 10 : 0, padding: expanded ? 10 : 0 }}>
              <button
                onClick={() => setExpandedHistoryId(expanded ? null : o.id)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", padding: 0, fontSize: 13, color: COLORS.mute, cursor: "pointer" }}
              >
                <span>#{o.id}</span>
                <span className="rt-mono">{fmtNaira(o.total)}</span>
              </button>
              {expanded && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 6 }}>
                    {new Date(o.deliveredAt || o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {o.items.map((i) => (
                    <div key={i.id} style={{ fontSize: 13, color: COLORS.ink, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {declined.length > 0 && (
        <>
          <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Declined ({declined.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 26 }}>
            {declined.map((o) => {
              const expanded = expandedHistoryId === o.id;
              return (
                <div key={o.id} style={{ background: expanded ? COLORS.panel : "transparent", border: expanded ? `1px solid ${COLORS.line}` : "none", borderRadius: expanded ? 10 : 0, padding: expanded ? 10 : 0 }}>
                  <button
                    onClick={() => setExpandedHistoryId(expanded ? null : o.id)}
                    style={{ display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", padding: 0, fontSize: 13, color: COLORS.mute, cursor: "pointer" }}
                  >
                    <span>#{o.id}</span>
                    <span className="rt-mono">{fmtNaira(o.total)}</span>
                  </button>
                  {expanded && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COLORS.mute}` }}>
                      <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 6 }}>
                        {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {o.items.map((i) => (
                        <div key={i.id} style={{ fontSize: 13, color: COLORS.ink, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 className="rt-display" style={{ fontSize: 17, margin: "0 0 12px" }}>Disputes ({myDisputes.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
        {myDisputes.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No disputes on your orders.</p>}
        {myDisputes.map((d) => (
          <div key={d.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: d.status === "resolved" ? COLORS.panel : (d.status === "open" ? "#FCE8E6" : "#FFF1DA"),
            border: `1px solid ${d.status === "resolved" ? COLORS.line : (d.status === "open" ? COLORS.chili : COLORS.mango)}`, borderRadius: 12, padding: 12,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.reason}</div>
              <div style={{ fontSize: 12, color: COLORS.mute }}>Order #{d.orderId} · {fmtNaira(d.total)} · {timeAgo(d.createdAt)}</div>
            </div>
            {CaseStatusPill(d.status)}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 className="rt-display" style={{ fontSize: 17, margin: 0 }}>My products ({activeVendor.items.length})</h2>
        <button onClick={() => setShowAddForm((s) => !s)} style={actionBtn(COLORS.mango)}>
          {showAddForm ? "Cancel" : "+ Add product"}
        </button>
      </div>

      {showAddForm && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Product name"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Emoji"
              style={{ ...inputStyle, width: 60, textAlign: "center", flex: "none" }}
            />
            <input
              value={newPrice} onChange={(e) => setNewPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Price (₦)"
              inputMode="numeric" style={inputStyle}
            />
          </div>
          <button onClick={submitNewProduct} style={{ ...actionBtn(COLORS.ink), padding: "10px 0", textAlign: "center" }}>
            Save product
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeVendor.items.map((i) => (
          <div key={i.id} style={{
            display: "flex", flexDirection: "column", gap: 10,
            background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12,
            opacity: i.isAvailable === false ? 0.55 : 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Thumb emoji={i.emoji} category={activeVendor.category} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{i.name}</div>
                  {i.subcategory && <div style={{ fontSize: 11.5, color: COLORS.mute }}>{i.subcategory}</div>}
                </div>
              </div>
              {editingItemId === i.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={editPrice} onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric" style={{ ...inputStyle, width: 84, padding: "6px 8px" }}
                  />
                  <button onClick={() => saveEdit(i.id)} style={actionBtn(COLORS.green)}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="rt-mono" style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(i.price)}</span>
                  <button onClick={() => startEdit(i)} style={{
                    border: `1px solid ${COLORS.line}`, background: "none", borderRadius: 20,
                    padding: "6px 12px", fontSize: 12, fontWeight: 600, color: COLORS.ink,
                  }}>
                    Edit price
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${COLORS.line}`, paddingTop: 8 }}>
              <span style={{ fontSize: 12, color: i.isAvailable === false ? COLORS.chili : COLORS.green, fontWeight: 600 }}>
                {i.isAvailable === false ? "Unavailable right now" : "Available"}
              </span>
              <button
                onClick={() => toggleProductAvailable(activeVendorId, i.id)}
                style={{
                  border: "none", borderRadius: 20, padding: "6px 12px", fontWeight: 700, fontSize: 12,
                  background: i.isAvailable === false ? COLORS.green : COLORS.chili, color: "#fff",
                }}
              >
                {i.isAvailable === false ? "Mark available" : "Mark unavailable"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${COLORS.line}`, paddingTop: 8 }}>
              <span style={{ fontSize: 12, color: COLORS.mute }}>
                {(i.addOns || []).length > 0 ? `${i.addOns.length} add-on${i.addOns.length > 1 ? "s" : ""}` : "No add-ons yet"}
              </span>
              <button onClick={() => openManageAddOns(i)} style={{
                border: `1px solid ${COLORS.line}`, background: "none", borderRadius: 20,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, color: COLORS.indigo,
              }}>
                {manageAddOnsItemId === i.id ? "Close" : "Manage add-ons"}
              </button>
            </div>

            {manageAddOnsItemId === i.id && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(i.addOns || []).map((a) => (
                  <div key={a.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 10px",
                  }}>
                    <span style={{ fontSize: 13 }}>{a.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="rt-mono" style={{ fontSize: 12, color: COLORS.mute }}>{fmtNaira(a.price)}</span>
                      <button onClick={() => removeAddOn(activeVendorId, i.id, a.id)} style={{
                        border: "none", background: "none", color: COLORS.chili, fontWeight: 700, fontSize: 13, padding: 0,
                      }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={newAddOnName} onChange={(e) => setNewAddOnName(e.target.value)} placeholder="Add-on name"
                    style={{ ...inputStyle }}
                  />
                  <input
                    value={newAddOnPrice} onChange={(e) => setNewAddOnPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="₦" inputMode="numeric" style={{ ...inputStyle, width: 64, flex: "none" }}
                  />
                  <button onClick={() => submitNewAddOn(i.id)} style={actionBtn(COLORS.mango)}>Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px",
  fontSize: 14, flex: 1, fontFamily: "inherit",
};

const actionBtn = (bg) => ({
  border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 12.5,
  padding: "8px 12px", borderRadius: 20,
});

// Compact input style for the admin profile/verification edit forms —
// module-level so it isn't recreated on every render.
const miniInput = {
  border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px",
  fontSize: 12.5, color: COLORS.ink, background: "#fff", width: "100%", boxSizing: "border-box",
};

/* ---------------- RELATION MANAGER (Local Market) ---------------- */

function ManagerApp({ orders, advanceOrder, cancelOrder, vendors, toggleVendorOpen }) {
  const managerName = "Amaka O.";
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);
  const localMarketVendor = vendors.find((v) => v.id === LOCAL_MARKET_VENDOR.id);
  const marketOrders = orders.filter((o) => o.vendor.id === LOCAL_MARKET_VENDOR.id && (o.paymentStatus === "paid" || o.paymentStatus === "refunded"));
  const newOrders = marketOrders.filter((o) => o.status === "placed");
  const sorting = marketOrders.filter((o) => o.status === "accepted");
  const readyForRider = marketOrders.filter((o) => o.status === "ready" || o.status === "picked_up");
  const history = marketOrders.filter((o) => o.status === "delivered");
  const declined = marketOrders.filter((o) => o.status === "cancelled");
  const paidOrders = marketOrders.filter((o) => o.paymentStatus === "paid");
  const todayRevenue = paidOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div style={{ padding: "16px 20px 40px", flex: 1 }}>
      <div style={{
        background: COLORS.indigo, color: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{managerName}</div>
          <div className="rt-mono" style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}>
            Relation Manager · {LOCAL_MARKET_VENDOR.name}
          </div>
        </div>
        <button
          onClick={() => localMarketVendor.isActive !== false && toggleVendorOpen(localMarketVendor.id)}
          disabled={localMarketVendor.isActive === false}
          style={{
            border: "none", borderRadius: 20, padding: "8px 14px", fontWeight: 700, fontSize: 12.5,
            background: localMarketVendor.isActive === false ? COLORS.chili : localMarketVendor.isOpen ? COLORS.green : COLORS.chili, color: "#fff", whiteSpace: "nowrap",
            cursor: localMarketVendor.isActive === false ? "not-allowed" : "pointer",
          }}
        >
          {localMarketVendor.isActive === false ? "⊘ Suspended" : localMarketVendor.isOpen ? "● Open" : "○ Closed"}
        </button>
      </div>

      {localMarketVendor.isActive === false ? (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          Local Market has been <strong>suspended</strong> by Route. Contact support if you believe this is a mistake — customers can't browse or order from Local Market until this is lifted.
        </div>
      ) : !localMarketVendor.isOpen && (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          The market is <strong>closed</strong> — customers can't browse or order from Local Market right now.
        </div>
      )}

      {newOrders.length > 0 && (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18,
          fontSize: 13.5,
        }}>
          <strong style={{ color: COLORS.chili }}>{newOrders.length} new order{newOrders.length > 1 ? "s" : ""}</strong> just came in from the Local Market category — no vendor handles these, so sort and pack them yourself before a rider arrives.
        </div>
      )}

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div className="rt-mono" style={{ fontSize: 10, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 }}>
          REVENUE TODAY — this session only, resets on reload until orders persist in a backend
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="rt-display" style={{ fontSize: 22 }}>{fmtNaira(todayRevenue)}</span>
          <span style={{ fontSize: 13, color: COLORS.mute }}>{paidOrders.length} paid order{paidOrders.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <h2 className="rt-display" style={{ fontSize: 17, margin: "0 0 12px" }}>New orders ({newOrders.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {newOrders.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>Nothing waiting to be sorted.</p>}
        {newOrders.map((o) => (
          <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id} · {timeAgo(o.createdAt)}</span>
              {StatusPillFor(o.status)}
            </div>
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              {o.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="rt-mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{fmtNaira(o.total)}</span>
              {decliningOrderId !== o.id && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setDecliningOrderId(o.id)} style={{
                    border: `1px solid ${COLORS.chili}`, background: "none", color: COLORS.chili, fontWeight: 700,
                    fontSize: 12.5, padding: "8px 12px", borderRadius: 20,
                  }}>
                    Decline
                  </button>
                  <button onClick={() => advanceOrder(o.id, "accepted")} style={actionBtn(COLORS.ink)}>Start sorting</button>
                </div>
              )}
            </div>
            {decliningOrderId === o.id && (
              <div style={{ background: COLORS.paper, borderRadius: 10, padding: 10, marginTop: 8 }}>
                <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>Why are you declining this order?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                  {["Item(s) out of stock", "Too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => {
                        if (reason === "Other") { setDeclineOtherNote(""); return; }
                        cancelOrder(o.id, reason);
                        setDecliningOrderId(null);
                      }}
                      style={{ border: `1px solid ${COLORS.line}`, background: "#fff", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                {declineOtherNote !== null && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={declineOtherNote} onChange={(e) => setDeclineOtherNote(e.target.value)}
                      placeholder="Say a bit more…" style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5 }}
                    />
                    <button
                      onClick={() => { cancelOrder(o.id, declineOtherNote.trim() || "Other"); setDecliningOrderId(null); setDeclineOtherNote(null); }}
                      style={actionBtn(COLORS.chili)}
                    >
                      Send
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}
                  style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 12, marginTop: 8, padding: 0 }}
                >
                  Never mind
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="rt-display" style={{ fontSize: 17, margin: "0 0 12px" }}>Sorting ({sorting.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {sorting.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>Nothing in progress.</p>}
        {sorting.map((o) => (
          <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id} · {timeAgo(o.createdAt)}</span>
              {StatusPillFor(o.status)}
            </div>
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              {o.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="rt-mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{fmtNaira(o.total)}</span>
              <button onClick={() => advanceOrder(o.id, "ready")} style={actionBtn(COLORS.green)}>Ready for rider</button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>
        Waiting on rider ({readyForRider.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {readyForRider.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>None right now.</p>}
        {readyForRider.map((o) => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>#{o.id}</span>
            {StatusPillFor(o.status)}
          </div>
        ))}
      </div>

      <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Completed today ({history.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: declined.length > 0 ? 20 : 0 }}>
        {history.map((o) => {
          const expanded = expandedHistoryId === o.id;
          return (
            <div key={o.id} style={{ background: expanded ? COLORS.panel : "transparent", border: expanded ? `1px solid ${COLORS.line}` : "none", borderRadius: expanded ? 10 : 0, padding: expanded ? 10 : 0 }}>
              <button
                onClick={() => setExpandedHistoryId(expanded ? null : o.id)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", padding: 0, fontSize: 13, color: COLORS.mute, cursor: "pointer" }}
              >
                <span>#{o.id}</span>
                <span className="rt-mono">{fmtNaira(o.total)}</span>
              </button>
              {expanded && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 6 }}>
                    {new Date(o.deliveredAt || o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {o.items.map((i) => (
                    <div key={i.id} style={{ fontSize: 13, color: COLORS.ink, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {declined.length > 0 && (
        <>
          <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Declined ({declined.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {declined.map((o) => {
              const expanded = expandedHistoryId === o.id;
              return (
                <div key={o.id} style={{ background: expanded ? COLORS.panel : "transparent", border: expanded ? `1px solid ${COLORS.line}` : "none", borderRadius: expanded ? 10 : 0, padding: expanded ? 10 : 0 }}>
                  <button
                    onClick={() => setExpandedHistoryId(expanded ? null : o.id)}
                    style={{ display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", padding: 0, fontSize: 13, color: COLORS.mute, cursor: "pointer" }}
                  >
                    <span>#{o.id}</span>
                    <span className="rt-mono">{fmtNaira(o.total)}</span>
                  </button>
                  {expanded && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COLORS.mute}` }}>
                      <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 6 }}>
                        {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {o.items.map((i) => (
                        <div key={i.id} style={{ fontSize: 13, color: COLORS.ink, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- RIDER ---------------- */

const PER_DELIVERY_RATE = 600;

function RiderApp({ orders, advanceOrder, assignRider, riders, toggleRiderOnline, payouts, setRiderBankAccount, requestPayout, raiseOperationalIssue }) {
  // Demo identity switcher, same pattern as CustomerApp's DEMO_CUSTOMERS —
  // no real auth yet, so this stands in for "which rider is logged in."
  const [activeRiderId, setActiveRiderId] = useState(riders[0].id);
  const activeRider = riders.find((r) => r.id === activeRiderId) || riders[0];
  const riderName = activeRider.name;
  const isOnline = activeRider.isOnline;
  const isSuspended = activeRider.isActive === false;

  const available = orders.filter((o) => o.status === "ready" && !o.rider);
  const active = orders.filter((o) => o.rider === riderName && (o.status === "ready" || o.status === "picked_up"));
  const completedToday = orders.filter((o) => o.rider === riderName && o.status === "delivered");
  const todayCount = completedToday.length;
  const todayEarnings = todayCount * PER_DELIVERY_RATE;

  const myPayouts = payouts.filter((p) => p.riderId === activeRider.id);
  const totalPaidOut = myPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = myPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  // "Earned" is session-only, same honesty boundary as the Today stat
  // above — App.jsx has no persistence, so this can never be a true
  // lifetime total the way the real backend's balance calculation is.
  const availableBalance = Math.max(todayEarnings - totalPaidOut - totalPending, 0);
  const hasBankDetails = !!activeRider.bankAccountNumber;

  const [showBankForm, setShowBankForm] = useState(!hasBankDetails);
  const [bankDraft, setBankDraft] = useState({
    bankName: activeRider.bankName || "", bankAccountNumber: activeRider.bankAccountNumber || "", bankAccountName: activeRider.bankAccountName || "",
  });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportOtherNote, setReportOtherNote] = useState(null);

  const saveBankDetails = () => {
    if (!bankDraft.bankName.trim() || !bankDraft.bankAccountNumber.trim() || !bankDraft.bankAccountName.trim()) return;
    setRiderBankAccount(activeRider.id, bankDraft);
    setShowBankForm(false);
  };

  const submitWithdrawal = () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || amount <= 0) { setWithdrawError("Enter a valid amount."); return; }
    if (amount > availableBalance) { setWithdrawError(`Amount exceeds your available balance of ${fmtNaira(availableBalance)}.`); return; }
    requestPayout(activeRider.id, activeRider.name, amount);
    setWithdrawAmount("");
    setWithdrawError(null);
  };

  useEffect(() => {
    setShowBankForm(!activeRider.bankAccountNumber);
    setBankDraft({ bankName: activeRider.bankName || "", bankAccountNumber: activeRider.bankAccountNumber || "", bankAccountName: activeRider.bankAccountName || "" });
    setWithdrawAmount("");
    setWithdrawError(null);
    setShowReportForm(false);
    setReportSubmitted(false);
    setReportOtherNote(null);
  }, [activeRiderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "16px 20px 40px", flex: 1 }}>
      <select
        value={activeRiderId}
        onChange={(e) => setActiveRiderId(e.target.value)}
        className="rt-mono"
        style={{
          width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 10,
          border: `1px solid ${COLORS.line}`, fontSize: 12, background: COLORS.panel, color: COLORS.mute,
        }}
      >
        {riders.map((r) => <option key={r.id} value={r.id}>Viewing as: {r.name}{r.isActive === false ? " (suspended)" : ""}</option>)}
      </select>

      <div style={{
        background: COLORS.indigo, color: "#fff", borderRadius: 14, padding: 16, marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{riderName}</div>
          <div className="rt-mono" style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}>Okada · {activeRider.zone} zone</div>
        </div>
        <button
          onClick={() => !isSuspended && toggleRiderOnline(activeRider.id)}
          disabled={isSuspended}
          style={{
            border: "none", borderRadius: 20, padding: "8px 14px", fontWeight: 700, fontSize: 12.5,
            background: isSuspended ? COLORS.chili : isOnline ? COLORS.green : "rgba(255,255,255,0.15)", color: "#fff",
            cursor: isSuspended ? "not-allowed" : "pointer",
          }}
        >
          {isSuspended ? "⊘ Suspended" : isOnline ? "● Online" : "○ Offline"}
        </button>
      </div>

      {isSuspended && (
        <div style={{
          background: "#FCE8E6", border: `1px solid ${COLORS.chili}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5,
        }}>
          Your account has been suspended by Route. Contact support if you believe this is a mistake — you won't be able to go online or accept deliveries until this is lifted.
        </div>
      )}

      {showReportForm ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Report a problem</div>
            <button onClick={() => { setShowReportForm(false); setReportOtherNote(null); }} style={{ background: "none", border: "none", color: COLORS.mute, fontSize: 12 }}>Cancel</button>
          </div>
          {reportSubmitted ? (
            <div style={{ background: "#E5F2E9", border: `1px solid ${COLORS.green}`, borderRadius: 10, padding: 12, fontSize: 13 }}>
              🛡️ Sent to Route admin — they'll follow up if needed.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {[
                  "Customer not answering",
                  "Can't find the address",
                  "Vendor gave me the wrong items",
                  "Vendor wasn't ready",
                  "Safety concern",
                  "Other",
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      if (reason === "Other") { setReportOtherNote(""); return; }
                      raiseOperationalIssue(reason, active[0]?.id || null, "rider", riderName);
                      setReportSubmitted(true);
                    }}
                    style={{
                      textAlign: "left", border: `1px solid ${COLORS.line}`, background: COLORS.paper,
                      borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontWeight: 600,
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {reportOtherNote !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea
                    value={reportOtherNote}
                    onChange={(e) => setReportOtherNote(e.target.value)}
                    placeholder="What's going on?"
                    rows={3}
                    style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
                  />
                  <button
                    onClick={() => {
                      const note = reportOtherNote.trim();
                      raiseOperationalIssue(note ? `Other: ${note}` : "Other", active[0]?.id || null, "rider", riderName);
                      setReportSubmitted(true);
                      setReportOtherNote(null);
                    }}
                    style={{ ...actionBtn(COLORS.ink), alignSelf: "flex-start" }}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowReportForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: `1px solid ${COLORS.line}`, borderRadius: 20, padding: "8px 14px",
            fontSize: 12.5, fontWeight: 700, color: COLORS.chili, marginBottom: 18,
          }}
        >
          ⚠ Report a problem
        </button>
      )}

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div className="rt-mono" style={{ fontSize: 10, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 }}>
          TODAY {"\u2014"} this session only, resets on reload until orders persist in a backend
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="rt-display" style={{ fontSize: 22 }}>{todayCount}</span>
          <span style={{ fontSize: 13, color: COLORS.mute }}>delivered</span>
          <span className="rt-mono" style={{ fontSize: 14, color: COLORS.mango, fontWeight: 700, marginLeft: "auto" }}>{fmtNaira(todayEarnings)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill tone="green">★ {activeRider.rating} rating</Pill>
        <Pill tone="indigo">96% acceptance</Pill>
        <Pill tone="mango">₦{PER_DELIVERY_RATE}/delivery</Pill>
      </div>

      {!isOnline && !isSuspended && (
        <div style={{
          background: "#EFEDE6", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13.5, color: COLORS.mute,
        }}>
          You're offline — go online to see and accept new deliveries.
        </div>
      )}

      {active.length > 0 && (
        <>
          <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>Active delivery</h2>
          {active.map((o) => (
            <div key={o.id} style={{ background: "#FFF1DA", border: `1px solid ${COLORS.mango}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="rt-mono" style={{ fontSize: 12.5 }}>#{o.id}</span>
                {StatusPillFor(o.status)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{o.vendor.name}</div>
              <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>{o.vendor.area} → Customer</div>
              {o.status === "picked_up" && (o.deliveryAddress || o.customerPhone) && (
                <div style={{ background: "#fff", borderRadius: 10, padding: 10, marginBottom: 12 }}>
                  {o.deliveryAddress && (
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: o.customerPhone ? 4 : 0 }}>
                      📍 {o.deliveryAddress}
                    </div>
                  )}
                  {o.customerPhone && (
                    <a href={`tel:${o.customerPhone.replace(/\s/g, "")}`} style={{ fontSize: 13, color: COLORS.indigo, fontWeight: 700, textDecoration: "none" }}>
                      📞 Call {o.customerName || "customer"} · {o.customerPhone}
                    </a>
                  )}
                </div>
              )}
              {o.status === "ready" && (
                <button onClick={() => advanceOrder(o.id, "picked_up")} style={{ ...actionBtn(COLORS.ink), width: "100%" }}>Confirm pickup</button>
              )}
              {o.status === "picked_up" && (
                <button onClick={() => advanceOrder(o.id, "delivered")} style={{ ...actionBtn(COLORS.green), width: "100%" }}>Mark delivered</button>
              )}
            </div>
          ))}
        </>
      )}

      {isOnline && (
        <>
          <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>Available deliveries ({available.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {available.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>Nothing waiting right now — check back shortly.</p>}
            {available.map((o) => (
              <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id} · {timeAgo(o.createdAt)}</span>
                  <Pill tone="indigo">{o.vendor.area}</Pill>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>{o.vendor.name}</div>
                <button onClick={() => assignRider(o.id, riderName)} style={{ ...actionBtn(COLORS.mango), width: "100%" }}>
                  Accept delivery · {fmtNaira(PER_DELIVERY_RATE)}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Completed today ({todayCount})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {todayCount === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No deliveries completed yet today.</p>}
        {completedToday.map((o) => (
          <div key={o.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10,
          }}>
            <div>
              <div className="rt-mono" style={{ fontSize: 12 }}>#{o.id}</div>
              <div style={{ fontSize: 12.5, color: COLORS.mute }}>
                {o.vendor.name}{o.deliveredAt ? ` · ${timeAgo(o.deliveredAt)}` : ""}
              </div>
            </div>
            <span className="rt-mono" style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.green }}>+{fmtNaira(PER_DELIVERY_RATE)}</span>
          </div>
        ))}
      </div>

      <h2 className="rt-display" style={{ fontSize: 16, margin: "24px 0 10px" }}>Earnings & payouts</h2>

      {showBankForm ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: COLORS.mute, marginBottom: 10 }}>
            {hasBankDetails ? "Update your payout account" : "Add a bank account before you can withdraw earnings."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={bankDraft.bankName} onChange={(e) => setBankDraft((b) => ({ ...b, bankName: e.target.value }))}
              placeholder="Bank name" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
            />
            <input
              value={bankDraft.bankAccountNumber} onChange={(e) => setBankDraft((b) => ({ ...b, bankAccountNumber: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="Account number" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
            />
            <input
              value={bankDraft.bankAccountName} onChange={(e) => setBankDraft((b) => ({ ...b, bankAccountName: e.target.value }))}
              placeholder="Account holder name" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveBankDetails} style={{ ...actionBtn(COLORS.ink), flex: 1 }}>Save</button>
              {hasBankDetails && (
                <button onClick={() => setShowBankForm(false)} style={{ ...actionBtn(COLORS.mute), flex: 1 }}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 4 }}>AVAILABLE BALANCE</div>
              <div className="rt-display" style={{ fontSize: 22 }}>{fmtNaira(availableBalance)}</div>
              {totalPending > 0 && (
                <div style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}>{fmtNaira(totalPending)} pending withdrawal</div>
              )}
            </div>
            <button onClick={() => setShowBankForm(true)} style={{ background: "none", border: "none", color: COLORS.indigo, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Edit bank details
            </button>
          </div>
          <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 12 }}>
            {activeRider.bankAccountName} · {activeRider.bankName} · {activeRider.bankAccountNumber}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={withdrawAmount}
              onChange={(e) => { setWithdrawAmount(e.target.value.replace(/[^0-9]/g, "")); setWithdrawError(null); }}
              placeholder={`Amount (up to ${fmtNaira(availableBalance)})`}
              style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
            />
            <button
              onClick={submitWithdrawal}
              disabled={availableBalance <= 0}
              style={{ ...actionBtn(availableBalance > 0 ? COLORS.mango : COLORS.mute), opacity: availableBalance > 0 ? 1 : 0.6 }}
            >
              Withdraw
            </button>
          </div>
          {withdrawError && <div style={{ color: COLORS.chili, fontSize: 12.5, marginTop: 8 }}>{withdrawError}</div>}
        </div>
      )}

      {myPayouts.length > 0 && (
        <>
          <h3 className="rt-display" style={{ fontSize: 15, margin: "0 0 10px", color: COLORS.mute }}>Withdrawal history</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[...myPayouts].reverse().map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10,
              }}>
                <div className="rt-mono" style={{ fontSize: 12.5 }}>{fmtNaira(p.amount)}</div>
                {p.status === "pending" && <Pill tone="mango">PENDING</Pill>}
                {p.status === "paid" && <Pill tone="green">PAID</Pill>}
                {p.status === "rejected" && <Pill tone="chili">REJECTED</Pill>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */

// Baseline "today" revenue, same reasoning as AREA_ACTIVITY_SEED: makes the
// figure look believable against a handful of demo orders. Live paid orders
// from the last 24h are added on top. Replace with a real
// `SUM(total) WHERE created_at >= start_of_today` query once orders are
// persisted in a backend. (Per-period breakdown — hour/month/year — was
// removed as not MVP-necessary: at pilot volume, "today" tells you
// everything the 4-way split would, and multi-period slicing only earns
// its keep once there's enough volume for a trend to be informative.)
const REVENUE_SEED_TODAY = 780000;
const REVENUE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Demo admin identities — same reasoning as DEMO_CUSTOMERS: no real auth
// yet, so this stands in for "which admin is logged in." Needed for the
// audit trail to mean anything — with only one admin identity, every log
// entry would just say "Admin," which doesn't demonstrate accountability
// across a real team of more than one person.
const DEMO_ADMINS = ["Ngozi Adeyemi", "Yusuf Bello"];

function AdminApp({ orders, disputes, setDisputeStatus, vendors, operationalIssues, setOperationalIssueStatus, riders, toggleVendorActive, addVendor, toggleRiderActive, addRider, cancelOrder, unassignRider, auditLog, addAuditEntry, payouts, markPayoutPaid, rejectPayout, updateVendorProfile, updateVendorVerification, updateRiderProfile, updateRiderVerification }) {
  const [now, setNow] = useState(Date.now());
  const sectionRefs = useRef({});
  const scrollToSection = (key) => sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [activeAdmin, setActiveAdmin] = useState(DEMO_ADMINS[0]);
  const [expandedDisputeId, setExpandedDisputeId] = useState(null);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const [expandedRiderId, setExpandedRiderId] = useState(null);
  const [vendorProfileDraft, setVendorProfileDraft] = useState(null);
  const [vendorVerificationDraft, setVendorVerificationDraft] = useState(null);
  const [riderProfileDraft, setRiderProfileDraft] = useState(null);
  const [riderVerificationDraft, setRiderVerificationDraft] = useState(null);
  const [showAddVendorForm, setShowAddVendorForm] = useState(false);
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", category: "Restaurant", area: "Arepo", eta: "", ownerName: "", ownerPhone: "" });
  const [newRider, setNewRider] = useState({ name: "", phone: "", zone: "Arepo/Axis" });
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Re-render every 30s so "orders in the last hour" stays accurate even
  // if no new orders come in (an order can age out of the window while
  // this screen just sits open).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const revenueToday = () => {
    const cutoff = now - REVENUE_WINDOW_MS;
    const live = orders
      .filter((o) => o.createdAt && o.createdAt >= cutoff && o.paymentStatus === "paid")
      .reduce((s, o) => s + o.total, 0);
    return REVENUE_SEED_TODAY + live;
  };

  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.paymentStatus === "paid").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  // "On delivery" = a rider is assigned and the order hasn't been dropped off
  // yet (ready = claimed but not picked up, picked_up = en route). This is
  // real current activity, not "any rider who's touched an order this
  // session" (which is what this used to measure under the "Active riders"
  // label — technically true but not what that label implied).
  const ridersOnDelivery = new Set(
    orders.filter((o) => o.rider && (o.status === "ready" || o.status === "picked_up")).map((o) => o.rider)
  ).size;
  const ridersOnlineCount = riders.filter((r) => r.isOnline && r.isActive !== false).length;
  // "Open now" reads the vendor's own isOpen toggle instead of just counting
  // every vendor that exists (which is what "Active vendors" used to show —
  // a closed vendor still counted as "active").
  const vendorsOpenNow = vendors.filter((v) => v.isOpen && v.isActive !== false).length;
  const openDisputes = disputes.filter((d) => d.status === "open");
  const inProgressDisputes = disputes.filter((d) => d.status === "in_progress");
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved");
  const openOperationalIssues = operationalIssues.filter((i) => i.status === "open");
  const inProgressOperationalIssues = operationalIssues.filter((i) => i.status === "in_progress");
  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const resolvedOperationalIssues = operationalIssues.filter((i) => i.status === "resolved");
  const placedCount = orders.length;
  const paidCount = orders.filter((o) => o.paymentStatus === "paid").length;
  const refundedCount = orders.filter((o) => o.paymentStatus === "refunded").length;
  const unpaidCount = placedCount - paidCount - refundedCount;

  // Grouped by phone, not name — two real customers can share a display
  // name ("Chidi O." isn't unique), but they won't share a phone number,
  // which is already required at checkout. Falls back to name only if a
  // phone is somehow missing, so nothing throws.
  const customerMap = {};
  orders.forEach((o) => {
    const key = o.customerPhone || o.customerName || "Guest";
    const name = o.customerName || "Guest";
    if (!customerMap[key]) customerMap[key] = { name, phone: o.customerPhone, orderCount: 0, totalSpent: 0, firstOrderAt: o.createdAt, lastOrderAt: o.createdAt };
    const c = customerMap[key];
    c.orderCount += 1;
    if (o.paymentStatus === "paid") c.totalSpent += o.total;
    if (o.createdAt < c.firstOrderAt) c.firstOrderAt = o.createdAt;
    if (o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
  });
  const liveCustomers = Object.values(customerMap).sort((a, b) => b.lastOrderAt - a.lastOrderAt);

  const stats = [
    { label: "Orders today", value: orders.length, tone: "indigo" },
    { label: "In progress", value: activeOrders, tone: "mango" },
    { label: "Delivered", value: deliveredOrders, tone: "green" },
    { label: "Riders online", value: ridersOnlineCount, tone: "green" },
    { label: "Riders on delivery", value: ridersOnDelivery, tone: "chili" },
    { label: "Unresolved disputes", value: openDisputes.length + inProgressDisputes.length, tone: "chili" },
    { label: "Operational issues", value: openOperationalIssues.length + inProgressOperationalIssues.length, tone: "chili" },
    { label: "Vendors open now", value: vendorsOpenNow, tone: "indigo" },
  ];

  useEffect(() => {
    const v = vendors.find((v) => v.id === expandedVendorId);
    if (!v) { setVendorProfileDraft(null); setVendorVerificationDraft(null); return; }
    setVendorProfileDraft({
      name: v.name, category: v.category, area: v.area, eta: v.eta,
      ownerName: v.ownerName || "", ownerPhone: v.ownerPhone || "", managerName: v.managerName || "", managerPhone: v.managerPhone || "",
    });
    setVendorVerificationDraft({
      businessRegNumber: v.businessRegNumber || "", ownerIdType: v.ownerIdType || "", ownerIdNumber: v.ownerIdNumber || "",
      verified: !!v.verified, verificationNotes: v.verificationNotes || "",
    });
  }, [expandedVendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = riders.find((r) => r.id === expandedRiderId);
    if (!r) { setRiderProfileDraft(null); setRiderVerificationDraft(null); return; }
    setRiderProfileDraft({ name: r.name, phone: r.phone, zone: r.zone });
    setRiderVerificationDraft({
      idType: r.idType || "", idNumber: r.idNumber || "", verified: !!r.verified, verificationNotes: r.verificationNotes || "",
    });
  }, [expandedRiderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveVendorProfile = (vendorId, vendorName) => {
    updateVendorProfile(vendorId, vendorProfileDraft);
    addAuditEntry(activeAdmin, "Edited vendor profile", vendorProfileDraft.name || vendorName);
  };
  const saveVendorVerification = (vendorId, vendorName) => {
    updateVendorVerification(vendorId, vendorVerificationDraft);
    addAuditEntry(activeAdmin, vendorVerificationDraft.verified ? "Verified vendor" : "Updated vendor verification", vendorName);
  };
  const saveRiderProfile = (riderId, riderName) => {
    updateRiderProfile(riderId, riderProfileDraft);
    addAuditEntry(activeAdmin, "Edited rider profile", riderProfileDraft.name || riderName);
  };
  const saveRiderVerification = (riderId, riderName) => {
    updateRiderVerification(riderId, riderVerificationDraft);
    addAuditEntry(activeAdmin, riderVerificationDraft.verified ? "Verified rider" : "Updated rider verification", riderName);
  };

  const submitNewVendor = () => {
    if (!newVendor.name.trim() || !newVendor.ownerName.trim() || !newVendor.ownerPhone.trim()) return;
    vendorCounter += 1;
    addVendor({
      id: `v${vendorCounter}`, name: newVendor.name.trim(), category: newVendor.category, area: newVendor.area,
      eta: newVendor.eta.trim() || "30–40 min", rating: 4.5, emoji: "🍽️",
      ownerName: newVendor.ownerName.trim(), ownerPhone: newVendor.ownerPhone.trim(),
    });
    addAuditEntry(activeAdmin, "Added vendor", newVendor.name.trim());
    setNewVendor({ name: "", category: "Restaurant", area: "Arepo", eta: "", ownerName: "", ownerPhone: "" });
    setShowAddVendorForm(false);
  };

  const submitNewRider = () => {
    if (!newRider.name.trim() || !newRider.phone.trim()) return;
    riderCounter += 1;
    addRider({ id: `r${riderCounter}`, name: newRider.name.trim(), phone: newRider.phone.trim(), zone: newRider.zone, rating: 4.5, emoji: "🛵" });
    addAuditEntry(activeAdmin, "Added rider", newRider.name.trim());
    setNewRider({ name: "", phone: "", zone: "Arepo/Axis" });
    setShowAddRiderForm(false);
  };

  return (
    <div style={{ padding: "16px 20px 40px", flex: 1 }}>
      <select
        value={activeAdmin}
        onChange={(e) => setActiveAdmin(e.target.value)}
        className="rt-mono"
        style={{
          width: "100%", marginBottom: 12, padding: "8px 10px", borderRadius: 10,
          border: `1px solid ${COLORS.line}`, fontSize: 12, background: COLORS.panel, color: COLORS.mute,
        }}
      >
        {DEMO_ADMINS.map((name) => <option key={name} value={name}>Signed in as: {name}</option>)}
      </select>

      <div className="rt-scroll" style={{
        position: "sticky", top: 0, zIndex: 5, background: COLORS.paper,
        display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 10px", marginBottom: 4,
      }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "payments", label: "Payments" },
          { key: "customers", label: "Customers" },
          { key: "disputes", label: "Disputes", badge: openDisputes.length + inProgressDisputes.length },
          { key: "issues", label: "Issues", badge: openOperationalIssues.length + inProgressOperationalIssues.length },
          { key: "vendors", label: "Vendors" },
          { key: "riders", label: "Riders" },
          { key: "payouts", label: "Payouts", badge: pendingPayouts.length },
          { key: "orders", label: "Orders" },
          { key: "activity", label: "Activity" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => scrollToSection(tab.key)}
            style={{
              flexShrink: 0, border: "none", borderRadius: 20, padding: "7px 13px", fontWeight: 700, fontSize: 12,
              background: COLORS.panel, color: COLORS.ink, boxShadow: `inset 0 0 0 1px ${COLORS.line}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {tab.label}
            {!!tab.badge && (
              <span style={{
                background: COLORS.chili, color: "#fff", borderRadius: 10, fontSize: 10.5, fontWeight: 800,
                minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div ref={(el) => (sectionRefs.current.overview = el)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
            <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, marginBottom: 6, letterSpacing: 0.3 }}>{s.label.toUpperCase()}</div>
            <div className="rt-display" style={{ fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div ref={(el) => (sectionRefs.current.payments = el)} />
      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14,
        marginBottom: 12,
      }}>
        <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, marginBottom: 10, letterSpacing: 0.3 }}>PAYMENT STATUS</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="rt-display" style={{ fontSize: 20 }}>{placedCount}</div>
            <div style={{ fontSize: 12, color: COLORS.mute }}>Placed</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rt-display" style={{ fontSize: 20, color: COLORS.green }}>{paidCount}</div>
            <div style={{ fontSize: 12, color: COLORS.mute }}>Paid</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rt-display" style={{ fontSize: 20, color: COLORS.indigo }}>{refundedCount}</div>
            <div style={{ fontSize: 12, color: COLORS.mute }}>Refunded</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rt-display" style={{ fontSize: 20, color: unpaidCount > 0 ? COLORS.chili : COLORS.mute }}>{unpaidCount}</div>
            <div style={{ fontSize: 12, color: COLORS.mute }}>Unpaid</div>
          </div>
        </div>
        {unpaidCount > 0 && (
          <div style={{ fontSize: 12, color: COLORS.mute, marginTop: 10 }}>
            Unpaid orders are hidden from Vendor/Manager and won't move forward until the customer completes payment.
          </div>
        )}
      </div>

      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14,
        marginBottom: 24,
      }}>
        <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, marginBottom: 6, letterSpacing: 0.3 }}>REVENUE TODAY</div>
        <div className="rt-display" style={{ fontSize: 22 }}>{fmtNaira(revenueToday())}</div>
      </div>

      <div ref={(el) => (sectionRefs.current.customers = el)} />
      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14,
        marginBottom: 24,
      }}>
        <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, marginBottom: 10, letterSpacing: 0.3 }}>
          CUSTOMERS ({liveCustomers.length})
        </div>
        {liveCustomers.length === 0 && (
          <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No orders placed yet — customers will show up here once they do.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {liveCustomers.map((c) => (
            <div key={c.phone || c.name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: COLORS.paper, borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: COLORS.mute }}>
                {c.orderCount} order{c.orderCount > 1 ? "s" : ""} · {fmtNaira(c.totalSpent)} · last order {timeAgo(c.lastOrderAt, now)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={(el) => (sectionRefs.current.disputes = el)} />
      <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>
        Disputes ({openDisputes.length} open · {inProgressDisputes.length} in progress)
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {disputes.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No disputes reported yet.</p>}
        {[...openDisputes, ...inProgressDisputes].map((d) => {
          const relatedOrder = orders.find((o) => o.id === d.orderId);
          const expanded = expandedDisputeId === d.id;
          return (
            <div key={d.id} style={{
              background: d.status === "open" ? "#FCE8E6" : "#FFF1DA",
              border: `1px solid ${d.status === "open" ? COLORS.chili : COLORS.mango}`, borderRadius: 12, padding: 14,
            }}>
              <button
                onClick={() => setExpandedDisputeId(expanded ? null : d.id)}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>Order #{d.orderId} · {timeAgo(d.createdAt, now)}</span>
                  {CaseStatusPill(d.status)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{d.reason}</div>
                <div style={{ fontSize: 12.5, color: COLORS.mute }}>{d.vendorName} · {fmtNaira(d.total)} · {expanded ? "Hide details ▲" : "View details ▼"}</div>
              </button>

              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>
                    Reported {new Date(d.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {relatedOrder ? (
                    <div style={{ background: "#fff", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Order items</div>
                      {relatedOrder.items.map((i) => (
                        <div key={i.id} style={{ fontSize: 12.5, color: COLORS.mute, display: "flex", justifyContent: "space-between" }}><span>{i.qty} × {i.name}</span><span className="rt-mono">{fmtNaira(i.price * i.qty)}</span></div>
                      ))}
                      {(relatedOrder.customerName || relatedOrder.customerPhone) && (
                        <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${COLORS.line}` }}>
                          <strong style={{ color: COLORS.ink }}>Customer:</strong> {relatedOrder.customerName}{relatedOrder.customerPhone ? ` · ${relatedOrder.customerPhone}` : ""}
                        </div>
                      )}
                      {relatedOrder.rider && (
                        <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 4 }}>
                          <strong style={{ color: COLORS.ink }}>Rider:</strong> {relatedOrder.rider}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 10 }}>Original order no longer available.</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {d.status === "open" && (
                      <button onClick={() => { setDisputeStatus(d.id, "in_progress"); addAuditEntry(activeAdmin, "Started reviewing dispute", `Order #${d.orderId} \u2014 ${d.vendorName}`); }} style={actionBtn(COLORS.mango)}>Start reviewing</button>
                    )}
                    <button onClick={() => { setDisputeStatus(d.id, "resolved"); addAuditEntry(activeAdmin, "Resolved dispute", `Order #${d.orderId} \u2014 ${d.vendorName}`); }} style={actionBtn(COLORS.ink)}>Mark resolved</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {resolvedDisputes.length > 0 && (
          <>
            <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginTop: 4 }}>RESOLVED</div>
            {resolvedDisputes.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.mute }}>
                <span>Order #{d.orderId} — {d.reason} · {timeAgo(d.resolvedAt || d.createdAt, now)}</span>
                <Pill tone="green">RESOLVED</Pill>
              </div>
            ))}
          </>
        )}
      </div>

      <div ref={(el) => (sectionRefs.current.issues = el)} />
      <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>
        Operational Issues ({openOperationalIssues.length} open · {inProgressOperationalIssues.length} in progress)
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: COLORS.mute, marginTop: -4 }}>
          App/payment/logistics failures reported by customers or riders — not tied to a vendor. Handle these directly, not by routing to a store.
        </p>
        {operationalIssues.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No operational issues reported.</p>}
        {[...openOperationalIssues, ...inProgressOperationalIssues].map((i) => {
          const relatedOrder = orders.find((o) => o.id === Number(i.orderId));
          const expanded = expandedIssueId === i.id;
          return (
            <div key={i.id} style={{
              background: i.status === "open" ? "#FCE8E6" : "#FFF1DA",
              border: `1px solid ${i.status === "open" ? COLORS.chili : COLORS.mango}`, borderRadius: 12, padding: 14,
            }}>
              <button
                onClick={() => setExpandedIssueId(expanded ? null : i.id)}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="rt-mono" style={{ fontSize: 12.5, color: COLORS.mute }}>
                    {i.reporterName || "Guest"} ({i.reporterRole || "customer"}) · {i.orderId ? `Order #${i.orderId}` : "No order linked"} · {timeAgo(i.createdAt, now)}
                  </span>
                  {CaseStatusPill(i.status)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{i.reason}</div>
                <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 2 }}>{expanded ? "Hide details ▲" : "View details ▼"}</div>
              </button>

              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>
                    Reported {new Date(i.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {relatedOrder && (
                    <div style={{ background: "#fff", borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 12.5, color: COLORS.mute }}>
                      <div style={{ marginBottom: 6 }}>
                        {relatedOrder.vendor.name} · {fmtNaira(relatedOrder.total)} · {StatusPillFor(relatedOrder.status)}
                      </div>
                      <div style={{ paddingTop: 6, borderTop: `1px dashed ${COLORS.line}` }}>
                        <strong style={{ color: COLORS.ink }}>{relatedOrder.customerName || "Guest"}</strong>
                        {relatedOrder.customerPhone && <> · {relatedOrder.customerPhone}</>}
                        {relatedOrder.deliveryAddress && <div style={{ marginTop: 2 }}>{"\uD83D\uDCCD"} {relatedOrder.deliveryAddress}</div>}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {i.status === "open" && (
                      <button onClick={() => { setOperationalIssueStatus(i.id, "in_progress"); addAuditEntry(activeAdmin, "Started reviewing issue", i.orderId ? `Order #${i.orderId}` : i.reason); }} style={actionBtn(COLORS.mango)}>Start reviewing</button>
                    )}
                    <button onClick={() => { setOperationalIssueStatus(i.id, "resolved"); addAuditEntry(activeAdmin, "Resolved issue", i.orderId ? `Order #${i.orderId}` : i.reason); }} style={actionBtn(COLORS.ink)}>Mark resolved</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {resolvedOperationalIssues.length > 0 && (
          <>
            <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginTop: 4 }}>RESOLVED</div>
            {resolvedOperationalIssues.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.mute }}>
                <span>{i.orderId ? `Order #${i.orderId}` : "No order"} — {i.reason} · {timeAgo(i.resolvedAt || i.createdAt, now)}</span>
                <Pill tone="green">RESOLVED</Pill>
              </div>
            ))}
          </>
        )}
      </div>

      <div ref={(el) => (sectionRefs.current.vendors = el)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 className="rt-display" style={{ fontSize: 16, margin: 0 }}>Vendors ({vendors.length})</h2>
        <button onClick={() => setShowAddVendorForm((s) => !s)} style={actionBtn(COLORS.mango)}>
          {showAddVendorForm ? "Cancel" : "+ Add vendor"}
        </button>
      </div>

      {showAddVendorForm && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={newVendor.name} onChange={(e) => setNewVendor((v) => ({ ...v, name: e.target.value }))}
            placeholder="Store name" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={newVendor.category} onChange={(e) => setNewVendor((v) => ({ ...v, category: e.target.value }))} style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 8px", fontSize: 13 }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newVendor.area} onChange={(e) => setNewVendor((v) => ({ ...v, area: e.target.value }))} style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 8px", fontSize: 13 }}>
              <option value="Arepo">Arepo</option>
              <option value="Axis">Axis</option>
            </select>
          </div>
          <input
            value={newVendor.eta} onChange={(e) => setNewVendor((v) => ({ ...v, eta: e.target.value }))}
            placeholder="Delivery ETA (e.g. 25–35 min)" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <input
            value={newVendor.ownerName} onChange={(e) => setNewVendor((v) => ({ ...v, ownerName: e.target.value }))}
            placeholder="Owner name" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <input
            value={newVendor.ownerPhone} onChange={(e) => setNewVendor((v) => ({ ...v, ownerPhone: e.target.value }))}
            placeholder="Owner phone" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <button onClick={submitNewVendor} style={{ ...actionBtn(COLORS.ink), alignSelf: "flex-start" }}>Save vendor</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {vendors.map((v) => {
          const vOrders = orders.filter((o) => o.vendor.id === v.id);
          const expanded = expandedVendorId === v.id;
          const suspended = v.isActive === false;
          const contactName = v.ownerName || v.managerName;
          const contactPhone = v.ownerPhone || v.managerPhone;
          const contactLabel = v.ownerName ? "Owner" : "Manager";
          return (
            <div key={v.id} style={{
              background: suspended ? "#FCE8E6" : COLORS.panel,
              border: `1px solid ${suspended ? COLORS.chili : COLORS.line}`, borderRadius: 12, padding: 12,
            }}>
              <button
                onClick={() => setExpandedVendorId(expanded ? null : v.id)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, textAlign: "left" }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v.name}{suspended ? " — Suspended" : ""}</div>
                  <div style={{ fontSize: 12, color: COLORS.mute }}>{v.category} · {v.area} · {vOrders.length} orders</div>
                </div>
                <span className="rt-mono" style={{ fontSize: 12, color: COLORS.mute }}>{v.isOpen ? "● Open" : "○ Closed"}</span>
              </button>
              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12.5, color: COLORS.mute }}>
                      {contactLabel}: {contactName || "—"}{contactPhone ? ` · ${contactPhone}` : ""}
                    </div>
                    <button onClick={() => { toggleVendorActive(v.id); addAuditEntry(activeAdmin, suspended ? "Reactivated vendor" : "Suspended vendor", v.name); }} style={actionBtn(suspended ? COLORS.green : COLORS.chili)}>
                      {suspended ? "Reactivate" : "Suspend"}
                    </button>
                  </div>

                  {vendorProfileDraft && (
                    <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 8 }}>EDIT PROFILE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <input value={vendorProfileDraft.name} onChange={(e) => setVendorProfileDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Store name" style={miniInput} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <select value={vendorProfileDraft.category} onChange={(e) => setVendorProfileDraft((d) => ({ ...d, category: e.target.value }))} style={{ ...miniInput, flex: 1 }}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={vendorProfileDraft.area} onChange={(e) => setVendorProfileDraft((d) => ({ ...d, area: e.target.value }))} style={{ ...miniInput, flex: 1 }}>
                            <option value="Arepo">Arepo</option>
                            <option value="Axis">Axis</option>
                          </select>
                        </div>
                        <input value={vendorProfileDraft.eta} onChange={(e) => setVendorProfileDraft((d) => ({ ...d, eta: e.target.value }))} placeholder="Delivery ETA" style={miniInput} />
                        <input
                          value={v.ownerName !== undefined ? vendorProfileDraft.ownerName : vendorProfileDraft.managerName}
                          onChange={(e) => setVendorProfileDraft((d) => (v.ownerName !== undefined ? { ...d, ownerName: e.target.value } : { ...d, managerName: e.target.value }))}
                          placeholder={`${contactLabel} name`} style={miniInput}
                        />
                        <input
                          value={v.ownerName !== undefined ? vendorProfileDraft.ownerPhone : vendorProfileDraft.managerPhone}
                          onChange={(e) => setVendorProfileDraft((d) => (v.ownerName !== undefined ? { ...d, ownerPhone: e.target.value } : { ...d, managerPhone: e.target.value }))}
                          placeholder={`${contactLabel} phone`} style={miniInput}
                        />
                      </div>
                      <button onClick={() => saveVendorProfile(v.id, v.name)} style={actionBtn(COLORS.ink)}>Save profile</button>
                    </div>
                  )}

                  {vendorVerificationDraft && (
                    <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3 }}>VERIFICATION</div>
                        <Pill tone={v.verified ? "green" : "chili"}>{v.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <input value={vendorVerificationDraft.businessRegNumber} onChange={(e) => setVendorVerificationDraft((d) => ({ ...d, businessRegNumber: e.target.value }))} placeholder="Business reg. number (CAC)" style={miniInput} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <input value={vendorVerificationDraft.ownerIdType} onChange={(e) => setVendorVerificationDraft((d) => ({ ...d, ownerIdType: e.target.value }))} placeholder="Owner ID type (e.g. NIN)" style={{ ...miniInput, flex: 1 }} />
                          <input value={vendorVerificationDraft.ownerIdNumber} onChange={(e) => setVendorVerificationDraft((d) => ({ ...d, ownerIdNumber: e.target.value }))} placeholder="ID number" style={{ ...miniInput, flex: 1 }} />
                        </div>
                        <textarea
                          value={vendorVerificationDraft.verificationNotes} onChange={(e) => setVendorVerificationDraft((d) => ({ ...d, verificationNotes: e.target.value }))}
                          placeholder="Notes — how/when this was checked" rows={2}
                          style={{ ...miniInput, fontFamily: "inherit", resize: "vertical" }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                          <input type="checkbox" checked={vendorVerificationDraft.verified} onChange={(e) => setVendorVerificationDraft((d) => ({ ...d, verified: e.target.checked }))} />
                          Mark as verified
                        </label>
                      </div>
                      <button onClick={() => saveVendorVerification(v.id, v.name)} style={actionBtn(COLORS.indigo)}>Save verification</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div ref={(el) => (sectionRefs.current.riders = el)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 className="rt-display" style={{ fontSize: 16, margin: 0 }}>Riders ({riders.length})</h2>
        <button onClick={() => setShowAddRiderForm((s) => !s)} style={actionBtn(COLORS.mango)}>
          {showAddRiderForm ? "Cancel" : "+ Add rider"}
        </button>
      </div>

      {showAddRiderForm && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={newRider.name} onChange={(e) => setNewRider((r) => ({ ...r, name: e.target.value }))}
            placeholder="Rider name" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <input
            value={newRider.phone} onChange={(e) => setNewRider((r) => ({ ...r, phone: e.target.value }))}
            placeholder="Phone" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <input
            value={newRider.zone} onChange={(e) => setNewRider((r) => ({ ...r, zone: e.target.value }))}
            placeholder="Zone" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5 }}
          />
          <button onClick={submitNewRider} style={{ ...actionBtn(COLORS.ink), alignSelf: "flex-start" }}>Save rider</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {riders.map((r) => {
          const rDelivered = orders.filter((o) => o.rider === r.name && o.status === "delivered");
          const rActive = orders.filter((o) => o.rider === r.name && (o.status === "ready" || o.status === "picked_up"));
          const rEarnings = rDelivered.length * PER_DELIVERY_RATE;
          const expanded = expandedRiderId === r.id;
          const suspended = r.isActive === false;
          return (
            <div key={r.id} style={{
              background: suspended ? "#FCE8E6" : COLORS.panel,
              border: `1px solid ${suspended ? COLORS.chili : COLORS.line}`, borderRadius: 12, padding: 12,
            }}>
              <button
                onClick={() => setExpandedRiderId(expanded ? null : r.id)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, textAlign: "left" }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}{suspended ? " — Suspended" : ""}</div>
                  <div style={{ fontSize: 12, color: COLORS.mute }}>{r.zone} · ★ {r.rating} · {rDelivered.length} delivered this session</div>
                </div>
                <span className="rt-mono" style={{ fontSize: 12, color: COLORS.mute }}>{r.isOnline ? "● Online" : "○ Offline"}</span>
              </button>
              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.mute}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: COLORS.mute }}>{r.phone}</div>
                    <button onClick={() => { toggleRiderActive(r.id); addAuditEntry(activeAdmin, suspended ? "Reactivated rider" : "Suspended rider", r.name); }} style={actionBtn(suspended ? COLORS.green : COLORS.chili)}>
                      {suspended ? "Reactivate" : "Suspend"}
                    </button>
                  </div>

                  {riderProfileDraft && (
                    <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 8 }}>EDIT PROFILE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <input value={riderProfileDraft.name} onChange={(e) => setRiderProfileDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name" style={miniInput} />
                        <input value={riderProfileDraft.phone} onChange={(e) => setRiderProfileDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Phone" style={miniInput} />
                        <input value={riderProfileDraft.zone} onChange={(e) => setRiderProfileDraft((d) => ({ ...d, zone: e.target.value }))} placeholder="Zone" style={miniInput} />
                      </div>
                      <button onClick={() => saveRiderProfile(r.id, r.name)} style={actionBtn(COLORS.ink)}>Save profile</button>
                    </div>
                  )}

                  {riderVerificationDraft && (
                    <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3 }}>VERIFICATION</div>
                        <Pill tone={r.verified ? "green" : "chili"}>{r.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input value={riderVerificationDraft.idType} onChange={(e) => setRiderVerificationDraft((d) => ({ ...d, idType: e.target.value }))} placeholder="ID type (e.g. NIN)" style={{ ...miniInput, flex: 1 }} />
                          <input value={riderVerificationDraft.idNumber} onChange={(e) => setRiderVerificationDraft((d) => ({ ...d, idNumber: e.target.value }))} placeholder="ID number" style={{ ...miniInput, flex: 1 }} />
                        </div>
                        <textarea
                          value={riderVerificationDraft.verificationNotes} onChange={(e) => setRiderVerificationDraft((d) => ({ ...d, verificationNotes: e.target.value }))}
                          placeholder="Notes — how/when this was checked" rows={2}
                          style={{ ...miniInput, fontFamily: "inherit", resize: "vertical" }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                          <input type="checkbox" checked={riderVerificationDraft.verified} onChange={(e) => setRiderVerificationDraft((d) => ({ ...d, verified: e.target.checked }))} />
                          Mark as verified
                        </label>
                      </div>
                      <button onClick={() => saveRiderVerification(r.id, r.name)} style={actionBtn(COLORS.indigo)}>Save verification</button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, background: COLORS.paper, borderRadius: 10, padding: 10 }}>
                      <div className="rt-display" style={{ fontSize: 16 }}>{rDelivered.length}</div>
                      <div style={{ fontSize: 11, color: COLORS.mute }}>Delivered</div>
                    </div>
                    <div style={{ flex: 1, background: COLORS.paper, borderRadius: 10, padding: 10 }}>
                      <div className="rt-display" style={{ fontSize: 16, color: COLORS.mango }}>{fmtNaira(rEarnings)}</div>
                      <div style={{ fontSize: 11, color: COLORS.mute }}>Earned</div>
                    </div>
                    <div style={{ flex: 1, background: COLORS.paper, borderRadius: 10, padding: 10 }}>
                      <div className="rt-display" style={{ fontSize: 16, color: rActive.length ? COLORS.chili : COLORS.mute }}>{rActive.length}</div>
                      <div style={{ fontSize: 11, color: COLORS.mute }}>Active now</div>
                    </div>
                  </div>

                  {rActive.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 }}>CURRENTLY OUT</div>
                      {rActive.map((o) => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                          <span>#{o.id} — {o.vendor.name}</span>
                          {StatusPillFor(o.status)}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 }}>
                    DELIVERY HISTORY ({rDelivered.length})
                  </div>
                  {rDelivered.length === 0 ? (
                    <p style={{ color: COLORS.mute, fontSize: 12.5, margin: 0 }}>No deliveries completed yet this session.</p>
                  ) : (
                    <div className="rt-scroll" style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto" }}>
                      {[...rDelivered].reverse().map((o) => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.mute }}>
                          <span>#{o.id} — {o.vendor.name}</span>
                          <span>{fmtNaira(o.total)} · {timeAgo(o.createdAt, now)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div ref={(el) => (sectionRefs.current.payouts = el)} />
      <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>
        Payouts ({pendingPayouts.length} pending)
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {payouts.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No withdrawal requests yet.</p>}
        {pendingPayouts.map((p) => (
          <div key={p.id} style={{ background: "#FFF1DA", border: `1px solid ${COLORS.mango}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.riderName}</div>
              <div className="rt-display" style={{ fontSize: 15 }}>{fmtNaira(p.amount)}</div>
            </div>
            <div style={{ fontSize: 12, color: COLORS.mute, marginBottom: 10 }}>Requested {timeAgo(p.requestedAt, now)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { markPayoutPaid(p.id); addAuditEntry(activeAdmin, "Marked payout paid", `${p.riderName} \u2014 ${fmtNaira(p.amount)}`); }}
                style={actionBtn(COLORS.green)}
              >
                Mark paid
              </button>
              <button
                onClick={() => { rejectPayout(p.id); addAuditEntry(activeAdmin, "Rejected payout", `${p.riderName} \u2014 ${fmtNaira(p.amount)}`); }}
                style={actionBtn(COLORS.chili)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {payouts.filter((p) => p.status !== "pending").length > 0 && (
          <>
            <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginTop: 4 }}>HISTORY</div>
            {[...payouts].filter((p) => p.status !== "pending").reverse().map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.mute }}>
                <span>{p.riderName} {"\u2014"} {fmtNaira(p.amount)} {"\u00B7"} {timeAgo(p.processedAt || p.requestedAt, now)}</span>
                <Pill tone={p.status === "paid" ? "green" : "chili"}>{p.status.toUpperCase()}</Pill>
              </div>
            ))}
          </>
        )}
      </div>

      <div ref={(el) => (sectionRefs.current.orders = el)} />
      <h2 className="rt-display" style={{ fontSize: 16, margin: "0 0 10px" }}>All orders</h2>
      {(() => {
        const q = orderSearch.trim().toLowerCase();
        const filteredOrders = [...orders].reverse().filter((o) => {
          if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
          if (orderPaymentFilter !== "all" && o.paymentStatus !== orderPaymentFilter) return false;
          if (q) {
            const haystack = `${o.id} ${o.customerName || ""} ${o.customerPhone || ""} ${o.vendor.name}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        });
        const filtersActive = orderStatusFilter !== "all" || orderPaymentFilter !== "all" || q;

        return (
          <>
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search by order #, customer name, phone, or vendor"
              style={{
                width: "100%", boxSizing: "border-box", border: `1px solid ${COLORS.line}`, borderRadius: 10,
                padding: "10px 12px", fontSize: 13.5, marginBottom: 10, background: COLORS.panel, color: COLORS.ink,
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {["all", ...STATUS_FLOW, "cancelled"].map((s) => {
                const active = orderStatusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setOrderStatusFilter(s)}
                    style={{
                      border: "none", borderRadius: 20, padding: "6px 12px", fontWeight: 700, fontSize: 11.5,
                      background: active ? COLORS.ink : COLORS.paper,
                      color: active ? "#fff" : COLORS.ink,
                      boxShadow: active ? "none" : `inset 0 0 0 1px ${COLORS.line}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {s === "all" ? "All statuses" : (STATUS_LABEL[s] || s)}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { key: "all", label: "All payments" },
                { key: "paid", label: "Paid" },
                { key: "pending", label: "Unpaid" },
                { key: "refunded", label: "Refunded" },
              ].map((f) => {
                const active = orderPaymentFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setOrderPaymentFilter(f.key)}
                    style={{
                      border: "none", borderRadius: 20, padding: "6px 12px", fontWeight: 700, fontSize: 11.5,
                      background: active ? COLORS.indigo : COLORS.paper,
                      color: active ? "#fff" : COLORS.ink,
                      boxShadow: active ? "none" : `inset 0 0 0 1px ${COLORS.line}`,
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="rt-mono" style={{ fontSize: 11, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 8 }}>
              {filtersActive ? `${filteredOrders.length} of ${orders.length} orders` : `${orders.length} orders`}
            </div>

            <div className="rt-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {orders.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No orders placed yet — try the Customer tab.</p>}
              {orders.length > 0 && filteredOrders.length === 0 && (
                <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No orders match your search/filters.</p>
              )}
              {filteredOrders.map((o) => {
                const expanded = expandedOrderId === o.id;
                const canCancel = ["placed", "accepted", "ready", "picked_up"].includes(o.status);
                const canReassign = o.status === "ready" && !!o.rider;
                const hasActions = canCancel || canReassign;
                return (
                <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10 }}>
                  <button
                    onClick={() => setExpandedOrderId(expanded ? null : o.id)}
                    style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                  >
                    <div>
                      <div className="rt-mono" style={{ fontSize: 12 }}>#{o.id} · {timeAgo(o.createdAt, now)}</div>
                      <div style={{ fontSize: 12.5, color: COLORS.mute }}>{o.vendor.name}{o.customerName ? ` · ${o.customerName}` : ""}{o.rider ? ` · ${o.rider}` : ""}</div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div className="rt-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{fmtNaira(o.total)}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {o.paymentStatus === "pending" && o.status !== "cancelled" && <Pill tone="mango">Unpaid</Pill>}
                        {StatusPillFor(o.status)}
                      </div>
                    </div>
                  </button>
                  {expanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.mute}` }}>
                      <div className="rt-mono" style={{ fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 }}>ITEMS</div>
                      {o.items.map((i) => (
                        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: COLORS.ink, marginBottom: 2 }}>
                          <span>{i.qty} × {i.name}</span>
                          <span className="rt-mono">{fmtNaira(i.price * i.qty)}</span>
                        </div>
                      ))}
                      <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.line}` }}>
                        <strong style={{ color: COLORS.ink }}>Customer:</strong> {o.customerName || "Guest"}{o.customerPhone ? ` · ${o.customerPhone}` : ""}
                      </div>
                      {o.deliveryAddress && (
                        <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 4 }}>
                          <strong style={{ color: COLORS.ink }}>Delivery:</strong> {o.deliveryAddress}
                        </div>
                      )}
                      {o.rider && (
                        <div style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 4 }}>
                          <strong style={{ color: COLORS.ink }}>Rider:</strong> {o.rider}
                        </div>
                      )}
                      {o.cancelReason && (
                        <div style={{ fontSize: 12.5, color: COLORS.chili, marginTop: 4 }}>
                          <strong>Decline reason:</strong> {o.cancelReason}
                        </div>
                      )}
                      {hasActions && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                          {canReassign && (
                            <button
                              onClick={() => { unassignRider(o.id); addAuditEntry(activeAdmin, "Released rider back to pool", `Order #${o.id} \u2014 ${o.vendor.name}`); setExpandedOrderId(null); }}
                              style={actionBtn(COLORS.mango)}
                            >
                              Release rider back to pool
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => { cancelOrder(o.id); addAuditEntry(activeAdmin, "Force-cancelled order", `Order #${o.id} \u2014 ${o.vendor.name}`); setExpandedOrderId(null); }}
                              style={actionBtn(COLORS.chili)}
                            >
                              {o.paymentStatus === "paid" ? "Cancel & refund" : "Cancel order"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </>
        );
      })()}

      <div ref={(el) => (sectionRefs.current.activity = el)} />
      <h2 className="rt-display" style={{ fontSize: 16, margin: "24px 0 10px" }}>Activity log</h2>
      <div className="rt-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
        {auditLog.length === 0 && <p style={{ color: COLORS.mute, fontSize: 13.5 }}>No admin actions recorded yet this session.</p>}
        {[...auditLog].reverse().map((entry) => (
          <div key={entry.id} style={{ fontSize: 12.5, color: COLORS.mute, padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
            <strong style={{ color: COLORS.ink }}>{entry.actor}</strong> {entry.action.toLowerCase()} <strong style={{ color: COLORS.ink }}>{entry.target}</strong>
            <span className="rt-mono"> · {timeAgo(entry.createdAt, now)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ---------------- ROOT ---------------- */

let disputeCounter = 500;
let reviewCounter = 700;
let vendorCounter = 8;
let riderCounter = 3;
let auditCounter = 900;
let payoutCounter = 1;

export default function App() {
  const [role, setRole] = useState("customer");
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [operationalIssues, setOperationalIssues] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [riders, setRiders] = useState(INITIAL_RIDERS);
  const [payouts, setPayouts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  // "off" | "day" | "week" | "month" | "year" — defaults off (no admin control
  // for it anymore, see AdminApp): at pilot volume this number is more likely
  // to undercut trust than build it, so it stays off until real volume justifies it.
  const [socialProofPeriod] = useState("off");

  const placeOrder = useCallback((vendor, items, total, customerName, deliveryAddress, customerPhone) => {
    orderCounter += 1;
    const id = orderCounter;
    setOrders((prev) => [...prev, {
      id, vendor, items, total, status: "placed", rider: null, createdAt: Date.now(),
      paymentStatus: "pending", // order exists, but stays invisible to the vendor/manager until paid
      customerName: customerName || "Guest",
      deliveryAddress: deliveryAddress || "",
      customerPhone: customerPhone || "",
    }]);
    return id;
  }, []);

  const confirmPayment = useCallback((id) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: "paid" } : o)));
  }, []);

  const advanceOrder = useCallback((id, status) => {
    setOrders((prev) => prev.map((o) => (
      o.id === id ? { ...o, status, deliveredAt: status === "delivered" ? Date.now() : o.deliveredAt } : o
    )));
  }, []);

  // Cancellation and refunding are the same action, not two separate steps:
  // if the order had been paid, cancelling it immediately marks the payment
  // refunded. Whoever cancels — customer, vendor, or manager — the money
  // comes back the same way, since it's the order being cancelled that
  // matters, not who initiated it.
  const cancelOrder = useCallback((id, reason) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== id) return o;
      return {
        ...o,
        status: "cancelled",
        cancelReason: reason || null,
        paymentStatus: o.paymentStatus === "paid" ? "refunded" : o.paymentStatus,
      };
    }));
  }, []);

  const assignRider = useCallback((id, rider) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, rider } : o)));
  }, []);

  // Admin-only: releases a stuck order's rider so it reappears in the
  // available pool for someone else to claim. Restricted (in the UI) to
  // "ready" orders — once picked up, the rider physically has the food,
  // so reassigning isn't a database operation anymore, it's a phone call.
  const unassignRider = useCallback((id) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, rider: null } : o)));
  }, []);

  const raiseDispute = useCallback((order, reason) => {
    disputeCounter += 1;
    setDisputes((prev) => [...prev, {
      id: disputeCounter, orderId: order.id, vendorId: order.vendor.id, vendorName: order.vendor.name,
      total: order.total, reason, status: "open", createdAt: Date.now(), resolvedAt: null,
    }]);
  }, []);

  const submitReview = useCallback((order, vendorRating, riderRating, comment, customerName) => {
    reviewCounter += 1;
    setReviews((prev) => [...prev, {
      id: reviewCounter, orderId: order.id, vendorId: order.vendor.id, vendorName: order.vendor.name,
      riderName: order.rider || null, vendorRating, riderRating: riderRating || null,
      comment: comment || "", customerName, createdAt: Date.now(),
    }]);
  }, []);

  // Three states, not two: "open" (just reported, nobody's looked yet),
  // "in_progress" (someone's actively working it), "resolved" (closed out).
  const setDisputeStatus = useCallback((id, status) => {
    setDisputes((prev) => prev.map((d) => (
      d.id === id ? { ...d, status, resolvedAt: status === "resolved" ? Date.now() : d.resolvedAt } : d
    )));
  }, []);

  // Operational issues are separate from vendor disputes on purpose: they
  // are not about a vendor/rider doing something wrong, they are app/payment
  // failures (charged with no order, stuck status, crash mid-checkout).
  // Not gated by order status or even requiring an order to exist, since the
  // failure can happen before an order is ever created.
  const raiseOperationalIssue = useCallback((reason, orderId, reporterRole, reporterName) => {
    disputeCounter += 1;
    setOperationalIssues((prev) => [...prev, {
      id: disputeCounter, orderId: orderId || null, reason, status: "open", createdAt: Date.now(), resolvedAt: null,
      reporterRole: reporterRole || "customer", reporterName: reporterName || "Guest",
    }]);
  }, []);

  const setOperationalIssueStatus = useCallback((id, status) => {
    setOperationalIssues((prev) => prev.map((i) => (
      i.id === id ? { ...i, status, resolvedAt: status === "resolved" ? Date.now() : i.resolvedAt } : i
    )));
  }, []);

  const updatePrice = useCallback((vendorId, itemId, price) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId
        ? { ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, price } : i)) }
        : v
    )));
  }, []);

  const addProduct = useCallback((vendorId, product) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId ? { ...v, items: [...v.items, product] } : v
    )));
  }, []);

  const toggleVendorOpen = useCallback((vendorId) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId ? { ...v, isOpen: !v.isOpen } : v
    )));
  }, []);

  const addAddOn = useCallback((vendorId, itemId, addOn) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId
        ? { ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, addOns: [...(i.addOns || []), addOn] } : i)) }
        : v
    )));
  }, []);

  const removeAddOn = useCallback((vendorId, itemId, addOnId) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId
        ? { ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, addOns: (i.addOns || []).filter((a) => a.id !== addOnId) } : i)) }
        : v
    )));
  }, []);

  const toggleProductAvailable = useCallback((vendorId, itemId) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId
        ? { ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i)) }
        : v
    )));
  }, []);

  // Admin-level account control — separate from a vendor's own isOpen
  // toggle ("we're closed right now, temporarily") or a rider's own
  // isOnline toggle ("I'm off shift"). isActive is Route's kill switch: a
  // suspended account can't operate no matter what it sets its own status
  // to. Pairs with the backend's PATCH /auth/users/:id/suspend, which
  // reuses the same `approved` flag that gates login in the first place.
  const toggleVendorActive = useCallback((vendorId) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId ? { ...v, isActive: !v.isActive } : v
    )));
  }, []);

  // No self-registration exists in this prototype (by design — see
  // PROJECT_STATUS.md), so Admin adding an account directly to the roster
  // is the functional equivalent of approving a signup.
  const addVendor = useCallback((vendor) => {
    setVendors((prev) => [...prev, { ...vendor, isOpen: true, isActive: true, items: [] }]);
  }, []);

  // Admin edits an existing vendor's profile/contact — separate from
  // toggleVendorActive (suspend) and addVendor (onboard new): this fixes
  // a typo or updates a detail on someone already on the roster, which
  // previously nothing could do.
  const updateVendorProfile = useCallback((vendorId, fields) => {
    setVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, ...fields } : v)));
  }, []);

  const updateVendorVerification = useCallback((vendorId, fields) => {
    setVendors((prev) => prev.map((v) => (
      v.id === vendorId ? { ...v, ...fields, verifiedAt: fields.verified ? Date.now() : null } : v
    )));
  }, []);

  const toggleRiderOnline = useCallback((riderId) => {
    setRiders((prev) => prev.map((r) => (
      r.id === riderId ? { ...r, isOnline: !r.isOnline } : r
    )));
  }, []);

  // Suspending also forces the rider offline — being suspended shouldn't
  // still let someone sit "online" waiting for deliveries they can't
  // accept. Reactivating doesn't auto-restore online status; they go
  // online themselves, same as any normal shift start.
  const toggleRiderActive = useCallback((riderId) => {
    setRiders((prev) => prev.map((r) => {
      if (r.id !== riderId) return r;
      const nowActive = !r.isActive;
      return { ...r, isActive: nowActive, isOnline: nowActive ? r.isOnline : false };
    }));
  }, []);

  const addRider = useCallback((rider) => {
    setRiders((prev) => [...prev, { ...rider, isOnline: false, isActive: true, bankName: "", bankAccountNumber: "", bankAccountName: "" }]);
  }, []);

  const updateRiderProfile = useCallback((riderId, fields) => {
    setRiders((prev) => prev.map((r) => (r.id === riderId ? { ...r, ...fields } : r)));
  }, []);

  const updateRiderVerification = useCallback((riderId, fields) => {
    setRiders((prev) => prev.map((r) => (
      r.id === riderId ? { ...r, ...fields, verifiedAt: fields.verified ? Date.now() : null } : r
    )));
  }, []);

  const setRiderBankAccount = useCallback((riderId, bank) => {
    setRiders((prev) => prev.map((r) => (r.id === riderId ? { ...r, ...bank } : r)));
  }, []);

  const requestPayout = useCallback((riderId, riderName, amount) => {
    payoutCounter += 1;
    setPayouts((prev) => [...prev, {
      id: `po${payoutCounter}${Date.now()}`, riderId, riderName, amount,
      status: "pending", requestedAt: Date.now(), processedAt: null,
    }]);
  }, []);

  const markPayoutPaid = useCallback((payoutId) => {
    setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, status: "paid", processedAt: Date.now() } : p)));
  }, []);

  const rejectPayout = useCallback((payoutId) => {
    setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, status: "rejected", processedAt: Date.now() } : p)));
  }, []);

  const addAuditEntry = useCallback((actor, action, target) => {
    auditCounter += 1;
    setAuditLog((prev) => [...prev, { id: auditCounter, actor, action, target, createdAt: Date.now() }]);
  }, []);

  return (
    <div className="rt-app">
      <GlobalStyle />
      <RouteSwitcher role={role} setRole={setRole} orders={orders} />
      {role === "customer" && <CustomerApp orders={orders} placeOrder={placeOrder} disputes={disputes} raiseDispute={raiseDispute} vendors={vendors} socialProofPeriod={socialProofPeriod} raiseOperationalIssue={raiseOperationalIssue} confirmPayment={confirmPayment} cancelOrder={cancelOrder} reviews={reviews} submitReview={submitReview} riders={riders} />}
      {role === "vendor" && <VendorApp orders={orders} advanceOrder={advanceOrder} cancelOrder={cancelOrder} vendors={vendors} updatePrice={updatePrice} addProduct={addProduct} disputes={disputes} toggleVendorOpen={toggleVendorOpen} addAddOn={addAddOn} removeAddOn={removeAddOn} toggleProductAvailable={toggleProductAvailable} />}
      {role === "manager" && <ManagerApp orders={orders} advanceOrder={advanceOrder} cancelOrder={cancelOrder} vendors={vendors} toggleVendorOpen={toggleVendorOpen} />}
      {role === "rider" && <RiderApp orders={orders} advanceOrder={advanceOrder} assignRider={assignRider} riders={riders} toggleRiderOnline={toggleRiderOnline} payouts={payouts} setRiderBankAccount={setRiderBankAccount} requestPayout={requestPayout} raiseOperationalIssue={raiseOperationalIssue} />}
      {role === "admin" && <AdminApp orders={orders} disputes={disputes} setDisputeStatus={setDisputeStatus} vendors={vendors} operationalIssues={operationalIssues} setOperationalIssueStatus={setOperationalIssueStatus} riders={riders} toggleVendorActive={toggleVendorActive} addVendor={addVendor} toggleRiderActive={toggleRiderActive} addRider={addRider} cancelOrder={cancelOrder} unassignRider={unassignRider} auditLog={auditLog} addAuditEntry={addAuditEntry} payouts={payouts} markPayoutPaid={markPayoutPaid} rejectPayout={rejectPayout} updateVendorProfile={updateVendorProfile} updateVendorVerification={updateVendorVerification} updateRiderProfile={updateRiderProfile} updateRiderVerification={updateRiderVerification} />}
    </div>
  );
}
