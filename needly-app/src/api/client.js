import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Point this at your deployed backend. For local dev against an Expo Go
// device/simulator on the same network, use your machine's LAN IP, not
// "localhost" (the phone can't resolve your laptop's localhost).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

const TOKEN_KEY = "needly_auth_token";

// A suspended account gets 403'd by requireAuth on its very next request
// (see the backend's live approval check). Plain functions can't call
// useAuth() directly, so AuthContext registers a handler here once on
// mount; when this fires, it logs the person out and hands the message to
// the login screen instead of leaving buttons silently failing with no
// explanation.
let suspensionHandler = null;
export function setSuspensionHandler(fn) {
  suspensionHandler = fn;
}

export async function getToken() {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token) {
  if (Platform.OS === "web") {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }

  if (token) return SecureStore.setItemAsync(TOKEN_KEY, token);
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    if (res.status === 403 && /suspended/i.test(message) && suspensionHandler) {
      suspensionHandler(message);
    }
    throw new Error(message);
  }
  return data;
}

/* ---------------------------------------------------------
   Adapters — translate the backend's shapes into the shapes
   the existing screens were already written against, so the
   screens themselves don't need a full rewrite just because
   the data now comes over the network instead of local state.
--------------------------------------------------------- */

export function normalizeVendor(v) {
  return {
    id: v.id,
    name: v.name,
    area: v.area,
    category: v.category,
    eta: v.eta,
    rating: v.rating,
    emoji: v.emoji,
    address: v.address || null,
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
    isOpen: v.isOpen,
    ownerId: v.ownerId,
    managerId: v.managerId,
    items: (v.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      emoji: p.emoji,
      subcategory: p.subcategory || undefined,
      isAvailable: p.isAvailable,
      addOns: (p.addOns || []).map((a) => ({ id: a.id, name: a.name, price: a.price })),
    })),
  };
}

export function normalizeOrder(o) {
  return {
    id: o.id,
    status: (o.status || "").toLowerCase(),
    total: o.total,
    deliveryAddress: o.deliveryAddress ?? null, // null = redacted (rider, pre-pickup)
    deliveryPhone: o.deliveryPhone ?? null,
    createdAt: o.createdAt,
    vendor: o.vendor ? {
      id: o.vendor.id,
      name: o.vendor.name,
      area: o.vendor.area,
      category: o.vendor.category,
      emoji: o.vendor.emoji,
      eta: o.vendor.eta,
      rating: o.vendor.rating,
      address: o.vendor.address || null,
      latitude: o.vendor.latitude ?? null,
      longitude: o.vendor.longitude ?? null,
    } : { id: o.vendorId },
    items: (o.items || []).map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji })),
    riderId: o.riderId || o.rider?.id || null,
    riderName: o.rider?.user?.name || null,
    riderLatitude: o.rider?.latitude ?? null,
    riderLongitude: o.rider?.longitude ?? null,
    customerName: o.customer?.name || null,
    deliveryLatitude: o.deliveryLatitude ?? null,
    deliveryLongitude: o.deliveryLongitude ?? null,
    paymentStatus: o.payment?.status ? o.payment.status.toLowerCase() : null,
    dispute: o.dispute ? normalizeDispute(o.dispute) : null,
    review: o.review || null,
    cancelReason: o.cancelReason || null,
  };
}

export function normalizeDispute(d) {
  return {
    id: d.id,
    orderId: d.orderId,
    vendorId: d.vendorId,
    vendorName: d.vendor?.name,
    total: d.order?.total,
    reason: d.reason,
    status: (d.status || "").toLowerCase(),
    createdAt: d.createdAt,
    items: d.order?.items || [],
    customerName: d.order?.customer?.name || null,
    customerPhone: d.order?.customer?.phone || null,
    riderName: d.order?.rider?.user?.name || null,
    riderPhone: d.order?.rider?.user?.phone || null,
  };
}

function parseJwtRole(token) {
  if (!token) return "CUSTOMER";
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      if (token.includes("vendor")) return "VENDOR";
      if (token.includes("rider")) return "RIDER";
      if (token.includes("manager")) return "MANAGER";
      if (token.includes("admin")) return "ADMIN";
      return "CUSTOMER";
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    return (decoded.role || "CUSTOMER").toUpperCase();
  } catch (e) {
    if (token.includes("vendor")) return "VENDOR";
    if (token.includes("rider")) return "RIDER";
    if (token.includes("manager")) return "MANAGER";
    if (token.includes("admin")) return "ADMIN";
    return "CUSTOMER";
  }
}

/* Mock data arrays removed — all data comes from the backend database. */

/* --- Auth --- */
export const AuthAPI = {
  login: async (email, password) => {
    return await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
  },
  socialLogin: async ({ provider, email, name, role }) => {
    return await request("/auth/social", {
      method: "POST",
      body: { provider, email, name, role },
      auth: false,
    });
  },
  register: async (payload) => {
    const role = (payload.role || "CUSTOMER").toUpperCase();
    const isPendingRole = role === "VENDOR" || role === "RIDER";
    const res = await request("/auth/register", { method: "POST", body: payload, auth: false });
    if (res.pendingApproval || isPendingRole) {
      return {
        pendingApproval: true,
        message: res.message || `Your ${role === "VENDOR" ? "Store Profile" : "Rider Account"} registration has been submitted! Needly Admin will review and activate your account shortly.`,
      };
    }
    return res;
  },
  me: async () => {
    const me = await request("/auth/me");
    if (me && me.role) return me;
    throw new Error("Invalid session");
  },
  registerPushToken: (expoPushToken) => request("/auth/me/push-token", { method: "PATCH", body: { expoPushToken } }).catch(() => null),
  pendingApprovals: async () => {
    const res = await request("/auth/pending");
    return Array.isArray(res) ? res : [];
  },
  customers: async () => {
    const res = await request("/auth/customers");
    return Array.isArray(res) ? res : [];
  },
  mailTray: () => request("/auth/mail-tray").catch(() => []),
  approveUser: async (id) => {
    return await request(`/auth/users/${id}/approve`, { method: "PATCH" });
  },
  suspendUser: (id) => request(`/auth/users/${id}/suspend`, { method: "PATCH" }).catch(() => ({ ok: true })),
  editContact: (userId, { name, email, phone, role }) => request(`/auth/users/${userId}/contact`, { method: "PATCH", body: { name, email, phone, role } }),
  getFullProfile: (userId) => request(`/auth/customers/${userId}/full-profile`),
  issueRefund: (userId, { orderId, amount, reason }) => request(`/auth/customers/${userId}/issue-refund`, { method: "POST", body: { orderId, amount, reason } }),
  resolveDispute: (userId, { disputeId, note }) => request(`/auth/customers/${userId}/resolve-dispute`, { method: "POST", body: { disputeId, note } }),
};

/* --- Vendors / products --- */
export const VendorAPI = {
  list: async (category) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const data = await request(`/vendors${qs}`, { auth: false });
    return (Array.isArray(data) ? data : []).map(normalizeVendor);
  },
  get: async (id) => normalizeVendor(await request(`/vendors/${id}`, { auth: false })),
  adminList: async () => {
    const res = await request("/vendors/admin/all");
    return Array.isArray(res) ? res : [];
  },
  adminEditProfile: (vendorId, fields) => request(`/vendors/${vendorId}/admin-edit`, { method: "PATCH", body: fields }),
  setVerification: (vendorId, fields) => request(`/vendors/${vendorId}/verification`, { method: "PATCH", body: fields }),
  stats: () => request("/vendors/me/stats").catch(() => null),
  toggleOpen: (vendorId) => request(`/vendors/${vendorId}/open`, { method: "PATCH" }).catch(() => ({ isOpen: true })),
  addProduct: (vendorId, { name, price, emoji, subcategory }) =>
    request(`/vendors/${vendorId}/products`, { method: "POST", body: { name, price, emoji, subcategory } }),
  updateProduct: (vendorId, productId, patch) =>
    request(`/vendors/${vendorId}/products/${productId}`, { method: "PATCH", body: patch }),
  toggleAvailable: (vendorId, productId) =>
    request(`/vendors/${vendorId}/products/${productId}/available`, { method: "PATCH" }),
  addAddOn: (vendorId, productId, { name, price }) =>
    request(`/vendors/${vendorId}/products/${productId}/addons`, { method: "POST", body: { name, price } }),
  removeAddOn: (vendorId, productId, addOnId) =>
    request(`/vendors/${vendorId}/products/${productId}/addons/${addOnId}`, { method: "DELETE" }),
};

/* --- Orders --- */
export const OrderAPI = {
  place: async ({ vendorId, items, deliveryAddress, deliveryPhone, deliveryLatitude, deliveryLongitude }) =>
    normalizeOrder(await request("/orders", { method: "POST", body: { vendorId, items, deliveryAddress, deliveryPhone, deliveryLatitude, deliveryLongitude } })),
  mine: (filters) => {
    const qs = filters ? `?${new URLSearchParams(filters).toString()}` : "";
    return request(`/orders/mine${qs}`);
  },
  advance: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/status`, { method: "PATCH" })),
  claim: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/claim`, { method: "POST" })),
  cancel: async (orderId, reason) => normalizeOrder(await request(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } })),
  unassign: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/unassign`, { method: "POST" })),
};

/* --- Rider --- */
export const RiderAPI = {
  stats: () => request("/riders/me/stats").catch(() => null),
  toggleOnline: () => request("/riders/me/online", { method: "PATCH" }).catch(() => ({ isOnline: true })),
  adminList: () => request("/riders").catch(() => []),
  adminEditProfile: (riderId, fields) => request(`/riders/${riderId}/admin-edit`, { method: "PATCH", body: fields }),
  setVerification: (riderId, fields) => request(`/riders/${riderId}/verification`, { method: "PATCH", body: fields }),
  setBankAccount: (bank) => request("/riders/me/bank-account", { method: "PATCH", body: bank }),
  balance: () => request("/riders/me/balance").catch(() => ({ available: 0, totalPending: 0 })),
  payoutHistory: () => request("/riders/me/payouts").catch(() => []),
  requestPayout: (amount) => request("/riders/me/payouts", { method: "POST", body: { amount } }),
  deliveries: (period) => request(`/riders/me/deliveries?period=${period}`).catch(() => []),
};

/* --- Payouts (admin) --- */
export const PayoutAPI = {
  list: (status) => request(`/payouts${status ? `?status=${status}` : ""}`),
  markPaid: (id, note) => request(`/payouts/${id}/mark-paid`, { method: "PATCH", body: { note } }),
  reject: (id, note) => request(`/payouts/${id}/reject`, { method: "PATCH", body: { note } }),
};

/* --- Reviews --- */
export const ReviewAPI = {
  submit: (orderId, vendorRating, riderRating, comment) =>
    request("/reviews", { method: "POST", body: { orderId, vendorRating, riderRating, comment } }),
};

/* --- Payments --- */
export const PaymentAPI = {
  initialize: (orderId) => request("/payments/initialize", { method: "POST", body: { orderId } }),
};

/* --- Audit log --- */
export const AuditAPI = {
  list: (limit) => request(`/audit-log${limit ? `?limit=${limit}` : ""}`),
};

/* --- Operational issues (app/logistics problems, not vendor-scoped) --- */
export const OperationalIssueAPI = {
  report: (reason, orderId) => request("/operational-issues", { method: "POST", body: { reason, orderId } }),
  list: () => request("/operational-issues"),
  resolve: (id) => request(`/operational-issues/${id}/resolve`, { method: "PATCH" }),
};

/* --- Service Bookings --- */
export const BookingAPI = {
  create: (data) => request("/bookings", { method: "POST", body: data }),
  mine: () => request("/bookings/mine").catch(() => []),
  updateStatus: (id, status) => request(`/bookings/${id}/status`, { method: "PATCH", body: { status } }),
  cancel: (id, reason) => request(`/bookings/${id}/cancel`, { method: "PATCH", body: { reason } }),
};

/* --- Notifications --- */
export const NotificationAPI = {
  list: () => request("/notifications").catch(() => []),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }).catch(() => ({ ok: true })),
};


/* --- Disputes --- */
export const DisputeAPI = {
  raise: (orderId, reason) => request("/disputes", { method: "POST", body: { orderId, reason } }),
  list: async () => (await request("/disputes")).map(normalizeDispute),
  resolve: (disputeId) => request(`/disputes/${disputeId}/resolve`, { method: "PATCH" }),
};

/* --- Super Admin Central Command Center API --- */
export const SuperAdminAPI = {
  overview: () => request("/admin/stats/overview").catch(() => null),
  // aliases used by SuperAdminControlCenter.js
  stats: () => request("/admin/stats/overview").catch(() => null),
  liveOps: () => request("/admin/live-operations").catch(() => null),
  liveOperations: () => request("/admin/live-operations").catch(() => null),
  health: () => request("/admin/health").catch(() => null),
  roles: () => request("/admin/roles").catch(() => []),
  createRole: (data) => request("/admin/roles", { method: "POST", body: data }),
  permissions: () => request("/admin/permissions").catch(() => []),
  locations: () => request("/admin/locations").catch(() => []),
  createLocation: (data) => request("/admin/locations", { method: "POST", body: data }),
  commissions: () => request("/admin/commissions").catch(() => []),
  createCommission: (data) => request("/admin/commissions", { method: "POST", body: data }),
  promotions: () => request("/admin/promotions").catch(() => []),
  createPromotion: (data) => request("/admin/promotions", { method: "POST", body: data }),
  tickets: () => request("/admin/tickets").catch(() => []),
  refunds: () => request("/admin/refunds").catch(() => []),
  fraudAlerts: () => request("/admin/fraud-alerts").catch(() => []),
  globalSearch: (q) => request(`/admin/global-search?q=${encodeURIComponent(q)}`).catch(() => ({ orders: [], customers: [], vendors: [], riders: [] })),
  impersonate: (targetRole, targetEmail) => request("/admin/impersonate", { method: "POST", body: { targetRole, targetEmail } }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: "PATCH", body: data }),
  updateVendor: (id, data) => request(`/admin/vendors/${id}`, { method: "PATCH", body: data }),
  updateRider: (id, data) => request(`/admin/riders/${id}`, { method: "PATCH", body: data }),
  updateProduct: (id, data) => request(`/admin/products/${id}`, { method: "PATCH", body: data }),
  updateService: (id, data) => request(`/admin/services/${id}`, { method: "PATCH", body: data }),
  updateOrder: (id, data) => request(`/admin/orders/${id}`, { method: "PATCH", body: data }),
  updateBooking: (id, data) => request(`/admin/bookings/${id}`, { method: "PATCH", body: data }),
  updateLocation: (id, data) => request(`/admin/locations/${id}`, { method: "PATCH", body: data }),
  updateCommission: (id, data) => request(`/admin/commissions/${id}`, { method: "PATCH", body: data }),
  updatePromotion: (id, data) => request(`/admin/promotions/${id}`, { method: "PATCH", body: data }),
  updateTicket: (id, data) => request(`/admin/tickets/${id}`, { method: "PATCH", body: data }),
  updateRefund: (id, data) => request(`/admin/refunds/${id}`, { method: "PATCH", body: data }),
};
