import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { RiderAPI, OperationalIssueAPI } from "../api/client";

const PURPLE = "#6F45E9";
const DARK_NAVY = "#15183F";
const EMERALD = "#10B981";
const MANGO = "#F59E0B";
const CHILI = "#EF4444";

export default function RiderScreen() {
  const { riderData, advanceOrder, claimOrder } = useOrders();
  const { user, refreshMe } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 380;
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
      // Non-fatal
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
      // Non-fatal
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

  const [localOnline, setLocalOnline] = useState(user?.rider?.isOnline ?? true);

  useEffect(() => {
    if (user?.rider?.isOnline !== undefined) {
      setLocalOnline(user.rider.isOnline);
    }
  }, [user?.rider?.isOnline]);

  const toggleOnline = async () => {
    setTogglingOnline(true);
    setLocalOnline((prev) => !prev);
    try {
      const res = await RiderAPI.toggleOnline();
      if (res && res.isOnline !== undefined) {
        setLocalOnline(res.isOnline);
      }
      await Promise.all([refreshMe(), loadStats()]);
    } catch (err) {
      // Retain optimistic local toggle state
    } finally {
      setTogglingOnline(false);
    }
  };

  const isOnline = localOnline;
  const statCards = [
    { key: "today", label: "Today", data: stats?.today },
    { key: "week", label: "This week", data: stats?.week },
    { key: "month", label: "This month", data: stats?.month },
  ];
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [periodDeliveries, setPeriodDeliveries] = useState(null);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const selectPeriod = async (period) => {
    setSelectedPeriod(period);
    if (period === "today") { setPeriodDeliveries(null); return; }
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
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      {/* Rider Hero Profile Banner */}
      <View style={[styles.profileCard, compact && styles.profileCardCompact]}>
        <View style={styles.profileIdentity}>
          <View style={styles.riderAvatarWrap}>
            <Text style={{ fontSize: 28 }}>🛵</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.riderName} numberOfLines={1}>{user?.name || "Rider Partner"}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.riderTag}>
                <Text style={styles.riderTagText}>Okada · {user?.rider?.zone || "Abeokuta zone"}</Text>
              </View>
              <View style={styles.ratingTag}>
                <Text style={styles.ratingTagText}>★ {stats?.rating ?? user?.rider?.rating ?? "4.8"}</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={toggleOnline}
          disabled={togglingOnline}
          style={[styles.onlineBtn, compact && styles.onlineBtnCompact, { backgroundColor: isOnline ? EMERALD : "rgba(255,255,255,0.15)" }]}
        >
          <Text style={styles.onlineBtnText}>{isOnline ? "● ONLINE" : "○ OFFLINE"}</Text>
        </Pressable>
      </View>

      {/* Duty Status Switch Control Card */}
      <View style={styles.statusToggleCard}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? EMERALD : CHILI }]} />
            <Text style={styles.statusToggleTitle}>
              {isOnline ? "Duty Status: ONLINE" : "Duty Status: OFFLINE"}
            </Text>
          </View>
          <Text style={styles.statusToggleSub}>
            {isOnline
              ? "Receiving available delivery dispatch requests in real-time"
              : "Turn ON to receive available orders & earn ₦600/delivery"}
          </Text>
        </View>

        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          disabled={togglingOnline}
          trackColor={{ true: EMERALD, false: "#94A3B8" }}
          thumbColor="#ffffff"
        />
      </View>

      {/* Offline Notice Banner */}
      {!isOnline && (
        <View style={styles.offlineNote}>
          <Text style={styles.offlineNoteText}>
            🔒 You are currently <Text style={{ fontWeight: "800", color: CHILI }}>OFFLINE</Text>. Go online to view and claim available deliveries in your zone.
          </Text>
          <Pressable style={styles.goOnlineBtn} onPress={toggleOnline}>
            <Text style={styles.goOnlineBtnText}>⚡ Go Online Now</Text>
          </Pressable>
        </View>
      )}

      {/* Performance Metrics Cards */}
      <View style={styles.statGrid}>
        {statCards.map((s) => (
          <Pressable key={s.key} onPress={() => selectPeriod(s.key)} style={[styles.statCard, compact && styles.statCardCompact, selectedPeriod === s.key && styles.statCardActive]}>
            <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            <Text style={styles.statCount}>{s.data ? s.data.completed : "0"}</Text>
            <Text style={styles.statEarnings}>{s.data ? fmtNaira(s.data.earnings) : "₦0"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.tapHint}>Tap any card above to inspect delivery records for that period.</Text>

      {/* Problem Report Modal / Button */}
      {showReportForm ? (
        <View style={styles.reportCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontWeight: "800", fontSize: 14, color: DARK_NAVY }}>⚠️ Report Dispatch Issue</Text>
            <Pressable onPress={() => { setShowReportForm(false); setReportOtherNote(null); setReportSubmitted(false); }}>
              <Text style={{ color: "#64748B", fontSize: 12.5, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>

          {reportSubmitted ? (
            <View style={styles.reportSuccessBox}>
              <Text style={{ fontSize: 13, color: "#065F46", fontWeight: "700" }}>🛡️ Reported to Needly Dispatch Center — support team is on it.</Text>
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
                  <Text style={{ fontSize: 13, fontWeight: "600", color: DARK_NAVY }}>{reason}</Text>
                </Pressable>
              ))}
              {reportOtherNote !== null && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    value={reportOtherNote}
                    onChangeText={setReportOtherNote}
                    placeholder="Provide details about the issue…"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    style={[styles.bankInput, { minHeight: 70, textAlignVertical: "top" }]}
                  />
                  <Pressable
                    disabled={submittingReport}
                    onPress={() => submitReport(reportOtherNote.trim() ? `Other: ${reportOtherNote.trim()}` : "Other")}
                    style={[styles.btn, { backgroundColor: DARK_NAVY, alignSelf: "flex-start", paddingHorizontal: 16 }]}
                  >
                    <Text style={styles.btnText}>Submit Report</Text>
                  </Pressable>
                </View>
              )}
              {reportError && <Text style={{ color: CHILI, fontSize: 12.5, marginTop: 8 }}>{reportError}</Text>}
            </>
          )}
        </View>
      ) : (
        <Pressable onPress={() => setShowReportForm(true)} style={styles.reportOpenBtn}>
          <Text style={{ color: CHILI, fontWeight: "800", fontSize: 12.5 }}>⚠️ Report a Dispatch Problem</Text>
        </Pressable>
      )}

      {/* Active Assigned Delivery */}
      {assigned.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Delivery Mission</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>IN PROGRESS</Text>
            </View>
          </View>

          {assigned.map((o) => (
            <View key={o.id} style={styles.activeMissionCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.missionOrderId}>Mission #{o.id.slice(-6)}</Text>
                <StatusPill status={o.status} />
              </View>

              <Text style={styles.missionVendorName}>{o.fulfillmentType === "AGENT_HUB" ? (o.hub?.name || "Needly Hub") : (o.vendor?.name || "Vendor Store")}</Text>
              <Text style={styles.missionRoute}>📍 {o.fulfillmentType === "AGENT_HUB" ? (o.hub?.area || "Hub") : (o.vendor?.area || "Vendor Area")} → Customer Location</Text>

              {o.status === "picked_up" && (o.deliveryAddress || o.deliveryPhone) && (
                <View style={styles.addressBox}>
                  {o.deliveryAddress && (
                    <Text style={styles.addressText}>📍 Deliver to: <Text style={{ fontWeight: "800" }}>{o.deliveryAddress}</Text></Text>
                  )}
                  {o.deliveryPhone && (
                    <Pressable style={styles.callCustomerBtn} onPress={() => Linking.openURL(`tel:${o.deliveryPhone.replace(/\s/g, "")}`)}>
                      <Text style={styles.callCustomerText}>📞 Call Customer · {o.deliveryPhone}</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {o.status === "ready" && (
                <Pressable style={[styles.btn, { backgroundColor: PURPLE }]} onPress={() => advanceOrder(o.id).then(loadStats)}>
                  <Text style={styles.btnText}>✓ Confirm Pickup from {o.fulfillmentType === "AGENT_HUB" ? "Hub" : "Vendor"}</Text>
                </Pressable>
              )}
              {o.status === "picked_up" && (
                <Pressable style={[styles.btn, { backgroundColor: EMERALD }]} onPress={() => advanceOrder(o.id).then(loadStats)}>
                  <Text style={styles.btnText}>🏁 Mark Delivered to Customer</Text>
                </Pressable>
              )}
            </View>
          ))}
        </>
      )}

      {/* Available Jobs Feed */}
      {isOnline && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Jobs ({available.length})</Text>
            <Text style={styles.payoutTag}>{fmtNaira(600)} / job</Text>
          </View>

          <FlatList
            data={available}
            keyExtractor={(o) => o.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyJobsCard}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>🛵</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: DARK_NAVY }}>No Available Jobs Right Now</Text>
                <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 2 }}>
                  Stay online! New dispatch orders in {user?.rider?.zone || "Abeokuta"} will ping here immediately.
                </Text>
              </View>
            }
            contentContainerStyle={{ gap: 10, marginBottom: 24 }}
            renderItem={({ item: o }) => (
              <View style={styles.jobCard}>
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: DARK_NAVY }}>Job #{o.id.slice(-6)}</Text>
                  <Pill tone="indigo">{o.vendor?.area || "Abeokuta"}</Pill>
                </View>
                <Text style={styles.jobVendorName}>{o.fulfillmentType === "AGENT_HUB" ? (o.hub?.name || "Needly Hub") : o.vendor?.name}</Text>
                {o.fulfillmentType === "AGENT_HUB" && (
                  <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "700" }}>
                    Hub pickup · {o.hub?.address || "Needly hub"}
                  </Text>
                )}
                <Pressable style={styles.claimJobBtn} onPress={() => claimOrder(o.id).then(loadStats)}>
                  <Text style={styles.claimJobBtnText}>Accept Job · Earn {fmtNaira(600)}</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}

      {/* Completed History List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          Completed {selectedPeriod === "today" ? "Today" : selectedPeriod === "week" ? "This Week" : "This Month"}
          {" "} ({selectedPeriod === "today" ? completedToday.length : (periodDeliveries?.length ?? "…")})
        </Text>
      </View>

      {loadingDeliveries ? (
        <Text style={{ color: "#64748B", fontSize: 13 }}>Loading delivery records…</Text>
      ) : (
        <FlatList
          data={selectedPeriod === "today" ? completedToday : (periodDeliveries || [])}
          keyExtractor={(o) => o.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={{ color: "#64748B", fontSize: 13.5 }}>No completed deliveries in this period.</Text>}
          contentContainerStyle={{ gap: 8, marginBottom: 24 }}
          renderItem={({ item: o }) => (
            <View style={styles.completedRow}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: DARK_NAVY }}>Job #{o.id.slice(-6)}</Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {o.vendor?.name || o.vendorName}
                  {o.deliveredAt ? ` · ${new Date(o.deliveredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "900", color: EMERALD }}>+{fmtNaira(o.payout || 600)}</Text>
            </View>
          )}
        />
      )}

      {/* Wallet & Earnings Payout */}
      <Text style={styles.sectionTitle}>Earnings Wallet & Payouts</Text>

      {showBankForm ? (
        <View style={styles.bankCard}>
          <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>
            {user?.rider?.bankAccountNumber ? "Update your payout bank details:" : "Add a bank account to enable instant earnings withdrawal:"}
          </Text>
          <TextInput
            value={bankDraft.bankName}
            onChangeText={(t) => setBankDraft((b) => ({ ...b, bankName: t }))}
            placeholder="Bank Name (e.g. GTBank, Kuda, Zenith)"
            placeholderTextColor="#94A3B8"
            style={styles.bankInput}
          />
          <TextInput
            value={bankDraft.bankAccountNumber}
            onChangeText={(t) => setBankDraft((b) => ({ ...b, bankAccountNumber: t.replace(/[^0-9]/g, "") }))}
            placeholder="Account Number (10 digits)"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            style={styles.bankInput}
          />
          <TextInput
            value={bankDraft.bankAccountName}
            onChangeText={(t) => setBankDraft((b) => ({ ...b, bankAccountName: t }))}
            placeholder="Account Holder Full Name"
            placeholderTextColor="#94A3B8"
            style={styles.bankInput}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Pressable onPress={saveBankDetails} disabled={savingBank} style={[styles.btn, { backgroundColor: DARK_NAVY, flex: 1 }]}>
              <Text style={styles.btnText}>{savingBank ? "Saving…" : "Save Bank Details"}</Text>
            </Pressable>
            {!!user?.rider?.bankAccountNumber && (
              <Pressable onPress={() => setShowBankForm(false)} style={[styles.btn, { backgroundColor: "#64748B", flex: 1 }]}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.bankCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View>
              <Text style={styles.statLabel}>AVAILABLE EARNINGS</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: DARK_NAVY }}>{balance ? fmtNaira(balance.available) : "₦0"}</Text>
              {!!balance?.totalPending && (
                <Text style={{ fontSize: 12, color: MANGO, marginTop: 2, fontWeight: "700" }}>{fmtNaira(balance.totalPending)} pending payout processing</Text>
              )}
            </View>
            <Pressable onPress={() => setShowBankForm(true)} style={styles.editBankBtn}>
              <Text style={{ color: PURPLE, fontWeight: "800", fontSize: 12 }}>Edit Bank Account</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
            🏦 {user?.rider?.bankAccountName} · {user?.rider?.bankName} ({user?.rider?.bankAccountNumber})
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={withdrawAmount}
              onChangeText={(t) => { setWithdrawAmount(t.replace(/[^0-9]/g, "")); setWithdrawError(null); }}
              placeholder={balance ? `Amount (up to ${fmtNaira(balance.available)})` : "Amount (₦)"}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={[styles.bankInput, { flex: 1, marginBottom: 0 }]}
            />
            <Pressable
              onPress={submitWithdrawal}
              disabled={submittingWithdraw || !balance?.available}
              style={[styles.btn, { backgroundColor: balance?.available ? MANGO : "#CBD5E1", paddingHorizontal: 18 }]}
            >
              <Text style={styles.btnText}>{submittingWithdraw ? "…" : "Request Payout"}</Text>
            </Pressable>
          </View>
          {withdrawError && <Text style={{ color: CHILI, fontSize: 12.5, marginTop: 8 }}>{withdrawError}</Text>}
        </View>
      )}

      {/* Payout History */}
      {payoutHistory.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { fontSize: 15 }]}>Payout Withdrawal History</Text>
          </View>
          <FlatList
            data={payoutHistory}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: p }) => (
              <View style={styles.completedRow}>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: DARK_NAVY }}>{fmtNaira(p.amount)}</Text>
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
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 430, alignSelf: "center", padding: 16, paddingBottom: 60 },
  contentCompact: { paddingHorizontal: 12 },

  /* Hero Rider Profile */
  profileCard: {
    backgroundColor: PURPLE, borderRadius: 28, padding: 18, marginBottom: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12,
    shadowColor: PURPLE, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  profileCardCompact: { alignItems: "flex-start", flexDirection: "column" },
  profileIdentity: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  profileText: { flex: 1, minWidth: 0 },
  riderAvatarWrap: { width: 52, height: 52, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  riderName: { color: "#ffffff", fontWeight: "900", fontSize: 18, marginBottom: 5 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  riderTag: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  riderTagText: { color: "rgba(255,255,255,0.88)", fontSize: 11, fontWeight: "700" },
  ratingTag: { backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  ratingTagText: { color: "#92400E", fontSize: 11, fontWeight: "900" },

  onlineBtn: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, flexShrink: 0 },
  onlineBtnCompact: { alignSelf: "stretch", alignItems: "center" },
  onlineBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },

  statusToggleCard: {
    backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0",
    padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusToggleTitle: { fontSize: 14.5, fontWeight: "900", color: DARK_NAVY },
  statusToggleSub: { fontSize: 12, color: "#64748B", marginTop: 2 },

  offlineNote: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 18, padding: 16, marginBottom: 16 },
  offlineNoteText: { fontSize: 13, color: "#92400E", lineHeight: 18, marginBottom: 12 },
  goOnlineBtn: { backgroundColor: EMERALD, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start" },
  goOnlineBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },

  /* Performance Metrics Grid */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  statCard: { flex: 1, minWidth: 108, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 12 },
  statCardCompact: { minWidth: "31%", paddingHorizontal: 10 },
  statCardActive: { borderColor: PURPLE, borderWidth: 2, backgroundColor: "#F8FAFC" },
  tapHint: { fontSize: 11, color: "#64748B", marginBottom: 16, fontStyle: "italic" },
  statLabel: { fontSize: 10, color: "#64748B", marginBottom: 4, letterSpacing: 0.5, fontWeight: "800" },
  statCount: { fontSize: 18, fontWeight: "900", color: DARK_NAVY },
  statEarnings: { fontSize: 12, color: MANGO, fontWeight: "800", marginTop: 2 },

  /* Problem Report */
  reportOpenBtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 18 },
  reportCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14, marginBottom: 18 },
  reportReasonBtn: { borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  reportSuccessBox: { backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#6EE7B7", borderRadius: 12, padding: 12 },

  /* Section Headers */
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontWeight: "900", fontSize: 17, color: DARK_NAVY },
  activePill: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activePillText: { color: "#92400E", fontSize: 11, fontWeight: "900" },
  payoutTag: { color: EMERALD, fontSize: 12, fontWeight: "900" },

  /* Active Mission Card */
  activeMissionCard: { backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: MANGO, borderRadius: 20, padding: 16, marginBottom: 20, gap: 8 },
  missionOrderId: { fontSize: 13, fontWeight: "900", color: DARK_NAVY },
  missionVendorName: { fontWeight: "900", fontSize: 17, color: DARK_NAVY },
  missionRoute: { fontSize: 13, color: "#92400E", fontWeight: "700" },
  addressBox: { backgroundColor: "#ffffff", borderRadius: 14, padding: 12, marginTop: 4, gap: 6 },
  addressText: { fontSize: 13, color: DARK_NAVY },
  callCustomerBtn: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start" },
  callCustomerText: { color: PURPLE, fontWeight: "800", fontSize: 12.5 },

  /* Job Cards */
  emptyJobsCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 20, alignItems: "center" },
  jobCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14, gap: 6 },
  jobVendorName: { fontWeight: "800", fontSize: 15, color: DARK_NAVY },
  claimJobBtn: { backgroundColor: MANGO, paddingVertical: 10, borderRadius: 14, alignItems: "center", marginTop: 4 },
  claimJobBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },

  btn: { paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#ffffff", fontWeight: "900", fontSize: 13.5 },

  /* Completed History */
  completedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 12 },

  /* Bank Wallet Card */
  bankCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, marginBottom: 20 },
  editBankBtn: { backgroundColor: "#F3E8FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  bankInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: DARK_NAVY, backgroundColor: "#ffffff", marginBottom: 10 },

  badgeMango: { backgroundColor: MANGO, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: EMERALD, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeChili: { backgroundColor: CHILI, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900" },
});
