import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import NeedlyLogo from "../../components/NeedlyLogo";
import LocationAutocomplete from "../../components/LocationAutocomplete";

const ROLES = [
  { value: "CUSTOMER", label: "Customer", emoji: "👤", sub: "Shop & order" },
  { value: "VENDOR", label: "Vendor", emoji: "🏪", sub: "Sell items" },
  { value: "RIDER", label: "Rider", emoji: "🛵", sub: "Deliver & earn" },
];

const VENDOR_CATEGORIES = ["Restaurant", "Supermarket", "Grills", "Local Market", "Pharmacy", "Stay & Dine"];
const ABEOKUTA_AREAS = ["Oke-Ilewo", "Ibara", "Panseke", "Adigbe", "Kuto", "Ita Eko", "Lafenwa", "Hilltop"];
const RIDER_ZONES = ["Panseke / Ibara Zone", "Kuto / Oke-Ilewo Zone", "Adigbe / Ita Eko Zone", "Lafenwa / Hilltop Zone"];
const GOOGLE_ROLE_IDENTITIES = {
  CUSTOMER: { name: "Ada Customer", email: "customer@demo.needly" },
  VENDOR: { name: "Mama Risi", email: "mamarisi@demo.needly" },
  RIDER: { name: "Tunde A.", email: "rider@demo.needly" },
};

export default function RegisterScreen({ navigation, route }) {
  const { register, socialLogin, authError } = useAuth();
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

    const result = await register(payload);
    setSubmitting(false);

    if (result?.pendingApproval) {
      setPendingMessage(
        result.message ||
        `Your ${role === "VENDOR" ? "Store Profile" : "Rider Account"} has been submitted! Needly Admin will review and activate your account shortly.`
      );
    }
  };

  const handleSocialRegister = async (providerKey) => {
    setSocialLoading(providerKey);
    const googleDef = GOOGLE_ROLE_IDENTITIES[role] || GOOGLE_ROLE_IDENTITIES.CUSTOMER;
    const defaults = {
      google: { name: name.trim() || googleDef.name, email: email.trim().toLowerCase() || googleDef.email },
      apple: { name: name.trim() || "Alex", email: email.trim().toLowerCase() || "alex.apple@icloud.com" },
      facebook: { name: name.trim() || "Tunde Bakare", email: email.trim().toLowerCase() || "tunde.facebook@fb.com" },
    };
    const target = defaults[providerKey] || { name: name.trim() || "Social User", email: email.trim().toLowerCase() || `${providerKey}@needly.app` };

    const payload = {
      provider: providerKey,
      name: target.name,
      email: target.email,
      role,
    };

    if (role === "VENDOR") {
      payload.vendorProfile = {
        name: businessName.trim() || `${target.name}'s Store`,
        category: vendorCategory,
        area: vendorArea,
        address: vendorAddress.trim() || "Abeokuta",
      };
    } else if (role === "RIDER") {
      payload.riderProfile = {
        zone: riderZone,
      };
    }

    const result = await socialLogin(payload);
    setSocialLoading(null);

    if (result && result.pendingApproval) {
      setPendingMessage(
        result.message ||
        `Your ${role === "VENDOR" ? "Store Profile" : "Rider Account"} has been submitted via ${providerKey}! Needly Admin will review and activate your account shortly.`
      );
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.brandHeader}>
        <NeedlyLogo size="medium" theme="dark" />
        <Text style={styles.brandTitle}>Create Account</Text>
        <Text style={styles.brandSubtitle}>Join Needly Everyday Marketplace in Abeokuta</Text>
      </View>

      {/* Role Selection Tabs */}
      <View style={styles.roleContainer}>
        <Text style={styles.fieldLabel}>SELECT YOUR ROLE</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => { setRole(r.value); setValidationError(null); }}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={[styles.roleSub, active && styles.roleSubActive]}>{r.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        <Text style={styles.fieldLabel}>PERSONAL DETAILS</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full Name (e.g. Amina Lawal)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>📱</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number (e.g. 0803 220 1141)"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 4 characters)"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔑</Text>
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
            <Text style={styles.specBoxTitle}>🏪 VENDOR STORE DETAILS</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🏪</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Store or Business Name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <Text style={styles.subLabel}>Store Category:</Text>
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

            <Text style={styles.subLabel}>Abeokuta Area Location:</Text>
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
            <Text style={styles.specBoxTitle}>🛵 RIDER OPERATING ZONE</Text>
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
            <Text style={styles.errorText}>❌ {validationError || authError}</Text>
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
                  <Text style={styles.socialBtnText}>{label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: 14 }}>
          <Text style={styles.loginLink}>Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text></Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#15183F" },
  content: { padding: 20, paddingBottom: 60, justifyContent: "center" },

  brandHeader: { alignItems: "center", marginBottom: 20 },
  brandTitle: { color: "#ffffff", fontWeight: "900", fontSize: 24, marginTop: 12 },
  brandSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4, textAlign: "center" },

  fieldLabel: { color: "#F59E0B", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.5, marginBottom: 8 },

  roleContainer: { marginBottom: 16 },
  roleGrid: { flexDirection: "row", gap: 8 },
  roleCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 10,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", alignItems: "center",
  },
  roleCardActive: { backgroundColor: "#6F45E9", borderColor: "#ffffff" },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleLabel: { color: "rgba(255,255,255,0.8)", fontWeight: "800", fontSize: 12.5 },
  roleLabelActive: { color: "#ffffff" },
  roleSub: { color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 },
  roleSubActive: { color: "rgba(255,255,255,0.85)" },

  formContainer: { gap: 10 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff",
    borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E2E8F0",
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: "#15183F", paddingVertical: 12, fontSize: 14 },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 16 },

  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  termsCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  termsCheckboxChecked: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  termsCheckmark: { color: "#15183F", fontWeight: "900", fontSize: 12 },
  termsText: { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 12 },

  specBox: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", padding: 14, gap: 10 },
  specBoxTitle: { color: "#F59E0B", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  subLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: "700", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  chipActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  chipText: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: "700" },
  chipTextActive: { color: "#15183F", fontWeight: "900" },

  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 14, padding: 12 },
  errorText: { color: "#991B1B", fontSize: 13, fontWeight: "600" },

  submitBtn: { backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  submitBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  loginLink: { color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 13 },
  loginLinkHighlight: { color: "#F59E0B", fontWeight: "800" },

  socialDividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 6 },
  socialDivider: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  socialDividerText: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, fontWeight: "600" },
  socialRow: { flexDirection: "row", gap: 8 },
  socialBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.06)",
  },
  socialBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },

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
