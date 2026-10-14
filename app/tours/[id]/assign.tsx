// app/tours/[id]/assign.tsx
// Bulk line-up assignment. Only the Add missing people mode can write.
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
const MODES: { key: Mode; title: string; note: string }[] = [
  { key: "add", title: "Add missing people", note: "Safest: leave existing event members and roles unchanged." },
  { key: "update", title: "Update matching roles", note: "Add missing people and synchronise roles for those already on the Tour." },
  { key: "replace", title: "Replace Event Line-up", note: "Preview possible removals. Responses and exceptions are protected; nothing is removed here." },
];
function dateLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}
function roleSignature(roles: string[]) { return [...new Set(roles)].sort().join("|"); }
export default function TourAssignmentPreview() {
  const router = useRouter();
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
    if (!tourId || !bandId) { setError("Tour or organisation not available."); setLoading(false); return; }
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
      setError(e?.message ?? "Unable to load the bulk assignment preview.");
    } finally { setLoading(false); }
  }, [tourId, bandId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const names = useMemo(() => new Map(people.map(p => [p.member_id, p.display_name || "Unnamed"])), [people]);
  const display = (ids: string[]) => ids.map(id => names.get(id) ?? "Unknown member").sort((a,b) => a.localeCompare(b)).join(", ");
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
      Alert.alert("Select events", "Select at least one event first.");
      return;
    }
    if (!totals.add) {
      Alert.alert("Nothing to add", "All selected events already have the Tour members.");
      return;
    }
    const missingWithoutRoles = diffs.flatMap(d => d.additions.filter(id =>
      !tourRoles.some(r => r.member_id === id)));
    if (missingWithoutRoles.length) {
      Alert.alert("Roles required", "Assign roles to every new Tour member before adding them to Events.");
      return;
    }
    Alert.alert(
      "Add Tour members to Events?",
      `Add ${totals.add} member assignment${totals.add === 1 ? "" : "s"} across ${diffs.length} selected Event${diffs.length === 1 ? "" : "s"}?\n\nExisting members, roles and availability responses will not be changed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Add missing people", onPress: () => { void applyAddMissing(); } },
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
      if (!currentMembers.length) throw new Error("The Tour no longer has a line-up.");
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
            throw new Error("Event is no longer eligible for this Tour.");
          }
          const { data: currentAssignments, error: assignedError } = await supabase.from("event_members")
            .select("member_id").eq("event_id", currentEvent.event_id);
          if (assignedError) throw assignedError;
          const existing = new Set((currentAssignments ?? []).map(m => m.member_id));
          for (const member of currentMembers) {
            if (existing.has(member.member_id)) { skipped++; continue; }
            const roleIds = [...new Set(rolesByAssignment.get(member.tour_member_id) ?? [])];
            if (!roleIds.length) {
              failures.push(`${eventName}: ${names.get(member.member_id) ?? "Unknown member"} has no Tour roles`);
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
              failures.push(`${eventName} / ${names.get(member.member_id) ?? "Unknown member"}: ${err?.message ?? "Unknown error"}`);
            }
          }
        } catch (err: any) {
          failures.push(`${eventName}: ${err?.message ?? "Unable to update Event"}`);
        }
      }
      await load();
      const message = `${added} new Event assignment${added === 1 ? "" : "s"} created.\nExisting assignments skipped: ${skipped}.` +
        (failures.length ? `\n\n${failures.length} issue(s) require attention:\n${failures.slice(0, 4).join("\n")}` :
          "\n\nExisting availability responses were not overwritten.");
      Alert.alert(failures.length ? "Completed with issues" : "Assignments complete", message);
    } catch (err: any) {
      Alert.alert("Unable to apply assignments", err?.message ?? "Please try again.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Stack.Screen options={{ title: "Bulk Tour Line-up Preview", headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff", headerLeft: () => <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 8 }}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable> }} />
    {loading ? <View style={styles.center}><ActivityIndicator /></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()} style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable></View> :
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{tour?.tour_name ?? "Tour"}</Text>
        <Text style={styles.info}>Review proposed changes before applying them. Only Add missing people is enabled for saving.</Text>
        {!canManage ? <Text style={styles.warning}>Admin Mode is required to apply assignments.</Text> : null}
        <Text style={styles.section}>1. Select Tour events</Text>
        <View style={styles.card}>
          <Pressable disabled={saving} onPress={() => setSelectedIds(selectedCount === events.length ? [] : events.map(e => e.event_id))} style={styles.selectAll}>
            <Text style={styles.link}>{selectedCount === events.length ? "Deselect all" : "Select all"}</Text>
            <Text style={styles.muted}>{selectedCount} of {events.length} events</Text>
          </Pressable>
          {events.map(e => <Pressable key={e.event_id} disabled={saving} onPress={() => toggleEvent(e.event_id)} style={styles.item}>
            <Ionicons name={selectedIds.includes(e.event_id) ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.name}>{e.venues?.event_venue_name || "Venue TBC"}</Text><Text style={styles.muted}>{dateLabel(e.event_date)}</Text></View>
          </Pressable>)}
          {!events.length ? <Text style={styles.muted}>No eligible events currently assigned to this Tour.</Text> : null}
        </View>
        <Text style={styles.section}>2. Choose assignment mode</Text>
        <View style={styles.card}>{MODES.map(option => <Pressable key={option.key} disabled={saving} onPress={() => setMode(option.key)} style={styles.item}>
          <Ionicons name={mode === option.key ? "radio-button-on" : "radio-button-off"} size={23} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.name}>{option.title}</Text><Text style={styles.muted}>{option.note}</Text></View>
        </Pressable>)}</View>
        <Text style={styles.section}>3. Preview changes</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{selectedCount} events selected · {tourMembers.length} Tour people</Text>
          <Text style={styles.muted}>{totals.add} new event assignments</Text>
          {mode !== "add" ? <Text style={styles.muted}>{totals.update} existing members with differing roles</Text> : null}
          {mode === "replace" ? <><Text style={styles.warning}>{totals.protected} event-only members with responses protected</Text><Text style={styles.muted}>{totals.review} other event-only members requiring removal review</Text></> : null}
        </View>
        {diffs.map(d => <View key={d.event.event_id} style={styles.card}>
          <Text style={styles.name}>{d.event.venues?.event_venue_name || "Venue TBC"}</Text>
          <Text style={styles.muted}>{dateLabel(d.event.event_date)}</Text>
          <View style={styles.availabilityBlock}>
            <Text style={styles.availabilityTitle}>Existing Event availability</Text>
            <Text style={styles.muted}>Available: {d.responses.available} · Maybe: {d.responses.maybe} · Not Available: {d.responses.unavailable}</Text>
            <Text style={styles.muted}>Awaiting response: {d.responses.awaiting}</Text>
          </View>
          <Text style={styles.line}><Text style={styles.bold}>Add ({d.additions.length}): </Text>{d.additions.length ? display(d.additions) : "None"}</Text>
          {mode !== "add" ? <Text style={styles.line}><Text style={styles.bold}>Role changes ({d.roleUpdates.length}): </Text>{d.roleUpdates.length ? display(d.roleUpdates) : "None"}</Text> : null}
          {mode === "replace" ? <>
            <Text style={styles.line}><Text style={styles.bold}>Event-only responses protected ({d.protectedExtras.length}): </Text>{d.protectedExtras.length ? display(d.protectedExtras) : "None"}</Text>
            <Text style={styles.line}><Text style={styles.bold}>Other exceptions to review ({d.unconfirmedExtras.length}): </Text>{d.unconfirmedExtras.length ? display(d.unconfirmedExtras) : "None"}</Text>
          </> : null}
        </View>)}
        {selectedCount === 0 ? <Text style={styles.muted}>Select at least one Event to see a preview.</Text> : null}
        {mode === "add" && canManage ? (
          <Pressable accessibilityRole="button" disabled={saving || selectedCount === 0 || totals.add === 0}
            onPress={confirmAddMissing} style={[styles.applyButton, (saving || selectedCount === 0 || totals.add === 0) && styles.disabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
            <Text style={styles.applyText}>{saving ? "Applying assignments…" : `Add ${totals.add} missing assignment${totals.add === 1 ? "" : "s"}`}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.footer}>{mode === "add" ?
          "Existing Event roles and availability responses will be preserved. Changes are made only after confirmation." :
          "Preview only — updating roles and replacing Event line-ups are not yet enabled."}</Text>
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
