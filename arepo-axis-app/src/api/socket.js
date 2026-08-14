import { io } from "socket.io-client";
import { API_BASE_URL, getToken } from "./client";

let socket = null;

/**
 * Connects (once) with the current JWT and returns the socket instance.
 * Backend rooms: `order:<id>` for a specific order's live updates, and
 * `riders:online` which every connected rider auto-joins for dispatch
 * broadcasts — see the backend's src/sockets/orderSocket.js.
 */
export async function connectSocket() {
  if (socket?.connected) return socket;
  const token = await getToken();
  if (!token) return null;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket"],
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
