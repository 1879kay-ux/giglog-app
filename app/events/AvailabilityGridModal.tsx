import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY_TEAL = "#0D9488";

type VenueRow = {
  event_venue_name: string;
  city: string;
};

type EventRow = {
  event_id: string;
  event_date: string;
  event_status: string | null;
  event_type: string | null;
  venues: VenueRow | null;
};

type GridAvailabilityRow = {
  event_id: string;
  member_id: string;
  display_name: string | null;
  effective_status: string | null;
};

function normStatus(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function Dot({ kind }: { kind: "green" | "amber" | "red" | "awaiting" }) {
  const base = { width: 12, height: 12, borderRadius: 6 };

  if (kind === "awaiting") {
    return <View style={[base, { backgroundColor: "transparent", borderWidth: 2, borderColor: "#B6B6B6" }]} />;
  }

  const bg = kind === "green" ? "#16A34A" : kind === "amber" ? "#F59E0B" : "#EF4444";
  return <View style={[base, { backgroundColor: bg }]} />;
}

const LEFT_W = 210;
const COL_W = 44;
const HEADER_H = 100;
const ROW_H = 52;

export default function AvailabilityGridModal({
  visible,
  onClose,
  events,
}: {
  visible: boolean;
  onClose: () => void;
  events: EventRow[];
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GridAvailabilityRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const eventIds = useMemo(() => (events || []).map((e) => e.event_id).filter(Boolean), [events]);

  const load = useCallback(async () => {
    if (!visible) return;
    if (!eventIds.length) {
      setRows([]);
      setErr(null);
      return;
    }

    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("v_event_availability")
      .select("event_id, member_id, display_name, effective_status")
      .in("event_id", eventIds);

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data as any) || []);
    }

    setLoading(false);
  }, [visible, eventIds]);

  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => {
    const seen = new Map<string, { member_id: string; display_name: string | null }>();
    for (const r of rows) {
      if (!r.member_id) continue;
      if (!seen.has(r.member_id)) {
        seen.set(r.member_id, { member_id: r.member_id, display_name: r.display_name ?? null });
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      String(a.display_name ?? "").localeCompare(String(b.display_name ?? ""), "en", { sensitivity: "base" })
    );
  }, [rows]);

  const cellByEventMember = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      if (!r.event_id || !r.member_id) continue;
      if (!map[r.event_id]) map[r.event_id] = {};
      map[r.event_id][r.member_id] = normStatus(r.effective_status);
    }
    return map;
  }, [rows]);

  function kindFor(status: string | null | undefined): "green" | "amber" | "red" | "awaiting" {
    const s = normStatus(status);

    if (!s || s === "awaiting") return "awaiting";
    if (s === "available") return "green";
    if (s === "provisional") return "amber";
    if (s === "unavailable" || s === "dep") return "red";
    return "awaiting";
  }

  function formatShort(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);
    const formatted = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(
      date
    );
    return formatted.replace(",", "");
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.pageBg }}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === "ios" ? 54 : 14 }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
            style={styles.topBarBtn}
          >
            <Ionicons name="arrow-back-outline" size={26} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Availability Grid</Text>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.replace("/");
              }}
              hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
              style={styles.topBarBtn}
            >
              <Ionicons name="home-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendBar}>
          <View style={styles.legendPill}>
            <View style={styles.legendItem}>
              <Dot kind="awaiting" />
              <Text style={styles.legendText}>Await</Text>
            </View>
            <View style={styles.legendItem}>
              <Dot kind="green" />
              <Text style={styles.legendText}>Avail</Text>
            </View>
            <View style={styles.legendItem}>
              <Dot kind="amber" />
              <Text style={styles.legendText}>Prov</Text>
            </View>
            <View style={styles.legendItem}>
              <Dot kind="red" />
              <Text style={styles.legendText}>No</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#333" />
          </View>
        ) : err ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>Grid load failed</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>{err}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.gridWrap}>
              {/* Left column */}
              <View style={[styles.leftCol, { width: LEFT_W }]}>
                <View style={[styles.corner, { height: HEADER_H }]}>
                  <Text style={styles.cornerText}>Event</Text>
                </View>

                {events.map((e) => {
                  const venue = e.venues?.event_venue_name ?? "Event";
                  const city = e.venues?.city ?? "";
                  return (
                    <View key={e.event_id} style={[styles.leftRow, { height: ROW_H }]}>
                      <Text numberOfLines={1} style={styles.venue}>
                        {venue}
                      </Text>
                      <Text numberOfLines={1} style={styles.meta}>
                        {formatShort(e.event_date)}
                        {city ? ` · ${city}` : ""}
                        {e.event_type ? ` · ${String(e.event_type)}` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Right side: single scroll container for header + rows */}
              <View style={{ flex: 1 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    {/* Header row */}
                    <View style={[styles.headerRow, { height: HEADER_H }]}>
                      {members.map((m) => (
                        <View key={m.member_id} style={[styles.headerCell, { width: COL_W, height: HEADER_H }]}>
                          <View style={styles.rotWrapOnly}>
                            <Text style={styles.rotNameOnly} numberOfLines={1}>
                              {String(m.display_name ?? "").trim() || "?"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Matrix rows */}
                    {events.map((e) => {
                      const row = cellByEventMember[e.event_id] || {};
                      return (
                        <View key={e.event_id} style={[styles.dotRow, { height: ROW_H }]}>
                          {members.map((m) => (
                            <View key={m.member_id} style={[styles.dotCell, { width: COL_W, height: ROW_H }]}>
                              <Dot kind={kindFor(row[m.member_id])} />
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  gridWrap: { flex: 1, flexDirection: "row" },

  leftCol: { backgroundColor: colors.cardBg, borderRightWidth: 1, borderRightColor: colors.border },
  corner: { justifyContent: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  cornerText: { fontSize: 12, fontWeight: "900", color: colors.textMuted, textTransform: "uppercase" },

  leftRow: { justifyContent: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  venue: { fontSize: 13, fontWeight: "900", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  headerRow: { flexDirection: "row", backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCell: { justifyContent: "center", alignItems: "center" },

  dotRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.pageBg },
  dotCell: { justifyContent: "center", alignItems: "center" },

  topBar: {
    backgroundColor: PRIMARY_TEAL,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  topBarRight: { flexDirection: "row", alignItems: "center" },

  legendBar: {
    backgroundColor: colors.pageBg,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 12, fontWeight: "800", color: colors.textMuted },

  rotWrapOnly: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  rotNameOnly: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    transform: [{ rotate: "-90deg" }],
    width: HEADER_H - 10,
    textAlign: "center",
  },
});