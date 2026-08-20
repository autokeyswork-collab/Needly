import React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

const PURPLE = "#6F45E9";

const NAV_ITEMS = [
  { key: "Browse", icon: "⌂", label: "Home" },
  { key: "CustomerOrders", icon: "▢", label: "Orders" },
  { key: "CategoryResults", icon: "+", label: "", params: { category: "Auto" }, center: true },
  { key: "CustomerBookings", icon: "□", label: "Bookings" },
  { key: "CustomerAccount", icon: "○", label: "Account" },
];

export default function CustomerBottomNav({ navigation, active }) {
  const { width } = useWindowDimensions();
  const isTiny = width < 360;
  return (
    <View style={[styles.bottomNav, isTiny && styles.bottomNavTiny]}>
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.key, item.params)}
            style={[styles.navItem, isTiny && styles.navItemTiny, item.center && styles.navCenter, item.center && isTiny && styles.navCenterTiny]}
          >
            <Text style={[styles.navIcon, isTiny && styles.navIconTiny, isActive && styles.navIconActive, item.center && styles.navPlus, item.center && isTiny && styles.navPlusTiny]}>{item.icon}</Text>
            {!!item.label && <Text numberOfLines={1} style={[styles.navLabel, isTiny && styles.navLabelTiny, isActive && styles.navLabelActive]}>{item.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute", left: 18, right: 18, bottom: 16, minHeight: 76, borderRadius: 30,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#F0ECFA", flexDirection: "row",
    alignItems: "center", justifyContent: "space-around", paddingHorizontal: 10,
    shadowColor: "#1B1641", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  bottomNavTiny: { left: 10, right: 10, minHeight: 68, borderRadius: 26, paddingHorizontal: 6 },
  navItem: { alignItems: "center", justifyContent: "center", minWidth: 54 },
  navItemTiny: { minWidth: 45 },
  navCenter: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: PURPLE, marginTop: -30,
    shadowColor: PURPLE, shadowOpacity: 0.26, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  navCenterTiny: { width: 56, height: 56, borderRadius: 28, marginTop: -26 },
  navIcon: { color: "#88889A", fontSize: 25, fontWeight: "900" },
  navIconTiny: { fontSize: 21 },
  navIconActive: { color: PURPLE },
  navPlus: { color: "#fff", fontSize: 43, lineHeight: 50, marginTop: -3 },
  navPlusTiny: { fontSize: 38, lineHeight: 44 },
  navLabel: { color: "#858591", fontSize: 12, fontWeight: "800", marginTop: 3 },
  navLabelTiny: { fontSize: 10.5 },
  navLabelActive: { color: PURPLE },
});
