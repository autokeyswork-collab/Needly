import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import { useAuth } from "../../context/AuthContext";
import { PaymentAPI } from "../../api/client";

export default function CartScreen({ route, navigation }) {
  const { vendorId, cart } = route.params;
  const { vendors, placeOrder } = useOrders();
  const { user } = useAuth();
  const vendor = vendors.find((v) => v.id === vendorId);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!vendor) return null;

  const items = vendor.items.filter((i) => cart[i.id] > 0).map((i) => ({ ...i, qty: cart[i.id] }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const canCheckout = deliveryAddress.trim() && deliveryPhone.trim() && !submitting;

  const checkout = async () => {
    if (!canCheckout) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await placeOrder(
        vendor.id,
        items.map((i) => ({ productId: i.id, qty: i.qty, addOns: [] })),
        deliveryAddress.trim(),
        deliveryPhone.trim(),
      );
      // The order existing isn't enough — nothing marks it paid until the
      // customer actually completes checkout with Paystack. Without this
      // call, the order sits created forever, invisible to the vendor,
      // with no way for anyone to ever pay for it.
      const { authorizationUrl } = await PaymentAPI.initialize(id);
      await Linking.openURL(authorizationUrl);
      navigation.replace("Tracking", { orderId: id });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.paper }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Your Order</Text>
      {items.map((i) => (
        <View key={i.id} style={styles.itemRow}>
          <Text style={{ fontSize: 14 }}>{i.qty} {"\u00D7"} {i.name}</Text>
          <Text style={{ fontSize: 14 }}>{fmtNaira(i.price * i.qty)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={{ fontWeight: "700" }}>Total</Text>
        <Text style={{ fontWeight: "700" }}>{fmtNaira(total)}</Text>
      </View>

      <Text style={styles.label}>DELIVERY ADDRESS</Text>
      <TextInput
        value={deliveryAddress} onChangeText={setDeliveryAddress}
        placeholder="Street, house/flat number, landmark"
        style={styles.input} multiline
      />
      <Text style={styles.label}>PHONE NUMBER</Text>
      <TextInput
        value={deliveryPhone} onChangeText={setDeliveryPhone}
        placeholder="For the rider to reach you"
        keyboardType="phone-pad" style={styles.input}
      />
      {!deliveryAddress.trim() || !deliveryPhone.trim() ? (
        <Text style={styles.hint}>Add a delivery address and phone number to place your order.</Text>
      ) : null}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.checkoutBtn, !canCheckout && { opacity: 0.5 }]} onPress={checkout} disabled={!canCheckout}>
        {submitting ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.checkoutBtnText}>Continue to payment {"\u00B7"} {fmtNaira(total)}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 19, color: COLORS.ink, marginBottom: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1,
    borderTopColor: COLORS.line, borderStyle: "dashed", paddingTop: 10, marginTop: 6, marginBottom: 20,
  },
  label: { fontSize: 11, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: COLORS.ink, backgroundColor: COLORS.panel, marginBottom: 14,
  },
  hint: { fontSize: 12, color: COLORS.chili, marginBottom: 10 },
  error: { fontSize: 12.5, color: COLORS.chili, marginBottom: 10 },
  checkoutBtn: { backgroundColor: COLORS.ink, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
