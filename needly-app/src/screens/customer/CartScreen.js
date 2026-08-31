import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import { useAuth } from "../../context/AuthContext";
import { AgentAPI, PaymentAPI } from "../../api/client";
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

async function geocodeNigeriaAddress(address) {
  const clean = String(address || "").trim();
  if (!clean) return null;
  try {
    const scopedQuery = /\bnigeria\b/i.test(clean) ? clean : `${clean}, Nigeria`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(scopedQuery)}&addressdetails=1&limit=1&countrycodes=ng`,
      { headers: { "User-Agent": "NeedlyMarketplaceApp/1.0" } },
    );
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, accuracy: 250 };
  } catch (err) {
    return null;
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
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
  const [paymentEmail, setPaymentEmail] = useState(checkoutDraft.paymentEmail || user?.email || "");
  const [deliveryLocation, setDeliveryLocation] = useState(checkoutDraft.deliveryLocation || null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [checkoutReference, setCheckoutReference] = useState("");
  const [useAgentHub, setUseAgentHub] = useState(!!checkoutDraft.useAgentHub);
  const [hubs, setHubs] = useState([]);
  const [selectedHubId, setSelectedHubId] = useState(checkoutDraft.hubId || "");
  const [platformFeePercent, setPlatformFeePercent] = useState(2.5);
  const [riderFeePercent, setRiderFeePercent] = useState(5);
  const [agentCollectionFee, setAgentCollectionFee] = useState(300);
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
  const selectedHub = hubs.find((hub) => hub.id === selectedHubId) || hubs[0] || null;
  const deliveryPickup = useAgentHub && selectedHub ? selectedHub : vendor;
  const deliveryEstimate = estimateDeliveryFee(deliveryPickup, deliveryLocation, deliveryFeeConfig);
  const deliveryFeeAmount = deliveryEstimate.fee;
  const companyDeliveryFeeAmount = Math.round(deliveryFeeAmount * (Number(riderFeePercent || 0) / 100));
  const riderPayoutAmount = Math.max(0, deliveryFeeAmount - companyDeliveryFeeAmount);
  const agentFeeAmount = useAgentHub ? Math.max(0, Math.round(Number(agentCollectionFee || 0))) : 0;
  const customerTotal = total + platformFeeAmount + deliveryFeeAmount + agentFeeAmount;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const cleanPaymentEmail = paymentEmail.trim().toLowerCase();
  const canCheckout = deliveryAddress.trim() && deliveryPhone.trim() && isValidEmail(cleanPaymentEmail) && selectedGateway && itemCount > 0 && !submitting;

  useEffect(() => {
    let mounted = true;
    PaymentAPI.platformFee().then((res) => {
      if (mounted && Number.isFinite(Number(res?.platformFeePercent))) {
        setPlatformFeePercent(Number(res.platformFeePercent));
        if (Number.isFinite(Number(res?.riderFeePercent))) setRiderFeePercent(Number(res.riderFeePercent));
        if (Number.isFinite(Number(res?.agentCollectionFee))) setAgentCollectionFee(Number(res.agentCollectionFee));
        setDeliveryFeeConfig((prev) => ({ ...prev, ...res }));
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    AgentAPI.hubs()
      .then((data) => {
        if (!mounted) return;
        const activeHubs = Array.isArray(data) ? data : [];
        setHubs(activeHubs);
        if (!selectedHubId && activeHubs[0]?.id) setSelectedHubId(activeHubs[0].id);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [selectedHubId]);

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
    setPaymentEmail((current) => current || draft.paymentEmail || user?.email || "");
    setDeliveryLocation((current) => current || draft.deliveryLocation || null);
    if (draft.useAgentHub !== undefined) setUseAgentHub(!!draft.useAgentHub);
    if (draft.hubId) setSelectedHubId(draft.hubId);
  }, [customerActivity?.checkoutDrafts, customerActivityLoaded, user?.email, user?.phone, vendorId]);

  useEffect(() => {
    if (!vendorId || !customerActivityLoaded) return;
    saveCheckoutDraft(vendorId, {
      deliveryAddress,
      deliveryPhone,
      paymentEmail,
      deliveryLocation,
      paymentGateway: selectedGateway,
      useAgentHub,
      hubId: selectedHubId,
    });
  }, [customerActivityLoaded, deliveryAddress, deliveryPhone, deliveryLocation, paymentEmail, saveCheckoutDraft, selectedGateway, selectedHubId, useAgentHub, vendorId]);

  const useCurrentLocation = async () => {
    setGeoLoading(true);
    setGeoError(null);

    if (Platform.OS !== "web") {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setGeoError("Location permission is needed to calculate rider cost.");
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setDeliveryLocation(nextLocation);

        const places = await Location.reverseGeocodeAsync(nextLocation);
        const place = places?.[0];
        const nativeAddress = [
          place?.name,
          place?.street,
          place?.district,
          place?.city,
          place?.region,
        ].filter(Boolean).join(", ");
        if (nativeAddress) {
          setDeliveryAddress(nativeAddress);
        } else {
          const address = await reverseGeocode(nextLocation.latitude, nextLocation.longitude);
          if (address) setDeliveryAddress(address);
        }
      } catch (err) {
        setGeoError(err.message || "Could not get your GPS location.");
      } finally {
        setGeoLoading(false);
      }
      return;
    }

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
      const checkoutLocation = deliveryLocation || await geocodeNigeriaAddress(deliveryAddress.trim());
      if (checkoutLocation && !deliveryLocation) {
        setDeliveryLocation(checkoutLocation);
      }
      const id = await placeOrder(
        vendor.id,
        items.map((item) => ({ productId: item.id, qty: item.qty, addOns: [] })),
        deliveryAddress.trim(),
        deliveryPhone.trim(),
        checkoutLocation,
        useAgentHub ? { useAgentHub: true, hubId: selectedHub?.id } : undefined,
      );
      const payment = await PaymentAPI.initialize(id, selectedGateway, cleanPaymentEmail);
      const authorizationUrl = String(payment?.authorizationUrl || "").trim();
      if (!/^https?:\/\//i.test(authorizationUrl)) {
        throw new Error("Payment link was not created. Please choose another payment option or try again.");
      }
      setCheckoutUrl(authorizationUrl);
      setCheckoutReference(payment?.reference || "");
      clearDraftCart(vendor.id);
      clearCheckoutDraft(vendor.id);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(authorizationUrl);
        return;
      }
      await Linking.openURL(authorizationUrl);
      navigation.replace("Tracking", { orderId: id });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const reopenCheckout = async () => {
    if (!checkoutUrl) return;
    setError(null);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(checkoutUrl);
        return;
      }
      await Linking.openURL(checkoutUrl);
    } catch (err) {
      setError(err.message || "Could not open the payment page.");
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
            {useAgentHub && (
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>Agent hub collection</Text>
                <Text style={styles.splitValue}>{fmtNaira(agentFeeAmount)}</Text>
              </View>
            )}
            <Text style={styles.splitFinePrint}>
              Rider receives {fmtNaira(riderPayoutAmount)}. {useAgentHub ? `Agent receives ${fmtNaira(agentFeeAmount)}. ` : ""}Needly keeps {riderFeePercent}% of delivery ({fmtNaira(companyDeliveryFeeAmount)}).
            </Text>
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

            <Text style={styles.label}>Payment email</Text>
            <View style={[styles.phoneWrap, !isValidEmail(cleanPaymentEmail) && paymentEmail.trim() && styles.inputInvalid]}>
              <Ionicons name="mail" size={17} color={PURPLE} />
              <TextInput
                value={paymentEmail}
                onChangeText={setPaymentEmail}
                placeholder="Required for Paystack receipt"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.phoneInput}
              />
            </View>
	            {!isValidEmail(cleanPaymentEmail) && (
	              <Text style={styles.inlineError}>Enter a valid email address to continue to payment.</Text>
	            )}

	            <View style={styles.hubOption}>
	              <View style={{ flex: 1, minWidth: 0 }}>
	                <Text style={styles.hubTitle}>Use Needly hub pickup</Text>
	                <Text style={styles.hubText}>
	                  Agent collects from vendor and drops at {selectedHub?.name || "Needly hub"} for rider pickup.
	                </Text>
	              </View>
	              <Switch
	                value={useAgentHub}
	                onValueChange={setUseAgentHub}
	                disabled={!hubs.length}
	                trackColor={{ true: GREEN, false: "#CBD5E1" }}
	                thumbColor="#fff"
	              />
	            </View>
	            {useAgentHub && selectedHub && (
	              <View style={styles.hubSelected}>
	                <Text style={styles.hubSelectedTitle}>{selectedHub.name}</Text>
	                <Text style={styles.hubSelectedText}>{selectedHub.address}</Text>
	              </View>
	            )}
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

          {(!deliveryAddress.trim() || !deliveryPhone.trim() || !isValidEmail(cleanPaymentEmail)) && (
            <Text style={[styles.hint, { marginHorizontal: sidePad }]}>Add delivery details and a valid payment email to place your order.</Text>
          )}
          {error && <Text style={[styles.error, { marginHorizontal: sidePad }]}>{error}</Text>}
          {checkoutUrl ? (
            <View style={[styles.checkoutFallback, { marginHorizontal: sidePad }]}>
              <Text style={styles.checkoutFallbackTitle}>Payment page ready</Text>
              <Text style={styles.checkoutFallbackText}>
                If the payment page did not open, tap below to continue{checkoutReference ? ` (${checkoutReference.slice(-8)})` : ""}.
              </Text>
              <Pressable style={styles.checkoutFallbackBtn} onPress={reopenCheckout}>
                <Text style={styles.checkoutFallbackBtnText}>Open payment page</Text>
                <FontAwesome name="external-link" size={12} color="#fff" />
              </Pressable>
            </View>
          ) : null}
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
  splitFinePrint: { color: MUTED, fontSize: 10.8, lineHeight: 15, fontWeight: "700", marginTop: 5 },
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
  inputInvalid: { borderColor: RED, backgroundColor: "#FFF7F7" },
  phoneInput: { flex: 1, color: INK, fontSize: 14, fontWeight: "700", outlineStyle: "none" },
  hubOption: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: "#E6DDFF", backgroundColor: SOFT, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  hubTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  hubText: { color: MUTED, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 2 },
  hubSelected: { marginTop: 9, borderRadius: 16, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", padding: 11 },
  hubSelectedTitle: { color: GREEN, fontSize: 12.8, fontWeight: "900" },
  hubSelectedText: { color: INK, fontSize: 11.5, lineHeight: 15.5, fontWeight: "700", marginTop: 2 },
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
  checkoutFallback: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: "#DDD6FE", backgroundColor: SOFT, padding: 13 },
  checkoutFallbackTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  checkoutFallbackText: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 4 },
  checkoutFallbackBtn: { alignSelf: "flex-start", minHeight: 40, borderRadius: 14, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, marginTop: 10 },
  checkoutFallbackBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
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
