import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, fmtNaira } from "../theme/colors";
import { Pill, StatusPill } from "../components/Pill";
import { STATUS_FLOW, STATUS_LABEL } from "../data/mockData";
import { useOrders } from "../context/OrdersContext";
import { AuthAPI, VendorAPI, RiderAPI, OrderAPI, AuditAPI, PayoutAPI, OperationalIssueAPI, normalizeOrder } from "../api/client";

export default function AdminScreen() {
  const { orders, disputes, resolveDispute, vendors, cancelOrder, unassignRider } = useOrders();
  const [pending, setPending] = useState([]);
  const [vendorRoster, setVendorRoster] = useState([]);
  const [riderRoster, setRiderRoster] = useState([]);
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
  const [riderHistory, setRiderHistory] = useState({}); // { [riderId]: normalized Order[] }
  const [loadingRiderHistory, setLoadingRiderHistory] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [searchResults, setSearchResults] = useState(null); // null = no active filters, show context's orders
  const [searching, setSearching] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [operationalIssues, setOperationalIssues] = useState([]);
  const scrollViewRef = useRef(null);
  const sectionY = useRef({});
  const onSectionLayout = (key) => (e) => { sectionY.current[key] = e.nativeEvent.layout.y; };
  const scrollToSection = (key) => {
    const y = sectionY.current[key];
    if (y != null) scrollViewRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  const loadPending = useCallback(async () => {
    try { setPending(await AuthAPI.pendingApprovals()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadVendorRoster = useCallback(async () => {
    try { setVendorRoster(await VendorAPI.adminList()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadRiderRoster = useCallback(async () => {
    try { setRiderRoster(await RiderAPI.adminList()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadAuditLog = useCallback(async () => {
    try { setAuditLog(await AuditAPI.list(30)); } catch (err) { /* non-fatal */ }
  }, []);
  const loadPayouts = useCallback(async () => {
    try { setPayouts(await PayoutAPI.list()); } catch (err) { /* non-fatal */ }
  }, []);
  const loadOperationalIssues = useCallback(async () => {
    try { setOperationalIssues(await OperationalIssueAPI.list()); } catch (err) { /* non-fatal */ }
  }, []);
  useEffect(() => { loadPending(); loadVendorRoster(); loadRiderRoster(); loadAuditLog(); loadPayouts(); loadOperationalIssues(); }, [loadPending, loadVendorRoster, loadRiderRoster, loadAuditLog, loadPayouts, loadOperationalIssues]);

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
        // non-fatal — leave previous results showing
      } finally {
        setSearching(false);
      }
    }, 350); // debounce so we're not hitting the API on every keystroke
    return () => clearTimeout(timeout);
  }, [orderSearch, orderStatusFilter, orderPaymentFilter]);

  const approve = async (id) => { await AuthAPI.approveUser(id); loadPending(); loadVendorRoster(); loadRiderRoster(); loadAuditLog(); };
  const suspendAccount = async (userId) => { await AuthAPI.suspendUser(userId); loadVendorRoster(); loadRiderRoster(); loadAuditLog(); };
  const reactivateAccount = async (userId) => { await AuthAPI.approveUser(userId); loadVendorRoster(); loadRiderRoster(); loadAuditLog(); };

  useEffect(() => {
    const v = vendorRoster.find((v) => v.id === expandedVendorId);
    if (!v) { setVendorProfileDraft(null); setVendorVerificationDraft(null); return; }
    setVendorProfileDraft({
      name: v.name, category: v.category, area: v.area, eta: v.eta,
      contactName: v.owner?.name || v.manager?.name || "", contactPhone: v.owner?.phone || v.manager?.phone || "",
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
      await VendorAPI.adminEditProfile(v.id, { name: vendorProfileDraft.name, category: vendorProfileDraft.category, area: vendorProfileDraft.area, eta: vendorProfileDraft.eta });
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

  const markPayoutPaid = async (id) => { await PayoutAPI.markPaid(id); loadPayouts(); loadAuditLog(); };
  const rejectPayout = async (id) => { await PayoutAPI.reject(id); loadPayouts(); loadAuditLog(); };
  const resolveIssue = async (id) => { await OperationalIssueAPI.resolve(id); loadOperationalIssues(); loadAuditLog(); };
  const resolveDisputeLogged = async (id) => { await resolveDispute(id); loadAuditLog(); };
  const cancelOrderLogged = async (id) => { await cancelOrder(id); loadAuditLog(); };
  const unassignRiderLogged = async (id) => { await unassignRider(id); loadAuditLog(); };

  const toggleRiderExpand = async (riderId) => {
    if (expandedRiderId === riderId) { setExpandedRiderId(null); return; }
    setExpandedRiderId(riderId);
    if (!riderHistory[riderId]) {
      setLoadingRiderHistory(riderId);
      try {
        const data = await OrderAPI.mine({ riderId });
        setRiderHistory((prev) => ({ ...prev, [riderId]: (Array.isArray(data) ? data : []).map(normalizeOrder) }));
      } catch (err) { /* non-fatal */ }
      setLoadingRiderHistory(null);
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const activeOrders = orders.filter((o) => o.status !== "delivered").length;
  const ridersOnline = riderRoster.filter((r) => r.isOnline && r.user?.approved).length;
  const openDisputes = disputes.filter((d) => d.status === "open");
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const openIssues = operationalIssues.filter((i) => i.status === "OPEN");
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved");

  const stats = [
    { label: "Orders today", value: String(orders.length) },
    { label: "In progress", value: String(activeOrders) },
    { label: "Revenue today", value: fmtNaira(totalRevenue) },
    { label: "Riders online", value: String(ridersOnline) },
    { label: "Open disputes", value: String(openDisputes.length) },
    { label: "Vendors", value: String(vendors.length) },
  ];

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1, backgroundColor: COLORS.paper }} contentContainerStyle={{ padding: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "disputes", label: "Disputes", badge: openDisputes.length },
          { key: "issues", label: "Issues", badge: openIssues.length },
          { key: "vendors", label: "Vendors" },
          { key: "riders", label: "Riders" },
          { key: "payouts", label: "Payouts", badge: pendingPayouts.length },
          { key: "orders", label: "Orders" },
          { key: "activity", label: "Activity" },
        ].map((tab) => (
          <Pressable key={tab.key} onPress={() => scrollToSection(tab.key)} style={styles.navPill}>
            <Text style={styles.navPillText}>{tab.label}</Text>
            {!!tab.badge && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View onLayout={onSectionLayout("overview")} />
      <View style={styles.statGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      {pending.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending approvals ({pending.length})</Text>
          <View style={{ marginBottom: 24, gap: 10 }}>
            {pending.map((p) => (
              <View key={p.id} style={styles.pendingCard}>
                <View>
                  <Text style={{ fontWeight: "700", fontSize: 14 }}>{p.name}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.mute }}>{p.email} {"\u00B7"} {p.role}</Text>
                </View>
                <Pressable onPress={() => approve(p.id)} style={styles.approveBtn}>
                  <Text style={styles.resolveBtnText}>Approve</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("disputes")}>Disputes ({openDisputes.length} open)</Text>
      <View style={{ marginBottom: 24, gap: 10 }}>
        {disputes.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No disputes reported yet.</Text>}
        {openDisputes.map((d) => {
          const expanded = expandedDisputeId === d.id;
          return (
            <View key={d.id} style={styles.disputeCard}>
              <Pressable onPress={() => setExpandedDisputeId(expanded ? null : d.id)}>
                <View style={styles.disputeHeader}>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute }}>Order #{d.orderId.slice(-6)}</Text>
                  <Pill tone="chili">OPEN</Pill>
                </View>
                <Text style={{ fontWeight: "700", fontSize: 14 }}>{d.reason}</Text>
                <Text style={{ fontSize: 12.5, color: COLORS.mute, marginBottom: expanded ? 8 : 10 }}>
                  {d.vendorName} {"\u00B7"} {fmtNaira(d.total || 0)} {"\u00B7"} {expanded ? "Hide details \u25B2" : "View details \u25BC"}
                </Text>
              </Pressable>
              {expanded && (
                <View style={styles.disputeDetailBox}>
                  {d.items.length > 0 && (
                    <>
                      <Text style={styles.disputeDetailLabel}>ORDER ITEMS</Text>
                      {d.items.map((i) => (
                        <Text key={i.id} style={styles.disputeDetailItem}>{i.qty} {"\u00D7"} {i.name} — {fmtNaira(i.price * i.qty)}</Text>
                      ))}
                    </>
                  )}
                  {(d.customerName || d.customerPhone) && (
                    <Text style={styles.disputeDetailPerson}>
                      <Text style={{ fontWeight: "700" }}>Customer: </Text>{d.customerName}{d.customerPhone ? ` \u00B7 ${d.customerPhone}` : ""}
                    </Text>
                  )}
                  {(d.riderName || d.riderPhone) && (
                    <Text style={styles.disputeDetailPerson}>
                      <Text style={{ fontWeight: "700" }}>Rider: </Text>{d.riderName}{d.riderPhone ? ` \u00B7 ${d.riderPhone}` : ""}
                    </Text>
                  )}
                </View>
              )}
              <Pressable onPress={() => resolveDisputeLogged(d.id)} style={styles.resolveBtn}>
                <Text style={styles.resolveBtnText}>Mark resolved</Text>
              </Pressable>
            </View>
          );
        })}
        {resolvedDisputes.length > 0 && (
          <>
            <Text style={styles.resolvedLabel}>RESOLVED</Text>
            {resolvedDisputes.map((d) => (
              <View key={d.id} style={styles.resolvedRow}>
                <Text style={{ fontSize: 13, color: COLORS.mute }}>Order #{d.orderId.slice(-6)} {"\u2014"} {d.reason}</Text>
                <Pill tone="green">RESOLVED</Pill>
              </View>
            ))}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("issues")}>Operational issues ({openIssues.length} open)</Text>
      <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: -6, marginBottom: 10 }}>
        App/payment/logistics failures reported by customers or riders {"\u2014"} not tied to a vendor.
      </Text>
      <View style={{ marginBottom: 24, gap: 10 }}>
        {operationalIssues.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No operational issues reported.</Text>}
        {openIssues.map((i) => (
          <View key={i.id} style={styles.disputeCard}>
            <View style={styles.disputeHeader}>
              <Text style={{ fontSize: 12.5, color: COLORS.mute }}>
                {i.reporter?.name} ({i.reporter?.role?.toLowerCase()}) {i.orderId ? ` \u00B7 Order #${i.orderId.slice(-6)}` : ""}
              </Text>
              <Pill tone="chili">OPEN</Pill>
            </View>
            <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 8 }}>{i.reason}</Text>
            {i.order && (
              <View style={styles.issueOrderBox}>
                <Text style={{ fontSize: 12, color: COLORS.mute }}>{i.order.vendor?.name}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: COLORS.ink, marginTop: 4 }}>
                  {i.order.customer?.name || "Guest"}{i.order.deliveryPhone ? ` \u00B7 ${i.order.deliveryPhone}` : ""}
                </Text>
                {i.order.deliveryAddress && (
                  <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}>{"\uD83D\uDCCD"} {i.order.deliveryAddress}</Text>
                )}
              </View>
            )}
            <Pressable onPress={() => resolveIssue(i.id)} style={styles.resolveBtn}>
              <Text style={styles.resolveBtnText}>Mark resolved</Text>
            </Pressable>
          </View>
        ))}
        {operationalIssues.filter((i) => i.status !== "OPEN").length > 0 && (
          <>
            <Text style={styles.resolvedLabel}>RESOLVED</Text>
            {operationalIssues.filter((i) => i.status !== "OPEN").map((i) => (
              <View key={i.id} style={styles.resolvedRow}>
                <Text style={{ fontSize: 13, color: COLORS.mute }}>{i.reporter?.name} {"\u2014"} {i.reason}</Text>
                <Pill tone="green">RESOLVED</Pill>
              </View>
            ))}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("vendors")}>Vendors ({vendorRoster.length})</Text>
      <View style={{ marginBottom: 24, gap: 8 }}>
        {vendorRoster.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No vendors yet.</Text>}
        {vendorRoster.map((v) => {
          const vOrders = orders.filter((o) => o.vendor.id === v.id);
          const expanded = expandedVendorId === v.id;
          const suspended = !v.isActive;
          const contact = v.owner || v.manager;
          const contactLabel = v.owner ? "Owner" : "Manager";
          return (
            <View key={v.id} style={[styles.rosterCard, suspended && styles.rosterCardSuspended]}>
              <Pressable onPress={() => setExpandedVendorId(expanded ? null : v.id)} style={styles.rosterRow}>
                <View>
                  <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{v.name}{suspended ? " \u2014 Suspended" : ""}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.mute }}>{v.category} {"\u00B7"} {v.area} {"\u00B7"} {vOrders.length} orders</Text>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.mute }}>{v.isOpen ? "\u25CF Open" : "\u25CB Closed"}</Text>
              </Pressable>
              {expanded && (
                <View style={styles.rosterExpanded}>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute, flex: 1 }}>
                    {contactLabel}: {contact?.name || "\u2014"}{contact?.phone ? ` \u00B7 ${contact.phone}` : ""}
                  </Text>
                  {contact && (
                    <Pressable
                      onPress={() => (suspended ? reactivateAccount(contact.id) : suspendAccount(contact.id))}
                      style={[styles.suspendBtn, { backgroundColor: suspended ? COLORS.green : COLORS.chili }]}
                    >
                      <Text style={styles.resolveBtnText}>{suspended ? "Reactivate" : "Suspend"}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {expanded && vendorProfileDraft && (
                <View style={styles.editCard}>
                  <Text style={styles.editCardTitle}>EDIT PROFILE</Text>
                  <TextInput value={vendorProfileDraft.name} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, name: t }))} placeholder="Store name" style={styles.miniInput} />
                  <TextInput value={vendorProfileDraft.category} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, category: t }))} placeholder="Category" style={styles.miniInput} />
                  <TextInput value={vendorProfileDraft.area} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, area: t }))} placeholder="Area" style={styles.miniInput} />
                  <TextInput value={vendorProfileDraft.eta} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, eta: t }))} placeholder="Delivery ETA" style={styles.miniInput} />
                  <TextInput value={vendorProfileDraft.contactName} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, contactName: t }))} placeholder={`${contactLabel} name`} style={styles.miniInput} />
                  <TextInput value={vendorProfileDraft.contactPhone} onChangeText={(t) => setVendorProfileDraft((d) => ({ ...d, contactPhone: t }))} placeholder={`${contactLabel} phone`} style={styles.miniInput} />
                  <Pressable disabled={savingVendorProfile} onPress={() => saveVendorProfile(v)} style={[styles.suspendBtn, { backgroundColor: COLORS.ink, alignSelf: "flex-start" }]}>
                    <Text style={styles.resolveBtnText}>{savingVendorProfile ? "Saving\u2026" : "Save profile"}</Text>
                  </Pressable>
                </View>
              )}
              {expanded && vendorVerificationDraft && (
                <View style={styles.editCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={styles.editCardTitle}>VERIFICATION</Text>
                    <Pill tone={v.verified ? "green" : "chili"}>{v.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                  </View>
                  <TextInput value={vendorVerificationDraft.businessRegNumber} onChangeText={(t) => setVendorVerificationDraft((d) => ({ ...d, businessRegNumber: t }))} placeholder="Business reg. number (CAC)" style={styles.miniInput} />
                  <TextInput value={vendorVerificationDraft.ownerIdType} onChangeText={(t) => setVendorVerificationDraft((d) => ({ ...d, ownerIdType: t }))} placeholder="Owner ID type (e.g. NIN)" style={styles.miniInput} />
                  <TextInput value={vendorVerificationDraft.ownerIdNumber} onChangeText={(t) => setVendorVerificationDraft((d) => ({ ...d, ownerIdNumber: t }))} placeholder="ID number" style={styles.miniInput} />
                  <TextInput
                    value={vendorVerificationDraft.verificationNotes} onChangeText={(t) => setVendorVerificationDraft((d) => ({ ...d, verificationNotes: t }))}
                    placeholder="Notes \u2014 how/when this was checked" multiline numberOfLines={2}
                    style={[styles.miniInput, { minHeight: 50, textAlignVertical: "top" }]}
                  />
                  <Pressable
                    onPress={() => setVendorVerificationDraft((d) => ({ ...d, verified: !d.verified }))}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}
                  >
                    <View style={[styles.checkbox, vendorVerificationDraft.verified && styles.checkboxChecked]} />
                    <Text style={{ fontSize: 12.5 }}>Mark as verified</Text>
                  </Pressable>
                  <Pressable disabled={savingVendorVerification} onPress={() => saveVendorVerification(v)} style={[styles.suspendBtn, { backgroundColor: COLORS.indigo, alignSelf: "flex-start" }]}>
                    <Text style={styles.resolveBtnText}>{savingVendorVerification ? "Saving\u2026" : "Save verification"}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("riders")}>Riders ({riderRoster.length})</Text>
      <View style={{ marginBottom: 24, gap: 8 }}>
        {riderRoster.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No riders yet.</Text>}
        {riderRoster.map((r) => {
          const expanded = expandedRiderId === r.id;
          const suspended = !r.user?.approved;
          const history = riderHistory[r.id] || [];
          const delivered = history.filter((o) => o.status === "delivered");
          const active = history.filter((o) => o.status === "ready" || o.status === "picked_up");
          const earnings = delivered.length * 600;
          const loading = loadingRiderHistory === r.id;
          return (
            <View key={r.id} style={[styles.rosterCard, suspended && styles.rosterCardSuspended]}>
              <Pressable onPress={() => toggleRiderExpand(r.id)} style={styles.rosterRow}>
                <View>
                  <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{r.user?.name}{suspended ? " \u2014 Suspended" : ""}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.mute }}>{r.zone} {"\u00B7"} {"\u2605"} {r.rating}</Text>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.mute }}>{r.isOnline ? "\u25CF Online" : "\u25CB Offline"}</Text>
              </Pressable>
              {expanded && (
                <View style={styles.rosterExpanded}>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute, flex: 1 }}>{r.user?.phone || "\u2014"}</Text>
                  {r.user && (
                    <Pressable
                      onPress={() => (suspended ? reactivateAccount(r.user.id) : suspendAccount(r.user.id))}
                      style={[styles.suspendBtn, { backgroundColor: suspended ? COLORS.green : COLORS.chili }]}
                    >
                      <Text style={styles.resolveBtnText}>{suspended ? "Reactivate" : "Suspend"}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {expanded && riderProfileDraft && (
                <View style={styles.editCard}>
                  <Text style={styles.editCardTitle}>EDIT PROFILE</Text>
                  <TextInput value={riderProfileDraft.name} onChangeText={(t) => setRiderProfileDraft((d) => ({ ...d, name: t }))} placeholder="Name" style={styles.miniInput} />
                  <TextInput value={riderProfileDraft.phone} onChangeText={(t) => setRiderProfileDraft((d) => ({ ...d, phone: t }))} placeholder="Phone" style={styles.miniInput} />
                  <TextInput value={riderProfileDraft.zone} onChangeText={(t) => setRiderProfileDraft((d) => ({ ...d, zone: t }))} placeholder="Zone" style={styles.miniInput} />
                  <Pressable disabled={savingRiderProfile} onPress={() => saveRiderProfile(r)} style={[styles.suspendBtn, { backgroundColor: COLORS.ink, alignSelf: "flex-start" }]}>
                    <Text style={styles.resolveBtnText}>{savingRiderProfile ? "Saving\u2026" : "Save profile"}</Text>
                  </Pressable>
                </View>
              )}
              {expanded && riderVerificationDraft && (
                <View style={styles.editCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={styles.editCardTitle}>VERIFICATION</Text>
                    <Pill tone={r.verified ? "green" : "chili"}>{r.verified ? "VERIFIED" : "UNVERIFIED"}</Pill>
                  </View>
                  <TextInput value={riderVerificationDraft.idType} onChangeText={(t) => setRiderVerificationDraft((d) => ({ ...d, idType: t }))} placeholder="ID type (e.g. NIN)" style={styles.miniInput} />
                  <TextInput value={riderVerificationDraft.idNumber} onChangeText={(t) => setRiderVerificationDraft((d) => ({ ...d, idNumber: t }))} placeholder="ID number" style={styles.miniInput} />
                  <TextInput
                    value={riderVerificationDraft.verificationNotes} onChangeText={(t) => setRiderVerificationDraft((d) => ({ ...d, verificationNotes: t }))}
                    placeholder="Notes \u2014 how/when this was checked" multiline numberOfLines={2}
                    style={[styles.miniInput, { minHeight: 50, textAlignVertical: "top" }]}
                  />
                  <Pressable
                    onPress={() => setRiderVerificationDraft((d) => ({ ...d, verified: !d.verified }))}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}
                  >
                    <View style={[styles.checkbox, riderVerificationDraft.verified && styles.checkboxChecked]} />
                    <Text style={{ fontSize: 12.5 }}>Mark as verified</Text>
                  </Pressable>
                  <Pressable disabled={savingRiderVerification} onPress={() => saveRiderVerification(r)} style={[styles.suspendBtn, { backgroundColor: COLORS.indigo, alignSelf: "flex-start" }]}>
                    <Text style={styles.resolveBtnText}>{savingRiderVerification ? "Saving\u2026" : "Save verification"}</Text>
                  </Pressable>
                </View>
              )}
              {expanded && (
                <View style={{ marginTop: 10 }}>
                  {loading ? (
                    <Text style={{ fontSize: 12.5, color: COLORS.mute }}>Loading history\u2026</Text>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                        <View style={styles.riderStatBox}>
                          <Text style={styles.riderStatValue}>{delivered.length}</Text>
                          <Text style={styles.riderStatLabel}>Delivered</Text>
                        </View>
                        <View style={styles.riderStatBox}>
                          <Text style={[styles.riderStatValue, { color: COLORS.mango }]}>{fmtNaira(earnings)}</Text>
                          <Text style={styles.riderStatLabel}>Earned</Text>
                        </View>
                        <View style={styles.riderStatBox}>
                          <Text style={[styles.riderStatValue, { color: active.length ? COLORS.chili : COLORS.mute }]}>{active.length}</Text>
                          <Text style={styles.riderStatLabel}>Active now</Text>
                        </View>
                      </View>
                      <Text style={styles.riderHistoryLabel}>DELIVERY HISTORY ({delivered.length})</Text>
                      {delivered.length === 0 ? (
                        <Text style={{ fontSize: 12.5, color: COLORS.mute }}>No deliveries yet.</Text>
                      ) : (
                        [...delivered].reverse().slice(0, 10).map((o) => (
                          <View key={o.id} style={styles.riderHistoryRow}>
                            <Text style={{ fontSize: 12, color: COLORS.mute }}>#{o.id.slice(-6)} {"\u2014"} {o.vendor.name}</Text>
                            <Text style={{ fontSize: 12, color: COLORS.mute }}>{fmtNaira(o.total)}</Text>
                          </View>
                        ))
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("payouts")}>Payouts ({pendingPayouts.length} pending)</Text>
      <View style={{ marginBottom: 24, gap: 10 }}>
        {payouts.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No withdrawal requests yet.</Text>}
        {pendingPayouts.map((p) => (
          <View key={p.id} style={styles.payoutCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontWeight: "700", fontSize: 14 }}>{p.rider?.user?.name}</Text>
              <Text style={{ fontSize: 15, fontWeight: "800" }}>{fmtNaira(p.amount)}</Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.mute, marginBottom: 10 }}>
              {p.rider?.bankAccountName} {"\u00B7"} {p.rider?.bankName} {"\u00B7"} {p.rider?.bankAccountNumber}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => markPayoutPaid(p.id)} style={[styles.suspendBtn, { backgroundColor: COLORS.green }]}>
                <Text style={styles.resolveBtnText}>Mark paid</Text>
              </Pressable>
              <Pressable onPress={() => rejectPayout(p.id)} style={[styles.suspendBtn, { backgroundColor: COLORS.chili }]}>
                <Text style={styles.resolveBtnText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {payouts.filter((p) => p.status !== "PENDING").length > 0 && (
          <>
            <Text style={styles.resolvedLabel}>HISTORY</Text>
            {payouts.filter((p) => p.status !== "PENDING").map((p) => (
              <View key={p.id} style={styles.resolvedRow}>
                <Text style={{ fontSize: 13, color: COLORS.mute }}>{p.rider?.user?.name} {"\u2014"} {fmtNaira(p.amount)}</Text>
                <Pill tone={p.status === "PAID" ? "green" : "chili"}>{p.status}</Pill>
              </View>
            ))}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("orders")}>All orders</Text>
      <TextInput
        value={orderSearch}
        onChangeText={setOrderSearch}
        placeholder="Search by order #, customer, phone, or vendor"
        style={styles.searchInput}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
        {["all", ...STATUS_FLOW, "cancelled"].map((s) => (
          <Pressable key={s} onPress={() => setOrderStatusFilter(s)} style={[styles.filterChip, orderStatusFilter === s && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, orderStatusFilter === s && styles.filterChipTextActive]}>
              {s === "all" ? "All statuses" : (STATUS_LABEL[s] || s)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
        {[{ key: "all", label: "All payments" }, { key: "paid", label: "Paid" }, { key: "pending", label: "Unpaid" }, { key: "refunded", label: "Refunded" }].map((f) => (
          <Pressable key={f.key} onPress={() => setOrderPaymentFilter(f.key)} style={[styles.filterChip, orderPaymentFilter === f.key && styles.filterChipActiveIndigo]}>
            <Text style={[styles.filterChipText, orderPaymentFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {searchResults !== null && (
        <Text style={styles.resultsCount}>
          {searching ? "Searching\u2026" : `${searchResults.length} of ${orders.length} orders`}
        </Text>
      )}
      <FlatList
        data={searchResults !== null ? searchResults : [...orders].reverse()}
        keyExtractor={(o) => o.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={<Text style={{ color: COLORS.mute, fontSize: 13.5 }}>{searchResults !== null ? "No orders match your search/filters." : "No orders placed yet."}</Text>}
        renderItem={({ item: o }) => {
          const expanded = expandedOrderId === o.id;
          const canCancel = ["placed", "accepted", "ready", "picked_up"].includes(o.status);
          const canReassign = o.status === "ready" && !!o.riderId;
          const hasActions = canCancel || canReassign;
          return (
            <View style={styles.orderRowExpandable}>
              <Pressable onPress={() => setExpandedOrderId(expanded ? null : o.id)} style={styles.orderRow}>
                <View>
                  <Text style={{ fontSize: 12 }}>#{o.id.slice(-6)}</Text>
                  <Text style={{ fontSize: 12.5, color: COLORS.mute }}>{o.vendor.name}{o.customerName ? ` \u00B7 ${o.customerName}` : ""}{o.riderName ? ` \u00B7 ${o.riderName}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: "700" }}>{fmtNaira(o.total)}</Text>
                  <StatusPill status={o.status} />
                </View>
              </Pressable>
              {expanded && (
                <View style={styles.orderDetailBox}>
                  <Text style={styles.orderDetailLabel}>ITEMS</Text>
                  {o.items.map((i) => (
                    <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 12.5, color: COLORS.ink }}>{i.qty} {"\u00D7"} {i.name}</Text>
                      <Text style={{ fontSize: 12.5, color: COLORS.ink }}>{fmtNaira(i.price * i.qty)}</Text>
                    </View>
                  ))}
                  <Text style={styles.orderDetailPerson}>
                    <Text style={{ fontWeight: "700" }}>Customer: </Text>{o.customerName || "Guest"}{o.deliveryPhone ? ` \u00B7 ${o.deliveryPhone}` : ""}
                  </Text>
                  {o.deliveryAddress && (
                    <Text style={styles.orderDetailPerson}>
                      <Text style={{ fontWeight: "700" }}>Delivery: </Text>{o.deliveryAddress}
                    </Text>
                  )}
                  {o.riderName && (
                    <Text style={styles.orderDetailPerson}>
                      <Text style={{ fontWeight: "700" }}>Rider: </Text>{o.riderName}
                    </Text>
                  )}
                  {o.cancelReason && (
                    <Text style={[styles.orderDetailPerson, { color: COLORS.chili }]}>
                      <Text style={{ fontWeight: "700" }}>Decline reason: </Text>{o.cancelReason}
                    </Text>
                  )}
                  {hasActions && (
                    <View style={styles.orderActions}>
                      {canReassign && (
                        <Pressable onPress={() => { unassignRiderLogged(o.id); setExpandedOrderId(null); }} style={[styles.suspendBtn, { backgroundColor: COLORS.mango }]}>
                          <Text style={styles.resolveBtnText}>Release rider</Text>
                        </Pressable>
                      )}
                      {canCancel && (
                        <Pressable onPress={() => { cancelOrderLogged(o.id); setExpandedOrderId(null); }} style={[styles.suspendBtn, { backgroundColor: COLORS.chili }]}>
                          <Text style={styles.resolveBtnText}>{o.paymentStatus === "paid" ? "Cancel & refund" : "Cancel order"}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      <Text style={styles.sectionTitle} onLayout={onSectionLayout("activity")}>Activity log</Text>
      <View style={{ gap: 6, marginTop: 4 }}>
        {auditLog.length === 0 && <Text style={{ color: COLORS.mute, fontSize: 13.5 }}>No admin actions recorded yet.</Text>}
        {auditLog.map((entry) => (
          <View key={entry.id} style={styles.auditRow}>
            <Text style={{ fontSize: 12.5, color: COLORS.mute }}>
              <Text style={{ color: COLORS.ink, fontWeight: "700" }}>{entry.actorName}</Text> {entry.action.toLowerCase()} <Text style={{ color: COLORS.ink, fontWeight: "700" }}>{entry.targetLabel}</Text>
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, width: "47%" },
  statLabel: { fontSize: 10.5, color: COLORS.mute, marginBottom: 6, letterSpacing: 0.3 },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: COLORS.ink },
  pendingCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFF1DA", borderWidth: 1, borderColor: COLORS.mango, borderRadius: 12, padding: 12,
  },
  approveBtn: { backgroundColor: COLORS.mango, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  disputeCard: { backgroundColor: "#FCE8E6", borderWidth: 1, borderColor: COLORS.chili, borderRadius: 12, padding: 14 },
  disputeDetailBox: { backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 10 },
  disputeDetailLabel: { fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 4 },
  disputeDetailItem: { fontSize: 12.5, color: COLORS.mute },
  disputeDetailPerson: { fontSize: 12.5, color: COLORS.mute, marginTop: 6 },
  issueOrderBox: { backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 10 },
  disputeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  resolveBtn: { backgroundColor: COLORS.ink, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  resolveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  resolvedLabel: { fontSize: 11, color: COLORS.mute, letterSpacing: 0.5, marginTop: 4 },
  resolvedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rosterCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12 },
  rosterCardSuspended: { backgroundColor: "#FCE8E6", borderColor: COLORS.chili },
  rosterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rosterExpanded: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line, borderStyle: "dashed",
  },
  suspendBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  editCard: { backgroundColor: COLORS.paper, borderRadius: 10, padding: 12, marginTop: 8, gap: 6 },
  editCardTitle: { fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 4 },
  miniInput: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 12.5, color: COLORS.ink, backgroundColor: "#fff",
  },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: "#fff" },
  checkboxChecked: { backgroundColor: COLORS.indigo, borderColor: COLORS.indigo },
  payoutCard: { backgroundColor: "#FFF1DA", borderWidth: 1, borderColor: COLORS.mango, borderRadius: 12, padding: 14 },
  riderStatBox: { flex: 1, backgroundColor: COLORS.paper, borderRadius: 10, padding: 10 },
  riderStatValue: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  riderStatLabel: { fontSize: 10.5, color: COLORS.mute, marginTop: 2 },
  riderHistoryLabel: { fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 },
  riderHistoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  searchInput: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13.5, color: COLORS.ink, backgroundColor: COLORS.panel, marginBottom: 10,
  },
  filterChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper },
  filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterChipActiveIndigo: { backgroundColor: COLORS.indigo, borderColor: COLORS.indigo },
  filterChipText: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink },
  filterChipTextActive: { color: "#fff" },
  resultsCount: { fontSize: 11, color: COLORS.mute, marginBottom: 8, letterSpacing: 0.3 },
  orderRowExpandable: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 10,
  },
  orderDetailBox: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.mute, borderStyle: "dashed",
  },
  orderDetailLabel: { fontSize: 10.5, color: COLORS.mute, letterSpacing: 0.3, marginBottom: 6 },
  orderDetailPerson: { fontSize: 12.5, color: COLORS.mute, marginTop: 6 },
  orderActions: {
    flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line, borderStyle: "dashed",
  },
  orderRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  auditRow: {
    borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 6,
  },
  navPill: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.panel,
    borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.line,
  },
  navPillText: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
  navBadge: {
    backgroundColor: COLORS.chili, borderRadius: 10, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  navBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
