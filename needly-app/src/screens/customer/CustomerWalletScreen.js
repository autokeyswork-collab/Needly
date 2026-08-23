import React, { useEffect, useMemo, useState } from "react";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import CustomerBottomNav from "../../components/CustomerBottomNav";
import NeedlyLogo from "../../components/NeedlyLogo";
import { useOrders } from "../../context/OrdersContext";
import { WalletAPI } from "../../api/client";
import { fmtNaira } from "../../theme/colors";

const PURPLE = "#642BE4";
const PURPLE_DARK = "#35109B";
const PURPLE_DEEP = "#25006F";
const INK = "#11123A";
const MUTED = "#72759A";
const LINE = "#ECE8F7";
const GREEN = "#10B981";
const ORANGE = "#FF9F1A";
const BLUE = "#2F80ED";
const PINK = "#E82F8A";

function formatWalletAmount(amount) {
  return fmtNaira(Number(amount || 0)).replace(/\.00$/, ".00");
}

function formatWhen(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) + `, ${time}`;
}

function WalletAction({ icon, label, color, family = "MaterialCommunityIcons", onPress, last = false, iconColor = "#fff" }) {
  const Icon = family === "Ionicons" ? Ionicons : family === "FontAwesome" ? FontAwesome : MaterialCommunityIcons;
  return (
    <Pressable style={[styles.actionItem, last && styles.actionItemLast]} onPress={onPress}>
      <View style={[styles.actionCircle, { backgroundColor: color }]}>
        <Icon name={icon} size={27} color={iconColor} />
      </View>
      <Text numberOfLines={2} style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function QuickService({ icon, label, color, bg, family = "MaterialCommunityIcons", onPress }) {
  const Icon = family === "Ionicons" ? Ionicons : family === "FontAwesome" ? FontAwesome : MaterialCommunityIcons;
  return (
    <Pressable style={styles.serviceItem} onPress={onPress}>
      <View style={[styles.serviceCircle, { backgroundColor: bg }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text numberOfLines={2} style={styles.serviceLabel}>{label}</Text>
    </Pressable>
  );
}

function WalletIllustration() {
  return (
    <View style={styles.walletArt}>
      <View style={[styles.cash, styles.cashOne]}><Text style={styles.cashText}>1000</Text></View>
      <View style={[styles.cash, styles.cashTwo]}><Text style={styles.cashText}>500</Text></View>
      <View style={styles.purse}>
        <View style={styles.purseBadge}><Text style={styles.purseBadgeText}>N</Text></View>
        <View style={styles.purseButton} />
      </View>
    </View>
  );
}

function TransactionRow({ item }) {
  const isCredit = item.credit;
  return (
    <Pressable style={styles.transactionRow} onPress={item.orderId ? item.onPress : undefined}>
      <View style={[styles.transactionIcon, { backgroundColor: item.bg }]}>
        <MaterialCommunityIcons name={item.icon} size={25} color={item.color} />
      </View>
      <View style={styles.transactionCopy}>
        <Text numberOfLines={1} style={styles.transactionTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.transactionDate}>{item.date}</Text>
      </View>
      <Text style={[styles.transactionAmount, isCredit && styles.transactionAmountCredit]}>
        {isCredit ? "+" : "-"} {formatWalletAmount(item.amount)}
      </Text>
    </Pressable>
  );
}

export default function CustomerWalletScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { orders = [] } = useOrders();
  const [wallet, setWallet] = useState({ balance: 0, available: 0, pendingDebitAmount: 0, transactions: [] });
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [activeTool, setActiveTool] = useState("fund");
  const [fundAmount, setFundAmount] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [funding, setFunding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [walletError, setWalletError] = useState("");
  const [billCategory, setBillCategory] = useState("AIRTIME");
  const [billAmount, setBillAmount] = useState("");
  const [billRecipient, setBillRecipient] = useState("");
  const [payingBill, setPayingBill] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [sendingTransfer, setSendingTransfer] = useState(false);
  const shellWidth = Math.min(width, 430);
  const sidePad = shellWidth < 370 ? 14 : 18;
  const cardCompact = shellWidth < 380;
  const walletBalance = wallet.available ?? wallet.balance ?? 0;
  const now = new Date();
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");

  const loadWallet = async () => {
    setLoadingWallet(true);
    try {
      const next = await WalletAPI.summary();
      setWallet(next || { balance: 0, available: 0, pendingDebitAmount: 0, transactions: [] });
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    const reference = route?.params?.returnReference;
    if (!reference) return;
    let mounted = true;
    setPendingReference(reference);
    setCheckoutUrl("");
    setWalletMessage("Confirming your Flutterwave payment...");
    setVerifying(true);
    WalletAPI.verifyFunding(reference)
      .then((next) => {
        if (!mounted) return;
        setWallet(next || { balance: 0, transactions: [] });
        setPendingReference("");
        setWalletMessage("Payment successful. Your wallet balance has been updated.");
      })
      .catch((err) => {
        if (!mounted) return;
        setWalletError(err.message || "Payment is still pending. Tap Verify Payment in a moment.");
      })
      .finally(() => {
        if (!mounted) return;
        setVerifying(false);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.history.replaceState({}, "", window.location.pathname || "/");
        }
      });
    return () => {
      mounted = false;
    };
  }, [route?.params?.returnReference]);

  const clearStatus = () => {
    setWalletError("");
    setWalletMessage("");
  };

  const startFunding = async () => {
    const amount = Number(fundAmount);
    clearStatus();
    if (!Number.isFinite(amount) || amount < 100) {
      setWalletError("Enter at least ₦100 to fund your wallet.");
      return;
    }
    setFunding(true);
    try {
      const res = await WalletAPI.initializeFunding(amount);
      setPendingReference(res.reference);
      setCheckoutUrl(res.authorizationUrl || "");
      setWalletMessage("Flutterwave checkout is ready. Complete payment, then tap Verify Payment.");
      if (res.authorizationUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const opened = window.open(res.authorizationUrl, "_blank", "noopener,noreferrer");
          if (!opened) setWalletMessage("Tap Continue to Flutterwave to complete your payment, then return and tap Verify Payment.");
        } else {
          await Linking.openURL(res.authorizationUrl);
        }
      }
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
      setWallet(next || { balance: 0, transactions: [] });
      setFundAmount("");
      setPendingReference("");
      setCheckoutUrl("");
      setWalletMessage("Wallet balance updated.");
    } catch (err) {
      setWalletError(err.message || "Payment is still pending or could not be verified.");
    } finally {
      setVerifying(false);
    }
  };

  const payBill = async () => {
    const amount = Number(billAmount);
    clearStatus();
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
        ...current,
        balance: res.balance ?? current.balance,
        available: res.balance ?? current.available,
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

  const sendWalletTransfer = async () => {
    const amount = Number(transferAmount);
    clearStatus();
    if (!transferRecipient.trim()) {
      setWalletError("Enter the vendor, rider, admin, or customer email/phone.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 50) {
      setWalletError("Enter at least ₦50 to send.");
      return;
    }
    setSendingTransfer(true);
    try {
      const next = await WalletAPI.transfer({ recipient: transferRecipient.trim(), amount, note: "Needly wallet transfer" });
      setWallet(next || wallet);
      setTransferRecipient("");
      setTransferAmount("");
      setWalletMessage("Wallet transfer completed.");
    } catch (err) {
      setWalletError(err.message || "Wallet transfer failed.");
    } finally {
      setSendingTransfer(false);
    }
  };

  const walletActivity = useMemo(() => (
    (wallet.transactions || []).map((tx) => {
      const credit = ["FUNDING", "ADJUSTMENT", "ORDER_PAYMENT", "RIDER_EARNING", "COMPANY_FEE", "TRANSFER_IN"].includes(tx.type);
      const category = String(tx.category || tx.type || "").toUpperCase();
      const isBill = category.includes("AIRTIME") || category.includes("DATA") || category.includes("ELECTRICITY");
      return {
        id: tx.id || tx.reference,
        title: tx.description || (tx.type === "FUNDING" ? "Wallet funding" : tx.category ? tx.category.replace(/_/g, " ") : "Wallet transaction"),
        detail: `${tx.status || "PENDING"} · ${tx.reference}`,
        amount: tx.amount || 0,
        date: formatWhen(tx.createdAt),
        createdAt: tx.createdAt,
        paid: tx.status === "SUCCESS",
        credit,
        orderId: null,
        icon: credit ? "cash-plus" : isBill ? "lightning-bolt" : "cart-outline",
        color: credit ? GREEN : isBill ? ORANGE : "#16A34A",
        bg: credit ? "#DDFBEF" : isBill ? "#FFF3DF" : "#DCFCE7",
      };
    })
  ), [wallet.transactions]);

  const orderActivity = useMemo(() => (
    orders
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        title: `Payment to ${order.vendor?.name || "Needly vendor"}`,
        detail: `${order.items?.length || 0} item(s) · ${order.paymentStatus || "pending"} payment`,
        amount: order.total || 0,
        date: formatWhen(order.createdAt),
        createdAt: order.createdAt,
        paid: order.paymentStatus === "paid",
        credit: false,
        orderId: order.id,
        icon: "cart-outline",
        color: "#16A34A",
        bg: "#DCFCE7",
        onPress: () => navigation.navigate("Tracking", { orderId: order.id }),
      }))
  ), [orders, navigation]);

  const recentActivity = useMemo(() => (
    [...walletActivity, ...orderActivity]
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
  ), [walletActivity, orderActivity]);

  const openTool = (tool) => {
    setActiveTool(tool);
    clearStatus();
    if (tool === "bills") setBillCategory("ELECTRICITY");
    if (tool === "airtime") setBillCategory("AIRTIME");
  };

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth: 430 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topHeader}>
            <View style={styles.statusRow}>
              <Text style={styles.statusTime}>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
              <View style={styles.statusIcons}>
                <Ionicons name="cellular" size={18} color="#fff" />
                <Ionicons name="wifi" size={18} color="#fff" />
                <Ionicons name="battery-full" size={22} color="#fff" />
              </View>
            </View>

            <View style={styles.headerRow}>
              <Pressable style={styles.headerCircle} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={25} color="#fff" />
              </Pressable>
              <View style={styles.logoWrap}>
                <NeedlyLogo size="medium" theme="light" variant="compact" showBadges={false} />
                <Text style={styles.logoTagline}>Everything you need, in one place.</Text>
              </View>
              <Pressable style={styles.headerCircle} onPress={() => navigation.navigate("CustomerNotifications")}>
                <Ionicons name="notifications-outline" size={25} color="#fff" />
                <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>3</Text></View>
              </Pressable>
            </View>
          </View>

          <View style={[styles.inner, { paddingHorizontal: sidePad }]}>
            <View style={[styles.walletHero, cardCompact && styles.walletHeroCompact]}>
              <View style={styles.heroLeft}>
                <View style={styles.walletTitleRow}>
                  <Text style={styles.walletTitle}>Needly Wallet</Text>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="shield-checkmark" size={13} color="#fff" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={styles.balanceLine}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balanceAmount}>
                    {loadingWallet ? "..." : formatWalletAmount(walletBalance)}
                  </Text>
                  <View style={styles.eyeButton}><Ionicons name="eye" size={20} color="#fff" /></View>
                </View>
                <Text style={styles.walletHeroSub}>Pay, send, receive and enjoy more with Needly Pay</Text>
              </View>
              <WalletIllustration />
              <View style={styles.heroMiniCards}>
                <Pressable style={styles.heroMiniCard}>
                  <MaterialCommunityIcons name="gift-outline" size={27} color="#fff" />
                  <View>
                    <Text style={styles.heroMiniLabel}>Rewards</Text>
                    <Text style={styles.heroMiniValue}>{Math.max(0, paidOrders.length * 250)} Points</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Pressable>
                <Pressable style={styles.heroMiniCard}>
                  <MaterialCommunityIcons name="history" size={29} color="#fff" />
                  <View>
                    <Text style={styles.heroMiniLabel}>Transaction History</Text>
                    <Text style={styles.heroMiniValue}>View All</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.actionsCard}>
              <WalletAction icon="plus" label="Fund Wallet" color={PURPLE} family="FontAwesome" onPress={() => openTool("fund")} />
              <WalletAction icon="send" label="Send Money" color="#EEE7FF" iconColor={PURPLE} onPress={() => openTool("send")} />
              <WalletAction icon="qrcode-scan" label="Scan & Pay" color="#EEE7FF" iconColor={PURPLE} onPress={() => openTool("scan")} />
              <WalletAction icon="bank" label="Withdraw" color="#EEE7FF" iconColor={PURPLE} onPress={() => openTool("withdraw")} last />
            </View>

            <View style={styles.toolPanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>
                  {activeTool === "fund" ? "Fund Wallet" : activeTool === "send" ? "Send Money" : activeTool === "withdraw" ? "Withdraw" : "Scan & Pay"}
                </Text>
                <Pressable onPress={loadWallet}><Text style={styles.panelLink}>Refresh</Text></Pressable>
              </View>

              {activeTool === "fund" && (
                <>
                  <View style={styles.quickAmountRow}>
                    {[1000, 5000, 10000].map((amount) => (
                      <Pressable
                        key={amount}
                        onPress={() => setFundAmount(String(amount))}
                        style={[styles.quickAmountChip, Number(fundAmount) === amount && styles.quickAmountChipActive]}
                      >
                        <Text style={[styles.quickAmountText, Number(fundAmount) === amount && styles.quickAmountTextActive]}>
                          {fmtNaira(amount)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.inlineFormRow}>
                    <TextInput
                      value={fundAmount}
                      onChangeText={(text) => setFundAmount(text.replace(/[^0-9]/g, ""))}
                      placeholder="Amount in naira"
                      placeholderTextColor="#9A9CB0"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <Pressable disabled={funding} onPress={startFunding} style={[styles.primarySmallBtn, funding && styles.disabledBtn]}>
                      {funding ? <ActivityIndicator color="#fff" /> : <Text style={styles.primarySmallBtnText}>Add Money</Text>}
                    </Pressable>
                  </View>
                  <Text style={styles.fundingHint}>Payment opens securely with Flutterwave. Your balance updates after successful payment.</Text>
                  {pendingReference ? (
                    <View style={styles.checkoutActions}>
                      {!!checkoutUrl && (
                        <Pressable onPress={() => Linking.openURL(checkoutUrl)} style={styles.continueCheckoutBtn}>
                          <Text style={styles.continueCheckoutText}>Continue to Flutterwave</Text>
                        </Pressable>
                      )}
                      <Pressable disabled={verifying} onPress={verifyFunding} style={styles.verifyBtn}>
                        <Text style={styles.verifyBtnText}>{verifying ? "Verifying..." : "Verify Payment"}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              )}

              {activeTool === "send" && (
                <>
                  <TextInput value={transferRecipient} onChangeText={setTransferRecipient} placeholder="Recipient email or phone" placeholderTextColor="#9A9CB0" style={styles.fullInput} />
                  <View style={styles.inlineFormRow}>
                    <TextInput value={transferAmount} onChangeText={(text) => setTransferAmount(text.replace(/[^0-9]/g, ""))} placeholder="Amount" placeholderTextColor="#9A9CB0" keyboardType="numeric" style={styles.input} />
                    <Pressable disabled={sendingTransfer} onPress={sendWalletTransfer} style={[styles.primarySmallBtn, sendingTransfer && styles.disabledBtn]}>
                      <Text style={styles.primarySmallBtnText}>{sendingTransfer ? "Sending..." : "Send"}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {activeTool === "scan" && (
                <View style={styles.scanPlaceholder}>
                  <MaterialCommunityIcons name="qrcode-scan" size={34} color={PURPLE} />
                  <Text style={styles.scanTitle}>Scan & Pay</Text>
                  <Text style={styles.scanText}>Vendor QR payments will connect here. You can send by email or phone for now.</Text>
                </View>
              )}

              {activeTool === "withdraw" && (
                <View style={styles.scanPlaceholder}>
                  <MaterialCommunityIcons name="bank-transfer-out" size={34} color={PURPLE} />
                  <Text style={styles.scanTitle}>Withdrawal</Text>
                  <Text style={styles.scanText}>Customer withdrawals will use verified bank details from your account profile.</Text>
                </View>
              )}

              {walletMessage ? <Text style={styles.successText}>{walletMessage}</Text> : null}
              {walletError ? <Text style={styles.errorText}>{walletError}</Text> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Services</Text>
                <Pressable><Text style={styles.seeAllText}>See all ›</Text></Pressable>
              </View>
              <View style={styles.servicesGrid}>
                <QuickService icon="lightning-bolt" label="Pay Bills" color={ORANGE} bg="#FFF3DF" onPress={() => openTool("bills")} />
                <QuickService icon="cellphone" label="Airtime & Data" color={BLUE} bg="#EAF3FF" onPress={() => openTool("airtime")} />
                <QuickService icon="television-classic" label="TV Subscription" color={PINK} bg="#FFE8F4" onPress={() => { openTool("bills"); setBillCategory("TV"); }} />
                <QuickService icon="soccer" label="Betting" color="#11A86A" bg="#E5FAEF" onPress={() => { openTool("bills"); setBillCategory("INTERNET"); }} />
                <QuickService icon="school" label="School Fees" color={PURPLE} bg="#F0E9FF" onPress={() => { openTool("bills"); setBillCategory("WATER"); }} />
              </View>

              {(activeTool === "bills" || activeTool === "airtime") && (
                <View style={styles.billBox}>
                  <View style={styles.categoryRow}>
                    {["AIRTIME", "DATA", "ELECTRICITY", "TV"].map((category) => (
                      <Pressable key={category} onPress={() => setBillCategory(category)} style={[styles.categoryChip, billCategory === category && styles.categoryChipActive]}>
                        <Text style={[styles.categoryChipText, billCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput value={billRecipient} onChangeText={setBillRecipient} placeholder="Phone, meter, or customer number" placeholderTextColor="#9A9CB0" style={styles.fullInput} />
                  <View style={styles.inlineFormRow}>
                    <TextInput value={billAmount} onChangeText={(text) => setBillAmount(text.replace(/[^0-9]/g, ""))} placeholder="Amount" placeholderTextColor="#9A9CB0" keyboardType="numeric" style={styles.input} />
                    <Pressable disabled={payingBill} onPress={payBill} style={[styles.primarySmallBtn, payingBill && styles.disabledBtn]}>
                      <Text style={styles.primarySmallBtnText}>{payingBill ? "Paying..." : "Pay"}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <Pressable onPress={() => navigation.navigate("CustomerOrders")}><Text style={styles.seeAllText}>See all ›</Text></Pressable>
              </View>
              {recentActivity.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="receipt-text-outline" size={30} color={PURPLE} />
                  <Text style={styles.emptyTitle}>No transactions yet</Text>
                  <Text style={styles.emptyText}>Wallet funding, transfers and bills will appear here.</Text>
                </View>
              ) : recentActivity.map((item) => (
                <TransactionRow key={item.id} item={item} />
              ))}
            </View>

            <View style={styles.cashlessBanner}>
              <View style={styles.coinStack}>
                <View style={styles.coin} />
                <View style={[styles.coin, { marginTop: -10, marginLeft: 10 }]} />
                <View style={[styles.coin, { marginTop: -10, marginLeft: 20 }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cashlessTitle}>Go Cashless with Needly Pay</Text>
                <Text style={styles.cashlessSub}>Fast. Easy. Secure.</Text>
              </View>
              <Pressable style={styles.yellowBtn} onPress={() => openTool("fund")}>
                <Text style={styles.yellowBtnText}>Fund Wallet</Text>
                <Ionicons name="arrow-forward" size={18} color={INK} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
        <CustomerBottomNav navigation={navigation} active="NeedlyPay" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F7F5FF", alignItems: "center" },
  shell: { flex: 1, width: "100%", backgroundColor: "#FFFFFF", overflow: "hidden" },
  content: { paddingBottom: 124 },
  topHeader: { backgroundColor: PURPLE, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 54 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusTime: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  statusIcons: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  logoWrap: { alignItems: "center", flex: 1, minWidth: 0 },
  logoTagline: { marginTop: -2, color: "rgba(255,255,255,0.88)", fontSize: 12.5, fontWeight: "700" },
  notificationBadge: { position: "absolute", top: -3, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#FF3657", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  inner: { marginTop: -28 },
  walletHero: { minHeight: 255, borderRadius: 22, backgroundColor: PURPLE_DEEP, padding: 20, marginBottom: 14, overflow: "hidden", shadowColor: PURPLE, shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  walletHeroCompact: { padding: 16 },
  heroLeft: { maxWidth: "72%", zIndex: 2 },
  walletTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  walletTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(74,222,128,0.32)", paddingHorizontal: 8, paddingVertical: 5 },
  verifiedText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  balanceLabel: { color: "rgba(255,255,255,0.86)", fontSize: 14, fontWeight: "700" },
  balanceLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  balanceAmount: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", maxWidth: 205 },
  eyeButton: { width: 42, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  walletHeroSub: { color: "rgba(255,255,255,0.88)", fontSize: 13.5, fontWeight: "700", lineHeight: 19, marginTop: 8 },
  walletArt: { position: "absolute", right: 10, top: 28, width: 128, height: 116 },
  cash: { position: "absolute", width: 64, height: 38, borderRadius: 8, backgroundColor: "#F7E1B0", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] },
  cashOne: { right: 42, top: 0 },
  cashTwo: { right: 15, top: 9, transform: [{ rotate: "10deg" }] },
  cashText: { color: "#9A5A10", fontSize: 9, fontWeight: "900" },
  purse: { position: "absolute", right: 8, bottom: 0, width: 110, height: 75, borderRadius: 17, backgroundColor: "#7436F3", borderWidth: 2, borderColor: "rgba(255,255,255,0.18)", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  purseBadge: { position: "absolute", left: 28, top: 21, width: 37, height: 37, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  purseBadgeText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", fontStyle: "italic" },
  purseButton: { position: "absolute", right: -8, top: 29, width: 32, height: 24, borderRadius: 12, backgroundColor: "#5925D6", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  heroMiniCards: { position: "absolute", left: 18, right: 18, bottom: 18, flexDirection: "row", gap: 10 },
  heroMiniCard: { flex: 1, minHeight: 68, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  heroMiniLabel: { color: "rgba(255,255,255,0.82)", fontSize: 12.5, fontWeight: "700" },
  heroMiniValue: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "900", marginTop: 2 },
  actionsCard: { borderRadius: 22, paddingVertical: 18, paddingHorizontal: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE, flexDirection: "row", justifyContent: "space-between", marginBottom: 14, shadowColor: "#1E164C", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  actionItem: { width: "24%", alignItems: "center", gap: 9, borderRightWidth: 1, borderRightColor: "#E8E3F5" },
  actionItemLast: { borderRightWidth: 0 },
  actionCircle: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: INK, fontSize: 12.5, lineHeight: 15, textAlign: "center", fontWeight: "900" },
  toolPanel: { borderRadius: 22, padding: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE, marginBottom: 14 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelTitle: { color: INK, fontSize: 16, fontWeight: "900" },
  panelLink: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  quickAmountRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  quickAmountChip: { flex: 1, minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: "#E5DEF5", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  quickAmountChipActive: { backgroundColor: "#F4EDFF", borderColor: PURPLE },
  quickAmountText: { color: INK, fontSize: 12.5, fontWeight: "900" },
  quickAmountTextActive: { color: PURPLE },
  inlineFormRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  input: { flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: "#DFD8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 13, color: INK, fontSize: 13.5, fontWeight: "800", outlineStyle: "none" },
  fullInput: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: "#DFD8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 13, color: INK, fontSize: 13.5, fontWeight: "800", marginBottom: 9, outlineStyle: "none" },
  primarySmallBtn: { minHeight: 46, borderRadius: 15, backgroundColor: PURPLE, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  primarySmallBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
  fundingHint: { color: MUTED, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 8 },
  checkoutActions: { gap: 9, marginTop: 10 },
  continueCheckoutBtn: { minHeight: 46, borderRadius: 15, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  continueCheckoutText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  verifyBtn: { minHeight: 44, borderRadius: 15, backgroundColor: "#F4EDFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD6FE" },
  verifyBtnText: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  disabledBtn: { opacity: 0.55 },
  successText: { color: "#059669", fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 9 },
  errorText: { color: "#DC2626", fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 9 },
  scanPlaceholder: { alignItems: "center", borderRadius: 18, backgroundColor: "#F7F3FF", padding: 16 },
  scanTitle: { color: INK, fontSize: 14.5, fontWeight: "900", marginTop: 6 },
  scanText: { color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 17, marginTop: 3 },
  card: { borderRadius: 22, padding: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE, marginBottom: 14, shadowColor: "#1E164C", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { color: INK, fontSize: 18, fontWeight: "900" },
  seeAllText: { color: PURPLE, fontSize: 13.5, fontWeight: "900" },
  servicesGrid: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  serviceItem: { width: "19%", alignItems: "center", gap: 8 },
  serviceCircle: { width: 53, height: 53, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  serviceLabel: { color: INK, fontSize: 11.5, lineHeight: 14, textAlign: "center", fontWeight: "900" },
  billBox: { borderTopWidth: 1, borderTopColor: "#F1ECFB", marginTop: 14, paddingTop: 14 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: "#E5DEF5", backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7 },
  categoryChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  categoryChipText: { color: MUTED, fontSize: 10.5, fontWeight: "900" },
  categoryChipTextActive: { color: "#FFFFFF" },
  transactionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F0ECF8" },
  transactionIcon: { width: 49, height: 49, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  transactionDate: { color: MUTED, fontSize: 12.5, fontWeight: "700", marginTop: 2 },
  transactionAmount: { color: INK, fontSize: 13.5, fontWeight: "900" },
  transactionAmountCredit: { color: GREEN },
  emptyBox: { alignItems: "center", paddingVertical: 18 },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: "900", marginTop: 8 },
  emptyText: { color: MUTED, fontSize: 12.5, textAlign: "center", lineHeight: 18, marginTop: 4 },
  cashlessBanner: { minHeight: 86, borderRadius: 22, padding: 16, marginBottom: 20, backgroundColor: PURPLE, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" },
  coinStack: { width: 52, alignItems: "flex-start" },
  coin: { width: 38, height: 16, borderRadius: 999, backgroundColor: "#FACC15", borderWidth: 2, borderColor: "#F59E0B" },
  cashlessTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  cashlessSub: { color: "rgba(255,255,255,0.82)", fontSize: 13.5, fontWeight: "700", marginTop: 3 },
  yellowBtn: { minHeight: 42, borderRadius: 21, backgroundColor: "#FFD21E", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13 },
  yellowBtnText: { color: INK, fontSize: 12.5, fontWeight: "900" },
});
