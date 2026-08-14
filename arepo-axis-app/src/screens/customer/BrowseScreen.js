import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "../../data/mockData";
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

export default function BrowseScreen({ navigation }) {
  const { vendors } = useOrders();
  const [category, setCategory] = useState("Restaurant");
  const [marketCart, setMarketCart] = useState({});
  const [marketSubFilter, setMarketSubFilter] = useState("All");
  const isLocalMarket = category === "Local Market";
  const filtered = vendors.filter((v) => v.category === category);
  const localMarketVendor = vendors.find((v) => v.category === "Local Market");
  const localMarketItems = localMarketVendor?.items || [];

  const marketSubcategories = ["All", ...new Set(localMarketItems.map((i) => i.subcategory).filter(Boolean))];
  const marketDisplayItems = marketSubFilter === "All"
    ? localMarketItems
    : localMarketItems.filter((i) => i.subcategory === marketSubFilter);
  const marketSections = groupBySubcategory(marketDisplayItems);

  const selectCategory = (c) => {
    setCategory(c);
    setMarketCart({});
    setMarketSubFilter("All");
  };

  const add = (id) => setMarketCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const remove = (id) => setMarketCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const marketCount = Object.values(marketCart).reduce((a, b) => a + b, 0);
  const marketTotal = localMarketItems.reduce((s, i) => s + (marketCart[i.id] || 0) * i.price, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <Pressable key={c} onPress={() => selectCategory(c)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLocalMarket ? (
        localMarketVendor ? (
        <>
          <SectionList
            sections={marketSections}
            keyExtractor={(i) => i.id}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <Thumb emoji={localMarketVendor.emoji} category="Local Market" size={48} />
                  <Text style={styles.cardTitle}>{localMarketVendor.name}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <Pill tone="indigo">{localMarketVendor.area}</Pill>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute }}>{localMarketVendor.eta}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {marketSubcategories.map((s) => {
                    const active = s === marketSubFilter;
                    return (
                      <Pressable key={s} onPress={() => setMarketSubFilter(s)} style={[styles.chip, active && styles.chipActive]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            }
            renderSectionHeader={({ section }) =>
              marketSubFilter === "All" ? (
                <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
              ) : null
            }
            contentContainerStyle={{ padding: 16, paddingBottom: marketCount > 0 ? 100 : 16 }}
            renderItem={({ item }) => (
              <View style={[styles.itemRow, item.isAvailable === false && { opacity: 0.5 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Thumb emoji={item.emoji} category="Local Market" />
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{fmtNaira(item.price)}</Text>
                  </View>
                </View>
                {item.isAvailable === false ? (
                  <Text style={{ fontSize: 12, color: COLORS.mute, fontWeight: "600" }}>Unavailable</Text>
                ) : marketCart[item.id] ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Pressable onPress={() => remove(item.id)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>{"\u2212"}</Text></Pressable>
                    <Text style={{ minWidth: 16, textAlign: "center", fontWeight: "700" }}>{marketCart[item.id]}</Text>
                    <Pressable onPress={() => add(item.id)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => add(item.id)} style={styles.addBtn}><Text style={styles.addBtnText}>Add</Text></Pressable>
                )}
              </View>
            )}
          />
          {marketCount > 0 && (
            <Pressable
              style={styles.cartBar}
              onPress={() => navigation.navigate("Cart", { vendorId: localMarketVendor.id, cart: marketCart })}
            >
              <Text style={styles.cartBarText}>View cart {"\u00B7"} {marketCount} item{marketCount > 1 ? "s" : ""}</Text>
              <Text style={styles.cartBarText}>{fmtNaira(marketTotal)}</Text>
            </Pressable>
          )}
        </>
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: COLORS.mute }}>Local Market is not available yet.</Text>
          </View>
        )
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={{ color: COLORS.mute }}>No vendors in this category yet.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("VendorMenu", { vendorId: item.id })}>
              <Thumb emoji={item.emoji} category={item.category} size={52} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardRating}>{"\u2605"} {item.rating}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Pill tone="indigo">{item.area}</Pill>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute }}>{item.eta}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: { paddingVertical: 12 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line,
  },
  tabActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  tabText: { fontSize: 13.5, fontWeight: "600", color: COLORS.ink },
  tabTextActive: { color: "#fff" },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line,
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12.5, fontWeight: "600", color: COLORS.ink },
  chipTextActive: { color: "#fff" },
  sectionHeader: { fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginBottom: 4, marginTop: 6 },
  card: {
    backgroundColor: COLORS.panel, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.line, flexDirection: "row", alignItems: "center", gap: 14,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  cardTitle: { fontWeight: "700", fontSize: 15.5, color: COLORS.ink },
  cardRating: { fontSize: 12, color: COLORS.mute },
  itemRow: {
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
});
