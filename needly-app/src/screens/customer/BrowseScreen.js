import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Animated,
  Alert,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { CATEGORY_IMAGES, CUSTOMER_AVATAR } from "../../data/customerAssets";
import { SERVICE_CATEGORIES } from "../../data/serviceData";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrdersContext";
import { fmtNaira } from "../../theme/colors";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#35109B";
const INK = "#11123A";
const MUTED = "#777991";

const ACTIONS = [
  { key: "Buy", icon: "shopping-bag", color: "#6A32E8", target: "CategoryResults", params: { category: "Local Market" } },
  { key: "Book", icon: "calendar-check-o", color: "#FF7A1A", target: "CategoryResults", params: { category: "Auto" } },
  { key: "Reserve", icon: "bookmark-o", color: "#08A85A", target: "CategoryResults", params: { category: "Stay & Dine" } },
  { key: "Deals", icon: "tag", color: "#F82763", target: "CategoryResults", params: { category: "Supermarket" } },
  { key: "Wallet", icon: "credit-card", color: "#1E63E9", target: "CustomerOrders" },
];

const CATEGORY_GRID = [
  { label: "Open Market", category: "Local Market", image: CATEGORY_IMAGES["Local Market"] },
  { label: "Food", category: "Restaurant", image: CATEGORY_IMAGES.Restaurant },
  { label: "Auto", category: "Auto", image: CATEGORY_IMAGES.Auto },
  { label: "Home Services", category: "Home Services", image: CATEGORY_IMAGES["Home Services"] },
  { label: "Health", category: "Pharmacy", image: CATEGORY_IMAGES.Pharmacy },
  { label: "Stay & Dine", category: "Stay & Dine", image: CATEGORY_IMAGES["Stay & Dine"] },
  { label: "Learn", category: "Learn", image: CATEGORY_IMAGES.Learn },
  { label: "Utilities", category: "Utilities", image: CATEGORY_IMAGES.Utilities },
  { label: "Shop", category: "Supermarket", image: CATEGORY_IMAGES.Supermarket },
  { label: "More", category: "All", more: true },
];

const BASE_SLIDES = [
  {
    key: "open-market",
    category: "Local Market",
    kicker: "Open Market",
    title: "Fresh from Abeokuta",
    body: "Shop quality products from local sellers.",
    cta: "Shop Open Market",
    badge: "Supporting Local Abeokuta",
    image: CATEGORY_IMAGES["Open Market Hero"] || CATEGORY_IMAGES["Local Market"],
  },
  {
    key: "food",
    category: "Restaurant",
    kicker: "Food & Restaurants",
    title: "Your favourite meals",
    body: "Order hot food from trusted Abeokuta vendors.",
    cta: "Order Food",
    badge: "Fast local delivery",
    image: CATEGORY_IMAGES.Restaurant,
  },
  {
    key: "auto",
    category: "Auto",
    kicker: "Auto Services",
    title: "Fix, wash, move",
    body: "Mechanics, car wash and driver services nearby.",
    cta: "Book Auto",
    badge: "Verified providers",
    image: CATEGORY_IMAGES.Auto,
  },
  {
    key: "home",
    category: "Home Services",
    kicker: "Home Services",
    title: "Help at home",
    body: "Cleaners, laundry and repairs when you need them.",
    cta: "Book Service",
    badge: "Home support",
    image: CATEGORY_IMAGES["Home Services"],
  },
  {
    key: "offers",
    category: "Supermarket",
    kicker: "Special Offers",
    title: "Deals around you",
    body: "Save on selected essentials and local favourites.",
    cta: "Shop Deals",
    badge: "Limited time",
    image: CATEGORY_IMAGES.Supermarket,
  },
];

function clampCount(n) {
  return n > 99 ? "99+" : String(n || 0);
}

function IconButton({ name, family = "FontAwesome", badge, onPress }) {
  const Icon = family === "Ionicons" ? Ionicons : FontAwesome;
  return (
    <Pressable style={styles.headerIconButton} onPress={onPress}>
      <Icon name={name} size={24} color={PURPLE} />
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{clampCount(badge)}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function BrowseScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { vendors = [], orders = [], notifications = [], loading } = useOrders();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 22;
  const carouselWidth = shellWidth - sidePad * 2;
  const cardWidth = carouselWidth * 0.92;
  const cardGap = 14;
  const snap = cardWidth + cardGap;
  const carouselRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeSlide, setActiveSlide] = useState(0);
  const [query, setQuery] = useState("");
  const [dealEnd] = useState(() => Date.now() + 2 * 60 * 60 * 1000 + 18 * 60 * 1000 + 45 * 1000);
  const [now, setNow] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHidden, setInstallHidden] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [batteryLevel, setBatteryLevel] = useState(null);

  const cartCount = 0;
  const unreadNotifications = notifications.filter((n) => !n.read).length || notifications.length;
  const unreadMessages = notifications.filter((n) => /message|chat/i.test(n.type || n.title || "")).length;

  const popularProducts = useMemo(() => {
    const products = vendors.flatMap((vendor) =>
      (vendor.items || []).slice(0, 3).map((item) => ({ ...item, vendor }))
    );
    return products.slice(0, 8);
  }, [vendors]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const categoryHits = CATEGORY_GRID
      .filter((item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      .map((item) => ({ type: "category", item }));
    const vendorHits = vendors
      .filter((vendor) => [vendor.name, vendor.category, vendor.area].filter(Boolean).some((value) => value.toLowerCase().includes(q)))
      .map((vendor) => ({ type: "vendor", vendor }));
    const productHits = vendors.flatMap((vendor) =>
      (vendor.items || [])
        .filter((item) => [item.name, item.subcategory, vendor.name].filter(Boolean).some((value) => value.toLowerCase().includes(q)))
        .map((item) => ({ type: "product", item, vendor }))
    );
    const serviceHits = Object.entries(SERVICE_CATEGORIES).flatMap(([category, providers]) =>
      providers.flatMap((provider) => {
        const direct = [category, provider.name, provider.area].some((value) => value.toLowerCase().includes(q));
        const services = (provider.services || []).filter((service) => service.name.toLowerCase().includes(q));
        if (direct) return [{ type: "service", category, provider }];
        return services.map((service) => ({ type: "service", category, provider, service }));
      })
    );
    return [...categoryHits, ...vendorHits, ...productHits, ...serviceHits].slice(0, 8);
  }, [query, vendors]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => {
        const next = (current + 1) % BASE_SLIDES.length;
        carouselRef.current?.scrollTo({ x: next * snap, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [snap]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.getBattery) return undefined;
    let battery;
    let mounted = true;
    const updateBattery = () => {
      if (!battery || !mounted) return;
      setBatteryLevel(Math.round(battery.level * 100));
    };
    navigator.getBattery().then((value) => {
      if (!mounted) return;
      battery = value;
      updateBattery();
      battery.addEventListener("levelchange", updateBattery);
      battery.addEventListener("chargingchange", updateBattery);
    }).catch(() => {});
    return () => {
      mounted = false;
      battery?.removeEventListener("levelchange", updateBattery);
      battery?.removeEventListener("chargingchange", updateBattery);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallHidden(false);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallHidden(true);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const remaining = Math.max(0, dealEnd - now);
  const displayTime = new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const hrs = String(Math.floor(remaining / 3600000)).padStart(2, "0");
  const mins = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  const goCategory = (category) => {
    if (category === "All") return navigation.navigate("CategoryResults", { category: "Local Market" });
    navigation.navigate("CategoryResults", { category });
  };

  const installApp = async () => {
    if (Platform.OS !== "web") return;
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setInstallHidden(true);
      }
      setInstallPrompt(null);
      return;
    }
    Alert.alert(
      "Install Needly",
      "On iPhone, tap Share, then Add to Home Screen. On Android, open the browser menu and tap Install app or Add to Home screen."
    );
  };

  const openResult = (result) => {
    setQuery("");
    if (result.type === "vendor" || result.type === "product") {
      return navigation.navigate("VendorMenu", { vendorId: result.vendor.id });
    }
    if (result.type === "service") {
      return navigation.navigate("AutoBooking", { providerId: result.provider.id, serviceId: result.service?.id });
    }
    return goCategory(result.item.category);
  };

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={{ paddingBottom: 124 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { paddingHorizontal: sidePad }]}>
            <View style={styles.statusRow}>
              <Text style={styles.statusTime}>{displayTime}</Text>
              <View style={styles.statusIcons}>
                {Platform.OS === "web" && !installHidden && (
                  <Pressable style={styles.installPill} onPress={installApp}>
                    <Ionicons name="download-outline" size={15} color="#fff" />
                    <Text style={styles.installText}>Install</Text>
                  </Pressable>
                )}
                <View style={[styles.liveStatusPill, !isOnline && styles.liveStatusPillOffline]}>
                  <Ionicons name={isOnline ? "wifi" : "cloud-offline-outline"} size={15} color="#fff" />
                  <Text style={styles.liveStatusText}>{isOnline ? "Online" : "Offline"}</Text>
                </View>
                {batteryLevel !== null && (
                  <View style={styles.batteryPill}>
                    <Ionicons name={batteryLevel > 20 ? "battery-full" : "battery-dead-outline"} size={17} color="#fff" />
                    <Text style={styles.liveStatusText}>{batteryLevel}%</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.topRow}>
              <View style={styles.leftCluster}>
                <Image source={CUSTOMER_AVATAR} style={styles.avatar} />
                <Pressable style={styles.locationPill} onPress={() => goCategory("Local Market")}>
                  <Ionicons name="location" size={17} color="#fff" />
                  <Text style={styles.locationText}>Abeokuta</Text>
                  <Ionicons name="chevron-down" size={15} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.brandBlock}>
                <Text style={styles.brand}>Needly</Text>
                <Text style={styles.tagline}>Everything you need, in one place.</Text>
              </View>

              <View style={styles.rightCluster}>
                <IconButton
                  name="shopping-cart"
                  badge={cartCount}
                  onPress={() => vendors[0]?.id ? navigation.navigate("Cart", { vendorId: vendors[0].id, cart: {} }) : navigation.navigate("CustomerOrders")}
                />
                <IconButton name="bell-outline" family="Ionicons" badge={unreadNotifications} onPress={() => navigation.navigate("CustomerAccount")} />
              </View>
            </View>

            <View style={styles.searchWrap}>
              <FontAwesome name="search" size={23} color="#7E8197" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search for products, services, restaurants..."
                placeholderTextColor="#85879C"
                style={styles.searchInput}
              />
              <Pressable onPress={() => navigation.navigate("CustomerOrders")}>
                <MaterialCommunityIcons name="qrcode-scan" size={29} color={INK} />
              </Pressable>
            </View>
          </View>

          {!!query.trim() && (
            <View style={[styles.searchResults, { marginHorizontal: sidePad }]}>
              {searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No results found for "{query}".</Text>
              ) : searchResults.map((result, index) => (
                <Pressable key={`${result.type}-${index}`} style={styles.resultRow} onPress={() => openResult(result)}>
                  <Text style={styles.resultIcon}>{result.type === "product" ? (result.item.emoji || "•") : result.type === "vendor" ? (result.vendor.emoji || "•") : "•"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>
                      {result.item?.name || result.vendor?.name || result.service?.name || result.provider?.name || result.item?.label}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {result.vendor?.name || result.provider?.area || result.item?.category || "Needly"}
                    </Text>
                  </View>
                  <FontAwesome name="angle-right" size={20} color={PURPLE} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.carouselOuter}>
            <Animated.ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={snap}
              decelerationRate="fast"
              bounces={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: (shellWidth - cardWidth) / 2, gap: cardGap }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                {
                  useNativeDriver: false,
                  listener: (event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / snap);
                    if (index !== activeSlide) setActiveSlide(Math.max(0, Math.min(BASE_SLIDES.length - 1, index)));
                  },
                }
              )}
              scrollEventThrottle={16}
            >
              {BASE_SLIDES.map((slide) => (
                <Pressable key={slide.key} onPress={() => goCategory(slide.category)} style={[styles.heroCard, { width: cardWidth }]}>
                  <ImageBackground source={slide.image} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroBadge}>
                      <FontAwesome name="heart" size={16} color={PURPLE} />
                      <Text style={styles.heroBadgeText}>{slide.badge}</Text>
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroKicker}>{slide.kicker}</Text>
                      <Text style={styles.heroTitle}>{slide.title}</Text>
                      <Text style={styles.heroBody}>{slide.body}</Text>
                      <Pressable style={styles.heroCta} onPress={() => goCategory(slide.category)}>
                        <Text style={styles.heroCtaText}>{slide.cta}</Text>
                        <FontAwesome name="arrow-right" size={15} color="#fff" />
                      </Pressable>
                    </View>
                  </ImageBackground>
                </Pressable>
              ))}
            </Animated.ScrollView>
            <View style={styles.dots}>
              {BASE_SLIDES.map((slide, index) => (
                <Pressable
                  key={slide.key}
                  onPress={() => {
                    carouselRef.current?.scrollTo({ x: index * snap, animated: true });
                    setActiveSlide(index);
                  }}
                  style={[styles.dot, activeSlide === index && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.actionCard, { marginHorizontal: sidePad }]}>
            {ACTIONS.map((action) => (
              <Pressable key={action.key} style={styles.actionItem} onPress={() => navigation.navigate(action.target, action.params)}>
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <FontAwesome name={action.icon} size={27} color="#fff" />
                </View>
                <Text style={styles.actionText}>{action.key}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.payPanel, { marginHorizontal: sidePad }]}>
            <View style={styles.payLeft}>
              <Text style={styles.payTitle}>Needly Pay</Text>
              <Text style={styles.paySubtitle}>Pay fast, safe & secure</Text>
              <Pressable style={styles.payButton} onPress={() => navigation.navigate("CustomerOrders")}>
                <Text style={styles.payButtonText}>Pay Now</Text>
                <FontAwesome name="arrow-right" size={14} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.payActions}>
              {[
                ["sign-in", "Send Money"],
                ["file-text", "Pay Bills"],
                ["mobile", "Airtime & Data"],
              ].map(([icon, label], index) => (
                <Pressable key={label} style={[styles.payMini, index > 0 && styles.payDivider]}>
                  <View style={styles.payMiniIcon}>
                    <FontAwesome name={icon} size={22} color={PURPLE} />
                  </View>
                  <Text style={styles.payMiniText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.categoryPanel, { marginHorizontal: sidePad }]}>
            {CATEGORY_GRID.map((item) => (
              <Pressable key={item.label} style={styles.categoryItem} onPress={() => goCategory(item.category)}>
                <View style={styles.categoryIconCircle}>
                  {item.more ? (
                    <MaterialCommunityIcons name="dots-grid" size={36} color={PURPLE} />
                  ) : (
                    <Image source={item.image} style={styles.categoryImage} resizeMode="cover" />
                  )}
                </View>
                <Text numberOfLines={2} style={styles.categoryLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.flashCard, { marginHorizontal: sidePad }]}>
            <View style={styles.flashLeft}>
              <Text style={styles.flashTitle}>FLASH</Text>
              <View style={styles.flashDealRow}>
                <Text style={styles.flashTitle}>DEALS</Text>
                <Text style={styles.flashBolt}>⚡</Text>
              </View>
            </View>
            <View style={styles.flashMid}>
              <Text style={styles.flashOffer}>Up to 50% off</Text>
              <Text style={styles.flashOfferSub}>on selected items</Text>
            </View>
            <View style={styles.flashRight}>
              <Text style={styles.countdown}>{hrs} : {mins} : {secs}</Text>
              <Text style={styles.countLabels}>HRS     MINS     SECS</Text>
              <Pressable style={styles.flashButton} onPress={() => goCategory("Supermarket")}>
                <Text style={styles.flashButtonText}>Shop Deals</Text>
                <FontAwesome name="arrow-right" size={14} color={INK} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.popularPanel, { marginHorizontal: sidePad }]}>
            <View style={styles.popularHeader}>
              <Text style={styles.popularTitle}>Popular Near You</Text>
              <Pressable onPress={() => goCategory("Restaurant")}><Text style={styles.seeAll}>See all</Text></Pressable>
            </View>
            {loading && popularProducts.length === 0 ? (
              <View style={styles.skeletonRow}>
                {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonCard} />)}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
                {(popularProducts.length ? popularProducts : []).map((product) => (
                  <Pressable
                    key={`${product.vendor.id}-${product.id}`}
                    style={styles.productCard}
                    onPress={() => navigation.navigate("VendorMenu", { vendorId: product.vendor.id })}
                  >
                    <View style={styles.productImageWrap}>
                      <Image source={CATEGORY_IMAGES[product.vendor.category] || CATEGORY_IMAGES.Restaurant} style={styles.productImage} />
                      <Pressable style={styles.heartButton}>
                        <FontAwesome name="heart-o" size={17} color="#F23C56" />
                      </Pressable>
                    </View>
                    <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                    <Text numberOfLines={1} style={styles.productVendor}>{product.vendor.name}</Text>
                    <View style={styles.productMeta}>
                      <Text style={styles.productPrice}>{fmtNaira(product.price)}</Text>
                      <Text style={styles.productRating}>★ {product.vendor.rating || "4.8"}</Text>
                    </View>
                    <View style={styles.productBottom}>
                      <Text style={styles.distance}>{product.vendor.area || "Abeokuta"}</Text>
                      <Pressable style={styles.addButton} onPress={() => navigation.navigate("VendorMenu", { vendorId: product.vendor.id })}>
                        <FontAwesome name="plus" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        <CustomerBottomNav
          navigation={navigation}
          active="Browse"
          unreadMessages={unreadMessages}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#FFFFFF", overflow: "hidden" },
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: PURPLE_DARK,
  },
  statusRow: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  statusTime: { color: "#fff", fontSize: 15, fontWeight: "900" },
  statusIcons: { flexDirection: "row", gap: 7, alignItems: "center" },
  installPill: { height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, marginRight: 2 },
  installText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  liveStatusPill: { height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9 },
  liveStatusPillOffline: { backgroundColor: "rgba(255,54,87,0.28)" },
  batteryPill: { height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8 },
  liveStatusText: { color: "#fff", fontSize: 10.5, fontWeight: "900" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  leftCluster: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1.05, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 8, height: 36, borderRadius: 18, maxWidth: 112 },
  locationText: { color: "#fff", fontSize: 13.5, fontWeight: "900" },
  brandBlock: { alignItems: "center", flex: 0.95, minWidth: 86 },
  brand: { color: "#fff", fontSize: 29, lineHeight: 33, fontWeight: "900", letterSpacing: 0 },
  tagline: { color: "#FFFFFF", fontSize: 9.5, lineHeight: 12, fontWeight: "600", marginTop: 1, textAlign: "center" },
  rightCluster: { flexDirection: "row", justifyContent: "flex-end", gap: 6, flex: 0.75 },
  headerIconButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -5, right: -4, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: "#FF3657", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  searchWrap: { marginTop: 18, minHeight: 58, borderRadius: 29, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 },
  searchInput: { flex: 1, color: INK, fontSize: 13.5, fontWeight: "600" },
  searchResults: { marginTop: -8, marginBottom: 14, backgroundColor: "#fff", borderRadius: 22, borderWidth: 1, borderColor: "#ECE8F8", padding: 10, shadowColor: "#1E164C", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F0FA" },
  resultIcon: { width: 30, fontSize: 21, textAlign: "center" },
  resultTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  resultMeta: { color: MUTED, fontSize: 11.5, marginTop: 2, fontWeight: "700" },
  emptyText: { color: MUTED, fontSize: 13, padding: 12 },
  carouselOuter: { marginTop: 18 },
  heroCard: { height: 184, borderRadius: 24, overflow: "hidden", backgroundColor: "#241147", shadowColor: "#12062B", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  heroImage: { flex: 1 },
  heroImageRadius: { borderRadius: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  heroBadge: { position: "absolute", top: 14, right: 14, maxWidth: 145, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  heroBadgeText: { color: INK, fontSize: 10.5, lineHeight: 15, fontWeight: "900" },
  heroCopy: { position: "absolute", left: 20, bottom: 20, width: "62%" },
  heroKicker: { color: "#fff", fontSize: 26, lineHeight: 29, fontWeight: "900" },
  heroTitle: { color: "#fff", fontSize: 15.5, lineHeight: 20, fontWeight: "900", marginTop: 8 },
  heroBody: { color: "#fff", fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 2 },
  heroCta: { marginTop: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PURPLE, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  heroCtaText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: -20, marginBottom: 20 },
  dot: { width: 18, height: 8, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.86)" },
  dotActive: { width: 30, backgroundColor: PURPLE },
  actionCard: { marginTop: 2, minHeight: 104, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#F0ECFA", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, shadowColor: "#1E164C", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  actionItem: { alignItems: "center", gap: 8, minWidth: 48 },
  actionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionText: { color: INK, fontSize: 12.5, fontWeight: "900" },
  payPanel: { marginTop: 16, minHeight: 118, borderRadius: 18, borderWidth: 1, borderColor: "#F0ECFA", backgroundColor: "#fff", flexDirection: "row", overflow: "hidden", shadowColor: "#1E164C", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  payLeft: { width: "38%", padding: 14, justifyContent: "center" },
  payTitle: { color: PURPLE, fontSize: 19, fontWeight: "900" },
  paySubtitle: { color: INK, fontSize: 11.5, fontWeight: "700", marginTop: 5 },
  payButton: { marginTop: 14, height: 42, borderRadius: 21, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  payButtonText: { color: "#fff", fontSize: 14.5, fontWeight: "900" },
  payActions: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  payMini: { flex: 1, alignItems: "center", gap: 10 },
  payDivider: { borderLeftWidth: 1, borderLeftColor: "#EEEAF8" },
  payMiniIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#F2EEFF", alignItems: "center", justifyContent: "center" },
  payMiniText: { color: INK, fontSize: 10.5, textAlign: "center", fontWeight: "900" },
  categoryPanel: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: "#F0ECFA", backgroundColor: "#fff", paddingVertical: 18, flexDirection: "row", flexWrap: "wrap", shadowColor: "#1E164C", shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  categoryItem: { width: "20%", alignItems: "center", marginBottom: 18 },
  categoryIconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#F2F6F9", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 },
  categoryImage: { width: "112%", height: "112%" },
  categoryLabel: { color: INK, fontSize: 11.5, lineHeight: 14, fontWeight: "900", textAlign: "center", minHeight: 28 },
  flashCard: { marginTop: 18, minHeight: 104, borderRadius: 18, backgroundColor: "#19042E", flexDirection: "row", alignItems: "center", padding: 14, gap: 10, overflow: "hidden" },
  flashLeft: { width: "29%", alignItems: "center" },
  flashDealRow: { flexDirection: "row", alignItems: "center" },
  flashTitle: { color: "#fff", fontSize: 24, fontWeight: "900", fontStyle: "italic", lineHeight: 28 },
  flashBolt: { fontSize: 42, color: "#FFD33D", marginLeft: -2 },
  flashMid: { flex: 1 },
  flashOffer: { color: "#FFF05C", fontSize: 19, fontWeight: "900" },
  flashOfferSub: { color: "#FFF05C", fontSize: 16, fontWeight: "700", marginTop: 6 },
  flashRight: { width: "31%", alignItems: "center" },
  countdown: { color: "#fff", fontSize: 20, fontWeight: "900" },
  countLabels: { color: "#FFF05C", fontSize: 9, fontWeight: "900", marginTop: 3 },
  flashButton: { marginTop: 10, height: 36, borderRadius: 11, backgroundColor: "#FFE174", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  flashButtonText: { color: INK, fontSize: 12.5, fontWeight: "900" },
  popularPanel: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: "#F0ECFA", backgroundColor: "#fff", padding: 16, minHeight: 220 },
  popularHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  popularTitle: { color: INK, fontSize: 16, fontWeight: "900" },
  seeAll: { color: PURPLE, fontSize: 14, fontWeight: "900" },
  productRow: { gap: 12, paddingRight: 8 },
  productCard: { width: 132, borderRadius: 16, backgroundColor: "#fff" },
  productImageWrap: { height: 86, borderRadius: 15, overflow: "hidden", backgroundColor: "#F4F2FA" },
  productImage: { width: "100%", height: "100%" },
  heartButton: { position: "absolute", top: 7, right: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  productName: { color: INK, fontSize: 12.5, fontWeight: "900", marginTop: 8 },
  productVendor: { color: MUTED, fontSize: 10.5, fontWeight: "700", marginTop: 2 },
  productMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  productPrice: { color: PURPLE, fontSize: 12, fontWeight: "900" },
  productRating: { color: "#F59E0B", fontSize: 10.5, fontWeight: "900" },
  productBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  distance: { color: MUTED, fontSize: 10, fontWeight: "700" },
  addButton: { width: 25, height: 25, borderRadius: 13, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  skeletonRow: { flexDirection: "row", gap: 12 },
  skeletonCard: { width: 132, height: 152, borderRadius: 16, backgroundColor: "#F2EFF8" },
});
