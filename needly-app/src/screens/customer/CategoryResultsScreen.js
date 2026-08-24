import React from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CATEGORIES, MARKETPLACE_SHORTCUTS } from "../../data/mockData";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { Pill } from "../../components/Pill";
import { useOrders } from "../../context/OrdersContext";
import { CATEGORY_AVATAR_IMAGES, CATEGORY_IMAGES } from "../../data/customerAssets";
import { fmtNaira } from "../../theme/colors";

const PURPLE = "#6F45E9";
const PURPLE_DARK = "#35109B";
const INK = "#15183F";
const MUTED = "#6F7188";

const CATEGORY_AVATARS = {
  Supermarket: "🛍️",
  Restaurant: "🥗",
  "Home Services": "🏠",
  Services: "🧰",
  Auto: "🚙",
  Pharmacy: "💊",
  "Stay & Dine": "🏨",
  Learn: "🎓",
  Utilities: "💧",
  "Local Market": "🥦",
  Grills: "🍖",
};

export default function CategoryResultsScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const category = route.params?.category || "Auto";
  const shortcut = MARKETPLACE_SHORTCUTS.find((s) => s.key === category);
  const { vendors, serviceProviders = [], loading } = useOrders();
  const isBuy = CATEGORIES.includes(category);
  const compact = width < 390;
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const categoryVendors = vendors.filter((v) => v.category === category);
  const providers = serviceProviders.filter((provider) => category === "Services" ? true : provider.category === category);
  const isOpenMarket = category === "Local Market";
  const heroImage = isOpenMarket ? CATEGORY_IMAGES["Open Market Hero"] : CATEGORY_IMAGES[category];
  const title = shortcut?.title || category;
  const subtitle = isOpenMarket
    ? "Fresh produce, foodstuff and trusted local sellers around Abeokuta."
    : shortcut?.subtitle;

  return (
    <View style={styles.screen}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }, compact && styles.contentCompact]} showsVerticalScrollIndicator={false}>
        <ImageBackground source={heroImage || CATEGORY_IMAGES.Restaurant} style={[styles.hero, compact && styles.heroCompact]} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroTop}>
            <Pressable style={styles.backCircle} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{isBuy ? `${categoryVendors.length} vendors` : `${providers.length} providers`}</Text>
            </View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.overline}>{shortcut?.flow || "BROWSE"}</Text>
            <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            <Text numberOfLines={3} style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
          </View>
        </ImageBackground>

        {isOpenMarket && (
          <View style={styles.marketInfo}>
            <View style={styles.marketIcon}>
              <Text style={styles.marketIconText}>🥬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.marketInfoTitle}>Fresh from Abeokuta markets</Text>
              <Text style={styles.marketInfoSub}>Tap a seller to view tomatoes, peppers, garri, yam, eggs and more.</Text>
            </View>
          </View>
        )}

        {isBuy ? (
          <View style={styles.list}>
            {loading && categoryVendors.length === 0 && (
              <View style={styles.emptyCard}>
                <ActivityIndicator color={PURPLE} />
                <Text style={styles.emptyTitle}>Loading sellers</Text>
                <Text style={styles.empty}>Checking available vendors and products near you.</Text>
              </View>
            )}
            {!loading && categoryVendors.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🛒</Text>
                <Text style={styles.emptyTitle}>No sellers available yet</Text>
                <Text style={styles.empty}>Once vendors are approved and products are added, they will appear here automatically.</Text>
              </View>
            )}
            {categoryVendors.map((vendor) => (
              <Pressable key={vendor.id} style={[styles.card, compact && styles.cardCompact]} onPress={() => navigation.navigate("VendorMenu", { vendorId: vendor.id })}>
                <View style={[styles.cardAvatar, compact && styles.cardAvatarCompact]}>
                  {CATEGORY_AVATAR_IMAGES[category] ? (
                    <Image source={CATEGORY_AVATAR_IMAGES[category]} style={styles.cardAvatarImage} resizeMode="contain" />
                  ) : (
                    <Text style={[styles.cardAvatarText, compact && styles.cardAvatarTextCompact]}>{vendor.emoji || CATEGORY_AVATARS[vendor.category] || "🛍️"}</Text>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text numberOfLines={1} style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{vendor.name}</Text>
                    <Text style={[styles.openBadge, !vendor.isOpen && styles.closedBadge]}>{vendor.isOpen ? "Open" : "Closed"}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.meta, compact && styles.metaCompact]}>
                    {[vendor.area, vendor.eta, vendor.rating ? `★ ${vendor.rating}` : null].filter(Boolean).join(" · ")}
                  </Text>
                  {vendor.address && <Text numberOfLines={2} style={[styles.address, compact && styles.addressCompact]}>📍 {vendor.address}</Text>}
                  <View style={styles.productPreviewRow}>
                    {(vendor.items || []).slice(0, 3).map((item) => (
                      <View key={item.id} style={styles.productChip}>
                        <Text numberOfLines={1} style={styles.productChipText}>{item.name}</Text>
                        <Text style={styles.productChipPrice}>{fmtNaira(item.price)}</Text>
                      </View>
                    ))}
                    {(vendor.items || []).length === 0 && <Text style={styles.noProducts}>Products coming soon</Text>}
                  </View>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : providers.length > 0 ? (
          <View style={styles.list}>
            {providers.map((provider) => (
              <Pressable key={provider.id} style={[styles.card, compact && styles.cardCompact]} onPress={() => navigation.navigate("AutoBooking", { providerId: provider.id })}>
                <View style={[styles.cardAvatar, compact && styles.cardAvatarCompact]}>
                  {CATEGORY_AVATAR_IMAGES[category] ? (
                    <Image source={CATEGORY_AVATAR_IMAGES[category]} style={styles.cardAvatarImage} resizeMode="contain" />
                  ) : (
                    <Text style={[styles.cardAvatarText, compact && styles.cardAvatarTextCompact]}>{CATEGORY_AVATARS[category] || "🚙"}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{provider.name}</Text>
                  <Text numberOfLines={1} style={[styles.meta, compact && styles.metaCompact]}>
                    {[provider.area, provider.distance, provider.eta, provider.rating ? `★ ${provider.rating}` : null].filter(Boolean).join(" · ")}
                  </Text>
                  <Text numberOfLines={2} style={[styles.address, compact && styles.addressCompact]}>{provider.services.map((s) => s.name).slice(0, 3).join(", ")}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.comingSoonCard}>
            <Text style={styles.cardTitle}>Provider onboarding needed</Text>
            <Text style={styles.address}>This category needs verified providers, service pricing, and availability before launch.</Text>
          </View>
        )}
      </ScrollView>
      <CustomerBottomNav navigation={navigation} active="CategoryResults" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 122 },
  contentCompact: { paddingTop: 10, paddingBottom: 118 },
  hero: { height: 236, borderRadius: 28, overflow: "hidden", marginBottom: 14, backgroundColor: PURPLE_DARK },
  heroCompact: { height: 214, borderRadius: 24 },
  heroImage: { borderRadius: 28 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17, 18, 58, 0.42)" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: PURPLE, fontSize: 30, lineHeight: 31, fontWeight: "800" },
  countPill: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.92)" },
  countPillText: { color: INK, fontSize: 12, fontWeight: "900" },
  heroCopy: { position: "absolute", left: 18, right: 18, bottom: 18 },
  overline: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.6, marginBottom: 4 },
  title: { color: "#FFFFFF", fontSize: 32, lineHeight: 34, fontWeight: "900", marginBottom: 5 },
  titleCompact: { fontSize: 27, lineHeight: 30 },
  subtitle: { color: "rgba(255,255,255,0.92)", fontSize: 13.5, lineHeight: 19, maxWidth: 330 },
  subtitleCompact: { fontSize: 12.5, lineHeight: 17 },
  marketInfo: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F7F3FF", borderWidth: 1, borderColor: "#E7DCFF", borderRadius: 20, padding: 12, marginBottom: 14 },
  marketIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  marketIconText: { fontSize: 27 },
  marketInfoTitle: { color: INK, fontSize: 14, fontWeight: "900", marginBottom: 2 },
  marketInfoSub: { color: MUTED, fontSize: 12.2, lineHeight: 17 },
  list: { gap: 11 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#ECE8F7",
    backgroundColor: "#fff", borderRadius: 22, padding: 13,
    shadowColor: "#2B145F", shadowOpacity: 0.07, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  cardCompact: { gap: 9, borderRadius: 18, padding: 10 },
  cardAvatar: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  cardAvatarCompact: { width: 50, height: 50, borderRadius: 16 },
  cardAvatarImage: { width: "124%", height: "124%" },
  cardAvatarText: { fontSize: 34 },
  cardAvatarTextCompact: { fontSize: 27 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { color: INK, fontSize: 15.5, fontWeight: "900", flex: 1 },
  cardTitleCompact: { fontSize: 13.5 },
  openBadge: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#DCFCE7", color: "#078047", fontSize: 9.5, fontWeight: "900" },
  closedBadge: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  meta: { color: "#5B5B72", fontSize: 12.2, fontWeight: "800", marginTop: 4 },
  metaCompact: { fontSize: 11.2, marginTop: 3 },
  address: { color: "#77778D", fontSize: 11.8, lineHeight: 16, marginTop: 4 },
  addressCompact: { fontSize: 11, lineHeight: 14.5, marginTop: 3 },
  productPreviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  productChip: { maxWidth: "48%", borderRadius: 12, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#ECE8F7", paddingHorizontal: 8, paddingVertical: 5 },
  productChipText: { color: INK, fontSize: 10.5, fontWeight: "800" },
  productChipPrice: { color: PURPLE, fontSize: 10, fontWeight: "900", marginTop: 1 },
  noProducts: { color: MUTED, fontSize: 11.5, fontStyle: "italic" },
  cardArrow: { color: PURPLE, fontSize: 28, fontWeight: "700", marginLeft: -3 },
  emptyCard: { alignItems: "center", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#ECE8F7", backgroundColor: "#FBFAFF" },
  emptyIcon: { fontSize: 30, marginBottom: 6 },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: "900", marginTop: 6, marginBottom: 4 },
  empty: { color: "#77778D", fontSize: 13, textAlign: "center", lineHeight: 18 },
  comingSoonCard: { borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 16, backgroundColor: "#F8F5FF" },
});
