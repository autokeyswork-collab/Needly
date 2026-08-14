import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { VendorAPI, OrderAPI, DisputeAPI, normalizeOrder } from "../api/client";
import { connectSocket } from "../api/socket";
import { useAuth } from "./AuthContext";

const OrdersContext = createContext(null);

/**
 * Real backend-backed replacement for the old local-state OrdersContext.
 * Every mutation calls the API and then refetches the affected lists —
 * simple and easy to reason about, at the cost of an extra round trip per
 * action. Fine for a pilot's traffic; worth revisiting with optimistic
 * updates once there's real usage to justify the complexity.
 */
export function OrdersProvider({ children }) {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]); // flat list: customer/vendor/manager/admin
  const [riderData, setRiderData] = useState({ available: [], assigned: [], completedToday: [] });
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshVendors = useCallback(async () => {
    try {
      setVendors(await VendorAPI.list());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!user) return;
    try {
      const data = await OrderAPI.mine();
      if (user.role === "RIDER") {
        setRiderData({
          available: (data.available || []).map(normalizeOrder),
          assigned: (data.assigned || []).map(normalizeOrder),
          completedToday: (data.completedToday || []).map(normalizeOrder),
        });
      } else {
        setOrders((Array.isArray(data) ? data : []).map(normalizeOrder));
      }
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const refreshDisputes = useCallback(async () => {
    if (!user || !["VENDOR", "MANAGER", "ADMIN"].includes(user.role)) return;
    try {
      setDisputes(await DisputeAPI.list());
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshVendors(), refreshOrders(), refreshDisputes()]);
    setLoading(false);
  }, [refreshVendors, refreshOrders, refreshDisputes]);

  // Initial load + reload whenever who's logged in changes.
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // Real-time: any order update or new dispatch broadcast triggers a
  // refetch. Coarse-grained on purpose — see note above the provider.
  useEffect(() => {
    if (!user) return;
    let socket;
    let mounted = true;
    (async () => {
      socket = await connectSocket();
      if (!socket || !mounted) return;
      socket.on("order:updated", refreshOrders);
      socket.on("order:available", refreshOrders);
    })();
    return () => {
      mounted = false;
      if (socket) {
        socket.off("order:updated", refreshOrders);
        socket.off("order:available", refreshOrders);
      }
    };
  }, [user, refreshOrders]);

  // Fallback poll — covers the gap for screens that don't explicitly
  // watch a specific order room (see TrackingScreen for the one that does).
  const pollRef = useRef();
  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(refreshOrders, 20000);
    return () => clearInterval(pollRef.current);
  }, [user, refreshOrders]);

  /* --- Mutations --- */

  const placeOrder = useCallback(async (vendorId, items, deliveryAddress, deliveryPhone) => {
    const order = await OrderAPI.place({ vendorId, items, deliveryAddress, deliveryPhone });
    await refreshOrders();
    return order.id;
  }, [refreshOrders]);

  const advanceOrder = useCallback(async (orderId) => {
    await OrderAPI.advance(orderId);
    await refreshOrders();
  }, [refreshOrders]);

  const claimOrder = useCallback(async (orderId) => {
    await OrderAPI.claim(orderId);
    await refreshOrders();
  }, [refreshOrders]);

  const cancelOrder = useCallback(async (orderId, reason) => {
    await OrderAPI.cancel(orderId, reason);
    await refreshOrders();
  }, [refreshOrders]);

  const unassignRider = useCallback(async (orderId) => {
    await OrderAPI.unassign(orderId);
    await refreshOrders();
  }, [refreshOrders]);

  const raiseDispute = useCallback(async (order, reason) => {
    await DisputeAPI.raise(order.id, reason);
    await Promise.all([refreshOrders(), refreshDisputes()]);
  }, [refreshOrders, refreshDisputes]);

  const resolveDispute = useCallback(async (disputeId) => {
    await DisputeAPI.resolve(disputeId);
    await refreshDisputes();
  }, [refreshDisputes]);

  const updatePrice = useCallback(async (vendorId, productId, price) => {
    await VendorAPI.updateProduct(vendorId, productId, { price });
    await refreshVendors();
  }, [refreshVendors]);

  const addProduct = useCallback(async (vendorId, product) => {
    await VendorAPI.addProduct(vendorId, product);
    await refreshVendors();
  }, [refreshVendors]);

  const addAddOn = useCallback(async (vendorId, productId, addOn) => {
    await VendorAPI.addAddOn(vendorId, productId, addOn);
    await refreshVendors();
  }, [refreshVendors]);

  const removeAddOn = useCallback(async (vendorId, productId, addOnId) => {
    await VendorAPI.removeAddOn(vendorId, productId, addOnId);
    await refreshVendors();
  }, [refreshVendors]);

  const toggleProductAvailable = useCallback(async (vendorId, productId) => {
    await VendorAPI.toggleAvailable(vendorId, productId);
    await refreshVendors();
  }, [refreshVendors]);

  const toggleVendorOpen = useCallback(async (vendorId) => {
    await VendorAPI.toggleOpen(vendorId);
    await refreshVendors();
  }, [refreshVendors]);

  return (
    <OrdersContext.Provider value={{
      loading, error,
      vendors, refreshVendors,
      orders, riderData, refreshOrders,
      disputes, refreshDisputes,
      placeOrder, advanceOrder, claimOrder, cancelOrder, unassignRider,
      raiseDispute, resolveDispute,
      updatePrice, addProduct, addAddOn, removeAddOn, toggleProductAvailable, toggleVendorOpen,
      refresh,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrdersContext);
}
