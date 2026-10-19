// app/events/[id]/lineup.tsx
import { supabase } from "@/lib/supabase";
import { capabilityDisplayName } from "@/lib/capabilities";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

type Person = { member_id: string; display_name: string | null; member_type: string | null };
type Capability = {
  capability_id: string;
  name: string;
  standard_key: string | null;
  category: string;
  sort_order: number;
};
type CapabilityLink = { member_id: string; capability_id: string };
type EventRow = { event_id: string; band_id: string; act_id: string | null };

const CATEGORIES = [
  { key: "performance", titleKey: "people.category.performance" },
  { key: "crew", titleKey: "people.category.crew" },
  { key: "logistics", titleKey: "people.category.logistics" },
  { key: "business", titleKey: "people.category.business" },
  { key: "creative_specialist", titleKey: "people.category.creativeSpecialist" },
  { key: "other", titleKey: "people.category.other" },
];

export default function EventLineupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [personRoles, setPersonRoles] = useState<CapabilityLink[]>([]);
  const [eventRoles, setEventRoles] = useState<CapabilityLink[]>([]);
  const [actRoles, setActRoles] = useState<CapabilityLink[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    try {
      const { data: eventData, error: eventError } = await supabase.from("events")
        .select("event_id,band_id,act_id").eq("event_id", eventId).single();
      if (eventError) throw eventError;
      const ev = eventData as EventRow;
      setEvent(ev);

      const { data: assignments, error: memberError } = await supabase.from("event_members")
        .select("member_id").eq("event_id", eventId);
      if (memberError) throw memberError;
      const ids = (assignments ?? []).map((r) => r.member_id as string);
      setMemberIds(ids);

      const { data: peopleData, error: peopleError } = await supabase.from("band_members")
        .select("member_id,display_name,member_type")
        .eq("band_id", ev.band_id).order("display_name", { ascending: true });
      if (peopleError) throw peopleError;
      const loadedPeople = (peopleData ?? []) as Person[];
      // Include any existing event members even if they're no longer in the active directory.
      const missingIds = ids.filter((id) => !loadedPeople.some((p) => p.member_id === id));
      if (missingIds.length) {
        const { data: missing, error } = await supabase.from("band_members")
          .select("member_id,display_name,member_type").in("member_id", missingIds);
        if (error) throw error;
        loadedPeople.push(...((missing ?? []) as Person[]));
      }
      setPeople(loadedPeople);

      const { data: capData, error: capError } = await supabase.from("capabilities")
        .select("capability_id,name,standard_key,category,sort_order")
        .eq("band_id", ev.band_id).eq("is_active", true)
        .order("category", { ascending: true }).order("sort_order", { ascending: true });
      if (capError) throw capError;
      setCapabilities((capData ?? []) as Capability[]);

      const personIds = loadedPeople.map((p) => p.member_id);
      if (personIds.length) {
        const { data, error } = await supabase.from("person_capabilities")
          .select("member_id,capability_id").in("member_id", personIds);
        if (error) throw error;
        setPersonRoles((data ?? []) as CapabilityLink[]);
      } else setPersonRoles([]);

      const { data: assignedRoles, error: rolesError } = await supabase.from("event_member_capabilities")
        .select("member_id,capability_id").eq("event_id", eventId);
      if (rolesError) throw rolesError;
      setEventRoles((assignedRoles ?? []) as CapabilityLink[]);

      if (ev.act_id) {
        const { data: actMembers, error: actErr } = await supabase.from("act_members")
          .select("act_member_id,member_id").eq("act_id", ev.act_id);
        if (actErr) throw actErr;
        const actRows = (actMembers ?? []) as { act_member_id: string; member_id: string }[];
        if (actRows.length) {
          const { data: actCaps, error: actCapsErr } = await supabase.from("act_member_capabilities")
            .select("act_member_id,capability_id").in("act_member_id", actRows.map((r) => r.act_member_id));
          if (actCapsErr) throw actCapsErr;
          setActRoles((actCaps ?? []).flatMap((r) => {
            const person = actRows.find((a) => a.act_member_id === r.act_member_id);
            return person ? [{ member_id: person.member_id, capability_id: r.capability_id }] : [];
          }));
        } else setActRoles([]);
      } else setActRoles([]);
    } catch (e: any) {
      console.log("event lineup load error", e);
      Alert.alert(t("common.error"), e?.message ?? t("eventsLineup.loadError"));
    } finally { setLoading(false); }
  }, [eventId, t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const assignedPeople = useMemo(() => memberIds.map((id) => people.find((p) => p.member_id === id))
    .filter((p): p is Person => !!p), [memberIds, people]);
  const unassignedPeople = useMemo(() => people.filter((p) => !memberIds.includes(p.member_id) &&
    (p.display_name ?? "").toLowerCase().includes(memberSearch.trim().toLowerCase())),
    [people, memberIds, memberSearch]);

  const memberCapabilities = (memberId: string) => personRoles
    .filter((r) => r.member_id === memberId)
    .map((r) => {
      const capability = capabilities.find((c) => c.capability_id === r.capability_id);
      return capability
        ? capabilityDisplayName(capability.name, capability.standard_key)
        : undefined;
    })
    .filter(Boolean).join(", ");
  const assignedCapabilities = (memberId: string, category: string) => eventRoles
    .filter((r) => r.member_id === memberId)
    .map((r) => capabilities.find((c) => c.capability_id === r.capability_id))
    .filter((c): c is Capability => !!c && c.category === category);
  const noAssignedRoles = (memberId: string) => !eventRoles.some((r) => r.member_id === memberId);

  function openRoles(memberId: string, adding: boolean) {
    const existing = eventRoles.filter((r) => r.member_id === memberId).map((r) => r.capability_id);
    const actDefault = actRoles.filter((r) => r.member_id === memberId).map((r) => r.capability_id);
    const personDefault = personRoles.filter((r) => r.member_id === memberId).map((r) => r.capability_id);
    const initial = adding ? (actDefault.length ? actDefault : personDefault) : existing;
    setSelectedRoleIds(initial.filter((id) => capabilities.some((c) => c.capability_id === id)));
    setEditingMemberId(adding ? null : memberId);
    setAddingMemberId(adding ? memberId : null);
    setPickerOpen(false);
  }
  function closeRoles() { if (!saving) { setEditingMemberId(null); setAddingMemberId(null); } }

  async function saveRoles() {
    const memberId = addingMemberId ?? editingMemberId;
    if (!memberId || !eventId || saving) return;
    if (!selectedRoleIds.length) {
      Alert.alert(t("acts.assignRole"), t("acts.selectRoleBeforeSaving"));
      return;
    }
    setSaving(true);
    let insertedMembership = false;
    try {
      if (addingMemberId) {
        const { error } = await supabase.from("event_members")
          .insert({ event_id: eventId, member_id: memberId });
        if (error) throw error;
        insertedMembership = true;
      }
      const existing = eventRoles.filter((r) => r.member_id === memberId).map((r) => r.capability_id);
      const toAdd = selectedRoleIds.filter((id) => !existing.includes(id));
      const toDelete = existing.filter((id) => !selectedRoleIds.includes(id));
      if (toAdd.length) {
        const { error } = await supabase.from("event_member_capabilities")
          .insert(toAdd.map((capability_id) => ({ event_id: eventId, member_id: memberId, capability_id })));
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await supabase.from("event_member_capabilities")
          .delete().eq("event_id", eventId).eq("member_id", memberId).in("capability_id", toDelete);
        if (error) throw error;
      }
      if (addingMemberId) {
        // Never overwrite an existing response or change the person's act membership.
        const { error } = await supabase.from("event_availability")
          .upsert({ event_id: eventId, member_id: memberId, status: null },
            { onConflict: "event_id,member_id", ignoreDuplicates: true });
        if (error) throw error;
      }
      setEditingMemberId(null);
      setAddingMemberId(null);
      setMemberSearch("");
      await load();
    } catch (e: any) {
      console.log("event lineup save error", e);
      // On an unsuccessful new assignment, avoid leaving an orphaned event member.
      if (insertedMembership && eventId) {
        const { error: rollbackError } = await supabase.from("event_members")
          .delete().eq("event_id", eventId).eq("member_id", memberId);
        if (rollbackError) console.log("event lineup rollback error", rollbackError);
      }
      Alert.alert(t("common.error"), e?.message ?? t("eventsLineup.saveRolesError"));
      await load();
    } finally { setSaving(false); }
  }

  function removeMember(memberId: string) {
    const name = people.find((p) => p.member_id === memberId)?.display_name ?? t("acts.member");
    Alert.alert(t("eventsLineup.removeTitle"),
      t("eventsLineup.removeMessage", { name }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("eventsLineup.remove"), style: "destructive", onPress: () => { void confirmRemove(memberId); } },
      ]);
  }
  async function confirmRemove(memberId: string) {
    if (!eventId || saving) return;
    setSaving(true);
    try {
      // Delete membership first; capability records cascade automatically.
      const { error: memberError } = await supabase.from("event_members")
        .delete().eq("event_id", eventId).eq("member_id", memberId);
      if (memberError) throw memberError;
      const { error: availabilityError } = await supabase.from("event_availability")
        .delete().eq("event_id", eventId).eq("member_id", memberId);
      if (availabilityError) throw availabilityError;
      await load();
    } catch (e: any) {
      console.log("event lineup remove error", e);
      Alert.alert(t("common.error"), e?.message ?? t("eventsLineup.removeError"));
      await load();
    } finally { setSaving(false); }
  }

  if (!eventId) return <View style={styles.center}><Text>{t("eventsLineup.missingEventId")}</Text></View>;
  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  const rolePersonId = editingMemberId ?? addingMemberId;
  const rolePersonName = people.find((p) => p.member_id === rolePersonId)?.display_name ?? t("acts.member");
  const allowedRoleIds = new Set(personRoles.filter((r) => r.member_id === rolePersonId)
    .map((r) => r.capability_id));
  const roleOptions = capabilities.filter((c) => allowedRoleIds.has(c.capability_id) ||
    selectedRoleIds.includes(c.capability_id));

  return <>
    <Stack.Screen options={{
      title: t("eventsLineup.title"),
      headerLeft: () => <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="arrow-back-outline" size={24} color="#fff" />
      </Pressable>,
    }} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{t("eventsLineup.heading")}</Text>
        <Pressable style={styles.addButton} onPress={() => { setMemberSearch(""); setPickerOpen(true); }}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>{t("acts.addMember")}</Text>
        </Pressable>
      </View>
      {CATEGORIES.map((category) => {
        const peopleInCategory = assignedPeople.filter((p) =>
          assignedCapabilities(p.member_id, category.key).length > 0 ||
          (category.key === "other" && noAssignedRoles(p.member_id)))
          .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
        if (!peopleInCategory.length) return null;
        return <View key={category.key} style={styles.section}>
          <Text style={styles.sectionTitle}>{t(category.titleKey)}</Text>
          {peopleInCategory.map((person) => {
            const names = assignedCapabilities(person.member_id, category.key)
              .map((c) => capabilityDisplayName(c.name, c.standard_key))
              .join(", ");
            return <View key={`${person.member_id}-${category.key}`} style={styles.memberCard}>
              <Text style={styles.memberName}>{person.display_name ?? t("eventsLineup.unnamed")}</Text>
              <Text style={[styles.memberSub, !names ? styles.warning : null]}>{names || t("acts.assignRole")}</Text>
              <View style={styles.memberActions}>
                <Pressable disabled={saving} style={styles.editButton} onPress={() => openRoles(person.member_id, false)}>
                  <Text style={styles.editButtonText}>{t("acts.editRoles")}</Text>
                </Pressable>
                <Pressable disabled={saving} style={styles.removeButton} onPress={() => removeMember(person.member_id)}>
                  <Text style={styles.removeButtonText}>{t("eventsLineup.remove")}</Text>
                </Pressable>
              </View>
            </View>;
          })}
        </View>;
      })}
      {assignedPeople.length === 0 && <Text style={styles.empty}>{t("eventsLineup.noMembersAssigned")}</Text>}
    </ScrollView>

    <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
        <View style={[styles.modalCard, styles.memberPickerModalCard]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("acts.addMember")}</Text>
            <Pressable onPress={() => setPickerOpen(false)}><Ionicons name="close" size={22} color="#111" /></Pressable>
          </View>
          <TextInput style={styles.searchInput} placeholder={t("people.searchPlaceholder")} value={memberSearch}
            onChangeText={setMemberSearch} autoCorrect={false} />
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {unassignedPeople.map((person) => <Pressable key={person.member_id} style={styles.pickerRow}
              onPress={() => openRoles(person.member_id, true)}>
              <Text style={styles.memberName}>{person.display_name ?? t("eventsLineup.unnamed")}</Text>
              <Text style={styles.memberSub}>{memberCapabilities(person.member_id) || t("acts.noCapabilitiesRegistered")}</Text>
            </Pressable>)}
            {unassignedPeople.length === 0 && <Text style={styles.empty}>{t("eventsLineup.noMatchingPeople")}</Text>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={!!rolePersonId} animationType="slide" transparent onRequestClose={closeRoles}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeRoles} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("acts.rolesTitle", { member: rolePersonName })}</Text>
            <Pressable disabled={saving} onPress={closeRoles}><Ionicons name="close" size={22} color="#111" /></Pressable>
          </View>
          <Text style={styles.hint}>{t("eventsLineup.selectRolesHint")}</Text>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {roleOptions.map((capability) => {
              const selected = selectedRoleIds.includes(capability.capability_id);
              return <Pressable key={capability.capability_id} style={styles.pickerRow} disabled={saving}
                onPress={() => setSelectedRoleIds((current) => selected
                  ? current.filter((id) => id !== capability.capability_id)
                  : [...current, capability.capability_id])}>
                <View style={styles.capabilityRow}>
                  <Ionicons name={selected ? "checkbox" : "square-outline"} size={23} color="#0D9488" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{capabilityDisplayName(capability.name, capability.standard_key)}</Text>
                    <Text style={styles.memberSub}>{t(CATEGORIES.find((category) => category.key === capability.category)?.titleKey ?? "people.category.other")}</Text>
                  </View>
                </View>
              </Pressable>;
            })}
            {roleOptions.length === 0 && <Text style={styles.hint}>
              {t("acts.noCapabilitiesForPerson")}
            </Text>}
          </ScrollView>
          <Pressable style={[styles.addButton, saving ? styles.disabled : null]} disabled={saving} onPress={saveRoles}>
            <Text style={styles.addButtonText}>{saving ? t("acts.savingRoles") : t("common.save")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: "#e7e7e7" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111" },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 10, backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },
  addButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#333" },
  memberCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e7e7e7", gap: 10 },
  memberName: { fontSize: 16, fontWeight: "700", color: "#111" },
  memberSub: { marginTop: 3, fontSize: 12, color: "#666" },
  warning: { color: "#B45309", fontWeight: "700" },
  memberActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  editButton: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(13,148,136,0.3)",
    backgroundColor: "rgba(13,148,136,0.06)", paddingHorizontal: 10, paddingVertical: 6 },
  editButtonText: { color: "#0D9488", fontSize: 11, fontWeight: "700" },
  removeButton: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(198,40,40,0.25)",
    backgroundColor: "rgba(198,40,40,0.04)", paddingHorizontal: 10, paddingVertical: 6 },
  removeButtonText: { color: "#C62828", fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { maxHeight: "75%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  memberPickerModalCard: { height: "70%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111", flexShrink: 1 },
  modalContent: { gap: 10, paddingBottom: 12 },
  pickerRow: { borderRadius: 12, borderWidth: 1, borderColor: "#e7e7e7", backgroundColor: "#f5f5f5",
    paddingHorizontal: 12, paddingVertical: 12 },
  capabilityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { borderWidth: 1, borderColor: "#e7e7e7", borderRadius: 10, padding: 12,
    marginBottom: 12, fontSize: 15, color: "#111" },
  hint: { color: "#666", fontSize: 13, marginBottom: 12 },
  empty: { paddingVertical: 10, color: "#666" },
});
