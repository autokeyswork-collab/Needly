import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { StatusPill } from "../components/Pill";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { VendorAPI } from "../api/client";

const PURPLE = "#6F45E9";
const DARK_NAVY = "#15183F";
const EMERALD = "#10B981";
const MANGO = "#F59E0B";
const CHILI = "#EF4444";

function OrderCard({ o, action, extra }) {
  const items = o.items || [];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.orderIdText}>Order #{o.id.slice(-6)}</Text>
          <Text style={styles.orderTimeText}>
            {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <StatusPill status={o.status} />
      </View>

      <View style={styles.itemList}>
        {items.map((i) => (
          <View key={i.id || i.name} style={styles.itemRow}>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{i.qty}×</Text>
            </View>
            <Text style={styles.itemNameText}>{i.name}</Text>
            <Text style={styles.itemPriceText}>{fmtNaira((i.price || 0) * i.qty)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.totalLabel}>ORDER TOTAL</Text>
          <Text style={styles.totalValue}>{fmtNaira(o.total || 0)}</Text>
        </View>
        {action}
      </View>

      {extra}
    </View>
  );
}

export default function ManagerScreen() {
  const { orders, advanceOrder, cancelOrder, vendors, toggleVendorOpen } = useOrders();
  const { user } = useAuth();
  const managedVendorId = user?.managedVendor?.id;
  const managedVendor = (vendors || []).find((v) => v.id === managedVendorId)
    || user?.managedVendor
    || (vendors && vendors.length > 0 ? vendors.find((v) => v.category === "Local Market") || vendors[0] : null);
  const [actionError, setActionError] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);

  useEffect(() => {
    VendorAPI.stats().then(setStats).catch(() => {});
  }, []);

  const acceptOrder = async (orderId) => {
    setActionError(null);
    try {
      await advanceOrder(orderId);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const declineOrder = async (orderId, reason) => {
    setActionError(null);
    try {
      await cancelOrder(orderId, reason);
      setDecliningOrderId(null);
      setDeclineOtherNote(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (!managedVendor) {
    return (
      <View style={styles.noStoreContainer}>
        <View style={styles.noStoreIconWrap}>
          <Text style={{ fontSize: 44 }}>🛍️</Text>
        </View>
        <Text style={styles.noStoreTitle}>No Market Assigned</Text>
        <Text style={styles.noStoreText}>
          Your account is registered as a Relation Manager, but no local market hub has been assigned by an Admin yet.
        </Text>
        <View style={styles.noStoreBadge}>
          <Text style={styles.noStoreBadgeText}>⚡ Status: Pending Hub Assignment</Text>
        </View>
      </View>
    );
  }

  const marketOrders = (orders || []).filter((o) => o && o.vendor && (o.vendor.id === managedVendorId || o.vendorId === managedVendorId));
  const newOrders = marketOrders.filter((o) => (o.status || "").toLowerCase() === "placed");
  const sorting = marketOrders.filter((o) => (o.status || "").toLowerCase() === "accepted");
  const readyForRider = marketOrders.filter((o) => {
    const st = (o.status || "").toLowerCase();
    return st === "ready" || st === "picked_up";
  });
  const history = marketOrders.filter((o) => (o.status || "").toLowerCase() === "delivered");
  const declined = marketOrders.filter((o) => (o.status || "").toLowerCase() === "cancelled");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Manager Profile Banner */}
      <View style={styles.profileCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={styles.managerAvatarWrap}>
              <Text style={{ fontSize: 28 }}>🛍️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.managerName} numberOfLines={1}>{user?.name || "Hub Manager"}</Text>
              <Text style={styles.managerRole}>Relation Manager · {managedVendor.name}</Text>
            </View>
          </View>

          <View style={styles.statusWrap}>
            <View style={[styles.statusDot, { backgroundColor: managedVendor.isOpen ? EMERALD : CHILI }]} />
            <Text style={[styles.storeStatusText, { color: managedVendor.isOpen ? "#A7F3D0" : "#FCA5A5" }]}>
              {managedVendor.isOpen ? "OPEN" : "CLOSED"}
            </Text>
            <Switch
              value={!!managedVendor.isOpen}
              onValueChange={() => toggleVendorOpen(managedVendorId)}
              trackColor={{ true: EMERALD, false: "#475569" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* Local Market Sorting Alert */}
      {newOrders.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            🔔 <Text style={{ fontWeight: "900" }}>{newOrders.length} new order{newOrders.length > 1 ? "s" : ""}</Text> from Local Market — sort and package items before dispatch.
          </Text>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {actionError}</Text>
        </View>
      )}

      {/* Revenue Stats Grid */}
      {stats && (
        <View style={styles.statGrid}>
          {[
            { label: "Today", data: stats.today },
            { label: "This week", data: stats.week },
            { label: "This month", data: stats.month },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              <Text style={styles.statValue}>{fmtNaira(s.data?.revenue || 0)}</Text>
              <Text style={styles.statSub}>{s.data?.orders || 0} order{s.data?.orders === 1 ? "" : "s"}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 1. New Orders Pipeline */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>1. New Market Orders</Text>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{newOrders.length} waiting</Text>
        </View>
      </View>

      {newOrders.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>📦</Text>
          <Text style={styles.emptyTitle}>No New Market Orders</Text>
          <Text style={styles.emptySubText}>New orders placed in {managedVendor.name} will appear here for sorting.</Text>
        </View>
      )}

      {newOrders.map((o) => {
        const declining = decliningOrderId === o.id;
        return (
          <OrderCard
            key={o.id}
            o={o}
            action={!declining && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setDecliningOrderId(o.id)} style={styles.declineBtn}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>
                <Pressable onPress={() => acceptOrder(o.id)} style={styles.startSortingBtn}>
                  <Text style={styles.startSortingBtnText}>Start Sorting</Text>
                </Pressable>
              </View>
            )}
            extra={declining && (
              <View style={styles.declineBox}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#64748B", marginBottom: 8 }}>Why are you declining this order?</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                  {["Item(s) out of stock", "Too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => (reason === "Other" ? setDeclineOtherNote("") : declineOrder(o.id, reason))}
                      style={styles.declineReasonChip}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: DARK_NAVY }}>{reason}</Text>
                    </Pressable>
                  ))}
                </View>
                {declineOtherNote !== null && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput
                      value={declineOtherNote}
                      onChangeText={setDeclineOtherNote}
                      placeholder="Say a bit more…"
                      placeholderTextColor="#94A3B8"
                      style={[styles.miniInput, { flex: 1 }]}
                    />
                    <Pressable onPress={() => declineOrder(o.id, declineOtherNote.trim() || "Other")} style={styles.confirmDeclineBtn}>
                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>Confirm</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable onPress={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}>
                  <Text style={{ color: "#64748B", fontSize: 12, marginTop: 8, textDecorationLine: "underline" }}>Cancel</Text>
                </Pressable>
              </View>
            )}
          />
        );
      })}

      {/* 2. Sorting in Progress */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>2. Sorting & Packing ({sorting.length})</Text>
      </View>

      {sorting.length === 0 && <Text style={styles.emptyText}>No orders currently being sorted.</Text>}
      {sorting.map((o) => (
        <OrderCard
          key={o.id}
          o={o}
          action={
            <Pressable onPress={() => acceptOrder(o.id)} style={styles.readyRiderBtn}>
              <Text style={styles.readyRiderBtnText}>✓ Ready for Rider Pickup</Text>
            </Pressable>
          }
        />
      ))}

      {/* 3. Waiting on Rider Pickup */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>3. Waiting on Rider ({readyForRider.length})</Text>
      </View>

      {readyForRider.map((o) => (
        <View key={o.id} style={styles.waitingRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 13.5, fontWeight: "800", color: DARK_NAVY }}>Order #{o.id.slice(-6)}</Text>
            <Text style={{ fontSize: 12, color: "#64748B" }}>{fmtNaira(o.total || 0)}</Text>
          </View>
          <StatusPill status={o.status} />
        </View>
      ))}

      {/* 4. Completed History */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Completed Today ({history.length})</Text>
      </View>

      {history.map((o) => {
        const expanded = expandedHistoryId === o.id;
        return (
          <Pressable key={o.id} onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={[styles.historyRow, expanded && styles.historyRowExpanded]}>
            <View style={styles.historyTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: EMERALD, fontWeight: "900" }}>✓</Text>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: DARK_NAVY }}>Order #{o.id.slice(-6)}</Text>
              </View>
              <Text style={{ fontSize: 13.5, fontWeight: "800", color: DARK_NAVY }}>{fmtNaira(o.total || 0)}</Text>
            </View>
            {expanded && (
              <View style={styles.historyDetail}>
                <Text style={styles.historyDetailTime}>
                  Completed at {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                {(o.items || []).map((i) => (
                  <Text key={i.id || i.name} style={styles.historyDetailItem}>• {i.qty} × {i.name} ({fmtNaira((i.price || 0) * i.qty)})</Text>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}

      {declined.length > 0 && (
        <>
          <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Declined Orders ({declined.length})</Text>
          </View>
          {declined.map((o) => {
            const expanded = expandedHistoryId === o.id;
            return (
              <Pressable key={o.id} onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={[styles.historyRow, expanded && styles.historyRowExpanded]}>
                <View style={styles.historyTopRow}>
                  <Text style={{ fontSize: 13.5, fontWeight: "800", color: CHILI }}>Order #{o.id.slice(-6)}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#64748B" }}>{fmtNaira(o.total || 0)}</Text>
                </View>
                {expanded && (
                  <View style={styles.historyDetail}>
                    <Text style={styles.historyDetailTime}>
                      Declined at {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {(o.items || []).map((i) => (
                      <Text key={i.id || i.name} style={styles.historyDetailItem}>• {i.qty} × {i.name} ({fmtNaira((i.price || 0) * i.qty)})</Text>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 60 },

  noStoreContainer: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, alignItems: "center", justifyContent: "center" },
  noStoreIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  noStoreTitle: { fontSize: 22, fontWeight: "900", color: DARK_NAVY, marginBottom: 8 },
  noStoreText: { fontSize: 13.5, color: "#64748B", textAlign: "center", lineHeight: 20, maxWidth: 310, marginBottom: 20 },
  noStoreBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A" },
  noStoreBadgeText: { color: "#92400E", fontSize: 12.5, fontWeight: "800" },

  /* Manager Profile Card */
  profileCard: {
    backgroundColor: DARK_NAVY, borderRadius: 24, padding: 18, marginBottom: 16,
    shadowColor: DARK_NAVY, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  managerAvatarWrap: { width: 48, height: 48, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  managerName: { color: "#ffffff", fontWeight: "900", fontSize: 17 },
  managerRole: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  statusWrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  storeStatusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginBottom: 4 },

  alertBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, padding: 14, marginBottom: 16 },
  alertText: { color: "#991B1B", fontSize: 13 },
  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, padding: 14, marginBottom: 16 },
  errorText: { color: "#991B1B", fontSize: 13 },

  /* Stats Grid */
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statLabel: { fontSize: 10, fontWeight: "900", color: "#64748B", marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: "900", color: DARK_NAVY },
  statSub: { fontSize: 11, color: "#64748B", marginTop: 2, fontWeight: "600" },

  /* Section Titles */
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: DARK_NAVY },
  badgePill: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgePillText: { color: PURPLE, fontSize: 11.5, fontWeight: "800" },

  emptyText: { color: "#64748B", fontSize: 13, marginBottom: 12, fontStyle: "italic" },
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 20, alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: DARK_NAVY },
  emptySubText: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 4 },

  /* Order Cards */
  card: {
    backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, gap: 10, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 10 },
  orderIdText: { fontWeight: "900", fontSize: 14.5, color: DARK_NAVY },
  orderTimeText: { fontSize: 11.5, color: "#64748B", fontWeight: "600" },

  itemList: { gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBadge: { backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  qtyBadgeText: { fontSize: 12, fontWeight: "800", color: DARK_NAVY },
  itemNameText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: DARK_NAVY },
  itemPriceText: { fontSize: 13.5, fontWeight: "700", color: "#334155" },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  totalLabel: { fontSize: 9.5, fontWeight: "900", color: "#64748B", letterSpacing: 0.5 },
  totalValue: { fontSize: 16, fontWeight: "900", color: DARK_NAVY },

  declineBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  declineBtnText: { color: CHILI, fontWeight: "800", fontSize: 12.5 },
  startSortingBtn: { backgroundColor: PURPLE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  startSortingBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  readyRiderBtn: { backgroundColor: EMERALD, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  readyRiderBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },

  declineBox: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  declineReasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#CBD5E1" },
  miniInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12.5, backgroundColor: "#ffffff", color: DARK_NAVY },
  confirmDeclineBtn: { backgroundColor: CHILI, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, justifyContent: "center" },

  waitingRow: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

  historyRow: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, marginBottom: 6 },
  historyRowExpanded: { borderColor: PURPLE, backgroundColor: "#F8FAFC" },
  historyTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyDetail: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  historyDetailTime: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  historyDetailItem: { fontSize: 12, color: "#334155" },
});
