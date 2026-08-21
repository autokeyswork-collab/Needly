import React, { useMemo, useState } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import NeedlyLogo from "../../components/NeedlyLogo";
import { LOGIN_HERO_MARKET } from "../../data/customerAssets";
import { useAuth } from "../../context/AuthContext";

const PURPLE = "#6F45E9";
const PURPLE_DARK = "#24105F";
const ORANGE = "#F47C00";
const INK = "#10113D";
const MUTED = "#7E80A0";
const LINE = "#DDDDEA";

const ACCOUNT_TYPES = [
  { key: "CUSTOMER", label: "Customer", icon: "person", family: "Ionicons" },
  { key: "VENDOR", label: "Vendor", icon: "storefront", family: "MaterialCommunityIcons" },
  { key: "RIDER", label: "Rider", icon: "motorbike", family: "MaterialCommunityIcons" },
  { key: "PROVIDER", label: "Provider", icon: "briefcase", family: "FontAwesome" },
];

const SOCIAL_IDENTITIES = {
  CUSTOMER: { name: "Ada Customer", email: "customer@demo.needly", role: "CUSTOMER" },
  VENDOR: { name: "Mama Risi", email: "mamarisi@demo.needly", role: "VENDOR" },
  RIDER: { name: "Tunde A.", email: "rider@demo.needly", role: "RIDER" },
  PROVIDER: { name: "Amaka O.", email: "manager@demo.needly", role: "MANAGER" },
};

function RoleIcon({ item, color, size = 25 }) {
  if (item.family === "Ionicons") return <Ionicons name={item.icon} size={size} color={color} />;
  if (item.family === "MaterialCommunityIcons") return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
  return <FontAwesome name={item.icon} size={size - 2} color={color} />;
}

function FieldIcon({ name }) {
  return <FontAwesome name={name} size={20} color={PURPLE} />;
}

export default function LoginScreen({ navigation }) {
  const { login, socialLogin, authError, suspensionMessage, clearSuspensionMessage } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isCompact = width < 390 || height < 720;

  const [accountType, setAccountType] = useState("CUSTOMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const panelWidth = useMemo(() => {
    if (!isDesktop) return "100%";
    return Math.min(620, Math.max(560, width * 0.48));
  }, [isDesktop, width]);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
  };

  const handleSocial = async (provider) => {
    const identity = SOCIAL_IDENTITIES[accountType] || SOCIAL_IDENTITIES.CUSTOMER;
    setSocialLoading(provider);
    await socialLogin({
      provider,
      name: provider === "google" ? identity.name : provider === "apple" ? `${identity.name} Apple` : `${identity.name} Facebook`,
      email: provider === "google" ? identity.email : `${identity.role.toLowerCase()}.${provider}@needly.app`,
      role: identity.role,
    });
    setSocialLoading(null);
  };

  const handleSendReset = () => {
    if (!forgotInput.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSubmitted(true);
    }, 900);
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false);
    setForgotInput("");
    setForgotSubmitted(false);
  };

  const errorMessage = suspensionMessage || authError;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isDesktop ? styles.contentDesktop : styles.contentMobile,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.layout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
          <ImageBackground
            source={LOGIN_HERO_MARKET}
            style={[styles.hero, isDesktop ? styles.heroDesktop : styles.heroMobile]}
            imageStyle={[styles.heroImage, isDesktop ? styles.heroImageDesktop : styles.heroImageMobile]}
            resizeMode="cover"
          >
            <View style={styles.heroTopFade} />
            <View style={styles.heroBottomFade} />
            <View style={[styles.heroBrand, !isDesktop && styles.heroBrandMobile]}>
              <NeedlyLogo size={isDesktop ? "hero" : "large"} theme="dark" variant="compact" showBadges={false} />
              <Text style={styles.heroTagline}>Everything you need,{"\n"}in one place.</Text>
            </View>
            <View style={styles.heroStory}>
              <View style={styles.locationChip}>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.locationChipText}>Abeokuta, Nigeria</Text>
              </View>
              <Text style={styles.storyTitle}>Support Local, Grow Local</Text>
              <Text style={styles.storyText}>Shop quality products and services from trusted local sellers in Abeokuta.</Text>
              <View style={styles.heroDots}>
                <View style={styles.heroDotActive} />
                <View style={styles.heroDot} />
                <View style={styles.heroDot} />
              </View>
            </View>
          </ImageBackground>

          <View style={[styles.panel, { width: panelWidth }, isDesktop ? styles.panelDesktop : styles.panelMobile]}>
            <View style={styles.panelScrollProxy}>
              <View style={styles.langRow}>
                {!isDesktop && <NeedlyLogo size="medium" theme="dark" variant="compact" showBadges={false} />}
                <Pressable style={styles.langPill}>
                  <Ionicons name="globe-outline" size={20} color={INK} />
                  <Text style={styles.langText}>English</Text>
                  <Ionicons name="chevron-down" size={18} color={INK} />
                </Pressable>
              </View>

              <View style={[styles.welcomeBlock, isCompact && styles.welcomeBlockCompact]}>
                <Text style={[styles.welcomeTitle, isCompact && styles.welcomeTitleCompact]}>Welcome back! 👋</Text>
                <Text style={[styles.welcomeText, isCompact && styles.welcomeTextCompact]}>
                  Sign in to your Needly account and continue{" "}
                  <Text style={styles.purpleText}>shopping, booking</Text> and more.
                </Text>
              </View>

              <View style={styles.roleSelector}>
                {ACCOUNT_TYPES.map((item) => {
                  const active = accountType === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setAccountType(item.key)}
                      style={[styles.roleTab, active && styles.roleTabActive]}
                    >
                      <RoleIcon item={item} color={active ? "#fff" : INK} />
                      <Text style={[styles.roleText, active && styles.roleTextActive]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {!!errorMessage && (
                <Pressable style={styles.errorBox} onPress={clearSuspensionMessage}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Pressable>
              )}

              <View style={styles.formBlock}>
                <Text style={styles.label}>Email or Phone Number</Text>
                <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
                  <FieldIcon name="user" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Enter email or phone number"
                    placeholderTextColor="#8B8EA8"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused]}>
                  <FieldIcon name="lock" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#8B8EA8"
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={25} color="#8B8EA8" />
                  </Pressable>
                </View>

                <View style={styles.optionRow}>
                  <Pressable style={styles.rememberRow} onPress={() => setRemember((prev) => !prev)}>
                    <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                      {remember && <FontAwesome name="check" size={15} color="#fff" />}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable onPress={() => setForgotModalVisible(true)}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                </View>

                <Pressable
                  disabled={!email.trim() || !password || submitting}
                  onPress={submit}
                  style={[styles.signInButton, (!email.trim() || !password || submitting) && styles.signInButtonDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.signInText}>Sign In</Text>
                      <FontAwesome name="arrow-right" size={23} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialStack}>
                {[
                  { key: "google", label: "Continue with Google", icon: "google", color: "#4285F4" },
                  { key: "apple", label: "Continue with Apple", icon: "apple", color: "#020617" },
                  { key: "facebook", label: "Continue with Facebook", icon: "facebook", color: "#1877F2" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    disabled={!!socialLoading}
                    onPress={() => handleSocial(item.key)}
                    style={styles.socialButton}
                  >
                    {socialLoading === item.key ? (
                      <ActivityIndicator color={PURPLE} />
                    ) : (
                      <>
                        <FontAwesome name={item.icon} size={24} color={item.color} />
                        <Text style={styles.socialText}>{item.label}</Text>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={styles.securityCard}>
                <View style={styles.securityIcon}>
                  <Ionicons name="shield-checkmark-outline" size={34} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.securityTitle}>Your data is protected with Needly.</Text>
                  <Text style={styles.securityText}>Fast, secure and reliable.</Text>
                </View>
              </View>

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don’t have an account?</Text>
                <Pressable onPress={() => navigation.navigate("Register", { role: accountType === "PROVIDER" ? "VENDOR" : accountType })}>
                  <Text style={styles.signupLink}>Sign up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.forgotCard}>
            {!forgotSubmitted ? (
              <>
                <Text style={styles.forgotTitle}>Reset password</Text>
                <Text style={styles.forgotCopy}>Enter your email or phone number and we’ll send reset instructions when recovery is enabled.</Text>
                <View style={styles.forgotInputWrap}>
                  <FieldIcon name="user" />
                  <TextInput
                    value={forgotInput}
                    onChangeText={setForgotInput}
                    autoCapitalize="none"
                    placeholder="Email or phone number"
                    placeholderTextColor="#8B8EA8"
                    style={styles.input}
                  />
                </View>
                <Pressable style={styles.modalButton} onPress={handleSendReset} disabled={forgotLoading}>
                  {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Send reset link</Text>}
                </Pressable>
                <Pressable style={styles.modalGhost} onPress={closeForgotModal}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.forgotTitle}>Check your inbox</Text>
                <Text style={styles.forgotCopy}>If an account exists, password recovery instructions will be sent shortly.</Text>
                <Pressable style={styles.modalButton} onPress={closeForgotModal}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8FC" },
  scroll: { flex: 1 },
  content: { minHeight: "100%" },
  contentDesktop: { padding: 36, justifyContent: "center" },
  contentMobile: { padding: 16, paddingBottom: 28 },
  layout: { width: "100%", alignSelf: "center" },
  layoutDesktop: { maxWidth: 1180, minHeight: 760, flexDirection: "row", justifyContent: "center", alignItems: "stretch" },
  layoutMobile: { maxWidth: 430, gap: 16 },
  hero: { overflow: "hidden", backgroundColor: PURPLE_DARK },
  heroDesktop: { width: "42%", minHeight: 760, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  heroMobile: { height: 360, borderRadius: 28 },
  heroImage: { width: "100%", height: "100%" },
  heroImageDesktop: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  heroImageMobile: { borderRadius: 28 },
  heroTopFade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.02)" },
  heroBottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(36,16,95,0.72)" },
  heroBrand: { position: "absolute", top: 76, left: 54, gap: 12 },
  heroBrandMobile: { top: 22, left: 20, transform: [{ scale: 0.72 }], transformOrigin: "top left" },
  heroTagline: { marginLeft: 136, marginTop: -54, color: ORANGE, fontSize: 20, lineHeight: 28, fontWeight: "800" },
  heroStory: { position: "absolute", left: 52, right: 42, bottom: 42 },
  locationChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 17, paddingVertical: 12, borderRadius: 13, marginBottom: 26 },
  locationChipText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  storyTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 14 },
  storyText: { color: "#fff", fontSize: 18, lineHeight: 28, fontWeight: "600", maxWidth: 360 },
  heroDots: { flexDirection: "row", gap: 12, marginTop: 30 },
  heroDotActive: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#fff" },
  heroDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.35)" },
  panel: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E7E8F1", shadowColor: "#17113A", shadowOpacity: 0.08, shadowRadius: 28, shadowOffset: { width: 0, height: 18 } },
  panelDesktop: { minHeight: 760, borderRadius: 28, marginLeft: 0, paddingHorizontal: 48, paddingVertical: 34 },
  panelMobile: { borderRadius: 28, paddingHorizontal: 20, paddingVertical: 22 },
  panelScrollProxy: { flex: 1 },
  langRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  langPill: { marginLeft: "auto", minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "#E6E7EF", backgroundColor: "#fff", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#17113A", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  langText: { color: INK, fontSize: 16, fontWeight: "900" },
  welcomeBlock: { marginTop: 48, marginBottom: 28 },
  welcomeBlockCompact: { marginTop: 32, marginBottom: 22 },
  welcomeTitle: { color: INK, fontSize: 40, lineHeight: 48, fontWeight: "900" },
  welcomeTitleCompact: { fontSize: 32, lineHeight: 38 },
  welcomeText: { marginTop: 18, color: MUTED, fontSize: 24, lineHeight: 34, fontWeight: "500" },
  welcomeTextCompact: { fontSize: 18, lineHeight: 27, marginTop: 12 },
  purpleText: { color: PURPLE, fontWeight: "900" },
  roleSelector: { minHeight: 104, borderRadius: 16, borderWidth: 1.3, borderColor: "#DADBE8", flexDirection: "row", overflow: "hidden", marginBottom: 30 },
  roleTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, borderRightWidth: 1, borderRightColor: "#E6E7EF", backgroundColor: "#fff" },
  roleTabActive: { backgroundColor: PURPLE },
  roleText: { color: INK, fontSize: 15, fontWeight: "900" },
  roleTextActive: { color: "#fff" },
  errorBox: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FFCDD5", borderRadius: 16, padding: 12, marginBottom: 18 },
  errorText: { color: "#B4233C", fontSize: 13.5, fontWeight: "800", lineHeight: 19 },
  formBlock: { gap: 13 },
  label: { color: INK, fontSize: 16, fontWeight: "900", marginTop: 4 },
  inputWrap: { minHeight: 66, borderRadius: 14, borderWidth: 1.3, borderColor: "#DADBE8", flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, backgroundColor: "#fff" },
  inputWrapFocused: { borderColor: PURPLE, shadowColor: PURPLE, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  input: { flex: 1, color: INK, fontSize: 17, fontWeight: "600", minHeight: 48 },
  eyeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 20 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 27, height: 27, borderRadius: 7, borderWidth: 1.5, borderColor: PURPLE, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: PURPLE },
  rememberText: { color: INK, fontSize: 15.5, fontWeight: "700" },
  forgotText: { color: PURPLE, fontSize: 15.5, fontWeight: "900" },
  signInButton: { height: 70, borderRadius: 15, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 110, shadowColor: PURPLE, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  signInButtonDisabled: { opacity: 0.55 },
  signInText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 32, marginBottom: 20 },
  divider: { flex: 1, height: 1, backgroundColor: "#DCDDEA" },
  dividerText: { color: "#8587A2", fontSize: 15, fontWeight: "700" },
  socialStack: { gap: 14 },
  socialButton: { minHeight: 58, borderRadius: 14, borderWidth: 1.3, borderColor: "#E1E2EC", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 13 },
  socialText: { color: "#071350", fontSize: 16, fontWeight: "900" },
  securityCard: { marginTop: 32, borderRadius: 16, backgroundColor: "#F3EDFF", padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  securityIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  securityTitle: { color: "#5B5C7D", fontSize: 15.5, fontWeight: "800", marginBottom: 5 },
  securityText: { color: "#787A99", fontSize: 14.5, fontWeight: "600" },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 36 },
  signupText: { color: "#747696", fontSize: 16, fontWeight: "700" },
  signupLink: { color: PURPLE, fontSize: 17, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,12,38,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  forgotCard: { width: "100%", maxWidth: 420, borderRadius: 24, backgroundColor: "#fff", padding: 24 },
  forgotTitle: { color: INK, fontSize: 24, fontWeight: "900", marginBottom: 10 },
  forgotCopy: { color: MUTED, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  forgotInputWrap: { minHeight: 60, borderRadius: 14, borderWidth: 1.3, borderColor: "#DADBE8", flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, marginBottom: 16 },
  modalButton: { height: 54, borderRadius: 14, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  modalGhost: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  modalGhostText: { color: PURPLE, fontSize: 15, fontWeight: "900" },
});
