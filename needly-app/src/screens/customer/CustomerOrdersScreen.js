import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { StatusPill } from "../../components/Pill";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";

const INK = "#15183F";

export default function CustomerOrdersScreen({ navigation }) {
  const { orders } = useOrders();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Track active deliveries and review past purchases.</Text>

        <View style={styles.list}>
          {orders.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>When you buy from a vendor, your order history will show here.</Text>
            </View>
          )}
          {orders.map((order) => (
            <Pressable key={order.id} style={styles.orderCard} onPress={() => navigation.navigate("Tracking", { orderId: order.id })}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderTitle}>{order.vendor.name}</Text>
                  <Text style={styles.meta}>#{order.id.slice(-6)} · {new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <StatusPill status={order.status} />
              </View>
              <Text style={styles.items}>{order.items.map((i) => `${i.qty}× ${i.name}`).slice(0, 2).join(", ")}</Text>
              <View style={styles.totalRow}>
                <Text style={styles.meta}>{order.paymentStatus || "pending"} payment</Text>
                <Text style={styles.total}>{fmtNaira(order.total)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <CustomerBottomNav navigation={navigation} active="CustomerOrders" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 122 },
  title: { color: INK, fontSize: 26, fontWeight: "900" },
  subtitle: { color: COLORS.mute, fontSize: 13.5, marginTop: 4, marginBottom: 18 },
  list: { gap: 10 },
  orderCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 18, padding: 14 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  orderTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: COLORS.mute, fontSize: 12.5, marginTop: 3 },
  items: { color: INK, fontSize: 13, lineHeight: 18 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F0ECFA", paddingTop: 10, marginTop: 10 },
  total: { color: INK, fontSize: 14, fontWeight: "900" },
  emptyCard: { backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 16 },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: "900", marginBottom: 5 },
  emptyText: { color: COLORS.mute, fontSize: 13, lineHeight: 19 },
});
