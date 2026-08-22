import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrders } from "../../context/OrdersContext";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#24105F";
const INK = "#11123A";
const MUTED = "#747792";
const LINE = "#EEEAF8";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";

function formatTime(value) {
  if (!value) return "Now";
  try {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch (_) {
    return "Recent";
  }
}

function notificationIcon(type = "", title = "") {
  const text = `${type} ${title}`.toLowerCase();
  if (/order|payment|cart/.test(text)) return { icon: "shopping-bag", family: "FontAwesome", color: PURPLE };
  if (/booking|service|auto|provider/.test(text)) return { icon: "calendar-check", family: "MaterialCommunityIcons", color: AMBER };
  if (/message|chat|support/.test(text)) return { icon: "chatbubble-ellipses", family: "Ionicons", color: GREEN };
  if (/alert|issue|failed|cancel/.test(text)) return { icon: "alert-circle", family: "Ionicons", color: RED };
  return { icon: "notifications", family: "Ionicons", color: PURPLE };
}

function NotificationIcon({ item }) {
  const meta = notificationIcon(item.type, item.title);
  const iconProps = { size: 21, color: meta.color };
  return (
    <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
      {meta.family === "FontAwesome" ? (
        <FontAwesome name={meta.icon} {...iconProps} />
      ) : meta.family === "MaterialCommunityIcons" ? (
        <MaterialCommunityIcons name={meta.icon} {...iconProps} />
      ) : (
        <Ionicons name={meta.icon} {...iconProps} />
      )}
    </View>
  );
}

export default function CustomerNotificationsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const {
    notifications = [],
    loading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useOrders();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;

  const unreadCount = notifications.filter((item) => !item.read).length;
  const recent = useMemo(() => notifications.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [notifications]);

  const openNotification = async (item) => {
    await markNotificationRead?.(item.id);
    const targetText = `${item.type || ""} ${item.title || ""} ${item.body || item.message || ""}`;
    if (/order|payment/i.test(targetText)) {
      navigation.navigate("CustomerOrders");
    } else if (/booking|message|chat|support/i.test(targetText)) {
      navigation.navigate("CustomerBookings");
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
              <Pressable style={styles.refreshPill} onPress={refreshNotifications}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>Notifications</Text>
            <Text style={styles.heroSub}>Order, booking, payment and Needly support updates.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{unreadCount}</Text>
                <Text style={styles.statLabel}>Unread</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{notifications.length}</Text>
                <Text style={styles.statLabel}>All Updates</Text>
              </View>
              <Pressable style={styles.markBox} onPress={markAllNotificationsRead}>
                <Ionicons name="checkmark-done" size={19} color="#fff" />
                <Text style={styles.markText}>Mark read</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            <Text style={styles.sectionCount}>{recent.length}</Text>
          </View>

          {loading && recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={PURPLE} />
              <Text style={styles.emptyTitle}>Loading notifications</Text>
              <Text style={styles.emptyText}>Checking your latest Needly updates.</Text>
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={36} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>When your order, payment, booking, or support request changes, it will appear here.</Text>
              <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("Browse")}>
                <Text style={styles.primaryBtnText}>Back to Home</Text>
                <FontAwesome name="arrow-right" size={13} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {recent.map((item) => (
                <Pressable key={item.id} style={[styles.notificationCard, !item.read && styles.notificationUnread]} onPress={() => openNotification(item)}>
                  <NotificationIcon item={item} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.cardTop}>
                      <Text numberOfLines={1} style={styles.cardTitle}>{item.title || "Needly update"}</Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text numberOfLines={2} style={styles.cardBody}>{item.body || item.message || "You have a new update."}</Text>
                    <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={MUTED} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#FFFFFF", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 34 },
  hero: { borderRadius: 28, padding: 16, backgroundColor: PURPLE_DARK, marginBottom: 16 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 31, lineHeight: 31, fontWeight: "800" },
  refreshPill: { height: 36, borderRadius: 18, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", flexDirection: "row", alignItems: "center", gap: 6 },
  refreshText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 4, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 9 },
  statBox: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontWeight: "900", marginTop: 3 },
  markBox: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center", gap: 4 },
  markText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "900" },
  sectionCount: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  list: { gap: 10 },
  notificationCard: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 22, padding: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, shadowColor: "#1E164C", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 7 } },
  notificationUnread: { backgroundColor: "#FBFAFF", borderColor: "#DED2FF" },
  iconWrap: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { flex: 1, color: INK, fontSize: 14.5, fontWeight: "900" },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: RED },
  cardBody: { color: MUTED, fontSize: 12.3, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  cardTime: { color: PURPLE, fontSize: 10.8, fontWeight: "900", marginTop: 6 },
  emptyCard: { alignItems: "center", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: LINE, backgroundColor: "#FBFAFF" },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: "900", marginTop: 10, marginBottom: 6 },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  primaryBtn: { minWidth: 150, height: 46, borderRadius: 23, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  primaryBtnText: { color: "#fff", fontSize: 13.2, fontWeight: "900" },
});
