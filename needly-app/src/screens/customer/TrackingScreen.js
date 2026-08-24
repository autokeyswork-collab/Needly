import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { STATUS_FLOW, STATUS_LABEL } from "../../data/appConstants";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../api/socket";
import { PaymentAPI, ReviewAPI } from "../../api/client";
import StarRating from "../../components/StarRating";
import CustomerBottomNav from "../../components/CustomerBottomNav";

const DISPUTE_REASONS = ["Missing item", "Wrong item", "Item damaged", "Arrived late", "Other"];
const ABEOKUTA_CENTER = { latitude: 7.1475, longitude: 3.3619 };
const ABEOKUTA_BOUNDS = {
  minLat: 7.08,
  maxLat: 7.24,
  minLng: 3.25,
  maxLng: 3.47,
};

function hasCoords(point) {
  return Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));
}

function lerp(start, end, ratio) {
  if (!hasCoords(start) || !hasCoords(end)) return null;
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * ratio,
    longitude: start.longitude + (end.longitude - start.longitude) * ratio,
  };
}

function distanceKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const earthRadiusKm = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLng = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function buildTrackingPoints(order) {
  const vendor = hasCoords(order.vendor)
    ? { latitude: order.vendor.latitude, longitude: order.vendor.longitude }
    : ABEOKUTA_CENTER;
  const customer = hasCoords({ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude })
    ? { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }
    : null;
  const riderReported = hasCoords({ latitude: order.riderLatitude, longitude: order.riderLongitude })
    ? { latitude: order.riderLatitude, longitude: order.riderLongitude }
    : null;
  const simulatedRider = order.status === "PICKED_UP" && customer
    ? lerp(vendor, customer, 0.58)
    : order.riderName
      ? lerp(ABEOKUTA_CENTER, vendor, 0.72)
      : null;
  return { vendor, customer, rider: riderReported || simulatedRider };
}

function markerPosition(point, bounds) {
  if (!hasCoords(point)) return { left: "50%", top: "50%" };
  const x = ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - ((point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100;
  return {
    left: `${Math.max(8, Math.min(92, x))}%`,
    top: `${Math.max(10, Math.min(90, y))}%`,
  };
}

function inAbeokuta(point) {
  if (!hasCoords(point)) return false;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  return latitude >= ABEOKUTA_BOUNDS.minLat
    && latitude <= ABEOKUTA_BOUNDS.maxLat
    && longitude >= ABEOKUTA_BOUNDS.minLng
    && longitude <= ABEOKUTA_BOUNDS.maxLng;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function TrackingMap({ order }) {
  const rawPoints = buildTrackingPoints(order);
  const points = {
    vendor: inAbeokuta(rawPoints.vendor) ? rawPoints.vendor : ABEOKUTA_CENTER,
    customer: inAbeokuta(rawPoints.customer) ? rawPoints.customer : null,
    rider: inAbeokuta(rawPoints.rider) ? rawPoints.rider : null,
  };
  const bounds = ABEOKUTA_BOUNDS;
  const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
  const center = points.customer || points.vendor || ABEOKUTA_CENTER;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${center.latitude},${center.longitude}`;
  const riderDistance = points.rider && points.customer ? distanceKm(points.rider, points.customer) : null;
  const destination = points.customer || points.vendor;

  const openDirections = () => {
    if (!hasCoords(points.rider) || !hasCoords(destination)) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=${points.rider.latitude},${points.rider.longitude}&destination=${destination.latitude},${destination.longitude}`,
    );
  };

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapTitle}>Live geo tracking</Text>
          <Text style={styles.mapSubtitle}>Abeokuta service area only</Text>
        </View>
        <Pressable disabled={!hasCoords(points.rider)} onPress={openDirections} style={[styles.mapBtn, !hasCoords(points.rider) && { opacity: 0.45 }]}>
          <Text style={styles.mapBtnText}>Open map</Text>
        </Pressable>
      </View>
      <View style={styles.mapCanvas}>
        {Platform.OS === "web" ? (
          React.createElement("iframe", {
            title: "Needly order tracking map",
            src: osmUrl,
            loading: "lazy",
            referrerPolicy: "no-referrer-when-downgrade",
            style: { border: 0, width: "100%", height: "100%" },
          })
        ) : (
          <Pressable onPress={openDirections} style={styles.nativeMapFallback}>
            <Text style={styles.nativeMapTitle}>Open real map</Text>
            <Text style={styles.nativeMapSub}>View this delivery route in your map app.</Text>
          </Pressable>
        )}
        <View style={[styles.marker, styles.vendorMarker, markerPosition(points.vendor, bounds)]}><Text style={styles.markerText}>V</Text></View>
        {points.customer && (
          <View style={[styles.marker, styles.customerMarker, markerPosition(points.customer, bounds)]}><Text style={styles.markerText}>C</Text></View>
        )}
        {points.rider && (
          <View style={[styles.marker, styles.riderMarker, markerPosition(points.rider, bounds)]}><Text style={styles.markerText}>R</Text></View>
        )}
        <View style={styles.mapAttribution}><Text style={styles.mapAttributionText}>© OpenStreetMap</Text></View>
      </View>
      <View style={styles.geoRows}>
        <Text style={styles.geoLine}>Vendor: {order.vendor?.address || order.vendor?.area || "Abeokuta"} · {points.vendor.latitude.toFixed(5)}, {points.vendor.longitude.toFixed(5)}</Text>
        <Text style={styles.geoLine}>Customer: {points.customer ? `${points.customer.latitude.toFixed(5)}, ${points.customer.longitude.toFixed(5)}` : "GPS not attached inside Abeokuta"}</Text>
        <Text style={styles.geoLine}>Rider: {points.rider ? `${points.rider.latitude.toFixed(5)}, ${points.rider.longitude.toFixed(5)}${riderDistance ? ` · ${riderDistance.toFixed(1)} km away` : ""}` : "Not assigned yet"}</Text>
      </View>
    </View>
  );
}

export default function TrackingScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;
  const paymentReference = route?.params?.paymentReference;
  const { orders = [], loading, refreshOrders, raiseDispute } = useOrders();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const order = orders.find((o) => o.id === orderId);
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const [reportOpen, setReportOpen] = useState(false);
  const [payingAgain, setPayingAgain] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paymentEmail, setPaymentEmail] = useState(user?.email || "");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [vendorStars, setVendorStars] = useState(0);
  const [riderStars, setRiderStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Watch this specific order's room for instant pushes while this screen
  // is open, on top of the context's coarser fallback poll/refresh.
  useEffect(() => {
    if (!orderId) return undefined;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("order:watch", orderId);
    const onUpdate = () => refreshOrders();
    socket.on("order:updated", onUpdate);
    return () => {
      socket.emit("order:unwatch", orderId);
      socket.off("order:updated", onUpdate);
    };
  }, [orderId, refreshOrders]);

  useEffect(() => {
    const reference = paymentReference || order?.paymentReference;
    if (!reference || order?.paymentStatus === "paid") return;
    let active = true;
    setVerifyingPayment(true);
    PaymentAPI.verify(reference)
      .then(() => refreshOrders())
      .catch((err) => setPayError(err.message || "Payment verification failed. Please try again."))
      .finally(() => { if (active) setVerifyingPayment(false); });
    return () => { active = false; };
  }, [paymentReference, order?.paymentReference, order?.paymentStatus, refreshOrders]);

  if (!orderId) {
    return (
      <View style={styles.statePage}>
        <Text style={styles.stateTitle}>Order not found</Text>
        <Text style={styles.stateText}>This delivery link is missing its order reference.</Text>
        <Pressable onPress={() => navigation.navigate("CustomerOrders")} style={styles.stateBtn}>
          <Text style={styles.stateBtnText}>Back to orders</Text>
        </Pressable>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.statePage}>
        <Text style={styles.stateTitle}>{loading ? "Loading delivery" : "Order not found"}</Text>
        <Text style={styles.stateText}>
          {loading ? "Getting the latest order details." : "This order may have been removed or is not linked to this account."}
        </Text>
        <Pressable onPress={() => navigation.navigate("CustomerOrders")} style={styles.stateBtn}>
          <Text style={styles.stateBtnText}>Back to orders</Text>
        </Pressable>
      </View>
    );
  }

  const awaitingPayment = order.status === "placed" && order.paymentStatus !== "paid";

  const retryPayment = async () => {
    const cleanPaymentEmail = paymentEmail.trim().toLowerCase();
    if (!isValidEmail(cleanPaymentEmail)) {
      setPayError("Enter a valid email address for Paystack.");
      return;
    }
    setPayingAgain(true);
    setPayError(null);
    try {
      const { authorizationUrl } = await PaymentAPI.initialize(order.id, null, cleanPaymentEmail);
      if (!/^https?:\/\//i.test(String(authorizationUrl || ""))) {
        throw new Error("Payment link was not created. Please try from your cart again.");
      }
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(authorizationUrl);
        return;
      }
      await Linking.openURL(authorizationUrl);
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPayingAgain(false);
    }
  };

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const existingDispute = order.dispute;

  const submitReview = async () => {
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await ReviewAPI.submit(order.id, vendorStars, order.riderId ? riderStars || null : null, reviewComment.trim() || null);
      await refreshOrders();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Pressable style={styles.backCircle} onPress={() => navigation.navigate("CustomerOrders")}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <View style={[styles.paymentMini, order.paymentStatus === "paid" && styles.paymentMiniPaid]}>
                <Text style={[styles.paymentMiniText, order.paymentStatus === "paid" && styles.paymentMiniTextPaid]}>
                  {order.paymentStatus === "paid" ? "Paid" : verifyingPayment ? "Verifying" : "Pending"}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>Track order</Text>
            <Text style={styles.subtitle}>#{order.id.slice(-6)} · {order.vendor?.name || "Needly vendor"}</Text>
            <View style={styles.heroTotalRow}>
              <Text style={styles.heroTotalLabel}>Total paid</Text>
              <Text style={styles.heroTotal}>{fmtNaira(order.customerPaidAmount || order.total)}</Text>
            </View>
          </View>
          {order.deliveryAddress && (
            <Text style={styles.address}>{"\uD83D\uDCCD"} {order.deliveryAddress}</Text>
          )}

      <View style={{ marginTop: 14 }}>
        {order.status === "cancelled" ? (
          <View style={styles.cancelledBox}>
            <Text style={{ fontWeight: "700", fontSize: 14.5, marginBottom: 6 }}>
              {order.cancelReason ? `${order.vendor?.name || "This vendor"} couldn't take your order` : "Order cancelled"}
            </Text>
            {order.cancelReason && (
              <Text style={{ fontSize: 13, color: COLORS.ink, marginBottom: 6 }}>{order.cancelReason} {"\u2014"} sorry about that!</Text>
            )}
            {order.paymentStatus === "refunded" ? (
              <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>
                Your payment of {fmtNaira(order.total)} has been refunded.
              </Text>
            ) : order.paymentStatus === "paid" ? (
              // Real edge case, not hypothetical: if the refund call to
              // Paystack itself fails, the order still ends up cancelled
              // but the payment stays "paid," not "refunded" (see the
              // backend's cancel route). Claiming a refund happened here
              // would be false reassurance; staying silent would be worse.
              <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>
                This order was cancelled. If you were charged {fmtNaira(order.total)}, contact support {"\u2014"} your refund is still processing.
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>This order was cancelled before payment.</Text>
            )}
            <Pressable onPress={() => navigation.navigate("Browse")} style={styles.tryAgainBtn}>
              <Text style={styles.tryAgainBtnText}>Try another vendor {"\u2192"}</Text>
            </Pressable>
          </View>
        ) : awaitingPayment ? (
          <View style={styles.paymentBox}>
            <Text style={{ fontWeight: "800", fontSize: 14.5, marginBottom: 6 }}>{verifyingPayment ? "Confirming your payment" : "Awaiting payment"}</Text>
            <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>
              {verifyingPayment
                ? "Flutterwave or Paystack says your payment is being checked. This page will update when the backend confirms it."
                : "Your order is saved but won't reach the vendor until payment is confirmed. If the payment page didn't open or you closed it, tap below to try again."}
            </Text>
            <Text style={styles.retryLabel}>Payment email</Text>
            <TextInput
              value={paymentEmail}
              onChangeText={setPaymentEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.retryEmailInput, !isValidEmail(paymentEmail) && paymentEmail.trim() && styles.retryEmailInvalid]}
            />
            {!isValidEmail(paymentEmail) && (
              <Text style={{ color: COLORS.chili, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Enter a valid email for Paystack.</Text>
            )}
            <Pressable onPress={retryPayment} disabled={payingAgain || verifyingPayment || !isValidEmail(paymentEmail)} style={[styles.payBtn, (!isValidEmail(paymentEmail) || payingAgain || verifyingPayment) && styles.payBtnDisabled]}>
              <Text style={styles.payBtnText}>{payingAgain ? "Opening\u2026" : "Complete payment"}</Text>
            </Pressable>
            {payError && <Text style={{ color: COLORS.chili, fontSize: 12.5, marginTop: 8 }}>{payError}</Text>}
          </View>
        ) : (
          STATUS_FLOW.map((s, idx) => {
            const done = idx <= currentIdx;
            return (
              <View key={s} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={[styles.dot, { backgroundColor: done ? COLORS.green : COLORS.line }]} />
                  {idx < STATUS_FLOW.length - 1 && (
                    <View style={[styles.connector, { backgroundColor: done ? COLORS.green : COLORS.line }]} />
                  )}
                </View>
                <Text style={[styles.stepText, { fontWeight: done ? "700" : "500", color: done ? COLORS.ink : COLORS.mute }]}>
                  {STATUS_LABEL[s]}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {order.status !== "cancelled" && <TrackingMap order={order} />}

      {order.riderName && (
        <View style={styles.riderBox}>
          <Text style={{ fontSize: 13.5 }}>Rider assigned: <Text style={{ fontWeight: "700" }}>{order.riderName}</Text></Text>
        </View>
      )}

      {order.status === "delivered" && (
        <View style={{ marginBottom: 16 }}>
          {order.review ? (
            <View style={styles.reviewThanksBox}>
              <Text style={{ fontSize: 13.5 }}>
                Thanks for your feedback! You rated {order.vendor?.name || "this vendor"} {order.review.vendorRating}{"\u2605"}
                {order.review.riderRating ? ` and your rider ${order.review.riderRating}\u2605` : ""}.
              </Text>
            </View>
          ) : (
            <View style={styles.reviewBox}>
              <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 10 }}>Rate your order</Text>
              <Text style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 6 }}>{order.vendor?.name || "Needly vendor"}</Text>
              <StarRating value={vendorStars} onChange={setVendorStars} />
              {order.riderId && (
                <>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 12, marginBottom: 6 }}>
                    Your rider{order.riderName ? `, ${order.riderName}` : ""}
                  </Text>
                  <StarRating value={riderStars} onChange={setRiderStars} />
                </>
              )}
              <TextInput
                value={reviewComment} onChangeText={setReviewComment}
                placeholder="Anything you'd like to add? (optional)" multiline numberOfLines={2}
                style={[styles.commentInput, { marginTop: 12 }]}
              />
              <Pressable
                onPress={submitReview} disabled={vendorStars === 0 || submittingReview}
                style={[styles.submitReviewBtn, (vendorStars === 0 || submittingReview) && { opacity: 0.4 }]}
              >
                <Text style={styles.submitReviewBtnText}>{submittingReview ? "Submitting\u2026" : "Submit rating"}</Text>
              </Pressable>
              {reviewError && <Text style={{ color: COLORS.chili, fontSize: 12.5, marginTop: 8 }}>{reviewError}</Text>}
            </View>
          )}
        </View>
      )}

      {order.status === "delivered" && (
        <View style={{ marginBottom: 8 }}>
          {existingDispute ? (
            <View style={styles.disputeBox}>
              <Text style={{ fontSize: 13.5 }}>
                Issue reported: <Text style={{ fontWeight: "700" }}>{existingDispute.reason}</Text> {"\u2014"} our team is looking into it.
              </Text>
            </View>
          ) : reportOpen ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: COLORS.mute }}>What went wrong?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DISPUTE_REASONS.map((reason) => (
                  <Pressable key={reason} onPress={() => raiseDispute(order, reason)} style={styles.reasonChip}>
                    <Text style={styles.reasonChipText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setReportOpen(true)} style={styles.reportBtn}>
              <Text style={styles.reportBtnText}>Report an issue</Text>
            </Pressable>
          )}
        </View>
      )}

          <Pressable onPress={() => navigation.popToTop()} style={styles.shopMoreBtn}>
            <Text style={styles.shopMoreText}>{"\u2190"} Order something else</Text>
          </Pressable>
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="CustomerOrders" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statePage: { flex: 1, backgroundColor: COLORS.paper, alignItems: "center", justifyContent: "center", padding: 22 },
  stateTitle: { color: COLORS.ink, fontSize: 19, fontWeight: "800", textAlign: "center" },
  stateText: { color: COLORS.mute, fontSize: 13.5, lineHeight: 19, textAlign: "center", marginTop: 7, marginBottom: 16 },
  stateBtn: { borderRadius: 20, backgroundColor: COLORS.indigo, paddingHorizontal: 18, paddingVertical: 11 },
  stateBtnText: { color: "#fff", fontSize: 13.5, fontWeight: "800" },
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#FFFFFF", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 124 },
  hero: { borderRadius: 28, padding: 16, backgroundColor: "#35109B", marginBottom: 14, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 31, lineHeight: 31, fontWeight: "800" },
  paymentMini: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#FEF3C7" },
  paymentMiniPaid: { backgroundColor: "#DCFCE7" },
  paymentMiniText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  paymentMiniTextPaid: { color: "#10B981" },
  title: { fontWeight: "900", fontSize: 30, color: "#FFFFFF" },
  subtitle: { fontSize: 13.5, color: "rgba(255,255,255,0.82)", marginTop: 4, fontWeight: "700" },
  heroTotalRow: { marginTop: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", padding: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTotalLabel: { color: "rgba(255,255,255,0.74)", fontSize: 11, fontWeight: "900" },
  heroTotal: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  address: { fontSize: 12.5, color: "#777991", marginBottom: 6, fontWeight: "700" },
  paymentBox: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F59E0B", borderRadius: 20, padding: 14 },
  cancelledBox: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 20, padding: 14 },
  tryAgainBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start" },
  tryAgainBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  payBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 10, alignItems: "center" },
  payBtnDisabled: { opacity: 0.45 },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  retryLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "900", marginBottom: 6 },
  retryEmailInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 15,
    paddingHorizontal: 12,
    color: COLORS.ink,
    backgroundColor: "#fff",
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 9,
  },
  retryEmailInvalid: { borderColor: COLORS.chili, backgroundColor: "#FFF7F7" },
  dot: { width: 12, height: 12, borderRadius: 6 },
  connector: { width: 2, flex: 1, minHeight: 24 },
  stepText: { fontSize: 14, paddingBottom: 20 },
  mapCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 22, padding: 12, marginBottom: 16 },
  mapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  mapTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 14.5 },
  mapSubtitle: { color: COLORS.mute, fontSize: 12.2, marginTop: 2 },
  mapBtn: { backgroundColor: COLORS.ink, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  mapBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  mapCanvas: {
    height: 315, borderRadius: 16, overflow: "hidden", backgroundColor: "#E5F2E9",
    borderWidth: 1, borderColor: COLORS.line, position: "relative",
  },
  routeLine: { position: "absolute", left: "16%", right: "14%", top: "50%", height: 3, backgroundColor: COLORS.mango, opacity: 0.75 },
  nativeMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "#E5F2E9" },
  nativeMapTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  nativeMapSub: { color: COLORS.mute, fontSize: 12, textAlign: "center", marginTop: 4 },
  marker: {
    position: "absolute", width: 34, height: 34, marginLeft: -17, marginTop: -17,
    borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff",
  },
  vendorMarker: { backgroundColor: COLORS.indigo },
  customerMarker: { backgroundColor: COLORS.green },
  riderMarker: { backgroundColor: COLORS.mango },
  markerText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  mapAttribution: { position: "absolute", right: 7, bottom: 6, backgroundColor: "rgba(255,255,255,0.86)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  mapAttributionText: { color: COLORS.mute, fontSize: 9, fontWeight: "700" },
  geoRows: { gap: 4, marginTop: 10 },
  geoLine: { color: COLORS.mute, fontSize: 12.2, lineHeight: 17 },
  riderBox: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, marginBottom: 16 },
  disputeBox: { backgroundColor: "#FCE8E6", borderWidth: 1, borderColor: COLORS.chili, borderRadius: 12, padding: 12 },
  reviewThanksBox: { backgroundColor: "#E5F2E9", borderWidth: 1, borderColor: COLORS.green, borderRadius: 12, padding: 12 },
  reviewBox: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14 },
  commentInput: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13.5, color: COLORS.ink, backgroundColor: "#fff", minHeight: 50, textAlignVertical: "top",
  },
  submitReviewBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, alignSelf: "flex-start", marginTop: 12 },
  submitReviewBtnText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  reasonChip: {
    borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.panel,
    borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7,
  },
  reasonChipText: { fontSize: 12.5, fontWeight: "600", color: COLORS.ink },
  reportBtn: {
    borderWidth: 1, borderColor: COLORS.chili, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start",
  },
  reportBtnText: { color: COLORS.chili, fontWeight: "700", fontSize: 13 },
  shopMoreBtn: { marginTop: 12, marginBottom: 8, alignSelf: "flex-start" },
  shopMoreText: { color: "#642BE4", fontWeight: "900", fontSize: 13.5 },
});
