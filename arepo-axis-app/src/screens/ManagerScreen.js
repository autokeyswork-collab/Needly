import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { StatusPill } from "../components/Pill";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { VendorAPI } from "../api/client";

function OrderCard({ o, action, extra }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id.slice(-6)}</Text>
        <StatusPill status={o.status} />
      </View>
      {o.items.map((i) => (
        <Text key={i.id} style={{ fontSize: 13.5 }}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
      ))}
      <View style={styles.cardFooter}>
        <Text style={styles.total}>{fmtNaira(o.total)}</Text>
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
  const managedVendor = vendors.find((v) => v.id === managedVendorId);
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
    try { await advanceOrder(orderId); } catch (err) { setActionError(err.message); }
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
      <View style={{ flex: 1, backgroundColor: COLORS.paper, padding: 16 }}>
        <Text style={{ color: COLORS.mute }}>No store is assigned to this manager account yet.</Text>
      </View>
    );
  }

  const marketOrders = orders.filter((o) => o.vendor.id === managedVendorId);
  const newOrders = marketOrders.filter((o) => o.status === "placed");
  const sorting = marketOrders.filter((o) => o.status === "accepted");
  const readyForRider = marketOrders.filter((o) => o.status === "ready" || o.status === "picked_up");
  const history = marketOrders.filter((o) => o.status === "delivered");
  const declined = marketOrders.filter((o) => o.status === "cancelled");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.paper }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.profileCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.managerName}>{user.name}</Text>
            <Text style={styles.managerRole}>Relation Manager {"\u00B7"} {managedVendor.name}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.storeStatusLabel}>{managedVendor.isOpen ? "OPEN" : "CLOSED"}</Text>
            <Switch value={managedVendor.isOpen} onValueChange={() => toggleVendorOpen(managedVendorId)} trackColor={{ true: COLORS.green }} />
          </View>
        </View>
      </View>

      {newOrders.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={{ fontSize: 13.5 }}>
            <Text style={{ color: COLORS.chili, fontWeight: "700" }}>
              {newOrders.length} new order{newOrders.length > 1 ? "s" : ""}
            </Text>
            {" "}just came in from Local Market — no vendor handles these, so sort and pack them yourself before a rider arrives.
          </Text>
        </View>
      )}

      {actionError && (
        <View style={styles.alertBox}>
          <Text style={{ color: COLORS.chili, fontSize: 12.5 }}>{actionError}</Text>
        </View>
      )}

      {stats && (
        <View style={styles.statGrid}>
          {[{ label: "Today", data: stats.today }, { label: "This week", data: stats.week }, { label: "This month", data: stats.month }].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              <Text style={styles.statValue}>{fmtNaira(s.data.revenue)}</Text>
              <Text style={styles.statSub}>{s.data.orders} order{s.data.orders === 1 ? "" : "s"}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>New orders ({newOrders.length})</Text>
      {newOrders.length === 0 && <Text style={styles.emptyText}>Nothing waiting to be sorted.</Text>}
      {newOrders.map((o) => {
        const declining = decliningOrderId === o.id;
        return (
          <OrderCard
            key={o.id}
            o={o}
            action={!declining && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setDecliningOrderId(o.id)} style={styles.declineBtnWrap}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>
                <Pressable onPress={() => acceptOrder(o.id)} style={[styles.actionBtnWrap, { backgroundColor: COLORS.ink }]}>
                  <Text style={styles.actionBtnText}>Start sorting</Text>
                </Pressable>
              </View>
            )}
            extra={declining && (
              <View style={styles.declineBox}>
                <Text style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>Why are you declining this order?</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                  {["Item(s) out of stock", "Too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => (reason === "Other" ? setDeclineOtherNote("") : declineOrder(o.id, reason))}
                      style={styles.declineReasonChip}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600" }}>{reason}</Text>
                    </Pressable>
                  ))}
                </View>
                {declineOtherNote !== null && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput
                      value={declineOtherNote} onChangeText={setDeclineOtherNote}
                      placeholder="Say a bit more\u2026" style={[styles.miniInput, { flex: 1 }]}
                    />
                    <Pressable onPress={() => declineOrder(o.id, declineOtherNote.trim() || "Other")} style={[styles.actionBtnWrap, { backgroundColor: COLORS.chili }]}>
                      <Text style={styles.actionBtnText}>Send</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable onPress={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}>
                  <Text style={{ color: COLORS.mute, fontSize: 12, marginTop: 8 }}>Never mind</Text>
                </Pressable>
              </View>
            )}
          />
        );
      })}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Sorting ({sorting.length})</Text>
      {sorting.length === 0 && <Text style={styles.emptyText}>Nothing in progress.</Text>}
      {sorting.map((o) => (
        <OrderCard
          key={o.id}
          o={o}
          action={
            <Pressable onPress={() => acceptOrder(o.id)} style={[styles.actionBtnWrap, { backgroundColor: COLORS.green }]}>
              <Text style={styles.actionBtnText}>Ready for rider</Text>
            </Pressable>
          }
        />
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 20, color: COLORS.mute }]}>
        Waiting on rider ({readyForRider.length})
      </Text>
      {readyForRider.map((o) => (
        <View key={o.id} style={styles.historyRow}>
          <Text style={{ fontSize: 13 }}>#{o.id.slice(-6)}</Text>
          <StatusPill status={o.status} />
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 20, color: COLORS.mute }]}>
        Completed today ({history.length})
      </Text>
      {history.map((o) => {
        const expanded = expandedHistoryId === o.id;
        return (
          <Pressable key={o.id} onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={expanded ? styles.historyRowExpanded : undefined}>
            <View style={styles.historyRow}>
              <Text style={{ fontSize: 13, color: COLORS.mute }}>#{o.id.slice(-6)}</Text>
              <Text style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(o.total)}</Text>
            </View>
            {expanded && (
              <View style={styles.historyDetail}>
                <Text style={styles.historyDetailTime}>
                  {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
                {o.items.map((i) => (
                  <Text key={i.id} style={styles.historyDetailItem}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}

      {declined.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20, color: COLORS.mute }]}>Declined ({declined.length})</Text>
          {declined.map((o) => {
            const expanded = expandedHistoryId === o.id;
            return (
              <Pressable key={o.id} onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={expanded ? styles.historyRowExpanded : undefined}>
                <View style={styles.historyRow}>
                  <Text style={{ fontSize: 13, color: COLORS.mute }}>#{o.id.slice(-6)}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(o.total)}</Text>
                </View>
                {expanded && (
                  <View style={styles.historyDetail}>
                    <Text style={styles.historyDetailTime}>
                      {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {o.items.map((i) => (
                      <Text key={i.id} style={styles.historyDetailItem}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
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
  profileCard: { backgroundColor: COLORS.indigo, borderRadius: 14, padding: 16, marginBottom: 18 },
  managerName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  managerRole: { color: "rgba(255,255,255,0.7)", fontSize: 11.5, marginTop: 2 },
  storeStatusLabel: { fontSize: 9.5, fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  alertBox: {
    backgroundColor: "#FCE8E6", borderWidth: 1, borderColor: COLORS.chili,
    borderRadius: 12, padding: 12, marginBottom: 18,
  },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: COLORS.ink },
  emptyText: { color: COLORS.mute, fontSize: 13.5, marginBottom: 10 },
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 10 },
  statLabel: { fontSize: 9.5, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  statSub: { fontSize: 10.5, color: COLORS.mute, marginTop: 2 },
  card: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 12, padding: 14, marginBottom: 10, gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  total: { fontWeight: "700", fontSize: 13.5 },
  actionBtnWrap: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  declineBtnWrap: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.chili },
  declineBtnText: { color: COLORS.chili, fontWeight: "700", fontSize: 12.5 },
  declineBox: { backgroundColor: COLORS.paper, borderRadius: 10, padding: 10, marginTop: 8 },
  declineReasonChip: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  miniInput: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12.5, backgroundColor: "#fff" },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  historyRowExpanded: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 10, marginVertical: 2 },
  historyDetail: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.line, borderStyle: "dashed" },
  historyDetailTime: { fontSize: 11.5, color: COLORS.mute, marginBottom: 4 },
  historyDetailItem: { fontSize: 13, color: COLORS.ink, marginBottom: 2 },
});
