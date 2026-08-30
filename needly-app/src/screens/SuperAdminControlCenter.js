import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Platform, Linking } from "react-native";
import { SuperAdminAPI, AuthAPI, VendorAPI, RiderAPI, PayoutAPI, DisputeAPI, AuditAPI, BookingAPI, NotificationAPI } from "../api/client";
import { connectSocket, getSocket, subscribeToRealtimeEvents } from "../api/socket";
import AdminScreen from "./AdminScreen";

const SIDEBAR_BG = "#0B0E17", SIDEBAR_W = 230, TOPBAR_H = 58;
const PURPLE = "#6F45E9", PURPLE_LIGHT = "#7E57C2", PURPLE_SOFT = "#F3E8FF";
const BG = "#F4F5F8", WHITE = "#FFFFFF", BORDER = "#E5E7EB";
const TEXT_MAIN = "#111827", TEXT_SUB = "#6B7280";
const GREEN = "#10B981", GREEN_BG = "#D1FAE5";
const RED = "#EF4444", RED_BG = "#FEE2E2";
const AMBER = "#F59E0B", AMBER_BG = "#FEF3C7";
const BLUE = "#3B82F6", BLUE_BG = "#DBEAFE";
const PINK = "#EC4899", PINK_BG = "#FCE7F3";

const NAV = [
  { id: "overview", label: "Dashboard", icon: "📊" },
  { id: "adminOps", label: "Admin Approvals", icon: "⚡" },
  { section: "OPERATIONS" },
  { id: "liveOps", label: "Live Operations", icon: "📡" },
  { id: "orders", label: "Orders", icon: "📦" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "riderOps", label: "Riders", icon: "🛵" },
  { id: "agentOps", label: "Agents", icon: "🤝" },
  { id: "hubs", label: "Hubs", icon: "🏬" },
  { id: "dispatch", label: "Dispatch", icon: "⚡" },
  { section: "MANAGEMENT" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "vendors", label: "Vendors", icon: "🏪" },
  { id: "riderFleet", label: "Rider Fleet", icon: "🛵" },
  { id: "providers", label: "Providers", icon: "🧰" },
  { id: "products", label: "Products", icon: "🏷️" },
  { id: "services", label: "Services", icon: "🛠️" },
  { id: "categories", label: "Categories", icon: "🗂️" },
  { id: "locations", label: "Locations", icon: "📍" },
  { section: "FINANCE" },
  { id: "transactions", label: "Transactions", icon: "💳" },
  { id: "payouts", label: "Payouts", icon: "💸" },
  { id: "invoices", label: "Invoices", icon: "📄" },
  { id: "receipts", label: "Receipts", icon: "🧾" },
  { id: "refunds", label: "Refunds", icon: "🔄" },
  { id: "commissions", label: "Platform Fee", icon: "📈" },
  { section: "ADMINISTRATION" },
  { id: "admins", label: "Admins", icon: "👤" },
  { id: "roles", label: "Roles & Permissions", icon: "🛡️" },
  { id: "integrations", label: "Integrations & API Keys", icon: "🔌" },
  { section: "SUPPORT & ENGAGEMENT" },
  { id: "tickets", label: "Support Tickets", icon: "💬" },
  { id: "disputes", label: "Reviews & Disputes", icon: "⚖️" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "promotions", label: "Homepage Ads", icon: "📣" },
  { section: "REPORTS & ANALYTICS" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "reports", label: "Reports", icon: "📊" },
  { section: "SYSTEM" },
  { id: "auditLogs", label: "Audit Logs", icon: "📜" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "health", label: "System Health", icon: "🟢" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const fmt = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const fmtN = (n) => Number(n || 0).toLocaleString("en-NG");
const pct = (value, total) => Number(total || 0) > 0 ? Number(((Number(value || 0) / Number(total)) * 100).toFixed(1)) : 0;
const formatClock = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "—";
  }
};
const statusLabel = (status) => ({
  PLACED: "Searching Rider",
  ACCEPTED: "Rider Assigned",
  READY: "Preparing",
  PICKED_UP: "In Transit",
  DELIVERED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
})[status] || status || "Pending";
const categoryIcon = (category = "") => {
  const c = String(category).toLowerCase();
  if (c.includes("food") || c.includes("restaurant")) return "🍕";
  if (c.includes("grocery") || c.includes("market")) return "🛒";
  if (c.includes("health") || c.includes("pharm")) return "💊";
  if (c.includes("auto")) return "🚗";
  if (c.includes("home") || c.includes("clean")) return "🧹";
  return "📦";
};
const ABEOKUTA_CENTER = { latitude: 7.1475, longitude: 3.3619 };
const ABEOKUTA_BOUNDS = {
  minLat: 7.08,
  maxLat: 7.24,
  minLng: 3.25,
  maxLng: 3.47,
};
const hasCoords = (item = {}) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isInsideAbeokuta = (point = {}) => hasCoords(point)
  && Number(point.latitude) >= ABEOKUTA_BOUNDS.minLat
  && Number(point.latitude) <= ABEOKUTA_BOUNDS.maxLat
  && Number(point.longitude) >= ABEOKUTA_BOUNDS.minLng
  && Number(point.longitude) <= ABEOKUTA_BOUNDS.maxLng;
const projectMapPoint = (point, bounds) => ({
  left: `${clamp(((Number(point.longitude) - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100, 4, 96)}%`,
  top: `${clamp((1 - ((Number(point.latitude) - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100, 5, 95)}%`,
});

const editFieldsMap = {
  user: [["Full Name", "name"], ["Email", "email"], ["Phone", "phone"], ["Role", "role"]],
  vendor: [["Store Name", "name"], ["Category", "category"], ["Area", "area"], ["ETA", "eta"]],
  rider: [["Zone", "zone"], ["Rating", "rating", true]],
  agent: [["Name", "name"], ["Phone", "phone"], ["Zone", "zone"], ["Hub ID", "hubId"], ["Online", "isOnline"], ["Verified", "verified"], ["Bank Name", "bankName"], ["Account Number", "bankAccountNumber"], ["Account Name", "bankAccountName"]],
  hub: [["Hub Name", "name"], ["Area", "area"], ["Address", "address"], ["Latitude", "latitude", true], ["Longitude", "longitude", true], ["Active", "active"]],
  product: [["Product Name", "name"], ["Price", "price", true], ["Emoji", "emoji"], ["Subcategory", "subcategory"], ["Stock", "stock", true]],
  service: [["Service Name", "name"], ["Category", "category"], ["Price", "price", true], ["Description", "description"]],
  order: [["Status", "status"], ["Cancel Reason", "cancelReason"]],
  booking: [["Status", "status"], ["Provider Name", "providerName"], ["Total", "total", true], ["Cancel Reason", "cancelReason"]],
  location: [["Location Name", "name"], ["Delivery Fee", "deliveryFee", true], ["Max Radius", "maxDistance", true]],
  category: [["Key", "key"], ["Label", "label"], ["Slug", "slug"], ["Type", "type"], ["Flow", "flow"], ["Parent ID", "parentId"], ["Division ID", "divisionId"], ["Description", "description"], ["Icon", "icon"], ["Image URL", "image"], ["Banner URL", "bannerImage"], ["Image Key", "imageKey"], ["Position", "position", true], ["Featured", "isFeatured"], ["Homepage", "showOnHomepage"], ["Location", "location"], ["Active", "active"]],
  commission: [["Target Name", "targetName"], ["Fee %", "ratePercent", true]],
  promotion: [
    ["Promo Code", "code"],
    ["Placement", "placement"],
    ["Admin Title", "title"],
    ["Banner Kicker", "bannerKicker"],
    ["Banner Title", "bannerTitle"],
    ["Banner Body", "bannerBody"],
    ["CTA", "bannerCta"],
    ["Badge", "bannerBadge"],
    ["Image URL", "bannerImageUrl"],
    ["Destination Category", "destinationCategory"],
    ["Location", "location"],
    ["Display Order", "displayOrder", true],
    ["Active", "active"],
  ],
  ticket: [["Subject", "subject"], ["Status", "status"], ["Priority", "priority"]],
  refund: [["Status", "status"], ["Reason", "reason"]],
};

function KpiCard({ icon, bg, label, value, change, up }) {
  return (
    <View style={kpi.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <View style={[kpi.iconBox, { backgroundColor: bg }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={kpi.label}>{label}</Text>
      </View>
      <Text style={kpi.value}>{value}</Text>
      <Text style={[kpi.change, { color: up ? GREEN : RED }]}>
        {up ? "↑" : "↓"} {change} vs last 7 days
      </Text>
    </View>
  );
}

function Badge({ label, color, bg }) {
  return (
    <View style={{ backgroundColor: bg || BORDER, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: color || TEXT_SUB, fontSize: 10, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function PH({ title, onViewAll }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Text style={s.panelTitle}>{title}</Text>
      {onViewAll && (
        <Pressable onPress={onViewAll}>
          <Text style={{ color: PURPLE, fontSize: 12, fontWeight: "600" }}>View all</Text>
        </Pressable>
      )}
    </View>
  );
}

function AlertRow({ icon, title, desc, time, color }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color + "20", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>{title}</Text>
        <Text style={{ fontSize: 11, color: TEXT_SUB, marginTop: 1 }}>{desc}</Text>
      </View>
      <Text style={{ fontSize: 10, color: TEXT_SUB, marginTop: 2 }}>{time}</Text>
    </View>
  );
}

function DonutChart({ segments, centerNumber, centerLabel, size = 110 }) {
  const r = (size - 16) / 2, circ = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  let currentAngle = -90;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circ;
          const strokeDasharray = `${dash} ${circ - dash}`;
          const rotate = currentAngle;
          currentAngle += (seg.pct / 100) * 360;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={strokeDasharray}
              strokeLinecap="butt"
              transform={`rotate(${rotate} ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: TEXT_MAIN }}>{centerNumber}</Text>
        <Text style={{ fontSize: 9, color: TEXT_SUB, marginTop: 1 }}>{centerLabel}</Text>
      </View>
    </View>
  );
}

function RevenueChart({ width = 280, height = 110 }) {
  const pts = [[0, 85], [35, 68], [70, 78], [105, 48], [140, 58], [175, 28], [210, 38], [245, 12], [280, 22]];
  const pathD = `M ${pts.map(p => p.join(",")).join(" L ")}`;
  const areaD = `${pathD} L 280,${height} L 0,${height} Z`;

  return (
    <View style={{ width: "100%", height: height + 25 }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 25, justifyContent: "space-between" }}>
        {["₦10M", "₦8M", "₦6M", "₦4M", "₦2M", "₦0"].map(lbl => (
          <Text key={lbl} style={{ fontSize: 9, color: "#9CA3AF" }}>{lbl}</Text>
        ))}
      </View>
      <View style={{ marginLeft: 36, height: height, position: "relative" }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6F45E9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6F45E9" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {[20, 45, 70, 95].map(y => (
            <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="#F3F4F6" strokeDasharray="3 3" />
          ))}
          <path d={areaD} fill="url(#purpleGrad)" />
          <path d={pathD} fill="none" stroke="#6F45E9" strokeWidth="3" />
          <circle cx="245" cy="12" r="5" fill="#6F45E9" stroke="#FFFFFF" strokeWidth="2" />
        </svg>

        <View style={{ position: "absolute", right: 20, top: -14, backgroundColor: "#6F45E9", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ color: WHITE, fontSize: 9, fontWeight: "800" }}>₦8.2M</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          {["Aug 1", "Aug 6", "Aug 11", "Aug 16", "Aug 21", "Aug 28", "Aug 31"].map(d => (
            <Text key={d} style={{ fontSize: 9, color: "#9CA3AF" }}>{d}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function LiveMapGraphic({ orders = [], riders = [], vendors = [], height = 320 }) {
  const points = [
    ...vendors.filter(hasCoords).slice(0, 18).map((vendor) => ({
      id: `vendor-${vendor.id}`,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      label: vendor.name || "Vendor",
      type: "Vendor",
      icon: "🏪",
      color: AMBER,
    })),
    ...riders.filter(hasCoords).slice(0, 18).map((rider) => ({
      id: `rider-${rider.id}`,
      latitude: rider.latitude,
      longitude: rider.longitude,
      label: rider.user?.name || rider.name || "Rider",
      type: rider.isOnline ? "Online Rider" : "Rider",
      icon: "🛵",
      color: rider.isOnline ? GREEN : TEXT_SUB,
    })),
    ...orders.flatMap((order) => {
      const orderId = order.orderNumber || order.reference || order.id || "Order";
      const deliveryPoint = Number.isFinite(Number(order.deliveryLatitude)) && Number.isFinite(Number(order.deliveryLongitude))
        ? [{
            id: `delivery-${order.id}`,
            latitude: order.deliveryLatitude,
            longitude: order.deliveryLongitude,
            label: order.deliveryAddress || orderId,
            type: "Delivery",
            icon: "📍",
            color: RED,
          }]
        : [];
      const vendorPoint = hasCoords(order.vendor || {})
        ? [{
            id: `order-vendor-${order.id}`,
            latitude: order.vendor.latitude,
            longitude: order.vendor.longitude,
            label: order.vendor.name || "Vendor",
            type: "Order Vendor",
            icon: "🏪",
            color: AMBER,
          }]
        : [];
      const riderPoint = hasCoords(order.rider || {})
        ? [{
            id: `order-rider-${order.id}`,
            latitude: order.rider.latitude,
            longitude: order.rider.longitude,
            label: order.rider.user?.name || "Assigned Rider",
            type: statusLabel(order.status),
            icon: "🛵",
            color: BLUE,
          }]
        : [];
      return [...deliveryPoint, ...vendorPoint, ...riderPoint];
    }),
  ];
  const abeokutaPoints = points.filter(isInsideAbeokuta);
  const displayPoints = abeokutaPoints.length ? abeokutaPoints : [{
    id: "abeokuta-center",
    latitude: ABEOKUTA_CENTER.latitude,
    longitude: ABEOKUTA_CENTER.longitude,
    label: "Abeokuta",
    type: "Needly Service Area",
    icon: "📍",
    color: PURPLE,
  }];
  const bounds = ABEOKUTA_BOUNDS;
  const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
  const center = displayPoints[0] || ABEOKUTA_CENTER;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${Number(center.latitude)},${Number(center.longitude)}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${Number(center.latitude)}&mlon=${Number(center.longitude)}#map=13/${Number(center.latitude)}/${Number(center.longitude)}`;
  const openMap = () => Linking.openURL(fullMapUrl).catch(() => {});

  return (
    <View style={{ width: "100%", height, borderRadius: 12, overflow: "hidden", backgroundColor: "#EAF0F6", borderWidth: 1, borderColor: BORDER, position: "relative" }}>
      {Platform.OS === "web" ? (
        React.createElement("iframe", {
          title: "Needly live operations map",
          src: osmUrl,
          loading: "lazy",
          referrerPolicy: "no-referrer-when-downgrade",
          style: { border: 0, width: "100%", height: "100%", filter: "saturate(1.05) contrast(0.96)" },
        })
      ) : (
        <Pressable onPress={openMap} style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 18 }}>
          <Text style={{ color: TEXT_MAIN, fontWeight: "900", fontSize: 15 }}>Open real map</Text>
          <Text style={{ color: TEXT_SUB, fontSize: 12, textAlign: "center", marginTop: 6 }}>View Needly live locations in OpenStreetMap.</Text>
        </Pressable>
      )}

      {displayPoints.slice(0, 28).map((point) => {
        const pos = projectMapPoint(point, bounds);
        return (
          <View key={point.id} style={[s.mapPinWrap, { left: pos.left, top: pos.top }]}>
            <View style={[s.mapPin, { backgroundColor: point.color }]}>
              <Text style={{ fontSize: 11 }}>{point.icon}</Text>
            </View>
          </View>
        );
      })}

      <View style={s.mapInfoCard}>
        <Text style={s.mapInfoTitle}>Abeokuta Live Map</Text>
        <Text numberOfLines={1} style={s.mapInfoSub}>
          {displayPoints.length} live point(s) inside Abeokuta
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
          <Badge label={`${vendors.filter(hasCoords).length} Vendors`} color={AMBER} bg={AMBER_BG} />
          <Badge label={`${riders.filter(hasCoords).length} Riders`} color={GREEN} bg={GREEN_BG} />
          <Badge label={`${orders.filter((o) => Number.isFinite(Number(o.deliveryLatitude))).length} Deliveries`} color={RED} bg={RED_BG} />
        </View>
      </View>

      <Pressable onPress={openMap} style={s.mapOpenBtn}>
        <Text style={s.mapOpenText}>Open full map</Text>
      </Pressable>
      <View style={s.mapAttribution}>
        <Text style={s.mapAttributionText}>© OpenStreetMap</Text>
      </View>
    </View>
  );
}

export default function SuperAdminControlCenter({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [liveOps, setLiveOps] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [riders, setRiders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [integrationDrafts, setIntegrationDrafts] = useState({});
  const [integrationSaving, setIntegrationSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [lastRealtimeAt, setLastRealtimeAt] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  // ── Realtime Contacts state & Audit Deep-Dive ─────────────────────────────
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError]   = useState(null);
  const [lastRefreshed, setLastRefreshed]   = useState(null);
  const [contactSortBy, setContactSortBy]   = useState("totalSpent");
  const [flagged, setFlagged]               = useState({});
  const [vendorSortBy, setVendorSortBy]     = useState("totalRevenue");
  const pollIntervalRef                      = useRef(null);
  const realtimeRefreshRef                   = useRef(null);
  const CONTACTS_POLL_MS                     = 30_000; // refresh every 30 s

  const [activeContactDetail, setActiveContactDetail] = useState(null);
  const [contactProfileData, setContactProfileData]   = useState(null);
  const [profileLoading, setProfileLoading]           = useState(false);
  const [auditTab, setAuditTab]                       = useState("reconciliation");

  const openContactAudit = async (contact) => {
    setActiveContactDetail(contact);
    setProfileLoading(true);
    setAuditTab("reconciliation");
    try {
      const data = await AuthAPI.getFullProfile(contact.id);
      setContactProfileData(data);
    } catch (err) {
      alert("Failed to load audit profile: " + (err.message || err));
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchContacts = useCallback(async (silent = false) => {
    if (!silent) setContactsLoading(true);
    setContactsError(null);
    try {
      const res = await AuthAPI.customers();
      setCustomers(Array.isArray(res) ? res : res?.customers || []);
      setLastRefreshed(new Date());
    } catch (err) {
      setContactsError(err.message || "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // start/stop polling when the contacts tab is active
  useEffect(() => {
    if (activeTab === "customers") {
      fetchContacts();
      pollIntervalRef.current = setInterval(() => fetchContacts(true), CONTACTS_POLL_MS);
    } else {
      clearInterval(pollIntervalRef.current);
    }
    return () => clearInterval(pollIntervalRef.current);
  }, [activeTab, fetchContacts]);
  // ────────────────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rs = await Promise.allSettled([
        SuperAdminAPI.stats(), SuperAdminAPI.liveOps(), AuthAPI.customers(),
        VendorAPI.adminList(),
        RiderAPI.adminList(), SuperAdminAPI.bookings(), SuperAdminAPI.locations(),
        SuperAdminAPI.commissions(), SuperAdminAPI.promotions(),
        SuperAdminAPI.tickets(), SuperAdminAPI.roles(), SuperAdminAPI.refunds(),
        PayoutAPI.list(), DisputeAPI.list(), AuditAPI.list(), SuperAdminAPI.notifications(),
        SuperAdminAPI.health(), SuperAdminAPI.integrations(), SuperAdminAPI.orders(),
	        SuperAdminAPI.products(), SuperAdminAPI.services(), SuperAdminAPI.marketplaceCategories(), SuperAdminAPI.admins(),
	        SuperAdminAPI.fraudAlerts(), SuperAdminAPI.walletTransactions(), SuperAdminAPI.agents(), SuperAdminAPI.hubs(),
	      ]);

	      const [st, lo, cu, ve, ri, bk, lc, cm, pr, tk, rl, rf, py, ds, ad, nt, hl, ig, od, pd, sv, cg, au, fa, wt, ag, hb] = rs;
      if (st.status === "fulfilled" && st.value) setStats(st.value);
      if (lo.status === "fulfilled" && lo.value) setLiveOps(lo.value);
      if (cu.status === "fulfilled") setCustomers(Array.isArray(cu.value) ? cu.value : cu.value?.customers || []);
      if (ve.status === "fulfilled") setVendors(Array.isArray(ve.value) ? ve.value : []);
      if (ri.status === "fulfilled") setRiders(Array.isArray(ri.value) ? ri.value : []);
      if (bk.status === "fulfilled") setBookings(Array.isArray(bk.value) ? bk.value : []);
      if (lc.status === "fulfilled") setLocations(Array.isArray(lc.value) ? lc.value : []);
      if (cm.status === "fulfilled") setCommissions(Array.isArray(cm.value) ? cm.value : []);
      if (pr.status === "fulfilled") setPromotions(Array.isArray(pr.value) ? pr.value : []);
      if (tk.status === "fulfilled") setTickets(Array.isArray(tk.value) ? tk.value : []);
      if (rl.status === "fulfilled") setRoles(Array.isArray(rl.value) ? rl.value : []);
      if (rf.status === "fulfilled") setRefunds(Array.isArray(rf.value) ? rf.value : []);
      if (py.status === "fulfilled") setPayouts(Array.isArray(py.value) ? py.value : []);
      if (ds.status === "fulfilled") setDisputes(Array.isArray(ds.value) ? ds.value : []);
      if (ad.status === "fulfilled") setAuditLogs(Array.isArray(ad.value) ? ad.value : []);
      if (nt.status === "fulfilled") setNotifications(Array.isArray(nt.value) ? nt.value : []);
      if (hl.status === "fulfilled" && hl.value) setHealthData(hl.value);
      if (ig.status === "fulfilled") setIntegrations(Array.isArray(ig.value) ? ig.value : []);
      if (od.status === "fulfilled") setOrders(Array.isArray(od.value) ? od.value : []);
      if (pd.status === "fulfilled") setProducts(Array.isArray(pd.value) ? pd.value : []);
      if (sv.status === "fulfilled") setServices(Array.isArray(sv.value) ? sv.value : []);
      if (cg.status === "fulfilled") setCategories(Array.isArray(cg.value) ? cg.value : []);
      if (au.status === "fulfilled") setAdminUsers(Array.isArray(au.value) ? au.value : []);
	      if (fa.status === "fulfilled") setFraudAlerts(Array.isArray(fa.value) ? fa.value : []);
	      if (wt.status === "fulfilled") setWalletTransactions(Array.isArray(wt.value) ? wt.value : []);
	      if (ag.status === "fulfilled") setAgents(Array.isArray(ag.value) ? ag.value : []);
	      if (hb.status === "fulfilled") setHubs(Array.isArray(hb.value) ? hb.value : []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const scheduleRealtimeReload = useCallback(() => {
    setLastRealtimeAt(new Date());
    clearTimeout(realtimeRefreshRef.current);
    realtimeRefreshRef.current = setTimeout(() => {
      reload();
      if (activeTab === "customers") fetchContacts(true);
    }, 500);
  }, [activeTab, fetchContacts, reload]);

  useEffect(() => {
    let cleanupSocket;
    let socketRef;
    let stopped = false;
    const markLive = () => setRealtimeStatus("live");
    const markOffline = () => setRealtimeStatus("offline");

    (async () => {
      const socket = await connectSocket();
      if (!socket || stopped) {
        setRealtimeStatus("offline");
        return;
      }
      socketRef = socket;
      setRealtimeStatus(socket.connected ? "live" : "connecting");
      socket.on("connect", markLive);
      socket.on("disconnect", markOffline);
      socket.on("connect_error", markOffline);
      cleanupSocket = subscribeToRealtimeEvents({
        onOrderUpdate: scheduleRealtimeReload,
        onOrderAvailable: scheduleRealtimeReload,
        onBookingUpdate: scheduleRealtimeReload,
        onProviderStatus: scheduleRealtimeReload,
        onInventoryUpdate: scheduleRealtimeReload,
        onNotification: scheduleRealtimeReload,
        onAdminAlert: scheduleRealtimeReload,
        onDashboardRefresh: scheduleRealtimeReload,
        onContactNew: scheduleRealtimeReload,
        onContactUpdate: scheduleRealtimeReload,
        onContactSettingsUpdate: scheduleRealtimeReload,
      });
    })();

    return () => {
      stopped = true;
      clearTimeout(realtimeRefreshRef.current);
      if (cleanupSocket) cleanupSocket();
      const socket = socketRef || getSocket();
      if (socket) {
        socket.off("connect", markLive);
        socket.off("disconnect", markOffline);
        socket.off("connect_error", markOffline);
      }
    };
  }, [scheduleRealtimeReload]);

  const startEdit = (type, item) => { setEditingItem({ type, id: item.id }); setEditForm({ ...item }); };
  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const { type, id } = editingItem;
      if (type === "user") await AuthAPI.editContact(id, editForm);
      else if (type === "vendor") await SuperAdminAPI.updateVendor(id, editForm);
      else if (type === "rider") await SuperAdminAPI.updateRider(id, editForm);
      else if (type === "agent") await SuperAdminAPI.updateAgent(id, editForm);
      else if (type === "hub") await SuperAdminAPI.updateHub(id, editForm);
      else if (type === "product") await SuperAdminAPI.updateProduct(id, editForm);
      else if (type === "service") await SuperAdminAPI.updateService(id, editForm);
      else if (type === "order") await SuperAdminAPI.updateOrder(id, editForm);
      else if (type === "booking") await SuperAdminAPI.updateBooking(id, editForm);
      else if (type === "location") await SuperAdminAPI.updateLocation(id, editForm);
      else if (type === "category") await SuperAdminAPI.updateCategory(id, editForm);
      else if (type === "commission") await SuperAdminAPI.updateCommission(id, editForm);
      else if (type === "promotion") await SuperAdminAPI.updatePromotion(id, editForm);
      else if (type === "ticket") await SuperAdminAPI.updateTicket(id, editForm);
      else if (type === "refund") await SuperAdminAPI.updateRefund(id, editForm);
      setEditingItem(null); setEditForm({}); reload(); fetchContacts(true);
    } catch (e) { alert("Save failed: " + e.message); }
  };

  const updateIntegrationDraft = (provider, key, value) => {
    setIntegrationDrafts((current) => ({ ...current, [`${provider}.${key}`]: value }));
  };

  const addZone = async () => {
    const name = prompt("Location / delivery zone name:", "Abeokuta");
    if (!name) return;
    const deliveryFee = prompt("Delivery fee in naira:", "500");
    const maxDistance = prompt("Max delivery radius in km:", "25");
    try {
      await SuperAdminAPI.createLocation({ name, type: "ZONE", deliveryFee: Number(deliveryFee || 500), maxDistance: Number(maxDistance || 25) });
      reload();
    } catch (err) {
      alert("Add zone failed: " + (err.message || err));
    }
  };

  const addCategory = async () => {
    const key = prompt("Category key used by vendors/products:", "open-market-electronics");
    if (!key) return;
    const label = prompt("Customer-facing label:", key);
    if (!label) return;
    const type = (prompt("Type: CATEGORY, SUBCATEGORY, or TYPE", "CATEGORY") || "CATEGORY").toUpperCase();
    const divisionId = prompt("Division ID (example: div-open-market, div-services, div-rentals, div-jobs-gigs):", "div-open-market") || "";
    const parentId = prompt("Parent ID. Use division ID for a top category, or existing category ID for subcategory:", divisionId) || "";
    const slug = prompt("SEO slug/path:", key.toLowerCase().replace(/[^a-z0-9]+/g, "-")) || key;
    const flow = prompt("Flow: BUY, BOOK, or RESERVE", "BUY") || "BUY";
    const position = prompt("Display position:", "1");
    const icon = prompt("Icon key:", "basket") || "";
    const description = prompt("Description:", "") || "";
    try {
      await SuperAdminAPI.createMarketplaceCategory({
        key,
        label,
        slug,
        type,
        flow,
        parentId,
        divisionId,
        description,
        icon,
        imageKey: key,
        position: Number(position || 1),
        isFeatured: true,
        showOnHomepage: true,
        active: true,
        location: "Abeokuta",
      });
      reload();
    } catch (err) {
      alert("Add category failed: " + (err.message || err));
    }
  };

  const addMarketplaceDivision = async () => {
    const label = prompt("Division name:", "Open Market");
    if (!label) return;
    const key = prompt("Unique division key:", label.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (!key) return;
    const flow = prompt("Default flow: BUY, BOOK, or RESERVE", label.toLowerCase().includes("service") ? "BOOK" : "BUY") || "BUY";
    const position = prompt("Display position:", "1");
    const description = prompt("Description:", "") || "";
    try {
      await SuperAdminAPI.createMarketplaceDivision({
        key,
        label,
        slug: key,
        flow,
        description,
        type: "DIVISION",
        position: Number(position || 1),
        isFeatured: true,
        showOnHomepage: true,
        active: true,
        location: "Abeokuta",
      });
      reload();
    } catch (err) {
      alert("Add division failed: " + (err.message || err));
    }
  };

  const addAdmin = async () => {
    const email = prompt("Admin email:");
    if (!email) return;
    const name = prompt("Admin full name:", "Needly Admin");
    try {
      const created = await SuperAdminAPI.createUser({ name: name || "Needly Admin", email, role: "ADMIN", approved: true });
      alert(`Admin created.${created?.temporaryPassword ? ` Temporary password: ${created.temporaryPassword}` : ""}`);
      reload();
    } catch (err) {
      alert("Add admin failed: " + (err.message || err));
    }
  };

  const addVendor = async () => {
    const name = prompt("Vendor / store name:");
    if (!name) return;
    const ownerEmail = prompt("Vendor owner email (optional):");
    const category = prompt("Category:", "Local Market");
    const area = prompt("Area:", "Abeokuta");
    try {
      const created = await SuperAdminAPI.createVendor({ name, ownerEmail, ownerName: name, category, area, verified: true, isOpen: true });
      alert(`Vendor created.${created?.temporaryPassword ? ` Owner temporary password: ${created.temporaryPassword}` : ""}`);
      reload();
    } catch (err) {
      alert("Add vendor failed: " + (err.message || err));
    }
  };

  const addRider = async () => {
    const email = prompt("Rider email:");
    if (!email) return;
    const name = prompt("Rider full name:", "Needly Rider");
    const zone = prompt("Rider zone:", "Abeokuta");
    try {
      const created = await SuperAdminAPI.createRider({ name: name || "Needly Rider", email, zone, verified: true });
      alert(`Rider created.${created?.temporaryPassword ? ` Temporary password: ${created.temporaryPassword}` : ""}`);
      reload();
    } catch (err) {
      alert("Add rider failed: " + (err.message || err));
    }
  };

  const addHub = async () => {
    const name = prompt("Hub name:", "Needly Abeokuta Hub");
    if (!name) return;
    const area = prompt("Hub area:", "Abeokuta");
    const address = prompt("Hub address:", "Kuto, Abeokuta, Ogun State");
    if (!address) return;
    try {
      await SuperAdminAPI.createHub({ name, area, address, active: true });
      reload();
    } catch (err) {
      alert("Add hub failed: " + (err.message || err));
    }
  };

  const addAgent = async () => {
    const email = prompt("Agent email:");
    if (!email) return;
    const name = prompt("Agent full name:", "Needly Agent");
    const zone = prompt("Agent pickup zone:", "Abeokuta");
    const hubId = prompt("Hub ID. Leave empty for default active hub:", hubs[0]?.id || "hub-abeokuta-main");
    try {
      const created = await SuperAdminAPI.createAgent({ name: name || "Needly Agent", email, zone, hubId: hubId || undefined, verified: true });
      alert(`Agent created.${created?.temporaryPassword ? ` Temporary password: ${created.temporaryPassword}` : ""}`);
      reload();
    } catch (err) {
      alert("Add agent failed: " + (err.message || err));
    }
  };

  const addHomepageBanner = async () => {
    const bannerTitle = prompt("Banner headline:", "Fresh from Abeokuta");
    if (!bannerTitle) return;
    const bannerKicker = prompt("Large title / category text:", "Open Market");
    const bannerBody = prompt("Short description:", "Shop quality products from local sellers.");
    const bannerCta = prompt("Button text:", "Shop Open Market");
    const bannerBadge = prompt("Badge text:", "Supporting Local Abeokuta");
    const destinationCategory = prompt("Destination category:", "Local Market");
    const bannerImageUrl = prompt("Banner image URL. Leave empty to use the default market image:", "");
    const location = prompt("Location control. Leave empty for all locations:", "Abeokuta");
    const displayOrder = prompt("Display order. Lower number shows first:", "1");
    try {
      await SuperAdminAPI.createPromotion({
        code: `BANNER-${Date.now()}`,
        title: bannerTitle,
        placement: "HOMEPAGE_CAROUSEL",
        discountType: "PERCENT",
        discountValue: 0,
        bannerTitle,
        bannerKicker: bannerKicker || bannerTitle,
        bannerBody: bannerBody || "",
        bannerCta: bannerCta || "Shop Now",
        bannerBadge: bannerBadge || "",
        bannerImageUrl: bannerImageUrl || "",
        destinationCategory: destinationCategory || "Local Market",
        location: location || "",
        displayOrder: Number(displayOrder || 0),
        active: true,
      });
      reload();
    } catch (err) {
      alert("Add homepage ad failed: " + (err.message || err));
    }
  };

  const sendBroadcast = async () => {
    const title = prompt("Broadcast title:", "Needly Update");
    if (!title) return;
    const body = prompt("Broadcast message:");
    if (!body) return;
    const role = prompt("Send to role: ALL, CUSTOMER, VENDOR, RIDER, ADMIN", "ALL");
    try {
      const result = await SuperAdminAPI.broadcastNotification({ title, body, role: (role || "ALL").toUpperCase() });
      alert(`Broadcast sent to ${result.count || 0} user(s).`);
      reload();
    } catch (err) {
      alert("Broadcast failed: " + (err.message || err));
    }
  };

  const approveAllPendingPayouts = async () => {
    const pending = payouts.filter((p) => String(p.status || "").toUpperCase() === "PENDING");
    if (!pending.length) {
      alert("No pending payouts to approve.");
      return;
    }
    if (!confirm(`Mark ${pending.length} pending payout(s) as paid?`)) return;
    try {
      await Promise.all(pending.map((p) => PayoutAPI.markPaid(p.id, "Batch approved by Super Admin")));
      reload();
    } catch (err) {
      alert("Batch payout failed: " + (err.message || err));
    }
  };

  const saveIntegrationSetting = async (provider, key) => {
    const draftKey = `${provider}.${key}`;
    const value = integrationDrafts[draftKey];
    if (!value || !String(value).trim()) {
      alert("Paste the API value first.");
      return;
    }
    try {
      setIntegrationSaving(draftKey);
      const updated = await SuperAdminAPI.updateIntegration({ provider, key, value });
      setIntegrations(Array.isArray(updated) ? updated : []);
      setIntegrationDrafts((current) => ({ ...current, [draftKey]: "" }));
    } catch (err) {
      alert("Save failed: " + (err.message || err));
    } finally {
      setIntegrationSaving(null);
    }
  };

  const liveOrdersRaw = Array.isArray(liveOps?.liveOrders) ? liveOps.liveOrders : [];
  const liveBookingsRaw = Array.isArray(liveOps?.activeBookings) ? liveOps.activeBookings : [];
  const totalRiders = stats?.totalRiders ?? riders.length;
  const ridersOnline = stats?.onlineRiders ?? liveOps?.ridersOnlineCount ?? riders.filter((r) => r.isOnline).length;
  const ridersBusy = liveOps?.ridersOnDeliveryCount ?? 0;
  const ridersAvailable = Math.max(Number(ridersOnline || 0) - Number(ridersBusy || 0), 0);
  const ridersOffline = Math.max(Number(totalRiders || 0) - Number(ridersOnline || 0), 0);
  const activeOrdersCount = stats?.activeOrders ?? liveOrdersRaw.length;
  const totalOrders = stats?.ordersToday ?? activeOrdersCount;
  const totalOrderHistory = Number(stats?.completedOrders || 0) + Number(stats?.activeOrders || 0) + Number(stats?.cancelledOrders || 0);
  const revenue = stats?.grossRevenue ?? 0;
  const totalCust = stats?.totalCustomers ?? customers.length;
  const totalVend = stats?.totalVendors ?? vendors.length;
  const pendingPay = payouts
    .filter((p) => ["PENDING", "PROCESSING", "REQUESTED"].includes(String(p.status || "").toUpperCase()))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const liveOrdersData = liveOrdersRaw.map((order) => {
    const type = order.vendor?.category || order.type || "Order";
    const riderName = order.rider?.user?.name || order.rider?.name || "Waiting for rider";
    return {
      id: order.orderNumber || order.reference || order.id,
      type,
      name: order.customer?.name || order.customerName || "Customer",
      customer: order.customer?.name || order.customerName || "Customer",
      phone: order.customer?.phone || order.deliveryPhone || "—",
      address: order.deliveryAddress || order.address || "Address pending",
      store: order.vendor?.name || order.vendorName || "Vendor",
      area: order.vendor?.area || order.area || "—",
      items: Array.isArray(order.items) ? `${order.items.length} item(s)` : order.items || "Order items",
      total: Number(order.total || order.totalAmount || 0),
      time: formatClock(order.createdAt),
      status: statusLabel(order.status),
      rider: riderName,
      riderPhone: order.rider?.user?.phone || order.rider?.phone || "—",
      vehicle: order.rider?.vehicleType || order.rider?.vehicle || "—",
      eta: order.eta || "Live",
      elapsed: order.createdAt ? formatClock(order.createdAt) : "recently",
      progress: ({ PLACED: 0.15, ACCEPTED: 0.4, READY: 0.58, PICKED_UP: 0.78, DELIVERED: 1 }[order.status] || 0.25),
      icon: categoryIcon(type),
      category: type,
    };
  });

  const statusBadge = {
    "In Transit": { color: PURPLE, bg: PURPLE_SOFT },
    "Rider Assigned": { color: BLUE, bg: BLUE_BG },
    "Preparing": { color: AMBER, bg: AMBER_BG },
    "Confirmed": { color: GREEN, bg: GREEN_BG },
    "Accepted": { color: GREEN, bg: GREEN_BG },
    "Searching Rider": { color: RED, bg: RED_BG },
    "Completed": { color: GREEN, bg: GREEN_BG },
    "Cancelled": { color: RED, bg: RED_BG },
    "Pending": { color: AMBER, bg: AMBER_BG },
    "In Progress": { color: AMBER, bg: AMBER_BG },
  };

  const orderSegments = [
    { label: "Completed", pct: pct(stats?.completedOrders, totalOrderHistory), n: fmtN(stats?.completedOrders), color: GREEN },
    { label: "In Progress", pct: pct(stats?.activeOrders, totalOrderHistory), n: fmtN(stats?.activeOrders), color: BLUE },
    { label: "Cancelled", pct: pct(stats?.cancelledOrders, totalOrderHistory), n: fmtN(stats?.cancelledOrders), color: AMBER },
    { label: "Refunded", pct: pct(stats?.pendingRefundsCount, totalOrderHistory), n: fmtN(stats?.pendingRefundsCount), color: PINK },
    { label: "Bookings", pct: pct(stats?.activeBookings, Math.max(totalOrderHistory, Number(stats?.activeBookings || 0))), n: fmtN(stats?.activeBookings), color: "#9CA3AF" },
  ];

  const riderSegments = [
    { label: "Available", pct: pct(ridersAvailable, totalRiders), n: fmtN(ridersAvailable), color: GREEN },
    { label: "Busy", pct: pct(ridersBusy, totalRiders), n: fmtN(ridersBusy), color: AMBER },
    { label: "Offline", pct: pct(ridersOffline, totalRiders), n: fmtN(ridersOffline), color: RED },
  ];

  const categoryTotals = vendors.reduce((acc, vendor) => {
    const name = vendor.category || "Marketplace";
    acc[name] = acc[name] || { name, vendorCount: 0, productCount: 0, amount: 0 };
    acc[name].vendorCount += 1;
    acc[name].productCount += Number(vendor.productsCount || vendor.productCount || vendor.products?.length || 0);
    acc[name].amount += Number(vendor.totalRevenue || vendor.revenue || 0);
    return acc;
  }, {});
  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => (b.amount || b.productCount || b.vendorCount) - (a.amount || a.productCount || a.vendorCount))
    .slice(0, 5)
    .map((c, i) => ({
      name: c.name,
      orders: `${fmtN(c.productCount || c.vendorCount)} ${c.productCount ? "products" : "vendors"}`,
      amount: fmt(c.amount),
      icon: categoryIcon(c.name),
      bg: ["#FCE7F3", "#DCFCE7", "#DBEAFE", "#E0E7FF", "#CCFBF1"][i] || PURPLE_SOFT,
    }));

  const allFinancialTx = [
    ...payouts.map((p) => ({
      id: p.reference || p.id,
      type: "Payout",
      name: p.rider?.user?.name || p.vendor?.name || p.user?.name || "Recipient",
      amount: fmt(p.amount),
      time: formatClock(p.createdAt || p.updatedAt),
      status: statusLabel(p.status),
    })),
    ...refunds.map((r) => ({
      id: r.reference || r.id,
      type: "Refund",
      name: r.customer?.name || r.user?.name || "Customer",
      amount: fmt(r.amount),
      time: formatClock(r.createdAt || r.updatedAt),
      status: statusLabel(r.status),
    })),
    ...walletTransactions.map((tx) => ({
      id: tx.reference || tx.id,
      type: tx.type === "FUNDING" ? "Wallet Funding" : tx.category ? `Wallet ${tx.category}` : "Wallet",
      name: tx.user?.name || tx.user?.email || "Customer",
      amount: fmt(tx.amount),
      gateway: tx.gateway || "wallet",
      time: formatClock(tx.createdAt || tx.updatedAt),
      status: statusLabel(tx.status),
    })),
  ].sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const recentTx = allFinancialTx.slice(0, 5);

  const pendingApprovals = [
    { label: "New Vendors", val: fmtN(stats?.pendingVendors), color: RED },
    { label: "Pending Dispatch", val: `${fmtN(liveOps?.unassignedOrdersCount)} orders`, color: RED },
    { label: "Vendor Payouts", val: `${fmtN(payouts.filter((p) => ["PENDING", "PROCESSING", "REQUESTED"].includes(String(p.status || "").toUpperCase())).length)} (${fmt(pendingPay)})`, color: GREEN },
    { label: "Refund Requests", val: fmtN(stats?.pendingRefundsCount), color: AMBER },
    { label: "Support Tickets", val: fmtN(stats?.openTicketsCount), color: PURPLE },
  ];

  const platformActivity = [
    ...notifications.map((n) => ({ title: n.title || "Notification", desc: n.message || n.body || "Platform notification", time: formatClock(n.createdAt) })),
    ...auditLogs.map((a) => ({ title: a.action || "Audit activity", desc: a.entityType || a.description || a.actorEmail || "System activity", time: formatClock(a.createdAt) })),
    ...liveOrdersData.map((o) => ({ title: "Live order updated", desc: `${o.id} • ${o.store}`, time: o.time })),
  ].slice(0, 5);

  const quickActions = [
    { label: "Add Admin", icon: "👤", action: addAdmin },
    { label: "Add Vendor", icon: "🏪", action: addVendor },
    { label: "Add Rider", icon: "🛵", action: addRider },
    { label: "Send Notification", icon: "🔔", action: sendBroadcast },
    { label: "Approve Payouts", icon: "💳", action: approveAllPendingPayouts },
    { label: "View Reports", icon: "📈", action: () => setActiveTab("reports") },
    { label: "System Health", icon: "🫀", action: () => setActiveTab("health") },
    { label: "Audit Logs", icon: "📜", action: () => setActiveTab("auditLogs") },
  ];

  const GenericList = ({ items, type, fields, filterKey = "name" }) => {
    const filtered = (items || []).filter((it) => {
      if (!query.trim()) return true;
      const targetVal = String(it[filterKey] || it.id || "").toLowerCase();
      return targetVal.includes(query.trim().toLowerCase());
    });
    const canEdit = !!editFieldsMap[type]?.length;
    const columnWidth = 152;
    const firstColumnWidth = 190;
    const tableWidth = fields.reduce((sum, _field, idx) => sum + (idx === 0 ? firstColumnWidth : columnWidth), canEdit ? 112 : 0);
    const cellText = (value) => {
      if (value === true) return "Yes";
      if (value === false) return "No";
      if (value === null || value === undefined || value === "") return "—";
      return String(value);
    };

    return (
      <View style={s.panel}>
        <View style={s.sheetHeader}>
          <PH title={`${type.toUpperCase()} (${filtered.length})`} />
          <Text style={s.sheetHint}>Spreadsheet view</Text>
        </View>
        {filtered.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No records found.</Text>}
        {filtered.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sheetScroller}>
            <View style={[s.sheetTable, { minWidth: tableWidth }]}>
              <View style={s.sheetRowHead}>
                {fields.map((field, idx) => (
                  <Text
                    key={field.key}
                    numberOfLines={1}
                    style={[s.sheetHeadCell, { width: idx === 0 ? firstColumnWidth : columnWidth }]}
                  >
                    {field.label || field.key}
                  </Text>
                ))}
                {canEdit && <Text style={[s.sheetHeadCell, s.sheetActionHead]}>Action</Text>}
              </View>

              {filtered.map((item, idx) => (
                <View key={item.id || idx} style={[s.sheetRow, idx % 2 === 1 && s.sheetRowAlt]}>
                  {fields.map((field, colIdx) => (
                    <Text
                      key={field.key}
                      numberOfLines={2}
                      style={[
                        s.sheetCell,
                        field.bold && s.sheetCellBold,
                        { width: colIdx === 0 ? firstColumnWidth : columnWidth },
                      ]}
                    >
                      {cellText(item[field.key])}
                    </Text>
                  ))}
                  {canEdit && (
                    <View style={s.sheetActionCell}>
                      {item.source === "Derived" ? (
                        <Text style={{ color: TEXT_SUB, fontSize: 10, fontWeight: "700", textAlign: "center" }}>Configure first</Text>
                      ) : (
                        <Pressable onPress={() => startEdit(type, item)} style={s.editBtn}>
                          <Text style={s.editBtnTxt}>Edit</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const IntegrationSettings = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View>
          <Text style={s.pageH}>Integrations & API Keys</Text>
          <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 4 }}>Update Brevo, Paystack, Flutterwave and required platform API settings.</Text>
        </View>
        <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
      </View>

      <View style={{ gap: 14 }}>
        {(integrations.length ? integrations : []).map((group) => (
          <View key={group.provider} style={s.integrationCard}>
            <View style={{ marginBottom: 12 }}>
              <Text style={s.integrationTitle}>{group.label}</Text>
              <Text style={s.integrationSub}>{group.description}</Text>
            </View>

            {group.settings.map((setting) => {
              const draftKey = `${group.provider}.${setting.key}`;
              const value = integrationDrafts[draftKey] ?? "";
              const saving = integrationSaving === draftKey;
              return (
                <View key={setting.key} style={s.integrationRow}>
                  <View style={{ flex: 1.15, minWidth: 170 }}>
                    <Text style={s.integrationLabel}>{setting.label}</Text>
                    <Text style={s.integrationMeta}>
                      {setting.hasValue ? `Saved from ${setting.source} ${setting.maskedValue ? `(${setting.maskedValue})` : ""}` : "Missing"}
                    </Text>
                  </View>
                  <TextInput
                    value={value}
                    onChangeText={(text) => updateIntegrationDraft(group.provider, setting.key, text)}
                    placeholder={setting.placeholder || "Paste value"}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!!setting.secret}
                    style={s.integrationInput}
                  />
                  <Pressable
                    onPress={() => saveIntegrationSetting(group.provider, setting.key)}
                    disabled={saving}
                    style={[s.integrationSave, saving && { opacity: 0.65 }]}
                  >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.integrationSaveText}>Save</Text>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        {!integrations.length && (
          <View style={s.panel}>
            <Text style={{ color: TEXT_SUB, fontSize: 13 }}>No integration settings loaded yet. Tap Refresh or check the backend connection.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const Sidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sLogo}>
        <View style={s.logoBox}><Text style={{ color: WHITE, fontWeight: "900", fontSize: 16 }}>N</Text></View>
        <View>
          <Text style={{ color: WHITE, fontWeight: "900", fontSize: 14, letterSpacing: 1 }}>NEEDLY</Text>
          <Text style={{ color: "#6B7280", fontSize: 8.5, letterSpacing: 1.5 }}>SUPER ADMIN</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {NAV.map((item, i) => {
          if (item.section) return <Text key={i} style={s.navSec}>{item.section}</Text>;
          const active = activeTab === item.id;
          return (
            <Pressable key={item.id} onPress={() => setActiveTab(item.id)} style={[s.navItem, active && s.navActive]}>
              <Text style={{ fontSize: 13, marginRight: 8 }}>{item.icon}</Text>
              <Text style={[s.navLbl, active && s.navLblActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={s.sUser}>
        <View style={s.sAvatar}><Text style={{ color: WHITE, fontWeight: "800", fontSize: 12 }}>SA</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: WHITE, fontSize: 12, fontWeight: "700" }}>Super Admin</Text>
          <Text style={{ color: "#6B7280", fontSize: 10 }}>superadmin@needly.com</Text>
        </View>
        <Pressable onPress={onLogout}><Text style={{ color: "#6B7280", fontSize: 16 }}>⏻</Text></Pressable>
      </View>
    </View>
  );

  const TopBar = () => (
    <View style={s.topbar}>
      <Pressable style={{ marginRight: 12 }}><Text style={{ fontSize: 18, color: TEXT_MAIN }}>≡</Text></Pressable>
      <View style={s.searchBox}>
        <Text style={{ color: "#9CA3AF", marginRight: 8, fontSize: 14 }}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Search anything... (Orders, Customers, Vendors, Riders, Invoices...)" placeholderTextColor="#9CA3AF" value={query} onChangeText={setQuery} />
        <View style={{ backgroundColor: BORDER, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>⌘ K</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER, gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: realtimeStatus === "live" ? GREEN : realtimeStatus === "connecting" ? AMBER : RED }} />
          <Text style={{ fontSize: 11, fontWeight: "800", color: realtimeStatus === "live" ? GREEN : realtimeStatus === "connecting" ? AMBER : RED }}>
            {realtimeStatus === "live" ? "Live" : realtimeStatus === "connecting" ? "Connecting" : "Offline"}
          </Text>
          {lastRealtimeAt && <Text style={{ fontSize: 10, color: TEXT_SUB }}>{formatClock(lastRealtimeAt)}</Text>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER, gap: 4 }}>
          <Text style={{ fontSize: 11 }}>📍</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>Abeokuta</Text>
          <Text style={{ fontSize: 9, color: TEXT_SUB }}>▾</Text>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: WHITE, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: BORDER, position: "relative" }}>
          <Text style={{ fontSize: 15 }}>🔔</Text>
          <View style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: PURPLE, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: WHITE, fontSize: 8, fontWeight: "900" }}>{Math.min(notifications.length, 99)}</Text>
          </View>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: WHITE, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
          <Text style={{ fontSize: 14 }}>⛶</Text>
        </View>
        <Pressable onPress={onLogout} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: PURPLE, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: WHITE, fontWeight: "800", fontSize: 12 }}>SA</Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN }}>Super Admin</Text>
            <Text style={{ fontSize: 10, color: TEXT_SUB }}>Super Administrator</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );

  const renderContent = () => {
    if (activeTab === "adminOps") return <AdminScreen />;

    if (loading && activeTab === "overview") return <ActivityIndicator color={PURPLE} style={{ marginTop: 60 }} />;

    if (activeTab === "overview") return (
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16 }}>

        {/* Top 6 KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KpiCard icon="₦" bg="#F3E8FF" label="Total Revenue" value={fmt(revenue)} change="12.5%" up />
          <KpiCard icon="🛍️" bg="#E0F2FE" label="Total Orders" value={fmtN(totalOrders)} change="8.7%" up />
          <KpiCard icon="🛵" bg="#DCFCE7" label="Active Riders" value={fmtN(ridersOnline)} change="6.3%" up />
          <KpiCard icon="👥" bg="#EDE9FF" label="Total Customers" value={fmtN(totalCust)} change="11.2%" up />
          <KpiCard icon="🏪" bg="#FFEDD5" label="Total Vendors" value={fmtN(totalVend)} change="9.1%" up />
          <KpiCard icon="👛" bg="#FEE2E2" label="Pending Payouts" value={fmt(pendingPay)} change="-4.2%" up={false} />
        </View>

        {/* Second Row: Live Orders | Live Map | System Alerts */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          {/* Live Orders Panel */}
          <View style={[s.panel, { flex: 1.3 }]}>
            <PH title="Live Orders" onViewAll={() => setActiveTab("orders")} />
            {liveOrdersData.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No active live orders right now.</Text>}
            {liveOrdersData.map((o) => {
              const sc = statusBadge[o.status] || { color: TEXT_SUB, bg: BORDER };
              return (
                <View key={o.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{o.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: TEXT_MAIN }}>{o.id}</Text>
                    <Text style={{ fontSize: 10, color: TEXT_SUB }}>{o.type}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: TEXT_MAIN, flex: 1 }}>{o.name}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_SUB, width: 55 }}>{o.time}</Text>
                  <Badge label={o.status} color={sc.color} bg={sc.bg} />
                  <Text style={{ fontSize: 9.5, color: TEXT_SUB, marginLeft: 8, width: 100, textAlign: "right" }}>{o.rider}</Text>
                </View>
              );
            })}
          </View>

          {/* Live Map & Rider Tracking Panel */}
          <View style={[s.panel, { flex: 1.5 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={s.panelTitle}>Live Map & Rider Tracking</Text>
              <Text style={{ color: PURPLE, fontSize: 12, fontWeight: "600" }}>View full map</Text>
            </View>
            <LiveMapGraphic orders={liveOrdersRaw} riders={riders} vendors={vendors} />
          </View>

          {/* System Alerts Panel */}
          <View style={[s.panel, { flex: 1.1 }]}>
            <PH title="System Alerts" onViewAll={() => {}} />
            {pendingApprovals.filter((item) => Number(String(item.val).replace(/[^\d]/g, "")) > 0).slice(0, 4).map((item) => (
              <AlertRow key={item.label} icon="⚠️" title={item.label} desc={`${item.val} requires attention`} time="Live" color={item.color} />
            ))}
            {pendingApprovals.every((item) => Number(String(item.val).replace(/[^\d]/g, "")) === 0) && (
              <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No active system alerts.</Text>
            )}
          </View>
        </View>

        {/* Third Row: Revenue Overview | Orders Overview | Top Categories | Rider Status */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          {/* Revenue Overview Chart */}
          <View style={[s.panel, { flex: 1.3 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={s.panelTitle}>Revenue Overview</Text>
              <View style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>This Month ▾</Text>
              </View>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: TEXT_MAIN }}>{fmt(revenue)}</Text>
            <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "700", marginBottom: 10 }}>Live gross revenue from orders</Text>
            <RevenueChart width={280} height={110} />
          </View>

          {/* Orders Overview Donut */}
          <View style={[s.panel, { flex: 1.1 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={s.panelTitle}>Orders Overview</Text>
              <View style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>This Month ▾</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <DonutChart segments={orderSegments} centerNumber={fmtN(totalOrderHistory)} centerLabel="Total Orders" size={105} />
              <View style={{ gap: 6, flex: 1 }}>
                {orderSegments.map((d) => (
                  <View key={d.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                      <Text style={{ fontSize: 11, color: TEXT_SUB }}>{d.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>{d.n} ({d.pct}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Top Performing Categories */}
          <View style={[s.panel, { flex: 1.2 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={s.panelTitle}>Top Performing Categories</Text>
              <View style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>This Month ▾</Text>
              </View>
            </View>
            {topCategories.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No vendor category data yet.</Text>}
            {topCategories.map((c) => (
              <View key={c.name} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: c.bg, justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                  <Text style={{ fontSize: 12 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "700", color: TEXT_MAIN }}>{c.name}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_SUB }}>{c.orders}</Text>
                </View>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: TEXT_MAIN }}>{c.amount}</Text>
              </View>
            ))}
            <Pressable style={{ marginTop: 8 }}><Text style={{ color: PURPLE, fontSize: 11, fontWeight: "700" }}>View all categories →</Text></Pressable>
          </View>

          {/* Rider Status Donut */}
          <View style={[s.panel, { flex: 1 }]}>
            <PH title="Rider Status" onViewAll={() => {}} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <DonutChart segments={riderSegments} centerNumber={fmtN(totalRiders)} centerLabel="Total Riders" size={95} />
              <View style={{ gap: 5, flex: 1 }}>
                {riderSegments.map((r) => (
                  <View key={r.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: r.color }} />
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>{r.label}</Text>
                    </View>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: TEXT_MAIN }}>{r.n} ({r.pct}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Fourth Row: Recent Transactions | Pending Approvals | Platform Activity | Quick Actions */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          {/* Recent Transactions Table */}
          <View style={[s.panel, { flex: 1.5 }]}>
            <PH title="Recent Transactions" onViewAll={() => setActiveTab("transactions")} />
            {recentTx.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No payout or refund transactions yet.</Text>}
            {recentTx.map((tx) => {
              const badgeCfg = { Success: { color: GREEN, bg: GREEN_BG }, Processing: { color: AMBER, bg: AMBER_BG }, Refunded: { color: RED, bg: RED_BG } }[tx.status] || { color: TEXT_SUB, bg: BORDER };
              return (
                <View key={tx.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ fontSize: 11, color: PURPLE, fontWeight: "700", width: 85 }}>{tx.id}</Text>
                  <View style={{ flex: 1.2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>{tx.type}</Text>
                    <Text style={{ fontSize: 10, color: TEXT_SUB }}>{tx.name}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: TEXT_MAIN, width: 65, textAlign: "right" }}>{tx.amount}</Text>
                  <View style={{ width: 75, alignItems: "flex-end" }}>
                    <Badge label={tx.status} color={badgeCfg.color} bg={badgeCfg.bg} />
                  </View>
                  <Text style={{ fontSize: 10, color: TEXT_SUB, width: 55, textAlign: "right" }}>{tx.time}</Text>
                </View>
              );
            })}
          </View>

          {/* Pending Approvals */}
          <View style={[s.panel, { flex: 0.9 }]}>
            <PH title="Pending Approvals" onViewAll={() => {}} />
            {pendingApprovals.map((p) => (
              <View key={p.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MAIN }}>{p.label}</Text>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: p.color }}>{p.val}</Text>
              </View>
            ))}
          </View>

          {/* Platform Activity */}
          <View style={[s.panel, { flex: 1.1 }]}>
            <PH title="Platform Activity" onViewAll={() => {}} />
            {platformActivity.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No recent platform activity.</Text>}
            {platformActivity.map((a, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: PURPLE_SOFT, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 10 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>{a.title}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_SUB }}>{a.desc}</Text>
                </View>
                <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>{a.time}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions Panel */}
          <View style={[s.panel, { flex: 1, backgroundColor: PURPLE, borderRadius: 14 }]}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: WHITE, marginBottom: 14 }}>Quick Actions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {quickActions.map((qa) => (
                <Pressable key={qa.label} onPress={qa.action} style={{ width: "22%", alignItems: "center" }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ fontSize: 18 }}>{qa.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: WHITE, fontWeight: "700", textAlign: "center" }}>{qa.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    );

    if (activeTab === "orders") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>All Orders Ledger</Text>
          <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
        </View>
        <GenericList
          items={orders.map((o) => ({
            ...o,
            customerName: o.customer?.name || "Customer",
            vendorName: o.vendor?.name || "Vendor",
            riderName: o.rider?.user?.name || "Unassigned",
            totalFormatted: fmt(o.total),
            paymentStatus: o.payment?.status || "PENDING",
            paymentGateway: o.payment?.gateway || "-",
            riderPayoutFormatted: fmt(o.payment?.riderPayoutAmount || 0),
            companyDeliveryFeeFormatted: fmt(o.payment?.companyDeliveryFeeAmount || 0),
          }))}
          type="order"
          filterKey="id"
          fields={[
            { key: "id", bold: true },
            { key: "customerName", label: "Customer" },
            { key: "vendorName", label: "Vendor" },
            { key: "riderName", label: "Rider" },
            { key: "totalFormatted", label: "Total" },
            { key: "status", label: "Status" },
            { key: "paymentStatus", label: "Payment" },
            { key: "paymentGateway", label: "Gateway" },
            { key: "riderPayoutFormatted", label: "Rider Payout" },
            { key: "companyDeliveryFeeFormatted", label: "Company Delivery Fee" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "bookings") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>All Bookings</Text>
          <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
        </View>
        <GenericList
          items={bookings.map((b) => ({
            ...b,
            customerName: b.customer?.name || "Customer",
            serviceName: b.service?.name || b.providerName || "Service",
            totalFormatted: fmt(b.total),
          }))}
          type="booking"
          filterKey="providerName"
          fields={[
            { key: "providerName", bold: true },
            { key: "customerName", label: "Customer" },
            { key: "serviceName", label: "Service" },
            { key: "totalFormatted", label: "Total" },
            { key: "status", label: "Status" },
            { key: "address", label: "Address" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "riderFleet") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Rider Fleet</Text>
          <Pressable onPress={addRider} style={s.btn}><Text style={s.btnTxt}>+ Add Rider</Text></Pressable>
        </View>
        <GenericList
          items={riders.map((r) => ({
            ...r,
            name: r.user?.name || r.name || "Rider",
            email: r.user?.email || "—",
            phone: r.user?.phone || "—",
            onlineLabel: r.isOnline ? "Online" : "Offline",
            verifiedLabel: r.verified ? "Verified" : "Unverified",
          }))}
          type="rider"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "zone", label: "Zone" },
            { key: "phone", label: "Phone" },
            { key: "onlineLabel", label: "Availability" },
            { key: "verifiedLabel", label: "Verification" },
            { key: "rating", label: "Rating" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "agentOps") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={s.pageH}>Agent Hub Collectors</Text>
            <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 4 }}>Agents collect multi-vendor/open-market items and drop them at a hub for rider pickup.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={addAgent} style={s.btn}><Text style={s.btnTxt}>+ Add Agent</Text></Pressable>
            <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
          </View>
        </View>
        <GenericList
          items={agents.map((a) => ({
            ...a,
            name: a.user?.name || a.name || "Agent",
            email: a.user?.email || "—",
            phone: a.user?.phone || "—",
            hubName: a.hub?.name || "No hub",
            onlineLabel: a.isOnline ? "Online" : "Offline",
            verifiedLabel: a.verified ? "Verified" : "Unverified",
            ordersCount: a._count?.orders || 0,
          }))}
          type="agent"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "zone", label: "Zone" },
            { key: "hubName", label: "Hub" },
            { key: "phone", label: "Phone" },
            { key: "onlineLabel", label: "Availability" },
            { key: "verifiedLabel", label: "Verification" },
            { key: "ordersCount", label: "Collections" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "hubs") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={s.pageH}>Needly Pickup Hubs</Text>
            <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 4 }}>Riders pick hub-routed orders from these locations after an agent drops items there.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={addHub} style={s.btn}><Text style={s.btnTxt}>+ Add Hub</Text></Pressable>
            <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
          </View>
        </View>
        <GenericList
          items={hubs.map((h) => ({
            ...h,
            activeLabel: h.active ? "Active" : "Inactive",
            agentsCount: h._count?.agents || 0,
            ordersCount: h._count?.orders || 0,
          }))}
          type="hub"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "area", label: "Area" },
            { key: "address", label: "Address" },
            { key: "agentsCount", label: "Agents" },
            { key: "ordersCount", label: "Orders" },
            { key: "activeLabel", label: "Status" },
          ]}
        />
      </ScrollView>
    );

    // Realtime Operations Command Center (liveOps, riderOps, dispatch)
    if (activeTab === "liveOps" || activeTab === "riderOps" || activeTab === "dispatch") {
      const activeOpsList = liveOrdersData;

      return (
        <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
                <Text style={{ fontSize: 11, fontWeight: "800", color: GREEN, letterSpacing: 1.2 }}>REAL-TIME OPERATIONS COMMAND CENTER</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: "900", color: TEXT_MAIN, marginTop: 2 }}>Live Operations & Dispatch Radar</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={reload} style={{ backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>🔄 Refresh Feed</Text>
              </Pressable>
              <Pressable onPress={() => alert(`Auto-Dispatch Engine is watching ${activeOpsList.length} active order(s).`)} style={{ backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: WHITE }}>⚡ Smart Auto-Dispatch</Text>
              </Pressable>
            </View>
          </View>

          {/* Live Top Metrics */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            <View style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: PURPLE_SOFT, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>📡</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "700" }}>Active Live Orders</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: TEXT_MAIN }}>{fmtN(activeOrdersCount)}</Text>
              </View>
            </View>
            <View style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: GREEN_BG, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>🛵</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "700" }}>On-Duty Riders</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: TEXT_MAIN }}>{fmtN(ridersOnline)} <Text style={{ fontSize: 11, color: GREEN, fontWeight: "600" }}>({fmtN(ridersAvailable)} Available)</Text></Text>
              </View>
            </View>
            <View style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: BLUE_BG, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>⏱️</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "700" }}>Avg Delivery Time</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: TEXT_MAIN }}>{liveBookingsRaw.length ? `${fmtN(liveBookingsRaw.length)} bookings` : "Live"}</Text>
              </View>
            </View>
            <View style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: RED_BG, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>🚨</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "700" }}>Pending Dispatch</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: RED }}>{fmtN(liveOps?.unassignedOrdersCount)} Orders</Text>
              </View>
            </View>
          </View>

          {/* Live Map Radar */}
          <View style={[s.panel, { marginBottom: 20 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: TEXT_MAIN }}>Live GPS Radar & Dispatch Map (Abeokuta Territory)</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Badge label={`${fmtN(ridersOnline)} Riders Active`} color={GREEN} bg={GREEN_BG} />
                <Badge label={`${fmtN(activeOpsList.length)} Delivery Routes`} color={PURPLE} bg={PURPLE_SOFT} />
              </View>
            </View>
            <LiveMapGraphic orders={activeOpsList.map((op) => liveOrdersRaw.find((order) => (order.orderNumber || order.reference || order.id) === op.id)).filter(Boolean)} riders={riders} vendors={vendors} height={360} />
          </View>

          {/* Live Stream Table */}
          <View style={s.panel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: TEXT_MAIN }}>Realtime Operations Stream ({activeOpsList.length})</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["All Live", "Searching Rider", "In Transit", "Preparing", "Confirmed"].map((f, i) => (
                  <View key={f} style={{ backgroundColor: i === 0 ? PURPLE : BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: i === 0 ? PURPLE : BORDER }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: i === 0 ? WHITE : TEXT_SUB }}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {activeOpsList.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No active operations to show.</Text>}
            {activeOpsList.map((op) => {
              const sc = {
                "In Transit": { color: PURPLE, bg: PURPLE_SOFT },
                "Rider Assigned": { color: BLUE, bg: BLUE_BG },
                "Searching Rider": { color: RED, bg: RED_BG },
                "In Progress": { color: AMBER, bg: AMBER_BG },
                "Confirmed": { color: GREEN, bg: GREEN_BG },
              }[op.status] || { color: TEXT_SUB, bg: BORDER };

              return (
                <View key={op.id} style={{ backgroundColor: WHITE, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 20 }}>{op.icon}</Text>
                      <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: "900", color: TEXT_MAIN }}>{op.id}</Text>
                          <Badge label={op.category} color={TEXT_MAIN} bg={BG} />
                          <Badge label={op.status} color={sc.color} bg={sc.bg} />
                        </View>
                        <Text style={{ fontSize: 11, color: TEXT_SUB, marginTop: 2 }}>Order placed {op.elapsed} • Target ETA: {op.eta}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: TEXT_MAIN }}>{fmt(op.total)}</Text>
                  </View>

                  <View style={{ height: 6, backgroundColor: BG, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                    <View style={{ width: `${op.progress * 100}%`, height: "100%", backgroundColor: sc.color }} />
                  </View>

                  <View style={{ flexDirection: "row", gap: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_SUB }}>CUSTOMER</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN, marginTop: 2 }}>{op.customer}</Text>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>{op.phone}</Text>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB, marginTop: 2 }}>📍 {op.address}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_SUB }}>MERCHANT STORE</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN, marginTop: 2 }}>{op.store}</Text>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>Area: {op.area}</Text>
                      <Text style={{ fontSize: 10.5, color: PURPLE, fontWeight: "700", marginTop: 2 }}>📦 {op.items}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_SUB }}>ASSIGNED RIDER</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN, marginTop: 2 }}>{op.rider}</Text>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>Vehicle: {op.vehicle}</Text>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB, marginTop: 2 }}>📞 {op.riderPhone}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                    <Pressable onPress={() => alert(`Calling customer ${op.customer}...`)} style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>📞 Call Customer</Text>
                    </Pressable>
                    <Pressable onPress={() => alert(`Calling store ${op.store}...`)} style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>🏪 Call Merchant</Text>
                    </Pressable>
                    <Pressable onPress={() => alert(`Tracking ${op.id} live...`)} style={{ backgroundColor: BLUE_BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: BLUE }}>📍 Track Live</Text>
                    </Pressable>
                    <Pressable onPress={() => alert(`Reassigning rider for ${op.id}...`)} style={{ backgroundColor: PURPLE_SOFT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: PURPLE }}>⚡ Reassign Rider</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    if (activeTab === "customers") {
      const sortBy = contactSortBy;
      const setSortBy = setContactSortBy;

      const tierConfig = {
        Platinum: { color: "#7C3AED", bg: "#EDE9FE", icon: "💎" },
        Gold:     { color: "#B45309", bg: "#FEF3C7", icon: "🥇" },
        Silver:   { color: "#6B7280", bg: "#F3F4F6", icon: "🥈" },
        Bronze:   { color: "#92400E", bg: "#FEF9EE", icon: "🥉" },
      };

      const statusBadge = (u) => {
        if (u.isSuspended || u.status === "SUSPENDED") return <Badge label="Suspended" color={RED}   bg={RED_BG} />;
        if (u.approved === false || u.status === "PENDING") return <Badge label="Pending"   color={AMBER} bg={AMBER_BG} />;
        return <Badge label="Active" color={GREEN} bg={GREEN_BG} />;
      };

      const q = query.trim().toLowerCase();
      const filtered = (customers || [])
        .filter((c) =>
          !q ||
          (c.name  || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
        )
        .slice()
        .sort((a, b) => {
          if (sortBy === "totalSpent")   return (b.totalSpent   || 0) - (a.totalSpent   || 0);
          if (sortBy === "ordersCount")  return (b.ordersCount  || 0) - (a.ordersCount  || 0);
          if (sortBy === "churnRisk")    return (b.churnRisk    ? 1 : 0) - (a.churnRisk ? 1 : 0);
          if (sortBy === "loyaltyTier") {
            const rank = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
            return (rank[b.loyaltyTier] || 0) - (rank[a.loyaltyTier] || 0);
          }
          return 0;
        });

      const fmtTime = (d) => {
        if (!d) return "—";
        const diff = Math.floor((Date.now() - new Date(d)) / 1000);
        if (diff < 60)   return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        const days = Math.floor(diff / 86400);
        if (days < 30)   return `${days}d ago`;
        return new Date(d).toLocaleDateString();
      };

      const totalRevenue   = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
      const topSpenders    = customers.filter(c => c.isTopSpender).length;
      const churnCount     = customers.filter(c => c.churnRisk).length;
      const platinumCount  = customers.filter(c => c.loyaltyTier === "Platinum").length;

      // Top-3 leaderboard
      const leaderboard = [...customers]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 3);

      const GOLD_COLORS   = ["#FFD700", "#C0C0C0", "#CD7F32"];
      const MEDALS        = ["🥇", "🥈", "🥉"];

      return (
        <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
                <Text style={{ fontSize: 10, fontWeight: "800", color: GREEN, letterSpacing: 1 }}>LIVE · REALTIME</Text>
              </View>
              <Text style={s.pageH}>Customer Activity & Reward Intelligence</Text>
              <Text style={{ fontSize: 11, color: TEXT_SUB, marginTop: 2 }}>
                {filtered.length} of {customers.length} customers
                {lastRefreshed ? `  ·  Updated ${fmtTime(lastRefreshed)}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => fetchContacts()}
              disabled={contactsLoading}
              style={{ backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {contactsLoading ? <ActivityIndicator size="small" color={PURPLE} /> : <Text style={{ fontSize: 12 }}>🔄</Text>}
              <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>Refresh</Text>
            </Pressable>
          </View>

          {/* ── Error Banner ── */}
          {contactsError && (
            <View style={{ backgroundColor: RED_BG, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: RED + "44" }}>
              <Text style={{ color: RED, fontSize: 12, fontWeight: "700" }}>⚠️ {contactsError}</Text>
            </View>
          )}

          {/* ── KPI Stats Row ── */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Customers",  value: customers.length,       icon: "👥", bg: PURPLE_SOFT, color: PURPLE },
              { label: "Total Revenue",    value: fmt(totalRevenue),      icon: "💰", bg: GREEN_BG,   color: GREEN },
              { label: "Top Spenders",     value: topSpenders,            icon: "⭐", bg: "#FEF3C7",  color: "#B45309" },
              { label: "Platinum Members", value: platinumCount,          icon: "💎", bg: "#EDE9FE",  color: "#7C3AED" },
              { label: "Churn Risk",       value: churnCount,             icon: "⚠️", bg: RED_BG,     color: RED },
            ].map(stat => (
              <View key={stat.label} style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: stat.bg, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 16 }}>{stat.icon}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: stat.color }}>{stat.value}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Top Spenders Leaderboard ── */}
          <View style={[s.panel, { marginBottom: 16, background: "linear-gradient(135deg, #6F45E9 0%, #7C3AED 100%)" }]}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: TEXT_MAIN, marginBottom: 12 }}>🏆 Top Spenders Leaderboard</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {leaderboard.map((c, i) => {
                const tc = tierConfig[c.loyaltyTier] || tierConfig.Bronze;
                return (
                  <View key={c.id} style={{ flex: 1, backgroundColor: BG, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: GOLD_COLORS[i] + "66", alignItems: "center" }}>
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>{MEDALS[i]}</Text>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.bg, justifyContent: "center", alignItems: "center", marginBottom: 6, borderWidth: 2, borderColor: GOLD_COLORS[i] }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: tc.color }}>{(c.name || "?").slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN, textAlign: "center" }}>{c.name}</Text>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: tc.color, marginTop: 4 }}>{fmt(c.totalSpent || 0)}</Text>
                    <Text style={{ fontSize: 10, color: TEXT_SUB }}>{c.ordersCount || 0} orders</Text>
                    <View style={{ marginTop: 6, backgroundColor: tc.bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: tc.color }}>{tc.icon} {c.loyaltyTier}</Text>
                    </View>
                    {c.churnRisk && <Badge label="⚠️ Churn Risk" color={RED} bg={RED_BG} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Customer Activity Table ── */}
          <View style={s.panel}>

            {/* Controls row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={s.panelTitle}>All Customers ({filtered.length})</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {/* Sort pills */}
                <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "700" }}>SORT:</Text>
                {[
                  { key: "totalSpent",  label: "💰 Spend" },
                  { key: "ordersCount", label: "📦 Orders" },
                  { key: "loyaltyTier", label: "💎 Tier" },
                  { key: "churnRisk",   label: "⚠️ Churn" },
                ].map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setSortBy(opt.key)}
                    style={{
                      backgroundColor: sortBy === opt.key ? PURPLE : BG,
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: sortBy === opt.key ? PURPLE : BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: sortBy === opt.key ? WHITE : TEXT_SUB }}>{opt.label}</Text>
                  </Pressable>
                ))}
                {/* Search */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BORDER }}>
                  <Text style={{ fontSize: 11 }}>🔍</Text>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search…"
                    placeholderTextColor="#9CA3AF"
                    style={{ fontSize: 12, color: TEXT_MAIN, minWidth: 120, outlineStyle: "none" }}
                  />
                </View>
              </View>
            </View>

            {/* Loading / empty */}
            {contactsLoading && customers.length === 0 && (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator color={PURPLE} />
                <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 8 }}>Loading customers…</Text>
              </View>
            )}
            {!contactsLoading && filtered.length === 0 && (
              <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 16 }}>No customers found.</Text>
            )}

            {/* Rows */}
            {filtered.map((c, idx) => {
              const tc = tierConfig[c.loyaltyTier] || tierConfig.Bronze;
              const isFlagged = !!flagged[c.id];
              return (
                <View
                  key={c.id || idx}
                  style={{
                    borderRadius: 10,
                    marginBottom: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: isFlagged ? "#10B98155" : c.churnRisk ? RED + "44" : BORDER,
                    backgroundColor: isFlagged ? "#D1FAE555" : c.churnRisk ? RED_BG + "33" : WHITE,
                  }}
                >
                  {/* Top row: avatar, name, badges, spend */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    {/* Avatar */}
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.bg, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: tc.color + "55", marginRight: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: tc.color }}>{(c.name || "?").slice(0, 2).toUpperCase()}</Text>
                    </View>

                    {/* Name + contact */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: TEXT_MAIN }}>{c.name || "—"}</Text>
                        {/* Tier badge */}
                        <View style={{ backgroundColor: tc.bg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: tc.color }}>{tc.icon} {c.loyaltyTier}</Text>
                        </View>
                        {c.isTopSpender && <View style={{ backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ fontSize: 9, fontWeight: "800", color: "#B45309" }}>⭐ Top Spender</Text></View>}
                        {c.churnRisk    && <View style={{ backgroundColor: RED_BG,    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ fontSize: 9, fontWeight: "800", color: RED        }}>⚠️ Churn Risk</Text></View>}
                        {isFlagged      && <View style={{ backgroundColor: GREEN_BG,  borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ fontSize: 9, fontWeight: "800", color: GREEN      }}>🎁 Flagged for Reward</Text></View>}
                      </View>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>{c.email || "—"}  ·  {c.phone || "—"}</Text>
                    </View>

                    {/* Total spend (big) */}
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 15, fontWeight: "900", color: TEXT_MAIN }}>{fmt(c.totalSpent || 0)}</Text>
                      <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>lifetime spend</Text>
                    </View>
                  </View>

                  {/* Activity metric chips */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {[
                      { label: "Orders",      value: c.ordersCount  || 0, icon: "📦" },
                      { label: "Avg Order",   value: fmt(c.avgOrderValue || 0), icon: "📊" },
                      { label: "Bookings",    value: c.bookingsCount || 0, icon: "📅" },
                      { label: "Reviews",     value: c.reviewsCount  || 0, icon: "⭐" },
                      { label: "Last Order",  value: fmtTime(c.lastOrderAt),  icon: "🕐" },
                      { label: "Member Since",value: new Date(c.createdAt).toLocaleDateString(), icon: "📆" },
                    ].map(chip => (
                      <View key={chip.label} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: BG, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: BORDER }}>
                        <Text style={{ fontSize: 10 }}>{chip.icon}</Text>
                        <Text style={{ fontSize: 9.5, color: TEXT_SUB, fontWeight: "600" }}>{chip.label}:</Text>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_MAIN }}>{chip.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action row */}
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                    {statusBadge(c)}
                    <Pressable onPress={() => openContactAudit(c)} style={{ backgroundColor: BLUE_BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: BLUE }}>Audit & Reconciliation 📊</Text>
                    </Pressable>
                    <Pressable onPress={() => startEdit("user", c)} style={{ backgroundColor: PURPLE_SOFT, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: PURPLE }}>Edit ✏️</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setFlagged(f => ({ ...f, [c.id]: !f[c.id] }))}
                      style={{ backgroundColor: isFlagged ? GREEN_BG : BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: isFlagged ? GREEN : BORDER }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: isFlagged ? GREEN : TEXT_SUB }}>
                        {isFlagged ? "✓ Reward Flagged" : "🎁 Flag for Reward"}
                      </Text>
                    </Pressable>
                    {!c.isSuspended && (
                      <Pressable
                        onPress={async () => { try { await AuthAPI.suspendUser(c.id); fetchContacts(true); } catch (e) { alert("Suspend failed: " + e.message); } }}
                        style={{ backgroundColor: RED_BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: RED }}>Suspend</Text>
                      </Pressable>
                    )}
                    {(c.isSuspended || c.approved === false) && (
                      <Pressable
                        onPress={async () => { try { await AuthAPI.approveUser(c.id); fetchContacts(true); } catch (e) { alert("Approve failed: " + e.message); } }}
                        style={{ backgroundColor: GREEN_BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: GREEN }}>Approve ✓</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Auto-refresh indicator */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
              <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>Auto-refreshing every 30 seconds</Text>
              {lastRefreshed && <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>· Last: {lastRefreshed.toLocaleTimeString()}</Text>}
            </View>
          </View>
        </ScrollView>
      );
    }


    if (activeTab === "products") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>All Products</Text>
          <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
        </View>
        <GenericList
          items={products.map((p) => ({
            ...p,
            vendorName: p.vendor?.name || "Vendor",
            category: p.vendor?.category || p.subcategory || "Marketplace",
            priceFormatted: fmt(p.price),
            availableLabel: p.isAvailable ? "Available" : "Hidden",
          }))}
          type="product"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "vendorName", label: "Vendor" },
            { key: "category", label: "Category" },
            { key: "priceFormatted", label: "Price" },
            { key: "stock", label: "Stock" },
            { key: "availableLabel", label: "Status" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "services") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>All Services</Text>
          <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
        </View>
        <GenericList
          items={services.map((svc) => ({
            ...svc,
            priceFormatted: fmt(svc.price),
            bookingsCount: svc._count?.bookings || 0,
            availableLabel: svc.isAvailable ? "Available" : "Hidden",
          }))}
          type="service"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "category", label: "Category" },
            { key: "priceFormatted", label: "Price" },
            { key: "bookingsCount", label: "Bookings" },
            { key: "availableLabel", label: "Status" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "categories") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={s.pageH}>Marketplace Management</Text>
            <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 4 }}>Divisions, categories, subcategories, homepage visibility and ordering come from the database.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={addMarketplaceDivision} style={s.btn}><Text style={s.btnTxt}>+ Add Division</Text></Pressable>
            <Pressable onPress={addCategory} style={s.btn}><Text style={s.btnTxt}>+ Add Category</Text></Pressable>
            <Pressable onPress={reload} style={s.btnGhost}><Text style={s.btnGhostTxt}>Refresh</Text></Pressable>
          </View>
        </View>
        <GenericList
          items={categories}
          type="category"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "type", label: "Type" },
            { key: "slug", label: "Slug" },
            { key: "key", label: "Key" },
            { key: "parentId", label: "Parent" },
            { key: "divisionId", label: "Division" },
            { key: "flow", label: "Flow" },
            { key: "position", label: "Position" },
            { key: "isFeatured", label: "Featured" },
            { key: "showOnHomepage", label: "Homepage" },
            { key: "active", label: "Active" },
            { key: "location", label: "Location" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "providers") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Providers & Managers</Text>
        <GenericList
          items={adminUsers.filter((user) => user.role === "MANAGER")}
          type="user"
          filterKey="name"
          fields={[
            { key: "name", bold: true },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "role", label: "Role" },
          ]}
        />
      </ScrollView>
    );

    if (activeTab === "vendors") {
      const tierCfg = {
        Star:     { color: "#B45309", bg: "#FEF3C7", icon: "⭐" },
        Active:   { color: GREEN,    bg: GREEN_BG,   icon: "✅" },
        Low:      { color: AMBER,    bg: AMBER_BG,   icon: "⚠️" },
        Inactive: { color: RED,      bg: RED_BG,     icon: "🔴" },
      };
      const catColors = {
        Restaurant:     { color: "#DC2626", bg: "#FEE2E2" },
        Supermarket:    { color: "#059669", bg: "#D1FAE5" },
        "Local Market": { color: "#D97706", bg: "#FEF3C7" },
        Pharmacy:       { color: "#7C3AED", bg: "#EDE9FE" },
        Grills:         { color: "#C2410C", bg: "#FFEDD5" },
      };

      const q = query.trim().toLowerCase();
      const filtered = (vendors || [])
        .filter(v =>
          !q ||
          (v.name     || "").toLowerCase().includes(q) ||
          (v.area     || "").toLowerCase().includes(q) ||
          (v.category || "").toLowerCase().includes(q) ||
          (v.contactName || "").toLowerCase().includes(q)
        )
        .slice()
        .sort((a, b) => {
          if (vendorSortBy === "totalRevenue") return (b.totalRevenue || 0) - (a.totalRevenue || 0);
          if (vendorSortBy === "ordersCount")  return (b.ordersCount  || 0) - (a.ordersCount  || 0);
          if (vendorSortBy === "rating")       return (b.rating       || 0) - (a.rating       || 0);
          if (vendorSortBy === "name")         return (a.name || "").localeCompare(b.name || "");
          return 0;
        });

      const fmtTime = (d) => {
        if (!d) return "Never";
        const diff = Math.floor((Date.now() - new Date(d)) / 1000);
        if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
        const days = Math.floor(diff / 86400);
        if (days === 0)   return "Today";
        if (days === 1)   return "Yesterday";
        if (days < 30)    return `${days}d ago`;
        return new Date(d).toLocaleDateString();
      };

      const totalRev      = vendors.reduce((s, v) => s + (v.totalRevenue || 0), 0);
      const openCount     = vendors.filter(v => v.isOpen).length;
      const verifiedCount = vendors.filter(v => v.verified).length;
      const starCount     = vendors.filter(v => v.performanceTier === "Star").length;

      const topVendors = [...vendors]
        .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        .slice(0, 3);

      return (
        <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
                <Text style={{ fontSize: 10, fontWeight: "800", color: GREEN, letterSpacing: 1 }}>LIVE · REALTIME</Text>
              </View>
              <Text style={s.pageH}>Vendor & Store Management</Text>
              <Text style={{ fontSize: 11, color: TEXT_SUB, marginTop: 2 }}>
                {filtered.length} of {vendors.length} stores
              </Text>
            </View>
            <Pressable
              onPress={() => reload()}
              style={{ backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={{ fontSize: 12 }}>🔄</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>Refresh</Text>
            </Pressable>
          </View>

          {/* ── KPI Row ── */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Stores",    value: vendors.length,  icon: "🏪", bg: PURPLE_SOFT, color: PURPLE },
              { label: "Total Revenue",   value: fmt(totalRev),   icon: "💰", bg: GREEN_BG,   color: GREEN },
              { label: "Open Now",        value: openCount,       icon: "🟢", bg: GREEN_BG,   color: GREEN },
              { label: "Verified Stores", value: verifiedCount,   icon: "✅", bg: "#EDE9FE",  color: "#7C3AED" },
              { label: "Star Performers", value: starCount,       icon: "⭐", bg: "#FEF3C7",  color: "#B45309" },
            ].map(stat => (
              <View key={stat.label} style={[s.panel, { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: stat.bg, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 16 }}>{stat.icon}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: stat.color }}>{stat.value}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "600" }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Top Vendors Leaderboard ── */}
          <View style={[s.panel, { marginBottom: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: TEXT_MAIN, marginBottom: 12 }}>🏆 Top Performing Stores</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {topVendors.map((v, i) => {
                const tc = tierCfg[v.performanceTier] || tierCfg.Inactive;
                const MEDALS = ["🥇", "🥈", "🥉"];
                const BORDERS = ["#FFD700", "#C0C0C0", "#CD7F32"];
                return (
                  <View key={v.id} style={{ flex: 1, backgroundColor: BG, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: BORDERS[i] + "66", alignItems: "center" }}>
                    <Text style={{ fontSize: 22, marginBottom: 2 }}>{MEDALS[i]}</Text>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>{v.emoji || "🏪"}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN, textAlign: "center" }}>{v.name}</Text>
                    <Text style={{ fontSize: 10, color: TEXT_SUB }}>{v.category} · {v.area}</Text>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: GREEN, marginTop: 6 }}>{fmt(v.totalRevenue || 0)}</Text>
                    <Text style={{ fontSize: 10, color: TEXT_SUB }}>{v.ordersCount || 0} orders · ⭐{v.rating}</Text>
                    <View style={{ marginTop: 6, backgroundColor: tc.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: tc.color }}>{tc.icon} {v.performanceTier}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Vendor List ── */}
          <View style={s.panel}>
            {/* Controls */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={s.panelTitle}>All Stores ({filtered.length})</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: TEXT_SUB, fontWeight: "700" }}>SORT:</Text>
                {[
                  { key: "totalRevenue", label: "💰 Revenue" },
                  { key: "ordersCount",  label: "📦 Orders" },
                  { key: "rating",       label: "⭐ Rating" },
                  { key: "name",         label: "🔤 Name" },
                ].map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setVendorSortBy(opt.key)}
                    style={{
                      backgroundColor: vendorSortBy === opt.key ? PURPLE : BG,
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: vendorSortBy === opt.key ? PURPLE : BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: vendorSortBy === opt.key ? WHITE : TEXT_SUB }}>{opt.label}</Text>
                  </Pressable>
                ))}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BORDER }}>
                  <Text style={{ fontSize: 11 }}>🔍</Text>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search store, area…"
                    placeholderTextColor="#9CA3AF"
                    style={{ fontSize: 12, color: TEXT_MAIN, minWidth: 130, outlineStyle: "none" }}
                  />
                </View>
              </View>
            </View>

            {vendors.length === 0 && (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator color={PURPLE} />
                <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 8 }}>Loading stores…</Text>
              </View>
            )}
            {vendors.length > 0 && filtered.length === 0 && (
              <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 16 }}>No stores match your search.</Text>
            )}

            {/* Vendor cards */}
            {filtered.map((v, idx) => {
              const tc  = tierCfg[v.performanceTier] || tierCfg.Inactive;
              const cat = catColors[v.category] || { color: PURPLE, bg: PURPLE_SOFT };
              return (
                <View
                  key={v.id || idx}
                  style={{
                    borderRadius: 12, marginBottom: 10, padding: 14,
                    borderWidth: 1,
                    borderColor: v.isSuspended ? RED + "44" : BORDER,
                    backgroundColor: v.isSuspended ? RED_BG + "22" : WHITE,
                  }}
                >
                  {/* Top row */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    {/* Store emoji avatar */}
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cat.bg, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 22 }}>{v.emoji || "🏪"}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ fontSize: 14, fontWeight: "900", color: TEXT_MAIN }}>{v.name}</Text>
                        {/* Performance tier */}
                        <View style={{ backgroundColor: tc.bg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: tc.color }}>{tc.icon} {v.performanceTier}</Text>
                        </View>
                        {/* Category badge */}
                        <View style={{ backgroundColor: cat.bg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: cat.color }}>{v.category}</Text>
                        </View>
                        {/* Open/Closed */}
                        <View style={{ backgroundColor: v.isOpen ? GREEN_BG : RED_BG, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: v.isOpen ? GREEN : RED }}>{v.isOpen ? "🟢 Open" : "🔴 Closed"}</Text>
                        </View>
                        {/* Verified */}
                        {v.verified && (
                          <View style={{ backgroundColor: "#EDE9FE", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: "#7C3AED" }}>✅ Verified</Text>
                          </View>
                        )}
                        {v.isSuspended && (
                          <View style={{ backgroundColor: RED_BG, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: RED }}>🚫 Suspended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 10.5, color: TEXT_SUB, marginTop: 2 }}>
                        📍 {v.area}{v.address ? ` · ${v.address}` : ""}  ·  ⏱ {v.eta}
                      </Text>
                      {v.contactName && (
                        <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>
                          👤 {v.contactName}  ·  📞 {v.contactPhone || "—"}
                        </Text>
                      )}
                    </View>

                    {/* Revenue + orders (right side) */}
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 16, fontWeight: "900", color: GREEN }}>{fmt(v.totalRevenue || 0)}</Text>
                      <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>total revenue</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN, marginTop: 2 }}>⭐ {v.rating}</Text>
                    </View>
                  </View>

                  {/* Activity chips */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {[
                      { label: "Orders",     value: v.ordersCount    || 0,                   icon: "📦" },
                      { label: "Avg Order",  value: fmt(v.avgOrderValue || 0),               icon: "📊" },
                      { label: "Products",   value: v.productsCount  || 0,                   icon: "🛒" },
                      { label: "Reviews",    value: v.reviewsCount   || 0,                   icon: "⭐" },
                      { label: "Last Order", value: fmtTime(v.lastOrderAt),                  icon: "🕐" },
                      { label: "Joined",     value: new Date(v.createdAt).toLocaleDateString(), icon: "📆" },
                    ].map(chip => (
                      <View key={chip.label} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: BG, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: BORDER }}>
                        <Text style={{ fontSize: 10 }}>{chip.icon}</Text>
                        <Text style={{ fontSize: 9.5, color: TEXT_SUB, fontWeight: "600" }}>{chip.label}:</Text>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_MAIN }}>{chip.value}</Text>
                      </View>
                    ))}
                    {/* Top products */}
                    {(v.topProducts || []).length > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PURPLE_SOFT, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: PURPLE + "33" }}>
                        <Text style={{ fontSize: 10 }}>🍽️</Text>
                        <Text style={{ fontSize: 9.5, color: PURPLE, fontWeight: "600" }}>Top:</Text>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: PURPLE }}>{v.topProducts.join(", ")}</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
                    <Pressable
                      onPress={() => startEdit("vendor", v)}
                      style={{ backgroundColor: PURPLE_SOFT, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: PURPLE }}>Edit ✏️</Text>
                    </Pressable>
                    {/* Verify toggle */}
                    <Pressable
                      onPress={async () => {
                        try {
                          await VendorAPI.verify(v.id, { verified: !v.verified });
                          reload();
                        } catch (e) { alert("Verify failed: " + e.message); }
                      }}
                      style={{ backgroundColor: v.verified ? GREEN_BG : "#EDE9FE", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: v.verified ? GREEN : "#7C3AED" }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: v.verified ? GREEN : "#7C3AED" }}>
                        {v.verified ? "✅ Verified" : "🔍 Verify"}
                      </Text>
                    </Pressable>
                    {/* Suspend/Approve via owner */}
                    {v.owner && !v.isSuspended && (
                      <Pressable
                        onPress={async () => {
                          try { await AuthAPI.suspendUser(v.owner.id); reload(); }
                          catch (e) { alert("Suspend failed: " + e.message); }
                        }}
                        style={{ backgroundColor: RED_BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: RED }}>Suspend 🚫</Text>
                      </Pressable>
                    )}
                    {v.owner && v.isSuspended && (
                      <Pressable
                        onPress={async () => {
                          try { await AuthAPI.approveUser(v.owner.id); reload(); }
                          catch (e) { alert("Approve failed: " + e.message); }
                        }}
                        style={{ backgroundColor: GREEN_BG, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: GREEN }}>Reinstate ✓</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    if (activeTab === "locations") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Locations & Delivery Zones</Text>
          <Pressable onPress={addZone} style={s.btn}><Text style={s.btnTxt}>+ Add Zone</Text></Pressable>
        </View>
        <GenericList items={locations} type="location" fields={[{ key: "name", bold: true }, { key: "type", label: "Type" }, { key: "deliveryFee", label: "Delivery Fee" }, { key: "maxDistance", label: "Radius" }, { key: "active", label: "Active" }]} />
      </ScrollView>
    );

    if (activeTab === "transactions" || activeTab === "invoices" || activeTab === "receipts") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Financial Transactions & Invoices Ledger</Text>
        <GenericList items={allFinancialTx} type="transaction" fields={[{ key: "id", bold: true }, { key: "type", label: "Type" }, { key: "name", label: "Party" }, { key: "amount", label: "Amount" }, { key: "gateway", label: "Gateway" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "payouts") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Vendor & Rider Payout Approval Center</Text>
          <Pressable onPress={approveAllPendingPayouts} style={s.btn}><Text style={s.btnTxt}>⚡ Batch Approve Payouts</Text></Pressable>
        </View>
        <GenericList
          items={payouts.map((p) => ({
            ...p,
            name: p.rider?.user?.name || "Rider",
            amountFormatted: fmt(p.amount),
            bank: [p.rider?.bankName, p.rider?.bankAccountNumber].filter(Boolean).join(" • ") || "No bank on file",
          }))}
          type="payout"
          fields={[{ key: "name", bold: true }, { key: "amountFormatted", label: "Payout Amount" }, { key: "bank", label: "Bank Account" }, { key: "status", label: "Status" }]}
        />
      </ScrollView>
    );

    if (activeTab === "refunds") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Customer Refund Requests</Text>
        <GenericList items={refunds.map((r) => ({ ...r, customer: r.customer?.name || r.customerId || "Customer", amountFormatted: fmt(r.amount) }))} type="refund" fields={[{ key: "customer", bold: true }, { key: "amountFormatted", label: "Refund Amount" }, { key: "reason", label: "Reason" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "commissions") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 6 }]}>Checkout Platform Fee</Text>
        <Text style={{ color: TEXT_SUB, fontSize: 12, marginBottom: 16 }}>
          The active GLOBAL fee is added to every future customer checkout. Product subtotal stays as the vendor amount.
        </Text>
        <GenericList items={commissions} type="commission" fields={[{ key: "targetName", bold: true }, { key: "targetType", label: "Target" }, { key: "ratePercent", label: "Platform Fee %" }, { key: "active", label: "Active" }]} />
      </ScrollView>
    );

    if (activeTab === "integrations") return <IntegrationSettings />;

    if (activeTab === "admins" || activeTab === "roles") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>{activeTab === "admins" ? "Admin Users" : "Roles & Permissions"}</Text>
          <Pressable onPress={activeTab === "admins" ? addAdmin : () => {
            const name = prompt("Role name:");
            if (!name) return;
            const description = prompt("Role description:", "Custom admin role");
            SuperAdminAPI.createRole({ name, description }).then(reload).catch((err) => alert("Create role failed: " + err.message));
          }} style={s.btn}><Text style={s.btnTxt}>{activeTab === "admins" ? "+ Add Admin" : "+ Create Role"}</Text></Pressable>
        </View>
        {activeTab === "admins" ? (
          <GenericList items={adminUsers} type="user" fields={[{ key: "name", bold: true }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "role", label: "Role" }, { key: "approved", label: "Approved" }]} />
        ) : (
          <GenericList items={roles} type="role" fields={[{ key: "name", bold: true }, { key: "description", label: "Permissions Summary" }, { key: "isSystem", label: "System" }]} />
        )}
      </ScrollView>
    );

    if (activeTab === "tickets") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Support Tickets</Text>
          <Pressable onPress={sendBroadcast} style={s.btn}><Text style={s.btnTxt}>+ Send Push Broadcast</Text></Pressable>
        </View>
        <GenericList items={tickets.map((t) => ({ ...t, customer: t.user?.name || t.userId || "User" }))} type="ticket" fields={[{ key: "subject", bold: true }, { key: "customer", label: "User" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "disputes") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Reviews & Disputes</Text>
        <GenericList items={disputes.map((d) => ({ ...d, vendorName: d.vendorName || d.vendor?.name || "Vendor", orderRef: d.orderId }))} type="dispute" fields={[{ key: "reason", bold: true }, { key: "vendorName", label: "Vendor" }, { key: "orderRef", label: "Order" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "notifications") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Notifications & Broadcasts</Text>
          <Pressable onPress={sendBroadcast} style={s.btn}><Text style={s.btnTxt}>+ Send Broadcast</Text></Pressable>
        </View>
        <GenericList items={notifications.map((n) => ({ ...n, recipient: n.user?.name || n.userId || "User", message: n.body || n.message }))} type="notification" fields={[{ key: "title", bold: true }, { key: "recipient", label: "Recipient" }, { key: "message", label: "Message" }, { key: "type", label: "Type" }, { key: "read", label: "Read" }]} />
      </ScrollView>
    );

    if (activeTab === "promotions") {
      const homepageAds = promotions
        .filter((promo) => promo.placement === "HOMEPAGE_CAROUSEL")
        .map((promo) => ({
          ...promo,
          displayOrder: promo.displayOrder ?? 0,
          title: promo.title || promo.bannerTitle,
        }));
      const couponPromos = promotions.filter((promo) => promo.placement !== "HOMEPAGE_CAROUSEL");
      return (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <Text style={s.pageH}>Homepage Carousel Ads</Text>
              <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 4 }}>Control customer homepage carousel adverts, images, destinations, order and active status.</Text>
            </View>
            <Pressable onPress={addHomepageBanner} style={s.btn}><Text style={s.btnTxt}>+ Add Ad Slide</Text></Pressable>
          </View>
          <GenericList
            items={homepageAds}
            type="promotion"
            filterKey="title"
            fields={[
              { key: "displayOrder", label: "Order" },
              { key: "bannerKicker", label: "Kicker", bold: true },
              { key: "bannerTitle", label: "Headline" },
              { key: "bannerCta", label: "CTA" },
              { key: "destinationCategory", label: "Destination" },
              { key: "location", label: "Location" },
              { key: "active", label: "Active" },
              { key: "bannerImageUrl", label: "Image URL" },
            ]}
          />
          <View style={{ marginTop: 16 }}>
            <GenericList
              items={couponPromos}
              type="promotion"
              filterKey="title"
              fields={[{ key: "code", bold: true }, { key: "title", label: "Coupon Title" }, { key: "discountValue", label: "Value" }, { key: "active", label: "Active" }]}
            />
          </View>
        </ScrollView>
      );
    }

    if (activeTab === "auditLogs") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Audit Logs</Text>
        <GenericList
          items={auditLogs.map((log) => ({
            ...log,
            actor: log.actorName || log.actorEmail || log.actorId,
            target: log.targetLabel || log.targetType,
            time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "—",
          }))}
          type="audit"
          fields={[{ key: "action", bold: true }, { key: "actor", label: "Actor" }, { key: "target", label: "Target" }, { key: "time", label: "Time" }]}
        />
      </ScrollView>
    );

    if (activeTab === "security") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Security & Risk Alerts</Text>
        <GenericList
          items={fraudAlerts}
          type="risk"
          fields={[{ key: "type", bold: true }, { key: "severity", label: "Severity" }, { key: "actor", label: "Actor" }, { key: "detail", label: "Detail" }]}
        />
      </ScrollView>
    );

    if (activeTab === "health") {
      const rows = healthData ? Object.entries(healthData)
        .filter(([key]) => !["lastCheckedAt"].includes(key))
        .map(([key, value]) => ({
          id: key,
          service: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
          status: value,
        })) : [];
      return (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={[s.pageH, { marginBottom: 16 }]}>System Health</Text>
          <GenericList items={rows} type="health" fields={[{ key: "service", bold: true }, { key: "status", label: "Status" }]} />
        </ScrollView>
      );
    }

    if (activeTab === "analytics" || activeTab === "reports") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>{activeTab === "analytics" ? "Analytics" : "Reports"}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <KpiCard icon="₦" bg="#F3E8FF" label="Gross Revenue" value={fmt(revenue)} change={stats?.comparisons?.thisMonthVsLastMonth || "0%"} up />
          <KpiCard icon="📦" bg="#E0F2FE" label="Orders" value={fmtN(totalOrderHistory)} change={stats?.comparisons?.thisWeekVsLastWeek || "0%"} up />
          <KpiCard icon="👥" bg="#EDE9FF" label="Customers" value={fmtN(totalCust)} change={stats?.comparisons?.todayVsYesterday || "0%"} up />
          <KpiCard icon="🏪" bg="#FFEDD5" label="Vendors" value={fmtN(totalVend)} change="live" up />
        </View>
        <View style={s.panel}>
          <PH title="Category Performance" />
          <GenericList items={topCategories} type="category" fields={[{ key: "name", bold: true }, { key: "orders", label: "Count" }, { key: "amount", label: "Revenue" }]} />
        </View>
      </ScrollView>
    );

    if (activeTab === "settings") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Settings</Text>
        <View style={s.panel}>
          <Text style={s.panelTitle}>Super Admin Controls</Text>
          <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 6, marginBottom: 14 }}>
            Manage operational settings from the dedicated menus. API keys live in Integrations, fees live in Platform Fee, and zones live in Locations.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Pressable onPress={() => setActiveTab("integrations")} style={s.btn}><Text style={s.btnTxt}>Integrations</Text></Pressable>
            <Pressable onPress={() => setActiveTab("commissions")} style={s.btn}><Text style={s.btnTxt}>Platform Fee</Text></Pressable>
            <Pressable onPress={() => setActiveTab("locations")} style={s.btn}><Text style={s.btnTxt}>Locations</Text></Pressable>
            <Pressable onPress={sendBroadcast} style={s.btn}><Text style={s.btnTxt}>Broadcast</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    );

    // Default System, Health, Analytics, Reports, Security & Settings View
    const tabObj = NAV.find((n) => n.id === activeTab) || { label: activeTab };
    return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>{tabObj.label || "System Administration"}</Text>
        <View style={s.panel}>
          <Text style={{ color: TEXT_SUB, fontSize: 13 }}>This menu is connected but has no records to display yet.</Text>
        </View>
      </ScrollView>
    );
  };

  const EditModal = () => (
    <Modal visible={!!editingItem} transparent animationType="fade">
      <View style={s.modalBg}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Edit {(editingItem?.type || "").toUpperCase()}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {(editFieldsMap[editingItem?.type] || []).map(([label, field, num]) => (
              <View key={field} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_SUB, marginBottom: 4 }}>{label}</Text>
                <TextInput
                  value={String(editForm[field] || "")}
                  onChangeText={(t) => setEditForm((d) => ({ ...d, [field]: num ? Number(t) : t }))}
                  keyboardType={num ? "numeric" : "default"}
                  placeholder={field === "image" || field === "bannerImage" || field === "bannerImageUrl" ? "Paste image URL" : ""}
                  style={s.minput}
                />
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable onPress={() => setEditingItem(null)} style={s.cancelBtn}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
            <Pressable onPress={saveEdit} style={s.saveBtn}><Text style={s.saveTxt}>Save Changes</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ContactAuditModal = () => {
    if (!activeContactDetail) return null;
    const rec = contactProfileData?.reconciliation || {};
    const vendorsTx = contactProfileData?.vendorTransactions || [];
    const disputesList = contactProfileData?.disputes || [];
    const userObj = contactProfileData?.user || activeContactDetail;

    return (
      <Modal visible={!!activeContactDetail} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxWidth: 860, width: "95%", height: "85%", padding: 24 }]}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE_SOFT, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: PURPLE }}>
                    {(userObj.name || "?").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: TEXT_MAIN }}>{userObj.name}</Text>
                    <Badge label={userObj.role || "CUSTOMER"} color={PURPLE} bg={PURPLE_SOFT} />
                  </View>
                  <Text style={{ fontSize: 11, color: TEXT_SUB }}>{userObj.email}  ·  {userObj.phone || "No phone"}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    const c = activeContactDetail;
                    setActiveContactDetail(null);
                    startEdit("user", c);
                  }}
                  style={{ backgroundColor: PURPLE_SOFT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: PURPLE }}>Edit Contact ✏️</Text>
                </Pressable>
                <Pressable onPress={() => setActiveContactDetail(null)} style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT_MAIN }}>Close ✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Audit Nav Tabs */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 10 }}>
              {[
                { id: "reconciliation", label: "🧾 Orders & Payment Reconciliation", count: rec.totalOrders },
                { id: "vendors",        label: "🏪 Vendor Transactions History", count: vendorsTx.length },
                { id: "problems",       label: "🛠️ Support & Problem Resolution", count: disputesList.length },
              ].map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => setAuditTab(t.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: auditTab === t.id ? PURPLE : BG,
                    borderWidth: 1, borderColor: auditTab === t.id ? PURPLE : BORDER,
                    flexDirection: "row", alignItems: "center", gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: auditTab === t.id ? WHITE : TEXT_MAIN }}>{t.label}</Text>
                  {t.count !== undefined && (
                    <View style={{ backgroundColor: auditTab === t.id ? "rgba(255,255,255,0.25)" : BORDER, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: auditTab === t.id ? WHITE : TEXT_SUB }}>{t.count}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {profileLoading ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={PURPLE} />
                <Text style={{ marginTop: 10, fontSize: 12, color: TEXT_SUB }}>Loading customer reconciliation profile...</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Tab 1: Reconciliation */}
                {auditTab === "reconciliation" && (
                  <View>
                    {/* Summary KPI row */}
                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                      <View style={{ flex: 1, backgroundColor: GREEN_BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: GREEN + "33" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: GREEN }}>TOTAL PAID</Text>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: GREEN, marginTop: 2 }}>{fmt(rec.totalPaid || 0)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: AMBER_BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: AMBER + "33" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: AMBER }}>TOTAL PENDING</Text>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: AMBER, marginTop: 2 }}>{fmt(rec.totalPending || 0)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: RED_BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: RED + "33" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: RED }}>TOTAL REFUNDED</Text>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: RED, marginTop: 2 }}>{fmt(rec.totalRefunded || 0)}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "800", color: TEXT_MAIN, marginBottom: 8 }}>Order & Payment Ledger</Text>
                    {(rec.orderBreakdown || []).length === 0 ? (
                      <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No order history found for this contact.</Text>
                    ) : (
                      (rec.orderBreakdown || []).map((o) => (
                        <View key={o.id} style={{ backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN }}>Order #{o.id.slice(-8)}</Text>
                              <Text style={{ fontSize: 11, color: TEXT_SUB }}>({o.vendorEmoji} {o.vendorName})</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Badge label={o.paymentStatus} color={o.paymentStatus === "PAID" ? GREEN : o.paymentStatus === "REFUNDED" ? RED : AMBER} bg={o.paymentStatus === "PAID" ? GREEN_BG : o.paymentStatus === "REFUNDED" ? RED_BG : AMBER_BG} />
                              <Badge label={o.status} color={BLUE} bg={BLUE_BG} />
                            </View>
                          </View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View>
                              <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>Ref: {o.paymentReference}</Text>
                              <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>Gateway: {o.paymentGateway || "-"}</Text>
                              <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>
                                Rider payout: {fmt(o.riderPayoutAmount || 0)} · Company delivery fee: {fmt(o.companyDeliveryFeeAmount || 0)}
                              </Text>
                              <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>Items: {o.items.map(i => `${i.name} (x${i.qty || 1})`).join(", ") || `${o.itemsCount} item(s)`}</Text>
                              <Text style={{ fontSize: 10, color: TEXT_SUB, marginTop: 2 }}>{new Date(o.createdAt).toLocaleString()}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end", gap: 6 }}>
                              <Text style={{ fontSize: 14, fontWeight: "900", color: TEXT_MAIN }}>{fmt(o.total)}</Text>
                              {o.paymentStatus === "PAID" && (
                                <Pressable
                                  onPress={async () => {
                                    const reason = prompt("Enter refund reason:", "Customer dispute / reconciliation refund");
                                    if (reason) {
                                      try {
                                        await AuthAPI.issueRefund(userObj.id, { orderId: o.id, amount: o.total, reason });
                                        alert("Refund recorded successfully!");
                                        openContactAudit(activeContactDetail);
                                      } catch (err) { alert("Refund error: " + err.message); }
                                    }
                                  }}
                                  style={{ backgroundColor: RED_BG, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: "700", color: RED }}>💸 Issue Refund</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Tab 2: Vendor Transactions */}
                {auditTab === "vendors" && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: TEXT_MAIN, marginBottom: 10 }}>Merchant Interaction & Spend History</Text>
                    {vendorsTx.length === 0 ? (
                      <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No vendor transaction history available.</Text>
                    ) : (
                      vendorsTx.map((v) => (
                        <View key={v.vendorId} style={{ backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                            <Text style={{ fontSize: 24 }}>{v.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: TEXT_MAIN }}>{v.name}</Text>
                              <Text style={{ fontSize: 10.5, color: TEXT_SUB }}>{v.ordersCount} order(s) placed</Text>
                              {v.topItems.length > 0 && (
                                <Text style={{ fontSize: 10, color: PURPLE, fontWeight: "600", marginTop: 2 }}>
                                  Top items: {v.topItems.join(", ")}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 15, fontWeight: "900", color: GREEN }}>{fmt(v.totalSpent)}</Text>
                            <Text style={{ fontSize: 9.5, color: TEXT_SUB }}>total spent</Text>
                            <Text style={{ fontSize: 9.5, color: TEXT_SUB, marginTop: 2 }}>Last: {new Date(v.lastOrderAt).toLocaleDateString()}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Tab 3: Support & Problem Resolution */}
                {auditTab === "problems" && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: TEXT_MAIN, marginBottom: 10 }}>Support Disputes & Problem Center</Text>
                    {disputesList.length === 0 ? (
                      <View style={{ backgroundColor: GREEN_BG, borderRadius: 10, padding: 16, alignItems: "center", borderWidth: 1, borderColor: GREEN + "33" }}>
                        <Text style={{ fontSize: 18, marginBottom: 4 }}>✅</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>No Unresolved Issues</Text>
                        <Text style={{ fontSize: 11, color: TEXT_SUB, marginTop: 2 }}>This contact has zero open disputes or support flags.</Text>
                      </View>
                    ) : (
                      disputesList.map((d) => (
                        <View key={d.id} style={{ backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN }}>Dispute on Order #{d.orderId.slice(-8)} ({d.vendorName})</Text>
                            <Badge label={d.status} color={d.status === "RESOLVED" ? GREEN : RED} bg={d.status === "RESOLVED" ? GREEN_BG : RED_BG} />
                          </View>
                          <Text style={{ fontSize: 11, color: TEXT_SUB, marginBottom: 6 }}>Reason: {d.reason}</Text>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontSize: 10, color: TEXT_SUB }}>Reported: {new Date(d.createdAt).toLocaleString()}</Text>
                            {d.status !== "RESOLVED" && (
                              <Pressable
                                onPress={async () => {
                                  try {
                                    await AuthAPI.resolveDispute(userObj.id, { disputeId: d.id, note: "Resolved by Admin via Contact Center" });
                                    alert("Dispute marked resolved!");
                                    openContactAudit(activeContactDetail);
                                  } catch (err) { alert("Error resolving: " + err.message); }
                                }}
                                style={{ backgroundColor: GREEN_BG, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: "700", color: GREEN }}>✓ Mark Resolved</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={s.root}>
      <Sidebar />
      <View style={{ flex: 1 }}>
        {activeTab !== "adminOps" && <TopBar />}
        <View style={{ flex: 1, backgroundColor: BG }}>{renderContent()}</View>
      </View>
      <EditModal />
      <ContactAuditModal />
    </View>
  );
}

const kpi = StyleSheet.create({
  card: { backgroundColor: WHITE, borderRadius: 14, padding: 14, flex: 1, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 11, color: TEXT_SUB, fontWeight: "700" },
  value: { fontSize: 19, fontWeight: "900", color: TEXT_MAIN, marginBottom: 4 },
  change: { fontSize: 10, fontWeight: "700" },
});

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  sidebar: { width: SIDEBAR_W, backgroundColor: SIDEBAR_BG, flexDirection: "column" },
  sLogo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, height: TOPBAR_H, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  logoBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: PURPLE, justifyContent: "center", alignItems: "center" },
  navSec: { color: "#4B5563", fontSize: 9.5, fontWeight: "800", letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  navItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 8, borderRadius: 8 },
  navActive: { backgroundColor: PURPLE },
  navLbl: { color: "#9CA3AF", fontSize: 12, fontWeight: "500" },
  navLblActive: { color: WHITE, fontWeight: "700" },
  sUser: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  sAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: PURPLE, justifyContent: "center", alignItems: "center" },
  topbar: { height: TOPBAR_H, backgroundColor: WHITE, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDER, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, height: 38, marginRight: 14 },
  searchInput: { flex: 1, fontSize: 12, color: TEXT_MAIN, outlineStyle: "none" },
  panel: { backgroundColor: WHITE, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  panelTitle: { fontSize: 13, fontWeight: "800", color: TEXT_MAIN },
  pageH: { fontSize: 20, fontWeight: "900", color: TEXT_MAIN },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  sheetHint: { color: TEXT_SUB, fontSize: 10.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  sheetScroller: { marginHorizontal: -4 },
  sheetTable: { marginHorizontal: 4, borderWidth: 1, borderColor: BORDER, borderRadius: 12, overflow: "hidden", backgroundColor: WHITE },
  sheetRowHead: { flexDirection: "row", backgroundColor: "#F5F3FF", borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetHeadCell: { paddingHorizontal: 12, paddingVertical: 10, color: PURPLE, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, borderRightWidth: 1, borderRightColor: "#E6E1FF" },
  sheetRow: { flexDirection: "row", minHeight: 46, borderBottomWidth: 1, borderBottomColor: "#F0EDF8", backgroundColor: WHITE },
  sheetRowAlt: { backgroundColor: "#FCFBFF" },
  sheetCell: { paddingHorizontal: 12, paddingVertical: 10, color: TEXT_SUB, fontSize: 12, lineHeight: 16, borderRightWidth: 1, borderRightColor: "#F0EDF8" },
  sheetCellBold: { color: TEXT_MAIN, fontWeight: "800" },
  sheetActionHead: { width: 112, textAlign: "center", borderRightWidth: 0 },
  sheetActionCell: { width: 112, paddingHorizontal: 10, paddingVertical: 8, justifyContent: "center", alignItems: "center" },
  mapPinWrap: { position: "absolute", width: 28, height: 28, marginLeft: -14, marginTop: -28, alignItems: "center", justifyContent: "center" },
  mapPin: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: WHITE, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  mapInfoCard: { position: "absolute", top: 10, left: 10, maxWidth: 245, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  mapInfoTitle: { color: TEXT_MAIN, fontSize: 12, fontWeight: "900" },
  mapInfoSub: { color: TEXT_SUB, fontSize: 10.5, marginTop: 2 },
  mapOpenBtn: { position: "absolute", right: 10, top: 10, backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  mapOpenText: { color: WHITE, fontSize: 11, fontWeight: "900" },
  mapAttribution: { position: "absolute", right: 8, bottom: 6, backgroundColor: "rgba(255,255,255,0.86)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  mapAttributionText: { color: TEXT_SUB, fontSize: 9, fontWeight: "700" },
  editBtn: { backgroundColor: PURPLE_SOFT, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnTxt: { fontSize: 11, fontWeight: "700", color: PURPLE },
  btn: { backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  btnTxt: { color: WHITE, fontWeight: "700", fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnGhostTxt: { color: TEXT_MAIN, fontSize: 12, fontWeight: "800" },
  integrationCard: { backgroundColor: WHITE, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  integrationTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: "900" },
  integrationSub: { color: TEXT_SUB, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  integrationRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  integrationLabel: { color: TEXT_MAIN, fontSize: 12.5, fontWeight: "800" },
  integrationMeta: { color: TEXT_SUB, fontSize: 10.5, marginTop: 3 },
  integrationInput: { flex: 1.4, minWidth: 240, height: 38, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, color: TEXT_MAIN, fontSize: 12, backgroundColor: "#FAFAFC", outlineStyle: "none" },
  integrationSave: { width: 72, height: 38, borderRadius: 10, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  integrationSaveText: { color: WHITE, fontSize: 12, fontWeight: "900" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: WHITE, borderRadius: 20, padding: 24, width: "100%", maxWidth: 440 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: TEXT_MAIN, marginBottom: 16 },
  minput: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: TEXT_MAIN, marginBottom: 4 },
  cancelBtn: { flex: 1, backgroundColor: BG, borderRadius: 10, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  cancelTxt: { color: TEXT_MAIN, fontWeight: "700", fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: PURPLE, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  saveTxt: { color: WHITE, fontWeight: "700", fontSize: 13 },
});
