import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { AUTO_PROVIDERS } from "../../data/serviceData";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useOrders } from "../../context/OrdersContext";

const INK = "#15183F";
const PURPLE = "#6F45E9";

export default function AutoBookingScreen({ route, navigation }) {
  const initialProviderId = route.params?.providerId || AUTO_PROVIDERS[0].id;
  const [providerId, setProviderId] = useState(initialProviderId);
  const provider = AUTO_PROVIDERS.find((p) => p.id === providerId) || AUTO_PROVIDERS[0];
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

  const providerOptions = useMemo(() => AUTO_PROVIDERS.map((p) => ({ label: `${p.name} - ${p.area}`, value: p.id })), []);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking({
        serviceId: service.id,
        providerName: provider.name,
        category: "Auto",
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.overline}>BOOK AUTO SERVICE</Text>
      <Text style={styles.title}>Find a mechanic near you</Text>
      <Text style={styles.subtitle}>Choose a provider, service, time, and location. This creates a customer booking request inside Needly.</Text>

      <Text style={styles.label}>PROVIDER</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={providerId}
          onValueChange={(value) => {
            const nextProvider = AUTO_PROVIDERS.find((p) => p.id === value);
            setProviderId(value);
            setServiceId(nextProvider?.services[0]?.id);
          }}
        >
          {providerOptions.map((p) => <Picker.Item key={p.value} label={p.label} value={p.value} />)}
        </Picker>
      </View>
      <View style={styles.providerCard}>
        <Text style={styles.providerName}>{provider.name}</Text>
        <Text style={styles.meta}>{provider.distance} · {provider.eta} · ★ {provider.rating}</Text>
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

      <Text style={styles.label}>VEHICLE INFORMATION</Text>
      <TextInput value={vehicle} onChangeText={setVehicle} placeholder="e.g. Toyota Corolla 2012" style={styles.input} />

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
        <Text style={styles.submitText}>Confirm booking</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 36 },
  overline: { color: PURPLE, fontSize: 11, fontWeight: "900", marginBottom: 8 },
  title: { color: INK, fontSize: 25, fontWeight: "900" },
  subtitle: { color: COLORS.mute, fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 18 },
  label: { color: COLORS.mute, fontSize: 11, fontWeight: "900", marginBottom: 7, marginTop: 12 },
  pickerWrap: { borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 14, overflow: "hidden", backgroundColor: "#fff" },
  providerCard: { backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 16, padding: 13, marginTop: 10 },
  providerName: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: COLORS.mute, fontSize: 12.5, marginTop: 3 },
  serviceList: { gap: 8 },
  serviceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 16, padding: 13 },
  serviceCardActive: { borderColor: PURPLE, backgroundColor: "#F8F5FF" },
  serviceName: { color: INK, fontSize: 14, fontWeight: "900" },
  price: { color: INK, fontSize: 13.5, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: INK, backgroundColor: "#fff" },
  twoCol: { flexDirection: "row", gap: 10 },
  notes: { minHeight: 78, textAlignVertical: "top" },
  summaryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 16, padding: 14, marginTop: 16 },
  summaryLabel: { color: COLORS.mute, fontSize: 13, fontWeight: "700" },
  summaryPrice: { color: INK, fontSize: 18, fontWeight: "900" },
  submitBtn: { backgroundColor: PURPLE, borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 14 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
