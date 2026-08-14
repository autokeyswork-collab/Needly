import React, { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import Thumb from "../components/Thumb";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { VendorAPI } from "../api/client";

export default function VendorScreen() {
  const { orders, vendors, advanceOrder, cancelOrder, updatePrice, addProduct, addAddOn, removeAddOn, toggleProductAvailable, toggleVendorOpen, disputes } = useOrders();
  const { user } = useAuth();
  const myVendorId = user?.vendor?.id;
  const activeVendor = vendors.find((v) => v.id === myVendorId);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    VendorAPI.stats().then(setStats).catch(() => {});
  }, []);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newEmoji, setNewEmoji] = useState("\uD83C\uDF7D\uFE0F");
  const [addOnDrafts, setAddOnDrafts] = useState({}); // { [productId]: { name, price } }
  const [actionError, setActionError] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [decliningOrderId, setDecliningOrderId] = useState(null);
  const [declineOtherNote, setDeclineOtherNote] = useState(null);

  const acceptOrder = async (orderId) => {
    setActionError(null);
    try { await advanceOrder(orderId); } catch (err) { setActionError(err.message); }
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
      <View style={{ flex: 1, backgroundColor: COLORS.paper, padding: 16 }}>
        <Text style={{ color: COLORS.mute }}>No store is linked to this account yet.</Text>
      </View>
    );
  }

  const myOrders = orders.filter((o) => o.vendor.id === myVendorId);
  const queue = myOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const history = myOrders.filter((o) => o.status === "delivered");
  const declined = myOrders.filter((o) => o.status === "cancelled");
  const myDisputes = disputes.filter((d) => d.vendorId === myVendorId);
  const openDisputes = myDisputes.filter((d) => d.status === "open");

  const startEdit = (item) => { setEditingItemId(item.id); setEditPrice(String(item.price)); };
  const saveEdit = (itemId) => {
    const price = parseInt(editPrice, 10);
    if (!isNaN(price) && price > 0) updatePrice(myVendorId, itemId, price);
    setEditingItemId(null);
  };

  const submitNewProduct = () => {
    const price = parseInt(newPrice, 10);
    if (!newName.trim() || isNaN(price) || price <= 0) return;
    addProduct(myVendorId, { name: newName.trim(), price, emoji: newEmoji || "\uD83C\uDF7D\uFE0F" });
    setNewName(""); setNewPrice(""); setNewEmoji("\uD83C\uDF7D\uFE0F"); setShowAddForm(false);
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
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.paper }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.storeCard}>
        <View>
          <Text style={styles.storeName}>{activeVendor.name}</Text>
          <Text style={styles.storeMeta}>{activeVendor.area} {"\u00B7"} {activeVendor.category}</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.storeStatusLabel}>{activeVendor.isOpen ? "OPEN" : "CLOSED"}</Text>
          <Switch value={activeVendor.isOpen} onValueChange={() => toggleVendorOpen(myVendorId)} trackColor={{ true: COLORS.green }} />
        </View>
      </View>

      {openDisputes.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={{ fontSize: 13.5 }}>
            <Text style={{ color: COLORS.chili, fontWeight: "700" }}>
              {openDisputes.length} open dispute{openDisputes.length > 1 ? "s" : ""}
            </Text>
            {" "}on your orders {"\u2014"} see below.
          </Text>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={{ color: COLORS.chili, fontSize: 12.5 }}>{actionError}</Text>
        </View>
      )}
      {stats && (
        <View style={styles.statGrid}>
          {[{ label: "Today", data: stats.today }, { label: "This week", data: stats.week }, { label: "This month", data: stats.month }].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              <Text style={styles.statValue}>{fmtNaira(s.data.revenue)}</Text>
              <Text style={styles.statSub}>{s.data.orders} order{s.data.orders === 1 ? "" : "s"}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.sectionTitle}>Active orders ({queue.length})</Text>
      <FlatList
        data={queue}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No active orders right now.</Text>}
        contentContainerStyle={{ gap: 10, marginBottom: 10 }}
        renderItem={({ item: o }) => {
          const declining = decliningOrderId === o.id;
          return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{o.id.slice(-6)}</Text>
              <StatusPill status={o.status} />
            </View>
            {o.items.map((i) => (
              <Text key={i.id} style={{ fontSize: 13.5 }}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
            ))}
            <View style={styles.cardFooter}>
              <Text style={styles.total}>{fmtNaira(o.total)}</Text>
              {o.status === "placed" && !declining && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={styles.declineBtn} onPress={() => setDecliningOrderId(o.id)}>
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.ink }]} onPress={() => acceptOrder(o.id)}>
                    <Text style={styles.actionBtnText}>Accept order</Text>
                  </Pressable>
                </View>
              )}
              {o.status === "accepted" && (
                <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.green }]} onPress={() => acceptOrder(o.id)}>
                  <Text style={styles.actionBtnText}>Mark ready</Text>
                </Pressable>
              )}
              {(o.status === "ready" || o.status === "picked_up") && <Pill tone="mango">Waiting on rider</Pill>}
            </View>
            {o.status === "placed" && declining && (
              <View style={styles.declineBox}>
                <Text style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: 8 }}>Why are you declining this order?</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: declineOtherNote !== null ? 8 : 0 }}>
                  {["Item(s) out of stock", "Kitchen too busy right now", "Closing soon", "Can't fulfill this order", "Other"].map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => (reason === "Other" ? setDeclineOtherNote("") : declineOrder(o.id, reason))}
                      style={styles.declineReasonChip}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600" }}>{reason}</Text>
                    </Pressable>
                  ))}
                </View>
                {declineOtherNote !== null && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput
                      value={declineOtherNote} onChangeText={setDeclineOtherNote}
                      placeholder="Say a bit more\u2026" style={[styles.miniInput, { flex: 1 }]}
                    />
                    <Pressable onPress={() => declineOrder(o.id, declineOtherNote.trim() || "Other")} style={[styles.actionBtn, { backgroundColor: COLORS.chili }]}>
                      <Text style={styles.actionBtnText}>Send</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable onPress={() => { setDecliningOrderId(null); setDeclineOtherNote(null); }}>
                  <Text style={{ color: COLORS.mute, fontSize: 12, marginTop: 8 }}>Never mind</Text>
                </Pressable>
              </View>
            )}
          </View>
          );
        }}
      />

      <Text style={[styles.sectionTitle, { color: COLORS.mute, marginTop: 16 }]}>Completed today ({history.length})</Text>
      <FlatList
        data={history}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        contentContainerStyle={{ marginBottom: 20, gap: 4 }}
        renderItem={({ item: o }) => {
          const expanded = expandedHistoryId === o.id;
          return (
            <Pressable onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={expanded ? styles.historyRowExpanded : undefined}>
              <View style={styles.historyRow}>
                <Text style={{ color: COLORS.mute, fontSize: 13 }}>#{o.id.slice(-6)}</Text>
                <Text style={{ color: COLORS.mute, fontSize: 13 }}>{fmtNaira(o.total)}</Text>
              </View>
              {expanded && (
                <View style={styles.historyDetail}>
                  <Text style={styles.historyDetailTime}>
                    {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {o.items.map((i) => (
                    <Text key={i.id} style={styles.historyDetailItem}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
                  ))}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {declined.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: COLORS.mute }]}>Declined ({declined.length})</Text>
          <FlatList
            data={declined}
            keyExtractor={(o) => o.id}
            scrollEnabled={false}
            contentContainerStyle={{ marginBottom: 20, gap: 4 }}
            renderItem={({ item: o }) => {
              const expanded = expandedHistoryId === o.id;
              return (
                <Pressable onPress={() => setExpandedHistoryId(expanded ? null : o.id)} style={expanded ? styles.historyRowExpanded : undefined}>
                  <View style={styles.historyRow}>
                    <Text style={{ color: COLORS.mute, fontSize: 13 }}>#{o.id.slice(-6)}</Text>
                    <Text style={{ color: COLORS.mute, fontSize: 13 }}>{fmtNaira(o.total)}</Text>
                  </View>
                  {expanded && (
                    <View style={styles.historyDetail}>
                      <Text style={styles.historyDetailTime}>
                        {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      {o.items.map((i) => (
                        <Text key={i.id} style={styles.historyDetailItem}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </>
      )}

      <Text style={styles.sectionTitle}>Disputes ({myDisputes.length})</Text>
      <FlatList
        data={myDisputes}
        keyExtractor={(d) => d.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No disputes on your orders.</Text>}
        contentContainerStyle={{ gap: 8, marginBottom: 20 }}
        renderItem={({ item: d }) => (
          <View style={[
            styles.disputeRow,
            { backgroundColor: d.status === "open" ? "#FCE8E6" : COLORS.panel, borderColor: d.status === "open" ? COLORS.chili : COLORS.line },
          ]}>
            <View>
              <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{d.reason}</Text>
              <Text style={{ fontSize: 12, color: COLORS.mute }}>Order #{d.orderId.slice(-6)} {"\u00B7"} {fmtNaira(d.total || 0)}</Text>
            </View>
            <Pill tone={d.status === "open" ? "chili" : "green"}>{d.status.toUpperCase()}</Pill>
          </View>
        )}
      />

      <View style={styles.productsHeader}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>My products ({activeVendor.items.length})</Text>
        <Pressable onPress={() => setShowAddForm((s) => !s)} style={[styles.actionBtn, { backgroundColor: COLORS.mango }]}>
          <Text style={styles.actionBtnText}>{showAddForm ? "Cancel" : "+ Add product"}</Text>
        </Pressable>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput value={newName} onChangeText={setNewName} placeholder="Product name" style={styles.input} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={newEmoji} onChangeText={setNewEmoji} placeholder="Emoji" style={[styles.input, { width: 60, textAlign: "center" }]} />
            <TextInput
              value={newPrice} onChangeText={(t) => setNewPrice(t.replace(/[^0-9]/g, ""))}
              placeholder="Price (\u20A6)" keyboardType="numeric" style={[styles.input, { flex: 1 }]}
            />
          </View>
          <Pressable onPress={submitNewProduct} style={[styles.actionBtn, { backgroundColor: COLORS.ink, alignItems: "center" }]}>
            <Text style={styles.actionBtnText}>Save product</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={activeVendor.items}
        keyExtractor={(i) => i.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item: i }) => (
          <View style={[styles.productRow, i.isAvailable === false && { opacity: 0.55 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <Thumb emoji={i.emoji} category={activeVendor.category} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", fontSize: 14.5, color: COLORS.ink }}>{i.name}</Text>
                {i.subcategory && <Text style={{ fontSize: 11.5, color: COLORS.mute }}>{i.subcategory}</Text>}

                {editingItemId === i.id ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <TextInput
                      value={editPrice} onChangeText={(t) => setEditPrice(t.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric" style={[styles.input, { width: 84, paddingVertical: 6 }]}
                    />
                    <Pressable onPress={() => saveEdit(i.id)} style={[styles.actionBtn, { backgroundColor: COLORS.green }]}>
                      <Text style={styles.actionBtnText}>Save</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: COLORS.mute }}>{fmtNaira(i.price)}</Text>
                    <Pressable onPress={() => startEdit(i)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit price</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleProductAvailable(myVendorId, i.id)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>{i.isAvailable === false ? "Mark available" : "Mark unavailable"}</Text>
                    </Pressable>
                  </View>
                )}

                {(i.addOns || []).length > 0 && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {i.addOns.map((a) => (
                      <View key={a.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 12, color: COLORS.mute }}>+ {a.name} ({fmtNaira(a.price)})</Text>
                        <Pressable onPress={() => removeAddOn(myVendorId, i.id, a.id)}>
                          <Text style={{ fontSize: 11.5, color: COLORS.chili, fontWeight: "600" }}>Remove</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  <TextInput
                    value={addOnDrafts[i.id]?.name || ""} onChangeText={(t) => setDraft(i.id, { name: t })}
                    placeholder="Add-on name" style={[styles.input, { flex: 1, paddingVertical: 6, fontSize: 12.5 }]}
                  />
                  <TextInput
                    value={addOnDrafts[i.id]?.price || ""} onChangeText={(t) => setDraft(i.id, { price: t.replace(/[^0-9]/g, "") })}
                    placeholder="\u20A6" keyboardType="numeric" style={[styles.input, { width: 60, paddingVertical: 6, fontSize: 12.5 }]}
                  />
                  <Pressable onPress={() => submitAddOn(i.id)} style={[styles.editBtn, { justifyContent: "center" }]}>
                    <Text style={styles.editBtnText}>+ Add-on</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  storeCard: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18,
  },
  storeName: { fontWeight: "800", fontSize: 16, color: COLORS.ink },
  storeMeta: { fontSize: 12, color: COLORS.mute, marginTop: 2 },
  storeStatusLabel: { fontSize: 10, fontWeight: "700", color: COLORS.mute, marginBottom: 2 },
  alertBox: { backgroundColor: "#FCE8E6", borderWidth: 1, borderColor: COLORS.chili, borderRadius: 12, padding: 12, marginBottom: 18 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: COLORS.ink },
  card: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, gap: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  orderId: { fontSize: 12.5, color: COLORS.mute },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  total: { fontWeight: "700", fontSize: 13.5 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  declineBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.chili },
  declineBox: { backgroundColor: COLORS.paper, borderRadius: 10, padding: 10, marginTop: 10 },
  declineReasonChip: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  miniInput: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12.5, backgroundColor: "#fff" },
  declineBtnText: { color: COLORS.chili, fontWeight: "700", fontSize: 12.5 },
  errorBox: { backgroundColor: "#FCE8E6", borderWidth: 1, borderColor: COLORS.chili, borderRadius: 10, padding: 10, marginBottom: 12 },
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 10 },
  statLabel: { fontSize: 9.5, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  statSub: { fontSize: 10.5, color: COLORS.mute, marginTop: 2 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  historyRowExpanded: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 10, marginVertical: 2 },
  historyDetail: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.line, borderStyle: "dashed" },
  historyDetailTime: { fontSize: 11.5, color: COLORS.mute, marginBottom: 4 },
  historyDetailItem: { fontSize: 13, color: COLORS.ink, marginBottom: 2 },
  disputeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  productsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addForm: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 10,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: COLORS.ink, backgroundColor: "#fff",
  },
  productRow: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12,
  },
  editBtn: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.ink },
});
