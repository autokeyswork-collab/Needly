import React, { useEffect, useMemo, useState } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import NeedlyLogo from "../../components/NeedlyLogo";
import { LOGIN_HERO_MARKET, LOGIN_HERO_SLIDES } from "../../data/customerAssets";
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
  const isNarrowPhone = width < 390;
  const isCompact = isNarrowPhone || height < 720;
  const mobileBrandHeight = Math.max(108, Math.min(164, height * 0.2));

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
  const [noticeMessage, setNoticeMessage] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroSlides = LOGIN_HERO_SLIDES?.length ? LOGIN_HERO_SLIDES : [{ key: "market", image: LOGIN_HERO_MARKET, location: "Abeokuta, Nigeria", title: "Support Local, Grow Local", text: "Shop quality products and services from trusted local sellers in Abeokuta." }];
  const heroSlide = heroSlides[heroIndex % heroSlides.length];

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const timer = setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const roleParam = (params.get("role") || "").toUpperCase();
    if (emailParam) setEmail(emailParam.trim().toLowerCase());
    if (["CUSTOMER", "VENDOR", "RIDER", "PROVIDER"].includes(roleParam)) {
      setAccountType(roleParam);
    } else if (roleParam === "MANAGER" || roleParam === "ADMIN") {
      setAccountType("PROVIDER");
    }
    if (params.get("onboarding") === "paid") {
      setAccountType("VENDOR");
      setNoticeMessage("Onboarding payment received. Your vendor account is waiting for Admin approval. We will email you when it is active.");
    } else if (params.get("pendingApproval") === "1") {
      setNoticeMessage("Your account is waiting for Admin approval. Please check your email for updates.");
    }
  }, []);

  const panelWidth = useMemo(() => {
    if (!isDesktop) return Math.min(width - 42, 360);
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
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {!isDesktop && (
        <>
          <Image source={heroSlide.image} style={styles.mobilePageImage} resizeMode="cover" />
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
              source={heroSlide.image}
              style={[styles.hero, styles.heroDesktop]}
              imageStyle={[styles.heroImage, styles.heroImageDesktop]}
              resizeMode="cover"
            >
              <Image source={heroSlide.image} style={styles.heroPhoto} resizeMode="cover" />
              <View style={styles.heroTopFade} />
              <View style={styles.heroBottomFade} />
              <View style={styles.heroBrand}>
                <NeedlyLogo size="large" theme="dark" variant="compact" showBadges={false} />
                <Text style={styles.heroTagline}>Everything you need,{"\n"}in one place.</Text>
              </View>
              <View style={styles.heroStory}>
                <View style={styles.locationChip}>
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.locationChipText}>{heroSlide.location}</Text>
                </View>
                <Text style={styles.storyTitle}>{heroSlide.title}</Text>
                <Text style={styles.storyText}>{heroSlide.text}</Text>
                <View style={styles.heroDots}>
                  {heroSlides.map((slide, index) => (
                    <Pressable
                      key={slide.key}
                      accessibilityLabel={`Show ${slide.title}`}
                      onPress={() => setHeroIndex(index)}
                      style={index === heroIndex ? styles.heroDotActive : styles.heroDot}
                    />
                  ))}
                </View>
              </View>
            </ImageBackground>
          ) : (
            <View style={[styles.mobileBrandBlock, { minHeight: mobileBrandHeight }]}>
              <View style={styles.mobileLogoMark}>
                <NeedlyLogo size="medium" theme="dark" variant="icon" showBadges={false} />
              </View>
              <View style={styles.mobileLocationChip}>
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.mobileLocationText}>{heroSlide.location}</Text>
              </View>
              <Text style={styles.mobileStoryTitle}>{heroSlide.title}</Text>
              <View style={styles.mobileHeroDots}>
                {heroSlides.map((slide, index) => (
                  <Pressable
                    key={slide.key}
                    accessibilityLabel={`Show ${slide.title}`}
                    onPress={() => setHeroIndex(index)}
                    style={index === heroIndex ? styles.mobileHeroDotActive : styles.mobileHeroDot}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={[styles.panel, { width: panelWidth }, isDesktop ? styles.panelDesktop : styles.panelMobile]}>
            <View style={styles.panelScrollProxy}>
              {isDesktop && (
                <View style={styles.langRow}>
                  <Pressable style={styles.langPill}>
                    <Ionicons name="globe-outline" size={20} color={INK} />
                    <Text style={styles.langText}>English</Text>
                    <Ionicons name="chevron-down" size={18} color={INK} />
                  </Pressable>
                </View>
              )}

              <View style={[styles.welcomeBlock, isCompact && styles.welcomeBlockCompact]}>
                <Text style={[styles.welcomeTitle, !isDesktop && styles.welcomeTitleMobile, isCompact && styles.welcomeTitleCompact]}>Welcome back! 👋</Text>
                <Text style={[styles.welcomeText, !isDesktop && styles.welcomeTextMobile, isCompact && styles.welcomeTextCompact]}>
                  Sign in to your Needly account and continue{" "}
                  <Text style={styles.purpleText}>shopping, booking</Text> and more.
                </Text>
              </View>

              <View style={[styles.roleSelector, !isDesktop && styles.roleSelectorMobile, isCompact && styles.roleSelectorCompact]}>
                {ACCOUNT_TYPES.map((item) => {
                  const active = accountType === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setAccountType(item.key)}
                      style={[styles.roleTab, isCompact && styles.roleTabCompact, active && styles.roleTabActive]}
                    >
                      <RoleIcon item={item} color={active ? "#fff" : INK} size={!isDesktop ? 18 : 25} />
                      <Text style={[styles.roleText, !isDesktop && styles.roleTextMobile, isCompact && styles.roleTextCompact, active && styles.roleTextActive]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {!!errorMessage && (
                <Pressable style={styles.errorBox} onPress={clearSuspensionMessage}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Pressable>
              )}

              {!!noticeMessage && (
                <Pressable style={styles.noticeBox} onPress={() => setNoticeMessage(null)}>
                  <Text style={styles.noticeText}>{noticeMessage}</Text>
                </Pressable>
              )}

              <View style={styles.formBlock}>
                <Text style={[styles.label, !isDesktop && styles.labelMobile]}>Email or Phone Number</Text>
                <View style={[styles.inputWrap, !isDesktop && styles.inputWrapMobile, isCompact && styles.inputWrapCompact, emailFocused && styles.inputWrapFocused]}>
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
                    style={[styles.input, !isDesktop && styles.inputMobile]}
                  />
                </View>

                <Text style={[styles.label, !isDesktop && styles.labelMobile]}>Password</Text>
                <View style={[styles.inputWrap, !isDesktop && styles.inputWrapMobile, isCompact && styles.inputWrapCompact, passwordFocused && styles.inputWrapFocused]}>
                  <FieldIcon name="lock" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#8B8EA8"
                    style={[styles.input, !isDesktop && styles.inputMobile]}
                  />
                  <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={25} color="#8B8EA8" />
                  </Pressable>
                </View>

                <View style={[styles.optionRow, !isDesktop && styles.optionRowMobile]}>
                  <Pressable style={styles.rememberRow} onPress={() => setRemember((prev) => !prev)}>
                    <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                      {remember && <FontAwesome name="check" size={15} color="#fff" />}
                    </View>
                    <Text style={[styles.rememberText, !isDesktop && styles.optionTextMobile]}>Remember me</Text>
                  </Pressable>
                  <Pressable onPress={() => setForgotModalVisible(true)}>
                    <Text style={[styles.forgotText, !isDesktop && styles.optionTextMobile]}>Forgot password?</Text>
                  </Pressable>
                </View>

                <Pressable
                  disabled={!email.trim() || !password || submitting}
                  onPress={submit}
                  style={[styles.signInButton, !isDesktop && styles.signInButtonMobile, isCompact && styles.signInButtonCompact, (!email.trim() || !password || submitting) && styles.signInButtonDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={[styles.signInText, !isDesktop && styles.signInTextMobile]}>Sign In</Text>
                      <FontAwesome name="arrow-right" size={!isDesktop ? 18 : 23} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>

              <View style={[styles.dividerRow, !isDesktop && styles.dividerRowMobile, isCompact && styles.dividerRowCompact]}>
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
                    accessibilityLabel={item.label}
                    disabled={!!socialLoading}
                    onPress={() => handleSocial(item.key)}
                    style={[styles.socialButton, !isDesktop && styles.socialButtonMobile, isCompact && styles.socialButtonCompact]}
                  >
                    {socialLoading === item.key ? (
                      <ActivityIndicator color={PURPLE} />
                    ) : (
                      <FontAwesome name={item.icon} size={!isDesktop ? 22 : 24} color={item.color} />
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={[styles.securityCard, !isDesktop && styles.securityCardMobile, isCompact && styles.securityCardCompact]}>
                <View style={[styles.securityIcon, !isDesktop && styles.securityIconMobile]}>
                  <Ionicons name="shield-checkmark-outline" size={!isDesktop ? 18 : 34} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.securityTitle, !isDesktop && styles.securityTitleMobile]}>Protected with Needly.</Text>
                  {isDesktop && <Text style={styles.securityText}>Fast, secure and reliable.</Text>}
                </View>
              </View>

              <View style={[styles.signupRow, isCompact && styles.signupRowCompact]}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8FC" },
  mobilePageImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  mobilePageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(23,10,63,0.34)" },
  scroll: { flex: 1 },
  content: { minHeight: "100%" },
  contentDesktop: { padding: 36, justifyContent: "center" },
  contentMobile: { padding: 10, paddingTop: 14, paddingBottom: 34 },
  layout: { width: "100%", alignSelf: "center" },
  layoutDesktop: { maxWidth: 1180, minHeight: 760, flexDirection: "row", justifyContent: "center", alignItems: "stretch" },
  layoutMobile: { maxWidth: 430, gap: 16, alignItems: "center" },
  mobileBrandBlock: { width: "100%", justifyContent: "flex-end", paddingHorizontal: 24, paddingBottom: 8 },
  mobileLogoMark: { width: 58, height: 58, alignItems: "center", justifyContent: "center" },
  mobileLocationChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, marginTop: 12 },
  mobileLocationText: { color: "#fff", fontSize: 13.5, fontWeight: "900" },
  mobileStoryTitle: { color: "#fff", fontSize: 16, lineHeight: 21, fontWeight: "900", marginTop: 10 },
  mobileHeroDots: { flexDirection: "row", gap: 7, marginTop: 10 },
  mobileHeroDotActive: { width: 17, height: 6, borderRadius: 6, backgroundColor: "#FFFFFF" },
  mobileHeroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  hero: { overflow: "hidden", backgroundColor: PURPLE_DARK },
  heroDesktop: { width: "42%", minHeight: 760, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  heroMobile: { height: 300, borderRadius: 24 },
  heroMobileCompact: { height: 210, borderRadius: 22 },
  heroImage: { width: "100%", height: "100%" },
  heroPhoto: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroImageDesktop: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  heroImageMobile: { borderRadius: 24 },
  heroTopFade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.02)" },
  heroBottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(36,16,95,0.72)" },
  heroBrand: { position: "absolute", top: 76, left: 42, right: 28, flexDirection: "row", alignItems: "center", gap: 18 },
  heroBrandMobile: { top: 18, left: 18, transform: [{ scale: 0.68 }] },
  heroBrandMobileCompact: { top: 14, left: 14, transform: [{ scale: 0.56 }] },
  heroTagline: { flexShrink: 1, color: ORANGE, fontSize: 18, lineHeight: 25, fontWeight: "800" },
  heroStory: { position: "absolute", left: 52, right: 42, bottom: 42 },
  heroStoryCompact: { left: 20, right: 20, bottom: 18 },
  locationChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 17, paddingVertical: 12, borderRadius: 13, marginBottom: 20 },
  locationChipText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  storyTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 10 },
  storyText: { color: "#fff", fontSize: 18, lineHeight: 28, fontWeight: "600", maxWidth: 360 },
  heroDots: { flexDirection: "row", gap: 12, marginTop: 18 },
  heroDotActive: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#fff" },
  heroDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.35)" },
  panel: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E7E8F1", shadowColor: "#17113A", shadowOpacity: 0.08, shadowRadius: 28, shadowOffset: { width: 0, height: 18 } },
  panelDesktop: { minHeight: 760, borderRadius: 28, marginLeft: 0, paddingHorizontal: 48, paddingVertical: 34 },
  panelMobile: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.91)", marginBottom: 16 },
  panelScrollProxy: { flex: 1 },
  langRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  langPill: { marginLeft: "auto", minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "#E6E7EF", backgroundColor: "#fff", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, shadowColor: "#17113A", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  langText: { color: INK, fontSize: 12.5, fontWeight: "900" },
  welcomeBlock: { marginTop: 48, marginBottom: 28 },
  welcomeBlockCompact: { marginTop: 2, marginBottom: 12 },
  welcomeTitle: { color: INK, fontSize: 40, lineHeight: 48, fontWeight: "900" },
  welcomeTitleMobile: { fontSize: 22, lineHeight: 27 },
  welcomeTitleCompact: { fontSize: 22, lineHeight: 27 },
  welcomeText: { marginTop: 18, color: MUTED, fontSize: 24, lineHeight: 34, fontWeight: "500" },
  welcomeTextMobile: { marginTop: 7, fontSize: 13.5, lineHeight: 20 },
  welcomeTextCompact: { fontSize: 13.5, lineHeight: 20, marginTop: 7 },
  purpleText: { color: PURPLE, fontWeight: "900" },
  roleSelector: { minHeight: 104, borderRadius: 16, borderWidth: 1.3, borderColor: "#DADBE8", flexDirection: "row", overflow: "hidden", marginBottom: 30 },
  roleSelectorMobile: { minHeight: 58, marginBottom: 14, borderRadius: 13 },
  roleSelectorCompact: { minHeight: 58, marginBottom: 14, borderRadius: 13 },
  roleTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, borderRightWidth: 1, borderRightColor: "#E6E7EF", backgroundColor: "#fff" },
  roleTabCompact: { gap: 5, paddingHorizontal: 2 },
  roleTabActive: { backgroundColor: PURPLE },
  roleText: { color: INK, fontSize: 15, fontWeight: "900" },
  roleTextMobile: { fontSize: 10.5 },
  roleTextCompact: { fontSize: 10.5 },
  roleTextActive: { color: "#fff" },
  errorBox: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FFCDD5", borderRadius: 16, padding: 12, marginBottom: 18 },
  errorText: { color: "#B4233C", fontSize: 13.5, fontWeight: "800", lineHeight: 19 },
  noticeBox: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 16, padding: 12, marginBottom: 18 },
  noticeText: { color: "#047857", fontSize: 13.5, fontWeight: "800", lineHeight: 19 },
  formBlock: { gap: 9 },
  label: { color: INK, fontSize: 16, fontWeight: "900", marginTop: 4 },
  labelMobile: { fontSize: 12.5 },
  inputWrap: { minHeight: 66, borderRadius: 14, borderWidth: 1.3, borderColor: "#DADBE8", flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, backgroundColor: "#fff" },
  inputWrapMobile: { minHeight: 46, borderRadius: 12, gap: 10, paddingHorizontal: 13 },
  inputWrapCompact: { minHeight: 46, gap: 10, paddingHorizontal: 13 },
  inputWrapFocused: { borderColor: PURPLE, shadowColor: PURPLE, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  input: { flex: 1, color: INK, fontSize: 17, fontWeight: "600", minHeight: 48 },
  inputMobile: { fontSize: 13, minHeight: 38 },
  eyeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 20 },
  optionRowMobile: { marginTop: 2, marginBottom: 10 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: PURPLE, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: PURPLE },
  rememberText: { color: INK, fontSize: 15.5, fontWeight: "700" },
  forgotText: { color: PURPLE, fontSize: 15.5, fontWeight: "900" },
  optionTextMobile: { fontSize: 11.5 },
  signInButton: { height: 70, borderRadius: 15, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 110, shadowColor: PURPLE, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  signInButtonMobile: { height: 46, borderRadius: 13, gap: 46 },
  signInButtonCompact: { height: 46, gap: 46 },
  signInButtonDisabled: { opacity: 0.55 },
  signInText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  signInTextMobile: { fontSize: 14.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 32, marginBottom: 20 },
  dividerRowMobile: { marginTop: 14, marginBottom: 10 },
  dividerRowCompact: { gap: 10, marginTop: 14, marginBottom: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "#DCDDEA" },
  dividerText: { color: "#8587A2", fontSize: 12.5, fontWeight: "700" },
  socialStack: { gap: 12, flexDirection: "row", justifyContent: "center" },
  socialButton: { minHeight: 58, borderRadius: 14, borderWidth: 1.3, borderColor: "#E1E2EC", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 13 },
  socialButtonMobile: { width: 48, height: 44, minHeight: 44, borderRadius: 14, paddingHorizontal: 0 },
  socialButtonCompact: { minHeight: 44 },
  securityCard: { marginTop: 32, borderRadius: 16, backgroundColor: "#F3EDFF", padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  securityCardMobile: { marginTop: 10, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10, gap: 6 },
  securityCardCompact: { marginTop: 10, paddingVertical: 7, paddingHorizontal: 10, gap: 6 },
  securityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  securityIconMobile: { width: 24, height: 24, borderRadius: 12 },
  securityTitle: { color: "#5B5C7D", fontSize: 12.5, fontWeight: "800", marginBottom: 3 },
  securityTitleMobile: { fontSize: 10.5, marginBottom: 0 },
  securityText: { color: "#787A99", fontSize: 11.5, fontWeight: "600" },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 36 },
  signupRowCompact: { marginTop: 14, flexWrap: "wrap" },
  signupText: { color: "#747696", fontSize: 12.5, fontWeight: "700" },
  signupLink: { color: PURPLE, fontSize: 13, fontWeight: "900" },
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
