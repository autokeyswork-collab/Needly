import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { ALL_SERVICE_PROVIDERS, AUTO_PROVIDERS } from "../../data/serviceData";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";
import CustomerBottomNav from "../../components/CustomerBottomNav";

const INK = "#15183F";
const PURPLE = "#6F45E9";
const PURPLE_DARK = "#35109B";
const MUTED = "#777991";
const LINE = "#ECE8F7";

export default function AutoBookingScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const providers = ALL_SERVICE_PROVIDERS.length ? ALL_SERVICE_PROVIDERS : AUTO_PROVIDERS;
  const initialProviderId = route.params?.providerId || providers[0].id;
  const [providerId, setProviderId] = useState(initialProviderId);
  const provider = providers.find((p) => p.id === providerId) || providers[0];
  const providerCategory = provider.category || "Auto";
  const initialServiceId = route.params?.serviceId || provider.services[0].id;
  const [serviceId, setServiceId] = useState(initialServiceId);
  const service = provider.services.find((s) => s.id === serviceId) || provider.services[0];
  const [vehicle, setVehicle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { createBooking } = useOrders();

  const canSubmit = vehicle.trim() && location.trim() && date.trim() && time.trim() && !submitting;

  const providerOptions = useMemo(() => providers.map((p) => ({ label: `${p.name} - ${p.area}`, value: p.id })), [providers]);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking({
        serviceId: service.id,
        providerName: provider.name,
        category: providerCategory,
        address: location.trim(),
        phone: "",
        total: service.price,
        scheduledAt: new Date().toISOString(),
        notes: `Vehicle: ${vehicle.trim()} | Date: ${date.trim()} ${time.trim()} | ${notes.trim()}`.trim(),
      });
      navigation.replace("CustomerBookings");
    } catch (err) {
      setError(err.message || "Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Pressable style={styles.backCircle} onPress={() => navigation.navigate("Browse")}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="car-wrench" size={22} color="#fff" />
          </View>
        </View>
        <Text style={styles.overline}>BOOK {providerCategory.toUpperCase()} SERVICE</Text>
        <Text style={styles.title}>Book auto service</Text>
        <Text style={styles.subtitle}>Choose a trusted provider, time, and Abeokuta location.</Text>
      </View>

      <Text style={styles.label}>PROVIDER</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={providerId}
          onValueChange={(value) => {
            const nextProvider = providers.find((p) => p.id === value);
            setProviderId(value);
            setServiceId(nextProvider?.services[0]?.id);
          }}
        >
          {providerOptions.map((p) => <Picker.Item key={p.value} label={p.label} value={p.value} />)}
        </Picker>
      </View>
      <View style={styles.providerCard}>
        <View style={styles.providerIcon}>
          <MaterialCommunityIcons name="storefront-outline" size={20} color={PURPLE} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.providerName}>{provider.name}</Text>
        <Text style={styles.meta}>{provider.distance} · {provider.eta} · ★ {provider.rating}</Text>
        </View>
      </View>

      <Text style={styles.label}>SERVICE</Text>
      <View style={styles.serviceList}>
        {provider.services.map((s) => {
          const active = s.id === service.id;
          return (
            <Pressable key={s.id} onPress={() => setServiceId(s.id)} style={[styles.serviceCard, active && styles.serviceCardActive]}>
              <View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.meta}>{s.duration}</Text>
              </View>
              <Text style={styles.price}>{fmtNaira(s.price)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>SERVICE DETAILS</Text>
      <TextInput value={vehicle} onChangeText={setVehicle} placeholder={providerCategory === "Auto" ? "e.g. Toyota Corolla 2012" : "What do you need help with?"} style={styles.input} />

      <Text style={styles.label}>SERVICE LOCATION</Text>
      <TextInput value={location} onChangeText={setLocation} placeholder="Street, landmark, area in Abeokuta" style={styles.input} />

      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>DATE</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="e.g. 18 Aug" style={styles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>TIME</Text>
          <TextInput value={time} onChangeText={setTime} placeholder="e.g. 10:30 AM" style={styles.input} />
        </View>
      </View>

      <Text style={styles.label}>NOTES</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="Describe the issue, if any" multiline numberOfLines={3} style={[styles.input, styles.notes]} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Estimated service cost</Text>
        <Text style={styles.summaryPrice}>{fmtNaira(service.price)}</Text>
      </View>

      <Pressable disabled={!canSubmit} onPress={submit} style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }]}>
        <FontAwesome name="calendar-check-o" size={16} color="#fff" />
        <Text style={styles.submitText}>Confirm booking</Text>
      </Pressable>
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="CustomerBookings" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 124 },
  hero: { borderRadius: 28, padding: 16, backgroundColor: PURPLE_DARK, marginBottom: 16, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 31, lineHeight: 31, fontWeight: "800" },
  heroIcon: { width: 42, height: 42, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  overline: { color: "rgba(255,255,255,0.76)", fontSize: 11, fontWeight: "900", marginBottom: 7 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  label: { color: MUTED, fontSize: 11, fontWeight: "900", marginBottom: 7, marginTop: 12 },
  pickerWrap: { borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 14, overflow: "hidden", backgroundColor: "#fff" },
  providerCard: { backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 13, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  providerIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  providerName: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: COLORS.mute, fontSize: 12.5, marginTop: 3 },
  serviceList: { gap: 8 },
  serviceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: LINE, borderRadius: 18, padding: 13, gap: 10 },
  serviceCardActive: { borderColor: PURPLE, backgroundColor: "#F8F5FF" },
  serviceName: { color: INK, fontSize: 14, fontWeight: "900" },
  price: { color: INK, fontSize: 13.5, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: INK, backgroundColor: "#fff" },
  twoCol: { flexDirection: "row", gap: 10 },
  notes: { minHeight: 78, textAlignVertical: "top" },
  summaryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 16, padding: 14, marginTop: 16 },
  summaryLabel: { color: COLORS.mute, fontSize: 13, fontWeight: "700" },
  summaryPrice: { color: INK, fontSize: 18, fontWeight: "900" },
  submitBtn: { backgroundColor: PURPLE, borderRadius: 22, minHeight: 54, paddingVertical: 15, alignItems: "center", justifyContent: "center", marginTop: 14, flexDirection: "row", gap: 8 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
