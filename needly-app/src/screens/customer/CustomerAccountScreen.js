import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { COLORS } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

const INK = "#15183F";
const PURPLE = "#6F45E9";

export default function CustomerAccountScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Profile, delivery preferences, and support.</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0) || "N"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.meta}>{user?.email}</Text>
            <Text style={styles.meta}>{user?.phone || "No phone number saved"}</Text>
          </View>
        </View>

        {[
          ["Saved addresses", "Home, office, and frequently used locations"],
          ["Payment methods", "Paystack checkout is active for orders"],
          ["Support", "Report app, payment, or delivery issues"],
          ["Notifications", "Order and booking updates"],
        ].map(([title, subtitle]) => (
          <View key={title} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
      <CustomerBottomNav navigation={navigation} active="CustomerAccount" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 122 },
  title: { color: INK, fontSize: 26, fontWeight: "900" },
  subtitle: { color: COLORS.mute, fontSize: 13.5, marginTop: 4, marginBottom: 18 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 20, padding: 16, marginBottom: 16 },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  name: { color: INK, fontSize: 16, fontWeight: "900" },
  meta: { color: COLORS.mute, fontSize: 12.5, marginTop: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 16, padding: 14, marginBottom: 10 },
  rowTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  rowSubtitle: { color: COLORS.mute, fontSize: 12.5, marginTop: 3, maxWidth: 255 },
  chevron: { color: PURPLE, fontSize: 26, fontWeight: "900" },
  logoutBtn: { backgroundColor: INK, borderRadius: 20, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  logoutText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
