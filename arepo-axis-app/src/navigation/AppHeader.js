import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  MANAGER: "Manager",
  RIDER: "Rider",
  ADMIN: "Admin",
};

export default function AppHeader() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <SafeAreaView edges={["top"]} style={styles.wrap}>
      <View style={styles.row}>
        <View>
          <Text style={styles.brand}>ROUTE</Text>
          <Text style={styles.locale}>AREPO {"\u21C4"} AXIS</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.name}>{user.name} {"\u00B7"} {ROLE_LABEL[user.role]}</Text>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.indigo, paddingHorizontal: 20, paddingBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  brand: { color: "#fff", fontWeight: "800", fontSize: 20, letterSpacing: 0.5 },
  locale: { color: COLORS.mango, fontSize: 11, letterSpacing: 1, fontWeight: "600" },
  name: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  logout: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, fontWeight: "600", marginTop: 3 },
});
