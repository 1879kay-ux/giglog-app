// app/tours/[id]/assign.tsx
// Bulk line-up assignment. Only the Add missing people mode can write.
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
type Mode = "add" | "update" | "replace";
type Tour = { tour_id: string; tour_name: string; band_id: string; act_id: string };
type Gig = { event_id: string; event_date: string; event_status: string; venues: { event_venue_name: string | null } | null };
type TourMember = { tour_member_id: string; member_id: string };
type Role = { member_id: string; capability_id: string };
type EventAssignment = { event_id: string; member_id: string };
type EventRole = { event_id: string; member_id: string; capability_id: string };
type Availability = { event_id: string; member_id: string; status: string | null };
type Person = { member_id: string; display_name: string | null };
type ResponseCounts = { available: number; maybe: number; unavailable: number; awaiting: number };
type Diff = { event: Gig; additions: string[]; roleUpdates: string[]; extra: string[]; protectedExtras: string[]; unconfirmedExtras: string[]; responses: ResponseCounts };
const MODES: { key: Mode; titleKey: string; noteKey: string }[] = [
  { key: "add", titleKey: "tours.addMissingPeople", noteKey: "tours.addMissingPeopleNote" },
  { key: "update", titleKey: "tours.updateMatchingRoles", noteKey: "tours.updateMatchingRolesNote" },
  { key: "replace", titleKey: "tours.replaceEventLineup", noteKey: "tours.replaceEventLineupNote" },
];
function dateLabel(value: string, language: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}
function roleSignature(roles: string[]) { return [...new Set(roles)].sort().join("|"); }
export default function TourAssignmentPreview() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();
  const canManage = isAdmin && adminModeEnabled;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [events, setEvents] = useState<Gig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("add");
  const [tourMembers, setTourMembers] = useState<TourMember[]>([]);
  const [tourRoles, setTourRoles] = useState<Role[]>([]);
  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>([]);
  const [eventRoles, setEventRoles] = useState<EventRole[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const load = useCallback(async () => {
    if (!tourId || !bandId) { setError(t("tours.unavailableTour")); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data: tourData, error: tourError } = await supabase.from("tours")
        .select("tour_id,tour_name,band_id,act_id").eq("tour_id", tourId).eq("band_id", bandId).single();
      if (tourError) throw tourError;
      const currentTour = tourData as Tour;
      const [gigsResult, membersResult, peopleResult] = await Promise.all([
        supabase.from("events").select("event_id,event_date,event_status,venues:venue_id(event_venue_name)")
          .eq("tour_id", tourId).eq("band_id", bandId).order("event_date"),
        supabase.from("tour_members").select("tour_member_id,member_id").eq("tour_id", tourId),
        supabase.from("band_members").select("member_id,display_name").eq("band_id", bandId),
      ]);
      if (gigsResult.error) throw gigsResult.error;
      if (membersResult.error) throw membersResult.error;
      if (peopleResult.error) throw peopleResult.error;
      const gigs = ((gigsResult.data ?? []) as unknown as Gig[]).filter(e => e.event_status?.toLowerCase() !== "deleted");
      const members = (membersResult.data ?? []) as TourMember[];
      const gigIds = gigs.map(g => g.event_id);
      const memberIds = members.map(m => m.tour_member_id);
      const [tourCapResult, eventMemberResult, eventCapResult, availabilityResult] = await Promise.all([
        memberIds.length ? supabase.from("tour_member_capabilities").select("tour_member_id,capability_id").in("tour_member_id", memberIds) : Promise.resolve({ data: [], error: null }),
        gigIds.length ? supabase.from("event_members").select("event_id,member_id").in("event_id", gigIds) : Promise.resolve({ data: [], error: null }),
        gigIds.length ? supabase.from("event_member_capabilities").select("event_id,member_id,capability_id").in("event_id", gigIds) : Promise.resolve({ data: [], error: null }),
        gigIds.length ? supabase.from("event_availability").select("event_id,member_id,status").in("event_id", gigIds) : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [tourCapResult, eventMemberResult, eventCapResult, availabilityResult]) {
        if (result.error) throw result.error;
      }
      const byTourMemberId = new Map(members.map(m => [m.tour_member_id, m.member_id]));
      const mappedRoles: Role[] = (tourCapResult.data ?? []).flatMap((r: any) => {
        const memberId = byTourMemberId.get(r.tour_member_id);
        return memberId ? [{ member_id: memberId, capability_id: r.capability_id }] : [];
      });
      setTour(currentTour); setEvents(gigs); setTourMembers(members); setTourRoles(mappedRoles);
      setEventAssignments((eventMemberResult.data ?? []) as EventAssignment[]);
      setEventRoles((eventCapResult.data ?? []) as EventRole[]);
      setAvailability((availabilityResult.data ?? []) as Availability[]);
      setPeople((peopleResult.data ?? []) as Person[]);
      // Keep previously chosen events when reloading; default to all on first load.
      setSelectedIds(current => current.length ? current.filter(id => gigIds.includes(id)) : gigIds);
    } catch (e: any) {
      console.log("tour bulk preview load error", e);
      setError(e?.message ?? t("tours.loadAssignmentError"));
    } finally { setLoading(false); }
  }, [tourId, bandId, t]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const names = useMemo(() => new Map(people.map(p => [p.member_id, p.display_name || t("tours.unknownMember")])), [people, t]);
  const display = (ids: string[]) => ids.map(id => names.get(id) ?? t("tours.unknownMember")).sort((a,b) => a.localeCompare(b)).join(", ");
  const diffs = useMemo<Diff[]>(() => events.filter(g => selectedIds.includes(g.event_id)).map(event => {
    const assigned = new Set(eventAssignments.filter(a => a.event_id === event.event_id).map(a => a.member_id));
    const tourSet = new Set(tourMembers.map(m => m.member_id));
    const additions = [...tourSet].filter(id => !assigned.has(id));
    const roleUpdates = [...tourSet].filter(id => assigned.has(id) &&
      roleSignature(tourRoles.filter(r => r.member_id === id).map(r => r.capability_id)) !==
      roleSignature(eventRoles.filter(r => r.event_id === event.event_id && r.member_id === id).map(r => r.capability_id)));
    const extra = [...assigned].filter(id => !tourSet.has(id));
    // Count actual responses from assigned Event members, not all availability rows.
    // This is independent of whether anyone is at risk in replacement mode.
    const statuses = new Map(availability.filter(a => a.event_id === event.event_id)
      .map(a => [a.member_id, (a.status ?? "").trim().toLowerCase()]));
    const responses: ResponseCounts = { available: 0, maybe: 0, unavailable: 0, awaiting: 0 };
    for (const id of assigned) {
      const status = statuses.get(id);
      if (status === "available") responses.available++;
      else if (status === "maybe") responses.maybe++;
      else if (status === "not available" || status === "not_available" || status === "unavailable") responses.unavailable++;
      else responses.awaiting++;
    }
    const protectedExtras = extra.filter(id => {
      const status = statuses.get(id);
      return status === "available" || status === "maybe" || status === "not available" || status === "not_available" || status === "unavailable";
    });
    return { event, additions, roleUpdates, extra, protectedExtras, unconfirmedExtras: extra.filter(id => !protectedExtras.includes(id)), responses };
  }), [events, selectedIds, eventAssignments, tourMembers, tourRoles, eventRoles, availability]);
  const selectedCount = selectedIds.length;
  const totals = diffs.reduce((acc, d) => ({ add: acc.add + d.additions.length, update: acc.update + d.roleUpdates.length, protected: acc.protected + d.protectedExtras.length, review: acc.review + d.unconfirmedExtras.length }), { add: 0, update: 0, protected: 0, review: 0 });
  const toggleEvent = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);

  function confirmAddMissing() {
    if (saving || loading || !canManage || mode !== "add" || !tourId || !bandId) return;
    if (!diffs.length) {
      Alert.alert(t("tours.selectEvents"), t("tours.selectAtLeastOneEvent"));
      return;
    }
    if (!totals.add) {
      Alert.alert(t("tours.nothingToAdd"), t("tours.allMembersAlreadyAssigned"));
      return;
    }
    const missingWithoutRoles = diffs.flatMap(d => d.additions.filter(id =>
      !tourRoles.some(r => r.member_id === id)));
    if (missingWithoutRoles.length) {
      Alert.alert(t("tours.rolesRequired"), t("tours.assignRolesBeforeEvents"));
      return;
    }
    Alert.alert(
      t("tours.addMembersToEventsTitle"),
      t(totals.add === 1 ? "tours.addMembersToEventsMessage_one" : "tours.addMembersToEventsMessage_other", {
        assignments: totals.add,
        events: diffs.length,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("tours.addMissingPeople"), onPress: () => { void applyAddMissing(); } },
      ],
    );
  }

  async function applyAddMissing() {
    if (saving || !canManage || mode !== "add" || !tourId || !bandId) return;
    setSaving(true);
    let added = 0;
    let skipped = 0;
    const failures: string[] = [];
    try {
      // Reload Tour membership at the time of saving rather than trusting the preview.
      const { data: freshMembers, error: membersError } = await supabase
        .from("tour_members").select("tour_member_id,member_id").eq("tour_id", tourId);
      if (membersError) throw membersError;
      const currentMembers = (freshMembers ?? []) as TourMember[];
      if (!currentMembers.length) throw new Error(t("tours.lineupNoLongerAvailable"));
      const { data: freshRoles, error: rolesError } = await supabase
        .from("tour_member_capabilities")
        .select("tour_member_id,capability_id")
        .in("tour_member_id", currentMembers.map(m => m.tour_member_id));
      if (rolesError) throw rolesError;
      const rolesByAssignment = new Map<string, string[]>();
      for (const r of (freshRoles ?? [])) {
        rolesByAssignment.set(r.tour_member_id, [...(rolesByAssignment.get(r.tour_member_id) ?? []), r.capability_id]);
      }
      for (const selectedEvent of diffs) {
        const eventName = selectedEvent.event.venues?.event_venue_name || selectedEvent.event.event_date;
        try {
          // Make sure the event is still eligible and attached to this Tour and Act.
          const { data: currentEvent, error: eventError } = await supabase.from("events")
            .select("event_id,tour_id,band_id,act_id,event_status")
            .eq("event_id", selectedEvent.event.event_id).single();
          if (eventError) throw eventError;
          if (!currentEvent || currentEvent.tour_id !== tourId || currentEvent.band_id !== bandId ||
              currentEvent.act_id !== tour?.act_id ||
              currentEvent.event_status?.toLowerCase() === "deleted") {
            throw new Error(t("tours.eventNoLongerEligible"));
          }
          const { data: currentAssignments, error: assignedError } = await supabase.from("event_members")
            .select("member_id").eq("event_id", currentEvent.event_id);
          if (assignedError) throw assignedError;
          const existing = new Set((currentAssignments ?? []).map(m => m.member_id));
          for (const member of currentMembers) {
            if (existing.has(member.member_id)) { skipped++; continue; }
            const roleIds = [...new Set(rolesByAssignment.get(member.tour_member_id) ?? [])];
            if (!roleIds.length) {
              failures.push(`${eventName}: ${names.get(member.member_id) ?? t("tours.unknownMember")} ${t("tours.memberHasNoRoles")}`);
              continue;
            }
            try {
              const { error: addError } = await supabase.from("event_members")
                .insert({ event_id: currentEvent.event_id, member_id: member.member_id });
              if (addError) {
                if (addError.code === "23505") { skipped++; continue; }
                throw addError;
              }
              // Retain the new assignment if a subsequent request fails, so any
              // availability response created concurrently cannot be destroyed.
              added++;
              existing.add(member.member_id);
              const { error: capError } = await supabase.from("event_member_capabilities")
                .insert(roleIds.map(capability_id => ({ event_id: currentEvent.event_id, member_id: member.member_id, capability_id })));
              if (capError) throw capError;
              const { error: availError } = await supabase.from("event_availability")
                .upsert({ event_id: currentEvent.event_id, member_id: member.member_id, status: null },
                  { onConflict: "event_id,member_id", ignoreDuplicates: true });
              if (availError) throw availError;
            } catch (err: any) {
              failures.push(`${eventName} / ${names.get(member.member_id) ?? t("tours.unknownMember")}: ${err?.message ?? t("tours.unknownError")}`);
            }
          }
        } catch (err: any) {
          failures.push(`${eventName}: ${err?.message ?? t("tours.unableToUpdateEvent")}`);
        }
      }
      await load();
      const message = t(added === 1 ? "tours.assignmentsCreated_one" : "tours.assignmentsCreated_other", { count: added, skipped }) +
        (failures.length ? t(failures.length === 1 ? "tours.assignmentIssues_one" : "tours.assignmentIssues_other", { count: failures.length, issues: failures.slice(0, 4).join("\n") }) :
          t("tours.availabilityPreserved"));
      Alert.alert(failures.length ? t("tours.completedWithIssues") : t("tours.assignmentsComplete"), message);
    } catch (err: any) {
      Alert.alert(t("tours.applyAssignmentsError"), err?.message ?? t("tours.tryAgain"));
      await load();
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Stack.Screen options={{ title: t("tours.assignmentPreviewTitle"), headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff", headerLeft: () => <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 8 }}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable> }} />
    {loading ? <View style={styles.center}><ActivityIndicator /></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()} style={styles.action}><Text style={styles.actionText}>{t("tours.tryAgain")}</Text></Pressable></View> :
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{tour?.tour_name ?? t("tours.title")}</Text>
        <Text style={styles.info}>{t("tours.assignmentInfo")}</Text>
        {!canManage ? <Text style={styles.warning}>{t("tours.adminModeRequiredAssignment")}</Text> : null}
        <Text style={styles.section}>{t("tours.selectTourEvents")}</Text>
        <View style={styles.card}>
          <Pressable disabled={saving} onPress={() => setSelectedIds(selectedCount === events.length ? [] : events.map(e => e.event_id))} style={styles.selectAll}>
            <Text style={styles.link}>{selectedCount === events.length ? t("tours.deselectAll") : t("tours.selectAll")}</Text>
            <Text style={styles.muted}>{t(selectedCount === 1 ? "tours.selectedEventCount_one" : "tours.selectedEventCount_other", { selected: selectedCount, total: events.length })}</Text>
          </Pressable>
          {events.map(e => <Pressable key={e.event_id} disabled={saving} onPress={() => toggleEvent(e.event_id)} style={styles.item}>
            <Ionicons name={selectedIds.includes(e.event_id) ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.name}>{e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text><Text style={styles.muted}>{dateLabel(e.event_date, i18n.language)}</Text></View>
          </Pressable>)}
          {!events.length ? <Text style={styles.muted}>{t("tours.noEligibleEvents")}</Text> : null}
        </View>
        <Text style={styles.section}>{t("tours.chooseAssignmentMode")}</Text>
        <View style={styles.card}>{MODES.map(option => <Pressable key={option.key} disabled={saving} onPress={() => setMode(option.key)} style={styles.item}>
          <Ionicons name={mode === option.key ? "radio-button-on" : "radio-button-off"} size={23} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.name}>{t(option.titleKey)}</Text><Text style={styles.muted}>{t(option.noteKey)}</Text></View>
        </Pressable>)}</View>
        <Text style={styles.section}>{t("tours.previewChanges")}</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{t("tours.previewCounts", { events: selectedCount, people: tourMembers.length })}</Text>
          <Text style={styles.muted}>{t(totals.add === 1 ? "tours.newEventAssignments_one" : "tours.newEventAssignments_other", { count: totals.add })}</Text>
          {mode !== "add" ? <Text style={styles.muted}>{t(totals.update === 1 ? "tours.differingRoleMembers_one" : "tours.differingRoleMembers_other", { count: totals.update })}</Text> : null}
          {mode === "replace" ? <><Text style={styles.warning}>{t(totals.protected === 1 ? "tours.protectedResponseMembers_one" : "tours.protectedResponseMembers_other", { count: totals.protected })}</Text><Text style={styles.muted}>{t(totals.review === 1 ? "tours.exceptionsToReview_one" : "tours.exceptionsToReview_other", { count: totals.review })}</Text></> : null}
        </View>
        {diffs.map(d => <View key={d.event.event_id} style={styles.card}>
          <Text style={styles.name}>{d.event.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>
          <Text style={styles.muted}>{dateLabel(d.event.event_date, i18n.language)}</Text>
          <View style={styles.availabilityBlock}>
            <Text style={styles.availabilityTitle}>{t("tours.existingEventAvailability")}</Text>
            <Text style={styles.muted}>{t("tours.availableCount", { count: d.responses.available })} · {t("tours.maybeCount", { count: d.responses.maybe })} · {t("tours.notAvailableCount", { count: d.responses.unavailable })}</Text>
            <Text style={styles.muted}>{t("tours.awaitingResponseCount", { count: d.responses.awaiting })}</Text>
          </View>
          <Text style={styles.line}><Text style={styles.bold}>{t("tours.addCount", { count: d.additions.length })}: </Text>{d.additions.length ? display(d.additions) : t("tours.none")}</Text>
          {mode !== "add" ? <Text style={styles.line}><Text style={styles.bold}>{t("tours.roleChangesCount", { count: d.roleUpdates.length })}: </Text>{d.roleUpdates.length ? display(d.roleUpdates) : t("tours.none")}</Text> : null}
          {mode === "replace" ? <>
            <Text style={styles.line}><Text style={styles.bold}>{t("tours.protectedResponseCount", { count: d.protectedExtras.length })}: </Text>{d.protectedExtras.length ? display(d.protectedExtras) : t("tours.none")}</Text>
            <Text style={styles.line}><Text style={styles.bold}>{t("tours.exceptionReviewCount", { count: d.unconfirmedExtras.length })}: </Text>{d.unconfirmedExtras.length ? display(d.unconfirmedExtras) : t("tours.none")}</Text>
          </> : null}
        </View>)}
        {selectedCount === 0 ? <Text style={styles.muted}>{t("tours.selectEventForPreview")}</Text> : null}
        {mode === "add" && canManage ? (
          <Pressable accessibilityRole="button" disabled={saving || selectedCount === 0 || totals.add === 0}
            onPress={confirmAddMissing} style={[styles.applyButton, (saving || selectedCount === 0 || totals.add === 0) && styles.disabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
            <Text style={styles.applyText}>{saving ? t("tours.applyingAssignments") : t(totals.add === 1 ? "tours.addMissingAssignment_one" : "tours.addMissingAssignment_other", { count: totals.add })}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.footer}>{mode === "add" ? t("tours.addAssignmentFooter") : t("tours.previewOnlyFooter")}</Text>
      </ScrollView>}
  </>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" }, content: { padding: 16, paddingBottom: 50, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  heading: { fontSize: 22, fontWeight: "800", color: "#111" }, info: { fontSize: 13, color: "#555", lineHeight: 19 },
  section: { fontSize: 16, fontWeight: "800", color: "#222", marginTop: 8 },
  card: { backgroundColor: "#fff", borderColor: "#e7e7e7", borderWidth: 1, borderRadius: 12, padding: 12, gap: 9 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  selectAll: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  name: { color: "#222", fontSize: 14, fontWeight: "700" }, muted: { color: "#666", fontSize: 12, lineHeight: 18 },
  link: { color: colors.primary, fontSize: 14, fontWeight: "800" }, line: { fontSize: 13, color: "#444", lineHeight: 19 },
  bold: { fontWeight: "800" }, warning: { color: "#B45309", fontSize: 13, lineHeight: 19 },
  availabilityBlock: { borderTopWidth: 1, borderTopColor: "#ececec", paddingTop: 9, gap: 3 },
  availabilityTitle: { color: "#222", fontSize: 13, fontWeight: "800" },
  footer: { color: "#666", fontSize: 12, fontStyle: "italic", marginTop: 6 }, error: { color: "#C62828", textAlign: "center" },
  action: { padding: 12 }, actionText: { color: colors.primary, fontWeight: "700" },
  applyButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  applyText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
