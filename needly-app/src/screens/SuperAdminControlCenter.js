import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from "react-native";
import { SuperAdminAPI, AuthAPI, VendorAPI, RiderAPI, PayoutAPI, DisputeAPI, AuditAPI, BookingAPI, NotificationAPI } from "../api/client";
import { connectSocket, getSocket, subscribeToRealtimeEvents } from "../api/socket";

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
  { section: "OPERATIONS" },
  { id: "liveOps", label: "Live Operations", icon: "📡" },
  { id: "orders", label: "Orders", icon: "📦" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "riderOps", label: "Riders", icon: "🛵" },
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
  { id: "commissions", label: "Commissions", icon: "📈" },
  { section: "ADMINISTRATION" },
  { id: "admins", label: "Admins", icon: "👤" },
  { id: "roles", label: "Roles & Permissions", icon: "🛡️" },
  { id: "integrations", label: "Integrations & API Keys", icon: "🔌" },
  { section: "SUPPORT & ENGAGEMENT" },
  { id: "tickets", label: "Support Tickets", icon: "💬" },
  { id: "disputes", label: "Reviews & Disputes", icon: "⚖️" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
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

const editFieldsMap = {
  user: [["Full Name", "name"], ["Email", "email"], ["Phone", "phone"], ["Role", "role"]],
  vendor: [["Store Name", "name"], ["Category", "category"], ["Area", "area"], ["ETA", "eta"]],
  location: [["Location Name", "name"], ["Delivery Fee", "deliveryFee", true], ["Max Radius", "maxDistance", true]],
  commission: [["Target Name", "targetName"], ["Rate %", "ratePercent", true]],
  promotion: [["Promo Code", "code"], ["Title", "title"], ["Discount Value", "discountValue", true]],
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

function LiveMapGraphic() {
  return (
    <View style={{ width: "100%", height: 185, borderRadius: 12, overflow: "hidden", backgroundColor: "#F0F4F8", borderWidth: 1, borderColor: BORDER, position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
        <rect width="400" height="200" fill="#EAF0F6" />
        <path d="M 0,90 Q 150,140 400,60" fill="none" stroke="#C5D9EB" strokeWidth="18" />
        <path d="M 50,0 Q 120,100 220,200" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <path d="M 0,150 Q 200,80 400,120" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <path d="M 180,0 Q 200,120 380,200" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M 80,40 L 320,160" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="4 4" />
        <path d="M 220,20 L 120,180" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="4 4" />
        <path d="M 140,130 Q 210,110 270,50" fill="none" stroke="#6F45E9" strokeWidth="4" />
      </svg>

      <Text style={{ position: "absolute", top: 12, left: 16, fontSize: 11, fontWeight: "800", color: "#64748B" }}>Abeokuta</Text>
      <Text style={{ position: "absolute", top: 18, right: 75, fontSize: 9, fontWeight: "700", color: "#94A3B8" }}>Obantoko</Text>
      <Text style={{ position: "absolute", bottom: 12, right: 80, fontSize: 9, fontWeight: "700", color: "#94A3B8" }}>Oke-Mosan</Text>
      <Text style={{ position: "absolute", bottom: 14, left: 90, fontSize: 9, fontWeight: "700", color: "#94A3B8" }}>Ibara</Text>

      <View style={{ position: "absolute", top: 45, right: 125, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: WHITE }}>
        <Text style={{ fontSize: 10 }}>🛵</Text>
      </View>
      <View style={{ position: "absolute", top: 105, left: 205, width: 16, height: 16, borderRadius: 8, backgroundColor: AMBER, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: WHITE }}>
        <Text style={{ fontSize: 8 }}>🏪</Text>
      </View>
      <View style={{ position: "absolute", bottom: 45, left: 135, width: 16, height: 16, borderRadius: 8, backgroundColor: RED, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: WHITE }}>
        <Text style={{ fontSize: 8 }}>📍</Text>
      </View>
      <View style={{ position: "absolute", top: 65, left: 215, width: 18, height: 18, borderRadius: 9, backgroundColor: BLUE, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: WHITE }}>
        <Text style={{ fontSize: 8 }}>🛵</Text>
      </View>

      <View style={{ position: "absolute", top: 12, left: 16, width: 175, backgroundColor: WHITE, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: PURPLE_SOFT, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: PURPLE }}>AA</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "800", color: TEXT_MAIN }}>Azeez A.</Text>
              <Text style={{ fontSize: 9, color: AMBER, fontWeight: "700" }}>⭐ 5.0</Text>
            </View>
          </View>
          <Badge label="In Transit" color={PURPLE} bg={PURPLE_SOFT} />
        </View>
        <Text style={{ fontSize: 9.5, fontWeight: "700", color: TEXT_MAIN, marginTop: 6 }}>Honda CB 125</Text>
        <Text style={{ fontSize: 8.5, color: TEXT_SUB }}>Lagos Street, Abeokuta → Customer</Text>
        <Text style={{ fontSize: 8.5, fontWeight: "700", color: GREEN, marginTop: 2 }}>5 mins (1.2 km away)</Text>
      </View>

      <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: WHITE, borderRadius: 8, borderWidth: 1, borderColor: BORDER }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: BORDER }}><Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN }}>+</Text></View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: BORDER }}><Text style={{ fontSize: 12, fontWeight: "800", color: TEXT_MAIN }}>-</Text></View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 5 }}><Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_MAIN }}>⛶</Text></View>
      </View>
    </View>
  );
}

export default function SuperAdminControlCenter({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [liveOps, setLiveOps] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [refunds, setRefunds] = useState([]);
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
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

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
        VendorAPI.adminList().catch(() => VendorAPI.list()),
        RiderAPI.adminList(), BookingAPI.mine(), SuperAdminAPI.locations(),
        SuperAdminAPI.commissions(), SuperAdminAPI.promotions(),
        SuperAdminAPI.tickets(), SuperAdminAPI.roles(), SuperAdminAPI.refunds(),
        PayoutAPI.list(), DisputeAPI.list(), AuditAPI.list(), NotificationAPI.list(),
        SuperAdminAPI.health(), SuperAdminAPI.integrations(),
      ]);

      const [st, lo, cu, ve, ri, bk, lc, cm, pr, tk, rl, rf, py, ds, ad, nt, hl, ig] = rs;
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
      else if (type === "location") await SuperAdminAPI.updateLocation(id, editForm);
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

  const recentTx = [
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
  ].sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 5);

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
    { label: "Add Admin", icon: "👤" },
    { label: "Add Vendor", icon: "🏪" },
    { label: "Add Rider", icon: "🛵" },
    { label: "Send Notification", icon: "🔔" },
    { label: "Approve Payouts", icon: "💳" },
    { label: "View Reports", icon: "📈" },
    { label: "System Health", icon: "🫀" },
    { label: "Audit Logs", icon: "📜" },
  ];

  const GenericList = ({ items, type, fields, filterKey = "name" }) => {
    const filtered = (items || []).filter((it) => {
      if (!query.trim()) return true;
      const targetVal = String(it[filterKey] || it.id || "").toLowerCase();
      return targetVal.includes(query.trim().toLowerCase());
    });

    return (
      <View style={s.panel}>
        <PH title={`${type.toUpperCase()} (${filtered.length})`} />
        {filtered.length === 0 && <Text style={{ color: TEXT_SUB, fontStyle: "italic", paddingVertical: 12 }}>No records found.</Text>}
        {filtered.map((item, idx) => (
          <View key={item.id || idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER }}>
            <View style={{ flex: 1 }}>
              {fields.map((f) => (
                <Text key={f.key} style={{ fontSize: f.bold ? 13 : 11, fontWeight: f.bold ? "700" : "400", color: f.bold ? TEXT_MAIN : TEXT_SUB, marginBottom: 1 }}>
                  {f.label ? f.label + ": " : ""}{item[f.key] ?? "—"}
                </Text>
              ))}
            </View>
            <Pressable onPress={() => startEdit(type, item)} style={s.editBtn}>
              <Text style={s.editBtnTxt}>Edit ✏️</Text>
            </Pressable>
          </View>
        ))}
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
            <LiveMapGraphic />
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
                <Pressable key={qa.label} style={{ width: "22%", alignItems: "center" }}>
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

    // Realtime Operations Command Center (liveOps, orders, bookings, riderOps, dispatch, riderFleet)
    if (activeTab === "liveOps" || activeTab === "orders" || activeTab === "bookings" || activeTab === "riderOps" || activeTab === "dispatch" || activeTab === "riderFleet") {
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
            <LiveMapGraphic />
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


    if (activeTab === "vendors" || activeTab === "providers" || activeTab === "products" || activeTab === "services" || activeTab === "categories") {
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
          <Pressable onPress={() => setShowLocModal(true)} style={s.btn}><Text style={s.btnTxt}>+ Add Zone</Text></Pressable>
        </View>
        <GenericList items={locations.length > 0 ? locations : [{ id: 1, name: "Oke-Ilewo Zone", deliveryFee: "₦500", maxDistance: "8 km" }]} type="location" fields={[{ key: "name", bold: true }, { key: "deliveryFee", label: "Delivery Fee" }, { key: "maxDistance", label: "Radius" }]} />
      </ScrollView>
    );

    if (activeTab === "transactions" || activeTab === "invoices" || activeTab === "receipts") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Financial Transactions & Invoices Ledger</Text>
        <GenericList items={recentTx} type="transaction" fields={[{ key: "id", bold: true }, { key: "type", label: "Type" }, { key: "name", label: "Party" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "payouts") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Vendor & Rider Payout Approval Center</Text>
          <Pressable onPress={() => alert("Batch payout approved for all pending accounts!")} style={s.btn}><Text style={s.btnTxt}>⚡ Batch Approve Payouts</Text></Pressable>
        </View>
        <GenericList items={payouts.length > 0 ? payouts : [{ id: "PY-901", name: "Fresh Bites Restaurant", amount: "₦85,000", bank: "GTBank • 0123456789", status: "Pending Approval" }]} type="payout" fields={[{ key: "name", bold: true }, { key: "amount", label: "Payout Amount" }, { key: "bank", label: "Bank Account" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "refunds") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Customer Refund Requests</Text>
        <GenericList items={refunds.length > 0 ? refunds : [{ id: "RF-401", customer: "Sarah Johnson", orderId: "ORD-78289", amount: "₦8,900", reason: "Order Cancelled by Merchant", status: "Pending Review" }]} type="refund" fields={[{ key: "customer", bold: true }, { key: "amount", label: "Refund Amount" }, { key: "reason", label: "Reason" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    if (activeTab === "commissions") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>Platform Commission Rules</Text>
        <GenericList items={commissions.length > 0 ? commissions : [{ id: 1, targetName: "Restaurant Category", targetType: "Vendor Commission", ratePercent: 12 }]} type="commission" fields={[{ key: "targetName", bold: true }, { key: "targetType", label: "Target" }, { key: "ratePercent", label: "Commission %" }]} />
      </ScrollView>
    );

    if (activeTab === "integrations") return <IntegrationSettings />;

    if (activeTab === "admins" || activeTab === "roles") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Admins, Roles & API Integrations</Text>
          <Pressable onPress={() => setShowRoleModal(true)} style={s.btn}><Text style={s.btnTxt}>+ Create Role</Text></Pressable>
        </View>
        <GenericList items={roles.length > 0 ? roles : [{ id: 1, name: "Super Administrator", description: "Full root access across all platform modules", members: 3 }]} type="role" fields={[{ key: "name", bold: true }, { key: "description", label: "Permissions Summary" }]} />
      </ScrollView>
    );

    if (activeTab === "tickets" || activeTab === "disputes" || activeTab === "notifications") return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={s.pageH}>Support Tickets & Push Notifications Desk</Text>
          <Pressable onPress={() => setShowBroadcastModal(true)} style={s.btn}><Text style={s.btnTxt}>+ Send Push Broadcast</Text></Pressable>
        </View>
        <GenericList items={tickets.length > 0 ? tickets : [{ id: "TK-101", subject: "Delayed Order Refund Enquiry", status: "Open", priority: "High", customer: "Michael John" }]} type="ticket" fields={[{ key: "subject", bold: true }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }]} />
      </ScrollView>
    );

    // Default System, Health, Analytics, Reports, Security & Settings View
    const tabObj = NAV.find((n) => n.id === activeTab) || { label: activeTab };
    return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.pageH, { marginBottom: 16 }]}>{tabObj.label || "System Administration"}</Text>
        <View style={s.panel}>
          {[
            ["API Gateway", "Operational", GREEN],
            ["Database Core", "Operational", GREEN],
            ["Storage Service", "Operational", GREEN],
            ["Real-Time Sockets", "Operational", GREEN],
            ["SMS Gateway", "Degraded", AMBER],
            ["Payment Gateway", "Operational", GREEN],
          ].map(([svc, stat, color]) => (
            <View key={svc} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 13, color: TEXT_MAIN, fontWeight: "700" }}>{svc}</Text>
              <Badge label={stat} color={color} bg={color + "22"} />
            </View>
          ))}
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
                <TextInput value={String(editForm[field] || "")} onChangeText={(t) => setEditForm((d) => ({ ...d, [field]: num ? Number(t) : t }))} keyboardType={num ? "numeric" : "default"} style={s.minput} />
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
        <TopBar />
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
