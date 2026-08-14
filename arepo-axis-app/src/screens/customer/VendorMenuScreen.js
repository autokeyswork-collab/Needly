import React, { useState } from "react";
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";
import { COLORS, fmtNaira } from "../../theme/colors";
import { Pill } from "../../components/Pill";
import Thumb from "../../components/Thumb";
import { useOrders } from "../../context/OrdersContext";

function groupBySubcategory(items) {
  const order = [];
  const map = {};
  items.forEach((i) => {
    const key = i.subcategory || "Other";
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(i);
  });
  return order.map((key) => ({ title: key, data: map[key] }));
}

export default function VendorMenuScreen({ route, navigation }) {
  const { vendorId } = route.params;
  const { vendors } = useOrders();
  const vendor = vendors.find((v) => v.id === vendorId);
  const [cart, setCart] = useState({});
  const [subFilter, setSubFilter] = useState("All");

  const hasSubcategories = vendor.items.some((i) => i.subcategory);
  const subcategories = hasSubcategories ? ["All", ...new Set(vendor.items.map((i) => i.subcategory))] : [];
  const displayItems = subFilter === "All" ? vendor.items : vendor.items.filter((i) => i.subcategory === subFilter);
  const sections = groupBySubcategory(displayItems);

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const remove = (id) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = vendor.items.reduce((s, i) => s + (cart[i.id] || 0) * i.price, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Thumb emoji={vendor.emoji} category={vendor.category} size={48} />
          <Text style={styles.title}>{vendor.name}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <Pill tone="indigo">{vendor.area}</Pill>
          <Text style={{ fontSize: 12.5, color: COLORS.mute }}>{vendor.eta}</Text>
        </View>

        {hasSubcategories && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8 }}>
            {subcategories.map((s) => {
              const active = s === subFilter;
              return (
                <Pressable key={s} onPress={() => setSubFilter(s)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 10, paddingBottom: count > 0 ? 100 : 16 }}
        renderSectionHeader={({ section }) =>
          hasSubcategories && subFilter === "All" ? (
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.isAvailable === false && { opacity: 0.5 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Thumb emoji={item.emoji} category={vendor.category} />
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{fmtNaira(item.price)}</Text>
              </View>
            </View>
            {item.isAvailable === false ? (
              <Text style={{ fontSize: 12, color: COLORS.mute, fontWeight: "600" }}>Unavailable</Text>
            ) : cart[item.id] ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable onPress={() => remove(item.id)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>{"\u2212"}</Text></Pressable>
                <Text style={{ minWidth: 16, textAlign: "center", fontWeight: "700" }}>{cart[item.id]}</Text>
                <Pressable onPress={() => add(item.id)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></Pressable>
              </View>
            ) : (
              <Pressable onPress={() => add(item.id)} style={styles.addBtn}><Text style={styles.addBtnText}>Add</Text></Pressable>
            )}
          </View>
        )}
      />

      {count > 0 && (
        <Pressable
          style={styles.cartBar}
          onPress={() => navigation.navigate("Cart", { vendorId, cart })}
        >
          <Text style={styles.cartBarText}>View cart {"\u00B7"} {count} item{count > 1 ? "s" : ""}</Text>
          <Text style={styles.cartBarPrice}>{fmtNaira(total)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 19, color: COLORS.ink, marginBottom: 4 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line,
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12.5, fontWeight: "600", color: COLORS.ink },
  chipTextActive: { color: "#fff" },
  sectionHeader: {
    fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginBottom: 4, marginTop: 6,
    fontFamily: "IBM Plex Mono, monospace",
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12,
    marginBottom: 10,
  },
  itemName: { fontWeight: "600", fontSize: 14.5, color: COLORS.ink },
  itemPrice: { fontSize: 13, color: COLORS.mute, marginTop: 2 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: COLORS.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontWeight: "700", fontSize: 15 },
  addBtn: { backgroundColor: COLORS.mango, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cartBar: {
    position: "absolute", bottom: 18, left: 20, right: 20, backgroundColor: COLORS.mango,
    borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between",
    shadowColor: COLORS.mango, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  cartBarText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  cartBarPrice: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
});
