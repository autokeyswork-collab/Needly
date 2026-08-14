import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { STATUS_FLOW, STATUS_LABEL } from "../../data/mockData";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import { getSocket } from "../../api/socket";
import { PaymentAPI, ReviewAPI } from "../../api/client";
import StarRating from "../../components/StarRating";

const DISPUTE_REASONS = ["Missing item", "Wrong item", "Item damaged", "Arrived late", "Other"];

export default function TrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { orders, refreshOrders, raiseDispute } = useOrders();
  const order = orders.find((o) => o.id === orderId);
  const [reportOpen, setReportOpen] = useState(false);
  const [payingAgain, setPayingAgain] = useState(false);
  const [payError, setPayError] = useState(null);
  const [vendorStars, setVendorStars] = useState(0);
  const [riderStars, setRiderStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Watch this specific order's room for instant pushes while this screen
  // is open, on top of the context's coarser fallback poll/refresh.
  useEffect(() => {
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

  if (!order) return null;

  const awaitingPayment = order.status === "placed" && order.paymentStatus !== "paid";

  const retryPayment = async () => {
    setPayingAgain(true);
    setPayError(null);
    try {
      const { authorizationUrl } = await PaymentAPI.initialize(order.id);
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
    <View style={{ flex: 1, backgroundColor: COLORS.paper, padding: 16 }}>
      <Text style={styles.title}>Order #{order.id.slice(-6)}</Text>
      <Text style={styles.subtitle}>{order.vendor.name} {"\u00B7"} {fmtNaira(order.total)}</Text>
      {order.deliveryAddress && (
        <Text style={styles.address}>{"\uD83D\uDCCD"} {order.deliveryAddress}</Text>
      )}

      <View style={{ marginTop: 20 }}>
        {order.status === "cancelled" ? (
          <View style={styles.cancelledBox}>
            <Text style={{ fontWeight: "700", fontSize: 14.5, marginBottom: 6 }}>
              {order.cancelReason ? `${order.vendor.name} couldn't take your order` : "Order cancelled"}
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
            <Text style={{ fontWeight: "700", fontSize: 14.5, marginBottom: 6 }}>Awaiting payment</Text>
            <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 12 }}>
              Your order is saved but won't reach the vendor until payment is confirmed. If the payment page didn't open or you closed it, tap below to try again.
            </Text>
            <Pressable onPress={retryPayment} disabled={payingAgain} style={styles.payBtn}>
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
                Thanks for your feedback! You rated {order.vendor.name} {order.review.vendorRating}{"\u2605"}
                {order.review.riderRating ? ` and your rider ${order.review.riderRating}\u2605` : ""}.
              </Text>
            </View>
          ) : (
            <View style={styles.reviewBox}>
              <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 10 }}>Rate your order</Text>
              <Text style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 6 }}>{order.vendor.name}</Text>
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

      <Pressable onPress={() => navigation.popToTop()} style={{ marginTop: 12 }}>
        <Text style={{ color: COLORS.indigo, fontWeight: "700", fontSize: 13.5 }}>{"\u2190"} Order something else</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 19, color: COLORS.ink },
  subtitle: { fontSize: 13.5, color: COLORS.mute, marginTop: 2, marginBottom: 2 },
  address: { fontSize: 12.5, color: COLORS.mute, marginBottom: 6 },
  paymentBox: { backgroundColor: "#FFF1DA", borderWidth: 1, borderColor: COLORS.mango, borderRadius: 12, padding: 14 },
  cancelledBox: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14 },
  tryAgainBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start" },
  tryAgainBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  payBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 10, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  connector: { width: 2, flex: 1, minHeight: 24 },
  stepText: { fontSize: 14, paddingBottom: 20 },
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
});
