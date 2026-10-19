import { supabase } from "@/lib/supabase";
import { capabilityDisplayName } from "@/lib/capabilities";

import { Ionicons } from "@expo/vector-icons";

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import React, { useCallback, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import {

  ActivityIndicator,

  Alert,

  KeyboardAvoidingView,

  Modal,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from "react-native";



type MemberType = "musician" | "crew";

type ActRole = "core_musician" | "crew";

type ActRow = { act_id: string; act_name: string | null; band_id: string | null };

type BandMemberRow = {

  member_id: string;

  display_name: string | null;

  member_type: MemberType | null;

  is_active: boolean | null;

  is_dep?: boolean | null;

};

type LineupBandMember = {

  display_name: string | null;

  member_type: MemberType | null;

  band_role: string | null;

  band_role_other: string | null;

  band_positions: string[] | null;

  band_positions_other: string[] | null;

  is_active: boolean | null;

} | {

  display_name: string | null;

  member_type: MemberType | null;

  band_role: string | null;

  band_role_other: string | null;

  band_positions: string[] | null;

  band_positions_other: string[] | null;

  is_active: boolean | null;

}[] | null;

type ActMemberRow = {

  act_member_id: string;

  member_id: string;

  role: string | null;

  band_members: LineupBandMember;

};

type Capability = {
  capability_id: string;
  name: string;
  standard_key: string | null;
  category: string;
  sort_order: number;
};

type PersonCapability = { member_id: string; capability_id: string };

type AssignmentCapability = { act_member_id: string; capability_id: string };



function getBandMember(row: ActMemberRow) {

  if (Array.isArray(row.band_members)) return row.band_members[0] ?? null;

  return row.band_members ?? null;

}

function normalizeRole(role: string | null, memberType: MemberType | null): ActRole {

  if (role === "crew") return "crew";

  if (role === "core_musician") return "core_musician";

  return memberType === "crew" ? "crew" : "core_musician";

}



export default function ActLineupScreen() {

  const router = useRouter();

  const { t } = useTranslation();

  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const actId = Array.isArray(params.id) ? params.id[0] : params.id;



  const [loading, setLoading] = useState(true);

  const [savingId, setSavingId] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");

  const [act, setAct] = useState<ActRow | null>(null);

  const [lineup, setLineup] = useState<ActMemberRow[]>([]);

  const [availableMembers, setAvailableMembers] = useState<BandMemberRow[]>([]);

  const [capabilities, setCapabilities] = useState<Capability[]>([]);

  const [personCapabilities, setPersonCapabilities] = useState<PersonCapability[]>([]);

  const [assignedCapabilities, setAssignedCapabilities] = useState<AssignmentCapability[]>([]);

  const [selectedMember, setSelectedMember] = useState<BandMemberRow | null>(null);

  const [editingAssignment, setEditingAssignment] = useState<ActMemberRow | null>(null);

  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);



  const load = useCallback(async () => {

    if (!actId) { setLoading(false); return; }

    // Keep the screen and any open modal mounted during background refreshes.

    try {

      const { data: actData, error: actError } = await supabase

        .from("acts").select("act_id, act_name, band_id").eq("act_id", actId).maybeSingle();

      if (actError) throw actError;

      const actRow = (actData as ActRow | null) ?? null;

      setAct(actRow);



      const { data: lineupData, error: lineupError } = await supabase

        .from("act_members")

        .select(`act_member_id, member_id, role, band_members (

          display_name, member_type, band_role, band_role_other,

          band_positions, band_positions_other, is_active

        )`)

        .eq("act_id", actId);

      if (lineupError) throw lineupError;

      const nextLineup = (lineupData ?? []) as ActMemberRow[];

      setLineup(nextLineup);



      if (!actRow?.band_id) { setAvailableMembers([]); return; }

      const { data: memberData, error: memberError } = await supabase

        .from("band_members")

        .select("member_id, display_name, member_type, is_active, is_dep")

        .eq("band_id", actRow.band_id).eq("is_active", true)

        .order("display_name", { ascending: true });

      if (memberError) throw memberError;

      const people = (memberData ?? []) as BandMemberRow[];

      const assignedIds = new Set(nextLineup.map((r) => r.member_id));

      // Deliberately include other People categories and deps: capability determines assignment.

      setAvailableMembers(people.filter((m) => !assignedIds.has(m.member_id)));



      const { data: capabilityData, error: capError } = await supabase

        .from("capabilities")

        .select("capability_id, name, standard_key, category, sort_order")

        .eq("band_id", actRow.band_id).eq("is_active", true)

        .order("category", { ascending: true }).order("sort_order", { ascending: true });

      if (capError) throw capError;

      setCapabilities((capabilityData ?? []) as Capability[]);



      const peopleIds = people.map((m) => m.member_id);

      if (peopleIds.length) {

        const { data, error } = await supabase.from("person_capabilities")

          .select("member_id, capability_id").in("member_id", peopleIds);

        if (error) throw error;

        setPersonCapabilities((data ?? []) as PersonCapability[]);

      } else { setPersonCapabilities([]); }



      const actMemberIds = nextLineup.map((m) => m.act_member_id);

      if (actMemberIds.length) {

        const { data, error } = await supabase.from("act_member_capabilities")

          .select("act_member_id, capability_id").in("act_member_id", actMemberIds);

        if (error) throw error;

        setAssignedCapabilities((data ?? []) as AssignmentCapability[]);

      } else { setAssignedCapabilities([]); }

    } catch (e: any) {

      console.log("act lineup load error", e);

      Alert.alert(t("common.error"), e?.message ?? t("acts.loadLineupError"));

      setAct(null); setLineup([]); setAvailableMembers([]);

    } finally { setLoading(false); }

  }, [actId, t]);



  useFocusEffect(useCallback(() => { load(); }, [load]));



  const filteredMembers = useMemo(() => availableMembers.filter((m) =>

    (m.display_name ?? "").toLowerCase().includes(memberSearch.trim().toLowerCase())

  ), [availableMembers, memberSearch]);



  // A person may appear in several categories, but retains one act membership.
  const categorySections = [
    { key: "performance", titleKey: "people.category.performance" },
    { key: "crew", titleKey: "people.category.crew" },
    { key: "logistics", titleKey: "people.category.logistics" },
    { key: "business", titleKey: "people.category.business" },
    { key: "creative_specialist", titleKey: "people.category.creativeSpecialist" },
    { key: "other", titleKey: "people.category.other" },
  ];

  const assignedRolesForCategory = (row: ActMemberRow, category: string) =>
    assignedCapabilities
      .filter((assignment) => assignment.act_member_id === row.act_member_id)
      .map((assignment) => capabilities.find((c) => c.capability_id === assignment.capability_id))
      .filter((capability): capability is Capability =>
        !!capability && capability.category === category
      );

  const hasAssignedRoles = (row: ActMemberRow) =>
    assignedCapabilities.some((assignment) => assignment.act_member_id === row.act_member_id);

  // Existing act members without capability assignments keep their original section.
  const belongsToCategory = (row: ActMemberRow, category: string) => {
    if (hasAssignedRoles(row)) return assignedRolesForCategory(row, category).length > 0;
    const member = getBandMember(row);
    const role = normalizeRole(row.role, member?.member_type ?? null);
    return category === (role === "crew" ? "crew" : "performance");
  };

  const memberCapabilitiesDisplay = (memberId: string) =>
    personCapabilities
      .filter((p) => p.member_id === memberId)
      .map((p) => {
        const capability = capabilities.find((c) => c.capability_id === p.capability_id);
        return capability
          ? capabilityDisplayName(capability.name, capability.standard_key)
          : undefined;
      })
      .filter(Boolean)
      .join(" · ");

  const capabilityCategoryLabel = (category: string) => {
    const section = categorySections.find((item) => item.key === category);
    return section ? t(section.titleKey) : t("people.category.other");
  };

  function beginAdding(member: BandMemberRow) {

    setSelectedMember(member);

    setEditingAssignment(null);

    setSelectedCapabilityIds(personCapabilities

      .filter((p) => p.member_id === member.member_id)

      .map((p) => p.capability_id)

      .filter((id) => capabilities.some((c) => c.capability_id === id)));

    setPickerOpen(false);

  }

  function beginEditing(row: ActMemberRow) {

    setEditingAssignment(row);

    setSelectedMember(null);

    setSelectedCapabilityIds(assignedCapabilities

      .filter((a) => a.act_member_id === row.act_member_id)

      .map((a) => a.capability_id));

  }

  function closeCapabilityPicker() { setSelectedMember(null); setEditingAssignment(null); }

  function toggleCapability(id: string) {

    setSelectedCapabilityIds((current) => current.includes(id)

      ? current.filter((value) => value !== id) : [...current, id]);

  }



  async function saveCapabilities() {

    if (!actId || (!selectedMember && !editingAssignment)) return;

    if (selectedCapabilityIds.length === 0) {
      Alert.alert(t("acts.assignRole"), t("acts.selectRoleBeforeSaving"));
      return;
    }

    const member = selectedMember;

    const assignment = editingAssignment;

    const busyId = member?.member_id ?? assignment?.act_member_id ?? null;

    setSavingId(busyId);

    try {

      let assignmentId = assignment?.act_member_id;

      if (member) {

        // Retain the existing role field for backward compatibility with existing screens.

        const nextRole: ActRole = member.member_type === "crew" ? "crew" : "core_musician";

        const { data, error } = await supabase.from("act_members")

          .insert({ act_id: actId, member_id: member.member_id, role: nextRole })

          .select("act_member_id").single();

        if (error) throw error;

        assignmentId = data.act_member_id;

      }

      if (!assignmentId) throw new Error(t("acts.membershipNotIdentified"));



      const existing = assignedCapabilities.filter((a) => a.act_member_id === assignmentId);

      const existingIds = new Set(existing.map((a) => a.capability_id));

      const selectedIds = new Set(selectedCapabilityIds);

      const toRemove = existing.filter((a) => !selectedIds.has(a.capability_id)).map((a) => a.capability_id);

      const toAdd = selectedCapabilityIds.filter((id) => !existingIds.has(id));

      if (toRemove.length) {

        const { error } = await supabase.from("act_member_capabilities")

          .delete().eq("act_member_id", assignmentId).in("capability_id", toRemove);

        if (error) throw error;

      }

      if (toAdd.length) {

        const { error } = await supabase.from("act_member_capabilities").insert(

          toAdd.map((capability_id) => ({ act_member_id: assignmentId, capability_id }))

        );

        if (error) throw error;

      }

      closeCapabilityPicker();

      setMemberSearch("");

      await load();

    } catch (e: any) {

      console.log("act capability save error", e);

      Alert.alert(t("common.error"), e?.message ?? t("acts.saveRolesError"));

    } finally { setSavingId(null); }

  }



  async function removeMember(actMemberId: string) {

    setSavingId(actMemberId);

    try {

      const { error } = await supabase.from("act_members")

        .delete().eq("act_member_id", actMemberId);

      if (error) throw error;

      await load();

    } catch (e: any) {

      console.log("act lineup remove member error", e);

      Alert.alert(t("common.error"), e?.message ?? t("acts.removeMemberError"));

    } finally { setSavingId(null); }

  }



  const renderLineupCard = (row: ActMemberRow, category: string) => {

    const member = getBandMember(row);
    const name = member?.display_name ?? t("acts.unnamedMember");
    const saving = savingId === row.act_member_id;
    const assignedNames = assignedRolesForCategory(row, category)
      .map((c) => capabilityDisplayName(c.name, c.standard_key))
      .join(", ");
    const instruments = [...(member?.band_positions ?? []), ...(member?.band_positions_other ?? [])]
      .filter(Boolean).join(", ");
    const crewRole = member?.band_role === "Other" ? member?.band_role_other : member?.band_role;
    const needsRole = !hasAssignedRoles(row);
    const subtitle = needsRole ? t("acts.assignRole") : assignedNames;

    return (
      <View key={`${row.act_member_id}-${category}`} style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{name}</Text>
            {subtitle ? <Text style={[styles.memberSub, needsRole && styles.roleWarning]}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.memberActions}>
          <Pressable onPress={() => beginEditing(row)} disabled={saving}
            style={[styles.editButton, saving ? styles.disabled : null]}>
            <Text style={styles.editButtonText}>{t("acts.editRoles")}</Text>
          </Pressable>
          <Pressable onPress={() => removeMember(row.act_member_id)} disabled={saving}
            style={[styles.removeButton, saving ? styles.disabled : null]}>
            <Text style={styles.removeButtonText}>{t("acts.remove")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  const editingName = editingAssignment ? getBandMember(editingAssignment)?.display_name : selectedMember?.display_name;

  const selectedPersonId = selectedMember?.member_id ?? editingAssignment?.member_id;

  const personCapabilityIds = new Set(personCapabilities.filter((p) => p.member_id === selectedPersonId).map((p) => p.capability_id));

  // Show registered capabilities first; existing assignments remain selectable when editing.

  const availableCapabilities = capabilities.filter((c) =>

    personCapabilityIds.has(c.capability_id) || selectedCapabilityIds.includes(c.capability_id)

  );



  return (

    <>

      <Stack.Screen options={{

        title: t("acts.lineup"),

        headerLeft: () => <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>

          <Ionicons name="arrow-back" size={22} color="#fff" />

        </Pressable>,

      }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <View style={styles.headerCard}>

          <Text style={styles.actName}>{act?.act_name ?? t("acts.untitled")}</Text>

          <Pressable style={styles.addButton} onPress={() => { setMemberSearch(""); setPickerOpen(true); }}>

            <Ionicons name="add-circle-outline" size={18} color="#fff" />

            <Text style={styles.addButtonText}>{t("acts.addMember")}</Text>

          </Pressable>

        </View>

        {categorySections.map((category) => {
          const categoryMembers = lineup
            .filter((row) => belongsToCategory(row, category.key))
            .sort((a, b) => (getBandMember(a)?.display_name ?? "")
              .localeCompare(getBandMember(b)?.display_name ?? ""));
          if (categoryMembers.length === 0) return null;
          return (
            <View key={category.key} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(category.titleKey)}</Text>
              {categoryMembers.map((row) => renderLineupCard(row, category.key))}
            </View>
          );
        })}

      </ScrollView>



      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>

        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>

          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />

          <View style={[styles.modalCard, styles.memberPickerModalCard]}>

            <View style={styles.modalHeader}>

              <Text style={styles.modalTitle}>{t("acts.addMember")}</Text>

              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>

                <Ionicons name="close" size={22} color="#111" />

              </Pressable>

            </View>

            <TextInput style={styles.searchInput} placeholder={t("people.searchPlaceholder")} value={memberSearch}

              onChangeText={setMemberSearch} autoCorrect={false} />

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              {filteredMembers.map((member) => (

                <Pressable key={member.member_id} onPress={() => beginAdding(member)}

                  disabled={savingId === member.member_id}

                  style={[styles.memberPickerRow, savingId === member.member_id ? styles.disabled : null]}>

                  <Text style={styles.memberPickerName}>{member.display_name ?? t("acts.unnamedMember")}</Text>

                  <Text style={styles.memberPickerType}>
                    {memberCapabilitiesDisplay(member.member_id) || t("acts.noCapabilitiesRegistered")}
                  </Text>

                </Pressable>

              ))}

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </Modal>



      <Modal visible={!!selectedMember || !!editingAssignment} animationType="slide" transparent

        onRequestClose={closeCapabilityPicker}>

        <View style={styles.modalOverlay}>

          <Pressable style={StyleSheet.absoluteFill} onPress={closeCapabilityPicker} />

          <View style={styles.modalCard}>

            <View style={styles.modalHeader}>

              <Text style={styles.modalTitle}>{t("acts.rolesTitle", { member: editingName ?? t("acts.member") })}</Text>

              <Pressable onPress={closeCapabilityPicker} hitSlop={10} disabled={savingId !== null}>

                <Ionicons name="close" size={22} color="#111" />

              </Pressable>

            </View>

            <Text style={styles.hint}>{t("acts.selectCapabilitiesHint")}</Text>

            <ScrollView contentContainerStyle={styles.modalContent}>

              {availableCapabilities.map((capability) => {

                const selected = selectedCapabilityIds.includes(capability.capability_id);

                return (

                  <Pressable key={capability.capability_id} style={styles.memberPickerRow}

                    onPress={() => toggleCapability(capability.capability_id)} disabled={savingId !== null}>

                    <View style={styles.capabilityRow}>

                      <Ionicons name={selected ? "checkbox" : "square-outline"} size={23} color="#0D9488" />

                      <View style={{ flex: 1 }}>

                        <Text style={styles.memberPickerName}>
                          {capabilityDisplayName(capability.name, capability.standard_key)}
                        </Text>

                        <Text style={styles.memberPickerType}>
                          {capabilityCategoryLabel(capability.category)}
                        </Text>

                      </View>

                    </View>

                  </Pressable>

                );

              })}

              {availableCapabilities.length === 0 && <Text style={styles.hint}>

                {t("acts.noCapabilitiesForPerson")}

              </Text>}

            </ScrollView>

            <Pressable style={[styles.addButton, savingId !== null ? styles.disabled : null]}

              disabled={savingId !== null} onPress={saveCapabilities}>

              <Text style={styles.addButtonText}>{savingId !== null ? t("acts.savingRoles") : t("common.save")}</Text>

            </Pressable>

          </View>

        </View>

      </Modal>

    </>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#f5f5f5" },

  content: { padding: 16, paddingBottom: 32, gap: 16 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  headerCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: "#e7e7e7" },

  actName: { fontSize: 20, fontWeight: "900", color: "#111" },

  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,

    borderRadius: 10, backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },

  addButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },

  section: { gap: 10 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#333" },

  memberCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e7e7e7", gap: 10 },

  memberHeader: { flexDirection: "row", alignItems: "center", gap: 10 },

  memberName: { fontSize: 16, fontWeight: "700", color: "#111" },

  memberSub: { marginTop: 2, fontSize: 12, color: "#666" },
  roleWarning: { color: "#B45309", fontWeight: "700" },

  roleBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#E8F6F6",

    borderWidth: 1, borderColor: "#009999" },

  roleBadgeText: { color: "#009999", fontSize: 11, fontWeight: "800" },

  memberActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },

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

  memberPickerModalCard: { height: "65%" },

  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111", flexShrink: 1 },

  modalContent: { gap: 10 },

  memberPickerRow: { borderRadius: 12, borderWidth: 1, borderColor: "#e7e7e7", backgroundColor: "#f5f5f5",

    paddingHorizontal: 12, paddingVertical: 12 },

  memberPickerName: { fontSize: 14, fontWeight: "800", color: "#111" },

  memberPickerType: { marginTop: 4, fontSize: 12, color: "#666" },

  capabilityRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  searchInput: { borderWidth: 1, borderColor: "#e7e7e7", borderRadius: 10, padding: 12,

    marginBottom: 12, fontSize: 15, color: "#111" },

  hint: { color: "#666", fontSize: 13, marginBottom: 12 },

});
