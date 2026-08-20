import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { COLORS, fmtNaira } from "../../theme/colors";
import { useBookings } from "../../context/BookingsContext";

const INK = "#15183F";
const PURPLE = "#6F45E9";

export default function CustomerBookingsScreen({ navigation }) {
  const { bookings } = useBookings();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Bookings</Text>
            <Text style={styles.subtitle}>Auto service requests and provider appointments.</Text>
          </View>
          <Pressable style={styles.newBtn} onPress={() => navigation.navigate("CategoryResults", { category: "Auto" })}>
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {bookings.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>Book a mechanic, vulcanizer, or car wash from the Auto category.</Text>
              <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CategoryResults", { category: "Auto" })}>
                <Text style={styles.primaryBtnText}>Find auto providers</Text>
              </Pressable>
            </View>
          )}
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View>
                  <Text style={styles.bookingTitle}>{booking.service?.name}</Text>
                  <Text style={styles.meta}>{booking.provider?.name} · {booking.provider?.area}</Text>
                </View>
                <Text style={styles.status}>{booking.status}</Text>
              </View>
              <Text style={styles.detail}>{booking.date} · {booking.time}</Text>
              <Text style={styles.detail}>{booking.vehicle}</Text>
              <Text style={styles.detail}>📍 {booking.location}</Text>
              <Text style={styles.price}>{fmtNaira(booking.service?.price || 0)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <CustomerBottomNav navigation={navigation} active="CustomerBookings" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 122 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  title: { color: INK, fontSize: 26, fontWeight: "900" },
  subtitle: { color: COLORS.mute, fontSize: 13.5, marginTop: 4 },
  newBtn: { backgroundColor: "#F7F2FF", borderWidth: 1, borderColor: "#DED4FB", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  newBtnText: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  list: { gap: 10 },
  emptyCard: { backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E6DDFD", borderRadius: 18, padding: 16 },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: "900", marginBottom: 5 },
  emptyText: { color: COLORS.mute, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  primaryBtn: { backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  bookingCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECE8F7", borderRadius: 18, padding: 14 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  bookingTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  meta: { color: COLORS.mute, fontSize: 12.5, marginTop: 3 },
  status: { color: PURPLE, fontSize: 11.5, fontWeight: "900", textTransform: "uppercase" },
  detail: { color: "#555674", fontSize: 13, lineHeight: 19 },
  price: { color: INK, fontSize: 15, fontWeight: "900", marginTop: 8 },
});
