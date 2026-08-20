import React, { useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LOGIN_AVATAR } from "../../data/customerAssets";
import { useAuth } from "../../context/AuthContext";
import NeedlyLogo from "../../components/NeedlyLogo";

const PURPLE = "#6F45E9";
const PURPLE_DARK = "#4C24D8";
const INK = "#11133D";
const MUTE = "#74739A";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "superadmin@demo.needly", pass: "password123", icon: "🛡️" },
  { role: "Customer", email: "customer@demo.needly", pass: "password123", icon: "👤" },
  { role: "Vendor", email: "mamarisi@demo.needly", pass: "password123", icon: "🍛" },
  { role: "Rider", email: "rider@demo.needly", pass: "password123", icon: "🛵" },
  { role: "Manager", email: "manager@demo.needly", pass: "password123", icon: "🛍️" },
  { role: "Admin", email: "admin@demo.needly", pass: "password123", icon: "⚡" },
];

const SOCIAL_ROLES = [
  { value: "CUSTOMER", label: "Customer", emoji: "👤" },
  { value: "VENDOR", label: "Vendor", emoji: "🏪" },
  { value: "RIDER", label: "Rider", emoji: "🛵" },
];
const VENDOR_CATEGORIES = ["Restaurant", "Supermarket", "Grills", "Local Market", "Pharmacy", "Stay & Dine"];
const ABEOKUTA_AREAS = ["Oke-Ilewo", "Ibara", "Panseke", "Adigbe", "Kuto", "Ita Eko", "Lafenwa", "Hilltop"];
const RIDER_ZONES = ["Panseke / Ibara Zone", "Kuto / Oke-Ilewo Zone", "Adigbe / Ita Eko Zone", "Lafenwa / Hilltop Zone"];

export default function LoginScreen({ navigation }) {
  const { login, socialLogin, authError, suspensionMessage, clearSuspensionMessage } = useAuth();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Focus & Interaction States
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Forgot Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Social Auth State
  const [socialLoading, setSocialLoading] = useState(null);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [socialEmailInput, setSocialEmailInput] = useState("");
  const [socialNameInput, setSocialNameInput] = useState("");
  const [socialRole, setSocialRole] = useState("CUSTOMER");
  const [socialVendorName, setSocialVendorName] = useState("");
  const [socialVendorCategory, setSocialVendorCategory] = useState("Restaurant");
  const [socialVendorArea, setSocialVendorArea] = useState("Oke-Ilewo");
  const [socialVendorAddress, setSocialVendorAddress] = useState("");
  const [socialRiderZone, setSocialRiderZone] = useState("Panseke / Ibara Zone");
  const [socialPendingMsg, setSocialPendingMsg] = useState(null);

  const compact = width < 390 || height < 700;
  const tiny = width < 360;
  const narrow = width < 410;

  const openSocialModal = (providerKey) => {
    const defaults = {
      google: { name: "Amina Lawal", email: "amina.google@gmail.com" },
      apple: { name: "Alex (Apple ID)", email: "alex.apple@icloud.com" },
      facebook: { name: "Tunde Bakare", email: "tunde.facebook@fb.com" },
    };
    const def = defaults[providerKey] || { name: "Social User", email: `${providerKey}@needly.app` };
    setActiveProvider(providerKey);
    setSocialNameInput(def.name);
    setSocialEmailInput(def.email);
    setSocialRole("CUSTOMER");
    setSocialVendorName(`${def.name}'s Store`);
    setSocialVendorCategory("Restaurant");
    setSocialVendorArea("Oke-Ilewo");
    setSocialVendorAddress("12 Lalubu Street, Oke-Ilewo, Abeokuta");
    setSocialRiderZone("Panseke / Ibara Zone");
    setSocialPendingMsg(null);
    setSocialModalVisible(true);
  };

  const handleSocialSubmit = async () => {
    if (!activeProvider) return;
    setSocialLoading(activeProvider);
    setSocialPendingMsg(null);

    const payload = {
      provider: activeProvider,
      name: socialNameInput.trim(),
      email: socialEmailInput.trim().toLowerCase(),
      role: socialRole,
    };

    if (socialRole === "VENDOR") {
      payload.vendorProfile = {
        name: socialVendorName.trim() || `${socialNameInput.trim()}'s Store`,
        category: socialVendorCategory,
        area: socialVendorArea,
        address: socialVendorAddress.trim() || "Abeokuta",
      };
    } else if (socialRole === "RIDER") {
      payload.riderProfile = {
        zone: socialRiderZone,
      };
    }

    const result = await socialLogin(payload);
    setSocialLoading(null);

    if (result && result.pendingApproval) {
      setSocialPendingMsg(result.message);
    } else if (result && result.user) {
      setSocialModalVisible(false);
    } else {
      setSocialModalVisible(false);
    }
  };

  // Auto-detect if user input looks like phone or email
  const isPhone = /^[0-9+\s-]{4,}$/.test(email.trim());

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
  };

  const handleQuickFill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
  };

  const handleSendReset = () => {
    if (!forgotInput.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSubmitted(true);
    }, 1000);
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false);
    setForgotInput("");
    setForgotSubmitted(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        compact && styles.contentCompact,
        tiny && styles.contentTiny,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.statusSpacer, compact && styles.statusSpacerCompact]} />

      {/* Header Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <NeedlyLogo size={compact ? "small" : "medium"} theme="light" showBadges={false} />
        </View>
        <Pressable style={[styles.langPill, compact && styles.langPillCompact, tiny && styles.langPillTiny]}>
          <Text style={[styles.langText, compact && styles.langTextCompact]}>◎ English⌄</Text>
        </Pressable>
      </View>

      {/* Hero Section - Scaled to be compact & responsive */}
      <View style={[styles.hero, compact && styles.heroCompact, tiny && styles.heroTiny]}>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact, tiny && styles.heroCopyTiny]}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            style={[styles.welcome, compact && styles.welcomeCompact, tiny && styles.welcomeTiny]}
          >
            Welcome back 👋
          </Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            style={[styles.welcomeSub, compact && styles.welcomeSubCompact]}
          >
            Sign in to your <Text style={styles.brandHighlight}>Needly</Text> account and continue <Text style={styles.boldWord}>shopping</Text>, <Text style={styles.boldWord}>booking</Text> and more.
          </Text>

          {/* Micro Category Track Badges - Clean & Responsive */}
          <View style={[styles.heroFeatureTrack, compact && styles.heroFeatureTrackCompact]}>
            <View style={[styles.trackChip, { backgroundColor: "#FFF1DA", borderColor: "#FFE0B2" }]}>
              <Text style={[styles.trackChipText, compact && styles.trackChipTextCompact, { color: "#D97706" }]}>🛒 Buy</Text>
            </View>
            <View style={[styles.trackChip, { backgroundColor: "#E0E7FF", borderColor: "#C7D2FE" }]}>
              <Text style={[styles.trackChipText, compact && styles.trackChipTextCompact, { color: "#4F46E5" }]}>📅 Book</Text>
            </View>
            <View style={[styles.trackChip, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
              <Text style={[styles.trackChipText, compact && styles.trackChipTextCompact, { color: "#15803D" }]}>🏨 Reserve</Text>
            </View>
          </View>
        </View>

        {/* Hero Artwork */}
        <View style={[styles.heroArt, compact && styles.heroArtCompact, tiny && styles.heroArtTiny]}>
          <View style={[styles.heroHalo, compact && styles.heroHaloCompact]} />
          <View style={[styles.avatarCircleWrap, compact && styles.avatarCircleWrapCompact, tiny && styles.avatarCircleWrapTiny]}>
            <Image
              source={typeof LOGIN_AVATAR === "string" ? { uri: LOGIN_AVATAR } : LOGIN_AVATAR?.default ? { uri: LOGIN_AVATAR.default } : LOGIN_AVATAR}
              style={styles.avatarCircleImage}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.floatIcon, compact && styles.floatIconCompact, styles.floatAuto]}><Text style={[styles.floatIconText, compact && styles.floatIconTextCompact]}>🚙</Text></View>
          <View style={[styles.floatIcon, compact && styles.floatIconCompact, styles.floatShop]}><Text style={[styles.floatIconText, compact && styles.floatIconTextCompact]}>🛍️</Text></View>
          <View style={[styles.floatIcon, compact && styles.floatIconCompact, styles.floatFood]}><Text style={[styles.floatIconText, compact && styles.floatIconTextCompact]}>🍽️</Text></View>
          <View style={[styles.floatIcon, compact && styles.floatIconCompact, styles.floatHealth]}><Text style={[styles.floatIconText, compact && styles.floatIconTextCompact]}>💊</Text></View>
        </View>
      </View>

      <View style={[styles.wave, compact && styles.waveCompact]} />

      {/* Main Login Form Card */}
      <View style={[styles.card, compact && styles.cardCompact, tiny && styles.cardTiny]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          Log in to Needly
        </Text>
        <Text style={[styles.cardSubtitle, compact && styles.cardSubtitleCompact]}>
          Your everyday marketplace, made simple.
        </Text>

        {/* 1-Tap Quick Fill Demo Bar */}
        <View style={styles.quickFillWrap}>
          <Text style={styles.quickFillLabel}>⚡ Quick Demo Fill:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFillScroll}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Pressable
                key={acc.role}
                onPress={() => handleQuickFill(acc)}
                style={[
                  styles.quickChip,
                  email === acc.email && styles.quickChipActive,
                ]}
              >
                <Text style={styles.quickChipIcon}>{acc.icon}</Text>
                <Text style={[styles.quickChipText, email === acc.email && styles.quickChipTextActive]}>
                  {acc.role}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {suspensionMessage && (
          <View style={styles.suspensionBox}>
            <Text style={styles.suspensionText}>{suspensionMessage}</Text>
            <Pressable onPress={clearSuspensionMessage}>
              <Text style={styles.suspensionDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        )}

        {/* Email or Phone Input */}
        <Text style={[styles.label, compact && styles.labelCompact]}>Email or Phone Number</Text>
        <View style={[
          styles.inputWrap,
          compact && styles.inputWrapCompact,
          emailFocused && styles.inputWrapFocused,
        ]}>
          <Text style={styles.inputIcon}>{isPhone ? "📱" : "✉️"}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="Enter your email or phone number"
            placeholderTextColor="#8B89A6"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, compact && styles.inputCompact]}
          />
          {email.length > 0 && (
            <Pressable onPress={() => setEmail("")} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Password Input */}
        <Text style={[styles.label, compact && styles.labelCompact]}>Password</Text>
        <View style={[
          styles.inputWrap,
          compact && styles.inputWrapCompact,
          passwordFocused && styles.inputWrapFocused,
        ]}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Enter your password"
            placeholderTextColor="#8B89A6"
            secureTextEntry={!showPassword}
            style={[styles.input, compact && styles.inputCompact]}
          />
          <Pressable onPress={() => setShowPassword((val) => !val)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? "👁️" : "🙈"}</Text>
          </Pressable>
        </View>

        {/* Options Row: Remember Me + Forgot Password */}
        <View style={[styles.optionRow, compact && styles.optionRowCompact]}>
          <Pressable onPress={() => setRemember((val) => !val)} style={styles.rememberRow}>
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <Text style={styles.checkText}>✓</Text>}
            </View>
            <Text numberOfLines={1} style={[styles.rememberText, compact && styles.rememberTextCompact]}>
              Remember me
            </Text>
          </Pressable>

          <Pressable onPress={() => setForgotModalVisible(true)}>
            <Text numberOfLines={1} style={[styles.forgotText, compact && styles.forgotTextCompact]}>
              Forgot password?
            </Text>
          </Pressable>
        </View>

        {authError && <Text style={styles.error}>{authError}</Text>}

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitBtn,
            compact && styles.submitBtnCompact,
            (!email.trim() || !password || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={submit}
          disabled={!email.trim() || !password || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={[styles.submitText, compact && styles.submitTextCompact]}>Log in</Text>
              <Text style={styles.submitArrow}>›</Text>
            </>
          )}
        </Pressable>

        {/* Social Divider */}
        <View style={[styles.dividerRow, compact && styles.dividerRowCompact]}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.divider} />
        </View>

        {/* Social Buttons */}
        <View style={[styles.socialRow, narrow && styles.socialRowCompact]}>
          {[
            ["google", "Google", "#EA4335"],
            ["apple", "Apple", "#000"],
            ["facebook", "Facebook", "#1877F2"],
          ].map(([icon, label, color]) => {
            const isLoading = socialLoading === icon;
            return (
              <Pressable
                key={label}
                onPress={() => openSocialModal(icon)}
                disabled={!!socialLoading}
                style={[
                  styles.socialBtn,
                  narrow && styles.socialBtnCompact,
                  isLoading && { opacity: 0.7 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={color} />
                ) : (
                  <>
                    <FontAwesome name={icon} size={compact ? 16 : 20} color={color} />
                    <Text numberOfLines={1} style={[styles.socialText, compact && styles.socialTextCompact]}>
                      {label}
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Security Badge */}
        <Pressable style={[styles.trustCard, compact && styles.trustCardCompact]}>
          <View style={[styles.shield, compact && styles.shieldCompact]}>
            <Text style={[styles.shieldText, compact && styles.shieldTextCompact]}>🛡️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, compact && styles.trustTitleCompact]}>Secure. Fast. Reliable.</Text>
            <Text style={[styles.trustText, compact && styles.trustTextCompact]}>Your data is protected with Needly.</Text>
          </View>
          <Text style={styles.trustArrow}>›</Text>
        </Pressable>

        {/* Sign Up Link */}
        <Pressable onPress={() => navigation.navigate("Register")} style={styles.signupRow}>
          <Text style={styles.signupText}>Don’t have an account? </Text>
          <Text style={styles.signupLink}>Sign up</Text>
        </Pressable>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable onPress={closeForgotModal} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>

            {!forgotSubmitted ? (
              <>
                <Text style={styles.modalIcon}>🔑</Text>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSub}>
                  Enter your registered email or phone number and we’ll send you a password reset link.
                </Text>

                <View style={[styles.inputWrap, { marginTop: 16 }]}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    value={forgotInput}
                    onChangeText={setForgotInput}
                    placeholder="Email or phone number"
                    placeholderTextColor="#8B89A6"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <Pressable
                  style={[styles.submitBtn, { marginTop: 18 }, !forgotInput.trim() && styles.submitBtnDisabled]}
                  onPress={handleSendReset}
                  disabled={!forgotInput.trim() || forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 10 }}>
                <Text style={{ fontSize: 44, marginBottom: 8 }}>✅</Text>
                <Text style={styles.modalTitle}>Check Your Inbox</Text>
                <Text style={[styles.modalSub, { textAlign: "center", marginTop: 6 }]}>
                  We sent password reset instructions to{"\n"}
                  <Text style={{ fontWeight: "800", color: INK }}>{forgotInput}</Text>
                </Text>
                <Pressable style={[styles.submitBtn, { marginTop: 20, width: "100%" }]} onPress={closeForgotModal}>
                  <Text style={styles.submitText}>Done</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Social Auth Modal */}
      <Modal visible={socialModalVisible} transparent animationType="fade" onRequestClose={() => setSocialModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ alignItems: "center" }} showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
            <View style={[styles.modalCard, { maxHeight: "90%" }]}>
              <Pressable onPress={() => setSocialModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>

              {!socialPendingMsg ? (
                <>
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <FontAwesome
                      name={activeProvider || "google"}
                      size={36}
                      color={activeProvider === "google" ? "#EA4335" : activeProvider === "facebook" ? "#1877F2" : "#000"}
                    />
                    <Text style={[styles.modalTitle, { marginTop: 6 }]}>
                      Sign in with {activeProvider ? activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1) : "Social"}
                    </Text>
                    <Text style={[styles.modalSub, { textAlign: "center" }]}>
                      Select your account role and confirm your details.
                    </Text>
                  </View>

                  {/* Account Role Selector */}
                  <Text style={[styles.label, { marginTop: 2 }]}>ACCOUNT TYPE</Text>
                  <View style={styles.socialRoleRow}>
                    {SOCIAL_ROLES.map((r) => {
                      const active = socialRole === r.value;
                      return (
                        <Pressable
                          key={r.value}
                          onPress={() => setSocialRole(r.value)}
                          style={[styles.socialRoleChip, active && styles.socialRoleChipActive]}
                        >
                          <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
                          <Text style={[styles.socialRoleText, active && styles.socialRoleTextActive]}>{r.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { marginTop: 10 }]}>Full Name</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      value={socialNameInput}
                      onChangeText={setSocialNameInput}
                      placeholder="Full Name"
                      placeholderTextColor="#8B89A6"
                      style={styles.input}
                    />
                  </View>

                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      value={socialEmailInput}
                      onChangeText={setSocialEmailInput}
                      placeholder="Email Address"
                      placeholderTextColor="#8B89A6"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                    />
                  </View>

                  {/* Vendor Profile Extra Details */}
                  {socialRole === "VENDOR" && (
                    <View style={styles.socialSpecBox}>
                      <Text style={styles.socialSpecTitle}>🏪 VENDOR STORE SETUP</Text>

                      <Text style={styles.label}>Store / Business Name</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>🏪</Text>
                        <TextInput
                          value={socialVendorName}
                          onChangeText={setSocialVendorName}
                          placeholder="e.g. Mama Risi Amala Spot"
                          placeholderTextColor="#8B89A6"
                          style={styles.input}
                        />
                      </View>

                      <Text style={styles.label}>Category</Text>
                      <View style={styles.chipRowWrap}>
                        {VENDOR_CATEGORIES.map((cat) => (
                          <Pressable
                            key={cat}
                            onPress={() => setSocialVendorCategory(cat)}
                            style={[styles.miniChip, socialVendorCategory === cat && styles.miniChipActive]}
                          >
                            <Text style={[styles.miniChipText, socialVendorCategory === cat && styles.miniChipTextActive]}>{cat}</Text>
                          </Pressable>
                        ))}
                      </View>

                      <Text style={styles.label}>Abeokuta Location Area</Text>
                      <View style={styles.chipRowWrap}>
                        {ABEOKUTA_AREAS.map((area) => (
                          <Pressable
                            key={area}
                            onPress={() => setSocialVendorArea(area)}
                            style={[styles.miniChip, socialVendorArea === area && styles.miniChipActive]}
                          >
                            <Text style={[styles.miniChipText, socialVendorArea === area && styles.miniChipTextActive]}>{area}</Text>
                          </Pressable>
                        ))}
                      </View>

                      <Text style={styles.label}>Street Address</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>📍</Text>
                        <TextInput
                          value={socialVendorAddress}
                          onChangeText={setSocialVendorAddress}
                          placeholder="Street address or landmark"
                          placeholderTextColor="#8B89A6"
                          style={styles.input}
                        />
                      </View>
                    </View>
                  )}

                  {/* Rider Profile Extra Details */}
                  {socialRole === "RIDER" && (
                    <View style={styles.socialSpecBox}>
                      <Text style={styles.socialSpecTitle}>🛵 RIDER OPERATING ZONE</Text>
                      <View style={styles.chipRowWrap}>
                        {RIDER_ZONES.map((zone) => (
                          <Pressable
                            key={zone}
                            onPress={() => setSocialRiderZone(zone)}
                            style={[styles.miniChip, socialRiderZone === zone && styles.miniChipActive]}
                          >
                            <Text style={[styles.miniChipText, socialRiderZone === zone && styles.miniChipTextActive]}>{zone}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  <Pressable
                    style={[styles.submitBtn, { marginTop: 18 }, (!socialEmailInput.trim() || !socialNameInput.trim()) && styles.submitBtnDisabled]}
                    onPress={handleSocialSubmit}
                    disabled={!socialEmailInput.trim() || !socialNameInput.trim()}
                  >
                    <Text style={styles.submitText}>
                      Continue as {socialRole.charAt(0) + socialRole.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 14 }}>
                  <Text style={{ fontSize: 44, marginBottom: 8 }}>🏪</Text>
                  <Text style={styles.modalTitle}>Registration Submitted</Text>
                  <Text style={[styles.modalSub, { textAlign: "center", marginTop: 6, lineHeight: 19 }]}>
                    {socialPendingMsg}
                  </Text>
                  <View style={[styles.suspensionBox, { marginTop: 16, backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                    <Text style={[styles.suspensionText, { color: "#92400E" }]}>
                      ⚡ Status: Pending Admin Setup
                    </Text>
                  </View>
                  <Pressable style={[styles.submitBtn, { marginTop: 18, width: "100%" }]} onPress={() => setSocialModalVisible(false)}>
                    <Text style={styles.submitText}>Return to Login</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF8FF" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26 },
  contentCompact: { paddingHorizontal: 14, paddingTop: 8 },
  contentTiny: { paddingHorizontal: 12 },
  statusSpacer: { height: 32 },
  statusSpacerCompact: { height: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  brandRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  langPill: { borderWidth: 1, borderColor: "#DED4FB", borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: "#fff" },
  langPillCompact: { paddingHorizontal: 9, paddingVertical: 6 },
  langPillTiny: { paddingHorizontal: 8, paddingVertical: 5 },
  langText: { color: PURPLE_DARK, fontSize: 13, fontWeight: "800" },
  langTextCompact: { fontSize: 11 },

  /* Hero Section - Scaled down & Responsive */
  hero: { minHeight: 210, marginTop: 14, flexDirection: "row", alignItems: "center" },
  heroCompact: { minHeight: 165, marginTop: 10 },
  heroTiny: { minHeight: 150, marginTop: 6 },
  heroCopy: { width: "52%", zIndex: 2 },
  heroCopyCompact: { width: "54%" },
  heroCopyTiny: { width: "55%" },

  welcome: { color: INK, fontSize: 25, lineHeight: 30, fontWeight: "900", letterSpacing: -0.4 },
  welcomeCompact: { fontSize: 19, lineHeight: 23 },
  welcomeTiny: { fontSize: 17, lineHeight: 21 },

  welcomeSub: { color: "#4A496B", fontSize: 13, lineHeight: 19, marginTop: 6, fontWeight: "500" },
  welcomeSubCompact: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  brandHighlight: { color: PURPLE_DARK, fontWeight: "900" },
  boldWord: { color: INK, fontWeight: "800" },

  heroFeatureTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  heroFeatureTrackCompact: { marginTop: 6, gap: 3 },
  trackChip: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  trackChipTextCompact: { fontSize: 9 },

  heroArt: { flex: 1, height: 210, alignItems: "center", justifyContent: "center" },
  heroArtCompact: { height: 160 },
  heroArtTiny: { height: 140 },
  heroHalo: { position: "absolute", width: 165, height: 165, borderRadius: 82.5, backgroundColor: "#E4D7FF", opacity: 0.8 },
  heroHaloCompact: { width: 125, height: 125, borderRadius: 62.5 },
  avatarCircleWrap: {
    width: 145, height: 145, borderRadius: 72.5, overflow: "hidden",
    borderWidth: 3, borderColor: "#ffffff", backgroundColor: "#fff",
    shadowColor: "#6F45E9", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    zIndex: 3,
  },
  avatarCircleWrapCompact: { width: 115, height: 115, borderRadius: 57.5 },
  avatarCircleWrapTiny: { width: 100, height: 100, borderRadius: 50 },
  avatarCircleImage: { width: "100%", height: "100%" },
  floatIcon: {
    position: "absolute", width: 36, height: 36, borderRadius: 12, backgroundColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  floatIconCompact: { width: 28, height: 28, borderRadius: 10 },
  floatIconText: { fontSize: 20 },
  floatIconTextCompact: { fontSize: 16 },
  floatAuto: { left: -4, top: 70 },
  floatShop: { right: 0, top: 25 },
  floatFood: { right: -2, top: 100 },
  floatHealth: { left: 10, bottom: 10 },

  wave: {
    height: 48, backgroundColor: PURPLE, borderTopLeftRadius: 100, borderTopRightRadius: 18,
    marginHorizontal: -22, marginTop: -20, transform: [{ skewY: "-5deg" }],
  },
  waveCompact: { height: 36, marginHorizontal: -14, marginTop: -14 },

  /* Card */
  card: {
    marginTop: -16, backgroundColor: "#fff", borderRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20,
    borderWidth: 1, borderColor: "#E7DFFC", shadowColor: "#22164F", shadowOpacity: 0.08,
    shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  cardCompact: { marginTop: -14, paddingHorizontal: 15, paddingTop: 18, paddingBottom: 16, borderRadius: 20 },
  cardTiny: { paddingHorizontal: 12, paddingTop: 15, paddingBottom: 14 },
  cardTitle: { color: INK, fontSize: 24, fontWeight: "900", textAlign: "center" },
  cardTitleCompact: { fontSize: 20 },
  cardSubtitle: { color: MUTE, fontSize: 13.5, textAlign: "center", marginTop: 4, marginBottom: 16 },
  cardSubtitleCompact: { fontSize: 11.5, marginBottom: 12 },

  /* Demo Quick Fill Bar */
  quickFillWrap: { marginBottom: 14, backgroundColor: "#F6F3FE", borderRadius: 14, padding: 8, borderWidth: 1, borderColor: "#E8E0FB" },
  quickFillLabel: { fontSize: 11, fontWeight: "800", color: PURPLE_DARK, marginBottom: 6 },
  quickFillScroll: { gap: 6 },
  quickChip: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff",
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "#DED4FB",
  },
  quickChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  quickChipIcon: { fontSize: 12 },
  quickChipText: { fontSize: 11.5, fontWeight: "700", color: INK },
  quickChipTextActive: { color: "#fff" },

  suspensionBox: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 12, padding: 12,
    marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  suspensionText: { flex: 1, color: "#991B1B", fontSize: 12.5, fontWeight: "600" },
  suspensionDismiss: { color: "#7F1D1D", fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },

  label: { color: INK, fontSize: 13.5, fontWeight: "800", marginBottom: 6, marginTop: 10 },
  labelCompact: { fontSize: 12, marginBottom: 5, marginTop: 8 },
  inputWrap: {
    minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: "#DED4FB", flexDirection: "row",
    alignItems: "center", paddingHorizontal: 12, gap: 10, backgroundColor: "#fff",
  },
  inputWrapCompact: { minHeight: 46, borderRadius: 12, paddingHorizontal: 10, gap: 8 },
  inputWrapFocused: { borderColor: PURPLE, shadowColor: PURPLE, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, color: INK, fontSize: 14.5, fontWeight: "500" },
  inputCompact: { fontSize: 13 },
  clearBtn: { padding: 4 },
  clearBtnText: { color: "#8987A0", fontSize: 14, fontWeight: "700" },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 16 },

  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 8 },
  optionRowCompact: { marginTop: 10 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#C9C1F8", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: PURPLE_DARK, borderColor: PURPLE_DARK },
  checkText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  rememberText: { color: INK, fontSize: 13, fontWeight: "700" },
  rememberTextCompact: { fontSize: 11.5 },
  forgotText: { color: PURPLE_DARK, fontSize: 13, fontWeight: "800" },
  forgotTextCompact: { fontSize: 11.5 },
  error: { color: "#E14B3C", fontSize: 12.5, fontWeight: "700", marginTop: 10, textAlign: "center" },

  submitBtn: {
    marginTop: 18, minHeight: 54, borderRadius: 15, backgroundColor: PURPLE,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  submitBtnCompact: { marginTop: 14, minHeight: 46, borderRadius: 13 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  submitTextCompact: { fontSize: 14.5 },
  submitArrow: { position: "absolute", right: 20, color: "#fff", fontSize: 30, fontWeight: "800", marginTop: -2 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 14 },
  dividerRowCompact: { gap: 8, marginTop: 14, marginBottom: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "#E7E4F2" },
  dividerText: { color: "#8987A0", fontSize: 12.5, fontWeight: "600" },

  socialRow: { flexDirection: "row", gap: 8 },
  socialRowCompact: { gap: 6 },
  socialBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#E6E1F4", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: "#FAF9FE" },
  socialBtnCompact: { minHeight: 40, gap: 4, paddingHorizontal: 2 },
  socialText: { color: INK, fontSize: 12.5, fontWeight: "800" },
  socialTextCompact: { fontSize: 11 },

  trustCard: {
    marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
    borderRadius: 14, backgroundColor: "#F7F5FE", borderWidth: 1, borderColor: "#ECE6FA",
  },
  trustCardCompact: { marginTop: 14, padding: 10 },
  shield: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EDE6FE", alignItems: "center", justifyContent: "center" },
  shieldCompact: { width: 28, height: 28, borderRadius: 8 },
  shieldText: { fontSize: 16 },
  shieldTextCompact: { fontSize: 13 },
  trustTitle: { color: INK, fontSize: 12.5, fontWeight: "800" },
  trustTitleCompact: { fontSize: 11.5 },
  trustText: { color: MUTE, fontSize: 11, fontWeight: "500" },
  trustTextCompact: { fontSize: 10 },
  trustArrow: { color: MUTE, fontSize: 18 },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 18 },
  signupText: { color: MUTE, fontSize: 13.5, fontWeight: "600" },
  signupLink: { color: PURPLE_DARK, fontSize: 13.5, fontWeight: "900" },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(17, 19, 61, 0.65)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 24, padding: 22, position: "relative" },
  modalCloseBtn: { position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F0FC", alignItems: "center", justifyContent: "center" },
  modalCloseText: { color: INK, fontSize: 14, fontWeight: "800" },
  modalIcon: { fontSize: 36, marginBottom: 8 },
  modalTitle: { color: INK, fontSize: 20, fontWeight: "900" },
  modalSub: { color: MUTE, fontSize: 13, marginTop: 4, lineHeight: 18 },

  socialRoleRow: { flexDirection: "row", gap: 6, marginVertical: 6 },
  socialRoleChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: "#DED4FB", backgroundColor: "#F9F8FE" },
  socialRoleChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  socialRoleText: { fontSize: 11.5, fontWeight: "700", color: INK },
  socialRoleTextActive: { color: "#fff" },

  socialSpecBox: { marginTop: 10, backgroundColor: "#F6F3FE", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E8E0FB" },
  socialSpecTitle: { fontSize: 11, fontWeight: "900", color: PURPLE_DARK, marginBottom: 4 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 4 },
  miniChip: { backgroundColor: "#fff", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#DED4FB" },
  miniChipActive: { backgroundColor: PURPLE_DARK, borderColor: PURPLE_DARK },
  miniChipText: { fontSize: 11, fontWeight: "700", color: INK },
  miniChipTextActive: { color: "#fff" },
});
