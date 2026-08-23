import React, { useEffect, useMemo, useState } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import { useOrders } from "../../context/OrdersContext";
import { WalletAPI } from "../../api/client";
import { fmtNaira } from "../../theme/colors";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#35109B";
const INK = "#11123A";
const MUTED = "#777991";
const LINE = "#ECE8F7";

function WalletAction({ icon, label, color, family = "MaterialCommunityIcons", onPress }) {
  const Icon = family === "Ionicons" ? Ionicons : family === "FontAwesome" ? FontAwesome : MaterialCommunityIcons;
  return (
    <Pressable style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="#fff" />
      </View>
      <Text numberOfLines={2} style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function CustomerWalletScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { orders = [] } = useOrders();
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [fundAmount, setFundAmount] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [funding, setFunding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [walletError, setWalletError] = useState("");
  const [billCategory, setBillCategory] = useState("AIRTIME");
  const [billAmount, setBillAmount] = useState("");
  const [billRecipient, setBillRecipient] = useState("");
  const [payingBill, setPayingBill] = useState(false);
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const pendingOrders = orders.filter((order) => order.paymentStatus !== "paid");
  const totalPaid = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const loadWallet = async () => {
    setLoadingWallet(true);
    try {
      const next = await WalletAPI.summary();
      setWallet(next || { balance: 0, transactions: [] });
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const startFunding = async () => {
    const amount = Number(fundAmount);
    setWalletError("");
    setWalletMessage("");
    if (!Number.isFinite(amount) || amount < 100) {
      setWalletError("Enter at least ₦100 to fund your wallet.");
      return;
    }
    setFunding(true);
    try {
      const res = await WalletAPI.initializeFunding(amount);
      setPendingReference(res.reference);
      setWalletMessage("Flutterwave checkout opened. After payment, tap Verify Payment.");
      await Linking.openURL(res.authorizationUrl);
      await loadWallet();
    } catch (err) {
      setWalletError(err.message || "Could not start wallet funding.");
    } finally {
      setFunding(false);
    }
  };

  const verifyFunding = async () => {
    if (!pendingReference) return;
    setVerifying(true);
    setWalletError("");
    try {
      const next = await WalletAPI.verifyFunding(pendingReference);
      setWallet({ balance: next.balance || 0, transactions: next.transactions || [] });
      setFundAmount("");
      setPendingReference("");
      setWalletMessage("Wallet balance updated.");
    } catch (err) {
      setWalletError(err.message || "Payment is still pending or could not be verified.");
    } finally {
      setVerifying(false);
    }
  };

  const payBill = async () => {
    const amount = Number(billAmount);
    setWalletError("");
    setWalletMessage("");
    if (!Number.isFinite(amount) || amount < 50) {
      setWalletError("Enter a valid bill amount.");
      return;
    }
    if (!billRecipient.trim()) {
      setWalletError("Enter the phone, meter, or customer number.");
      return;
    }
    setPayingBill(true);
    try {
      const res = await WalletAPI.payBill({ category: billCategory, amount, recipient: billRecipient.trim() });
      setWallet((current) => ({
        balance: res.balance ?? current.balance,
        transactions: [res.transaction, ...(current.transactions || [])].filter(Boolean),
      }));
      setBillAmount("");
      setBillRecipient("");
      setWalletMessage(`${billCategory.replace(/_/g, " ")} payment recorded.`);
    } catch (err) {
      setWalletError(err.message || "Bill payment failed.");
    } finally {
      setPayingBill(false);
    }
  };

  const walletActivity = useMemo(() => (
    (wallet.transactions || []).map((tx) => ({
      id: tx.id || tx.reference,
      title: tx.type === "FUNDING" ? "Wallet funding" : tx.category ? `${tx.category.replace(/_/g, " ")} payment` : "Wallet transaction",
      detail: `${tx.status || "PENDING"} · ${tx.reference}`,
      amount: tx.amount || 0,
      date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "Recent",
      createdAt: tx.createdAt,
      paid: tx.status === "SUCCESS",
      credit: tx.type === "FUNDING" || tx.type === "ADJUSTMENT",
      orderId: null,
    }))
  ), [wallet.transactions]);

  const orderActivity = useMemo(() => (
    orders
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((order) => ({
        id: order.id,
        title: order.vendor?.name || "Needly order",
        detail: `${order.items?.length || 0} item(s) · ${order.paymentStatus || "pending"} payment`,
        amount: order.total || 0,
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Recent",
        createdAt: order.createdAt,
        paid: order.paymentStatus === "paid",
        credit: false,
        orderId: order.id,
      }))
  ), [orders]);

  const recentActivity = useMemo(() => (
    [...walletActivity, ...orderActivity]
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8)
  ), [walletActivity, orderActivity]);

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]}
        >
          <View style={styles.header}>
            <Pressable style={styles.backCircle} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Needly Pay</Text>
              <Text style={styles.headerSub}>Fast, safe & secure</Text>
            </View>
            <Pressable style={styles.headerCircle} onPress={() => navigation.navigate("CustomerAccount")}>
              <Ionicons name="settings-outline" size={20} color={PURPLE} />
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{loadingWallet ? "..." : fmtNaira(wallet.balance || 0)}</Text>
              </View>
              <View style={styles.scanBadge}>
                <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
              </View>
            </View>
            <View style={styles.balanceStats}>
              <View>
                <Text style={styles.statLabel}>Paid orders</Text>
                <Text style={styles.statValue}>{paidOrders.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>{pendingOrders.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statLabel}>Spent</Text>
                <Text style={styles.statValueSmall}>{fmtNaira(totalPaid)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsCard}>
            <WalletAction icon="plus" label="Fund Wallet" color={PURPLE} family="FontAwesome" onPress={startFunding} />
            <WalletAction icon="send" label="Send Money" color="#0EA5E9" onPress={() => navigation.navigate("CustomerOrders")} />
            <WalletAction icon="file-document-outline" label="Pay Bills" color="#F97316" onPress={payBill} />
            <WalletAction icon="cellphone" label="Airtime & Data" color="#10B981" onPress={() => setBillCategory("AIRTIME")} />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Fund Wallet</Text>
              <Pressable onPress={loadWallet}><Text style={styles.panelLink}>Refresh</Text></Pressable>
            </View>
            <View style={styles.fundRow}>
              <TextInput
                value={fundAmount}
                onChangeText={(text) => setFundAmount(text.replace(/[^0-9]/g, ""))}
                placeholder="Amount in naira"
                placeholderTextColor="#9A9CB0"
                keyboardType="numeric"
                style={styles.fundInput}
              />
              <Pressable disabled={funding} onPress={startFunding} style={[styles.fundBtn, funding && styles.disabledBtn]}>
                {funding ? <ActivityIndicator color="#fff" /> : <Text style={styles.fundBtnText}>Flutterwave</Text>}
              </Pressable>
            </View>
            {pendingReference ? (
              <Pressable disabled={verifying} onPress={verifyFunding} style={styles.verifyBtn}>
                <Text style={styles.verifyBtnText}>{verifying ? "Verifying..." : "Verify Payment"}</Text>
              </Pressable>
            ) : null}
            {walletMessage ? <Text style={styles.successText}>{walletMessage}</Text> : null}
            {walletError ? <Text style={styles.errorText}>{walletError}</Text> : null}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Bills & Services</Text>
              <Text style={styles.panelHint}>Wallet debit</Text>
            </View>
            <View style={styles.categoryRow}>
              {["AIRTIME", "DATA", "ELECTRICITY", "WATER"].map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setBillCategory(category)}
                  style={[styles.categoryChip, billCategory === category && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, billCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={billRecipient}
              onChangeText={setBillRecipient}
              placeholder="Phone, meter, or customer number"
              placeholderTextColor="#9A9CB0"
              style={styles.billInput}
            />
            <TextInput
              value={billAmount}
              onChangeText={(text) => setBillAmount(text.replace(/[^0-9]/g, ""))}
              placeholder="Amount"
              placeholderTextColor="#9A9CB0"
              keyboardType="numeric"
              style={styles.billInput}
            />
            <Pressable disabled={payingBill} onPress={payBill} style={[styles.billBtn, payingBill && styles.disabledBtn]}>
              <Text style={styles.billBtnText}>{payingBill ? "Processing..." : "Pay from Wallet"}</Text>
            </Pressable>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Payment Methods</Text>
              <Pressable><Text style={styles.panelLink}>Add</Text></Pressable>
            </View>
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}><FontAwesome name="credit-card" size={18} color={PURPLE} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Flutterwave wallet funding</Text>
                <Text style={styles.methodSub}>Cards, bank transfer and mobile money</Text>
              </View>
              <Text style={styles.readyBadge}>Ready</Text>
            </View>
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}><Ionicons name="wallet-outline" size={20} color={PURPLE} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Needly wallet</Text>
                <Text style={styles.methodSub}>Bills and in-app payments from wallet balance</Text>
              </View>
              <Text style={styles.readyBadge}>Ready</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Recent Activity</Text>
              <Pressable onPress={() => navigation.navigate("CustomerOrders")}><Text style={styles.panelLink}>See all</Text></Pressable>
            </View>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="receipt-text-outline" size={30} color={PURPLE} />
                <Text style={styles.emptyTitle}>No wallet activity yet</Text>
                <Text style={styles.emptyText}>Payments for orders, bills and wallet actions will appear here.</Text>
              </View>
            ) : recentActivity.map((item) => (
              <Pressable key={item.id} style={styles.activityRow} onPress={() => item.orderId && navigation.navigate("Tracking", { orderId: item.orderId })}>
                <View style={[styles.activityIcon, item.paid && styles.activityIconPaid]}>
                  <Ionicons name={item.paid ? "checkmark" : "time-outline"} size={18} color={item.paid ? "#10B981" : "#F59E0B"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.activityTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.activitySub}>{item.detail}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.activityAmount, item.credit && { color: "#10B981" }]}>{item.credit ? "+" : "-"}{fmtNaira(item.amount)}</Text>
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="NeedlyPay" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ECE8F7", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#fff", overflow: "hidden" },
  content: { paddingTop: 14, paddingBottom: 124 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F7F3FF", alignItems: "center", justifyContent: "center" },
  backIcon: { color: PURPLE, fontSize: 31, lineHeight: 31, fontWeight: "800" },
  headerCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F7F3FF", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: INK, fontSize: 20, fontWeight: "900" },
  headerSub: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 2 },
  balanceCard: { minHeight: 190, borderRadius: 28, padding: 18, backgroundColor: PURPLE_DARK, overflow: "hidden", marginBottom: 14 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, fontWeight: "800" },
  balanceAmount: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 6 },
  scanBadge: { width: 62, height: 62, borderRadius: 22, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  balanceStats: { marginTop: 30, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontWeight: "800", marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  statValueSmall: { color: "#fff", fontSize: 13.5, fontWeight: "900" },
  statDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  actionsCard: { borderRadius: 22, padding: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, flexDirection: "row", justifyContent: "space-between", marginBottom: 14, shadowColor: "#1E164C", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  actionItem: { width: "24%", alignItems: "center", gap: 8 },
  actionIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: INK, fontSize: 11, lineHeight: 14, textAlign: "center", fontWeight: "900" },
  panel: { borderRadius: 22, padding: 15, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, marginBottom: 14 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelTitle: { color: INK, fontSize: 16, fontWeight: "900" },
  panelLink: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  panelHint: { color: MUTED, fontSize: 12, fontWeight: "800" },
  fundRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fundInput: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: "#DFD8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 13, color: INK, fontSize: 14, fontWeight: "800", outlineStyle: "none" },
  fundBtn: { minHeight: 48, borderRadius: 16, backgroundColor: PURPLE, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  fundBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
  verifyBtn: { marginTop: 10, minHeight: 44, borderRadius: 15, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD6FE" },
  verifyBtnText: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  disabledBtn: { opacity: 0.55 },
  successText: { color: "#059669", fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 9 },
  errorText: { color: "#DC2626", fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 9 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: "#E5DEF5", backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7 },
  categoryChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  categoryChipText: { color: MUTED, fontSize: 10.5, fontWeight: "900" },
  categoryChipTextActive: { color: "#FFFFFF" },
  billInput: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: "#DFD8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 13, color: INK, fontSize: 13.5, fontWeight: "800", marginBottom: 9, outlineStyle: "none" },
  billBtn: { minHeight: 46, borderRadius: 16, backgroundColor: PURPLE_DARK, alignItems: "center", justifyContent: "center" },
  billBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F4F0FB" },
  methodIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center" },
  methodTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  methodSub: { color: MUTED, fontSize: 11.5, marginTop: 2 },
  readyBadge: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#DCFCE7", color: "#078047", fontSize: 10, fontWeight: "900" },
  pendingBadge: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 10, fontWeight: "900" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F4F0FB" },
  activityIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  activityIconPaid: { backgroundColor: "#DCFCE7" },
  activityTitle: { color: INK, fontSize: 13.5, fontWeight: "900" },
  activitySub: { color: MUTED, fontSize: 11.5, marginTop: 2 },
  activityAmount: { color: INK, fontSize: 13, fontWeight: "900" },
  activityDate: { color: MUTED, fontSize: 10.5, marginTop: 2 },
  emptyBox: { alignItems: "center", paddingVertical: 18 },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: "900", marginTop: 8 },
  emptyText: { color: MUTED, fontSize: 12.5, textAlign: "center", lineHeight: 18, marginTop: 4 },
});
