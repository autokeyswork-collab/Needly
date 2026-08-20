import React, { createContext, useContext } from "react";
import { useOrders } from "./OrdersContext";

/**
 * BookingsContext — thin wrapper that delegates to OrdersContext.
 *
 * Previously this maintained a completely local-state bookings array
 * (lost on page refresh, invisible to other users).  Now it proxies
 * to OrdersContext which talks to the real backend via BookingAPI.
 */
const BookingsContext = createContext(null);

export function BookingsProvider({ children }) {
  const ordersCtx = useOrders();

  const value = {
    bookings: ordersCtx?.bookings || [],
    createBooking: ordersCtx?.createBooking || (() => {}),
    advanceBookingStatus: ordersCtx?.advanceBookingStatus || (() => {}),
    cancelBooking: ordersCtx?.cancelBooking || (() => {}),
  };

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  return useContext(BookingsContext);
}
