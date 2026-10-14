// app/tours/[id]/lineup.tsx
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

type Tour = { tour_id: string; tour_name: string; act_id: string; band_id: string };
type Person = { member_id: string; display_name: string | null; member_type: string | null };
type TourMember = {
  tour_member_id: string;
  member_id: string;
  band_members: Person | Person[] | null;
};
type Capability = { capability_id: string; name: string; category: string; sort_order: number };
type Assignment = { tour_member_id: string; capability_id: string };
type PersonCapability = { member_id: string; capability_id: string };
type ActMember = { act_member_id: string; member_id: string };
type ActAssignment = { act_member_id: string; capability_id: string };

const categories = [
  { key: "performance", title: "Performance" },
  { key: "crew", title: "Crew" },
  { key: "logistics", title: "Logistics" },
  { key: "business", title: "Business" },
  { key: "creative_specialist", title: "Creative Specialists" },
  { key: "other", title: "Other" },
];

function memberInfo(row: TourMember): Person | null {
  return Array.isArray(row.band_members) ? row.band_members[0] ?? null : row.band_members;
}

export default function TourLineupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();
  const canManage = isAdmin && adminModeEnabled;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tour, setTour] = useState<Tour | null>(null);
  const [members, setMembers] = useState<TourMember[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [personCapabilities, setPersonCapabilities] = useState<PersonCapability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<TourMember | null>(null);
  const [addingPerson, setAddingPerson] = useState<Person | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!tourId || !bandId) { setLoading(false); return; }
    try {
      const { data: tourData, error: tourError } = await supabase.from("tours")
        .select("tour_id, tour_name, act_id, band_id")
        .eq("tour_id", tourId).eq("band_id", bandId).single();
      if (tourError) throw tourError;
      const loaded = tourData as Tour;
      setTour(loaded);

      const [memberResult, peopleResult, capabilitiesResult] = await Promise.all([
        supabase.from("tour_members")
          .select("tour_member_id, member_id, band_members(member_id, display_name, member_type)")
          .eq("tour_id", tourId),
        supabase.from("band_members")
          .select("member_id, display_name, member_type")
          .eq("band_id", bandId).eq("is_active", true)
          .order("display_name", { ascending: true }),
        supabase.from("capabilities")
          .select("capability_id, name, category, sort_order")
          .eq("band_id", bandId).eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (memberResult.error) throw memberResult.error;
      if (peopleResult.error) throw peopleResult.error;
      if (capabilitiesResult.error) throw capabilitiesResult.error;

      const nextMembers = (memberResult.data ?? []) as unknown as TourMember[];
      const nextPeople = (peopleResult.data ?? []) as Person[];
      setMembers(nextMembers);
      setPeople(nextPeople);
      setCapabilities((capabilitiesResult.data ?? []) as Capability[]);

      const memberIds = nextMembers.map(m => m.tour_member_id);
      const peopleIds = nextPeople.map(p => p.member_id);
      const [assignResult, personCapResult] = await Promise.all([
        memberIds.length
          ? supabase.from("tour_member_capabilities")
              .select("tour_member_id, capability_id").in("tour_member_id", memberIds)
          : Promise.resolve({ data: [] as Assignment[], error: null }),
        peopleIds.length
          ? supabase.from("person_capabilities")
              .select("member_id, capability_id").in("member_id", peopleIds)
          : Promise.resolve({ data: [] as PersonCapability[], error: null }),
      ]);
      if (assignResult.error) throw assignResult.error;
      if (personCapResult.error) throw personCapResult.error;
      setAssignments((assignResult.data ?? []) as Assignment[]);
      setPersonCapabilities((personCapResult.data ?? []) as PersonCapability[]);
    } catch (e: any) {
      console.log("tour lineup load error", e);
      Alert.alert("Unable to load Tour Line-up", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tourId, bandId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const assignedIds = useMemo(() => new Set(members.map(m => m.member_id)), [members]);
  const availablePeople = useMemo(() => people.filter(p =>
    !assignedIds.has(p.member_id) &&
    (p.display_name ?? "").toLowerCase().includes(search.trim().toLowerCase())
  ), [people, assignedIds, search]);
  const assignedCapabilitiesFor = (m: TourMember) => assignments
    .filter(a => a.tour_member_id === m.tour_member_id)
    .map(a => capabilities.find(c => c.capability_id === a.capability_id))
    .filter((c): c is Capability => !!c);
  const categoryMembers = (category: string) => members.filter(m =>
    assignedCapabilitiesFor(m).some(c => c.category === category)
  ).sort((a, b) => (memberInfo(a)?.display_name ?? "").localeCompare(memberInfo(b)?.display_name ?? ""));
  const unassignedMembers = members.filter(m => assignedCapabilitiesFor(m).length === 0);
  const currentPersonId = addingPerson?.member_id ?? editingMember?.member_id;
  const allowedCapabilities = capabilities.filter(c =>
    personCapabilities.some(p => p.member_id === currentPersonId && p.capability_id === c.capability_id) ||
    selectedCapabilities.includes(c.capability_id)
  );

  function startAdd(person: Person) {
    setAddingPerson(person);
    setEditingMember(null);
    setSelectedCapabilities(personCapabilities.filter(c => c.member_id === person.member_id).map(c => c.capability_id));
    setPickerOpen(false);
  }
  function startEdit(member: TourMember) {
    setAddingPerson(null);
    setEditingMember(member);
    setSelectedCapabilities(assignments.filter(a => a.tour_member_id === member.tour_member_id).map(a => a.capability_id));
  }
  function closeRoles() { if (!busy) { setAddingPerson(null); setEditingMember(null); } }

  async function saveRoles() {
    if (!tourId || !canManage || busy) return;
    if (!selectedCapabilities.length) {
      Alert.alert("Assign role", "Please select at least one role before saving.");
      return;
    }
    setBusy(true);
    try {
      let tourMemberId = editingMember?.tour_member_id;
      if (addingPerson) {
        const { data, error } = await supabase.from("tour_members")
          .insert({ tour_id: tourId, member_id: addingPerson.member_id })
          .select("tour_member_id").single();
        if (error) throw error;
        tourMemberId = data.tour_member_id;
        const { error: capError } = await supabase.from("tour_member_capabilities")
          .insert(selectedCapabilities.map(capability_id => ({ tour_member_id: tourMemberId, capability_id })));
        if (capError) {
          // The member was just created; remove it if its role insert failed.
          const { error: rollbackError } = await supabase.from("tour_members")
            .delete().eq("tour_member_id", tourMemberId);
          if (rollbackError) throw new Error(`${capError.message}. Cleanup also failed: ${rollbackError.message}`);
          throw capError;
        }
      } else if (tourMemberId) {
        const currentIds = assignments.filter(a => a.tour_member_id === tourMemberId).map(a => a.capability_id);
        const add = selectedCapabilities.filter(id => !currentIds.includes(id));
        const remove = currentIds.filter(id => !selectedCapabilities.includes(id));
        // Add first to ensure an insertion error doesn't erase existing roles.
        if (add.length) {
          const { error } = await supabase.from("tour_member_capabilities")
            .insert(add.map(capability_id => ({ tour_member_id: tourMemberId, capability_id })));
          if (error) throw error;
        }
        if (remove.length) {
          const { error } = await supabase.from("tour_member_capabilities")
            .delete().eq("tour_member_id", tourMemberId).in("capability_id", remove);
          if (error) throw error;
        }
      }
      setAddingPerson(null);
      setEditingMember(null);
      await load();
    } catch (e: any) {
      Alert.alert("Could not save roles", e?.message ?? "Please try again.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  function confirmRemoval(m: TourMember) {
    if (!canManage || busy) return;
    const name = memberInfo(m)?.display_name ?? "this person";
    Alert.alert("Remove from tour?", `${name} will be removed from the Tour Line-up. Existing events will not change.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { void removeMember(m.tour_member_id); } },
    ]);
  }
  async function removeMember(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("tour_members").delete().eq("tour_member_id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Could not remove member", e?.message ?? "Please try again.");
    } finally { setBusy(false); }
  }

  function confirmImport() {
    if (!tour || !canManage || busy || members.length > 0) return;
    Alert.alert("Copy Act Line-up?", "Copy the Act's current members and roles into this tour? This is a one-time starting point. Existing Event line-ups will not change.", [
      { text: "Cancel", style: "cancel" },
      { text: "Copy line-up", onPress: () => { void importActLineup(); } },
    ]);
  }
  async function importActLineup() {
    if (!tour || busy || !canManage || members.length > 0) return;
    setBusy(true);
    const newMemberIds: string[] = [];
    try {
      // Recheck the database before importing to avoid a second copy.
      const { data: existing, error: existingError } = await supabase.from("tour_members")
        .select("tour_member_id").eq("tour_id", tour.tour_id).limit(1);
      if (existingError) throw existingError;
      if ((existing ?? []).length) throw new Error("This tour already has a line-up. No import was made.");

      const { data: actMembers, error: memberError } = await supabase.from("act_members")
        .select("act_member_id, member_id").eq("act_id", tour.act_id);
      if (memberError) throw memberError;
      const source = (actMembers ?? []) as ActMember[];
      if (!source.length) throw new Error("This Act has no members to copy.");
      const { data: actCaps, error: capError } = await supabase.from("act_member_capabilities")
        .select("act_member_id, capability_id").in("act_member_id", source.map(m => m.act_member_id));
      if (capError) throw capError;
      const capRows = (actCaps ?? []) as ActAssignment[];
      const memberMap = new Map<string, string>();
      for (const m of source) {
        const { data, error } = await supabase.from("tour_members")
          .insert({ tour_id: tour.tour_id, member_id: m.member_id })
          .select("tour_member_id").single();
        if (error) throw error;
        memberMap.set(m.act_member_id, data.tour_member_id);
        newMemberIds.push(data.tour_member_id);
      }
      const inserts = capRows.map(c => ({
        tour_member_id: memberMap.get(c.act_member_id)!,
        capability_id: c.capability_id,
      }));
      if (inserts.length) {
        const { error } = await supabase.from("tour_member_capabilities").insert(inserts);
        if (error) throw error;
      }
      await load();
      Alert.alert("Line-up copied", "The Tour Line-up is now independent of the Act. Existing Event line-ups are unchanged.");
    } catch (e: any) {
      // Best-effort removal of the rows created during this import.
      if (newMemberIds.length) {
        const { error } = await supabase.from("tour_members").delete().in("tour_member_id", newMemberIds);
        if (error) {
          Alert.alert("Import incomplete", `${e?.message ?? "Import failed"}. Automatic cleanup also failed: ${error.message}`);
          await load();
          setBusy(false);
          return;
        }
      }
      Alert.alert("Could not copy line-up", e?.message ?? "Please try again.");
      await load();
    } finally { setBusy(false); }
  }

  const renderMember = (m: TourMember, category: string) => {
    const name = memberInfo(m)?.display_name ?? "Unnamed";
    const roleNames = assignedCapabilitiesFor(m).filter(c => c.category === category).map(c => c.name).join(", ");
    return (
      <View key={`${m.tour_member_id}-${category}`} style={styles.memberCard}>
        <Text style={styles.memberName}>{name}</Text>
        <Text style={styles.memberSub}>{roleNames || "Assign role"}</Text>
        {canManage ? <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => startEdit(m)} style={styles.editButton}><Text style={styles.editText}>Edit roles</Text></Pressable>
          <Pressable disabled={busy} onPress={() => confirmRemoval(m)} style={styles.removeButton}><Text style={styles.removeText}>Remove</Text></Pressable>
        </View> : null}
      </View>
    );
  };

  return <>
    <Stack.Screen options={{ title: "Tour Line-up", headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff",
      headerLeft: () => <Pressable style={styles.headerBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>,
    }} />
    {loading ? <View style={styles.center}><ActivityIndicator /></View> : !tour ? <View style={styles.center}><Text>Tour not found.</Text></View> : <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.tourName}>{tour.tour_name}</Text>
          <Text style={styles.hint}>This line-up is specific to this tour. Changes here do not automatically update the Act or existing Events.</Text>
          {canManage && members.length === 0 ? <Pressable disabled={busy} onPress={confirmImport} style={[styles.primaryButton, busy && styles.disabled]}>
            <Ionicons name="copy-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>{busy ? "Working…" : "Copy from Act Line-up"}</Text>
          </Pressable> : null}
          {canManage ? <Pressable disabled={busy} onPress={() => { setSearch(""); setPickerOpen(true); }} style={[styles.primaryButton, busy && styles.disabled]}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Add Member</Text>
          </Pressable> : null}
        </View>
        {members.length === 0 ? <Text style={styles.hint}>No Tour Line-up yet. Copy the Act Line-up or add members individually.</Text> : null}
        {categories.map(category => {
          const list = categoryMembers(category.key);
          if (!list.length) return null;
          return <View key={category.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            {list.map(m => renderMember(m, category.key))}
          </View>;
        })}
        {unassignedMembers.length ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unassigned roles</Text>
          {unassignedMembers.map(m => <View key={m.tour_member_id} style={styles.memberCard}>
            <Text style={styles.memberName}>{memberInfo(m)?.display_name ?? "Unnamed"}</Text>
            <Text style={styles.warning}>Assign role</Text>
            {canManage ? <Pressable onPress={() => startEdit(m)} style={styles.editButton}><Text style={styles.editText}>Edit roles</Text></Pressable> : null}
          </View>)}
        </View> : null}
      </ScrollView>
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Member</Text>
              <Pressable onPress={() => setPickerOpen(false)}><Ionicons name="close" size={24} color="#111" /></Pressable></View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search people" style={styles.searchInput} autoCorrect={false} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              {availablePeople.map(p => <Pressable key={p.member_id} onPress={() => startAdd(p)} style={styles.pickerRow}>
                <Text style={styles.memberName}>{p.display_name ?? "Unnamed"}</Text>
                <Text style={styles.memberSub}>{personCapabilities.filter(pc => pc.member_id === p.member_id)
                  .map(pc => capabilities.find(c => c.capability_id === pc.capability_id)?.name).filter(Boolean).join(" · ") || "No capabilities registered"}</Text>
              </Pressable>)}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={!!addingPerson || !!editingMember} transparent animationType="slide" onRequestClose={closeRoles}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRoles} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{addingPerson?.display_name ?? (editingMember ? memberInfo(editingMember)?.display_name : "Member")} — Roles</Text>
              <Pressable disabled={busy} onPress={closeRoles}><Ionicons name="close" size={24} color="#111" /></Pressable></View>
            <Text style={styles.hint}>Select the capabilities applicable to this tour.</Text>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {allowedCapabilities.map(c => <Pressable key={c.capability_id} disabled={busy} onPress={() => setSelectedCapabilities(prev => prev.includes(c.capability_id) ? prev.filter(id => id !== c.capability_id) : [...prev, c.capability_id])} style={styles.pickerRow}>
                <View style={styles.capRow}>
                  <Ionicons name={selectedCapabilities.includes(c.capability_id) ? "checkbox" : "square-outline"} size={23} color={colors.primary} />
                  <View style={{ flex: 1 }}><Text style={styles.memberName}>{c.name}</Text><Text style={styles.memberSub}>{c.category}</Text></View>
                </View>
              </Pressable>)}
              {allowedCapabilities.length === 0 ? <Text style={styles.hint}>No registered capabilities. Add them in People first.</Text> : null}
            </ScrollView>
            <Pressable disabled={busy} onPress={() => { void saveRoles(); }} style={[styles.primaryButton, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Saving…" : "Save roles"}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>}
  </>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerCard: { borderRadius: 14, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e7e7e7", gap: 12 },
  tourName: { fontSize: 20, fontWeight: "900", color: "#111" },
  hint: { fontSize: 13, color: "#666", lineHeight: 19 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignSelf: "flex-start" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#333" },
  memberCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e7e7e7", padding: 14, gap: 8 },
  memberName: { fontSize: 16, color: "#111", fontWeight: "800" },
  memberSub: { fontSize: 12, color: "#666", marginTop: 3 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  editButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "rgba(13,148,136,0.3)", backgroundColor: "rgba(13,148,136,0.06)" },
  editText: { fontSize: 11, color: colors.primary, fontWeight: "700" },
  removeButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "rgba(198,40,40,0.25)", backgroundColor: "rgba(198,40,40,0.04)" },
  removeText: { fontSize: 11, color: "#C62828", fontWeight: "700" },
  warning: { fontSize: 12, color: "#B45309", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { maxHeight: "75%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 },
  modalTitle: { flex: 1, fontWeight: "900", fontSize: 18, color: "#111" },
  modalContent: { gap: 10 },
  searchInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15 },
  pickerRow: { borderWidth: 1, borderColor: "#e7e7e7", backgroundColor: "#f5f5f5", padding: 12, borderRadius: 12 },
  capRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
