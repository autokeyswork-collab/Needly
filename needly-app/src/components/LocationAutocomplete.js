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
import { NIGERIA_MAJOR_LOCATIONS } from "../data/nigeriaLocations";

const POPULAR_LOCATIONS = NIGERIA_MAJOR_LOCATIONS.map((loc) => ({
  ...loc,
  lat: loc.latitude,
  lng: loc.longitude,
}));

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
      const scopedQuery = /\bnigeria\b/i.test(searchText) ? searchText : `${searchText}, Nigeria`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          scopedQuery
        )}&addressdetails=1&limit=8&countrycodes=ng&accept-language=en`,
        { headers: { "User-Agent": "NeedlyMarketplaceApp/1.0" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const fetched = data.map((item, idx) => ({
          id: `osm-${item.place_id || idx}`,
          title: item.display_name.split(",")[0] || item.display_name,
          subtitle: item.display_name,
          area: item.address?.suburb || item.address?.city || item.address?.town || item.address?.state || "Nigeria",
          city: item.address?.city || item.address?.town || item.address?.municipality || item.address?.county || "",
          state: item.address?.state || "",
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
