import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Needly Official Brand Logo Component
 * Matches the official 3D shopping bag + pin + category badge design system.
 *
 * @param {Object} props
 * @param {'small' | 'medium' | 'large' | 'hero'} [props.size='medium']
 * @param {'full' | 'compact' | 'icon' | 'banner'} [props.variant='compact']
 * @param {'light' | 'dark'} [props.theme='light']
 * @param {boolean} [props.showBadges=false]
 */
export default function NeedlyLogo({
  size = "medium",
  variant = "compact",
  theme = "light",
  showBadges = false,
}) {
  const isDark = theme === "dark";
  const scale = size === "small" ? 0.7 : size === "large" ? 1.25 : size === "hero" ? 1.6 : 1;

  // Icon Only
  if (variant === "icon") {
    return (
      <View style={[styles.iconBagOuter, { transform: [{ scale }] }]}>
        {/* Speed lines */}
        <View style={styles.speedLineWrap}>
          <View style={[styles.speedLine, { width: 14, backgroundColor: "#8B5CF6" }]} />
          <View style={[styles.speedLine, { width: 18, backgroundColor: "#FF9E1B" }]} />
          <View style={[styles.speedLine, { width: 10, backgroundColor: "#6F45E9" }]} />
        </View>

        {/* Shopping Bag Container */}
        <View style={styles.bagBody}>
          {/* Bag Handles */}
          <View style={styles.handleRow}>
            <View style={styles.handleArc} />
            <View style={styles.handleArc} />
          </View>
          {/* N Badge */}
          <View style={styles.nBadgeBox}>
            <Text style={styles.nBadgeText}>N</Text>
          </View>
          {/* Location Pin overlay */}
          <View style={styles.pinOverlay}>
            <View style={styles.pinInnerDot} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={styles.brandHeaderRow}>
        {/* 3D Shopping Bag + Pin Emblem */}
        <View style={styles.iconBagOuter}>
          {/* Speed lines */}
          <View style={styles.speedLineWrap}>
            <View style={[styles.speedLine, { width: 12, backgroundColor: "#A78BFA" }]} />
            <View style={[styles.speedLine, { width: 16, backgroundColor: "#FF9E1B" }]} />
            <View style={[styles.speedLine, { width: 10, backgroundColor: "#818CF8" }]} />
          </View>

          {/* Bag Body */}
          <View style={styles.bagBody}>
            <View style={styles.handleRow}>
              <View style={styles.handleArc} />
              <View style={styles.handleArc} />
            </View>
            <View style={styles.nBadgeBox}>
              <Text style={styles.nBadgeText}>N</Text>
            </View>
            {/* Location Pin */}
            <View style={styles.pinOverlay}>
              <View style={styles.pinInnerDot} />
            </View>
            {/* Orbital Ring */}
            <View style={styles.orbitalRing} />
          </View>
        </View>

        {/* Brand Name Typography */}
        <View style={styles.textStack}>
          <View style={styles.wordRow}>
            <View style={styles.styledLetterN}>
              <Text style={styles.styledNText}>N</Text>
            </View>
            <Text style={[styles.brandMainText, isDark && styles.textDark]}>eedly</Text>
          </View>

          <Text style={[styles.subtitleText, isDark && styles.subtitleDark]}>
            EVERYDAY MARKETPLACE
          </Text>
        </View>
      </View>

      {/* Optional Category Badges Row */}
      {(showBadges || variant === "full") && (
        <View style={styles.badgeRow}>
          {[
            { icon: "🛒", bg: "#FF9E1B" },
            { icon: "🍽️", bg: "#E14B3C" },
            { icon: "🏠", bg: "#2563EB" },
            { icon: "🚗", bg: "#7C3AED" },
            { icon: "➕", bg: "#10B981" },
            { icon: "🛏️", bg: "#F59E0B" },
            { icon: "🎓", bg: "#06B6D4" },
            { icon: "🔥", bg: "#F97316" },
            { icon: "🧺", bg: "#16A34A" },
          ].map((item, idx) => (
            <View key={idx} style={[styles.badgeItem, { backgroundColor: item.bg }]}>
              <Text style={styles.badgeIcon}>{item.icon}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  brandHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBagOuter: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  speedLineWrap: {
    position: "absolute",
    left: -10,
    top: 14,
    gap: 3,
    zIndex: 1,
  },
  speedLine: {
    height: 3,
    borderRadius: 1.5,
  },
  bagBody: {
    width: 38,
    height: 38,
    backgroundColor: "#5B21B6",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    shadowColor: "#5B21B6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    position: "relative",
  },
  handleRow: {
    position: "absolute",
    top: -7,
    flexDirection: "row",
    gap: 8,
  },
  handleArc: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    borderColor: "#FF9E1B",
    backgroundColor: "transparent",
  },
  nBadgeBox: {
    width: 22,
    height: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  nBadgeText: {
    color: "#5B21B6",
    fontSize: 16,
    fontWeight: "900",
  },
  pinOverlay: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF9E1B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pinInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  orbitalRing: {
    position: "absolute",
    bottom: -3,
    left: -4,
    right: -4,
    height: 6,
    borderRadius: 3,
    borderBottomWidth: 2,
    borderBottomColor: "#FF9E1B",
  },
  textStack: {
    justifyContent: "center",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  styledLetterN: {
    backgroundColor: "#5B21B6",
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 6,
    marginRight: 1,
  },
  styledNText: {
    color: "#FF9E1B",
    fontSize: 22,
    fontWeight: "900",
  },
  brandMainText: {
    color: "#1E1B4B",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  textDark: {
    color: "#FFFFFF",
  },
  subtitleText: {
    color: "#FF9E1B",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: -1,
  },
  subtitleDark: {
    color: "#FBBF24",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  badgeItem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    fontSize: 11,
  },
});
