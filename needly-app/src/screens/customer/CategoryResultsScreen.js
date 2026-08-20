import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CATEGORIES, MARKETPLACE_SHORTCUTS } from "../../data/mockData";
import { SERVICE_CATEGORIES } from "../../data/serviceData";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { Pill } from "../../components/Pill";
import { useOrders } from "../../context/OrdersContext";
import { CATEGORY_AVATAR_IMAGES } from "../../data/customerAssets";

const PURPLE = "#6F45E9";
const INK = "#15183F";

const CATEGORY_AVATARS = {
  Supermarket: "🛍️",
  Restaurant: "🥗",
  "Home Services": "🏠",
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
  const { vendors } = useOrders();
  const isBuy = CATEGORIES.includes(category);
  const compact = width < 390;
  const categoryVendors = vendors.filter((v) => v.category === category);
  const providers = SERVICE_CATEGORIES[category] || [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroAvatarWrap, compact && styles.heroAvatarWrapCompact]}>
          {CATEGORY_AVATAR_IMAGES[category] ? (
            <Image source={CATEGORY_AVATAR_IMAGES[category]} style={styles.heroAvatarImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.heroAvatarText, compact && styles.heroAvatarTextCompact]}>{CATEGORY_AVATARS[category] || shortcut?.emoji || "🛍️"}</Text>
          )}
        </View>
        <View style={[styles.headerRow, compact && styles.headerRowCompact]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.overline, compact && styles.overlineCompact]}>{shortcut?.flow || "BROWSE"}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.title, compact && styles.titleCompact]}>{shortcut?.title || category}</Text>
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{shortcut?.subtitle}</Text>
          </View>
          <Pill tone="indigo">{isBuy ? `${categoryVendors.length} vendors` : `${providers.length} providers`}</Pill>
        </View>

        {isBuy ? (
          <View style={styles.list}>
            {categoryVendors.length === 0 && <Text style={styles.empty}>No vendors available yet.</Text>}
            {categoryVendors.map((vendor) => (
              <Pressable key={vendor.id} style={[styles.card, compact && styles.cardCompact]} onPress={() => navigation.navigate("VendorMenu", { vendorId: vendor.id })}>
                <View style={[styles.cardAvatar, compact && styles.cardAvatarCompact]}><Text style={[styles.cardAvatarText, compact && styles.cardAvatarTextCompact]}>{vendor.emoji || CATEGORY_AVATARS[vendor.category] || "🛍️"}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{vendor.name}</Text>
                  <Text numberOfLines={1} style={[styles.meta, compact && styles.metaCompact]}>{vendor.area} · {vendor.eta} · ★ {vendor.rating}</Text>
                  {vendor.address && <Text numberOfLines={2} style={[styles.address, compact && styles.addressCompact]}>📍 {vendor.address}</Text>}
                </View>
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
                  <Text numberOfLines={1} style={[styles.meta, compact && styles.metaCompact]}>{provider.area} · {provider.distance} · ★ {provider.rating}</Text>
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 122 },
  contentCompact: { padding: 14, paddingBottom: 118 },
  heroAvatarWrap: {
    width: 156, height: 156, borderRadius: 78, padding: 6, backgroundColor: "transparent",
    alignSelf: "center", marginBottom: 18,
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarWrapCompact: { width: 126, height: 126, borderRadius: 63, marginBottom: 12 },
  heroAvatarImage: { width: "120%", height: "120%" },
  heroAvatarText: { fontSize: 82 },
  heroAvatarTextCompact: { fontSize: 64 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  headerRowCompact: { gap: 8, marginBottom: 12 },
  overline: { color: PURPLE, fontSize: 11, fontWeight: "900", marginBottom: 6 },
  overlineCompact: { fontSize: 9.5, marginBottom: 4 },
  title: { color: INK, fontSize: 25, fontWeight: "900" },
  titleCompact: { fontSize: 21 },
  subtitle: { color: "#5B5B72", fontSize: 13.5, marginTop: 4 },
  subtitleCompact: { fontSize: 12, lineHeight: 16 },
  list: { gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#ECE8F7", backgroundColor: "#fff", borderRadius: 18, padding: 13 },
  cardCompact: { gap: 9, borderRadius: 16, padding: 10 },
  cardAvatar: { width: 62, height: 62, borderRadius: 20, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  cardAvatarCompact: { width: 46, height: 46, borderRadius: 15 },
  cardAvatarImage: { width: "124%", height: "124%" },
  cardAvatarText: { fontSize: 34 },
  cardAvatarTextCompact: { fontSize: 25 },
  cardTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  cardTitleCompact: { fontSize: 13.2 },
  meta: { color: "#5B5B72", fontSize: 12.5, fontWeight: "700", marginTop: 4 },
  metaCompact: { fontSize: 11.2, marginTop: 3 },
  address: { color: "#77778D", fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  addressCompact: { fontSize: 11, lineHeight: 14.5, marginTop: 3 },
  empty: { color: "#77778D", fontSize: 13.5 },
  comingSoonCard: { borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 16, backgroundColor: "#F8F5FF" },
});
