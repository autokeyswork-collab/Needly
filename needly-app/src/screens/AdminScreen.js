import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import { STATUS_FLOW, STATUS_LABEL } from "../data/mockData";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { AuthAPI, VendorAPI, RiderAPI, OrderAPI, AuditAPI, PayoutAPI, OperationalIssueAPI, normalizeOrder } from "../api/client";

const PURPLE = "#6F45E9";
const DARK_NAVY = "#15183F";
const EMERALD = "#10B981";
const MANGO = "#F59E0B";
const CHILI = "#EF4444";

const ADMIN_TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "approvals", label: "Approvals", icon: "⚡" },
  { id: "disputes", label: "Disputes & Issues", icon: "⚠️" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "vendors", label: "Vendors", icon: "🏪" },
  { id: "riders", label: "Riders", icon: "🛵" },
  { id: "payouts", label: "Payouts", icon: "💳" },
  { id: "orders", label: "Orders Feed", icon: "📦" },
  { id: "mailTray", label: "Mail Tray", icon: "✉️" },
  { id: "auditLog", label: "Audit Log", icon: "📜" },
];

export default function AdminScreen() {
  const { orders, disputes, resolveDispute, vendors, refreshVendors, cancelOrder, unassignRider } = useOrders();
  const { user: currentUser, logout } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState("overview");

  const [pending, setPending] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [vendorRoster, setVendorRoster] = useState([]);
  const [riderRoster, setRiderRoster] = useState([]);
  const [customerRoster, setCustomerRoster] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const [expandedDisputeId, setExpandedDisputeId] = useState(null);
  const [expandedRiderId, setExpandedRiderId] = useState(null);
  const [vendorProfileDraft, setVendorProfileDraft] = useState(null);
  const [vendorVerificationDraft, setVendorVerificationDraft] = useState(null);
  const [riderProfileDraft, setRiderProfileDraft] = useState(null);
  const [riderVerificationDraft, setRiderVerificationDraft] = useState(null);
  const [savingVendorProfile, setSavingVendorProfile] = useState(false);
  const [savingVendorVerification, setSavingVendorVerification] = useState(false);
  const [savingRiderProfile, setSavingRiderProfile] = useState(false);
  const [savingRiderVerification, setSavingRiderVerification] = useState(false);
  const [riderHistory, setRiderHistory] = useState({});
  const [loadingRiderHistory, setLoadingRiderHistory] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [mailTray, setMailTray] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [operationalIssues, setOperationalIssues] = useState([]);

  const loadPending = useCallback(async () => {
    try { setPending(await AuthAPI.pendingApprovals()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadVendorRoster = useCallback(async () => {
    try { setVendorRoster(await VendorAPI.adminList()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadRiderRoster = useCallback(async () => {
    try { setRiderRoster(await RiderAPI.adminList()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadCustomerRoster = useCallback(async () => {
    try { setCustomerRoster(await AuthAPI.customers()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadAuditLog = useCallback(async () => {
    try { setAuditLog(await AuditAPI.list(30)); } catch (err) { /* non-fatal */ }
  }, []);
  const loadMailTray = useCallback(async () => {
    try { setMailTray(await AuthAPI.mailTray()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadPayouts = useCallback(async () => {
    try { setPayouts(await PayoutAPI.list()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadOperationalIssues = useCallback(async () => {
    try { setOperationalIssues(await OperationalIssueAPI.list()); } catch (err) { /* non-fatal */ }
  }, []);

  useEffect(() => { loadPending(); loadVendorRoster(); loadRiderRoster(); loadCustomerRoster(); loadAuditLog(); loadMailTray(); loadPayouts(); loadOperationalIssues(); }, [loadPending, loadVendorRoster, loadRiderRoster, loadCustomerRoster, loadAuditLog, loadMailTray, loadPayouts, loadOperationalIssues]);

  useEffect(() => {
    const filtersActive = orderSearch.trim() || orderStatusFilter !== "all" || orderPaymentFilter !== "all";
    if (!filtersActive) { setSearchResults(null); return; }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const filters = {};
        if (orderSearch.trim()) filters.search = orderSearch.trim();
        if (orderStatusFilter !== "all") filters.status = orderStatusFilter.toUpperCase();
        if (orderPaymentFilter !== "all") filters.paymentStatus = orderPaymentFilter.toUpperCase();
        const data = await OrderAPI.mine(filters);
        setSearchResults((Array.isArray(data) ? data : []).map(normalizeOrder));
      } catch (err) {
        const q = orderSearch.trim().toLowerCase();
        const filtered = (orders || []).filter((o) => {
          const matchQ = !q || [o.id, o.vendorName, o.customerName, o.deliveryAddress, o.status].some((v) => (v || "").toLowerCase().includes(q));
          const matchStatus = orderStatusFilter === "all" || (o.status || "").toLowerCase() === orderStatusFilter.toLowerCase();
          const matchPayment = orderPaymentFilter === "all" || (o.paymentStatus || "").toLowerCase() === orderPaymentFilter.toLowerCase();
          return matchQ && matchStatus && matchPayment;
        });
        setSearchResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [orderSearch, orderStatusFilter, orderPaymentFilter, orders]);

  const approve = async (user) => {
    if (!user?.id || approvingId) return;
    setApprovingId(user.id);
    try {
      await AuthAPI.approveUser(user.id);
      await Promise.all([loadPending(), loadVendorRoster(), loadRiderRoster(), loadAuditLog(), loadMailTray()]);
      if (refreshVendors) await refreshVendors();
      alert(`${user.name || "Account"} has been approved.`);
    } catch (err) {
      alert(`Approve failed: ${err.message || err}`);
    } finally {
      setApprovingId(null);
    }
  };
  const suspendAccount = async (userId) => { await AuthAPI.suspendUser(userId); loadVendorRoster(); loadRiderRoster(); loadCustomerRoster(); loadAuditLog(); };
  const reactivateAccount = async (userId) => { await AuthAPI.approveUser(userId); loadVendorRoster(); loadRiderRoster(); loadCustomerRoster(); loadAuditLog(); };

  useEffect(() => {
    const v = vendorRoster.find((v) => v.id === expandedVendorId);
    if (!v) { setVendorProfileDraft(null); setVendorVerificationDraft(null); return; }
    setVendorProfileDraft({
      name: v.name, category: v.category, area: v.area, eta: v.eta,
      contactName: v.owner?.name || v.manager?.name || "", contactPhone: v.owner?.phone || v.manager?.phone || "",
      bankName: v.bankName || "", bankAccountNumber: v.bankAccountNumber || "", bankAccountName: v.bankAccountName || "",
      bankAccountLocked: !!v.bankAccountLocked,
    });
    setVendorVerificationDraft({
      businessRegNumber: v.businessRegNumber || "", ownerIdType: v.ownerIdType || "", ownerIdNumber: v.ownerIdNumber || "",
      verified: !!v.verified, verificationNotes: v.verificationNotes || "",
    });
  }, [expandedVendorId, vendorRoster]);

  useEffect(() => {
    const r = riderRoster.find((r) => r.id === expandedRiderId);
    if (!r) { setRiderProfileDraft(null); setRiderVerificationDraft(null); return; }
    setRiderProfileDraft({ name: r.user?.name || "", phone: r.user?.phone || "", zone: r.zone });
    setRiderVerificationDraft({
      idType: r.idType || "", idNumber: r.idNumber || "", verified: !!r.verified, verificationNotes: r.verificationNotes || "",
    });
  }, [expandedRiderId, riderRoster]);

  const saveVendorProfile = async (v) => {
    setSavingVendorProfile(true);
    try {
      await VendorAPI.adminEditProfile(v.id, {
        name: vendorProfileDraft.name,
        category: vendorProfileDraft.category,
        area: vendorProfileDraft.area,
        eta: vendorProfileDraft.eta,
        bankName: vendorProfileDraft.bankName,
        bankAccountNumber: vendorProfileDraft.bankAccountNumber,
        bankAccountName: vendorProfileDraft.bankAccountName,
        bankAccountLocked: vendorProfileDraft.bankAccountLocked,
      });
      const contactId = v.owner?.id || v.manager?.id;
      if (contactId) await AuthAPI.editContact(contactId, { name: vendorProfileDraft.contactName, phone: vendorProfileDraft.contactPhone });
      await Promise.all([loadVendorRoster(), loadAuditLog()]);
    } finally {
      setSavingVendorProfile(false);
    }
  };
  const saveVendorVerification = async (v) => {
    setSavingVendorVerification(true);
    try {
      await VendorAPI.setVerification(v.id, vendorVerificationDraft);
      await Promise.all([loadVendorRoster(), loadAuditLog()]);
    } finally {
      setSavingVendorVerification(false);
    }
  };
  const saveRiderProfile = async (r) => {
    setSavingRiderProfile(true);
    try {
      await RiderAPI.adminEditProfile(r.id, { zone: riderProfileDraft.zone });
      if (r.user?.id) await AuthAPI.editContact(r.user.id, { name: riderProfileDraft.name, phone: riderProfileDraft.phone });
      await Promise.all([loadRiderRoster(), loadAuditLog()]);
    } finally {
      setSavingRiderProfile(false);
    }
  };
  const saveRiderVerification = async (r) => {
    setSavingRiderVerification(true);
    try {
      await RiderAPI.setVerification(r.id, riderVerificationDraft);
      await Promise.all([loadRiderRoster(), loadAuditLog()]);
    } finally {
      setSavingRiderVerification(false);
    }
  };

  const toggleRiderHistory = async (riderId) => {
    if (expandedRiderId === riderId) { setExpandedRiderId(null); return; }
    setExpandedRiderId(riderId);
    if (!riderHistory[riderId]) {
      setLoadingRiderHistory(riderId);
      try {
        const raw = await OrderAPI.mine({ riderId });
        setRiderHistory((h) => ({ ...h, [riderId]: (Array.isArray(raw) ? raw : []).map(normalizeOrder) }));
      } catch (err) {
        setRiderHistory((h) => ({ ...h, [riderId]: [] }));
      } finally {
        setLoadingRiderHistory(null);
      }
    }
  };

  const resolveDisputeLogged = async (disputeId) => {
    await resolveDispute(disputeId);
    await loadAuditLog();
  };

  const resolveOperationalIssueLogged = async (issueId) => {
    await OperationalIssueAPI.resolve(issueId);
    await Promise.all([loadOperationalIssues(), loadAuditLog()]);
  };

  const markPayoutPaidLogged = async (payoutId, note) => {
    await PayoutAPI.markPaid(payoutId, note);
    await Promise.all([loadPayouts(), loadAuditLog()]);
  };

  const rejectPayoutLogged = async (payoutId, note) => {
    await PayoutAPI.reject(payoutId, note);
    await Promise.all([loadPayouts(), loadAuditLog()]);
  };

  const unassignRiderLogged = async (orderId) => {
    await unassignRider(orderId);
    await loadAuditLog();
  };

  const cancelOrderLogged = async (orderId) => {
    await cancelOrder(orderId, "Cancelled by Needly admin");
    await loadAuditLog();
  };

  const openDisputes = disputes.filter((d) => d.status === "open");
  const openIssues = operationalIssues.filter((i) => i.status === "OPEN");
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const displayedOrders = searchResults !== null ? searchResults : orders;

  const effectiveVendors = (vendorRoster && vendorRoster.length > 0)
    ? vendorRoster
    : (vendors || []);
  const activeRidersCount = riderRoster.filter((r) => r.isOnline && r.user?.approved).length;
  const activeVendorsCount = effectiveVendors.filter((v) => v.isOpen).length;
  const adminName = currentUser?.name || (isSuperAdmin ? "Super Admin" : "Admin");
  const adminRoleLabel = isSuperAdmin ? "Super Admin" : "Admin";
  const adminInitials = adminName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

  const getBadgeCount = (tabId) => {
    if (tabId === "approvals") return pending.length;
    if (tabId === "disputes") return openDisputes.length + openIssues.length;
    if (tabId === "payouts") return pendingPayouts.length;
    if (tabId === "orders") return displayedOrders.length;
    return 0;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerProfileCluster}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{adminInitials}</Text>
            </View>
            <View style={styles.headerTitleBlock}>
              <Pressable style={styles.headerPersonPill}>
                <Text style={styles.headerPersonIcon}>👤</Text>
                <Text style={styles.headerPersonText} numberOfLines={1}>{adminName}</Text>
              </Pressable>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{adminRoleLabel} · Abeokuta operations</Text>
            </View>
          </View>
          <View style={styles.headerActionGroup}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>LIVE</Text>
            </View>
            <View style={styles.headerNotifyButton}>
              <Text style={styles.headerNotifyIcon}>🔔</Text>
              {!!pending.length && (
                <View style={styles.headerNotifyBadge}>
                  <Text style={styles.headerNotifyBadgeText}>{pending.length > 99 ? "99+" : pending.length}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={logout} style={styles.headerLogoutButton}>
              <Text style={styles.headerLogoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.headerSummaryRow}>
          <View style={styles.headerSummaryItem}>
            <Text style={styles.headerSummaryValue}>{pending.length}</Text>
            <Text style={styles.headerSummaryLabel}>Approvals</Text>
          </View>
          <View style={styles.headerSummaryDivider} />
          <View style={styles.headerSummaryItem}>
            <Text style={styles.headerSummaryValue}>{openDisputes.length + openIssues.length}</Text>
            <Text style={styles.headerSummaryLabel}>Issues</Text>
          </View>
          <View style={styles.headerSummaryDivider} />
          <View style={styles.headerSummaryItem}>
            <Text style={styles.headerSummaryValue}>{pendingPayouts.length}</Text>
            <Text style={styles.headerSummaryLabel}>Payouts</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badgeCount = getBadgeCount(tab.id);
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>{tab.label}</Text>
                {badgeCount > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{badgeCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.pageContent}>
        {/* 1. OVERVIEW PAGE */}
        {activeTab === "overview" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>📊 Command Overview</Text>

            <View style={styles.statGrid}>
              <Pressable onPress={() => setActiveTab("disputes")} style={styles.statCard}>
                <Text style={styles.statLabel}>OPEN DISPUTES & ISSUES</Text>
                <Text style={[styles.statValue, { color: (openDisputes.length + openIssues.length) > 0 ? CHILI : EMERALD }]}>
                  {openDisputes.length + openIssues.length}
                </Text>
                <Text style={styles.statSubText}>{openDisputes.length} disputes · {openIssues.length} issues</Text>
              </Pressable>

              <Pressable onPress={() => setActiveTab("approvals")} style={styles.statCard}>
                <Text style={styles.statLabel}>PENDING APPROVALS</Text>
                <Text style={[styles.statValue, { color: pending.length > 0 ? MANGO : DARK_NAVY }]}>{pending.length}</Text>
                <Text style={styles.statSubText}>Accounts awaiting setup</Text>
              </Pressable>

              <Pressable onPress={() => setActiveTab("riders")} style={styles.statCard}>
                <Text style={styles.statLabel}>ONLINE RIDERS</Text>
                <Text style={[styles.statValue, { color: EMERALD }]}>{activeRidersCount}</Text>
                <Text style={styles.statSubText}>Out of {riderRoster.length} registered</Text>
              </Pressable>

              <Pressable onPress={() => setActiveTab("vendors")} style={styles.statCard}>
                <Text style={styles.statLabel}>OPEN STORES</Text>
                <Text style={[styles.statValue, { color: PURPLE }]}>{activeVendorsCount}</Text>
                <Text style={styles.statSubText}>Out of {effectiveVendors.length} vendors</Text>
              </Pressable>
            </View>

            <Text style={styles.subSectionTitle}>Quick Access Modules</Text>
            <View style={styles.moduleGrid}>
              {ADMIN_TABS.filter((t) => t.id !== "overview").map((m) => (
                <Pressable key={m.id} onPress={() => setActiveTab(m.id)} style={styles.moduleCard}>
                  <Text style={styles.moduleIcon}>{m.icon}</Text>
                  <Text style={styles.moduleTitle}>{m.label}</Text>
                  {getBadgeCount(m.id) > 0 && (
                    <View style={styles.moduleBadge}>
                      <Text style={styles.moduleBadgeText}>{getBadgeCount(m.id)}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 2. APPROVALS PAGE */}
        {activeTab === "approvals" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>⚡ Account Approvals ({pending.length})</Text>
            <Text style={styles.pageHeaderSub}>Review and activate new Vendor stores & Rider fleet profiles.</Text>

            {pending.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <Text style={styles.emptyTitle}>All Clear</Text>
                <Text style={styles.emptySubText}>No vendor or rider accounts waiting for approval.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {pending.map((u) => {
                  const isApproving = approvingId === u.id;
                  const vendorPaymentPending = u.role === "VENDOR" && u.vendor?.onboardingFeeStatus !== "PAID";
                  const blocksApproval = vendorPaymentPending && !isSuperAdmin;
                  return (
                  <View key={u.id} style={styles.pendingCard}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.pendingTitle}>{u.name} ({u.role})</Text>
                      <Text style={styles.pendingMeta}>{u.email} · {u.phone || "No phone registered"}</Text>
                      {u.role === "VENDOR" && (
                        <Text style={styles.pendingMeta}>
                          Onboarding: {u.vendor?.onboardingFeeStatus || "PENDING"} · Fee {fmtNaira(u.vendor?.onboardingFeeAmount || 2500)}
                        </Text>
                      )}
                      {vendorPaymentPending && (
                        <Text style={styles.pendingHelpText}>
                          {isSuperAdmin
                            ? "Super Admin override available before Flutterwave confirms payment."
                            : "Approval unlocks after Flutterwave confirms the vendor onboarding payment."}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      disabled={isApproving || blocksApproval}
                      onPress={() => approve(u)}
                      style={({ pressed }) => [
                        styles.approveBtn,
                        pressed && styles.approveBtnPressed,
                        (isApproving || blocksApproval) && styles.approveBtnDisabled,
                        vendorPaymentPending && isSuperAdmin && styles.approveBtnOverride,
                      ]}
                    >
                      <Text style={styles.approveBtnText}>
                        {isApproving ? "Approving..." : blocksApproval ? "Waiting for Payment" : vendorPaymentPending ? "Override Approve" : "Approve Account"}
                      </Text>
                    </Pressable>
                  </View>
                );})}
              </View>
            )}
          </View>
        )}

        {/* 3. DISPUTES & ISSUES PAGE */}
        {activeTab === "disputes" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>⚠️ Disputes & Operational Issues</Text>
            <Text style={styles.pageHeaderSub}>Customer disputes and rider operational reports requiring resolution.</Text>

            <Text style={styles.subSectionTitle}>Open Disputes ({openDisputes.length})</Text>
            {openDisputes.length === 0 ? (
              <Text style={styles.emptyText}>No open customer disputes.</Text>
            ) : (
              <View style={{ gap: 10, marginBottom: 20 }}>
                {openDisputes.map((d) => (
                  <View key={d.id} style={styles.disputeCard}>
                    <View style={styles.disputeHeader}>
                      <Text style={styles.disputeReason}>{d.reason}</Text>
                      <Pill tone="chili">OPEN</Pill>
                    </View>
                    <Text style={styles.disputeSub}>Order #{d.orderId.slice(-6)} · Total {fmtNaira(d.total || 0)}</Text>
                    <Pressable onPress={() => resolveDisputeLogged(d.id)} style={styles.resolveBtn}>
                      <Text style={styles.resolveBtnText}>Resolve Dispute</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.subSectionTitle}>Operational Issues ({openIssues.length})</Text>
            {openIssues.length === 0 ? (
              <Text style={styles.emptyText}>No open rider or app operational issues.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {openIssues.map((issue) => (
                  <View key={issue.id} style={styles.disputeCard}>
                    <Text style={styles.disputeReason}>⚠️ {issue.reason}</Text>
                    <Text style={styles.disputeSub}>Reported by {issue.reporterName || "Rider"}</Text>
                    <Pressable onPress={() => resolveOperationalIssueLogged(issue.id)} style={styles.resolveBtn}>
                      <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 3.5 CUSTOMERS PAGE */}
        {activeTab === "customers" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>👥 Customer Directory ({customerRoster.length})</Text>
            <Text style={styles.pageHeaderSub}>All registered customer accounts, order history, and account controls.</Text>

            {/* Customers KPI Summary Cards */}
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TOTAL CUSTOMERS</Text>
                <Text style={[styles.statValue, { color: PURPLE }]}>{customerRoster.length}</Text>
                <Text style={styles.statSubText}>Registered shopper accounts</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ACTIVE USERS</Text>
                <Text style={[styles.statValue, { color: EMERALD }]}>
                  {customerRoster.filter((c) => c.approved && !c.suspendedAt).length}
                </Text>
                <Text style={styles.statSubText}>Active & un-suspended</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TOTAL SPENDING</Text>
                <Text style={[styles.statValue, { color: MANGO, fontSize: 18 }]}>
                  {fmtNaira(customerRoster.reduce((acc, c) => acc + (c.totalSpent || 0), 0))}
                </Text>
                <Text style={styles.statSubText}>Lifetime order value</Text>
              </View>
            </View>

            {/* Customer Search Bar */}
            <View style={styles.miniInputWrap}>
              <Text style={{ fontSize: 14 }}>🔍</Text>
              <TextInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search customers by name, email, or phone..."
                placeholderTextColor="#94A3B8"
                style={styles.inputSearch}
              />
              {customerSearch.length > 0 && (
                <Pressable onPress={() => setCustomerSearch("")} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 12, color: "#94A3B8" }}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Customer Roster List */}
            {(() => {
              const q = customerSearch.trim().toLowerCase();
              const filtered = customerRoster.filter((c) => {
                if (!q) return true;
                return (
                  (c.name || "").toLowerCase().includes(q) ||
                  (c.email || "").toLowerCase().includes(q) ||
                  (c.phone || "").toLowerCase().includes(q)
                );
              });

              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>👥</Text>
                    <Text style={styles.emptyTitle}>No Customers Found</Text>
                    <Text style={styles.emptySubText}>
                      {q ? `No customer accounts match "${customerSearch}".` : "No registered customers in database."}
                    </Text>
                  </View>
                );
              }

              return (
                <View style={{ gap: 10 }}>
                  {filtered.map((c) => {
                    const isExpanded = expandedCustomerId === c.id;
                    const isSuspended = !!c.suspendedAt || !c.approved;

                    return (
                      <View key={c.id} style={styles.rosterCard}>
                        <Pressable
                          onPress={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                          style={styles.rosterRow}
                        >
                          <View style={styles.customerAvatarCircle}>
                            <Text style={styles.customerAvatarText}>
                              {(c.name || "C").charAt(0).toUpperCase()}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.rosterName}>{c.name}</Text>
                              {isSuspended && <Pill tone="chili">SUSPENDED</Pill>}
                            </View>
                            <Text style={styles.rosterSub}>{c.email} · {c.phone || "No phone"}</Text>
                            <View style={styles.customerMetricsRow}>
                              <Text style={styles.customerMetricChip}>🛒 {c.ordersCount || 0} orders</Text>
                              <Text style={styles.customerMetricChip}>📅 {c.bookingsCount || 0} bookings</Text>
                              <Text style={styles.customerMetricChip}>💵 {fmtNaira(c.totalSpent || 0)}</Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 18, color: "#94A3B8" }}>{isExpanded ? "▲" : "▼"}</Text>
                        </Pressable>

                        {isExpanded && (
                          <View style={styles.customerDetailsBox}>
                            <Text style={styles.editCardTitle}>CUSTOMER ACCOUNT DETAILS</Text>
                            <Text style={styles.detailRowText}>🆔 User ID: <Text style={{ fontWeight: "700" }}>{c.id}</Text></Text>
                            <Text style={styles.detailRowText}>✉️ Email: <Text style={{ fontWeight: "700" }}>{c.email}</Text></Text>
                            <Text style={styles.detailRowText}>📱 Phone: <Text style={{ fontWeight: "700" }}>{c.phone || "N/A"}</Text></Text>
                            <Text style={styles.detailRowText}>📅 Registered: <Text style={{ fontWeight: "700" }}>{new Date(c.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}</Text></Text>

                            {/* Recent Orders Preview */}
                            {c.orders && c.orders.length > 0 && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.subSectionTitle}>Recent Orders ({c.orders.length})</Text>
                                {c.orders.map((o, idx) => (
                                  <View key={o.id || idx} style={styles.miniOrderRow}>
                                    <Text style={{ fontSize: 12, fontWeight: "700", color: DARK_NAVY }}>#{String(o.id || "").slice(-6)}</Text>
                                    <StatusPill status={o.status} />
                                    <Text style={{ fontSize: 12, fontWeight: "800", color: PURPLE }}>{fmtNaira(o.total || 0)}</Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {/* Account Control Actions */}
                            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                              {isSuspended ? (
                                <Pressable
                                  onPress={() => reactivateAccount(c.id)}
                                  style={[styles.saveBtn, { backgroundColor: EMERALD, flex: 1 }]}
                                >
                                  <Text style={styles.saveBtnText}>Reactivate Customer Account ✅</Text>
                                </Pressable>
                              ) : (
                                <Pressable
                                  onPress={() => suspendAccount(c.id)}
                                  style={[styles.saveBtn, { backgroundColor: CHILI, flex: 1 }]}
                                >
                                  <Text style={styles.saveBtnText}>Suspend Account 🚫</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        )}

        {/* 4. VENDORS PAGE */}
        {activeTab === "vendors" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>🏪 Vendor Roster ({effectiveVendors.length})</Text>
            <Text style={styles.pageHeaderSub}>All registered store partners across Abeokuta commercial hubs.</Text>

            <View style={{ gap: 10 }}>
              {effectiveVendors.map((v) => {
                const isExpanded = expandedVendorId === v.id;
                return (
                  <View key={v.id} style={styles.rosterCard}>
                    <Pressable onPress={() => setExpandedVendorId(isExpanded ? null : v.id)} style={styles.rosterRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rosterName}>{v.name}</Text>
                        <Text style={styles.rosterSub}>{v.area} · {v.category} · {v.isOpen ? "OPEN" : "CLOSED"}</Text>
                      </View>
                      <Pill tone={v.verified ? "green" : "mango"}>{v.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                    </Pressable>

                    {isExpanded && vendorProfileDraft && (
                      <View style={styles.editCard}>
                        <Text style={styles.editCardTitle}>EDIT VENDOR PROFILE</Text>
                        <TextInput
                          value={vendorProfileDraft.name}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, name: t }))}
                          placeholder="Store Name"
                          style={styles.miniInput}
                        />
                        <TextInput
                          value={vendorProfileDraft.category}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, category: t }))}
                          placeholder="Category"
                          style={styles.miniInput}
                        />
                        <TextInput
                          value={vendorProfileDraft.area}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, area: t }))}
                          placeholder="Area Location"
                          style={styles.miniInput}
                        />
                        <Text style={styles.editCardTitle}>DIRECT PAYMENT ACCOUNT</Text>
                        <TextInput
                          value={vendorProfileDraft.bankName}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, bankName: t }))}
                          placeholder="Bank name"
                          style={styles.miniInput}
                        />
                        <TextInput
                          value={vendorProfileDraft.bankAccountNumber}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, bankAccountNumber: t.replace(/[^0-9]/g, "") }))}
                          placeholder="Account number"
                          keyboardType="numeric"
                          maxLength={10}
                          style={styles.miniInput}
                        />
                        <TextInput
                          value={vendorProfileDraft.bankAccountName}
                          onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, bankAccountName: t }))}
                          placeholder="Account name"
                          style={styles.miniInput}
                        />
                        <Pressable
                          onPress={() => setVendorProfileDraft((d) => ({ ...d, bankAccountLocked: !d.bankAccountLocked }))}
                          style={[styles.lockToggle, vendorProfileDraft.bankAccountLocked && styles.lockToggleActive]}
                        >
                          <Text style={[styles.lockToggleText, vendorProfileDraft.bankAccountLocked && styles.lockToggleTextActive]}>
                            {vendorProfileDraft.bankAccountLocked ? "🔒 Account locked" : "🔓 Account unlocked"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => saveVendorProfile(v)} disabled={savingVendorProfile} style={styles.saveBtn}>
                          <Text style={styles.saveBtnText}>{savingVendorProfile ? "Saving…" : "Save Profile Updates"}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 5. RIDERS PAGE */}
        {activeTab === "riders" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>🛵 Rider Fleet Roster ({riderRoster.length})</Text>
            <Text style={styles.pageHeaderSub}>Active dispatch riders across Abeokuta zones.</Text>

            <View style={{ gap: 10 }}>
              {riderRoster.map((r) => {
                const isExpanded = expandedRiderId === r.id;
                return (
                  <View key={r.id} style={styles.rosterCard}>
                    <Pressable onPress={() => toggleRiderHistory(r.id)} style={styles.rosterRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rosterName}>{r.user?.name || "Rider"}</Text>
                        <Text style={styles.rosterSub}>{r.zone} · {r.isOnline ? "● ONLINE" : "○ OFFLINE"}</Text>
                      </View>
                      <Pill tone={r.verified ? "green" : "mango"}>{r.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                    </Pressable>

                    {isExpanded && riderProfileDraft && (
                      <View style={styles.editCard}>
                        <Text style={styles.editCardTitle}>EDIT RIDER PROFILE</Text>
                        <TextInput
                          value={riderProfileDraft.zone}
                          onChangeText={(t) => setRiderProfileDraft((d) => ({ ...d, zone: t }))}
                          placeholder="Rider Zone"
                          style={styles.miniInput}
                        />
                        <Pressable onPress={() => saveRiderProfile(r)} disabled={savingRiderProfile} style={styles.saveBtn}>
                          <Text style={styles.saveBtnText}>{savingRiderProfile ? "Saving…" : "Save Rider Details"}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 6. PAYOUTS PAGE */}
        {activeTab === "payouts" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>💳 Payout Requests ({payouts.length})</Text>
            <Text style={styles.pageHeaderSub}>Vendor and rider earnings withdrawal requests.</Text>

            {payouts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💵</Text>
                <Text style={styles.emptyTitle}>No Payout Requests</Text>
                <Text style={styles.emptySubText}>Vendor and rider withdrawal requests will appear here.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {payouts.map((p) => (
                  <View key={p.id} style={styles.payoutCard}>
                    <View style={styles.payoutTopRow}>
                      <Text style={styles.payoutTitle}>{p.recipientName || "Vendor / Rider"}</Text>
                      <Text style={styles.payoutAmount}>{fmtNaira(p.amount || 0)}</Text>
                    </View>
                    <Text style={styles.payoutSub}>Bank: {p.bankName} · Acc: {p.accountNumber}</Text>
                    <Pill tone={p.status === "PAID" ? "green" : p.status === "REJECTED" ? "chili" : "mango"}>{p.status}</Pill>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 7. ORDERS FEED PAGE */}
        {activeTab === "orders" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>📦 Real-Time Order Feed ({displayedOrders.length})</Text>
            <Text style={styles.pageHeaderSub}>Track marketplace orders, dispatch states and refunds.</Text>

            <TextInput
              value={orderSearch}
              onChangeText={setOrderSearch}
              placeholder="Search by customer, vendor, rider, order ID or address…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />

            <View style={{ gap: 10 }}>
              {displayedOrders.map((o) => {
                const expanded = expandedOrderId === o.id;
                return (
                  <View key={o.id} style={styles.orderCard}>
                    <Pressable onPress={() => setExpandedOrderId(expanded ? null : o.id)} style={styles.orderTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderTitleText}>Order #{o.id.slice(-6)} · {o.vendorName}</Text>
                        <Text style={styles.orderMetaText}>{o.customerName || "Customer"} · {fmtNaira(o.total || 0)}</Text>
                      </View>
                      <StatusPill status={o.status} />
                    </Pressable>

                    {expanded && (
                      <View style={styles.orderDetailBox}>
                        <Text style={styles.orderDetailHeading}>ORDER ITEMS</Text>
                        {(o.items || []).map((i) => (
                          <Text key={i.id || i.name} style={styles.orderItemText}>• {i.qty} × {i.name} ({fmtNaira((i.price || 0) * i.qty)})</Text>
                        ))}
                        <Text style={styles.orderPersonText}>📍 Address: {o.deliveryAddress || "Not specified"}</Text>
                        {o.riderName && <Text style={styles.orderPersonText}>🛵 Rider: {o.riderName}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 8. MAIL TRAY PAGE */}
        {activeTab === "mailTray" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>✉️ Admin Mail Tray ({mailTray.length})</Text>
            <Text style={styles.pageHeaderSub}>Automated confirmation email logs and notifications.</Text>

            {mailTray.length === 0 ? (
              <Text style={styles.emptyText}>No confirmation emails sent yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {mailTray.map((mail) => (
                  <View key={mail.id} style={styles.mailCard}>
                    <Text style={styles.mailSubject}>{mail.subject}</Text>
                    <Text style={styles.mailTo}>To: {mail.to}</Text>
                    <Text style={styles.mailBody}>{mail.body}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 9. AUDIT LOG PAGE */}
        {activeTab === "auditLog" && (
          <View style={styles.pageWrap}>
            <Text style={styles.pageHeaderTitle}>📜 System Audit Log ({auditLog.length})</Text>
            <Text style={styles.pageHeaderSub}>Complete admin actions and system audit logs.</Text>

            <View style={{ gap: 6 }}>
              {auditLog.length === 0 && <Text style={styles.emptyText}>No admin actions recorded yet.</Text>}
              {auditLog.map((entry) => (
                <View key={entry.id} style={styles.auditRow}>
                  <Text style={{ fontSize: 12.5, color: "#64748B" }}>
                    <Text style={{ color: DARK_NAVY, fontWeight: "800" }}>{entry.actorName}</Text> {entry.action?.toLowerCase()} <Text style={{ color: DARK_NAVY, fontWeight: "800" }}>{entry.targetLabel}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F3FF" },
  content: { paddingBottom: 72, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    minHeight: "100%",
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 36,
    overflow: "hidden",
  },

  header: {
    backgroundColor: PURPLE,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    marginHorizontal: -18,
    marginBottom: 14,
    shadowColor: PURPLE,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  headerProfileCluster: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  headerPersonPill: { alignSelf: "flex-start", maxWidth: "100%", height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9 },
  headerPersonIcon: { fontSize: 12 },
  headerPersonText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900", flexShrink: 1 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 2, fontWeight: "700" },
  headerActionGroup: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 7, flexShrink: 0 },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", flexShrink: 0 },
  headerBadgeText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900" },
  headerNotifyButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", position: "relative" },
  headerNotifyIcon: { fontSize: 14 },
  headerNotifyBadge: { position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#FF3657", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  headerNotifyBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  headerLogoutButton: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  headerLogoutText: { color: "#FFFFFF", fontSize: 10.5, fontWeight: "900" },
  headerSummaryRow: { flexDirection: "row", alignItems: "center", marginTop: 16, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 20, paddingVertical: 11 },
  headerSummaryItem: { flex: 1, alignItems: "center" },
  headerSummaryValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  headerSummaryLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10.5, fontWeight: "800", marginTop: 1 },
  headerSummaryDivider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.2)" },

  tabContainer: {
    marginHorizontal: -18,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  tabScrollContent: { gap: 8, paddingHorizontal: 18 },
  tabButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8FAFC",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0", maxWidth: 176,
  },
  tabButtonActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tabIcon: { fontSize: 14 },
  tabText: { color: "#64748B", fontSize: 12, fontWeight: "800", flexShrink: 1 },
  tabTextActive: { color: "#ffffff", fontWeight: "900" },
  tabBadge: { backgroundColor: MANGO, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: "#ffffff" },
  tabBadgeText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900" },
  tabBadgeTextActive: { color: PURPLE, fontWeight: "900" },

  pageContent: { gap: 12 },
  pageWrap: { gap: 12 },
  pageHeaderTitle: { fontSize: 20, fontWeight: "900", color: DARK_NAVY },
  pageHeaderSub: { fontSize: 13, color: "#64748B", marginBottom: 8 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  statCard: {
    backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18,
    padding: 14, width: "48%", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 9.5, fontWeight: "900", color: "#64748B", marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: "900", color: DARK_NAVY },
  statSubText: { fontSize: 11, color: "#64748B", marginTop: 2, fontWeight: "600" },

  subSectionTitle: { fontSize: 15, fontWeight: "900", color: DARK_NAVY, marginTop: 10, marginBottom: 6 },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moduleCard: {
    backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0",
    padding: 14, width: "31%", alignItems: "center", gap: 4, position: "relative",
  },
  moduleIcon: { fontSize: 26 },
  moduleTitle: { fontSize: 11.5, fontWeight: "800", color: DARK_NAVY, textAlign: "center" },
  moduleBadge: { position: "absolute", top: 8, right: 8, backgroundColor: CHILI, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  moduleBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },

  emptyText: { color: "#64748B", fontSize: 13, fontStyle: "italic", marginBottom: 12 },
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 24, alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: DARK_NAVY },
  emptySubText: { fontSize: 12.5, color: "#64748B", textAlign: "center", marginTop: 4 },

  pendingCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: MANGO, borderRadius: 18, padding: 14,
  },
  pendingTitle: { fontSize: 14.5, fontWeight: "900", color: DARK_NAVY },
  pendingMeta: { fontSize: 12, color: "#92400E", marginTop: 2 },
  pendingHelpText: { fontSize: 11.5, color: "#7C2D12", fontWeight: "800", marginTop: 4, lineHeight: 16 },
  approveBtn: { backgroundColor: EMERALD, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  approveBtnOverride: { backgroundColor: PURPLE },
  approveBtnPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  approveBtnDisabled: { opacity: 0.65 },
  approveBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12.5 },

  disputeCard: { backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: CHILI, borderRadius: 18, padding: 14 },
  disputeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disputeReason: { fontSize: 14, fontWeight: "900", color: "#991B1B" },
  disputeSub: { fontSize: 12, color: "#7F1D1D", marginTop: 4, marginBottom: 10 },
  resolveBtn: { backgroundColor: DARK_NAVY, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start" },
  resolveBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },

  rosterCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14 },
  rosterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rosterName: { fontSize: 15, fontWeight: "800", color: DARK_NAVY },
  rosterSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  editCard: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 8 },
  editCardTitle: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 0.5 },
  miniInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: "#ffffff", color: DARK_NAVY },
  lockToggle: { borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  lockToggleActive: { borderColor: "#C4B5FD", backgroundColor: "#F4EDFF" },
  lockToggleText: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  lockToggleTextActive: { color: PURPLE },
  saveBtn: { backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  saveBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 12.5 },

  payoutCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14, gap: 4 },
  payoutTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payoutTitle: { fontSize: 14.5, fontWeight: "900", color: DARK_NAVY },
  payoutAmount: { fontSize: 15, fontWeight: "900", color: EMERALD },
  payoutSub: { fontSize: 12, color: "#64748B" },

  mailCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 12 },
  mailSubject: { fontSize: 13.5, fontWeight: "800", color: DARK_NAVY },
  mailTo: { fontSize: 12, color: PURPLE, marginVertical: 2 },
  mailBody: { fontSize: 12, color: "#334155" },

  searchInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13.5, backgroundColor: "#ffffff", color: DARK_NAVY, marginBottom: 12 },
  orderCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14 },
  orderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderTitleText: { fontSize: 14, fontWeight: "800", color: DARK_NAVY },
  orderMetaText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  orderDetailBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  orderDetailHeading: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 0.5, marginBottom: 4 },
  orderItemText: { fontSize: 12.5, color: DARK_NAVY, marginVertical: 1 },
  orderPersonText: { fontSize: 12, color: "#64748B", marginTop: 4 },

  auditRow: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 10, marginBottom: 4 },

  miniInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, paddingHorizontal: 12, marginBottom: 12, gap: 8 },
  inputSearch: { flex: 1, paddingVertical: 10, fontSize: 13.5, color: DARK_NAVY },
  customerAvatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EDE6FE", alignItems: "center", justifyContent: "center", marginRight: 10 },
  customerAvatarText: { fontSize: 17, fontWeight: "900", color: PURPLE },
  customerMetricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  customerMetricChip: { fontSize: 10.5, fontWeight: "700", color: DARK_NAVY, backgroundColor: "#F1F5F9", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  customerDetailsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 4 },
  detailRowText: { fontSize: 12.5, color: "#475569", marginVertical: 2 },
  miniOrderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
});
