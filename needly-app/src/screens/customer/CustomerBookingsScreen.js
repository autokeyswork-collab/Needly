import React, { useMemo } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { fmtNaira } from "../../theme/colors";
import { useBookings } from "../../context/BookingsContext";
import { useOrders } from "../../context/OrdersContext";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#35109B";
const INK = "#11123A";
const MUTED = "#777991";
const LINE = "#ECE8F7";
const GREEN = "#10B981";
const AMBER = "#F59E0B";

function statusColor(status = "") {
  const s = String(status).toUpperCase();
  if (["ACCEPTED", "CONFIRMED", "COMPLETED"].includes(s)) return GREEN;
  if (["PENDING", "IN_PROGRESS"].includes(s)) return AMBER;
  return PURPLE;
}

function formatDate(value) {
  if (!value) return "Recent";
  try {
    return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch (_) {
    return "Recent";
  }
}

function BookingThread({ booking, onPress }) {
  const color = statusColor(booking.status);
  return (
    <Pressable style={styles.threadCard} onPress={onPress}>
      <View style={[styles.threadIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name="wrench-outline" size={23} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.threadTop}>
          <Text numberOfLines={1} style={styles.threadTitle}>{booking.provider?.name || "Service provider"}</Text>
          <Text style={styles.threadDate}>{formatDate(booking.createdAt || booking.date)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.threadMessage}>
          {booking.service?.name || "Service request"} · {booking.date || "Date pending"} {booking.time || ""}
        </Text>
        <Text numberOfLines={1} style={styles.threadMeta}>
          {booking.vehicle || "Vehicle details pending"} · {booking.location || booking.provider?.area || "Location pending"}
        </Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
    </Pressable>
  );
}

export default function CustomerBookingsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { bookings = [] } = useBookings();
  const { notifications = [], loading } = useOrders();
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;

  const messageNotifications = useMemo(() => (
    notifications.filter((n) => /message|chat|booking|support/i.test(`${n.type || ""} ${n.title || ""} ${n.message || ""}`))
  ), [notifications]);

  const activeBookings = bookings.filter((booking) => !["CANCELLED", "COMPLETED"].includes(String(booking.status || "").toUpperCase()));
  const totalBookingValue = bookings.reduce((sum, booking) => sum + Number(booking.service?.price || booking.price || 0), 0);

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Pressable style={styles.backCircle} onPress={() => navigation.navigate("Browse")}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <Pressable style={styles.newPill} onPress={() => navigation.navigate("CategoryResults", { category: "Auto" })}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newPillText}>New Booking</Text>
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>Messages</Text>
            <Text style={styles.heroSub}>Chat updates for bookings, orders and Needly support.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{messageNotifications.length}</Text>
                <Text style={styles.statLabel}>Unread</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{activeBookings.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statBoxWide}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValueSmall}>{fmtNaira(totalBookingValue)}</Text>
                <Text style={styles.statLabel}>Booked</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickRow}>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("CategoryResults", { category: "Auto" })}>
              <View style={styles.quickIcon}><MaterialCommunityIcons name="car-wrench" size={22} color={PURPLE} /></View>
              <Text style={styles.quickTitle}>Auto Providers</Text>
              <Text style={styles.quickSub}>Mechanic, vulcanizer, car wash</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("CustomerAccount")}>
              <View style={styles.quickIcon}><Ionicons name="help-circle-outline" size={23} color={PURPLE} /></View>
              <Text style={styles.quickTitle}>Support</Text>
              <Text style={styles.quickSub}>Payment or delivery help</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Booking Threads</Text>
            <Text style={styles.sectionCount}>{bookings.length}</Text>
          </View>

          {loading && bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="message-processing-outline" size={38} color={PURPLE} />
              <Text style={styles.emptyTitle}>Loading messages</Text>
              <Text style={styles.emptyText}>Checking your booking updates and provider conversations.</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={34} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>When you book a mechanic, vulcanizer, car wash, or contact support, your conversation will appear here.</Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CategoryResults", { category: "Auto" })}>
                  <Text style={styles.primaryBtnText}>Find auto providers</Text>
                  <FontAwesome name="arrow-right" size={13} color="#fff" />
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Browse")}>
                  <Text style={styles.secondaryBtnText}>Browse</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.threadList}>
              {bookings.map((booking) => (
                <BookingThread
                  key={booking.id}
                  booking={booking}
                  onPress={() => navigation.navigate("AutoBooking", { providerId: booking.provider?.id, bookingId: booking.id })}
                />
              ))}
            </View>
          )}

          {messageNotifications.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Updates</Text>
                <Text style={styles.sectionCount}>{messageNotifications.length}</Text>
              </View>
              <View style={styles.updatePanel}>
                {messageNotifications.slice(0, 4).map((item, index) => (
                  <View key={item.id || index} style={styles.updateRow}>
                    <View style={styles.updateIcon}><Ionicons name="notifications-outline" size={18} color={PURPLE} /></View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.updateTitle}>{item.title || "Needly update"}</Text>
                      <Text numberOfLines={2} style={styles.updateText}>{item.message || item.body || "You have a new update."}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="CustomerBookings" unreadMessages={messageNotifications.length} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 124 },
  hero: { borderRadius: 28, padding: 16, backgroundColor: PURPLE_DARK, marginBottom: 14, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 31, lineHeight: 31, fontWeight: "800" },
  newPill: { height: 38, borderRadius: 19, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", flexDirection: "row", alignItems: "center", gap: 5 },
  newPillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.82)", fontSize: 13.5, fontWeight: "700", marginTop: 4, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 9 },
  statBox: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  statBoxWide: { flex: 1.35, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statValueSmall: { color: "#fff", fontSize: 16, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontWeight: "900", marginTop: 3 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickCard: { flex: 1, borderRadius: 20, padding: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE },
  quickIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", marginBottom: 9 },
  quickTitle: { color: INK, fontSize: 13.2, fontWeight: "900" },
  quickSub: { color: MUTED, fontSize: 11, lineHeight: 15, marginTop: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "900" },
  sectionCount: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  threadList: { gap: 10 },
  threadCard: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 22, padding: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, shadowColor: "#1E164C", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 7 } },
  threadIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  threadTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  threadTitle: { color: INK, fontSize: 14.5, fontWeight: "900", flex: 1 },
  threadDate: { color: MUTED, fontSize: 10.5, fontWeight: "800" },
  threadMessage: { color: INK, fontSize: 12.3, fontWeight: "800", marginTop: 3 },
  threadMeta: { color: MUTED, fontSize: 11.3, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 4.5 },
  emptyCard: { alignItems: "center", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: LINE, backgroundColor: "#FBFAFF" },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: "900", marginTop: 8, marginBottom: 6 },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 19 },
  emptyActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 18 },
  primaryBtn: { flex: 1.35, height: 46, borderRadius: 23, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 13.2, fontWeight: "900" },
  secondaryBtn: { flex: 0.8, height: 46, borderRadius: 23, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: PURPLE, fontSize: 13.2, fontWeight: "900" },
  updatePanel: { borderRadius: 22, padding: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE },
  updateRow: { flexDirection: "row", gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F4F0FB" },
  updateIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  updateTitle: { color: INK, fontSize: 13, fontWeight: "900" },
  updateText: { color: MUTED, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
});
