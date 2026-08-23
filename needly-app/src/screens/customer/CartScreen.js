import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import { useAuth } from "../../context/AuthContext";
import { PaymentAPI } from "../../api/client";
import LocationAutocomplete from "../../components/LocationAutocomplete";
import Thumb from "../../components/Thumb";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#24105F";
const INK = "#11123A";
const MUTED = "#747792";
const LINE = "#EEEAF8";
const SOFT = "#F8F5FF";
const GREEN = "#059669";
const RED = "#DC2626";
const DEFAULT_DELIVERY_BASE_FEE = 500;
const DEFAULT_DELIVERY_PER_KM = 120;
const DEFAULT_DELIVERY_MIN_FEE = 500;
const DEFAULT_DELIVERY_MAX_FEE = 3500;

function toRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function distanceKm(fromLat, fromLng, toLat, toLng) {
  const coords = [fromLat, fromLng, toLat, toLng].map(Number);
  if (coords.some((value) => !Number.isFinite(value))) return null;
  const [lat1, lng1, lat2, lng2] = coords;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDeliveryFee(vendor, deliveryLocation, config) {
  const km = deliveryLocation
    ? distanceKm(vendor?.latitude, vendor?.longitude, deliveryLocation.latitude, deliveryLocation.longitude)
    : null;
  const minFee = Number(config.deliveryMinFee || DEFAULT_DELIVERY_MIN_FEE);
  if (!km) return { fee: minFee, km: null };
  const baseFee = Number(config.deliveryBaseFee || DEFAULT_DELIVERY_BASE_FEE);
  const perKm = Number(config.deliveryPerKm || DEFAULT_DELIVERY_PER_KM);
  const maxFee = Number(config.deliveryMaxFee || DEFAULT_DELIVERY_MAX_FEE);
  const fee = Math.min(maxFee, Math.max(minFee, baseFee + Math.ceil(km * perKm)));
  return { fee, km: Number(km.toFixed(2)) };
}

async function reverseGeocode(latitude, longitude) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "NeedlyMarketplaceApp/1.0" } },
    );
    const data = await res.json();
    return data?.display_name || "";
  } catch (err) {
    return "";
  }
}

export default function CartScreen({ route, navigation }) {
  const { vendorId, cart: routeCart = {} } = route.params || {};
  const {
    vendors,
    placeOrder,
    customerActivity,
    customerActivityLoaded,
    saveCheckoutDraft,
    clearCheckoutDraft,
    clearDraftCart,
  } = useOrders();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const vendor = vendors.find((v) => v.id === vendorId);
  const savedCart = customerActivity?.draftCarts?.[vendorId] || {};
  const cart = Object.keys(routeCart || {}).length ? routeCart : savedCart;
  const checkoutDraft = customerActivity?.checkoutDrafts?.[vendorId] || {};

  const [deliveryAddress, setDeliveryAddress] = useState(checkoutDraft.deliveryAddress || "");
  const [deliveryPhone, setDeliveryPhone] = useState(checkoutDraft.deliveryPhone || user?.phone || "");
  const [deliveryLocation, setDeliveryLocation] = useState(checkoutDraft.deliveryLocation || null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [platformFeePercent, setPlatformFeePercent] = useState(2.5);
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(checkoutDraft.paymentGateway || "");
  const [deliveryFeeConfig, setDeliveryFeeConfig] = useState({
    deliveryBaseFee: DEFAULT_DELIVERY_BASE_FEE,
    deliveryPerKm: DEFAULT_DELIVERY_PER_KM,
    deliveryMinFee: DEFAULT_DELIVERY_MIN_FEE,
    deliveryMaxFee: DEFAULT_DELIVERY_MAX_FEE,
  });

  const items = useMemo(() => {
    if (!vendor) return [];
    return (vendor.items || [])
      .filter((item) => cart[item.id] > 0)
      .map((item) => ({ ...item, qty: cart[item.id] }));
  }, [cart, vendor]);

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const platformFeeAmount = Math.round(total * (Number(platformFeePercent || 0) / 100));
  const deliveryEstimate = estimateDeliveryFee(vendor, deliveryLocation, deliveryFeeConfig);
  const deliveryFeeAmount = deliveryEstimate.fee;
  const customerTotal = total + platformFeeAmount + deliveryFeeAmount;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const canCheckout = deliveryAddress.trim() && deliveryPhone.trim() && selectedGateway && itemCount > 0 && !submitting;

  useEffect(() => {
    let mounted = true;
    PaymentAPI.platformFee().then((res) => {
      if (mounted && Number.isFinite(Number(res?.platformFeePercent))) {
        setPlatformFeePercent(Number(res.platformFeePercent));
        setDeliveryFeeConfig((prev) => ({ ...prev, ...res }));
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    PaymentAPI.options().then((res) => {
      if (!mounted) return;
      const gateways = Array.isArray(res?.gateways) ? res.gateways : [];
      setPaymentGateways(gateways);
      const enabled = gateways.filter((gateway) => gateway.enabled);
      const saved = checkoutDraft.paymentGateway;
      if (saved && enabled.some((gateway) => gateway.id === saved)) {
        setSelectedGateway(saved);
      } else if (res?.defaultGateway) {
        setSelectedGateway(res.defaultGateway);
      } else if (enabled[0]?.id) {
        setSelectedGateway(enabled[0].id);
      }
    });
    return () => { mounted = false; };
  }, [checkoutDraft.paymentGateway]);

  useEffect(() => {
    const draft = customerActivity?.checkoutDrafts?.[vendorId];
    if (!customerActivityLoaded || !draft) return;
    setDeliveryAddress((current) => current || draft.deliveryAddress || "");
    setDeliveryPhone((current) => current || draft.deliveryPhone || user?.phone || "");
    setDeliveryLocation((current) => current || draft.deliveryLocation || null);
  }, [customerActivity?.checkoutDrafts, customerActivityLoaded, user?.phone, vendorId]);

  useEffect(() => {
    if (!vendorId || !customerActivityLoaded) return;
    saveCheckoutDraft(vendorId, {
      deliveryAddress,
      deliveryPhone,
      deliveryLocation,
      paymentGateway: selectedGateway,
    });
  }, [customerActivityLoaded, deliveryAddress, deliveryPhone, deliveryLocation, saveCheckoutDraft, selectedGateway, vendorId]);

  const useCurrentLocation = () => {
    setGeoLoading(true);
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("GPS is not available on this device or browser.");
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setDeliveryLocation(nextLocation);

        const address = await reverseGeocode(nextLocation.latitude, nextLocation.longitude);
        if (address) setDeliveryAddress(address);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message || "Could not get your GPS location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const checkout = async () => {
    if (!canCheckout) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await placeOrder(
        vendor.id,
        items.map((item) => ({ productId: item.id, qty: item.qty, addOns: [] })),
        deliveryAddress.trim(),
        deliveryPhone.trim(),
        deliveryLocation,
      );
      const { authorizationUrl } = await PaymentAPI.initialize(id, selectedGateway);
      await Linking.openURL(authorizationUrl);
      clearDraftCart(vendor.id);
      clearCheckoutDraft(vendor.id);
      navigation.replace("Tracking", { orderId: id });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!vendor) {
    return (
      <View style={styles.page}>
        <View style={[styles.shell, styles.emptyShell]}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Text style={styles.emptyText}>This basket is no longer available. Please choose a vendor again.</Text>
          <Pressable style={styles.primarySmall} onPress={() => navigation.goBack()}>
            <Text style={styles.primarySmallText}>Back to Browse</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 128 }}>
          <View style={[styles.header, { paddingHorizontal: sidePad }]}>
            <Pressable style={styles.backCircle} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.kicker}>CHECKOUT</Text>
              <Text style={styles.title}>Your Order</Text>
            </View>
            <View style={styles.orderBadge}>
              <FontAwesome name="shopping-bag" size={15} color={PURPLE} />
              <Text style={styles.orderBadgeText}>{itemCount}</Text>
            </View>
          </View>

          <View style={[styles.vendorCard, { marginHorizontal: sidePad }]}>
            <Thumb emoji={vendor.emoji} category={vendor.category} size={50} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.vendorName}>{vendor.name}</Text>
              <Text numberOfLines={1} style={styles.vendorMeta}>★ {vendor.rating || 4.5} · {vendor.area || "Abeokuta"} · {vendor.eta || "20-35 min"}</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { marginHorizontal: sidePad }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basket</Text>
              <Text style={styles.sectionHint}>{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
            </View>

            {items.length > 0 ? (
              items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.qtyPill}>
                    <Text style={styles.qtyPillText}>{item.qty}x</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemUnit}>{fmtNaira(item.price)} each</Text>
                  </View>
                  <Text style={styles.itemPrice}>{fmtNaira(item.price * item.qty)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyBasket}>No products in this order yet.</Text>
            )}

            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Vendor subtotal</Text>
              <Text style={styles.splitValue}>{fmtNaira(total)}</Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Needly platform fee ({platformFeePercent}%)</Text>
              <Text style={styles.splitValue}>{fmtNaira(platformFeeAmount)}</Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>
                Rider delivery{deliveryEstimate.km ? ` (${deliveryEstimate.km}km)` : ""}
              </Text>
              <Text style={styles.splitValue}>{fmtNaira(deliveryFeeAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Customer pays</Text>
              <Text style={styles.totalValue}>{fmtNaira(customerTotal)}</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { marginHorizontal: sidePad }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>
              <Text style={styles.sectionHint}>Use GPS for faster delivery</Text>
            </View>

            <Pressable onPress={useCurrentLocation} disabled={geoLoading} style={[styles.gpsCard, deliveryLocation && styles.gpsCardActive]}>
              <View style={[styles.gpsIcon, deliveryLocation && styles.gpsIconActive]}>
                {geoLoading ? <ActivityIndicator size="small" color={PURPLE} /> : <Ionicons name="navigate" size={21} color={deliveryLocation ? "#fff" : PURPLE} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.gpsTitle}>{deliveryLocation ? "GPS location attached" : "Use my current GPS location"}</Text>
                <Text numberOfLines={2} style={styles.gpsText}>
                  {deliveryLocation
                    ? `${deliveryLocation.latitude.toFixed(5)}, ${deliveryLocation.longitude.toFixed(5)}${deliveryLocation.accuracy ? ` · ±${Math.round(deliveryLocation.accuracy)}m` : ""}`
                    : "Allow Needly to attach your exact drop-off point for the rider."}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={PURPLE} />
            </Pressable>
            {geoError && <Text style={styles.inlineError}>{geoError}</Text>}

            <Text style={styles.label}>Delivery address</Text>
            <LocationAutocomplete
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              onSelectLocation={(loc) => {
                setDeliveryAddress(loc.address);
                if (loc.latitude && loc.longitude) {
                  setDeliveryLocation({ latitude: loc.latitude, longitude: loc.longitude, accuracy: 10 });
                }
              }}
              placeholder="Street, house/flat number, landmark"
              containerStyle={{ marginBottom: 14 }}
              inputStyle={styles.locationInput}
            />

            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneWrap}>
              <Ionicons name="call" size={17} color={PURPLE} />
              <TextInput
                value={deliveryPhone}
                onChangeText={setDeliveryPhone}
                placeholder="For the rider to reach you"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.phoneInput}
              />
            </View>
          </View>

          <View style={[styles.sectionCard, { marginHorizontal: sidePad }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Option</Text>
              <Text style={styles.sectionHint}>Choose checkout provider</Text>
            </View>

            <View style={styles.paymentOptionList}>
              {(paymentGateways.length ? paymentGateways : [
                { id: "flutterwave", label: "Flutterwave", enabled: true, description: "Cards, bank transfer and mobile money." },
                { id: "paystack", label: "Paystack", enabled: true, description: "Cards, transfer and USSD." },
              ]).map((gateway) => {
                const active = selectedGateway === gateway.id;
                const disabled = gateway.enabled === false;
                return (
                  <Pressable
                    key={gateway.id}
                    onPress={() => !disabled && setSelectedGateway(gateway.id)}
                    disabled={disabled}
                    style={[styles.paymentOption, active && styles.paymentOptionActive, disabled && styles.paymentOptionDisabled]}
                  >
                    <View style={[styles.paymentOptionIcon, active && styles.paymentOptionIconActive]}>
                      <FontAwesome name={gateway.id === "paystack" ? "credit-card" : "bolt"} size={16} color={active ? "#fff" : PURPLE} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.paymentOptionTitle}>{gateway.label}</Text>
                      <Text numberOfLines={2} style={styles.paymentOptionText}>
                        {disabled ? "Not configured yet in Super Admin settings." : gateway.description}
                      </Text>
                    </View>
                    <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                      {active && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {(!deliveryAddress.trim() || !deliveryPhone.trim()) && (
            <Text style={[styles.hint, { marginHorizontal: sidePad }]}>Add a delivery address and phone number to place your order.</Text>
          )}
          {error && <Text style={[styles.error, { marginHorizontal: sidePad }]}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={[styles.checkoutBtn, !canCheckout && styles.checkoutDisabled]} onPress={checkout} disabled={!canCheckout}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View>
                  <Text style={styles.checkoutText}>Continue to payment</Text>
                  <Text style={styles.checkoutSub}>{selectedGateway === "paystack" ? "Paystack" : "Flutterwave"} · GPS {deliveryLocation ? "attached" : "optional"}</Text>
                </View>
                <View style={styles.checkoutPrice}>
                  <Text style={styles.checkoutPriceText}>{fmtNaira(customerTotal)}</Text>
                  <FontAwesome name="arrow-right" size={13} color="#fff" />
                </View>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#FFFFFF", overflow: "hidden" },
  emptyShell: { alignItems: "center", justifyContent: "center", padding: 24 },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 18, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: "row", alignItems: "center", gap: 12 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: PURPLE, fontSize: 31, lineHeight: 32, fontWeight: "900" },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  kicker: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 2 },
  orderBadge: { minWidth: 50, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  orderBadgeText: { color: INK, fontSize: 13, fontWeight: "900" },
  vendorCard: { marginTop: -14, backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: LINE, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, shadowColor: PURPLE, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  vendorName: { color: INK, fontSize: 16, fontWeight: "900" },
  vendorMeta: { color: MUTED, fontSize: 12, fontWeight: "800", marginTop: 3 },
  sectionCard: { marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: LINE, padding: 14, shadowColor: PURPLE, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "900" },
  sectionHint: { color: MUTED, fontSize: 11.5, fontWeight: "800", flexShrink: 1, textAlign: "right" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1ECFB" },
  qtyPill: { width: 36, height: 30, borderRadius: 15, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  qtyPillText: { color: PURPLE, fontSize: 12, fontWeight: "900" },
  itemName: { color: INK, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  itemUnit: { color: MUTED, fontSize: 11.5, fontWeight: "700", marginTop: 3 },
  itemPrice: { color: INK, fontSize: 13.5, fontWeight: "900" },
  emptyBasket: { color: MUTED, fontSize: 13, fontWeight: "800", paddingVertical: 12 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14 },
  splitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10 },
  splitLabel: { color: MUTED, fontSize: 12.2, fontWeight: "800" },
  splitValue: { color: INK, fontSize: 12.8, fontWeight: "900" },
  totalLabel: { color: INK, fontSize: 15, fontWeight: "900" },
  totalValue: { color: GREEN, fontSize: 19, fontWeight: "900" },
  gpsCard: { backgroundColor: SOFT, borderRadius: 20, borderWidth: 1, borderColor: "#E6DDFF", padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  gpsCardActive: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  gpsIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  gpsIconActive: { backgroundColor: GREEN },
  gpsTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  gpsText: { color: MUTED, fontSize: 11.8, lineHeight: 16, fontWeight: "700", marginTop: 2 },
  inlineError: { color: RED, fontSize: 12, fontWeight: "800", marginBottom: 10 },
  label: { color: INK, fontSize: 12.5, fontWeight: "900", marginBottom: 7, marginTop: 2 },
  locationInput: { fontSize: 13.5, fontWeight: "700" },
  phoneWrap: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: "#DFD8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  phoneInput: { flex: 1, color: INK, fontSize: 14, fontWeight: "700", outlineStyle: "none" },
  paymentOptionList: { gap: 10 },
  paymentOption: { borderRadius: 18, borderWidth: 1, borderColor: "#E5DEF5", backgroundColor: "#FFFFFF", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  paymentOptionActive: { borderColor: PURPLE, backgroundColor: SOFT },
  paymentOptionDisabled: { opacity: 0.48 },
  paymentOptionIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  paymentOptionIconActive: { backgroundColor: PURPLE },
  paymentOptionTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  paymentOptionText: { color: MUTED, fontSize: 11.5, lineHeight: 15.5, fontWeight: "700", marginTop: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#CFC7E6", alignItems: "center", justifyContent: "center" },
  radioOuterActive: { borderColor: PURPLE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  hint: { color: RED, fontSize: 12, fontWeight: "800", marginTop: 12 },
  error: { color: RED, fontSize: 12.5, fontWeight: "800", marginTop: 8 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(255,255,255,0.94)", borderTopWidth: 1, borderTopColor: "#F1ECFB" },
  checkoutBtn: { minHeight: 64, borderRadius: 24, backgroundColor: PURPLE, paddingHorizontal: 17, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: PURPLE, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 5 },
  checkoutDisabled: { opacity: 0.45 },
  checkoutText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "900" },
  checkoutSub: { color: "rgba(255,255,255,0.76)", fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  checkoutPrice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 },
  checkoutPriceText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "900" },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { color: INK, fontSize: 17, fontWeight: "900", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 5, marginBottom: 14 },
  primarySmall: { backgroundColor: PURPLE, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 11 },
  primarySmallText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
