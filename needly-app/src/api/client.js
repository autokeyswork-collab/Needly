import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Point this at your deployed backend. For local dev against an Expo Go
// device/simulator on the same network, set EXPO_PUBLIC_API_BASE_URL to
// your machine's LAN IP. The default must be the live API so mobile/PWA
// builds never try to call a phone's own localhost.
const LIVE_API_BASE_URL = "https://needly-backend-7tap.onrender.com";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || LIVE_API_BASE_URL;

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
  const urls = Array.from(new Set([API_BASE_URL, LIVE_API_BASE_URL]));
  try {
    for (let idx = 0; idx < urls.length; idx += 1) {
      try {
        res = await fetch(`${urls[idx]}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        break;
      } catch (err) {
        if (idx === urls.length - 1) throw err;
      }
    }
  } catch (err) {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.path = path;
    if (res.status === 403 && /suspended/i.test(message) && suspensionHandler) {
      suspensionHandler(message);
    }
    throw error;
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
    bankName: v.bankName || null,
    bankAccountNumber: v.bankAccountNumber || null,
    bankAccountName: v.bankAccountName || null,
    bankAccountLocked: !!v.bankAccountLocked,
    bankAccountLockedAt: v.bankAccountLockedAt || null,
    onboardingFeeAmount: v.onboardingFeeAmount ?? 2500,
    onboardingFeeStatus: v.onboardingFeeStatus || "PENDING",
    onboardingPaidAt: v.onboardingPaidAt || null,
    isOpen: v.isOpen,
    ownerId: v.ownerId,
    managerId: v.managerId,
    items: (v.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      emoji: p.emoji,
      imageUrl: p.imageUrl || null,
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
    fulfillmentType: o.fulfillmentType || "DIRECT",
    agentPickupStatus: o.agentPickupStatus || "NOT_REQUIRED",
    agentName: o.agent?.user?.name || null,
    hub: o.hub ? {
      id: o.hub.id,
      name: o.hub.name,
      area: o.hub.area,
      address: o.hub.address,
      latitude: o.hub.latitude ?? null,
      longitude: o.hub.longitude ?? null,
    } : null,
    customerName: o.customer?.name || null,
    deliveryLatitude: o.deliveryLatitude ?? null,
    deliveryLongitude: o.deliveryLongitude ?? null,
    paymentStatus: o.payment?.status ? o.payment.status.toLowerCase() : null,
    paymentReference: o.payment?.reference || null,
    customerPaidAmount: o.payment?.amount ?? null,
    vendorAmount: o.payment?.vendorAmount ?? o.total,
    platformFeeAmount: o.payment?.platformFeeAmount ?? 0,
    platformFeePercent: o.payment?.platformFeePercent ?? 0,
    deliveryFeeAmount: o.payment?.deliveryFeeAmount ?? 0,
    deliveryDistanceKm: o.payment?.deliveryDistanceKm ?? null,
    riderPayoutAmount: o.payment?.riderPayoutAmount ?? 0,
    companyDeliveryFeeAmount: o.payment?.companyDeliveryFeeAmount ?? 0,
    paymentGateway: o.payment?.gateway || null,
    vendorReceived: !!o.payment?.vendorReceived,
    vendorReceivedAt: o.payment?.vendorReceivedAt || null,
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
      if (token.includes("agent")) return "AGENT";
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
    if (token.includes("agent")) return "AGENT";
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
  socialLogin: async (payload) => {
    return await request("/auth/social", {
      method: "POST",
      body: payload,
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
        onboardingPayment: res.onboardingPayment || null,
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
  updateMeProfile: (fields) => request("/auth/me/profile", { method: "PATCH", body: fields }),
  changePassword: ({ currentPassword, newPassword }) => request("/auth/me/password", { method: "PATCH", body: { currentPassword, newPassword } }),
  locations: () => request("/auth/locations", { auth: false }),
  registerPushToken: (expoPushToken) => request("/auth/me/push-token", { method: "PATCH", body: { expoPushToken } }).catch(() => null),
  pendingApprovals: async () => {
    const res = await request("/auth/pending");
    return Array.isArray(res) ? res : [];
  },
  customers: async () => {
    const res = await request("/auth/customers");
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.customers) ? res.customers : [];
  },
  mailTray: () => request("/auth/mail-tray"),
  approveUser: async (id) => {
    return await request(`/auth/users/${id}/approve`, { method: "PATCH" });
  },
  suspendUser: (id) => request(`/auth/users/${id}/suspend`, { method: "PATCH" }),
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
  verify: (vendorId, fields) => request(`/vendors/${vendorId}/verification`, { method: "PATCH", body: fields }),
  stats: () => request("/vendors/me/stats"),
  setBankAccount: (vendorId, bank) => request(`/vendors/${vendorId}/bank-account`, { method: "PATCH", body: bank }),
  toggleOpen: (vendorId) => request(`/vendors/${vendorId}/open`, { method: "PATCH" }),
  addProduct: (vendorId, { name, price, emoji, subcategory, imageUrl }) =>
    request(`/vendors/${vendorId}/products`, { method: "POST", body: { name, price, emoji, subcategory, imageUrl } }),
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
  place: async ({ vendorId, items, deliveryAddress, deliveryPhone, deliveryLatitude, deliveryLongitude, useAgentHub, hubId }) =>
    normalizeOrder(await request("/orders", { method: "POST", body: { vendorId, items, deliveryAddress, deliveryPhone, deliveryLatitude, deliveryLongitude, useAgentHub, hubId } })),
  mine: (filters) => {
    const qs = filters ? `?${new URLSearchParams(filters).toString()}` : "";
    return request(`/orders/mine${qs}`);
  },
  advance: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/status`, { method: "PATCH" })),
  claim: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/claim`, { method: "POST" })),
  agentClaim: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/agent-claim`, { method: "POST" })),
  agentStatus: async (orderId, agentPickupStatus) => normalizeOrder(await request(`/orders/${orderId}/agent-status`, { method: "PATCH", body: { agentPickupStatus } })),
  cancel: async (orderId, reason) => normalizeOrder(await request(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } })),
  unassign: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/unassign`, { method: "POST" })),
};

export const AgentAPI = {
  me: () => request("/agents/me"),
  stats: () => request("/agents/me/stats"),
  toggleOnline: () => request("/agents/me/online", { method: "PATCH" }),
  hubs: () => request("/agents/hubs"),
};

/* --- Rider --- */
export const RiderAPI = {
  stats: () => request("/riders/me/stats"),
  toggleOnline: () => request("/riders/me/online", { method: "PATCH" }),
  adminList: () => request("/riders"),
  adminEditProfile: (riderId, fields) => request(`/riders/${riderId}/admin-edit`, { method: "PATCH", body: fields }),
  setVerification: (riderId, fields) => request(`/riders/${riderId}/verification`, { method: "PATCH", body: fields }),
  setBankAccount: (bank) => request("/riders/me/bank-account", { method: "PATCH", body: bank }),
  balance: () => request("/riders/me/balance"),
  payoutHistory: () => request("/riders/me/payouts"),
  requestPayout: (amount) => request("/riders/me/payouts", { method: "POST", body: { amount } }),
  deliveries: (period) => request(`/riders/me/deliveries?period=${period}`),
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
  platformFee: () => request("/payments/platform-fee"),
  options: () => request("/payments/options"),
  initialize: (orderId, gateway, customerEmail) => request("/payments/initialize", { method: "POST", body: { orderId, gateway, customerEmail } }),
  verify: (reference) => request("/payments/verify", { method: "POST", body: { reference } }),
  confirmVendorReceived: (orderId) => request(`/payments/${orderId}/vendor-received`, { method: "PATCH" }),
};

/* --- Public home content --- */
export const HomeAPI = {
  banners: (location) => request(`/home/banners${location ? `?location=${encodeURIComponent(location)}` : ""}`, { auth: false }),
  categories: (location) => request(`/home/categories${location ? `?location=${encodeURIComponent(location)}` : ""}`, { auth: false }),
};

export const MarketplaceAPI = {
  divisions: (location) => request(`/marketplace/divisions${location ? `?location=${encodeURIComponent(location)}` : ""}`, { auth: false }),
  categories: ({ location, divisionId, parentId, featured, homepage } = {}) => {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (divisionId) params.set("divisionId", divisionId);
    if (parentId !== undefined) params.set("parentId", parentId || "");
    if (featured !== undefined) params.set("featured", String(featured));
    if (homepage !== undefined) params.set("homepage", String(homepage));
    const qs = params.toString();
    return request(`/marketplace/categories${qs ? `?${qs}` : ""}`, { auth: false });
  },
  featuredCategories: (location) => request(`/marketplace/featured-categories${location ? `?location=${encodeURIComponent(location)}` : ""}`, { auth: false }),
  children: (id, location) => request(`/marketplace/categories/${encodeURIComponent(id)}/children${location ? `?location=${encodeURIComponent(location)}` : ""}`, { auth: false }),
};

/* --- Customer Wallet / Needly Pay --- */
export const WalletAPI = {
  summary: () => request("/wallet"),
  initializeFunding: (amount) => request("/wallet/fund/initialize", { method: "POST", body: { amount } }),
  verifyFunding: (reference) => request("/wallet/fund/verify", { method: "POST", body: { reference } }),
  transfer: ({ recipient, amount, note }) => request("/wallet/transfer", { method: "POST", body: { recipient, amount, note } }),
  withdraw: ({ amount, bankName, bankAccountNumber, bankAccountName }) =>
    request("/wallet/withdraw", { method: "POST", body: { amount, bankName, bankAccountNumber, bankAccountName } }),
  markWithdrawalPaid: (reference, note) => request(`/wallet/withdrawals/${encodeURIComponent(reference)}/mark-paid`, { method: "PATCH", body: { note } }),
  rejectWithdrawal: (reference, note) => request(`/wallet/withdrawals/${encodeURIComponent(reference)}/reject`, { method: "PATCH", body: { note } }),
  payBill: ({ category, amount, recipient, provider, note }) =>
    request("/wallet/bills/pay", { method: "POST", body: { category, amount, recipient, provider, note } }),
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
  services: (category) => request(`/bookings/services${category ? `?category=${encodeURIComponent(category)}` : ""}`, { auth: false }),
  mine: () => request("/bookings/mine"),
  updateStatus: (id, status) => request(`/bookings/${id}/status`, { method: "PATCH", body: { status } }),
  cancel: (id, reason) => request(`/bookings/${id}/cancel`, { method: "PATCH", body: { reason } }),
};

/* --- Notifications --- */
export const NotificationAPI = {
  list: () => request("/notifications"),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifications/read-all", { method: "PATCH" }),
};


/* --- Disputes --- */
export const DisputeAPI = {
  raise: (orderId, reason) => request("/disputes", { method: "POST", body: { orderId, reason } }),
  list: async () => (await request("/disputes")).map(normalizeDispute),
  resolve: (disputeId) => request(`/disputes/${disputeId}/resolve`, { method: "PATCH" }),
};

/* --- Super Admin Central Command Center API --- */
export const SuperAdminAPI = {
  overview: () => request("/admin/stats/overview"),
  // aliases used by SuperAdminControlCenter.js
  stats: () => request("/admin/stats/overview"),
  liveOps: () => request("/admin/live-operations"),
  liveOperations: () => request("/admin/live-operations"),
  health: () => request("/admin/health"),
  integrations: () => request("/admin/integrations"),
  updateIntegration: ({ provider, key, value }) => request("/admin/integrations", { method: "PATCH", body: { provider, key, value } }),
  roles: () => request("/admin/roles"),
  createRole: (data) => request("/admin/roles", { method: "POST", body: data }),
  permissions: () => request("/admin/permissions"),
  locations: () => request("/admin/locations"),
  createLocation: (data) => request("/admin/locations", { method: "POST", body: data }),
  commissions: () => request("/admin/commissions"),
  createCommission: (data) => request("/admin/commissions", { method: "POST", body: data }),
  promotions: () => request("/admin/promotions"),
  createPromotion: (data) => request("/admin/promotions", { method: "POST", body: data }),
  tickets: () => request("/admin/tickets"),
  refunds: () => request("/admin/refunds"),
  walletTransactions: () => request("/admin/wallet-transactions"),
  fraudAlerts: () => request("/admin/fraud-alerts"),
  orders: () => request("/admin/orders"),
  bookings: () => request("/admin/bookings"),
  products: () => request("/admin/products"),
  services: () => request("/admin/services"),
  categories: () => request("/admin/categories"),
  createCategory: (data) => request("/admin/categories", { method: "POST", body: data }),
  marketplaceDivisions: () => request("/admin/marketplace/divisions"),
  createMarketplaceDivision: (data) => request("/admin/marketplace/divisions", { method: "POST", body: data }),
  marketplaceCategories: () => request("/admin/marketplace/categories"),
  createMarketplaceCategory: (data) => request("/admin/marketplace/categories", { method: "POST", body: data }),
  hubs: () => request("/admin/hubs"),
  createHub: (data) => request("/admin/hubs", { method: "POST", body: data }),
  agents: () => request("/admin/agents"),
  createAgent: (data) => request("/admin/agents", { method: "POST", body: data }),
  admins: () => request("/admin/admins"),
  notifications: () => request("/admin/notifications"),
  createUser: (data) => request("/admin/users", { method: "POST", body: data }),
  createVendor: (data) => request("/admin/vendors", { method: "POST", body: data }),
  createRider: (data) => request("/admin/riders", { method: "POST", body: data }),
  broadcastNotification: (data) => request("/admin/notifications/broadcast", { method: "POST", body: data }),
  globalSearch: (q) => request(`/admin/global-search?q=${encodeURIComponent(q)}`),
  impersonate: (targetRole, targetEmail) => request("/admin/impersonate", { method: "POST", body: { targetRole, targetEmail } }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: "PATCH", body: data }),
  updateVendor: (id, data) => request(`/admin/vendors/${id}`, { method: "PATCH", body: data }),
  updateRider: (id, data) => request(`/admin/riders/${id}`, { method: "PATCH", body: data }),
  updateHub: (id, data) => request(`/admin/hubs/${id}`, { method: "PATCH", body: data }),
  updateAgent: (id, data) => request(`/admin/agents/${id}`, { method: "PATCH", body: data }),
  updateProduct: (id, data) => request(`/admin/products/${id}`, { method: "PATCH", body: data }),
  updateService: (id, data) => request(`/admin/services/${id}`, { method: "PATCH", body: data }),
  updateOrder: (id, data) => request(`/admin/orders/${id}`, { method: "PATCH", body: data }),
  updateBooking: (id, data) => request(`/admin/bookings/${id}`, { method: "PATCH", body: data }),
  updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: "PATCH", body: data }),
  updateLocation: (id, data) => request(`/admin/locations/${id}`, { method: "PATCH", body: data }),
  updateCommission: (id, data) => request(`/admin/commissions/${id}`, { method: "PATCH", body: data }),
  updatePromotion: (id, data) => request(`/admin/promotions/${id}`, { method: "PATCH", body: data }),
  updateTicket: (id, data) => request(`/admin/tickets/${id}`, { method: "PATCH", body: data }),
  updateRefund: (id, data) => request(`/admin/refunds/${id}`, { method: "PATCH", body: data }),
};
