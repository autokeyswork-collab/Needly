import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import NeedlyLogo from "../../components/NeedlyLogo";
import LocationAutocomplete from "../../components/LocationAutocomplete";
import { LOGIN_HERO_MARKET } from "../../data/customerAssets";

const ROLES = [
  { value: "CUSTOMER", label: "Customer", sub: "Shop & order", icon: "person", family: "Ionicons" },
  { value: "VENDOR", label: "Vendor", sub: "Sell items", icon: "storefront", family: "MaterialCommunityIcons" },
  { value: "RIDER", label: "Rider", sub: "Deliver & earn", icon: "motorbike", family: "MaterialCommunityIcons" },
];

const VENDOR_CATEGORIES = ["Restaurant", "Supermarket", "Grills", "Local Market", "Pharmacy", "Stay & Dine"];
const ABEOKUTA_AREAS = ["Oke-Ilewo", "Ibara", "Panseke", "Adigbe", "Kuto", "Ita Eko", "Lafenwa", "Hilltop"];
const RIDER_ZONES = ["Panseke / Ibara Zone", "Kuto / Oke-Ilewo Zone", "Adigbe / Ita Eko Zone", "Lafenwa / Hilltop Zone"];
const PURPLE = "#6F45E9";
const PURPLE_DARK = "#24105F";
const ORANGE = "#F47C00";
const INK = "#10113D";
const MUTED = "#7E80A0";
const LINE = "#DDDDEA";

function RoleIcon({ item, color, size = 20 }) {
  if (item.family === "Ionicons") return <Ionicons name={item.icon} size={size} color={color} />;
  if (item.family === "MaterialCommunityIcons") return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
  return <FontAwesome name={item.icon} size={size - 2} color={color} />;
}

function FieldIcon({ name }) {
  return <FontAwesome name={name} size={16} color={PURPLE} />;
}

export default function RegisterScreen({ navigation, route }) {
  const { register, socialLogin, authError } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isCompact = width < 390 || height < 720;
  const panelWidth = isDesktop ? Math.min(600, Math.max(540, width * 0.46)) : Math.min(width - 34, 370);
  const mobileBrandHeight = Math.max(82, Math.min(128, height * 0.15));
  const [socialLoading, setSocialLoading] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [role, setRole] = useState(route?.params?.role || "CUSTOMER");

  // Vendor Fields
  const [businessName, setBusinessName] = useState("");
  const [vendorCategory, setVendorCategory] = useState("Restaurant");
  const [vendorArea, setVendorArea] = useState("Oke-Ilewo");
  const [vendorAddress, setVendorAddress] = useState("");

  // Rider Fields
  const [riderZone, setRiderZone] = useState("Panseke / Ibara Zone");

  const [validationError, setValidationError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  const submit = async () => {
    setValidationError(null);
    if (!name.trim()) { setValidationError("Please enter your full name."); return; }
    if (!email.trim() || !email.includes("@")) { setValidationError("Please enter a valid email address."); return; }
    if (!password || password.length < 4) { setValidationError("Password must be at least 4 characters long."); return; }
    if (password !== confirmPassword) { setValidationError("Passwords do not match. Please check and try again."); return; }
    if (!agreeTerms) { setValidationError("You must agree to the Terms of Service to register."); return; }

    if (role === "VENDOR") {
      if (!businessName.trim()) { setValidationError("Please enter your store or business name."); return; }
      if (!vendorAddress.trim()) { setValidationError("Please enter your business street address."); return; }
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
    };

    if (role === "VENDOR") {
      payload.vendorProfile = {
        name: businessName.trim(),
        category: vendorCategory,
        area: vendorArea,
        address: vendorAddress.trim(),
        eta: "20-35 min",
      };
    } else if (role === "RIDER") {
      payload.riderProfile = {
        zone: riderZone,
      };
    }

    try {
      const result = await register(payload);

      if (result?.pendingApproval) {
        setPendingMessage(
          result.message ||
          `Your ${role === "VENDOR" ? "Store Profile" : "Rider Account"} has been submitted! Needly Admin will review and activate your account shortly.`
        );
      } else if (result?.error) {
        setValidationError(result.error);
      } else if (!result) {
        setValidationError("Registration could not be completed. Please check the details and try again.");
      }
    } catch (err) {
      setValidationError(err.message || "Registration could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialRegister = async (providerKey) => {
    setValidationError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setValidationError("Enter your email first so Needly can send your registration and approval emails.");
      return;
    }
    if (!cleanName) {
      setValidationError("Enter your full name before continuing.");
      return;
    }
    if (role === "VENDOR") {
      if (!businessName.trim()) { setValidationError("Please enter your store or business name."); return; }
      if (!vendorAddress.trim()) { setValidationError("Please enter your business street address."); return; }
    }

    setSocialLoading(providerKey);
    const defaults = {
      google: { name: cleanName, email: cleanEmail },
      apple: { name: cleanName, email: cleanEmail },
      facebook: { name: cleanName, email: cleanEmail },
    };
    const target = defaults[providerKey] || { name: cleanName, email: cleanEmail };

    const payload = {
      provider: providerKey,
      name: target.name,
      email: target.email,
      role,
    };

    if (role === "VENDOR") {
      payload.vendorProfile = {
        name: businessName.trim(),
        category: vendorCategory,
        area: vendorArea,
        address: vendorAddress.trim(),
      };
    } else if (role === "RIDER") {
      payload.riderProfile = {
        zone: riderZone,
      };
    }

    try {
      const result = await socialLogin(payload);

      if (result && result.pendingApproval) {
        setPendingMessage(
          result.message ||
          `Your ${role === "VENDOR" ? "Store Profile" : "Rider Account"} has been submitted via ${providerKey}! Needly Admin will review and activate your account shortly.`
        );
      } else if (result?.error) {
        setValidationError(result.error);
      } else if (!result) {
        setValidationError("Social registration could not be completed. Please try again.");
      }
    } catch (err) {
      setValidationError(err.message || "Social registration could not be completed. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  if (pendingMessage) {
    return (
      <View style={styles.pendingScreen}>
        <NeedlyLogo size="large" theme="dark" />
        <View style={styles.pendingCard}>
          <Text style={styles.pendingIcon}>{role === "VENDOR" ? "🏪" : "🛵"}</Text>
          <Text style={styles.pendingTitle}>Registration Submitted</Text>
          <Text style={styles.pendingText}>{pendingMessage}</Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Status: Pending Admin Review</Text>
          </View>
          <Text style={styles.pendingHint}>Check your email for the Needly notification. Vendors can log in from the approval email after Admin activates the store.</Text>
          <Pressable style={styles.backLoginBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.backLoginBtnText}>Return to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {!isDesktop && (
        <>
          <Image source={LOGIN_HERO_MARKET} style={styles.mobilePageImage} resizeMode="cover" />
          <View style={styles.mobilePageOverlay} />
        </>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isDesktop ? styles.contentDesktop : styles.contentMobile,
          !isDesktop && { minHeight: height },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.layout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
          {isDesktop ? (
            <ImageBackground
              source={LOGIN_HERO_MARKET}
              style={styles.hero}
              imageStyle={styles.heroImage}
              resizeMode="cover"
            >
              <Image source={LOGIN_HERO_MARKET} style={styles.heroPhoto} resizeMode="cover" />
              <View style={styles.heroTopFade} />
              <View style={styles.heroBottomFade} />
              <View style={styles.heroBrand}>
                <NeedlyLogo size="hero" theme="dark" variant="compact" showBadges={false} />
                <Text style={styles.heroTagline}>Everything you need,{"\n"}in one place.</Text>
              </View>
              <View style={styles.heroStory}>
                <View style={styles.locationChip}>
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.locationChipText}>Abeokuta, Nigeria</Text>
                </View>
                <Text style={styles.storyTitle}>Support Local, Grow Local</Text>
                <Text style={styles.storyText}>Create your Needly account to shop, sell, or deliver across Abeokuta.</Text>
              </View>
            </ImageBackground>
          ) : (
            <View style={[styles.mobileBrandBlock, { minHeight: mobileBrandHeight }]}>
              <NeedlyLogo size="medium" theme="dark" variant="icon" showBadges={false} />
              <View style={styles.mobileLocationChip}>
                <Ionicons name="location" size={15} color="#fff" />
                <Text style={styles.mobileLocationText}>Abeokuta, Nigeria</Text>
              </View>
            </View>
          )}

          <View style={[styles.panel, { width: panelWidth }, isDesktop ? styles.panelDesktop : styles.panelMobile]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isCompact && styles.cardTitleCompact]}>Create account</Text>
              <Text style={[styles.cardSubtitle, isCompact && styles.cardSubtitleCompact]}>
                Join Needly and continue <Text style={styles.purpleText}>shopping, selling</Text> and earning.
              </Text>
            </View>

      {/* Role Selection Tabs */}
      <View style={styles.roleContainer}>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => { setRole(r.value); setValidationError(null); }}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <RoleIcon item={r} color={active ? "#FFFFFF" : INK} size={isCompact ? 17 : 20} />
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                {isDesktop && <Text style={[styles.roleSub, active && styles.roleSubActive]}>{r.sub}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        <Text style={styles.fieldLabel}>Personal details</Text>
        <View style={styles.inputWrap}>
          <FieldIcon name="user" />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <FieldIcon name="envelope" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <FieldIcon name="phone" />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <FieldIcon name="lock" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 4 characters)"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={MUTED} />
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <FieldIcon name="key" />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            style={styles.input}
          />
        </View>

        <Pressable onPress={() => setAgreeTerms((t) => !t)} style={styles.termsRow}>
          <View style={[styles.termsCheckbox, agreeTerms && styles.termsCheckboxChecked]}>
            {agreeTerms && <Text style={styles.termsCheckmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={{ color: "#F59E0B", fontWeight: "800" }}>Terms of Service</Text> & <Text style={{ color: "#F59E0B", fontWeight: "800" }}>Privacy Policy</Text>
          </Text>
        </Pressable>

        {/* Vendor Specific Details */}
        {role === "VENDOR" && (
          <View style={styles.specBox}>
            <Text style={styles.specBoxTitle}>Vendor store details</Text>

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="storefront" size={18} color={PURPLE} />
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Store or Business Name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <Text style={styles.subLabel}>Store category</Text>
            <View style={styles.chipRow}>
              {VENDOR_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setVendorCategory(cat)}
                  style={[styles.chip, vendorCategory === cat && styles.chipActive]}
                >
                  <Text style={[styles.chipText, vendorCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Abeokuta area location</Text>
            <View style={styles.chipRow}>
              {ABEOKUTA_AREAS.map((area) => (
                <Pressable
                  key={area}
                  onPress={() => setVendorArea(area)}
                  style={[styles.chip, vendorArea === area && styles.chipActive]}
                >
                  <Text style={[styles.chipText, vendorArea === area && styles.chipTextActive]}>{area}</Text>
                </Pressable>
              ))}
            </View>

            <LocationAutocomplete
              value={vendorAddress}
              onChangeText={setVendorAddress}
              onSelectLocation={(loc) => {
                setVendorAddress(loc.address);
                if (loc.area) setVendorArea(loc.area);
              }}
              placeholder="Search store street address or landmark..."
            />
          </View>
        )}

        {/* Rider Specific Details */}
        {role === "RIDER" && (
          <View style={styles.specBox}>
            <Text style={styles.specBoxTitle}>Rider operating zone</Text>
            <View style={styles.chipRow}>
              {RIDER_ZONES.map((zone) => (
                <Pressable
                  key={zone}
                  onPress={() => setRiderZone(zone)}
                  style={[styles.chip, riderZone === zone && styles.chipActive]}
                >
                  <Text style={[styles.chipText, riderZone === zone && styles.chipTextActive]}>{zone}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(validationError || authError) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{validationError || authError}</Text>
          </View>
        )}

        <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {role === "VENDOR" ? "Submit Store for Approval" : role === "RIDER" ? "Submit Rider Profile" : "Create Customer Account"}
            </Text>
          )}
        </Pressable>

        {/* Social Register Divider */}
        <View style={styles.socialDividerRow}>
          <View style={styles.socialDivider} />
          <Text style={styles.socialDividerText}>or sign up with</Text>
          <View style={styles.socialDivider} />
        </View>

        <View style={styles.socialRow}>
          {[
            ["google", "Google", "#EA4335"],
            ["apple", "Apple", "#FFFFFF"],
            ["facebook", "Facebook", "#1877F2"],
          ].map(([icon, label, color]) => (
            <Pressable
              key={label}
              onPress={() => handleSocialRegister(icon)}
              disabled={!!socialLoading}
              style={styles.socialBtn}
            >
              {socialLoading === icon ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <>
                  <FontAwesome name={icon} size={16} color={color} />
                  {isDesktop && <Text style={styles.socialBtnText}>{label}</Text>}
                </>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: 14 }}>
          <Text style={styles.loginLink}>Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text></Text>
        </Pressable>
      </View>
          </View>
        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PURPLE_DARK },
  mobilePageImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  mobilePageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(23,10,63,0.42)" },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  contentDesktop: { padding: 34, justifyContent: "center", alignItems: "center" },
  contentMobile: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 28, justifyContent: "flex-start", alignItems: "center" },
  layout: { width: "100%", maxWidth: 1120 },
  layoutDesktop: { minHeight: 720, flexDirection: "row", justifyContent: "center", alignItems: "stretch", gap: 0 },
  layoutMobile: { alignItems: "center" },
  hero: { width: 420, borderTopLeftRadius: 34, borderBottomLeftRadius: 34, overflow: "hidden", backgroundColor: PURPLE_DARK },
  heroImage: { borderTopLeftRadius: 34, borderBottomLeftRadius: 34 },
  heroPhoto: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroTopFade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.08)" },
  heroBottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(37,12,89,0.78)" },
  heroBrand: { position: "absolute", top: 54, left: 36, right: 32, flexDirection: "row", alignItems: "center", gap: 16 },
  heroTagline: { color: ORANGE, fontSize: 17, fontWeight: "800", lineHeight: 23 },
  heroStory: { position: "absolute", left: 36, right: 36, bottom: 42 },
  locationChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 22 },
  locationChipText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  storyTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginBottom: 10 },
  storyText: { color: "#FFFFFF", fontSize: 16, lineHeight: 24, fontWeight: "600" },
  mobileBrandBlock: { width: "100%", maxWidth: 370, justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
  mobileLocationChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  mobileLocationText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(221,221,234,0.85)",
    shadowColor: "#160B3E",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  panelDesktop: { borderTopRightRadius: 34, borderBottomRightRadius: 34, padding: 34, justifyContent: "center" },
  panelMobile: { borderRadius: 28, paddingHorizontal: 16, paddingVertical: 18 },
  cardHeader: { marginBottom: 14 },
  cardTitle: { color: INK, fontSize: 30, fontWeight: "900", lineHeight: 35 },
  cardTitleCompact: { fontSize: 24, lineHeight: 29 },
  cardSubtitle: { color: MUTED, fontSize: 16, lineHeight: 23, fontWeight: "600", marginTop: 7 },
  cardSubtitleCompact: { fontSize: 13.5, lineHeight: 19 },
  purpleText: { color: PURPLE, fontWeight: "900" },

  fieldLabel: { color: INK, fontSize: 13, fontWeight: "900", marginBottom: 7 },

  roleContainer: { marginBottom: 14 },
  roleGrid: { flexDirection: "row", borderRadius: 16, borderWidth: 1, borderColor: LINE, overflow: "hidden", backgroundColor: "#FFFFFF" },
  roleCard: {
    flex: 1,
    minHeight: 66,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: LINE,
  },
  roleCardActive: { backgroundColor: PURPLE, borderRightColor: PURPLE },
  roleLabel: { color: INK, fontWeight: "900", fontSize: 12.5 },
  roleLabelActive: { color: "#ffffff" },
  roleSub: { color: MUTED, fontSize: 10.5, marginTop: 1, fontWeight: "700" },
  roleSubActive: { color: "rgba(255,255,255,0.85)" },

  formContainer: { gap: 9 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff",
    borderRadius: 14, paddingHorizontal: 13, borderWidth: 1, borderColor: LINE,
    minHeight: 50, gap: 10,
  },
  input: { flex: 1, color: INK, paddingVertical: 12, fontSize: 14, fontWeight: "600" },
  eyeBtn: { padding: 6 },

  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  termsCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: LINE, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  termsCheckboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  termsCheckmark: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  termsText: { flex: 1, color: MUTED, fontSize: 11.5, fontWeight: "700", lineHeight: 16 },

  specBox: { backgroundColor: "#F8F5FF", borderRadius: 18, borderWidth: 1, borderColor: "#E8E0FF", padding: 12, gap: 9 },
  specBoxTitle: { color: INK, fontSize: 12.5, fontWeight: "900" },
  subLabel: { color: INK, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#E8E0FF" },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { color: INK, fontSize: 11.5, fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "900" },

  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 14, padding: 12 },
  errorText: { color: "#991B1B", fontSize: 13, fontWeight: "600" },

  submitBtn: { backgroundColor: PURPLE, borderRadius: 15, paddingVertical: 14, alignItems: "center", marginTop: 6, shadowColor: PURPLE, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  submitBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  loginLink: { color: MUTED, textAlign: "center", fontSize: 13, fontWeight: "700" },
  loginLinkHighlight: { color: PURPLE, fontWeight: "900" },

  socialDividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 6 },
  socialDivider: { flex: 1, height: 1, backgroundColor: LINE },
  socialDividerText: { color: MUTED, fontSize: 11.5, fontWeight: "700" },
  socialRow: { flexDirection: "row", gap: 8 },
  socialBtn: {
    flex: 1, minHeight: 42, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: LINE,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#FFFFFF",
  },
  socialBtnText: { color: INK, fontWeight: "900", fontSize: 12 },

  /* Pending Screen */
  pendingScreen: { flex: 1, backgroundColor: "#15183F", padding: 24, justifyContent: "center", alignItems: "center" },
  pendingCard: { backgroundColor: "#ffffff", borderRadius: 24, padding: 24, alignItems: "center", width: "100%", maxWidth: 360 },
  pendingIcon: { fontSize: 48, marginBottom: 12 },
  pendingTitle: { fontSize: 20, fontWeight: "900", color: "#15183F", marginBottom: 8 },
  pendingText: { fontSize: 13.5, color: "#64748B", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  pendingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 20 },
  pendingBadgeText: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  pendingHint: { color: "#64748B", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: -8, marginBottom: 18 },
  backLoginBtn: { backgroundColor: "#6F45E9", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, width: "100%", alignItems: "center" },
  backLoginBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
});
