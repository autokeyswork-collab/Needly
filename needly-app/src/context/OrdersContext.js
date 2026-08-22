import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { VendorAPI, OrderAPI, DisputeAPI, BookingAPI, NotificationAPI, PaymentAPI, normalizeOrder } from "../api/client";
import { connectSocket, subscribeToRealtimeEvents } from "../api/socket";
import { useAuth } from "./AuthContext";
import { countDraftCartItems, loadCustomerActivity, saveCustomerActivity } from "../utils/customerActivity";

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [riderData, setRiderData] = useState({ available: [], assigned: [], completedToday: [] });
  const [disputes, setDisputes] = useState([]);
  const [customerActivity, setCustomerActivity] = useState({ draftCarts: {}, checkoutDrafts: {}, updatedAt: null });
  const [customerActivityLoaded, setCustomerActivityLoaded] = useState(false);
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

  const refreshBookings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await BookingAPI.mine();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await NotificationAPI.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const markNotificationRead = useCallback(async (id) => {
    if (!id) return;
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
    await NotificationAPI.markRead(id);
    await refreshNotifications();
  }, [refreshNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    await NotificationAPI.markAllRead();
    await refreshNotifications();
  }, [refreshNotifications]);

  const refreshDisputes = useCallback(async () => {
    if (!user || !["VENDOR", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) return;
    try {
      setDisputes(await DisputeAPI.list());
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshVendors(),
      refreshOrders(),
      refreshBookings(),
      refreshNotifications(),
      refreshDisputes(),
    ]);
    setLoading(false);
  }, [refreshVendors, refreshOrders, refreshBookings, refreshNotifications, refreshDisputes]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  useEffect(() => {
    let mounted = true;
    if (!user || user.role !== "CUSTOMER") {
      setCustomerActivity({ draftCarts: {}, checkoutDrafts: {}, updatedAt: null });
      setCustomerActivityLoaded(false);
      return () => { mounted = false; };
    }
    setCustomerActivityLoaded(false);
    loadCustomerActivity(user.id).then((activity) => {
      if (mounted) {
        setCustomerActivity(activity);
        setCustomerActivityLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [user]);

  // Universal Socket.io real-time event listeners
  useEffect(() => {
    if (!user) return;
    let cleanupSocket;
    (async () => {
      await connectSocket();
      cleanupSocket = subscribeToRealtimeEvents({
        onOrderUpdate: refreshOrders,
        onOrderAvailable: refreshOrders,
        onBookingUpdate: refreshBookings,
        onProviderStatus: refreshVendors,
        onInventoryUpdate: refreshVendors,
        onNotification: refreshNotifications,
        onAdminAlert: refresh,
      });
    })();

    return () => {
      if (cleanupSocket) cleanupSocket();
    };
  }, [user, refreshOrders, refreshBookings, refreshVendors, refreshNotifications, refresh]);

  const pollRef = useRef();
  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(refresh, 25000);
    return () => clearInterval(pollRef.current);
  }, [user, refresh]);

  /* --- Order Mutations --- */

  const placeOrder = useCallback(async (vendorId, items, deliveryAddress, deliveryPhone, deliveryLocation) => {
    const order = await OrderAPI.place({
      vendorId,
      items,
      deliveryAddress,
      deliveryPhone,
      deliveryLatitude: deliveryLocation?.latitude,
      deliveryLongitude: deliveryLocation?.longitude,
    });
    await refreshOrders();
    await refreshVendors();
    return order.id;
  }, [refreshOrders, refreshVendors]);

  const persistCustomerActivity = useCallback((updater) => {
    if (!user?.id || user.role !== "CUSTOMER" || !customerActivityLoaded) return;
    setCustomerActivity((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveCustomerActivity(user.id, next).catch(() => {});
      return next;
    });
  }, [customerActivityLoaded, user]);

  const saveDraftCart = useCallback((vendorId, cart) => {
    if (!vendorId) return;
    const cleanCart = Object.fromEntries(
      Object.entries(cart || {}).filter(([, qty]) => Number(qty) > 0)
    );
    persistCustomerActivity((current) => {
      const nextCarts = { ...(current.draftCarts || {}) };
      if (Object.keys(cleanCart).length) {
        nextCarts[vendorId] = cleanCart;
      } else {
        delete nextCarts[vendorId];
      }
      return { ...current, draftCarts: nextCarts };
    });
  }, [persistCustomerActivity]);

  const clearDraftCart = useCallback((vendorId) => {
    if (!vendorId) return;
    persistCustomerActivity((current) => {
      const nextCarts = { ...(current.draftCarts || {}) };
      delete nextCarts[vendorId];
      return { ...current, draftCarts: nextCarts };
    });
  }, [persistCustomerActivity]);

  const saveCheckoutDraft = useCallback((vendorId, draft) => {
    if (!vendorId) return;
    persistCustomerActivity((current) => ({
      ...current,
      checkoutDrafts: {
        ...(current.checkoutDrafts || {}),
        [vendorId]: {
          ...(current.checkoutDrafts?.[vendorId] || {}),
          ...draft,
        },
      },
    }));
  }, [persistCustomerActivity]);

  const clearCheckoutDraft = useCallback((vendorId) => {
    if (!vendorId) return;
    persistCustomerActivity((current) => {
      const nextDrafts = { ...(current.checkoutDrafts || {}) };
      delete nextDrafts[vendorId];
      return { ...current, checkoutDrafts: nextDrafts };
    });
  }, [persistCustomerActivity]);

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

  const confirmVendorPaymentReceived = useCallback(async (orderId) => {
    await PaymentAPI.confirmVendorReceived(orderId);
    await Promise.all([refreshOrders(), refreshNotifications()]);
  }, [refreshOrders, refreshNotifications]);

  /* --- Booking Mutations --- */

  const createBooking = useCallback(async (bookingData) => {
    const res = await BookingAPI.create(bookingData);
    await refreshBookings();
    return res;
  }, [refreshBookings]);

  const advanceBookingStatus = useCallback(async (bookingId, status) => {
    await BookingAPI.updateStatus(bookingId, status);
    await refreshBookings();
  }, [refreshBookings]);

  const cancelBooking = useCallback(async (bookingId, reason) => {
    await BookingAPI.cancel(bookingId, reason);
    await refreshBookings();
  }, [refreshBookings]);

  /* --- Disputes & Inventory --- */

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

  const updateProductDetails = useCallback(async (vendorId, productId, patch) => {
    await VendorAPI.updateProduct(vendorId, productId, patch);
    await refreshVendors();
  }, [refreshVendors]);

  const addProduct = useCallback(async (vendorId, product) => {
    await VendorAPI.addProduct(vendorId, product);
    await refreshVendors();
  }, [refreshVendors]);

  const updateVendorBankAccount = useCallback(async (vendorId, bank) => {
    await VendorAPI.setBankAccount(vendorId, bank);
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
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== vendorId) return v;
        const items = (v.items || []).map((i) =>
          i.id === productId ? { ...i, isAvailable: i.isAvailable === false ? true : false } : i
        );
        return { ...v, items };
      })
    );
    try {
      await VendorAPI.toggleAvailable(vendorId, productId);
      await refreshVendors();
    } catch (err) {}
  }, [refreshVendors]);

  const toggleVendorOpen = useCallback(async (vendorId) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, isOpen: !v.isOpen } : v))
    );
    try {
      await VendorAPI.toggleOpen(vendorId);
      await refreshVendors();
    } catch (err) {}
  }, [refreshVendors]);

  return (
    <OrdersContext.Provider value={{
      loading, error,
      vendors, refreshVendors,
      orders, riderData, refreshOrders,
      bookings, refreshBookings, createBooking, advanceBookingStatus, cancelBooking,
      notifications, refreshNotifications, markNotificationRead, markAllNotificationsRead,
      customerActivity, customerActivityLoaded, draftCartCount: countDraftCartItems(customerActivity),
      saveDraftCart, clearDraftCart, saveCheckoutDraft, clearCheckoutDraft,
      disputes, refreshDisputes,
      placeOrder, advanceOrder, claimOrder, cancelOrder, unassignRider, confirmVendorPaymentReceived,
      raiseDispute, resolveDispute,
      updatePrice, updateProductDetails, addProduct, updateVendorBankAccount, addAddOn, removeAddOn, toggleProductAvailable, toggleVendorOpen,
      refresh,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrdersContext);
}
