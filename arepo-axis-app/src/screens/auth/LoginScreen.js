import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login, authError, suspensionMessage, clearSuspensionMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>ROUTE</Text>
      <Text style={styles.subtitle}>Arepo {"\u21C4"} Axis delivery</Text>

      {suspensionMessage && (
        <View style={styles.suspensionBox}>
          <Text style={styles.suspensionText}>{suspensionMessage}</Text>
          <Pressable onPress={clearSuspensionMessage}><Text style={styles.suspensionDismiss}>Dismiss</Text></Pressable>
        </View>
      )}

      <View style={{ marginTop: 32, gap: 12 }}>
        <TextInput
          value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry
          style={styles.input}
        />
        {authError && <Text style={styles.error}>{authError}</Text>}
        <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Log in</Text>}
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Register")} style={{ marginTop: 8 }}>
          <Text style={styles.link}>New here? Create an account</Text>
        </Pressable>
      </View>

      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>Demo accounts (password: password123)</Text>
        <Text style={styles.demoLine}>customer@demo.route · mamarisi@demo.route</Text>
        <Text style={styles.demoLine}>rider@demo.route · manager@demo.route · admin@demo.route</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.indigo, padding: 24, justifyContent: "center" },
  brand: { color: "#fff", fontWeight: "800", fontSize: 32, letterSpacing: 0.5, textAlign: "center" },
  subtitle: { color: COLORS.mango, fontSize: 13, letterSpacing: 1, fontWeight: "600", textAlign: "center", marginTop: 4 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  submitBtn: { backgroundColor: COLORS.mango, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  error: { color: "#FCA5A5", fontSize: 13, textAlign: "center" },
  link: { color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 13.5, fontWeight: "600" },
  demoBox: { marginTop: 40, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 16 },
  demoTitle: { color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 0.3, marginBottom: 6 },
  demoLine: { color: "rgba(255,255,255,0.5)", fontSize: 11.5, lineHeight: 18 },
  suspensionBox: {
    backgroundColor: "#4A1F1A", borderWidth: 1, borderColor: COLORS.chili, borderRadius: 12,
    padding: 12, marginTop: 20, gap: 6,
  },
  suspensionText: { color: "#FCA5A5", fontSize: 13, lineHeight: 19 },
  suspensionDismiss: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
});
