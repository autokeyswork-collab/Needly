import React, { useMemo, useState } from "react";
import { Image, ImageBackground, Pressable, ScrollView, SectionList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { fmtNaira } from "../../theme/colors";
import Thumb from "../../components/Thumb";
import { CATEGORY_IMAGES } from "../../data/customerAssets";
import { useOrders } from "../../context/OrdersContext";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#24105F";
const INK = "#11123A";
const MUTED = "#747792";
const LINE = "#EEEAF8";
const MANGO = "#F59E0B";

const CATEGORY_FALLBACK = {
  Supermarket: CATEGORY_IMAGES.Supermarket,
  Restaurant: CATEGORY_IMAGES.Restaurant,
  "Home Services": CATEGORY_IMAGES["Home Services"],
  Auto: CATEGORY_IMAGES.Auto,
  Pharmacy: CATEGORY_IMAGES.Pharmacy,
  "Stay & Dine": CATEGORY_IMAGES["Stay & Dine"],
  Learn: CATEGORY_IMAGES.Learn,
  Utilities: CATEGORY_IMAGES.Utilities,
  "Local Market": CATEGORY_IMAGES["Open Market Hero"] || CATEGORY_IMAGES["Local Market"],
  Grills: CATEGORY_IMAGES.Grills,
};

function groupBySubcategory(items) {
  const order = [];
  const map = {};
  (items || []).forEach((item) => {
    const key = item.subcategory || "Menu";
    if (!map[key]) {
      map[key] = [];
      order.push(key);
    }
    map[key].push(item);
  });
  return order.map((key) => ({ title: key, data: map[key] }));
}

export default function VendorMenuScreen({ route, navigation }) {
  const { vendorId } = route.params || {};
  const { vendors } = useOrders();
  const { width } = useWindowDimensions();
  const vendor = (vendors || []).find((v) => v.id === vendorId);
  const [cart, setCart] = useState({});
  const [subFilter, setSubFilter] = useState("All");
  const shellWidth = Math.min(width, 430);
  const compact = shellWidth < 390;
  const sidePad = shellWidth < 370 ? 14 : 18;

  const items = vendor?.items || [];
  const availableCount = items.filter((item) => item.isAvailable !== false).length;
  const hasSubcategories = items.some((item) => item.subcategory);
  const subcategories = hasSubcategories ? ["All", ...new Set(items.map((item) => item.subcategory).filter(Boolean))] : [];
  const displayItems = subFilter === "All" ? items : items.filter((item) => item.subcategory === subFilter);
  const sections = useMemo(() => groupBySubcategory(displayItems), [displayItems]);
  const heroImage = CATEGORY_FALLBACK[vendor?.category] || CATEGORY_IMAGES.Restaurant;

  const add = (id) => setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
  const remove = (id) => setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) - 1) }));
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const total = items.reduce((sum, item) => sum + (cart[item.id] || 0) * (item.price || 0), 0);

  if (!vendor) {
    return (
      <View style={styles.page}>
        <View style={[styles.shell, styles.centeredShell]}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={styles.emptyTitle}>Vendor Not Found</Text>
          <Text style={styles.emptyText}>This storefront may have been updated or is temporarily unavailable.</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Browse</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: count > 0 ? 118 : 28 }}
          ListHeaderComponent={
            <>
              <ImageBackground source={heroImage} style={[styles.hero, compact && styles.heroCompact]} imageStyle={styles.heroImage}>
                <View style={styles.heroOverlay} />
                <View style={[styles.heroTop, { paddingHorizontal: sidePad }]}>
                  <Pressable style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backIcon}>‹</Text>
                  </Pressable>
                  <View style={[styles.statusPill, vendor.isOpen === false && styles.closedPill]}>
                    <View style={[styles.statusDot, vendor.isOpen === false && styles.closedDot]} />
                    <Text style={[styles.statusText, vendor.isOpen === false && styles.closedText]}>{vendor.isOpen === false ? "Closed" : "Open"}</Text>
                  </View>
                </View>

                <View style={[styles.heroCopy, { left: sidePad, right: sidePad }]}>
                  <View style={styles.vendorAvatarRow}>
                    <View style={styles.vendorAvatar}>
                      <Thumb emoji={vendor.emoji} category={vendor.category} size={52} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} adjustsFontSizeToFit style={styles.vendorName}>{vendor.name}</Text>
                      <Text numberOfLines={1} style={styles.vendorMeta}>★ {vendor.rating || 4.5} · {vendor.category}</Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>

              <View style={[styles.infoCard, { marginHorizontal: sidePad }]}>
                <View style={styles.infoItem}>
                  <Ionicons name="location" size={17} color={PURPLE} />
                  <Text numberOfLines={1} style={styles.infoText}>{vendor.area || "Abeokuta"}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={17} color={PURPLE} />
                  <Text numberOfLines={1} style={styles.infoText}>{vendor.eta || "20-35 min"}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="basket-outline" size={17} color={PURPLE} />
                  <Text numberOfLines={1} style={styles.infoText}>{availableCount} items</Text>
                </View>
              </View>

              {vendor.address && (
                <View style={[styles.addressCard, { marginHorizontal: sidePad }]}>
                  <Ionicons name="navigate-circle-outline" size={18} color={PURPLE} />
                  <Text numberOfLines={2} style={styles.addressText}>{vendor.address}</Text>
                </View>
              )}

              {vendor.bankAccountLocked && vendor.bankAccountNumber && (
                <View style={[styles.paymentCard, { marginHorizontal: sidePad }]}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="card-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.paymentTitle}>Pay vendor directly</Text>
                    <Text numberOfLines={1} style={styles.paymentName}>{vendor.bankAccountName}</Text>
                    <Text numberOfLines={1} style={styles.paymentDetails}>{vendor.bankName} · {vendor.bankAccountNumber}</Text>
                  </View>
                  <View style={styles.paymentLockedPill}>
                    <Ionicons name="lock-closed" size={11} color={PURPLE} />
                    <Text style={styles.paymentLockedText}>Locked</Text>
                  </View>
                </View>
              )}

              {hasSubcategories && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={[styles.filterContent, { paddingHorizontal: sidePad }]}>
                  {subcategories.map((subcategory) => {
                    const active = subcategory === subFilter;
                    return (
                      <Pressable key={subcategory} onPress={() => setSubFilter(subcategory)} style={[styles.chip, active && styles.chipActive]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{subcategory}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <View style={[styles.menuHeader, { paddingHorizontal: sidePad }]}>
                <Text style={styles.menuTitle}>Menu</Text>
                <Text style={styles.menuSubtitle}>{displayItems.length} item{displayItems.length === 1 ? "" : "s"} available</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { marginHorizontal: sidePad }]}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No items available</Text>
              <Text style={styles.emptyText}>Products added by this vendor will appear here automatically.</Text>
            </View>
          }
          renderSectionHeader={({ section }) =>
            hasSubcategories && subFilter === "All" ? (
              <Text style={[styles.sectionHeader, { marginHorizontal: sidePad }]}>{section.title.toUpperCase()}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const qty = cart[item.id] || 0;
            const unavailable = item.isAvailable === false;
            return (
              <View style={[styles.productCard, { marginHorizontal: sidePad }, unavailable && styles.productCardUnavailable]}>
                <View style={styles.productMedia}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <Thumb emoji={item.emoji} category={vendor.category} size={56} />
                  )}
                </View>

                <View style={styles.productBody}>
                  <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{fmtNaira(item.price)}</Text>
                  {unavailable && <Text style={styles.unavailableText}>Currently unavailable</Text>}
                </View>

                {!unavailable && (
                  qty > 0 ? (
                    <View style={styles.qtyControl}>
                      <Pressable onPress={() => remove(item.id)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <Pressable onPress={() => add(item.id)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => add(item.id)} style={styles.addBtn}>
                      <FontAwesome name="plus" size={12} color="#fff" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  )
                )}
              </View>
            );
          }}
        />

        {count > 0 && (
          <Pressable style={styles.cartBar} onPress={() => navigation.navigate("Cart", { vendorId, cart })}>
            <View>
              <Text style={styles.cartBarText}>View cart</Text>
              <Text style={styles.cartBarSub}>{count} item{count > 1 ? "s" : ""}</Text>
            </View>
            <View style={styles.cartPricePill}>
              <Text style={styles.cartBarPrice}>{fmtNaira(total)}</Text>
              <FontAwesome name="arrow-right" size={13} color="#fff" />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#FFFFFF", overflow: "hidden" },
  centeredShell: { alignItems: "center", justifyContent: "center", padding: 24 },
  hero: { height: 248, backgroundColor: PURPLE_DARK, overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroCompact: { height: 232 },
  heroImage: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17,18,58,0.48)" },
  heroTop: { paddingTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: PURPLE, fontSize: 31, lineHeight: 32, fontWeight: "900" },
  statusPill: { height: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.93)", flexDirection: "row", alignItems: "center", gap: 7 },
  closedPill: { backgroundColor: "rgba(255,255,255,0.88)" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  closedDot: { backgroundColor: "#EF4444" },
  statusText: { color: "#047857", fontSize: 12, fontWeight: "900" },
  closedText: { color: "#B91C1C" },
  heroCopy: { position: "absolute", bottom: 22 },
  vendorAvatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  vendorAvatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.72)" },
  vendorName: { color: "#FFFFFF", fontSize: 28, lineHeight: 31, fontWeight: "900" },
  vendorMeta: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "800", marginTop: 4 },
  infoCard: { marginTop: -24, backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: LINE, paddingVertical: 12, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", shadowColor: PURPLE, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  infoItem: { flex: 1, alignItems: "center", gap: 5, minWidth: 0 },
  infoText: { color: INK, fontSize: 11.5, fontWeight: "900", textAlign: "center" },
  infoDivider: { width: 1, height: 34, backgroundColor: LINE },
  addressCard: { marginTop: 12, backgroundColor: "#F8F5FF", borderRadius: 18, borderWidth: 1, borderColor: "#E9E0FF", padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  addressText: { flex: 1, color: MUTED, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  paymentCard: { marginTop: 12, backgroundColor: "#FBFAFF", borderRadius: 20, borderWidth: 1, borderColor: "#E1D7FF", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  paymentIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#F2ECFF", alignItems: "center", justifyContent: "center" },
  paymentTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  paymentName: { color: INK, fontSize: 12.5, fontWeight: "800", marginTop: 2 },
  paymentDetails: { color: PURPLE, fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  paymentLockedPill: { borderRadius: 999, backgroundColor: "#F2ECFF", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  paymentLockedText: { color: PURPLE, fontSize: 10.5, fontWeight: "900" },
  filterScroll: { marginTop: 14, marginBottom: 4 },
  filterContent: { gap: 8, paddingVertical: 2 },
  chip: { minHeight: 34, borderRadius: 17, paddingHorizontal: 13, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E7DCFF", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { color: INK, fontSize: 12, fontWeight: "900" },
  chipTextActive: { color: "#FFFFFF" },
  menuHeader: { marginTop: 14, marginBottom: 8 },
  menuTitle: { color: INK, fontSize: 20, fontWeight: "900" },
  menuSubtitle: { color: MUTED, fontSize: 12, fontWeight: "800", marginTop: 2 },
  sectionHeader: { color: MUTED, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.6, marginTop: 12, marginBottom: 7 },
  productCard: { minHeight: 88, backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: LINE, padding: 12, marginBottom: 11, flexDirection: "row", alignItems: "center", gap: 11, shadowColor: PURPLE, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  productCardUnavailable: { opacity: 0.62, backgroundColor: "#F8FAFC" },
  productMedia: { width: 60, height: 60, borderRadius: 19, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#F7F3FF" },
  productImage: { width: 60, height: 60, borderRadius: 19, backgroundColor: "#F7F3FF" },
  productBody: { flex: 1, minWidth: 0 },
  itemName: { color: INK, fontSize: 14.5, fontWeight: "900", lineHeight: 19 },
  itemPrice: { color: "#059669", fontSize: 13.5, fontWeight: "900", marginTop: 4 },
  unavailableText: { color: MUTED, fontSize: 11.5, fontWeight: "800", marginTop: 4 },
  addBtn: { minWidth: 62, height: 36, borderRadius: 18, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12 },
  addBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F8F5FF", borderRadius: 18, padding: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7DCFF", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: PURPLE, fontSize: 17, fontWeight: "900", lineHeight: 19 },
  qtyText: { color: INK, minWidth: 16, textAlign: "center", fontSize: 13, fontWeight: "900" },
  cartBar: { position: "absolute", left: 18, right: 18, bottom: 18, minHeight: 66, borderRadius: 24, backgroundColor: PURPLE, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: PURPLE, shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  cartBarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  cartBarSub: { color: "rgba(255,255,255,0.78)", fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  cartPricePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  cartBarPrice: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: LINE, padding: 22, alignItems: "center", marginTop: 10 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { color: INK, fontSize: 17, fontWeight: "900", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 5, marginBottom: 14 },
  backBtn: { backgroundColor: PURPLE, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 11 },
  backBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
