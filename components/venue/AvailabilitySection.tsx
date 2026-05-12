import InfoCard from "@/components/InfoCard";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AvailabilityLabel =
  | "awaiting"
  | "available"
  | "provisional"
  | "unavailable"
  | "dep";

type MemberType = "musician" | "crew";

type AvailabilityRow = {
  event_id: string;
  member_id: string;

  display_name: string | null;
  email: string | null;

  member_type: MemberType | null;
  band_role: string | null;
  band_role_other: string | null;
  band_positions: string[] | null;
  band_positions_other: string[] | null;

  availability_status: "available" | "provisional" | "unavailable" | "dep" | null;
  availability_label: AvailabilityLabel;
  notes?: string | null;
};

type AvailabilitySummaryRow = {
  event_id: string;
  available_count: number;
  provisional_count: number;
  unavailable_count: number;
  awaiting_count: number;
  total_expected: number;
};

type Props = {
  eventId: string;
  memberId: string;
  hasCustomLineup?: boolean;
  canEdit?: boolean;
  eventDate?: string | null;
  venueName?: string | null;
};

type EventAvailabilityDbRow = {
  event_id: string;
  member_id: string;
  status: "available" | "provisional" | "unavailable" | "dep" | null;
  notes?: string | null;
  band_members: {
    display_name: string | null;
    email: string | null;
    member_type: MemberType | null;
    band_role: string | null;
    band_role_other: string | null;
    band_positions: string[] | null;
    band_positions_other: string[] | null;
  } | null;
};

// fixed width for the status column (keeps pills + header aligned)
const STATUS_W = 96;

export default function AvailabilitySection({
  eventId,
  memberId,
  hasCustomLineup,
  canEdit,
  eventDate,
  venueName,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<AvailabilitySummaryRow | null>(null);

  if (!memberId) {
    return (
      <InfoCard title="Your Availability">
        <Text style={{ fontSize: 13, color: "#C62828", fontWeight: "700" }}>
          No memberId supplied. Availability cannot be set.
        </Text>
      </InfoCard>
    );
  }

  const computeSummary = useCallback(
    (event_id: string, list: AvailabilityRow[]): AvailabilitySummaryRow => {
      let available = 0;
      let provisional = 0;
      let unavailable = 0;

      for (const r of list) {
        const s = r.availability_label;
        if (s === "available") available += 1;
        else if (s === "provisional") provisional += 1;
        else if (s === "unavailable") unavailable += 1;
      }

      const awaiting_count = list.filter((r) => r.availability_label === "awaiting").length;

      return {
        event_id,
        total_expected: list.length,
        awaiting_count,
        available_count: available,
        provisional_count: provisional,
        unavailable_count: unavailable,
      };
    },
    []
  );

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("event_availability")
      .select(
        `
        event_id,
        member_id,
        status,
        notes,
        band_members (
          display_name,
          email,
          member_type,
          band_role,
          band_role_other,
          band_positions,
          band_positions_other
        )
      `
      )
      .eq("event_id", eventId);

    if (error) {
      console.log("availability load error", error);
      Alert.alert("Error", error.message);
      setRows([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    const list = (data as unknown as EventAvailabilityDbRow[]) ?? [];

    const mapped: AvailabilityRow[] = list
      .map((r) => {
        const bm = r.band_members;
        const status = r.status ?? null;

        const label: AvailabilityLabel =
          status === null ? "awaiting" : (status as AvailabilityLabel);

        return {
          event_id: r.event_id,
          member_id: r.member_id,

          display_name: bm?.display_name ?? null,
          email: bm?.email ?? null,

          member_type: bm?.member_type ?? null,
          band_role: bm?.band_role ?? null,
          band_role_other: bm?.band_role_other ?? null,
          band_positions: bm?.band_positions ?? null,
          band_positions_other: bm?.band_positions_other ?? null,

          availability_status: status,
          availability_label: label,
          notes: r.notes ?? null,
        };
      })
      .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));

    setRows(mapped);
    setSummary(computeSummary(eventId, mapped));
    setLoading(false);
  }, [computeSummary, eventId]);

  useEffect(() => {
    load();
  }, [load, hasCustomLineup]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const musicians = useMemo(
    () => rows.filter((r) => r.member_type === "musician"),
    [rows]
  );
  const crew = useMemo(() => rows.filter((r) => r.member_type === "crew"), [rows]);

  const currentRow = useMemo(
    () => rows.find((r) => r.member_id === memberId) ?? null,
    [rows, memberId]
  );

  const currentLabel: AvailabilityLabel = currentRow?.availability_label ?? "awaiting";

async function sendAvailabilityReminder() {
  try {
    const awaitingIds = rows
      .filter((r) => r.availability_label === "awaiting")
      .map((r) => r.member_id);

    if (awaitingIds.length === 0) {
      Alert.alert("No reminders needed", "Everyone has responded.");
      return;
    }

    const title = "Availability reminder";

    const body = `Please confirm availability for ${venueName ?? "this event"}${
  eventDate ? ` on ${eventDate}` : ""
}.`;

    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_ids: awaitingIds,
        title,
        body,
        data: {
          type: "availability_reminder",
          event_id: eventId,
          open: "availability",
        },
      },
    });

    if (error) throw error;

    Alert.alert(
      "Reminder sent",
      `Sent to ${awaitingIds.length} awaiting member${
        awaitingIds.length === 1 ? "" : "s"
      }.`
    );
  } catch (e: any) {
    Alert.alert("Reminder failed", e?.message ?? "Please try again.");
  }
}

  const roleDisplay = (r: AvailabilityRow) => {
    if ((r.band_role ?? "") === "Other") return r.band_role_other ?? "Other";
    return r.band_role ?? "";
  };

  const instrumentsDisplay = (r: AvailabilityRow) => {
    const preset = r.band_positions ?? [];
    const custom = r.band_positions_other ?? [];
    const all = [...preset, ...custom].filter(Boolean);
    return all.join(", ");
  };

  async function setAvailability(label: AvailabilityLabel) {
    setSaving(true);
    try {
      if (label === "awaiting") {
        const { error } = await supabase
          .from("event_availability")
          .upsert(
            { event_id: eventId, member_id: memberId, status: null },
            { onConflict: "event_id,member_id" }
          );
        if (error) throw error;
      } else {
        const status =
          label === "available"
            ? "available"
            : label === "provisional"
            ? "provisional"
            : label === "unavailable"
            ? "unavailable"
            : label === "dep"
            ? "dep"
            : null;

        const { error } = await supabase
          .from("event_availability")
          .upsert(
            { event_id: eventId, member_id: memberId, status },
            { onConflict: "event_id,member_id" }
          );
        if (error) throw error;
      }

      await load();

if (label === "available") {
  Alert.alert("Availability updated", "You are marked as Available.");
} else if (label === "provisional") {
  Alert.alert("Availability updated", "You are marked as Provisional.");
} else if (label === "unavailable") {
  Alert.alert("Availability updated", "You are marked as Unavailable.");
}
    } catch (e: any) {
      console.log("setAvailability error", e);
      Alert.alert("Error", e?.message ?? "Failed to update availability");
    } finally {
      setSaving(false);
    }
  }

  const chip = (label: AvailabilityLabel, text: string) => {
    const selected = currentLabel === label;

    const bg =
      label === "available"
        ? "#2ECC71"
        : label === "provisional"
        ? "#F1C40F"
        : label === "unavailable"
        ? "#E74C3C"
        : label === "dep"
        ? "#5B6CFF"
        : "#e0e0e0";

    return (
      <Pressable
        key={label}
        style={[styles.chip, selected ? { backgroundColor: bg, borderColor: bg } : null]}
        disabled={saving}
        onPress={() => setAvailability(label)}
      >
        <Text style={[styles.chipText, selected ? { color: "#fff" } : null]}>{text}</Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <InfoCard title="Your Availability">
  {currentLabel === "awaiting" ? (
    <View style={styles.confirmPrompt}>
      <Text style={styles.confirmPromptTitle}>Please confirm your availability</Text>
      <Text style={styles.confirmPromptText}>
        Choose Available, Provisional or Unavailable for this event.
      </Text>
    </View>
  ) : null}

  <View style={styles.badgeRow}>
          <View style={styles.lineupBadge}>
            <Text style={styles.lineupBadgeText}>
              {hasCustomLineup ? "Custom Lineup" : "Core Band"}
            </Text>
          </View>

          {canEdit ? (
  <View style={styles.adminActions}>
    <Pressable
      onPress={() => router.push(`/events/${eventId}/lineup`)}
      hitSlop={10}
      style={styles.editLineupPill}
    >
      <Text style={styles.editLineupPillText}>Edit Lineup</Text>
    </Pressable>

    <Pressable
      onPress={sendAvailabilityReminder}
      hitSlop={10}
      style={styles.reminderPill}
    >
      <Text style={styles.reminderPillText}>Remind Awaiting</Text>
    </Pressable>
  </View>
) : (
  <View />
)}
        </View>

        <View style={styles.chipRow}>
          {chip("available", "✓ Available")}
{chip("provisional", "• Provisional")}
{chip("unavailable", "✕ Unavailable")}
        </View>

        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
      </InfoCard>

      <InfoCard title="Event Summary">
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>Total to respond: {summary?.total_expected ?? 0}</Text>
          <Text style={styles.summaryItem}>Responses due: {summary?.awaiting_count ?? 0}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>Available: {summary?.available_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Provisional: {summary?.provisional_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Unavailable: {summary?.unavailable_count ?? 0}</Text>
        </View>

        <Text style={styles.smallNote}>Counts are for members expected to respond.</Text>
      </InfoCard>

      {/* MUSICIANS */}
      <InfoCard title="Musicians">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.1 }]} numberOfLines={1}>
              Member
            </Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 2.1 }]} numberOfLines={1}>
              Instruments
            </Text>

            <View style={[styles.statusHeaderCell, { width: STATUS_W }]}>
              <Text style={styles.cellHeader} numberOfLines={1}>
                Availability
              </Text>
            </View>
          </View>

          {musicians.map((r) => (
            <View
              key={r.member_id}
              style={[styles.tableRow, r.member_id === memberId ? styles.currentUserRow : null]}
            >
              <Text style={[styles.cell, { flex: 1.1 }]} numberOfLines={1}>
                {r.display_name ?? "Unnamed"}
              </Text>

              <Text style={[styles.cell, { flex: 2.1 }]} numberOfLines={1}>
                {instrumentsDisplay(r) || "—"}
              </Text>

              <View style={[styles.statusCell, { width: STATUS_W }]}>
                <View style={[styles.statusPill, { backgroundColor: statusBg(r.availability_label) }]}>
                  <Text
                    style={[styles.statusText, { color: statusText(r.availability_label) }]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {labelText(r.availability_label)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {musicians.length === 0 ? <Text style={styles.empty}>No musicians found.</Text> : null}
        </View>
      </InfoCard>

      {/* CREW */}
      <InfoCard title="Crew">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.1 }]} numberOfLines={1}>
              Member
            </Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 2.1 }]} numberOfLines={1}>
              Role
            </Text>

            <View style={[styles.statusHeaderCell, { width: STATUS_W }]}>
              <Text style={styles.cellHeader} numberOfLines={1}>
                Availability
              </Text>
            </View>
          </View>

          {crew.map((r) => (
            <View
              key={r.member_id}
              style={[styles.tableRow, r.member_id === memberId ? styles.currentUserRow : null]}
            >
              <Text style={[styles.cell, { flex: 1.1 }]} numberOfLines={1}>
                {r.display_name ?? "Unnamed"}
              </Text>

              <Text style={[styles.cell, { flex: 2.1 }]} numberOfLines={1}>
                {roleDisplay(r) || "—"}
              </Text>

              <View style={[styles.statusCell, { width: STATUS_W }]}>
                <View style={[styles.statusPill, { backgroundColor: statusBg(r.availability_label) }]}>
                  <Text
                    style={[styles.statusText, { color: statusText(r.availability_label) }]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {labelText(r.availability_label)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {crew.length === 0 ? <Text style={styles.empty}>No crew found.</Text> : null}
        </View>
      </InfoCard>
    </ScrollView>
  );
}

function labelText(v: AvailabilityLabel) {
  if (v === "awaiting") return "Awaiting";
  if (v === "available") return "Available";
  if (v === "provisional") return "Provisional";
  if (v === "unavailable") return "Unavailable";
  return "Dep";
}

function statusBg(v: AvailabilityLabel) {
  if (v === "available") return "#E8F7EE";
  if (v === "provisional") return "#FFF6DF";
  if (v === "unavailable") return "#FDEAEA";
  if (v === "dep") return "#EEF0FF";
  return "#F3F3F3";
}

function statusText(v: AvailabilityLabel) {
  if (v === "available") return "#1E8E3E";
  if (v === "provisional") return "#B26A00";
  if (v === "unavailable") return "#C62828";
  if (v === "dep") return "#2C3BE5";
  return "#666";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  loading: { paddingVertical: 16, alignItems: "center" },

  smallNote: { fontSize: 12, color: "#666", marginBottom: 10 },

confirmPrompt: {
  borderWidth: 1,
  borderColor: "rgba(13,148,136,0.35)",
  backgroundColor: "rgba(13,148,136,0.08)",
  borderRadius: 12,
  padding: 10,
  marginBottom: 12,
},

confirmPromptTitle: {
  fontSize: 14,
  fontWeight: "900",
  color: colors.primary,
  marginBottom: 3,
},

confirmPromptText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#555",
},

  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  lineupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(13,148,136,0.10)",
  },
  lineupBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },

adminActions: {
  flexDirection: "row",
  gap: 8,
  alignItems: "center",
},

  editLineupPill: {
  height: 34,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(13,148,136,0.35)",
  backgroundColor: "rgba(13,148,136,0.08)",
  justifyContent: "center",
  alignItems: "center",
},

editLineupPillText: {
  fontSize: 11,
  fontWeight: "900",
  color: colors.primary,
  lineHeight: 14,
},

reminderPill: {
  height: 34,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(239, 68, 68, 0.55)",
  backgroundColor: "rgba(239, 68, 68, 0.08)",
  justifyContent: "center",
  alignItems: "center",
},

reminderPillText: {
  fontSize: 11,
  fontWeight: "900",
  color: "#DC2626",
  lineHeight: 14,
},

  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#009999",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  chipText: { fontSize: 12, fontWeight: "800", color: "#009999" },

  saving: { marginTop: 6, fontSize: 12, color: "#666", fontStyle: "italic" },

  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { fontSize: 13, fontWeight: "800", color: "#333" },

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },

  currentUserRow: {
    backgroundColor: "#F0FAFA",
  },

  cell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: 13, color: "#333" },
  cellHeader: { fontWeight: "800", color: "#666" },

  statusHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
  },

  statusCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
  },

  statusPill: {
    width: STATUS_W,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 12, fontWeight: "900" },

  empty: { padding: 12, color: "#666" },
});