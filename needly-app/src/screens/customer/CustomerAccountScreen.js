import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { COLORS } from "../../theme/colors";
import { AuthAPI } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const INK = "#15183F";
const MUTED = "#747792";
const PURPLE = "#6F45E9";
const PURPLE_DARK = "#35109B";

const FALLBACK_LOCATIONS = [
  { state: "Ogun", city: "Abeokuta" },
  { state: "Lagos", city: "Lagos" },
  { state: "Oyo", city: "Ibadan" },
  { state: "FCT", city: "Abuja" },
  { state: "Rivers", city: "Port Harcourt" },
  { state: "Abia", city: "Umuahia" },
  { state: "Adamawa", city: "Yola" },
  { state: "Akwa Ibom", city: "Uyo" },
  { state: "Anambra", city: "Awka" },
  { state: "Bauchi", city: "Bauchi" },
  { state: "Bayelsa", city: "Yenagoa" },
  { state: "Benue", city: "Makurdi" },
  { state: "Borno", city: "Maiduguri" },
  { state: "Cross River", city: "Calabar" },
  { state: "Delta", city: "Asaba" },
  { state: "Ebonyi", city: "Abakaliki" },
  { state: "Edo", city: "Benin City" },
  { state: "Ekiti", city: "Ado-Ekiti" },
  { state: "Enugu", city: "Enugu" },
  { state: "FCT", city: "Abuja" },
  { state: "Gombe", city: "Gombe" },
  { state: "Imo", city: "Owerri" },
  { state: "Jigawa", city: "Dutse" },
  { state: "Kaduna", city: "Kaduna" },
  { state: "Kano", city: "Kano" },
  { state: "Katsina", city: "Katsina" },
  { state: "Kebbi", city: "Birnin Kebbi" },
  { state: "Kogi", city: "Lokoja" },
  { state: "Kwara", city: "Ilorin" },
  { state: "Nasarawa", city: "Lafia" },
  { state: "Niger", city: "Minna" },
  { state: "Ondo", city: "Akure" },
  { state: "Osun", city: "Osogbo" },
  { state: "Plateau", city: "Jos" },
  { state: "Sokoto", city: "Sokoto" },
  { state: "Taraba", city: "Jalingo" },
  { state: "Yobe", city: "Damaturu" },
  { state: "Zamfara", city: "Gusau" },
];

function uniqueByCity(locations) {
  const seen = new Set();
  return locations.filter((location) => {
    const key = `${location.state}-${location.city}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CustomerAccountScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [locationState, setLocationState] = useState(user?.locationState || "Ogun");
  const [locationCity, setLocationCity] = useState(user?.locationCity || "Abeokuta");
  const [address, setAddress] = useState(user?.address || "");
  const [locations, setLocations] = useState(FALLBACK_LOCATIONS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setLocationState(user?.locationState || "Ogun");
    setLocationCity(user?.locationCity || "Abeokuta");
    setAddress(user?.address || "");
  }, [user]);

  useEffect(() => {
    let mounted = true;
    AuthAPI.locations().then((rows) => {
      if (!mounted || !Array.isArray(rows)) return;
      const remote = rows
        .filter((item) => item?.name)
        .map((item) => ({ state: item.state || item.parentName || item.region || "", city: item.name }));
      setLocations(uniqueByCity([...remote, ...FALLBACK_LOCATIONS]));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const stateOptions = useMemo(() => {
    return Array.from(new Set(locations.map((item) => item.state).filter(Boolean))).sort();
  }, [locations]);

  const cityOptions = useMemo(() => {
    return locations.filter((item) => !locationState || item.state === locationState);
  }, [locations, locationState]);

  const quickLocations = useMemo(() => {
    const priority = [
      ...locations.filter((item) => item.city === locationCity),
      ...locations.filter((item) => ["Abeokuta", "Lagos", "Ibadan", "Abuja", "Port Harcourt"].includes(item.city)),
      ...locations,
    ];
    return uniqueByCity(priority).slice(0, 8);
  }, [locations, locationCity]);

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({
        name,
        phone,
        locationState,
        locationCity,
        address,
      });
      setMessage("Profile updated. Your marketplace location is now saved.");
    } catch (err) {
      setError(err.message || "Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.navigate("Browse")}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "N"}</Text>
            </View>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Update your customer details and delivery location.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.identityRow}>
              <View style={styles.smallAvatar}>
                <Text style={styles.smallAvatarText}>{user?.name?.charAt(0)?.toUpperCase() || "N"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user?.name || "Needly Customer"}</Text>
                <Text numberOfLines={1} style={styles.meta}>{user?.email}</Text>
              </View>
            </View>

            <Field label="Full name" icon="user">
              <TextInput value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#9A9CB0" style={styles.input} />
            </Field>

            <Field label="Phone number" icon="phone">
              <TextInput value={phone} onChangeText={setPhone} placeholder="080..." placeholderTextColor="#9A9CB0" keyboardType="phone-pad" style={styles.input} />
            </Field>

            <Text style={styles.sectionTitle}>Marketplace location</Text>
            <Text style={styles.helper}>Choose where Needly should show vendors, products and delivery options.</Text>

            <View style={styles.pickerBlock}>
              <Text style={styles.label}>State</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={locationState}
                  onValueChange={(value) => {
                    setLocationState(value);
                    const firstCity = locations.find((item) => item.state === value)?.city;
                    if (firstCity) setLocationCity(firstCity);
                  }}
                  style={styles.picker}
                >
                  {stateOptions.map((state) => (
                    <Picker.Item key={state} label={state} value={state} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.pickerBlock}>
              <Text style={styles.label}>City or area</Text>
              <View style={styles.pickerShell}>
                <Picker selectedValue={locationCity} onValueChange={setLocationCity} style={styles.picker}>
                  {cityOptions.map((item) => (
                    <Picker.Item key={`${item.state}-${item.city}`} label={item.city} value={item.city} />
                  ))}
                  {!cityOptions.some((item) => item.city === locationCity) && (
                    <Picker.Item label={locationCity || "Choose city"} value={locationCity} />
                  )}
                </Picker>
              </View>
            </View>

            <View style={styles.quickLocations}>
              {quickLocations.map((item) => (
                <Pressable
                  key={`${item.state}-${item.city}`}
                  style={[styles.locationChip, item.city === locationCity && styles.locationChipActive]}
                  onPress={() => {
                    setLocationState(item.state || locationState);
                    setLocationCity(item.city);
                  }}
                >
                  <Text style={[styles.locationChipText, item.city === locationCity && styles.locationChipTextActive]}>{item.city}</Text>
                </Pressable>
              ))}
            </View>

            <Field label="Delivery address" icon="map-marker">
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street, landmark or house address"
                placeholderTextColor="#9A9CB0"
                style={[styles.input, styles.addressInput]}
                multiline
              />
            </Field>

            {!!message && <Text style={styles.success}>{message}</Text>}
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.saveText}>Save Profile</Text>
                  <FontAwesome name="check" size={14} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.listCard}>
            {[
              ["Saved addresses", "Home, office, and frequently used locations", "map-marker"],
              ["Payment methods", "Paystack checkout is active for orders", "credit-card"],
              ["Support", "Report app, payment, or delivery issues", "life-ring"],
              ["Notifications", "Order and booking updates", "bell-o"],
            ].map(([title, subtitle, icon]) => (
              <View key={title} style={styles.row}>
                <View style={styles.rowIcon}><FontAwesome name={icon} size={15} color={PURPLE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowSubtitle}>{subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="CustomerAccount" />
      </View>
    </View>
  );
}

function Field({ label, icon, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <FontAwesome name={icon} size={16} color={PURPLE} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingBottom: 124 },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: PURPLE, fontSize: 25, fontWeight: "900" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 12 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4 },
  card: { margin: 16, marginTop: -12, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#EFEAF9", padding: 16, shadowColor: "#1E164C", shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 9 } },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  smallAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#F2EEFF", alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: PURPLE, fontSize: 18, fontWeight: "900" },
  name: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: MUTED, fontSize: 12, marginTop: 3, fontWeight: "700" },
  field: { marginTop: 12 },
  label: { color: INK, fontSize: 12.5, fontWeight: "900", marginBottom: 7 },
  inputShell: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: "#E4E0EE", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  input: { flex: 1, color: INK, fontSize: 13, fontWeight: "700", minHeight: 48 },
  addressInput: { minHeight: 68, textAlignVertical: "top", paddingTop: 13 },
  sectionTitle: { color: INK, fontSize: 15, fontWeight: "900", marginTop: 18 },
  helper: { color: MUTED, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 3, marginBottom: 10 },
  pickerBlock: { marginBottom: 11 },
  pickerShell: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: "#E4E0EE", overflow: "hidden", justifyContent: "center" },
  picker: { color: INK, width: "100%", height: 50 },
  quickLocations: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  locationChip: { borderRadius: 16, backgroundColor: "#F4F1FE", borderWidth: 1, borderColor: "#E5DDFD", paddingVertical: 8, paddingHorizontal: 11 },
  locationChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  locationChipText: { color: PURPLE, fontSize: 11.5, fontWeight: "900" },
  locationChipTextActive: { color: "#fff" },
  success: { color: "#078D4E", fontSize: 12, fontWeight: "800", marginTop: 12 },
  error: { color: "#D72544", fontSize: 12, fontWeight: "800", marginTop: 12 },
  saveButton: { marginTop: 16, height: 50, borderRadius: 18, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  saveButtonDisabled: { opacity: 0.72 },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  listCard: { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#EFEAF9", backgroundColor: "#fff", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F2EFF8" },
  rowIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: "#F4F1FE", alignItems: "center", justifyContent: "center" },
  rowTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  rowSubtitle: { color: COLORS.mute, fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  chevron: { color: PURPLE, fontSize: 24, fontWeight: "900" },
  logoutBtn: { backgroundColor: INK, borderRadius: 18, paddingVertical: 13, alignItems: "center", marginHorizontal: 16, marginTop: 14 },
  logoutText: { color: "#fff", fontSize: 13.5, fontWeight: "900" },
});
