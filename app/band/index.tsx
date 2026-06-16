import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
  TextInput,
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

type CapabilityCategory =
  | "performance"
  | "crew"
  | "logistics"
  | "business"
  | "creative_specialist"
  | "other";

const CAPABILITY_CATEGORY_ORDER: CapabilityCategory[] = [
  "performance",
  "crew",
  "logistics",
  "business",
  "creative_specialist",
  "other",
];

type CapabilityRow = {
  member_id: string;
  capabilities:
    | { name: string | null; category: CapabilityCategory | null }
    | { name: string | null; category: CapabilityCategory | null }[]
    | null;
};

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
  const [capabilitySummaryByMemberId, setCapabilitySummaryByMemberId] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityCategoriesByMemberId, setCapabilityCategoriesByMemberId] = useState<Record<string, CapabilityCategory[]>>({});

  const title = useMemo(
  () =>
    showInactive
      ? t("people.titleAll")
      : t("people.titleActive"),
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

  useEffect(() => {
    let alive = true;

    const loadCapabilitySummaries = async () => {
      const memberIds = members.map((m) => m.member_id);
      if (memberIds.length === 0) {
        if (alive) setCapabilitySummaryByMemberId({});
        if (alive) setCapabilityCategoriesByMemberId({});
        return;
      }

      const { data, error } = await supabase
        .from("person_capabilities")
        .select("member_id, capabilities(name,category)")
        .in("member_id", memberIds);

      if (!alive) return;

      if (error) {
        console.log("loadCapabilitySummaries error", error);
        setCapabilitySummaryByMemberId({});
        setCapabilityCategoriesByMemberId({});
        return;
      }

      const nextSummaryByMemberId: Record<string, string[]> = {};
      const nextCategoriesByMemberId: Record<string, CapabilityCategory[]> = {};

      ((data ?? []) as CapabilityRow[]).forEach((row) => {
        const capability =
          Array.isArray(row.capabilities)
            ? row.capabilities[0]
            : row.capabilities;

        const name = capability?.name?.trim();
        const category = capability?.category ?? null;

        if (!name) return;

        if (!nextSummaryByMemberId[row.member_id]) {
          nextSummaryByMemberId[row.member_id] = [];
        }
        nextSummaryByMemberId[row.member_id].push(name);

        if (
          category &&
          CAPABILITY_CATEGORY_ORDER.includes(category) &&
          !(
            nextCategoriesByMemberId[row.member_id] ?? []
          ).includes(category)
        ) {
          if (!nextCategoriesByMemberId[row.member_id]) {
            nextCategoriesByMemberId[row.member_id] = [];
          }
          nextCategoriesByMemberId[row.member_id].push(category);
        }
      });

      Object.keys(nextSummaryByMemberId).forEach((id) => {
        nextSummaryByMemberId[id] = nextSummaryByMemberId[id].sort((a, b) =>
          a.localeCompare(b),
        );
      });

      Object.keys(nextCategoriesByMemberId).forEach((id) => {
        nextCategoriesByMemberId[id] = nextCategoriesByMemberId[id].sort(
          (a, b) =>
            CAPABILITY_CATEGORY_ORDER.indexOf(a) -
            CAPABILITY_CATEGORY_ORDER.indexOf(b),
        );
      });

      if (alive) {
        setCapabilitySummaryByMemberId(nextSummaryByMemberId);
        setCapabilityCategoriesByMemberId(nextCategoriesByMemberId);
      }
    };

    loadCapabilitySummaries();
    return () => {
      alive = false;
    };
  }, [members]);

  const capabilityCategoryLabel = (category: CapabilityCategory) => {
    if (category === "performance") return t("people.category.performance");
    if (category === "crew") return t("people.category.crew");
    if (category === "logistics") return t("people.category.logistics");
    if (category === "business") return t("people.category.business");
    if (category === "creative_specialist") return t("people.category.creativeSpecialist");
    return t("people.category.other");
  };

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;

    return members.filter((m) => {
      const name = (m.display_name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      const capabilityText = (capabilitySummaryByMemberId[m.member_id] ?? [])
        .join(" • ")
        .toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        capabilityText.includes(q)
      );
    });
  }, [members, capabilitySummaryByMemberId, searchQuery]);

  const renderMemberRow = ({ item }: { item: BandMemberRow }) => {
    const statusLabel = item.is_active ? "" : t("bandMembers.inactive");

    const categoryBadges = capabilityCategoriesByMemberId[item.member_id] ?? [];
    const caps = capabilitySummaryByMemberId[item.member_id] ?? [];
    const capSubtitle =
      caps.length > 0
        ? `${caps.slice(0, 3).join(" • ")}${caps.length > 3 ? ` +${caps.length - 3} more` : ""}`
        : t("people.noCapabilities");

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

          <Text style={styles.meta}>{capSubtitle}</Text>

          {item.email ? <Text style={styles.meta2}>{item.email}</Text> : null}

          <View style={styles.tagRow}>
            {categoryBadges.map((category) => (
              <View
                key={`${item.member_id}-${category}`}
                style={styles.categoryTag}
              >
                <Text style={styles.categoryTagText}>
                  {capabilityCategoryLabel(category)}
                </Text>
              </View>
            ))}

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
            <Text style={styles.sectionTitle}>{t("people.titleActive")}</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("people.searchPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.member_id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={renderMemberRow}
            />
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

  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
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

  categoryTag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  categoryTagText: { fontSize: 11, fontWeight: "800", color: "#4B5563" },

  // legacy badge styles retained for now

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
