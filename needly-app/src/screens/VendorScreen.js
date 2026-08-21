import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import Thumb from "../components/Thumb";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { VendorAPI } from "../api/client";
import { CUSTOMER_AVATAR } from "../data/customerAssets";

const PURPLE = "#6F45E9";
const DARK_PURPLE = "#15183F";
const EMERALD = "#10B981";
const MANGO = "#F59E0B";
const CHILI = "#EF4444";
const INK = "#11123A";
const MUTED = "#747792";
const MAX_PRODUCT_IMAGE_BYTES = 900000;

function canvasResizeDataUrl(dataUrl, maxSize = 520, quality = 0.72) {
  if (Platform.OS !== "web" || typeof document === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function pickResizedProductImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Please allow photo access to choose a product image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.55,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset.base64 && asset.uri) return asset.uri;
  const dataUrl = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
  const resized = await canvasResizeDataUrl(dataUrl);
  if (resized.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("That image is still too large. Choose a clearer but smaller photo.");
  }
  return resized;
}

export default function VendorScreen() {
  const {
    orders,
    vendors,
    advanceOrder,
    cancelOrder,
    updatePrice,
    addProduct,
    updateProductDetails,
    addAddOn,
    removeAddOn,
    toggleProductAvailable,
    toggleVendorOpen,
    disputes,
  } = useOrders();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const statsCompact = width < 430;
  const myVendorId = user?.vendor?.id || user?.managedVendor?.id;
  const activeVendor = (vendors || []).find((v) => v.id === myVendorId)
    || user?.vendor
    || user?.managedVendor
    || (vendors && vendors.length > 0 ? vendors[0] : null);
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHidden, setInstallHidden] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [batteryLevel, setBatteryLevel] = useState(null);

  useEffect(() => {
    VendorAPI.stats().then(setStats).catch(() => {});
  }, []);

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

  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newEmoji, setNewEmoji] = useState("🍽️");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addOnDrafts, setAddOnDrafts] = useState({});
  const [actionError, setActionError] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);
  const [orderView, setOrderView] = useState("active");
  const scrollRef = useRef(null);
  const sectionOffsets = useRef({ orders: 0, menu: 0, issues: 0 });

  const acceptOrder = async (orderId) => {
    setActionError(null);
    try {
      await advanceOrder(orderId);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const declineOrder = async (orderId, reason) => {
    setActionError(null);
    try {
      await cancelOrder(orderId, reason);
      setDecliningOrderId(null);
      setDeclineOtherNote(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (!activeVendor) {
    return (
      <View style={styles.noStoreContainer}>
        <View style={styles.noStoreIconWrap}>
          <Text style={styles.noStoreIcon}>🏪</Text>
        </View>
        <Text style={styles.noStoreTitle}>Store Onboarding Needed</Text>
        <Text style={styles.noStoreText}>
          Your account is registered as a Vendor, but a store profile has not been assigned or approved by an Admin yet.
        </Text>
        <View style={styles.noStoreBadge}>
          <Text style={styles.noStoreBadgeText}>⚡ Status: Pending Setup</Text>
        </View>
        <Pressable style={styles.noStoreLogoutBtn} onPress={logout}>
          <Text style={styles.noStoreLogoutText}>Log out</Text>
        </Pressable>
      </View>
    );
  }

  const vendorItems = activeVendor.items || [];
  const activeVendorId = myVendorId || activeVendor.id;
  const myOrders = (orders || []).filter((o) => {
    const orderVendorId = o?.vendor?.id || o?.vendorId;
    return orderVendorId && orderVendorId === activeVendorId;
  });
  const queue = myOrders.filter((o) => {
    const st = (o.status || "").toLowerCase();
    return st !== "delivered" && st !== "cancelled";
  });
  const history = myOrders.filter((o) => (o.status || "").toLowerCase() === "delivered");
  const declined = myOrders.filter((o) => (o.status || "").toLowerCase() === "cancelled");
  const readyOrders = queue.filter((o) => (o.status || "").toLowerCase() === "ready");
  const visibleOrders = orderView === "ready" ? readyOrders : queue;
  const myDisputes = (disputes || []).filter((d) => d.vendorId === activeVendorId);
  const openDisputes = myDisputes.filter((d) => (d.status || "").toLowerCase() === "open");
  const displayTime = new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const vendorAvatarSource = user?.avatarUrl ? { uri: user.avatarUrl } : CUSTOMER_AVATAR;

  const installApp = async () => {
    if (Platform.OS !== "web") return;
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setInstallHidden(true);
      setInstallPrompt(null);
      return;
    }
    Alert.alert(
      "Install Needly",
      "On iPhone, tap Share, then Add to Home Screen. On Android, open the browser menu and tap Install app or Add to Home screen."
    );
  };

  const scrollToSection = (section) => {
    const y = sectionOffsets.current[section] || 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  const handleQuickAction = (key) => {
    setActionError(null);
    if (key === "Orders") {
      setOrderView("active");
      scrollToSection("orders");
      return;
    }
    if (key === "Menu") {
      setShowAddForm(true);
      scrollToSection("menu");
      return;
    }
    if (key === "Ready") {
      setOrderView("ready");
      scrollToSection("orders");
      return;
    }
    if (key === "Issues") {
      scrollToSection("issues");
    }
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditPrice(String(item.price));
  };
  const saveEdit = (itemId) => {
    const price = parseInt(editPrice, 10);
    if (!isNaN(price) && price > 0) updatePrice(activeVendorId, itemId, price);
    setEditingItemId(null);
  };

  const chooseNewProductImage = async () => {
    setActionError(null);
    try {
      const imageUrl = await pickResizedProductImage();
      if (imageUrl) setNewImageUrl(imageUrl);
    } catch (err) {
      setActionError(err.message || "Could not choose product image.");
    }
  };

  const chooseExistingProductImage = async (productId) => {
    setActionError(null);
    try {
      const imageUrl = await pickResizedProductImage();
      if (imageUrl) await updateProductDetails(activeVendorId, productId, { imageUrl });
    } catch (err) {
      setActionError(err.message || "Could not update product image.");
    }
  };

  const submitNewProduct = async () => {
    setActionError(null);
    const price = parseInt(newPrice, 10);
    const targetVendorId = activeVendorId;
    if (!targetVendorId) {
      setActionError("Could not find your vendor store. Please log out and sign in again.");
      return;
    }
    if (!newName.trim()) {
      setActionError("Enter a product name before saving.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setActionError("Enter a valid product price before saving.");
      return;
    }
    setSavingProduct(true);
    try {
      await addProduct(targetVendorId, { name: newName.trim(), price, emoji: newEmoji || "🍽️", imageUrl: newImageUrl || null });
      setNewName("");
      setNewPrice("");
      setNewEmoji("🍽️");
      setNewImageUrl("");
      setShowAddForm(false);
    } catch (err) {
      setActionError(err.message || "Could not add product. Please try again.");
    } finally {
      setSavingProduct(false);
    }
  };

  const setDraft = (productId, patch) =>
    setAddOnDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));

  const submitAddOn = (productId) => {
    const draft = addOnDrafts[productId] || {};
    const price = parseInt(draft.price, 10);
    if (!draft.name?.trim() || isNaN(price) || price <= 0) return;
    addAddOn(activeVendorId, productId, { name: draft.name.trim(), price });
    setAddOnDrafts((prev) => ({ ...prev, [productId]: { name: "", price: "" } }));
  };

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
      <View style={styles.heroStoreCard}>
        <View style={styles.vendorStatusRow}>
          <Text style={styles.vendorStatusTime}>{displayTime}</Text>
          <View style={styles.vendorStatusIcons}>
            {Platform.OS === "web" && !installHidden && (
              <Pressable style={styles.vendorInstallPill} onPress={installApp}>
                <Ionicons name="download-outline" size={14} color="#fff" />
                <Text style={styles.vendorStatusPillText}>Install</Text>
              </Pressable>
            )}
            <View style={[styles.vendorMiniPill, !isOnline && styles.vendorMiniPillOffline]}>
              <Ionicons name={isOnline ? "wifi" : "cloud-offline-outline"} size={14} color="#fff" />
              <Text style={styles.vendorStatusPillText}>{isOnline ? "Online" : "Offline"}</Text>
            </View>
            {batteryLevel !== null && (
              <View style={styles.vendorMiniPill}>
                <Ionicons name={batteryLevel > 20 ? "battery-full" : "battery-dead-outline"} size={16} color="#fff" />
                <Text style={styles.vendorStatusPillText}>{batteryLevel}%</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.vendorAppTopRow}>
          <View style={styles.vendorLeftCluster}>
            <Image source={vendorAvatarSource} style={styles.vendorAvatar} />
            <View style={styles.vendorIdentity}>
              <Pressable style={styles.vendorPersonPill}>
                <Ionicons name="person" size={16} color="#fff" />
                <Text numberOfLines={1} style={styles.vendorPersonText}>{user?.name || "Vendor"}</Text>
              </Pressable>
              <Text style={styles.vendorEyebrow}>Vendor Dashboard</Text>
            </View>
          </View>

          <View style={styles.vendorRightCluster}>
            <View style={styles.vendorHeaderIconButton}>
              <FontAwesome name="shopping-bag" size={20} color={PURPLE} />
              {!!queue.length && (
                <View style={styles.vendorBadge}>
                  <Text style={styles.vendorBadgeText}>{queue.length > 99 ? "99+" : queue.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.vendorHeaderIconButton}>
              <Ionicons name="notifications-outline" size={22} color={PURPLE} />
              {!!openDisputes.length && (
                <View style={styles.vendorBadge}>
                  <Text style={styles.vendorBadgeText}>{openDisputes.length > 99 ? "99+" : openDisputes.length}</Text>
                </View>
              )}
            </View>
            <Pressable style={styles.vendorHeaderIconButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color={PURPLE} />
            </Pressable>
          </View>
        </View>

        <View style={styles.vendorStorePanel}>
          <View style={styles.storeAvatarWrap}>
            <Text style={styles.storeAvatarText}>{activeVendor.emoji || "🍛"}</Text>
          </View>
          <View style={styles.vendorStoreCopy}>
            <Text style={styles.heroStoreName} numberOfLines={1}>{activeVendor.name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{activeVendor.category}</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="location" size={12} color="rgba(255,255,255,0.92)" />
                <Text style={styles.heroPillText}>{activeVendor.area || "Abeokuta"}</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, { backgroundColor: activeVendor.isOpen ? EMERALD : CHILI }]} />
                <Text style={styles.liveBadgeText}>{activeVendor.isOpen ? "Live" : "Paused"}</Text>
              </View>
            </View>
          </View>
          <Switch
            value={!!activeVendor.isOpen}
              onValueChange={() => toggleVendorOpen(activeVendorId)}
            trackColor={{ true: EMERALD, false: "#475569" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.heroSummaryRow}>
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{queue.length}</Text>
            <Text style={styles.heroSummaryLabel}>Active</Text>
          </View>
          <View style={styles.heroSummaryDivider} />
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{vendorItems.length}</Text>
            <Text style={styles.heroSummaryLabel}>Products</Text>
          </View>
          <View style={styles.heroSummaryDivider} />
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{openDisputes.length}</Text>
            <Text style={styles.heroSummaryLabel}>Disputes</Text>
          </View>
        </View>
      </View>

      {openDisputes.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            ⚠️ <Text style={{ fontWeight: "800" }}>{openDisputes.length} open dispute{openDisputes.length > 1 ? "s" : ""}</Text> requiring attention.
          </Text>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {actionError}</Text>
        </View>
      )}

      {/* Revenue Analytics Cards */}
      {stats && (
        <View style={styles.statGrid}>
          {[
            { label: "Today", data: stats.today, color: "#6F45E9" },
            { label: "This week", data: stats.week, color: "#059669" },
            { label: "This month", data: stats.month, color: "#D97706" },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              <Text style={styles.statValue}>{fmtNaira(s.data?.revenue || 0)}</Text>
              <Text style={styles.statSub}>{s.data?.orders || 0} order{s.data?.orders === 1 ? "" : "s"}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.quickActionCard, statsCompact && styles.quickActionCardCompact]}>
        {[
          { label: "Orders", value: queue.length, color: PURPLE },
          { label: "Menu", value: vendorItems.length, color: MANGO },
          { label: "Ready", value: readyOrders.length, color: EMERALD },
          { label: "Issues", value: openDisputes.length, color: CHILI },
        ].map((item) => (
          <Pressable key={item.label} onPress={() => handleQuickAction(item.label)} style={[styles.quickActionItem, statsCompact && styles.quickActionItemCompact]}>
            <View style={[styles.quickIcon, { backgroundColor: `${item.color}18` }]}>
              <Text style={[styles.quickIconText, { color: item.color }]}>{item.value}</Text>
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Active Orders Queue */}
      <View
        style={styles.sectionHeaderRow}
        onLayout={(event) => { sectionOffsets.current.orders = event.nativeEvent.layout.y; }}
      >
        <Text style={styles.sectionTitle}>{orderView === "ready" ? "Ready Orders" : "Active Orders"}</Text>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{visibleOrders.length} {orderView === "ready" ? "ready" : "active"}</Text>
        </View>
      </View>

      <FlatList
        data={visibleOrders}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardIcon}>📦</Text>
            <Text style={styles.emptyCardTitle}>{orderView === "ready" ? "No Ready Orders" : "No Active Orders"}</Text>
            <Text style={styles.emptyCardText}>
              {orderView === "ready"
                ? "Orders marked ready for rider pickup will appear here."
                : "New customer orders will appear here automatically in real time."}
            </Text>
          </View>
        }
        contentContainerStyle={{ gap: 12, marginBottom: 20 }}
        renderItem={({ item: o }) => {
          const declining = decliningOrderId === o.id;
          const st = (o.status || "").toLowerCase();
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.orderId}>Order #{o.id.slice(-6)}</Text>
                  <Text style={styles.orderTimeText}>
                    {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <StatusPill status={st} />
              </View>

              <View style={styles.itemsList}>
                {(o.items || []).map((i) => (
                  <View key={i.id || i.name} style={styles.itemRow}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{i.qty}×</Text>
                    </View>
                    <Text style={styles.itemNameText}>{i.name}</Text>
                    <Text style={styles.itemPriceText}>{fmtNaira(i.price * i.qty)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderCardFooter}>
                <View>
                  <Text style={styles.totalLabel}>TOTAL PAYMENT</Text>
                  <Text style={styles.totalValue}>{fmtNaira(o.total)}</Text>
                </View>

                {st === "placed" && !declining && (
                  <View style={[styles.orderActionRow, compact && styles.orderActionRowCompact]}>
                    <Pressable style={styles.declineBtn} onPress={() => setDecliningOrderId(o.id)}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => acceptOrder(o.id)}>
                      <Text style={styles.acceptBtnText}>Accept Order</Text>
                    </Pressable>
                  </View>
                )}

                {st === "accepted" && (
                  <Pressable style={styles.markReadyBtn} onPress={() => acceptOrder(o.id)}>
                    <Text style={styles.markReadyBtnText}>✓ Mark Ready</Text>
                  </Pressable>
                )}

                {(st === "ready" || st === "picked_up") && (
                  <View style={styles.waitingRiderPill}>
                    <Text style={styles.waitingRiderText}>🛵 Waiting on Rider Pickup</Text>
                  </View>
                )}
              </View>

              {st === "placed" && declining && (
                <View style={styles.declineBox}>
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#64748B", marginBottom: 8 }}>
                    Select decline reason:
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                    {["Item(s) out of stock", "Kitchen too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                      <Pressable
                        key={reason}
                        onPress={() => (reason === "Other" ? setDeclineOtherNote("") : declineOrder(o.id, reason))}
                        style={styles.declineReasonChip}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: DARK_PURPLE }}>{reason}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {declineOtherNote !== null && (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TextInput
                        value={declineOtherNote}
                        onChangeText={setDeclineOtherNote}
                        placeholder="Say a bit more…"
                        style={[styles.miniInput, { flex: 1 }]}
                      />
                      <Pressable onPress={() => declineOrder(o.id, declineOtherNote.trim() || "Other")} style={styles.sendDeclineBtn}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Confirm Decline</Text>
                      </Pressable>
                    </View>
                  )}

                  <Pressable onPress={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}>
                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 8, textDecorationLine: "underline" }}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Completed History Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Completed Orders Today ({history.length})</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        contentContainerStyle={{ marginBottom: 20, gap: 6 }}
        renderItem={({ item: o }) => {
          const expanded = expandedHistoryId === o.id;
          return (
            <Pressable onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={[styles.historyRow, expanded && styles.historyRowExpanded]}>
              <View style={styles.historyTopRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.historyIcon}>✓</Text>
                  <Text style={styles.historyOrderId}>Order #{o.id.slice(-6)}</Text>
                </View>
                <Text style={styles.historyTotal}>{fmtNaira(o.total)}</Text>
              </View>
              {expanded && (
                <View style={styles.historyDetail}>
                  <Text style={styles.historyDetailTime}>
                    Completed at {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {(o.items || []).map((i) => (
                    <Text key={i.id || i.name} style={styles.historyDetailItem}>• {i.qty} × {i.name} ({fmtNaira(i.price * i.qty)})</Text>
                  ))}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Product Catalog Management */}
      <View style={styles.productsHeaderRow}>
        <View onLayout={(event) => { sectionOffsets.current.menu = event.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Product Catalog</Text>
          <Text style={styles.sectionSubTitle}>{vendorItems.length} active menu items</Text>
        </View>

        <Pressable onPress={() => setShowAddForm((s) => !s)} style={styles.addProductBtn}>
          <Text style={styles.addProductBtnText}>{showAddForm ? "✕ Cancel" : "+ Add Product"}</Text>
        </Pressable>
      </View>

      {/* Add New Product Card */}
      {showAddForm && (
        <View style={styles.addFormCard}>
          <Text style={styles.addFormTitle}>Add New Menu Item</Text>
          <Pressable onPress={chooseNewProductImage} style={styles.productImagePicker}>
            {newImageUrl ? (
              <Image source={{ uri: newImageUrl }} style={styles.productImagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.productImageEmpty}>
                <Text style={styles.productImageEmptyIcon}>📷</Text>
                <Text style={styles.productImageEmptyText}>Add product photo</Text>
              </View>
            )}
            <View style={styles.productImageBadge}>
              <Text style={styles.productImageBadgeText}>{newImageUrl ? "Change" : "Upload"}</Text>
            </View>
          </Pressable>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Product Name (e.g. Special Fried Rice)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              value={newEmoji}
              onChangeText={setNewEmoji}
              placeholder="Emoji"
              placeholderTextColor="#94A3B8"
              style={[styles.input, { width: 70, textAlign: "center" }]}
            />
            <TextInput
              value={newPrice}
              onChangeText={(t) => setNewPrice(t.replace(/[^0-9]/g, ""))}
              placeholder="Price in Naira (₦)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <Pressable onPress={submitNewProduct} disabled={savingProduct} style={[styles.saveProductBtn, savingProduct && styles.saveProductBtnDisabled]}>
            <Text style={styles.saveProductBtnText}>{savingProduct ? "Saving Product..." : "Save Product to Menu"}</Text>
          </Pressable>
        </View>
      )}

      {/* Product List Grid */}
      <FlatList
        data={vendorItems}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const draft = addOnDrafts[item.id] || { name: "", price: "" };
          const isEditing = editingItemId === item.id;
          const isAvailable = item.isAvailable !== false;
          return (
            <View style={[styles.productCard, !isAvailable && styles.productCardSoldOut]}>
              <View style={styles.productCardTop}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <Pressable onPress={() => chooseExistingProductImage(item.id)} style={styles.productThumbButton}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.productThumbImage} resizeMode="cover" />
                    ) : (
                      <Thumb emoji={item.emoji} category={activeVendor.category} size={44} />
                    )}
                    <View style={styles.productThumbEdit}>
                      <Text style={styles.productThumbEditText}>+</Text>
                    </View>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.name}</Text>

                    {isEditing ? (
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 }}>
                        <TextInput
                          value={editPrice}
                          onChangeText={(t) => setEditPrice(t.replace(/[^0-9]/g, ""))}
                          keyboardType="numeric"
                          style={[styles.miniInput, { width: 90 }]}
                        />
                        <Pressable onPress={() => saveEdit(item.id)} style={styles.saveMiniBtn}>
                          <Text style={styles.saveMiniBtnText}>Save</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => startEdit(item)}>
                        <Text style={styles.productPrice}>{fmtNaira(item.price)} <Text style={{ fontSize: 11, color: PURPLE }}>✎ Edit</Text></Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.availabilityLabel, { color: isAvailable ? EMERALD : CHILI }]}>
                    {isAvailable ? "AVAILABLE" : "SOLD OUT"}
                  </Text>
                  <Switch
                    value={isAvailable}
                    onValueChange={() => toggleProductAvailable(activeVendorId, item.id)}
                    trackColor={{ true: EMERALD, false: "#CBD5E1" }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {/* Add-ons Container */}
              <View style={styles.addonsBox}>
                <Text style={styles.addonsHeaderTitle}>CUSTOM ADD-ONS</Text>

                {(item.addOns || []).map((addon) => (
                  <View key={addon.id} style={styles.addonRow}>
                    <Text style={styles.addonText}>+ {addon.name} ({fmtNaira(addon.price)})</Text>
                    <Pressable onPress={() => removeAddOn(activeVendorId, item.id, addon.id)} style={styles.removeAddonBtn}>
                      <Text style={styles.removeAddonText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  <TextInput
                    value={draft.name}
                    onChangeText={(text) => setDraft(item.id, { name: text })}
                    placeholder="Add-on (e.g. Extra Cheese)"
                    placeholderTextColor="#94A3B8"
                    style={[styles.miniInput, { flex: 2 }]}
                  />
                  <TextInput
                    value={draft.price}
                    onChangeText={(text) => setDraft(item.id, { price: text.replace(/[^0-9]/g, "") })}
                    placeholder="₦ Price"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={[styles.miniInput, { flex: 1 }]}
                  />
                  <Pressable onPress={() => submitAddOn(item.id)} style={styles.addAddonBtn}>
                    <Text style={styles.addAddonBtnText}>+ Add</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View
        style={styles.issuesSection}
        onLayout={(event) => { sectionOffsets.current.issues = event.nativeEvent.layout.y; }}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Issues</Text>
          <View style={[styles.badgePill, openDisputes.length > 0 && styles.issueBadgePill]}>
            <Text style={[styles.badgePillText, openDisputes.length > 0 && styles.issueBadgePillText]}>
              {openDisputes.length} open
            </Text>
          </View>
        </View>
        {openDisputes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardIcon}>✓</Text>
            <Text style={styles.emptyCardTitle}>No Open Issues</Text>
            <Text style={styles.emptyCardText}>Customer disputes and store issues will appear here for review.</Text>
          </View>
        ) : (
          <View style={styles.issueList}>
            {openDisputes.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                <Text style={styles.issueTitle}>Order #{String(issue.orderId || "").slice(-6)}</Text>
                <Text style={styles.issueReason}>{issue.reason || "Customer reported an issue."}</Text>
                <Text style={styles.issueMeta}>
                  {issue.customerName ? `${issue.customerName} • ` : ""}{new Date(issue.createdAt || Date.now()).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F3FF" },
  content: { paddingBottom: 72, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    minHeight: "100%",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
  },

  noStoreContainer: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, alignItems: "center", justifyContent: "center" },
  noStoreIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  noStoreIcon: { fontSize: 44 },
  noStoreTitle: { fontSize: 22, fontWeight: "900", color: DARK_PURPLE, marginBottom: 8 },
  noStoreText: { fontSize: 13.5, color: "#64748B", textAlign: "center", lineHeight: 20, maxWidth: 310, marginBottom: 20 },
  noStoreBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A" },
  noStoreBadgeText: { color: "#92400E", fontSize: 12.5, fontWeight: "800" },
  noStoreLogoutBtn: { marginTop: 16, backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 11 },
  noStoreLogoutText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  /* Hero Banner */
  heroStoreCard: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    shadowColor: PURPLE,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  vendorStatusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 13 },
  vendorStatusTime: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  vendorStatusIcons: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, justifyContent: "flex-end" },
  vendorInstallPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 8, height: 28, borderRadius: 14 },
  vendorMiniPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 8, height: 28, borderRadius: 14 },
  vendorMiniPillOffline: { backgroundColor: "rgba(239,68,68,0.28)" },
  vendorStatusPillText: { color: "#FFFFFF", fontSize: 10.5, fontWeight: "900" },
  vendorAppTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 15 },
  vendorLeftCluster: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  vendorAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  vendorIdentity: { flex: 1, minWidth: 0, gap: 5 },
  vendorPersonPill: { alignSelf: "flex-start", maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 8, height: 34, borderRadius: 17 },
  vendorPersonText: { color: "#fff", fontSize: 13, fontWeight: "900", maxWidth: 132 },
  vendorEyebrow: { color: "rgba(255,255,255,0.82)", fontSize: 11.5, fontWeight: "900" },
  vendorTopActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  vendorRightCluster: { flexDirection: "row", alignItems: "center", gap: 7 },
  vendorHeaderIconButton: { width: 40, height: 40, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center" },
  vendorBadge: { position: "absolute", top: -5, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF3657", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  vendorBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  logoutBtn: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  logoutBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroVendorInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  storeAvatarWrap: { width: 56, height: 56, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.22)" },
  storeAvatarText: { fontSize: 29 },
  vendorStorePanel: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", padding: 10 },
  vendorStoreCopy: { flex: 1, minWidth: 0 },
  heroStoreName: { fontSize: 18, fontWeight: "900", color: "#ffffff", marginBottom: 5 },
  heroMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  heroPillText: { color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: "800" },

  heroStatusWrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  statusIndicatorDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  heroStatusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginBottom: 4 },
  heroSummaryRow: { flexDirection: "row", alignItems: "center", marginTop: 18, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 20, paddingVertical: 12 },
  heroSummaryItem: { flex: 1, alignItems: "center" },
  heroSummaryValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  heroSummaryLabel: { color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: "800", marginTop: 1 },
  heroSummaryDivider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.2)" },

  alertBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 18, padding: 13, marginBottom: 14 },
  alertText: { color: "#991B1B", fontSize: 13 },
  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 18, padding: 13, marginBottom: 14 },
  errorText: { color: "#991B1B", fontSize: 13 },

  /* Stats Grid */
  statGrid: { flexDirection: "row", gap: 9, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAF8", padding: 11, shadowColor: PURPLE, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  statLabel: { fontSize: 9.5, fontWeight: "900", color: MUTED, marginBottom: 4 },
  statValue: { fontSize: 14.5, fontWeight: "900", color: INK },
  statSub: { fontSize: 10.5, color: MUTED, marginTop: 2, fontWeight: "700" },

  quickActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEEAF8",
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    shadowColor: PURPLE,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  quickActionCardCompact: { paddingHorizontal: 10, rowGap: 12, columnGap: 8 },
  quickActionItem: { flexGrow: 1, flexBasis: 0, minWidth: 68, alignItems: "center", gap: 7 },
  quickActionItemCompact: { flexBasis: "47%", minWidth: 0 },
  quickIcon: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  quickIconText: { fontSize: 16, fontWeight: "900" },
  quickActionLabel: { color: INK, fontSize: 12, fontWeight: "900" },

  /* Section Headers */
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: INK },
  sectionSubTitle: { fontSize: 12, color: MUTED, marginTop: 2, fontWeight: "700" },
  badgePill: { backgroundColor: "#F4EDFF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgePillText: { color: PURPLE, fontSize: 11.5, fontWeight: "800" },
  issueBadgePill: { backgroundColor: "#FEF2F2" },
  issueBadgePillText: { color: CHILI },

  /* Empty State */
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#EEEAF8", padding: 24, alignItems: "center", shadowColor: PURPLE, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  emptyCardIcon: { fontSize: 36, marginBottom: 8 },
  emptyCardTitle: { fontSize: 15, fontWeight: "900", color: INK },
  emptyCardText: { fontSize: 12.5, color: MUTED, textAlign: "center", marginTop: 4 },

  /* Order Cards */
  orderCard: {
    backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#EEEAF8", padding: 15, gap: 12,
    shadowColor: PURPLE, shadowOpacity: 0.07, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 3,
  },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 10 },
  orderId: { fontWeight: "900", fontSize: 14.5, color: INK },
  orderTimeText: { fontSize: 11, color: MUTED, fontWeight: "700" },

  itemsList: { gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBadge: { backgroundColor: "#F4EDFF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  qtyBadgeText: { fontSize: 12, fontWeight: "900", color: PURPLE },
  itemNameText: { flex: 1, fontSize: 13, fontWeight: "700", color: INK },
  itemPriceText: { fontSize: 13, fontWeight: "800", color: "#334155" },

  orderCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", flexWrap: "wrap" },
  totalLabel: { fontSize: 9.5, fontWeight: "900", color: MUTED },
  totalValue: { fontSize: 16.5, fontWeight: "900", color: INK },
  orderActionRow: { flexDirection: "row", gap: 8, flexShrink: 1 },
  orderActionRowCompact: { width: "100%", justifyContent: "flex-end" },

  declineBtn: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  declineBtnText: { color: CHILI, fontWeight: "800", fontSize: 12.5 },
  acceptBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14, backgroundColor: PURPLE },
  acceptBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  markReadyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: EMERALD },
  markReadyBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  waitingRiderPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  waitingRiderText: { color: "#92400E", fontSize: 12, fontWeight: "800" },

  declineBox: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  declineReasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#CBD5E1" },
  sendDeclineBtn: { backgroundColor: CHILI, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, justifyContent: "center" },

  /* Completed History */
  historyRow: { backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAF8", padding: 12 },
  historyRowExpanded: { borderColor: PURPLE, backgroundColor: "#F8FAFC" },
  historyTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyIcon: { color: EMERALD, fontWeight: "900", fontSize: 14 },
  historyOrderId: { fontSize: 13.5, fontWeight: "800", color: INK },
  historyTotal: { fontSize: 13.5, fontWeight: "700", color: "#475569" },
  historyDetail: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  historyDetailTime: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  historyDetailItem: { fontSize: 12, color: "#334155" },

  /* Product Catalog */
  productsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 14 },
  addProductBtn: { backgroundColor: PURPLE, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 15 },
  addProductBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12.5 },

  addFormCard: { backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#EEEAF8", padding: 16, gap: 12, marginBottom: 16, shadowColor: PURPLE, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  addFormTitle: { fontSize: 15, fontWeight: "900", color: INK },
  productImagePicker: { height: 132, borderRadius: 20, overflow: "hidden", backgroundColor: "#F7F3FF", borderWidth: 1, borderColor: "#DDD6FE" },
  productImagePreview: { width: "100%", height: "100%" },
  productImageEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  productImageEmptyIcon: { fontSize: 28 },
  productImageEmptyText: { color: MUTED, fontSize: 12.5, fontWeight: "800" },
  productImageBadge: { position: "absolute", right: 10, bottom: 10, backgroundColor: PURPLE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  productImageBadgeText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: "#ffffff", color: INK },
  miniInput: { borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12.5, backgroundColor: "#ffffff", color: INK },
  saveProductBtn: { backgroundColor: DARK_PURPLE, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  saveProductBtnDisabled: { opacity: 0.62 },
  saveProductBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13.5 },

  productCard: { backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#EEEAF8", padding: 15, shadowColor: PURPLE, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  productCardSoldOut: { opacity: 0.6, backgroundColor: "#F8FAFC" },
  productCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productThumbButton: { width: 48, height: 48, borderRadius: 16 },
  productThumbImage: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#F4EDFF" },
  productThumbEdit: { position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  productThumbEditText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", lineHeight: 12 },
  productName: { fontSize: 14.5, fontWeight: "900", color: INK },
  productPrice: { fontSize: 13.5, fontWeight: "800", color: EMERALD, marginTop: 2 },
  saveMiniBtn: { backgroundColor: EMERALD, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  saveMiniBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 11.5 },
  availabilityLabel: { fontSize: 10, fontWeight: "900", marginBottom: 2, letterSpacing: 0.5 },

  addonsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  addonsHeaderTitle: { fontSize: 10, fontWeight: "900", color: MUTED, marginBottom: 6 },
  addonRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 3, backgroundColor: "#F7F3FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  addonText: { fontSize: 12.5, color: INK, fontWeight: "700" },
  removeAddonBtn: { padding: 4 },
  removeAddonText: { color: CHILI, fontSize: 13, fontWeight: "800" },
  addAddonBtn: { backgroundColor: DARK_PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, justifyContent: "center" },
  addAddonBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },
  issuesSection: { marginTop: 22, marginBottom: 10 },
  issueList: { gap: 10 },
  issueCard: { backgroundColor: "#FFF7F7", borderWidth: 1, borderColor: "#FECACA", borderRadius: 18, padding: 13 },
  issueTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  issueReason: { color: "#7F1D1D", fontSize: 12.5, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  issueMeta: { color: MUTED, fontSize: 11, fontWeight: "700", marginTop: 8 },
});
