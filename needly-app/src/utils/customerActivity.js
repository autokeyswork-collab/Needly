import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREFIX = "needly_customer_activity_v1";

function storageKey(userId) {
  return `${PREFIX}:${userId || "guest"}`;
}

function emptyActivity() {
  return {
    draftCarts: {},
    checkoutDrafts: {},
    updatedAt: null,
  };
}

async function readRaw(key) {
  if (Platform.OS === "web") return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeRaw(key, value) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function loadCustomerActivity(userId) {
  if (!userId) return emptyActivity();
  try {
    const raw = await readRaw(storageKey(userId));
    if (!raw) return emptyActivity();
    const parsed = JSON.parse(raw);
    return {
      ...emptyActivity(),
      ...parsed,
      draftCarts: parsed?.draftCarts || {},
      checkoutDrafts: parsed?.checkoutDrafts || {},
    };
  } catch (_) {
    return emptyActivity();
  }
}

export async function saveCustomerActivity(userId, activity) {
  if (!userId) return emptyActivity();
  const next = {
    ...emptyActivity(),
    ...activity,
    updatedAt: new Date().toISOString(),
  };
  await writeRaw(storageKey(userId), JSON.stringify(next));
  return next;
}

export function countDraftCartItems(activity) {
  return Object.values(activity?.draftCarts || {}).reduce((sum, cart) => (
    sum + Object.values(cart || {}).reduce((inner, qty) => inner + Math.max(0, Number(qty) || 0), 0)
  ), 0);
}
