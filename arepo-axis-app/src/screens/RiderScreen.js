import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { RiderAPI, OperationalIssueAPI } from "../api/client";

export default function RiderScreen() {
  const { riderData, advanceOrder, claimOrder } = useOrders();
  const { user, refreshMe } = useAuth();
  const { available, assigned, completedToday } = riderData;
  const [stats, setStats] = useState(null);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [balance, setBalance] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankDraft, setBankDraft] = useState({ bankName: "", bankAccountNumber: "", bankAccountName: "" });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState(null);
  const [savingBank, setSavingBank] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportOtherNote, setReportOtherNote] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const submitReport = async (reason) => {
    setSubmittingReport(true);
    setReportError(null);
    try {
      await OperationalIssueAPI.report(reason, assigned[0]?.id || null);
      setReportSubmitted(true);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const loadBalance = useCallback(async () => {
    try { setBalance(await RiderAPI.balance()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadPayoutHistory = useCallback(async () => {
    try { setPayoutHistory(await RiderAPI.payoutHistory()); } catch (err) { /* non-fatal */ }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(await RiderAPI.stats());
    } catch (err) {
      // Non-fatal — the rest of the screen still works from riderData.
    }
  }, []);

  useEffect(() => { loadStats(); loadBalance(); loadPayoutHistory(); }, [loadStats, loadBalance, loadPayoutHistory]);

  useEffect(() => {
    setShowBankForm(!user?.rider?.bankAccountNumber);
    setBankDraft({
      bankName: user?.rider?.bankName || "", bankAccountNumber: user?.rider?.bankAccountNumber || "", bankAccountName: user?.rider?.bankAccountName || "",
    });
  }, [user?.rider?.bankAccountNumber]);

  const saveBankDetails = async () => {
    if (!bankDraft.bankName.trim() || !bankDraft.bankAccountNumber.trim() || !bankDraft.bankAccountName.trim()) return;
    setSavingBank(true);
    try {
      await RiderAPI.setBankAccount(bankDraft);
      await refreshMe();
      setShowBankForm(false);
    } catch (err) {
      // Non-fatal for the form — the input stays as typed so they can retry.
    } finally {
      setSavingBank(false);
    }
  };

  const submitWithdrawal = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || amount <= 0) { setWithdrawError("Enter a valid amount."); return; }
    setSubmittingWithdraw(true);
    setWithdrawError(null);
    try {
      await RiderAPI.requestPayout(amount);
      setWithdrawAmount("");
      await Promise.all([loadBalance(), loadPayoutHistory()]);
    } catch (err) {
      setWithdrawError(err.message);
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const toggleOnline = async () => {
    setTogglingOnline(true);
    try {
      await RiderAPI.toggleOnline();
      await Promise.all([refreshMe(), loadStats()]);
    } finally {
      setTogglingOnline(false);
    }
  };

  const isOnline = stats?.isOnline ?? user?.rider?.isOnline ?? false;
  const statCards = [
    { key: "today", label: "Today", data: stats?.today },
    { key: "week", label: "This week", data: stats?.week },
    { key: "month", label: "This month", data: stats?.month },
  ];
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [periodDeliveries, setPeriodDeliveries] = useState(null); // null = use completedToday from context
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const selectPeriod = async (period) => {
    setSelectedPeriod(period);
    if (period === "today") { setPeriodDeliveries(null); return; } // already have this via context, no fetch needed
    setLoadingDeliveries(true);
    try {
      setPeriodDeliveries(await RiderAPI.deliveries(period));
    } catch (err) {
      setPeriodDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.paper }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.profileCard}>
        <View>
          <Text style={styles.riderName}>{user?.name}</Text>
          <Text style={styles.riderZone}>Okada {"\u00B7"} {user?.rider?.zone || "Arepo/Axis zone"}</Text>
        </View>
        <Pressable
          onPress={toggleOnline} disabled={togglingOnline}
          style={[styles.onlineBtn, { backgroundColor: isOnline ? COLORS.green : "rgba(255,255,255,0.15)" }]}
        >
          <Text style={styles.onlineBtnText}>{isOnline ? "\u25CF Online" : "\u25CB Offline"}</Text>
        </Pressable>
      </View>

      <View style={styles.statGrid}>
        {statCards.map((s) => (
          <Pressable key={s.key} onPress={() => selectPeriod(s.key)} style={[styles.statCard, selectedPeriod === s.key && styles.statCardActive]}>
            <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            <Text style={styles.statCount}>{s.data ? s.data.completed : "—"}</Text>
            <Text style={styles.statEarnings}>{s.data ? fmtNaira(s.data.earnings) : ""}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.tapHint}>Tap a card to see the deliveries behind that number</Text>

      <View style={styles.badgeRow}>
        <Pill tone="green">{"\u2605"} {stats?.rating ?? user?.rider?.rating ?? "—"} rating</Pill>
        <Pill tone="mango">{fmtNaira(600)}/delivery</Pill>
      </View>

      {!isOnline && (
        <View style={styles.offlineNote}>
          <Text style={{ fontSize: 13.5, color: COLORS.mute }}>
            You're offline {"\u2014"} go online to see and accept new deliveries.
          </Text>
        </View>
      )}

      {showReportForm ? (
        <View style={styles.reportCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontWeight: "700", fontSize: 14 }}>Report a problem</Text>
            <Pressable onPress={() => { setShowReportForm(false); setReportOtherNote(null); setReportSubmitted(false); }}>
              <Text style={{ color: COLORS.mute, fontSize: 12 }}>Cancel</Text>
            </Pressable>
          </View>
          {reportSubmitted ? (
            <View style={styles.reportSuccessBox}>
              <Text style={{ fontSize: 13 }}>{"\uD83D\uDEE1\uFE0F"} Sent to Route admin {"\u2014"} they'll follow up if needed.</Text>
            </View>
          ) : (
            <>
              {["Customer not answering", "Can't find the address", "Vendor gave me the wrong items", "Vendor wasn't ready", "Safety concern", "Other"].map((reason) => (
                <Pressable
                  key={reason}
                  disabled={submittingReport}
                  onPress={() => { reason === "Other" ? setReportOtherNote("") : submitReport(reason); }}
                  style={styles.reportReasonBtn}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: "600" }}>{reason}</Text>
                </Pressable>
              ))}
              {reportOtherNote !== null && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    value={reportOtherNote} onChangeText={setReportOtherNote}
                    placeholder="What's going on?" multiline numberOfLines={3}
                    style={[styles.bankInput, { minHeight: 70, textAlignVertical: "top" }]}
                  />
                  <Pressable
                    disabled={submittingReport}
                    onPress={() => submitReport(reportOtherNote.trim() ? `Other: ${reportOtherNote.trim()}` : "Other")}
                    style={[styles.btn, { backgroundColor: COLORS.ink, alignSelf: "flex-start", paddingHorizontal: 16 }]}
                  >
                    <Text style={styles.btnText}>Send</Text>
                  </Pressable>
                </View>
              )}
              {reportError && <Text style={{ color: COLORS.chili, fontSize: 12.5, marginTop: 8 }}>{reportError}</Text>}
            </>
          )}
        </View>
      ) : (
        <Pressable onPress={() => setShowReportForm(true)} style={styles.reportOpenBtn}>
          <Text style={{ color: COLORS.chili, fontWeight: "700", fontSize: 12.5 }}>{"\u26A0"} Report a problem</Text>
        </Pressable>
      )}

      {assigned.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active delivery</Text>
          {assigned.map((o) => (
            <View key={o.id} style={styles.activeCard}>
              <View style={styles.cardHeader}>
                <Text style={{ fontSize: 12.5 }}>#{o.id.slice(-6)}</Text>
                <StatusPill status={o.status} />
              </View>
              <Text style={styles.vendorName}>{o.vendor.name}</Text>
              <Text style={styles.route}>{o.vendor.area} {"\u2192"} Customer</Text>

              {o.status === "picked_up" && (o.deliveryAddress || o.deliveryPhone) && (
                <View style={{ marginBottom: 8 }}>
                  {o.deliveryAddress && (
                    <Text style={{ fontSize: 13, fontWeight: "600", marginBottom: 4 }}>{"\uD83D\uDCCD"} {o.deliveryAddress}</Text>
                  )}
                  {o.deliveryPhone && (
                    <Pressable onPress={() => Linking.openURL(`tel:${o.deliveryPhone.replace(/\s/g, "")}`)}>
                      <Text style={{ fontSize: 13, color: COLORS.indigo, fontWeight: "700" }}>
                        {"\uD83D\uDCDE"} Call customer {"\u00B7"} {o.deliveryPhone}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {o.status === "ready" && (
                <Pressable style={[styles.btn, { backgroundColor: COLORS.ink }]} onPress={() => advanceOrder(o.id).then(loadStats)}>
                  <Text style={styles.btnText}>Confirm pickup</Text>
                </Pressable>
              )}
              {o.status === "picked_up" && (
                <Pressable style={[styles.btn, { backgroundColor: COLORS.green }]} onPress={() => advanceOrder(o.id).then(loadStats)}>
                  <Text style={styles.btnText}>Mark delivered</Text>
                </Pressable>
              )}
            </View>
          ))}
        </>
      )}

      {isOnline && (
        <>
          <Text style={styles.sectionTitle}>Available deliveries ({available.length})</Text>
          <FlatList
            data={available}
            keyExtractor={(o) => o.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={{ color: COLORS.mute, fontSize: 13.5 }}>Nothing waiting right now.</Text>}
            contentContainerStyle={{ gap: 10, marginBottom: 24 }}
            renderItem={({ item: o }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute }}>#{o.id.slice(-6)}</Text>
                  <Pill tone="indigo">{o.vendor.area}</Pill>
                </View>
                <Text style={styles.vendorName}>{o.vendor.name}</Text>
                <Pressable style={[styles.btn, { backgroundColor: COLORS.mango }]} onPress={() => claimOrder(o.id).then(loadStats)}>
                  <Text style={styles.btnText}>Accept delivery {"\u00B7"} {fmtNaira(600)}</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: COLORS.mute }]}>
        Completed {selectedPeriod === "today" ? "today" : selectedPeriod === "week" ? "this week" : "this month"}
        {" "}({selectedPeriod === "today" ? completedToday.length : (periodDeliveries?.length ?? "\u2026")})
      </Text>
      {loadingDeliveries ? (
        <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>Loading\u2026</Text>
      ) : (
        <FlatList
          data={selectedPeriod === "today" ? completedToday : (periodDeliveries || [])}
          keyExtractor={(o) => o.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No deliveries completed in this period.</Text>}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: o }) => (
            <View style={styles.completedRow}>
              <View>
                <Text style={{ fontSize: 12 }}>#{o.id.slice(-6)}</Text>
                <Text style={{ fontSize: 12.5, color: COLORS.mute }}>
                  {o.vendor?.name || o.vendorName}
                  {o.deliveredAt ? ` \u00B7 ${new Date(o.deliveredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: COLORS.green }}>+{fmtNaira(o.payout || 600)}</Text>
            </View>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Earnings & payouts</Text>
      {showBankForm ? (
        <View style={styles.bankCard}>
          <Text style={{ fontSize: 13, color: COLORS.mute, marginBottom: 10 }}>
            {user?.rider?.bankAccountNumber ? "Update your payout account" : "Add a bank account before you can withdraw earnings."}
          </Text>
          <TextInput
            value={bankDraft.bankName} onChangeText={(t) => setBankDraft((b) => ({ ...b, bankName: t }))}
            placeholder="Bank name" style={styles.bankInput}
          />
          <TextInput
            value={bankDraft.bankAccountNumber} onChangeText={(t) => setBankDraft((b) => ({ ...b, bankAccountNumber: t.replace(/[^0-9]/g, "") }))}
            placeholder="Account number" keyboardType="numeric" style={styles.bankInput}
          />
          <TextInput
            value={bankDraft.bankAccountName} onChangeText={(t) => setBankDraft((b) => ({ ...b, bankAccountName: t }))}
            placeholder="Account holder name" style={styles.bankInput}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={saveBankDetails} disabled={savingBank} style={[styles.btn, { backgroundColor: COLORS.ink, flex: 1 }]}>
              <Text style={styles.btnText}>{savingBank ? "Saving\u2026" : "Save"}</Text>
            </Pressable>
            {!!user?.rider?.bankAccountNumber && (
              <Pressable onPress={() => setShowBankForm(false)} style={[styles.btn, { backgroundColor: COLORS.mute, flex: 1 }]}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.bankCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View>
              <Text style={styles.statLabel}>AVAILABLE BALANCE</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.ink }}>{balance ? fmtNaira(balance.available) : "\u2014"}</Text>
              {!!balance?.totalPending && <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}>{fmtNaira(balance.totalPending)} pending withdrawal</Text>}
            </View>
            <Pressable onPress={() => setShowBankForm(true)}>
              <Text style={{ color: COLORS.indigo, fontWeight: "700", fontSize: 12 }}>Edit bank details</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.mute, marginBottom: 12 }}>
            {user?.rider?.bankAccountName} {"\u00B7"} {user?.rider?.bankName} {"\u00B7"} {user?.rider?.bankAccountNumber}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={withdrawAmount}
              onChangeText={(t) => { setWithdrawAmount(t.replace(/[^0-9]/g, "")); setWithdrawError(null); }}
              placeholder={balance ? `Amount (up to ${fmtNaira(balance.available)})` : "Amount"}
              keyboardType="numeric" style={[styles.bankInput, { flex: 1, marginBottom: 0 }]}
            />
            <Pressable
              onPress={submitWithdrawal}
              disabled={submittingWithdraw || !balance?.available}
              style={[styles.btn, { backgroundColor: balance?.available ? COLORS.mango : COLORS.mute, paddingHorizontal: 16 }]}
            >
              <Text style={styles.btnText}>{submittingWithdraw ? "\u2026" : "Withdraw"}</Text>
            </Pressable>
          </View>
          {withdrawError && <Text style={{ color: COLORS.chili, fontSize: 12.5, marginTop: 8 }}>{withdrawError}</Text>}
        </View>
      )}

      {payoutHistory.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: COLORS.mute }]}>Withdrawal history</Text>
          <FlatList
            data={payoutHistory}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: p }) => (
              <View style={styles.completedRow}>
                <Text style={{ fontSize: 13, fontWeight: "600" }}>{fmtNaira(p.amount)}</Text>
                {p.status === "PENDING" && <View style={styles.badgeMango}><Text style={styles.badgeText}>PENDING</Text></View>}
                {p.status === "PAID" && <View style={styles.badgeGreen}><Text style={styles.badgeText}>PAID</Text></View>}
                {p.status === "REJECTED" && <View style={styles.badgeChili}><Text style={styles.badgeText}>REJECTED</Text></View>}
              </View>
            )}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: COLORS.indigo, borderRadius: 14, padding: 16, marginBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  riderName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  riderZone: { color: "rgba(255,255,255,0.7)", fontSize: 11.5 },
  onlineBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  onlineBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12 },
  statCardActive: { borderColor: COLORS.indigo, borderWidth: 2 },
  tapHint: { fontSize: 11, color: COLORS.mute, marginBottom: 14, fontStyle: "italic" },
  statLabel: { fontSize: 10, color: COLORS.mute, marginBottom: 4, letterSpacing: 0.3 },
  statCount: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  statEarnings: { fontSize: 11, color: COLORS.mango, fontWeight: "700", marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  offlineNote: { backgroundColor: "#EFEDE6", borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, marginBottom: 18 },
  reportOpenBtn: {
    alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.line, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 18,
  },
  reportCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, marginBottom: 18 },
  reportReasonBtn: {
    borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  reportSuccessBox: { backgroundColor: "#E5F2E9", borderWidth: 1, borderColor: COLORS.green, borderRadius: 10, padding: 12 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: COLORS.ink },
  activeCard: { backgroundColor: "#FFF1DA", borderWidth: 1, borderColor: COLORS.mango, borderRadius: 12, padding: 14, marginBottom: 18, gap: 4 },
  card: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, gap: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  vendorName: { fontWeight: "700", fontSize: 14.5, marginBottom: 4 },
  route: { fontSize: 12.5, color: COLORS.mute, marginBottom: 10 },
  btn: { paddingVertical: 10, borderRadius: 20, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  completedRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 10,
  },
  bankCard: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, marginBottom: 24,
  },
  bankInput: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13.5, color: COLORS.ink, backgroundColor: "#fff", marginBottom: 8,
  },
  badgeMango: { backgroundColor: COLORS.mango, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: COLORS.green, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeChili: { backgroundColor: COLORS.chili, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 10.5, fontWeight: "800" },
});
