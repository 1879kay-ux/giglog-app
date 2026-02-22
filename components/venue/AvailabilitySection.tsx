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
  View
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

type Props = {
  eventId: string;
};

export default function AvailabilitySection({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Temporary test harness until auth is wired
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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
      setLoading(false);
      return;
    }

    const list = (data as AvailabilityRow[]) ?? [];
    setRows(list);

    if (!selectedMemberId) {
      const firstMusician = list.find((r) => r.member_type === "musician");
      setSelectedMemberId(firstMusician?.member_id ?? list[0]?.member_id ?? null);
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

  const selectedRow = useMemo(
    () => rows.find((r) => r.member_id === selectedMemberId) ?? null,
    [rows, selectedMemberId]
  );

  const selectedLabel: AvailabilityLabel = selectedRow?.availability_label ?? "awaiting";

  const counts = useMemo(() => {
    const base = { awaiting: 0, available: 0, provisional: 0, unavailable: 0 };
    for (const r of musicians) base[r.availability_label] += 1;
    return base;
  }, [musicians]);

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
    if (!selectedMemberId) return;

    setSaving(true);
    try {
      if (label === "awaiting") {
        const { error } = await supabase
          .from("event_availability")
          .delete()
          .eq("event_id", eventId)
          .eq("member_id", selectedMemberId);

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
          .upsert({ event_id: eventId, member_id: selectedMemberId, status }, { onConflict: "event_id,member_id" });

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
    const selected = selectedLabel === label;

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
        disabled={saving || !selectedMemberId}
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
        <Text style={styles.smallNote}>
          Temporary test mode: choose a person below to set their status. Auth will replace this.
        </Text>

        <Pressable
          style={styles.selector}
          onPress={() => {
            if (rows.length === 0) return;
            const idx = rows.findIndex((r) => r.member_id === selectedMemberId);
            const next = rows[(idx + 1) % rows.length];
            setSelectedMemberId(next.member_id);
          }}
        >
          <Text style={styles.selectorLabel}>Acting as:</Text>
          <Text style={styles.selectorValue}>
            {selectedRow?.display_name ?? "Select member"}{" "}
            {selectedRow?.member_type ? `(${selectedRow.member_type})` : ""}
          </Text>
          <Text style={styles.selectorHint}>Tap to change</Text>
        </Pressable>

        <View style={styles.chipRow}>
          {chip("available", "Available")}
          {chip("provisional", "Provisional")}
          {chip("unavailable", "Unavailable")}
        </View>

        <View style={styles.chipRow}>{chip("awaiting", "Clear to Awaiting")}</View>

        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
      </InfoCard>

      <InfoCard title="Event Summary">
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>Awaiting: {counts.awaiting}</Text>
          <Text style={styles.summaryItem}>Available: {counts.available}</Text>
          <Text style={styles.summaryItem}>Provisional: {counts.provisional}</Text>
          <Text style={styles.summaryItem}>Unavailable: {counts.unavailable}</Text>
        </View>
        <Text style={styles.smallNote}>Summary currently counts musicians only.</Text>
      </InfoCard>

      <InfoCard title="Musicians">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.2 }]}>Member</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.6 }]}>Instruments</Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1 }]}>Status</Text>
          </View>

          {musicians.map((r) => (
            <View key={r.member_id} style={styles.tableRow}>
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
            <View key={r.member_id} style={styles.tableRow}>
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
  if (v === "available") return "#E8F7EE"; // light green
  if (v === "provisional") return "#FFF6DF"; // light amber
  if (v === "unavailable") return "#FDEAEA"; // light red
  return "#F3F3F3"; // light grey
}

function statusText(v: AvailabilityLabel) {
  if (v === "available") return "#1E8E3E"; // green
  if (v === "provisional") return "#B26A00"; // amber
  if (v === "unavailable") return "#C62828"; // red
  return "#666"; // grey
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  loading: { paddingVertical: 16, alignItems: "center" },

  smallNote: { fontSize: 12, color: "#666", marginBottom: 10 },

  selector: {
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 12,
  },
  selectorLabel: { fontSize: 12, color: "#666", fontWeight: "700" },
  selectorValue: { fontSize: 15, color: "#111", fontWeight: "800", marginTop: 2 },
  selectorHint: { fontSize: 12, color: "#009999", marginTop: 6, fontWeight: "700" },

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
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },

  empty: { padding: 12, color: "#666" },
});