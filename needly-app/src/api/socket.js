import { io } from "socket.io-client";
import { API_BASE_URL, getToken } from "./client";

let socket = null;

export async function connectSocket() {
  if (socket?.connected) return socket;
  const token = await getToken();
  if (!token) return null;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function subscribeToRealtimeEvents(listeners = {}) {
  if (!socket) return () => {};

  if (listeners.onOrderUpdate) socket.on("order:updated", listeners.onOrderUpdate);
  if (listeners.onOrderAvailable) socket.on("order:available", listeners.onOrderAvailable);
  if (listeners.onBookingUpdate) socket.on("booking:updated", listeners.onBookingUpdate);
  if (listeners.onProviderStatus) socket.on("provider:status", listeners.onProviderStatus);
  if (listeners.onInventoryUpdate) socket.on("inventory:updated", listeners.onInventoryUpdate);
  if (listeners.onNotification) socket.on("notification:created", listeners.onNotification);
  if (listeners.onAdminAlert) socket.on("admin:alert", listeners.onAdminAlert);

  return () => {
    if (!socket) return;
    if (listeners.onOrderUpdate) socket.off("order:updated", listeners.onOrderUpdate);
    if (listeners.onOrderAvailable) socket.off("order:available", listeners.onOrderAvailable);
    if (listeners.onBookingUpdate) socket.off("booking:updated", listeners.onBookingUpdate);
    if (listeners.onProviderStatus) socket.off("provider:status", listeners.onProviderStatus);
    if (listeners.onInventoryUpdate) socket.off("inventory:updated", listeners.onInventoryUpdate);
    if (listeners.onNotification) socket.off("notification:created", listeners.onNotification);
    if (listeners.onAdminAlert) socket.off("admin:alert", listeners.onAdminAlert);
  };
}
