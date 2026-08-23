import React from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

import NeedlyLogo from "../components/NeedlyLogo";

const ROLE_LABEL = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  MANAGER: "Manager",
  RIDER: "Rider",
  ADMIN: "Admin",
};

export default function AppHeader() {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  if (!user) return null;
  const isTiny = width < 360;
  const initials = String(user.name || user.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  if (user.role === "CUSTOMER") {
    return (
      <SafeAreaView edges={["top"]} style={[styles.customerWrap, isTiny && styles.customerWrapTiny]}>
        <View style={[styles.customerRow, isTiny && styles.customerRowTiny]}>
          <View style={styles.brandBlock}>
            <NeedlyLogo size={isTiny ? "small" : "medium"} theme="light" />
          </View>
          <View style={[styles.profileBlock, isTiny && styles.profileBlockTiny]}>
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={[styles.avatar, isTiny && styles.avatarTiny]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarInitials, isTiny && styles.avatarTiny]}>
                <Text style={[styles.avatarInitialsText, isTiny && styles.avatarInitialsTextTiny]}>{initials}</Text>
              </View>
            )}
            <View style={{ maxWidth: isTiny ? 70 : 108 }}>
              <Text numberOfLines={1} style={[styles.profileName, isTiny && styles.profileNameTiny]}>{user.name}</Text>
              <Text numberOfLines={1} style={[styles.profileRole, isTiny && styles.profileRoleTiny]}>{ROLE_LABEL[user.role]}</Text>
            </View>
            <View style={[styles.bellButton, isTiny && styles.bellButtonTiny]}>
              <Text style={styles.bellText}>{"\uD83D\uDD14"}</Text>
              <View style={styles.bellDot} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.wrap}>
      <View style={styles.row}>
        <View>
          <NeedlyLogo size="medium" theme="dark" />
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
  customerWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE8F7",
  },
  customerWrapTiny: { paddingHorizontal: 12, paddingBottom: 12 },
  customerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 },
  customerRowTiny: { gap: 8 },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logoBox: {
    width: 54, height: 54, borderRadius: 13, backgroundColor: "#6F45E9",
    alignItems: "center", justifyContent: "center", shadowColor: "#6F45E9", shadowOpacity: 0.24,
    shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  logoBoxTiny: { width: 46, height: 46, borderRadius: 12 },
  logoText: { color: "#fff", fontSize: 29, fontWeight: "900" },
  logoTextTiny: { fontSize: 25 },
  customerBrand: { color: "#15183F", fontWeight: "900", fontSize: 20 },
  customerBrandTiny: { fontSize: 17 },
  customerLocale: { color: "#4D4D78", fontSize: 11.5, fontWeight: "700", marginTop: 2 },
  customerLocaleTiny: { fontSize: 9.5 },
  profileBlock: { flexDirection: "row", alignItems: "center", gap: 9 },
  profileBlockTiny: { gap: 6 },
  avatar: { width: 42, height: 42, borderRadius: 14 },
  avatarTiny: { width: 34, height: 34, borderRadius: 11 },
  avatarInitials: { backgroundColor: "#6F45E9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EDE9FE" },
  avatarInitialsText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  avatarInitialsTextTiny: { fontSize: 12 },
  profileName: { color: "#15183F", fontSize: 13.5, fontWeight: "800" },
  profileNameTiny: { fontSize: 11.5 },
  profileRole: { color: "#6F45E9", fontSize: 12, fontWeight: "700", marginTop: 1 },
  profileRoleTiny: { fontSize: 10.5 },
  bellButton: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#F0ECFA",
  },
  bellButtonTiny: { width: 36, height: 36, borderRadius: 12 },
  bellText: { fontSize: 18 },
  bellDot: { position: "absolute", right: 8, top: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: "#7147EA" },
  wrap: { backgroundColor: COLORS.indigo, paddingHorizontal: 20, paddingBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  brand: { color: "#fff", fontWeight: "800", fontSize: 20, letterSpacing: 0.5 },
  locale: { color: COLORS.mango, fontSize: 11, letterSpacing: 1, fontWeight: "600" },
  name: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  logout: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, fontWeight: "600", marginTop: 3 },
});
