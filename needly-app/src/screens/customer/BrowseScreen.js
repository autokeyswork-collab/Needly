import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { CATEGORIES, MARKETPLACE_SHORTCUTS, TRANSACTION_TRACKS } from "../../data/mockData";
import { COLORS, fmtNaira } from "../../theme/colors";
import { Pill } from "../../components/Pill";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { CATEGORY_AVATAR_IMAGES, CATEGORY_IMAGES } from "../../data/customerAssets";
import { SERVICE_CATEGORIES } from "../../data/serviceData";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrdersContext";

const PURPLE = "#6F45E9";
const INK = "#15183F";

const TILE_TINTS = {
  Supermarket: "#F1F7E9",
  Restaurant: "#FFF1E6",
  "Home Services": "#EEF8FF",
  Auto: "#F2ECFF",
  Pharmacy: "#FCECF2",
  "Stay & Dine": "#FFF5DD",
  Learn: "#EAF8F2",
  Utilities: "#EDF7FF",
  "Local Market": "#F2F8E9",
};

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

const FLOW_STEPS = {
  BUY: [
    ["Choose items", "and add to cart"],
    ["Confirm location", "and delivery fee"],
    ["Pay securely", "then track delivery"],
  ],
  BOOK: [
    ["Choose service", "and preferred date/time"],
    ["Confirm location", "and provider coverage"],
    ["Pay or confirm", "then track the booking status"],
  ],
  RESERVE: [
    ["Choose place", "and date/time"],
    ["Add details", "rooms or people"],
    ["Reserve", "and get confirmation"],
  ],
};

const FLOW_ICONS = {
  BUY: ["🛒", "📍", "💳"],
  BOOK: ["📅", "📍", "💳"],
  RESERVE: ["📅", "👥", "✓"],
};

export default function BrowseScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { vendors } = useOrders();
  const { logout } = useAuth();
  const [category, setCategory] = useState("Restaurant");
  const [searchQuery, setSearchQuery] = useState("");
  const selectedShortcut = MARKETPLACE_SHORTCUTS.find((s) => s.key === category) || MARKETPLACE_SHORTCUTS[0];
  const selectedTrack = TRANSACTION_TRACKS.find((t) => t.label === selectedShortcut.flow);
  const hasLiveBuyFlow = CATEGORIES.includes(category);
  const serviceProviders = SERVICE_CATEGORIES[category] || [];
  const allVendors = vendors || [];
  const filtered = hasLiveBuyFlow ? allVendors.filter((v) => (v.category || "").toLowerCase() === (category || "").toLowerCase()) : [];
  const previewVendors = useMemo(() => filtered.slice(0, 4), [filtered]);
  const previewProviders = useMemo(() => serviceProviders.slice(0, 3), [serviceProviders]);
  const steps = FLOW_STEPS[selectedShortcut.flow] || FLOW_STEPS.BUY;
  const icons = FLOW_ICONS[selectedShortcut.flow] || FLOW_ICONS.BUY;
  const isCompact = width < 390;
  const isTiny = width < 360;
  const isNarrow = width < 360;
  const tileWidth = "31.3%";
  const contentPadding = isTiny ? 10 : isCompact ? 14 : 18;
  const compactFeature = width < 390;
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    // 1. Category matches
    const categoryHits = MARKETPLACE_SHORTCUTS
      .filter((s) => [s.title, s.subtitle, s.key, s.flow].some((val) => val.toLowerCase().includes(q)))
      .map((shortcut) => ({ type: "category", shortcut }));

    // 2. Vendor matches
    const vendorHits = (allVendors || [])
      .filter((v) => [v.name, v.area, v.category, v.address].filter(Boolean).some((val) => val.toLowerCase().includes(q)))
      .map((vendor) => ({ type: "vendor", vendor }));

    // 3. Product matches (with defensive check for items array)
    const productHits = (allVendors || []).flatMap((vendor) =>
      (vendor.items || [])
        .filter((item) => [item.name, item.subcategory, vendor.name, vendor.category].filter(Boolean).some((val) => val.toLowerCase().includes(q)))
        .map((item) => ({ type: "product", vendor, item }))
    );

    // 4. Service / Provider matches
    const serviceHits = Object.entries(SERVICE_CATEGORIES || {}).flatMap(([serviceCategory, providers]) =>
      (providers || []).flatMap((provider) => {
        const providerMatch = [provider.name, provider.area, serviceCategory].filter(Boolean).some((val) => val.toLowerCase().includes(q));
        const serviceMatches = (provider.services || []).filter((service) => service.name.toLowerCase().includes(q));
        if (providerMatch) return [{ type: "serviceProvider", serviceCategory, provider }];
        return serviceMatches.map((service) => ({ type: "service", serviceCategory, provider, service }));
      })
    );

    return [...categoryHits, ...vendorHits, ...productHits, ...serviceHits].slice(0, 10);
  }, [searchQuery, vendors]);

  const openCategory = () => navigation.navigate("CategoryResults", { category });

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingHorizontal: contentPadding }]}>
        <View style={[styles.locationCard, isCompact && styles.locationCardCompact, isTiny && styles.locationCardTiny]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.overline, isCompact && styles.overlineCompact]}>DELIVER OR SERVE AT</Text>
            <Text numberOfLines={1} style={[styles.locationText, isTiny && styles.locationTextTiny]}>📍 Abeokuta launch city⌄</Text>
          </View>
          <Pressable style={[styles.logoutGhost, isCompact && styles.logoutGhostCompact, isTiny && styles.logoutGhostTiny]} onPress={logout}>
            <Text style={[styles.logoutText, isCompact && styles.logoutTextCompact]}>↪ Log out</Text>
          </Pressable>
        </View>

        <View style={[styles.searchPanel, isCompact && styles.searchPanelCompact, isTiny && styles.searchPanelTiny]}>
          <Text style={[styles.heroTitle, isTiny && styles.heroTitleTiny]}>What do you need today?</Text>
          <View style={[styles.searchBox, isCompact && styles.searchBoxCompact]}>
            <Text style={[styles.searchIcon, isCompact && styles.searchIconCompact]}>⌕</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for food, groceries, services, pharmacies..."
              placeholderTextColor="#7D7D8B"
              style={[styles.searchInput, isCompact && styles.searchInputCompact]}
            />
            {!!searchQuery && (
              <Pressable style={[styles.filterButton, isTiny && styles.filterButtonTiny]} onPress={() => setSearchQuery("")}>
                <Text style={styles.filterText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!!searchQuery.trim() && (
          <View style={styles.searchResults}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: PURPLE }}>{searchResults.length} found</Text>
            </View>

            {searchResults.length === 0 && (
              <Text style={styles.emptyText}>No vendors, products, or services found for "{searchQuery}".</Text>
            )}

            {searchResults.map((result, index) => {
              if (result.type === "category") {
                return (
                  <Pressable
                    key={`cat-${result.shortcut.key}`}
                    style={styles.resultRow}
                    onPress={() => {
                      setCategory(result.shortcut.key);
                      setSearchQuery("");
                    }}
                  >
                    <View style={[styles.resultAvatar, { backgroundColor: "#F3E8FF" }]}>
                      <Text style={styles.resultAvatarText}>{result.shortcut.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{result.shortcut.title}</Text>
                      <Text style={styles.resultMeta}>Category · {result.shortcut.subtitle}</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: PURPLE, fontWeight: "800" }}>›</Text>
                  </Pressable>
                );
              }

              if (result.type === "vendor") {
                const avatar = CATEGORY_AVATARS[result.vendor.category] || result.vendor.emoji || "🛍️";
                return (
                  <Pressable
                    key={`vendor-${result.vendor.id}`}
                    style={styles.resultRow}
                    onPress={() => {
                      setSearchQuery("");
                      navigation.navigate("VendorMenu", { vendorId: result.vendor.id });
                    }}
                  >
                    <View style={styles.resultAvatar}>
                      <Text style={styles.resultAvatarText}>{avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{result.vendor.name}</Text>
                      <Text style={styles.resultMeta}>{result.vendor.category} · {result.vendor.area} · ★ {result.vendor.rating}</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: PURPLE, fontWeight: "800" }}>›</Text>
                  </Pressable>
                );
              }

              if (result.type === "product") {
                return (
                  <Pressable
                    key={`product-${result.item.id}-${index}`}
                    style={styles.resultRow}
                    onPress={() => {
                      setSearchQuery("");
                      navigation.navigate("VendorMenu", { vendorId: result.vendor.id });
                    }}
                  >
                    <View style={styles.resultAvatar}>
                      <Text style={styles.resultAvatarText}>{result.item.emoji || CATEGORY_AVATARS[result.vendor.category] || "🛍️"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{result.item.name}</Text>
                      <Text style={styles.resultMeta}>{fmtNaira(result.item.price)} · {result.vendor.name}</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: PURPLE, fontWeight: "800" }}>›</Text>
                  </Pressable>
                );
              }

              const provider = result.provider;
              const service = result.service;
              return (
                <Pressable
                  key={`${result.type}-${provider.id}-${service?.id || index}`}
                  style={styles.resultRow}
                  onPress={() => {
                    setSearchQuery("");
                    navigation.navigate("AutoBooking", { providerId: provider.id, serviceId: service?.id });
                  }}
                >
                  <View style={styles.resultAvatar}><Text style={styles.resultAvatarText}>🚙</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{service?.name || provider.name}</Text>
                    <Text style={styles.resultMeta}>{provider.name} · {provider.area} · ★ {provider.rating}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: PURPLE, fontWeight: "800" }}>›</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={[styles.sectionHeader, isTiny && styles.sectionHeaderTiny]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.overline}>CATEGORY</Text>
            <Text numberOfLines={1} style={[styles.sectionTitle, isTiny && styles.sectionTitleTiny]}>Browse Needly</Text>
          </View>
          <Pressable style={[styles.viewAllButton, isCompact && styles.viewAllButtonCompact]} onPress={openCategory}>
            <Text style={[styles.viewAllText, isCompact && styles.viewAllTextCompact]}>View all ›</Text>
          </Pressable>
        </View>

        <View style={styles.categoryGrid}>
          {MARKETPLACE_SHORTCUTS.map((item) => {
            const active = item.key === category;
            return (
              <Pressable
                key={item.key}
                onPress={() => setCategory(item.key)}
                style={[
                  styles.categoryTile,
                  { width: tileWidth },
                  { backgroundColor: TILE_TINTS[item.key] || "#F8F7FE" },
                  isCompact && styles.categoryTileCompact,
                  isTiny && styles.categoryTileTiny,
                  active && styles.categoryTileActive,
                ]}
              >
                <View style={[styles.tileAvatar, isCompact && styles.tileAvatarCompact, isTiny && styles.tileAvatarTiny]}>
                  {CATEGORY_AVATAR_IMAGES[item.key] ? (
                    <Image source={CATEGORY_AVATAR_IMAGES[item.key]} style={styles.tileAvatarImage} resizeMode="contain" />
                  ) : (
                    <Text style={[styles.tileAvatarText, isCompact && styles.tileAvatarTextCompact, isTiny && styles.tileAvatarTextTiny]}>{CATEGORY_AVATARS[item.key] || item.emoji}</Text>
                  )}
                </View>
                <View style={[styles.tileCopy, isCompact && styles.tileCopyCompact]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tileTitle, isCompact && styles.tileTitleCompact, isTiny && styles.tileTitleTiny]}>{item.title}</Text>
                  <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.tileSubtitle, isCompact && styles.tileSubtitleCompact, isTiny && styles.tileSubtitleTiny]}>{item.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.featureCard, isCompact && styles.featureCardCompact, isTiny && styles.featureCardTiny]}>
          <View style={[styles.featureTop, compactFeature && styles.featureTopCompact]}>
            <View style={[styles.featureCopy, compactFeature && styles.featureCopyCompact]}>
              <View style={styles.flowPill}>
                <Text style={[styles.flowPillText, isCompact && styles.flowPillTextCompact]}>{selectedShortcut.flow === "BUY" ? "🛒" : selectedShortcut.flow === "BOOK" ? "▣" : "◎"} {selectedShortcut.flow}</Text>
              </View>
              <Text style={[styles.featureTitle, isTiny && styles.featureTitleTiny]}>{selectedShortcut.title}</Text>
              <Text style={[styles.featureSubtitle, compactFeature && styles.featureSubtitleCompact]}>{selectedTrack?.detail || selectedShortcut.subtitle}</Text>
            </View>
            <Image source={CATEGORY_IMAGES[selectedShortcut.key] || CATEGORY_IMAGES.Auto} style={[styles.featureImage, compactFeature && styles.featureImageCompact]} resizeMode="cover" />
            <Pressable style={[styles.nextButton, compactFeature && styles.nextButtonCompact]} onPress={openCategory}>
              <Text style={styles.nextText}>›</Text>
            </Pressable>
          </View>

          <View style={[styles.stepsCard, isNarrow && styles.stepsCardNarrow]}>
            {steps.map(([title, detail], index) => (
              <View key={title} style={[styles.stepItem, isNarrow && styles.stepItemNarrow]}>
                <View style={[styles.stepIconWrap, isTiny && styles.stepIconWrapTiny]}>
                  <Text style={styles.stepIcon}>{icons[index]}</Text>
                </View>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDetail}>{detail}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.vendorHeader, isCompact && styles.vendorHeaderCompact, isTiny && styles.vendorHeaderTiny]}>
          <Text style={[styles.sectionTitle, isTiny && styles.sectionTitleTiny, { flex: 1 }]}>
            {hasLiveBuyFlow ? `${selectedShortcut.title} vendors` : serviceProviders.length ? `${selectedShortcut.title} providers` : `${selectedShortcut.title} is coming`}
          </Text>
          {hasLiveBuyFlow && <Pill tone="indigo">{filtered.length} available</Pill>}
          {!hasLiveBuyFlow && serviceProviders.length > 0 && <Pill tone="indigo">{serviceProviders.length} available</Pill>}
        </View>

        {!hasLiveBuyFlow && serviceProviders.length === 0 ? (
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonTitle}>Provider onboarding needed</Text>
            <Text style={styles.comingSoonText}>
              This category needs verified providers, scheduling, pricing rules, and location coverage before customers can book it.
            </Text>
          </View>
        ) : hasLiveBuyFlow ? (
          <View style={styles.vendorList}>
            {previewVendors.length === 0 && <Text style={styles.emptyText}>No vendors in this category yet.</Text>}
            {previewVendors.map((item) => (
              <Pressable key={item.id} style={styles.vendorCard} onPress={() => navigation.navigate("VendorMenu", { vendorId: item.id })}>
                <View style={[styles.vendorAvatar, isTiny && styles.vendorAvatarTiny]}>
                  <Text style={[styles.vendorAvatarText, isTiny && styles.vendorAvatarTextTiny]}>{item.emoji || CATEGORY_AVATARS[item.category] || "🛍️"}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={styles.vendorCardHeader}>
                    <Text style={styles.vendorName}>{item.name}</Text>
                    <Text style={styles.vendorRating}>★ {item.rating}</Text>
                  </View>
                  <Text style={styles.vendorMeta}>{item.area} · {item.eta}</Text>
                  {item.address && <Text style={styles.vendorAddress}>📍 {item.address}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.vendorList}>
            {previewProviders.map((provider) => (
              <Pressable key={provider.id} style={styles.vendorCard} onPress={() => navigation.navigate("AutoBooking", { providerId: provider.id })}>
                <View style={[styles.vendorAvatar, isTiny && styles.vendorAvatarTiny]}>
                  <Text style={[styles.vendorAvatarText, isTiny && styles.vendorAvatarTextTiny]}>{CATEGORY_AVATARS[category] || selectedShortcut.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={styles.vendorCardHeader}>
                    <Text style={styles.vendorName}>{provider.name}</Text>
                    <Text style={styles.vendorRating}>★ {provider.rating}</Text>
                  </View>
                  <Text style={styles.vendorMeta}>{provider.area} · {provider.distance} · {provider.eta}</Text>
                  <Text style={styles.vendorAddress}>{provider.services.map((s) => s.name).slice(0, 2).join(", ")}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <CustomerBottomNav navigation={navigation} active="Browse" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 122 },
  locationCard: {
    borderWidth: 1, borderColor: "#E9E2FA", borderRadius: 20, padding: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff",
    gap: 10,
  },
  locationCardCompact: { padding: 13, borderRadius: 18, gap: 8 },
  locationCardTiny: { padding: 12, borderRadius: 17 },
  overline: { color: PURPLE, fontSize: 11, fontWeight: "900", marginBottom: 8 },
  overlineCompact: { fontSize: 9.5, marginBottom: 6 },
  locationText: { color: INK, fontSize: 17, fontWeight: "800" },
  locationTextTiny: { fontSize: 14.5 },
  logoutGhost: { backgroundColor: "#F7F2FF", borderWidth: 1, borderColor: "#E2D7FF", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  logoutGhostCompact: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15 },
  logoutGhostTiny: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 15 },
  logoutText: { color: PURPLE, fontSize: 13.5, fontWeight: "800" },
  logoutTextCompact: { fontSize: 12 },
  searchPanel: { marginTop: 18, backgroundColor: "#F3EFFD", borderRadius: 24, padding: 18, gap: 16 },
  searchPanelCompact: { marginTop: 14, borderRadius: 21, padding: 15, gap: 12 },
  searchPanelTiny: { padding: 14, borderRadius: 20 },
  heroTitle: { color: INK, fontSize: 21, lineHeight: 26, fontWeight: "900" },
  heroTitleTiny: { fontSize: 19, lineHeight: 24 },
  searchBox: {
    backgroundColor: "#fff", borderRadius: 28, minHeight: 58, paddingLeft: 16, paddingRight: 6,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  searchBoxCompact: { minHeight: 50, borderRadius: 25, paddingLeft: 12, gap: 7 },
  searchIcon: { color: "#88889A", fontSize: 28, marginTop: -2 },
  searchIconCompact: { fontSize: 23 },
  searchInput: { flex: 1, color: "#777", fontSize: 14.5 },
  searchInputCompact: { fontSize: 12.5 },
  filterButton: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center", shadowColor: PURPLE, shadowOpacity: 0.22,
    shadowRadius: 12, shadowOffset: { width: 0, height: 7 },
  },
  filterButtonTiny: { width: 46, height: 46, borderRadius: 23 },
  filterText: { color: "#fff", fontSize: 23, fontWeight: "900" },
  searchResults: { marginTop: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 20, padding: 12, gap: 8 },
  resultsTitle: { color: INK, fontSize: 14, fontWeight: "900", marginBottom: 2 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1EEF9" },
  resultAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  resultAvatarText: { fontSize: 25 },
  resultTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  resultMeta: { color: "#696A7C", fontSize: 12, marginTop: 2 },
  sectionHeader: { marginTop: 24, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeaderTiny: { gap: 10 },
  sectionTitle: { color: INK, fontSize: 21, fontWeight: "900" },
  sectionTitleTiny: { fontSize: 18 },
  viewAllButton: { borderWidth: 1, borderColor: "#DED4FB", backgroundColor: "#F8F5FF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  viewAllButtonCompact: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 17 },
  viewAllText: { color: PURPLE, fontSize: 13.5, fontWeight: "900" },
  viewAllTextCompact: { fontSize: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryTile: {
    minHeight: 104, borderRadius: 18, padding: 10, borderWidth: 1,
    borderColor: "rgba(111,69,233,0)", flexDirection: "row", alignItems: "center", gap: 9,
  },
  categoryTileCompact: { minHeight: 88, borderRadius: 16, padding: 7, gap: 5 },
  categoryTileTiny: { minHeight: 82, borderRadius: 15, padding: 6, gap: 4 },
  categoryTileActive: { borderColor: PURPLE, borderWidth: 1.5 },
  tileAvatar: {
    width: 54, height: 54, borderRadius: 16, backgroundColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  tileAvatarCompact: { width: 38, height: 38, borderRadius: 13 },
  tileAvatarTiny: { width: 32, height: 32, borderRadius: 11 },
  tileAvatarImage: { width: "128%", height: "128%" },
  tileAvatarText: { fontSize: 31 },
  tileAvatarTextCompact: { fontSize: 25 },
  tileAvatarTextTiny: { fontSize: 24 },
  tileCopy: { flex: 1, minWidth: 0 },
  tileCopyCompact: { flex: 1 },
  tileTitle: { color: INK, fontSize: 12.8, fontWeight: "900", marginBottom: 5 },
  tileTitleCompact: { fontSize: 10.8, marginBottom: 3 },
  tileTitleTiny: { fontSize: 9.8, marginBottom: 3 },
  tileSubtitle: { color: "#36385F", fontSize: 11.2, lineHeight: 15 },
  tileSubtitleCompact: { fontSize: 9.6, lineHeight: 12.5 },
  tileSubtitleTiny: { fontSize: 8.7, lineHeight: 11.5 },
  featureCard: { marginTop: 28, backgroundColor: "#8B67F0", borderRadius: 26, padding: 16, overflow: "hidden" },
  featureCardCompact: { marginTop: 22, borderRadius: 23, padding: 13 },
  featureCardTiny: { borderRadius: 21, padding: 12 },
  featureTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  featureTopCompact: { alignItems: "center" },
  featureCopy: { flexShrink: 0 },
  featureCopyCompact: { width: "42%" },
  flowPill: { alignSelf: "flex-start", backgroundColor: "#5F37D7", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 18 },
  flowPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  flowPillTextCompact: { fontSize: 9.8 },
  featureTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  featureTitleTiny: { fontSize: 21 },
  featureSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14.5, marginTop: 6, maxWidth: 215 },
  featureSubtitleCompact: { maxWidth: "100%", fontSize: 12, lineHeight: 16 },
  featureImage: { flex: 1, height: 112, borderRadius: 22 },
  featureImageCompact: { height: 96 },
  nextButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  nextButtonCompact: { width: 46, height: 46, borderRadius: 23 },
  nextText: { color: PURPLE, fontSize: 38, fontWeight: "800", marginTop: -4 },
  stepsCard: { marginTop: 18, backgroundColor: "#fff", borderRadius: 22, padding: 16, flexDirection: "row", gap: 10 },
  stepsCardNarrow: { flexDirection: "column", padding: 12, borderRadius: 18 },
  stepItem: { flex: 1 },
  stepItemNarrow: { borderBottomWidth: 1, borderBottomColor: "#F0ECFA", paddingBottom: 10 },
  stepIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  stepIconWrapTiny: { width: 42, height: 42, borderRadius: 21, marginBottom: 0 },
  stepIcon: { fontSize: 22, color: "#fff" },
  stepNumber: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: PURPLE,
    color: PURPLE, textAlign: "center", fontSize: 12, fontWeight: "900", marginBottom: 6,
  },
  stepTitle: { color: INK, fontSize: 11.5, fontWeight: "900", lineHeight: 15 },
  stepDetail: { color: "#30335C", fontSize: 10.5, lineHeight: 14.5, marginTop: 2 },
  vendorHeader: { marginTop: 24, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  vendorHeaderCompact: { marginTop: 20, marginBottom: 10 },
  vendorHeaderTiny: { alignItems: "flex-start" },
  comingSoonCard: { backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 16 },
  comingSoonTitle: { color: INK, fontSize: 15, fontWeight: "900", marginBottom: 8 },
  comingSoonText: { color: "#555674", fontSize: 13, lineHeight: 19 },
  vendorList: { gap: 10 },
  vendorCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 18,
    padding: 11, flexDirection: "row", alignItems: "center", gap: 10,
  },
  vendorAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  vendorAvatarTiny: { width: 40, height: 40, borderRadius: 14 },
  vendorAvatarText: { fontSize: 26 },
  vendorAvatarTextTiny: { fontSize: 22 },
  vendorCardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  vendorName: { color: INK, fontSize: 13.2, fontWeight: "900", flex: 1 },
  vendorRating: { color: PURPLE, fontSize: 11.5, fontWeight: "800" },
  vendorMeta: { color: "#555674", fontSize: 11.5, fontWeight: "700" },
  vendorAddress: { color: "#77778D", fontSize: 11, lineHeight: 14.5 },
  emptyText: { color: "#77778D", fontSize: 13.5 },
});
