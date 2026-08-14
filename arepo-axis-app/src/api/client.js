import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Point this at your deployed backend. For local dev against an Expo Go
// device/simulator on the same network, use your machine's LAN IP, not
// "localhost" (the phone can't resolve your laptop's localhost).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

const TOKEN_KEY = "route_auth_token";

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
    vendor: o.vendor ? { id: o.vendor.id, name: o.vendor.name, area: o.vendor.area, category: o.vendor.category, emoji: o.vendor.emoji, eta: o.vendor.eta, rating: o.vendor.rating } : { id: o.vendorId },
    items: (o.items || []).map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji })),
    riderId: o.riderId || o.rider?.id || null,
    riderName: o.rider?.user?.name || null,
    customerName: o.customer?.name || null,
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

/* --- Auth --- */
export const AuthAPI = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),
  registerPushToken: (expoPushToken) => request("/auth/me/push-token", { method: "PATCH", body: { expoPushToken } }),
  pendingApprovals: () => request("/auth/pending"),
  approveUser: (id) => request(`/auth/users/${id}/approve`, { method: "PATCH" }),
  suspendUser: (id) => request(`/auth/users/${id}/suspend`, { method: "PATCH" }),
  // Generic — edits a person's name/phone regardless of role (rider, vendor owner, manager).
  editContact: (userId, { name, phone }) => request(`/auth/users/${userId}/contact`, { method: "PATCH", body: { name, phone } }),
};

/* --- Vendors / products --- */
export const VendorAPI = {
  list: async (category) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const data = await request(`/vendors${qs}`, { auth: false });
    return data.map(normalizeVendor);
  },
  get: async (id) => normalizeVendor(await request(`/vendors/${id}`, { auth: false })),
  // Admin-only: includes owner/manager contact info the public list never
  // exposes. Mirrors the "Vendors" management section in the web prototype.
  adminList: () => request("/vendors/admin/all"),
  adminEditProfile: (vendorId, fields) => request(`/vendors/${vendorId}/admin-edit`, { method: "PATCH", body: fields }),
  setVerification: (vendorId, fields) => request(`/vendors/${vendorId}/verification`, { method: "PATCH", body: fields }),
  stats: () => request("/vendors/me/stats"),
  toggleOpen: (vendorId) => request(`/vendors/${vendorId}/open`, { method: "PATCH" }),
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
  place: async ({ vendorId, items, deliveryAddress, deliveryPhone }) =>
    normalizeOrder(await request("/orders", { method: "POST", body: { vendorId, items, deliveryAddress, deliveryPhone } })),
  mine: (filters) => {
    const qs = filters ? `?${new URLSearchParams(filters).toString()}` : "";
    return request(`/orders/mine${qs}`);
  },
  advance: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/status`, { method: "PATCH" })),
  claim: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/claim`, { method: "POST" })),
  cancel: async (orderId, reason) => normalizeOrder(await request(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } })),
  // Admin-only: releases a stuck order's rider back to the available pool.
  unassign: async (orderId) => normalizeOrder(await request(`/orders/${orderId}/unassign`, { method: "POST" })),
};

/* --- Rider --- */
export const RiderAPI = {
  stats: () => request("/riders/me/stats"),
  toggleOnline: () => request("/riders/me/online", { method: "PATCH" }),
  // Admin-only roster — didn't exist anywhere until this pass.
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

/* --- Disputes --- */
export const DisputeAPI = {
  raise: (orderId, reason) => request("/disputes", { method: "POST", body: { orderId, reason } }),
  list: async () => (await request("/disputes")).map(normalizeDispute),
  resolve: (disputeId) => request(`/disputes/${disputeId}/resolve`, { method: "PATCH" }),
};
