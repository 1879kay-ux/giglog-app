import InfoCard from "@/components/InfoCard";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AvailabilityLabel = "awaiting" | "available" | "provisional" | "unavailable";
type MemberType = "musician" | "crew";

type AvailabilityRow = {
  event_id: string;
  event_date: string;

  member_id: string;
  display_name: string | null;
  email: string | null;

  member_type: MemberType | null;
  band_role: string | null;
  band_role_other: string | null;
  band_positions: string[] | null;
  band_positions_other: string[] | null;

  availability_status: "available" | "provisional" | "unavailable" | null;
  availability_label: AvailabilityLabel;
};

type AvailabilitySummaryRow = {
  event_id: string;
  available_count: number;
  provisional_count: number;
  unavailable_count: number;
  awaiting_count: number;
  total_invited: number;
};

type Props = {
  eventId: string;
  memberId: string; // current user (from auth later)
};

export default function AvailabilitySection({ eventId, memberId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<AvailabilitySummaryRow | null>(null);

  // Guard: makes failures obvious (and avoids "nothing happens" bugs later)
  if (!memberId) {
    return (
      <InfoCard title="Your Availability">
        <Text style={{ fontSize: 13, color: "#C62828", fontWeight: "700" }}>
          No memberId supplied. Availability cannot be set.
        </Text>
      </InfoCard>
    );
  }

  async function load() {
    if (!eventId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("v_event_availability")
      .select("*")
      .eq("event_id", eventId)
      .order("display_name", { ascending: true });

    if (error) {
      console.log("availability view error", error);
      Alert.alert("Error", error.message);
      setRows([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    const list = (data as AvailabilityRow[]) ?? [];
    setRows(list);

    const { data: sumData, error: sumError } = await supabase
      .from("v_event_availability_summary")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (sumError) {
      console.log("availability summary error", sumError);
      setSummary(null);
    } else {
      setSummary((sumData as AvailabilitySummaryRow) ?? null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const musicians = useMemo(
    () => rows.filter((r) => (r.member_type ?? "musician") === "musician"),
    [rows]
  );

  const crew = useMemo(() => rows.filter((r) => (r.member_type ?? "crew") === "crew"), [rows]);

  const currentRow = useMemo(
    () => rows.find((r) => r.member_id === memberId) ?? null,
    [rows, memberId]
  );

  const currentLabel: AvailabilityLabel = currentRow?.availability_label ?? "awaiting";

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
          .delete()
          .eq("event_id", eventId)
          .eq("member_id", memberId);

        if (error) throw error;
      } else {
        const status =
          label === "available"
            ? "available"
            : label === "provisional"
              ? "provisional"
              : "unavailable";

        const { error } = await supabase
          .from("event_availability")
          .upsert(
            { event_id: eventId, member_id: memberId, status },
            { onConflict: "event_id,member_id" }
          );

        if (error) throw error;
      }

      await load();
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
        <View style={styles.chipRow}>
          {chip("available", "Available")}
          {chip("provisional", "Provisional")}
          {chip("unavailable", "Unavailable")}
        </View>

        

        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
      </InfoCard>

      <InfoCard title="Event Summary">
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>Awaiting: {summary?.awaiting_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Available: {summary?.available_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Provisional: {summary?.provisional_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Unavailable: {summary?.unavailable_count ?? 0}</Text>
          <Text style={styles.summaryItem}>Response required: {summary?.total_invited ?? 0}</Text>
        </View>
        <Text style={styles.smallNote}>Counts are for active members expected to respond.</Text>
      </InfoCard>

      <InfoCard title="Musicians">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.2 }]}>Member</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.6 }]}>Instruments</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1 }]}>Status</Text>
          </View>

          {musicians.map((r) => (
            <View
              key={r.member_id}
              style={[styles.tableRow, r.member_id === memberId ? styles.currentUserRow : null]}
            >
              <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>
                {r.display_name ?? "Unnamed"}
              </Text>
              <Text style={[styles.cell, { flex: 1.6 }]} numberOfLines={1}>
                {instrumentsDisplay(r) || "—"}
              </Text>

              <View style={[styles.statusPill, { backgroundColor: statusBg(r.availability_label) }]}>
                <Text style={[styles.statusText, { color: statusText(r.availability_label) }]}>
                  {labelText(r.availability_label)}
                </Text>
              </View>
            </View>
          ))}

          {musicians.length === 0 ? <Text style={styles.empty}>No musicians found.</Text> : null}
        </View>
      </InfoCard>

      <InfoCard title="Crew">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.4 }]}>Member</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.6 }]}>Role</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1 }]}>Status</Text>
          </View>

          {crew.map((r) => (
            <View
              key={r.member_id}
              style={[styles.tableRow, r.member_id === memberId ? styles.currentUserRow : null]}
            >
              <Text style={[styles.cell, { flex: 1.4 }]} numberOfLines={1}>
                {r.display_name ?? "Unnamed"}
              </Text>
              <Text style={[styles.cell, { flex: 1.6 }]} numberOfLines={1}>
                {roleDisplay(r) || "—"}
              </Text>

              <View style={[styles.statusPill, { backgroundColor: statusBg(r.availability_label) }]}>
                <Text style={[styles.statusText, { color: statusText(r.availability_label) }]}>
                  {labelText(r.availability_label)}
                </Text>
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
  return "Unavailable";
}

function statusBg(v: AvailabilityLabel) {
  if (v === "available") return "#E8F7EE";
  if (v === "provisional") return "#FFF6DF";
  if (v === "unavailable") return "#FDEAEA";
  return "#F3F3F3";
}

function statusText(v: AvailabilityLabel) {
  if (v === "available") return "#1E8E3E";
  if (v === "provisional") return "#B26A00";
  if (v === "unavailable") return "#C62828";
  return "#666";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  loading: { paddingVertical: 16, alignItems: "center" },

  smallNote: { fontSize: 12, color: "#666", marginBottom: 10 },

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
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },

  // highlight current user row
  currentUserRow: {
    backgroundColor: "#F0FAFA",
  },

  cell: { padding: 12, fontSize: 13, color: "#333" },
  cellHeader: { fontWeight: "800", color: "#666" },

  statusPill: {
    flex: 1,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginVertical: 6,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 12, fontWeight: "900" },

  empty: { padding: 12, color: "#666" },
});