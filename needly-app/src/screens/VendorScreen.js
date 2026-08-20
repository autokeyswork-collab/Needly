import React, { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import Thumb from "../components/Thumb";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { VendorAPI } from "../api/client";

const PURPLE = "#6F45E9";
const DARK_PURPLE = "#15183F";
const EMERALD = "#10B981";
const MANGO = "#F59E0B";
const CHILI = "#EF4444";

export default function VendorScreen() {
  const {
    orders,
    vendors,
    advanceOrder,
    cancelOrder,
    updatePrice,
    addProduct,
    addAddOn,
    removeAddOn,
    toggleProductAvailable,
    toggleVendorOpen,
    disputes,
  } = useOrders();
  const { user } = useAuth();
  const myVendorId = user?.vendor?.id || user?.managedVendor?.id;
  const activeVendor = (vendors || []).find((v) => v.id === myVendorId)
    || user?.vendor
    || user?.managedVendor
    || (vendors && vendors.length > 0 ? vendors[0] : null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    VendorAPI.stats().then(setStats).catch(() => {});
  }, []);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newEmoji, setNewEmoji] = useState("🍽️");
  const [addOnDrafts, setAddOnDrafts] = useState({});
  const [actionError, setActionError] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);

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
      </View>
    );
  }

  const vendorItems = activeVendor.items || [];
  const myOrders = (orders || []).filter((o) => o && o.vendor && (o.vendor.id === myVendorId || o.vendorId === myVendorId));
  const queue = myOrders.filter((o) => {
    const st = (o.status || "").toLowerCase();
    return st !== "delivered" && st !== "cancelled";
  });
  const history = myOrders.filter((o) => (o.status || "").toLowerCase() === "delivered");
  const declined = myOrders.filter((o) => (o.status || "").toLowerCase() === "cancelled");
  const myDisputes = (disputes || []).filter((d) => d.vendorId === myVendorId);
  const openDisputes = myDisputes.filter((d) => (d.status || "").toLowerCase() === "open");

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditPrice(String(item.price));
  };
  const saveEdit = (itemId) => {
    const price = parseInt(editPrice, 10);
    if (!isNaN(price) && price > 0) updatePrice(myVendorId, itemId, price);
    setEditingItemId(null);
  };

  const submitNewProduct = () => {
    const price = parseInt(newPrice, 10);
    if (!newName.trim() || isNaN(price) || price <= 0) return;
    addProduct(myVendorId, { name: newName.trim(), price, emoji: newEmoji || "🍽️" });
    setNewName("");
    setNewPrice("");
    setNewEmoji("🍽️");
    setShowAddForm(false);
  };

  const setDraft = (productId, patch) =>
    setAddOnDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));

  const submitAddOn = (productId) => {
    const draft = addOnDrafts[productId] || {};
    const price = parseInt(draft.price, 10);
    if (!draft.name?.trim() || isNaN(price) || price <= 0) return;
    addAddOn(myVendorId, productId, { name: draft.name.trim(), price });
    setAddOnDrafts((prev) => ({ ...prev, [productId]: { name: "", price: "" } }));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Modern Hero Store Card */}
      <View style={styles.heroStoreCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroVendorInfo}>
            <View style={styles.storeAvatarWrap}>
              <Text style={styles.storeAvatarText}>{activeVendor.emoji || "🍛"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStoreName} numberOfLines={1}>{activeVendor.name}</Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>📍 {activeVendor.area || "Abeokuta"}</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{activeVendor.category}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroStatusWrap}>
            <View style={[styles.statusIndicatorDot, { backgroundColor: activeVendor.isOpen ? EMERALD : CHILI }]} />
            <Text style={[styles.heroStatusText, { color: activeVendor.isOpen ? "#A7F3D0" : "#FCA5A5" }]}>
              {activeVendor.isOpen ? "OPEN" : "CLOSED"}
            </Text>
            <Switch
              value={!!activeVendor.isOpen}
              onValueChange={() => toggleVendorOpen(myVendorId)}
              trackColor={{ true: EMERALD, false: "#475569" }}
              thumbColor="#ffffff"
            />
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

      {/* Active Orders Queue */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Active Orders</Text>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{queue.length} active</Text>
        </View>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardIcon}>📦</Text>
            <Text style={styles.emptyCardTitle}>No Active Orders</Text>
            <Text style={styles.emptyCardText}>New customer orders will appear here automatically in real time.</Text>
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
                  <View style={{ flexDirection: "row", gap: 8 }}>
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
        <View>
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
          <Pressable onPress={submitNewProduct} style={styles.saveProductBtn}>
            <Text style={styles.saveProductBtnText}>Save Product to Menu</Text>
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
                  <Thumb emoji={item.emoji} category={activeVendor.category} size={44} />
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
                    onValueChange={() => toggleProductAvailable(myVendorId, item.id)}
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
                    <Pressable onPress={() => removeAddOn(myVendorId, item.id, addon.id)} style={styles.removeAddonBtn}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 60 },

  noStoreContainer: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, alignItems: "center", justifyContent: "center" },
  noStoreIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  noStoreIcon: { fontSize: 44 },
  noStoreTitle: { fontSize: 22, fontWeight: "900", color: DARK_PURPLE, marginBottom: 8 },
  noStoreText: { fontSize: 13.5, color: "#64748B", textAlign: "center", lineHeight: 20, maxWidth: 310, marginBottom: 20 },
  noStoreBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A" },
  noStoreBadgeText: { color: "#92400E", fontSize: 12.5, fontWeight: "800" },

  /* Hero Banner */
  heroStoreCard: {
    backgroundColor: DARK_PURPLE, borderRadius: 24, padding: 20, marginBottom: 18,
    shadowColor: DARK_PURPLE, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroVendorInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  storeAvatarWrap: { width: 54, height: 54, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  storeAvatarText: { fontSize: 32 },
  heroStoreName: { fontSize: 21, fontWeight: "900", color: "#ffffff", marginBottom: 4 },
  heroMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  heroPill: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  heroPillText: { color: "rgba(255,255,255,0.9)", fontSize: 11.5, fontWeight: "700" },

  heroStatusWrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  statusIndicatorDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  heroStatusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginBottom: 4 },

  alertBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, padding: 14, marginBottom: 16 },
  alertText: { color: "#991B1B", fontSize: 13 },
  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, padding: 14, marginBottom: 16 },
  errorText: { color: "#991B1B", fontSize: 13 },

  /* Stats Grid */
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statLabel: { fontSize: 10, fontWeight: "900", color: "#64748B", marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: "900", color: DARK_PURPLE },
  statSub: { fontSize: 11, color: "#64748B", marginTop: 2, fontWeight: "600" },

  /* Section Headers */
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: DARK_PURPLE },
  sectionSubTitle: { fontSize: 12, color: "#64748B", marginTop: 2, fontWeight: "600" },
  badgePill: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgePillText: { color: PURPLE, fontSize: 11.5, fontWeight: "800" },

  /* Empty State */
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 24, alignItems: "center" },
  emptyCardIcon: { fontSize: 36, marginBottom: 8 },
  emptyCardTitle: { fontSize: 15, fontWeight: "800", color: DARK_PURPLE },
  emptyCardText: { fontSize: 12.5, color: "#64748B", textAlign: "center", marginTop: 4 },

  /* Order Cards */
  orderCard: {
    backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 10 },
  orderId: { fontWeight: "900", fontSize: 15, color: DARK_PURPLE },
  orderTimeText: { fontSize: 11.5, color: "#64748B", fontWeight: "600" },

  itemsList: { gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBadge: { backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  qtyBadgeText: { fontSize: 12, fontWeight: "800", color: DARK_PURPLE },
  itemNameText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: DARK_PURPLE },
  itemPriceText: { fontSize: 13.5, fontWeight: "700", color: "#334155" },

  orderCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  totalLabel: { fontSize: 9.5, fontWeight: "900", color: "#64748B", letterSpacing: 0.5 },
  totalValue: { fontSize: 17, fontWeight: "900", color: DARK_PURPLE },

  declineBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  declineBtnText: { color: CHILI, fontWeight: "800", fontSize: 12.5 },
  acceptBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: PURPLE },
  acceptBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  markReadyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: EMERALD },
  markReadyBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  waitingRiderPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  waitingRiderText: { color: "#92400E", fontSize: 12, fontWeight: "800" },

  declineBox: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  declineReasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#CBD5E1" },
  sendDeclineBtn: { backgroundColor: CHILI, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, justifyContent: "center" },

  /* Completed History */
  historyRow: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  historyRowExpanded: { borderColor: PURPLE, backgroundColor: "#F8FAFC" },
  historyTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyIcon: { color: EMERALD, fontWeight: "900", fontSize: 14 },
  historyOrderId: { fontSize: 13.5, fontWeight: "800", color: DARK_PURPLE },
  historyTotal: { fontSize: 13.5, fontWeight: "700", color: "#475569" },
  historyDetail: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  historyDetailTime: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  historyDetailItem: { fontSize: 12, color: "#334155" },

  /* Product Catalog */
  productsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 14 },
  addProductBtn: { backgroundColor: PURPLE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  addProductBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },

  addFormCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, gap: 12, marginBottom: 16 },
  addFormTitle: { fontSize: 15, fontWeight: "900", color: DARK_PURPLE },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: "#ffffff", color: DARK_PURPLE },
  miniInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12.5, backgroundColor: "#ffffff", color: DARK_PURPLE },
  saveProductBtn: { backgroundColor: DARK_PURPLE, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  saveProductBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13.5 },

  productCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  productCardSoldOut: { opacity: 0.6, backgroundColor: "#F8FAFC" },
  productCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productName: { fontSize: 15, fontWeight: "800", color: DARK_PURPLE },
  productPrice: { fontSize: 13.5, fontWeight: "800", color: EMERALD, marginTop: 2 },
  saveMiniBtn: { backgroundColor: EMERALD, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  saveMiniBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 11.5 },
  availabilityLabel: { fontSize: 10, fontWeight: "900", marginBottom: 2, letterSpacing: 0.5 },

  addonsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  addonsHeaderTitle: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 0.5, marginBottom: 6 },
  addonRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 3, backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  addonText: { fontSize: 12.5, color: DARK_PURPLE, fontWeight: "600" },
  removeAddonBtn: { padding: 4 },
  removeAddonText: { color: CHILI, fontSize: 13, fontWeight: "800" },
  addAddonBtn: { backgroundColor: DARK_PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, justifyContent: "center" },
  addAddonBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },
});
