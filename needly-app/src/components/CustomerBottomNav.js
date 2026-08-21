import React from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

const PURPLE = "#642BE4";
const INK_LIGHT = "#72738A";

const NAV_ITEMS = [
  { key: "Browse", icon: "home", label: "Home", family: "FontAwesome" },
  { key: "CustomerOrders", icon: "shopping-bag", label: "Orders", family: "FontAwesome" },
  { key: "NeedlyPay", icon: "qrcode-scan", label: "Needly Pay", family: "MaterialCommunityIcons", center: true },
  { key: "CustomerBookings", icon: "chatbubble-ellipses-outline", label: "Messages", family: "Ionicons", badgeKey: "messages" },
  { key: "CustomerAccount", icon: "person-circle-outline", label: "Account", family: "Ionicons" },
];

function NavIcon({ family, name, size, color }) {
  if (family === "Ionicons") return <Ionicons name={name} size={size} color={color} />;
  if (family === "MaterialCommunityIcons") return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <FontAwesome name={name} size={size} color={color} />;
}

export default function CustomerBottomNav({ navigation, active, unreadMessages = 0 }) {
  const { width } = useWindowDimensions();
  const isTiny = width < 370;

  const navigate = (item) => {
    navigation.navigate(item.key);
  };

  return (
    <View style={[styles.bottomNav, isTiny && styles.bottomNavTiny]}>
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const color = isActive ? PURPLE : INK_LIGHT;
        const badge = item.badgeKey === "messages" ? unreadMessages : 0;
        return (
          <Pressable
            key={item.key}
            onPress={() => navigate(item)}
            style={[styles.navItem, item.center && styles.navCenterItem]}
          >
            {item.center ? (
              <>
                <View style={[styles.payCircle, isTiny && styles.payCircleTiny]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={30} color="#fff" />
                </View>
                <Text numberOfLines={1} style={styles.centerLabel}>Needly Pay</Text>
              </>
            ) : (
              <>
                <View style={styles.iconWrap}>
                  <NavIcon family={item.family} name={item.icon} size={25} color={color} />
                  {!!badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 16,
    minHeight: 86,
    borderRadius: 34,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F0ECFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#1B1641",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  bottomNavTiny: { left: 10, right: 10, minHeight: 80, borderRadius: 30 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", minWidth: 54 },
  navCenterItem: { marginTop: -32 },
  iconWrap: { minHeight: 30, alignItems: "center", justifyContent: "center" },
  navLabel: { color: INK_LIGHT, fontSize: 12.5, fontWeight: "800", marginTop: 6 },
  navLabelActive: { color: PURPLE },
  payCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  payCircleTiny: { width: 66, height: 66, borderRadius: 33 },
  centerLabel: { color: "#fff", fontSize: 11.5, fontWeight: "800", marginTop: -24 },
  badge: {
    position: "absolute",
    top: -8,
    right: -12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3657",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});
