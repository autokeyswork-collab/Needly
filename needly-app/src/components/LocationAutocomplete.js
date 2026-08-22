import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../theme/colors";

const POPULAR_LOCATIONS = [
  { id: "loc-1", title: "Panseke Commercial Hub", subtitle: "Panseke, Abeokuta, Ogun State", area: "Panseke", lat: 7.1583, lng: 3.3658 },
  { id: "loc-2", title: "Oke-Ilewo Lalubu Street", subtitle: "Oke-Ilewo, Abeokuta, Ogun State", area: "Oke-Ilewo", lat: 7.1545, lng: 3.3550 },
  { id: "loc-3", title: "Ibara Housing Estate Road", subtitle: "Ibara, Abeokuta, Ogun State", area: "Ibara", lat: 7.1510, lng: 3.3520 },
  { id: "loc-4", title: "Adigbe Main Road", subtitle: "Adigbe, Abeokuta, Ogun State", area: "Adigbe", lat: 7.1784, lng: 3.4024 },
  { id: "loc-5", title: "Kuto Market Junction", subtitle: "Kuto, Abeokuta, Ogun State", area: "Kuto", lat: 7.1488, lng: 3.3515 },
  { id: "loc-6", title: "Ita Eko Roundabout", subtitle: "Ita Eko, Abeokuta, Ogun State", area: "Ita Eko", lat: 7.1580, lng: 3.3490 },
  { id: "loc-7", title: "Lafenwa Market Area", subtitle: "Lafenwa, Abeokuta, Ogun State", area: "Lafenwa", lat: 7.1650, lng: 3.3320 },
  { id: "loc-8", title: "Hilltop OOPL Resort Zone", subtitle: "Hilltop, Abeokuta, Ogun State", area: "Hilltop", lat: 7.1420, lng: 3.3600 },
  { id: "loc-9", title: "Omida Market", subtitle: "Omida, Abeokuta, Ogun State", area: "Omida", lat: 7.1574, lng: 3.3458 },
  { id: "loc-10", title: "Asero Estate Road", subtitle: "Asero, Abeokuta, Ogun State", area: "Asero", lat: 7.1306, lng: 3.3775 },
  { id: "loc-11", title: "Obantoko Junction", subtitle: "Obantoko, Abeokuta, Ogun State", area: "Obantoko", lat: 7.0971, lng: 3.3956 },
  { id: "loc-12", title: "Camp Roundabout", subtitle: "Camp, Abeokuta, Ogun State", area: "Camp", lat: 7.1688, lng: 3.3609 },
  { id: "loc-13", title: "Isale Ake Palace Area", subtitle: "Isale Ake, Abeokuta, Ogun State", area: "Isale Ake", lat: 7.1621, lng: 3.3428 },
  { id: "loc-14", title: "Sapon Market Area", subtitle: "Sapon, Abeokuta, Ogun State", area: "Sapon", lat: 7.1616, lng: 3.3509 },
  { id: "loc-15", title: "Lantoro Road", subtitle: "Lantoro, Abeokuta, Ogun State", area: "Lantoro", lat: 7.1644, lng: 3.3567 },
  { id: "loc-16", title: "Totoro Road", subtitle: "Totoro, Abeokuta, Ogun State", area: "Totoro", lat: 7.1692, lng: 3.3472 },
  { id: "loc-17", title: "Onikolobo", subtitle: "Onikolobo, Abeokuta, Ogun State", area: "Onikolobo", lat: 7.1544, lng: 3.3749 },
  { id: "loc-18", title: "Olomore", subtitle: "Olomore, Abeokuta, Ogun State", area: "Olomore", lat: 7.1795, lng: 3.3519 },
  { id: "loc-19", title: "Elega", subtitle: "Elega, Abeokuta, Ogun State", area: "Elega", lat: 7.1768, lng: 3.3409 },
  { id: "loc-20", title: "Mawuko", subtitle: "Mawuko, Abeokuta, Ogun State", area: "Mawuko", lat: 7.1218, lng: 3.3354 },
  { id: "loc-21", title: "Oke-Sokori", subtitle: "Oke-Sokori, Abeokuta, Ogun State", area: "Oke-Sokori", lat: 7.1664, lng: 3.3536 },
  { id: "loc-22", title: "Ago Ika", subtitle: "Ago Ika, Abeokuta, Ogun State", area: "Ago Ika", lat: 7.1697, lng: 3.3355 },
  { id: "loc-23", title: "Ijeun Titun", subtitle: "Ijeun Titun, Abeokuta, Ogun State", area: "Ijeun Titun", lat: 7.1475, lng: 3.3623 },
  { id: "loc-24", title: "Idi Aba", subtitle: "Idi Aba, Abeokuta, Ogun State", area: "Idi Aba", lat: 7.1270, lng: 3.3612 },
  { id: "loc-25", title: "Elite Road", subtitle: "Elite, Abeokuta, Ogun State", area: "Elite", lat: 7.1294, lng: 3.3498 },
  { id: "loc-26", title: "Fajol Estate", subtitle: "Fajol, Abeokuta, Ogun State", area: "Fajol", lat: 7.1258, lng: 3.3409 },
  { id: "loc-27", title: "Olorunsogo", subtitle: "Olorunsogo, Abeokuta, Ogun State", area: "Olorunsogo", lat: 7.1378, lng: 3.3447 },
  { id: "loc-28", title: "Kobape Road", subtitle: "Kobape, Abeokuta, Ogun State", area: "Kobape", lat: 7.0975, lng: 3.4387 },
  { id: "loc-29", title: "Osiele", subtitle: "Osiele, Abeokuta, Ogun State", area: "Osiele", lat: 7.1275, lng: 3.4305 },
  { id: "loc-30", title: "Odeda Road", subtitle: "Odeda, Abeokuta, Ogun State", area: "Odeda", lat: 7.2310, lng: 3.5287 },
];

export default function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = "Search location or street address...",
  inputStyle,
  containerStyle,
  icon = "📍",
}) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const handleTextChange = (text) => {
    setQuery(text);
    if (onChangeText) onChangeText(text);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const q = text.toLowerCase().trim();
    const localMatches = POPULAR_LOCATIONS.filter(
      (loc) =>
        loc.title.toLowerCase().includes(q) ||
        loc.subtitle.toLowerCase().includes(q) ||
        loc.area.toLowerCase().includes(q)
    );

    setSuggestions(localMatches);
    setIsOpen(true);

    if (text.length >= 3) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchOnlineSuggestions(text, localMatches);
      }, 400);
    }
  };

  const fetchOnlineSuggestions = async (searchText, existingLocalMatches) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchText
        )}&addressdetails=1&limit=5`,
        { headers: { "User-Agent": "NeedlyMarketplaceApp/1.0" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const fetched = data.map((item, idx) => ({
          id: `osm-${item.place_id || idx}`,
          title: item.display_name.split(",")[0] || item.display_name,
          subtitle: item.display_name,
          area: item.address?.suburb || item.address?.city || item.address?.town || "Service Area",
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));

        const combined = [...existingLocalMatches];
        fetched.forEach((f) => {
          if (!combined.some((c) => c.title.toLowerCase() === f.title.toLowerCase())) {
            combined.push(f);
          }
        });

        setSuggestions(combined);
        setIsOpen(true);
      }
    } catch (e) {
      // Offline fallback: keep local matches
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    const fullAddress = `${item.title}, ${item.subtitle}`;
    setQuery(fullAddress);
    setIsOpen(false);
    if (onChangeText) onChangeText(fullAddress);
    if (onSelectLocation) {
      onSelectLocation({
        address: fullAddress,
        area: item.area,
        latitude: item.lat,
        longitude: item.lng,
      });
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputWrap}>
        <Text style={styles.icon}>{icon}</Text>
        <TextInput
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={[styles.input, inputStyle]}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />
        {loading && <ActivityIndicator size="small" color="#6F45E9" style={styles.spinner} />}
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setSuggestions([]);
              setIsOpen(false);
              if (onChangeText) onChangeText("");
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isOpen && suggestions.length > 0 && (
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderTitle}>📍 MATCHING LOCATIONS</Text>
          </View>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.pinWrap}>
                  <Text style={styles.pinIcon}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <View style={styles.areaBadge}>
                  <Text style={styles.areaBadgeText}>{item.area}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", zIndex: 99 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  icon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: "#15183F", paddingVertical: 12, fontSize: 14 },
  spinner: { marginRight: 6 },
  clearBtn: { padding: 4 },
  clearText: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },

  dropdownCard: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#15183F",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
    zIndex: 999,
  },
  dropdownHeader: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownHeaderTitle: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  pinWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pinIcon: { fontSize: 13 },
  suggestionTitle: { fontSize: 13.5, fontWeight: "800", color: "#15183F" },
  suggestionSubtitle: { fontSize: 11.5, color: "#64748B", marginTop: 1 },
  areaBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  areaBadgeText: { color: "#92400E", fontSize: 10.5, fontWeight: "800" },
});
