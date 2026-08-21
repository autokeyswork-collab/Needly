import React, { useMemo } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { StatusPill } from "../../components/Pill";
import { fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#35109B";
const INK = "#11123A";
const MUTED = "#777991";
const LINE = "#ECE8F7";
const GREEN = "#10B981";
const AMBER = "#F59E0B";

const ACTIVE_STATUSES = ["placed", "accepted", "ready", "picked_up"];

function formatDate(value) {
  if (!value) return "Recent";
  try {
    return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch (_) {
    return "Recent";
  }
}

function formatTime(value) {
  if (!value) return "Now";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "Now";
  }
}

function OrderCard({ order, featured, onPress }) {
  const items = (order.items || []).map((i) => `${i.qty || 1}x ${i.name}`).slice(0, featured ? 4 : 2).join(", ");
  const paid = order.paymentStatus === "paid";
  return (
    <Pressable style={[styles.orderCard, featured && styles.featuredOrder]} onPress={onPress}>
      <View style={styles.orderHeader}>
        <View style={styles.orderVendorRow}>
          <View style={styles.vendorIcon}>
            <Text style={styles.vendorEmoji}>{order.vendor?.emoji || "🛍️"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.orderTitle}>{order.vendor?.name || "Needly vendor"}</Text>
            <Text style={styles.meta}>#{String(order.id || "").slice(-6)} · {formatDate(order.createdAt)} · {formatTime(order.createdAt)}</Text>
          </View>
        </View>
        <StatusPill status={order.status} />
      </View>

      <Text numberOfLines={featured ? 2 : 1} style={styles.items}>{items || "Order items"}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${({ placed: 18, accepted: 42, ready: 62, picked_up: 82, delivered: 100, cancelled: 100 }[order.status] || 24)}%`, backgroundColor: order.status === "cancelled" ? "#EF4444" : PURPLE }]} />
      </View>

      <View style={styles.totalRow}>
        <View style={[styles.paymentBadge, paid ? styles.paymentPaid : styles.paymentPending]}>
          <Ionicons name={paid ? "checkmark-circle" : "time-outline"} size={14} color={paid ? GREEN : AMBER} />
          <Text style={[styles.paymentText, { color: paid ? GREEN : AMBER }]}>{paid ? "Paid" : "Payment pending"}</Text>
        </View>
        <Text style={styles.total}>{fmtNaira(order.total || 0)}</Text>
      </View>
    </Pressable>
  );
}

export default function CustomerOrdersScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { orders = [], loading } = useOrders();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;

  const sortedOrders = useMemo(() => (
    orders.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  ), [orders]);
  const activeOrders = sortedOrders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const pastOrders = sortedOrders.filter((order) => !ACTIVE_STATUSES.includes(order.status));
  const totalSpent = sortedOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Pressable style={styles.backCircle} onPress={() => navigation.navigate("Browse")}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <Pressable style={styles.walletPill} onPress={() => navigation.navigate("NeedlyPay")}>
                <MaterialCommunityIcons name="qrcode-scan" size={17} color="#fff" />
                <Text style={styles.walletPillText}>Needly Pay</Text>
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>Orders</Text>
            <Text style={styles.heroSub}>Track deliveries, payments and past purchases.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{activeOrders.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{pastOrders.length}</Text>
                <Text style={styles.statLabel}>Past</Text>
              </View>
              <View style={styles.statBoxWide}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValueSmall}>{fmtNaira(totalSpent)}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
            </View>
          </View>

          {loading && sortedOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={38} color={PURPLE} />
              <Text style={styles.emptyTitle}>Loading your orders</Text>
              <Text style={styles.emptyText}>Checking active deliveries and recent purchases.</Text>
            </View>
          ) : sortedOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome name="shopping-bag" size={32} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Your deliveries will appear here after you buy from Open Market, Food, Pharmacy or other Needly vendors.</Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CategoryResults", { category: "Local Market" })}>
                  <Text style={styles.primaryBtnText}>Shop Open Market</Text>
                  <FontAwesome name="arrow-right" size={13} color="#fff" />
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Browse")}>
                  <Text style={styles.secondaryBtnText}>Browse Home</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Deliveries</Text>
                <Text style={styles.sectionCount}>{activeOrders.length}</Text>
              </View>
              {activeOrders.length === 0 ? (
                <View style={styles.miniEmpty}>
                  <Text style={styles.miniEmptyText}>No active deliveries right now.</Text>
                </View>
              ) : activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  featured
                  onPress={() => navigation.navigate("Tracking", { orderId: order.id })}
                />
              ))}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Purchases</Text>
                <Text style={styles.sectionCount}>{pastOrders.length}</Text>
              </View>
              {pastOrders.length === 0 ? (
                <View style={styles.miniEmpty}>
                  <Text style={styles.miniEmptyText}>Completed and cancelled orders will show here.</Text>
                </View>
              ) : pastOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate("Tracking", { orderId: order.id })}
                />
              ))}
            </>
          )}
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="CustomerOrders" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 124 },
  hero: { borderRadius: 28, padding: 16, backgroundColor: PURPLE_DARK, marginBottom: 16, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 31, lineHeight: 31, fontWeight: "800" },
  walletPill: { height: 38, borderRadius: 19, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", flexDirection: "row", alignItems: "center", gap: 6 },
  walletPillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.82)", fontSize: 13.5, fontWeight: "700", marginTop: 4, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 9 },
  statBox: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  statBoxWide: { flex: 1.35, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statValueSmall: { color: "#fff", fontSize: 16, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontWeight: "900", marginTop: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 10 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "900" },
  sectionCount: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  orderCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, borderRadius: 22, padding: 14, marginBottom: 12, shadowColor: "#1E164C", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  featuredOrder: { borderColor: "#D8CCFF", backgroundColor: "#FEFDFF" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  orderVendorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  vendorIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  vendorEmoji: { fontSize: 22 },
  orderTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: MUTED, fontSize: 11.5, marginTop: 2, fontWeight: "700" },
  items: { color: INK, fontSize: 12.7, lineHeight: 18, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "#F0ECFA", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 3 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F0ECFA", paddingTop: 10, marginTop: 10 },
  total: { color: INK, fontSize: 14.5, fontWeight: "900" },
  paymentBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
  paymentPaid: { backgroundColor: "#DCFCE7" },
  paymentPending: { backgroundColor: "#FEF3C7" },
  paymentText: { fontSize: 11, fontWeight: "900" },
  emptyCard: { alignItems: "center", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: LINE, backgroundColor: "#FBFAFF" },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: "900", marginTop: 8, marginBottom: 6 },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 19 },
  emptyActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 18 },
  primaryBtn: { flex: 1.2, height: 46, borderRadius: 23, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 13.2, fontWeight: "900" },
  secondaryBtn: { flex: 1, height: 46, borderRadius: 23, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: PURPLE, fontSize: 13.2, fontWeight: "900" },
  miniEmpty: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: LINE, backgroundColor: "#FBFAFF", marginBottom: 12 },
  miniEmptyText: { color: MUTED, fontSize: 12.5, textAlign: "center", fontWeight: "700" },
});
