import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  email: string | null;
  member_type: "musician" | "crew" | null;

  band_role: string | null;
  band_role_other: string | null;

  band_positions: string[] | null;
  band_positions_other: string[] | null;

  is_active: boolean | null;
  is_admin: boolean | null;
  is_dep: boolean | null;
};

const CREW_ROLE_SET = new Set<string>([
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
]);

function isCrewMember(m: BandMemberRow) {
  if (m.member_type === "crew") return true;
  const r = (m.band_role ?? "").trim();
  if (CREW_ROLE_SET.has(r)) return true;
  return false;
}

export default function BandMembersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    isAdmin,
    adminModeEnabled,
    loading: memberLoading,
  } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<BandMemberRow[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  const title = useMemo(
    () =>
      showInactive
        ? t("bandMembers.titleAll")
        : t("bandMembers.titleActive"),
    [showInactive, t],
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from("band_members")
      .select(
        "member_id, display_name, email, member_type, band_role, band_role_other, band_positions, band_positions_other, is_active, is_admin, is_dep",
      )
      .order("display_name", { ascending: true });

    if (!showInactive) q = q.eq("is_active", true);

    const { data, error } = await q;

    if (error) {
      console.log("loadMembers error", error);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers((data as BandMemberRow[]) ?? []);
    setLoading(false);
  }, [showInactive]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
      return () => {};
    }, [loadMembers]),
  );

  const musicians = useMemo(
    () => members.filter((m) => !isCrewMember(m)),
    [members],
  );
  const crew = useMemo(() => members.filter((m) => isCrewMember(m)), [members]);

  const renderMemberRow = ({ item }: { item: BandMemberRow }) => {
    const presetPositions = item.band_positions ?? [];
    const customPositions = item.band_positions_other ?? [];
    const allPositions = [...presetPositions, ...customPositions].filter(
      Boolean,
    );
    const positions = allPositions.length > 0 ? allPositions.join(", ") : "";

    const roleDisplay =
      item.band_role === "Other"
        ? item.band_role_other?.trim() || t("bandMembers.other")
        : (item.band_role ?? "").trim();

    const statusLabel = item.is_active ? "" : t("bandMembers.inactive");

    const crewLike = isCrewMember(item);
    const typeLabel = crewLike
      ? t("bandMembers.typeCrew")
      : t("bandMembers.typeMusician");

    return (
      <Pressable
        style={[styles.row, !item.is_active && styles.rowInactive]}
        onPress={() => {
          if (!canEdit) return; // ✅ when admin mode is OFF, don't navigate (prevents bounce to home)
          router.push(`/band/edit?id=${item.member_id}` as any);
        }}
      >
        <View style={styles.left}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {item.display_name ?? t("bandMembers.unnamed")}
            </Text>
            {statusLabel ? (
              <Text style={styles.inactiveTag}>{statusLabel}</Text>
            ) : null}
          </View>

          <Text style={styles.meta}>
            {roleDisplay}
            {positions ? ` • ${positions}` : ""}
          </Text>

          {item.email ? <Text style={styles.meta2}>{item.email}</Text> : null}

          <View style={styles.tagRow}>
            <View
              style={[
                styles.typeTag,
                crewLike ? styles.typeTagCrew : styles.typeTagMusician,
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  crewLike
                    ? styles.typeTagCrewText
                    : styles.typeTagMusicianText,
                ]}
              >
                {typeLabel}
              </Text>
            </View>

            {!!item.is_dep ? (
              <View style={styles.depTag}>
                <Text style={styles.depTagText}>{t("bandMembers.dep")}</Text>
              </View>
            ) : null}

            {!!item.is_admin ? (
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>{t("bandMembers.admin")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title }} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>
            {showInactive
              ? t("bandMembers.subtitleAllMembers")
              : t("bandMembers.subtitleActiveMembers")}
          </Text>

          <View style={styles.headerActions}>
            <Pressable
              style={[
                styles.filterButton,
                showInactive && styles.filterButtonOn,
              ]}
              onPress={() => setShowInactive((v) => !v)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  showInactive && styles.filterButtonTextOn,
                ]}
              >
                {showInactive
                  ? t("bandMembers.hideInactive")
                  : t("bandMembers.showInactive")}
              </Text>
            </Pressable>

            {canEdit ? (
              <Pressable
                style={styles.addButton}
                onPress={() => router.push("/band/add" as any)}
              >
                <Text style={styles.addButtonText}>{t("bandMembers.add")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {loading || memberLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t("bandMembers.sectionMusicians")}</Text>
            {musicians.length === 0 ? (
              <Text style={styles.empty}>{t("bandMembers.emptyMusicians")}</Text>
            ) : (
              <FlatList
                data={musicians}
                keyExtractor={(item) => item.member_id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={renderMemberRow}
              />
            )}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              {t("bandMembers.sectionCrew")}
            </Text>
            {crew.length === 0 ? (
              <Text style={styles.empty}>{t("bandMembers.emptyCrew")}</Text>
            ) : (
              <FlatList
                data={crew}
                keyExtractor={(item) => item.member_id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={renderMemberRow}
              />
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  subtitle: { fontSize: 14, fontWeight: "600", color: "#333" },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },

  filterButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#009999",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  filterButtonOn: { backgroundColor: "#009999", borderColor: "#009999" },
  filterButtonText: { color: "#009999", fontWeight: "800" },
  filterButtonTextOn: { color: "#fff" },

  addButton: {
    backgroundColor: "#009999",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "700" },

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    marginBottom: 10,
  },

  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowInactive: { opacity: 0.6 },

  left: { flex: 1, paddingRight: 8 },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontWeight: "700", color: "#111" },

  inactiveTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E74C3C",
    borderWidth: 1,
    borderColor: "#E74C3C",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  meta: { marginTop: 2, fontSize: 13, color: "#444" },
  meta2: { marginTop: 2, fontSize: 12, color: "#666" },

  separator: { height: 10 },
  empty: { marginTop: 6, color: "#666" },

  tagRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },

  typeTag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeTagText: { fontSize: 11, fontWeight: "800" },
  typeTagMusician: { backgroundColor: "#E8F6F6", borderColor: "#009999" },
  typeTagCrew: { backgroundColor: "#FFF4E5", borderColor: "#F39C12" },
  typeTagMusicianText: { color: "#009999" },
  typeTagCrewText: { color: "#B66A00" },

  depTag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7F8C8D",
    backgroundColor: "#F2F2F2",
  },
  depTagText: { fontSize: 11, fontWeight: "800", color: "#555" },

  adminTag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#6C5CE7",
    backgroundColor: "#F1EFFF",
  },
  adminTagText: { fontSize: 11, fontWeight: "800", color: "#6C5CE7" },
});
