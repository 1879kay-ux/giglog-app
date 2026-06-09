import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type MemberType = "musician" | "crew";
type ActRole = "core_musician" | "crew";

type ActRow = {
  act_id: string;
  act_name: string | null;
  band_id: string | null;
};

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  member_type: MemberType | null;
  is_active: boolean | null;
  is_dep?: boolean | null;
};

type LineupBandMember =
  | {
      display_name: string | null;
      member_type: MemberType | null;
      band_role: string | null;
      band_role_other: string | null;
      band_positions: string[] | null;
      band_positions_other: string[] | null;
      is_active: boolean | null;
    }
  | {
      display_name: string | null;
      member_type: MemberType | null;
      band_role: string | null;
      band_role_other: string | null;
      band_positions: string[] | null;
      band_positions_other: string[] | null;
      is_active: boolean | null;
    }[]
  | null;

type ActMemberRow = {
  act_member_id: string;
  member_id: string;
  role: string | null;
  band_members: LineupBandMember;
};

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
  const [act, setAct] = useState<ActRow | null>(null);
  const [lineup, setLineup] = useState<ActMemberRow[]>([]);
  const [availableMembers, setAvailableMembers] = useState<BandMemberRow[]>([]);

  const load = useCallback(async () => {
    if (!actId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: actData, error: actError } = await supabase
        .from("acts")
        .select("act_id, act_name, band_id")
        .eq("act_id", actId)
        .maybeSingle();

      if (actError) throw actError;

      const actRow = (actData as ActRow | null) ?? null;
      setAct(actRow);

      const { data: lineupData, error: lineupError } = await supabase
        .from("act_members")
        .select(`
          act_member_id,
          member_id,
          role,
          band_members (
            display_name,
            member_type,
            band_role,
            band_role_other,
            band_positions,
            band_positions_other,
            is_active
          )
        `)
        .eq("act_id", actId);

      if (lineupError) throw lineupError;

      const nextLineup = (lineupData ?? []) as ActMemberRow[];
      setLineup(nextLineup);

      if (!actRow?.band_id) {
        setAvailableMembers([]);
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from("band_members")
        .select("member_id, display_name, member_type, is_active, is_dep")
        .eq("band_id", actRow.band_id)
        .eq("is_active", true)
        .order("display_name", { ascending: true });

      if (memberError) throw memberError;

      const assignedIds = new Set(nextLineup.map((row) => row.member_id));
      setAvailableMembers(
        ((memberData ?? []) as BandMemberRow[]).filter(
          (member) =>
            (member.member_type === "musician" || member.member_type === "crew") &&
            !member.is_dep &&
            !assignedIds.has(member.member_id),
        ),
      );
    } catch (e: any) {
      console.log("act lineup load error", e);
      Alert.alert("Error", e?.message ?? "Failed to load line-up");
      setAct(null);
      setLineup([]);
      setAvailableMembers([]);
    } finally {
      setLoading(false);
    }
  }, [actId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const coreMusicians = useMemo(
    () =>
      lineup.filter((row) => {
        const member = getBandMember(row);
        return normalizeRole(row.role, member?.member_type ?? null) === "core_musician";
      }),
    [lineup],
  );

  const crew = useMemo(
    () =>
      lineup.filter((row) => {
        const member = getBandMember(row);
        return normalizeRole(row.role, member?.member_type ?? null) === "crew";
      }),
    [lineup],
  );

  const roleLabel = (role: ActRole) =>
    role === "crew" ? t("bandMembers.sectionCrew") : t("acts.coreMusicians");

  async function addMember(member: BandMemberRow) {
    if (!actId) return;
    if (lineup.some((row) => row.member_id === member.member_id)) return;

    setSavingId(member.member_id);
    try {
      const nextRole: ActRole =
        member.member_type === "crew" ? "crew" : "core_musician";

      const { error } = await supabase.from("act_members").insert({
        act_id: actId,
        member_id: member.member_id,
        role: nextRole,
      });

      if (error) throw error;

      setPickerOpen(false);
      await load();
    } catch (e: any) {
      console.log("act lineup add member error", e);
      Alert.alert("Error", e?.message ?? "Failed to add member");
    } finally {
      setSavingId(null);
    }
  }

  async function updateRole(actMemberId: string, nextRole: ActRole) {
    const current = lineup.find((row) => row.act_member_id === actMemberId) ?? null;
    if (!current) return;

    const member = getBandMember(current);
    const currentRole = normalizeRole(current.role, member?.member_type ?? null);
    if (currentRole === nextRole) return;

    setSavingId(actMemberId);
    try {
      const { error } = await supabase
        .from("act_members")
        .update({ role: nextRole })
        .eq("act_member_id", actMemberId);

      if (error) throw error;

      await load();
    } catch (e: any) {
      console.log("act lineup update role error", e);
      Alert.alert("Error", e?.message ?? "Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  async function removeMember(actMemberId: string) {
    setSavingId(actMemberId);
    try {
      const { error } = await supabase
        .from("act_members")
        .delete()
        .eq("act_member_id", actMemberId);

      if (error) throw error;

      await load();
    } catch (e: any) {
      console.log("act lineup remove member error", e);
      Alert.alert("Error", e?.message ?? "Failed to remove member");
    } finally {
      setSavingId(null);
    }
  }

  const renderLineupCard = (row: ActMemberRow) => {
    const member = getBandMember(row);
    const name = member?.display_name ?? "Unnamed";
    const memberType = member?.member_type ?? null;
    const role = normalizeRole(row.role, memberType);
    const saving = savingId === row.act_member_id;
    const instruments = [
      ...(member?.band_positions ?? []),
      ...(member?.band_positions_other ?? []),
    ]
      .filter(Boolean)
      .join(", ");
    const crewRole =
      member?.band_role === "Other"
        ? (member?.band_role_other ?? null)
        : (member?.band_role ?? null);
    const subtitle =
      memberType === "crew"
        ? (crewRole || t("bandMembers.sectionCrew"))
        : (instruments || t("bandMembers.typeMusician"));
    const badgeLabel =
      role === "crew" ? t("bandMembers.sectionCrew") : t("bandEdit.roleBand");

    return (
      <View key={row.act_member_id} style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{name}</Text>
            {subtitle ? <Text style={styles.memberSub}>{subtitle}</Text> : null}
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{badgeLabel}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => removeMember(row.act_member_id)}
          disabled={saving}
          style={[styles.removeButton, saving ? styles.disabled : null]}
        >
          <Text style={styles.removeButtonText}>{t("acts.remove")}</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("acts.lineup"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.actName}>{act?.act_name ?? "Untitled"}</Text>
          <Pressable style={styles.addButton} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>{t("acts.addMember")}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("acts.coreMusicians")}</Text>
          {coreMusicians.map(renderLineupCard)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("bandMembers.sectionCrew")}</Text>
          {crew.map(renderLineupCard)}
        </View>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("acts.addMember")}</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#111" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {availableMembers.map((member) => (
                <Pressable
                  key={member.member_id}
                  onPress={() => addMember(member)}
                  disabled={savingId === member.member_id}
                  style={[
                    styles.memberPickerRow,
                    savingId === member.member_id ? styles.disabled : null,
                  ]}
                >
                  <Text style={styles.memberPickerName}>
                    {member.display_name ?? "Unnamed"}
                  </Text>
                  <Text style={styles.memberPickerType}>
                    {member.member_type === "crew"
                      ? t("bandMembers.sectionCrew")
                      : t("home.bandAndCrew")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e7e7e7",
  },
  actName: { fontSize: 20, fontWeight: "900", color: "#111" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: "#0D9488",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  addButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#333" },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    gap: 10,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberName: { fontSize: 16, fontWeight: "700", color: "#111" },
  memberSub: { marginTop: 2, fontSize: 12, color: "#666" },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#E8F6F6",
    borderWidth: 1,
    borderColor: "#009999",
  },
  roleBadgeText: { color: "#009999", fontSize: 11, fontWeight: "800" },
  removeButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(198,40,40,0.25)",
    backgroundColor: "rgba(198,40,40,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-end",
  },
  removeButtonText: { color: "#C62828", fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    maxHeight: "75%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  modalContent: { gap: 10 },
  memberPickerRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  memberPickerName: { fontSize: 14, fontWeight: "800", color: "#111" },
  memberPickerType: { marginTop: 4, fontSize: 12, color: "#666" },
});