import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { COLORS } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor (needs admin approval)" },
  { value: "RIDER", label: "Rider (needs admin approval)" },
];

export default function RegisterScreen({ navigation }) {
  const { register, authError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setSubmitting(true);
    const result = await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password, role });
    setSubmitting(false);
    if (result?.pendingApproval) setPendingMessage(result.message);
  };

  if (pendingMessage) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.brand}>Almost there</Text>
        <Text style={styles.pendingText}>{pendingMessage}</Text>
        <Pressable style={styles.submitBtn} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.submitBtnText}>Back to login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.indigo }} contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>Create account</Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Full name" style={styles.input} />
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} />

        <View style={styles.pickerWrap}>
          <Picker selectedValue={role} onValueChange={setRole}>
            {ROLES.map((r) => <Picker.Item key={r.value} label={r.label} value={r.value} />)}
          </Picker>
        </View>

        {authError && <Text style={styles.error}>{authError}</Text>}
        <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create account</Text>}
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: 8 }}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, justifyContent: "center" },
  brand: { color: "#fff", fontWeight: "800", fontSize: 24, textAlign: "center" },
  pendingText: { color: "rgba(255,255,255,0.85)", fontSize: 14.5, textAlign: "center", marginTop: 16, lineHeight: 21 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  pickerWrap: { backgroundColor: "#fff", borderRadius: 12 },
  submitBtn: { backgroundColor: COLORS.mango, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  error: { color: "#FCA5A5", fontSize: 13, textAlign: "center" },
  link: { color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 13.5, fontWeight: "600" },
});
