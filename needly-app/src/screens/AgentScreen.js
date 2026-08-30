import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { AgentAPI, OrderAPI, normalizeOrder } from "../api/client";
import { fmtNaira } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const PURPLE = "#6F45E9";
const DARK = "#15183F";
const GREEN = "#10B981";
const ORANGE = "#F59E0B";
const SOFT = "#F7F3FF";

export default function AgentScreen() {
  const { user, logout, refreshMe } = useAuth();
  const [agent, setAgent] = useState(user?.agent || null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState({ assigned: [], available: [], completedToday: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyOrderId, setBusyOrderId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, statData, profile] = await Promise.all([
        OrderAPI.mine(),
        AgentAPI.stats(),
        AgentAPI.me(),
      ]);
      setOrders({
        assigned: (orderData.assigned || []).map(normalizeOrder),
        available: (orderData.available || []).map(normalizeOrder),
        completedToday: (orderData.completedToday || []).map(normalizeOrder),
      });
      setStats(statData);
      setAgent(profile);
    } catch (err) {
      setError(err.message || "Could not load agent dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleOnline = async () => {
    try {
      const updated = await AgentAPI.toggleOnline();
      setAgent(updated);
      await refreshMe();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const mutateOrder = async (orderId, action) => {
    setBusyOrderId(orderId);
    setError(null);
    try {
      if (action === "claim") await OrderAPI.agentClaim(orderId);
      if (action === "collecting") await OrderAPI.agentStatus(orderId, "COLLECTING");
      if (action === "atHub") await OrderAPI.agentStatus(orderId, "AT_HUB");
      await load();
    } catch (err) {
      setError(err.message || "Could not update this hub collection");
    } finally {
      setBusyOrderId(null);
    }
  };

  const isOnline = !!agent?.isOnline;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
        <View style={styles.heroText}>
          <Text style={styles.name} numberOfLines={1}>{user?.name || agent?.user?.name || "Needly Agent"}</Text>
          <Text style={styles.sub} numberOfLines={1}>{agent?.hub?.name || "Needly hub"} · {agent?.zone || "Abeokuta"}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logout}><Text style={styles.logoutText}>Logout</Text></Pressable>
      </View>

      <View style={styles.statusCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{isOnline ? "Online for hub collections" : "Offline"}</Text>
          <Text style={styles.cardSub}>Collect from vendors and drop at the Needly hub for riders.</Text>
        </View>
        <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ true: GREEN, false: "#CBD5E1" }} thumbColor="#fff" />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.statsRow}>
        <Stat label="Assigned" value={stats?.assigned || 0} />
        <Stat label="Collecting" value={stats?.collecting || 0} />
        <Stat label="At Hub" value={stats?.deliveredToHubToday || 0} />
        <Stat label="Waiting" value={stats?.waitingAtHub || 0} />
      </View>

      <Text style={styles.sectionTitle}>My Collections</Text>
      <FlatList
        data={orders.assigned}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty text={loading ? "Loading collections..." : "No active hub collections assigned."} />}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            busy={busyOrderId === item.id}
            primaryLabel={item.agentPickupStatus === "ASSIGNED" ? "Start Collection" : "Delivered to Hub"}
            onPrimary={() => mutateOrder(item.id, item.agentPickupStatus === "ASSIGNED" ? "collecting" : "atHub")}
          />
        )}
      />

      <Text style={styles.sectionTitle}>Available Hub Jobs</Text>
      <FlatList
        data={orders.available}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty text={isOnline ? "No hub pickup jobs right now." : "Go online to see available hub jobs."} />}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            busy={busyOrderId === item.id}
            primaryLabel="Claim Hub Pickup"
            onPrimary={() => mutateOrder(item.id, "claim")}
          />
        )}
      />

      <Text style={styles.sectionTitle}>Delivered To Hub Today</Text>
      <FlatList
        data={orders.completedToday}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty text="No completed hub drop-offs today." />}
        renderItem={({ item }) => <OrderCard order={item} completed />}
      />
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Empty({ text }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;
}

function OrderCard({ order, primaryLabel, onPrimary, busy, completed }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <Text style={styles.orderTitle}>Order #{order.id.slice(-6)}</Text>
        <Text style={styles.status}>{order.agentPickupStatus.replace(/_/g, " ")}</Text>
      </View>
      <Text style={styles.vendor}>{order.vendor?.name || "Vendor Store"}</Text>
      <Text style={styles.route}>Pickup: {order.vendor?.address || order.vendor?.area || "Vendor location"}</Text>
      <Text style={styles.route}>Hub: {order.hub?.address || order.hub?.name || "Needly hub"}</Text>
      <View style={styles.items}>
        {order.items.map((item) => (
          <Text key={item.id} style={styles.itemText} numberOfLines={1}>
            {item.qty}x {item.name} · {fmtNaira(item.price)}
          </Text>
        ))}
      </View>
      {!completed && primaryLabel && (
        <Pressable disabled={busy} onPress={onPrimary} style={[styles.primaryBtn, busy && { opacity: 0.65 }]}>
          <Text style={styles.primaryText}>{busy ? "Updating..." : primaryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5FF" },
  content: { width: "100%", maxWidth: 430, alignSelf: "center", padding: 14, paddingBottom: 44 },
  hero: { backgroundColor: PURPLE, borderRadius: 28, padding: 16, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: PURPLE, fontWeight: "900", fontSize: 22 },
  heroText: { flex: 1, minWidth: 0 },
  name: { color: "#fff", fontSize: 17, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.82)", fontSize: 11.5, fontWeight: "700", marginTop: 3 },
  logout: { backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  logoutText: { color: "#fff", fontSize: 11.5, fontWeight: "900" },
  statusCard: { backgroundColor: "#fff", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E7E0FF", flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: { color: DARK, fontSize: 15, fontWeight: "900" },
  cardSub: { color: "#6B7280", fontSize: 12, marginTop: 3, lineHeight: 17 },
  error: { color: "#DC2626", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 10, marginBottom: 10, fontSize: 12.5, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 7, marginBottom: 18 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#E7E0FF" },
  statValue: { color: DARK, fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#6B7280", fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  sectionTitle: { color: DARK, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  list: { gap: 10, marginBottom: 18 },
  empty: { backgroundColor: "#fff", borderRadius: 18, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "#E7E0FF" },
  emptyText: { color: "#6B7280", fontSize: 12.5, textAlign: "center", fontWeight: "700" },
  orderCard: { backgroundColor: "#fff", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E7E0FF", shadowColor: "#3B1A99", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  orderTitle: { color: DARK, fontSize: 14, fontWeight: "900" },
  status: { color: PURPLE, backgroundColor: SOFT, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "900", overflow: "hidden" },
  vendor: { color: DARK, fontSize: 15, fontWeight: "900", marginTop: 8 },
  route: { color: "#6B7280", fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  items: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 10, marginTop: 10, gap: 4 },
  itemText: { color: DARK, fontSize: 12, fontWeight: "700" },
  primaryBtn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
