// app/events/calendar.tsx

import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type EventLite = {
  event_id: string;
  event_date: string; // YYYY-MM-DD
  event_status: string | null;
  event_type: string | null;
  venues: { event_venue_name: string; city: string } | null;
};

type UnavailabilityLite = {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  band_members?: { display_name: string | null } | null;
};

type ViewMode = "year" | "month";

function ymd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addYears(d: Date, years: number) {
  return new Date(d.getFullYear() + years, d.getMonth(), 1);
}

function monthTitle(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long" }).format(d);
}

function weekdayHeaders() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function mondayFirstIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function isWeekendFromYmd(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function colorForEvent(e: EventLite) {
  const type = (e.event_type ?? "").toLowerCase();
  const status = (e.event_status ?? "").toLowerCase();

  if (type.includes("rehears")) return "#2563eb";
  if (type.includes("record")) return "#7c3aed";
  if (type.includes("promo")) return "#db2777";
  if (type.includes("meet")) return "#0f766e";
  if (type.includes("other")) return "#64748b";

  if (status.includes("confirm")) return "#16a34a";
  if (status.includes("cancel")) return "#dc2626";
  if (
    status.includes("tbc") ||
    status.includes("tent") ||
    status.includes("offer")
  )
    return "#f59e0b";

  return "#16a34a";
}

function pillLabel(e: EventLite) {
  const city = (e.venues?.city ?? "").trim();
  const venue = (e.venues?.event_venue_name ?? "").trim();
  const type = (e.event_type ?? "").trim();

  const base = city || venue || type || "Event";
  return base.length > 10 ? `${base.slice(0, 10)}…` : base;
}

export default function EventsCalendarScreen() {
  const router = useRouter();

  const todayKey = useMemo(() => ymd(new Date()), []);
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [anchorYear, setAnchorYear] = useState<Date>(
    () => new Date(new Date().getFullYear(), 0, 1),
  );

  const year = useMemo(() => anchorYear.getFullYear(), [anchorYear]);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityLite[]>(
    [],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  const calendarScrollRef = useRef<ScrollView | null>(null);
  const currentMonthIndex = new Date().getMonth();

  const monthsInYear = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  useEffect(() => {
    loadYearEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
      useEffect(() => {
    if (viewMode !== "month") return;
    if (year !== new Date().getFullYear()) return;

    setTimeout(() => {
      calendarScrollRef.current?.scrollTo({
        y: currentMonthIndex * 500,
        animated: false,
      });
    }, 100);
  }, [viewMode, year, currentMonthIndex]);

  async function loadYearEvents() {
    setLoading(true);

    const start = ymd(new Date(year, 0, 1));
    const end = ymd(new Date(year, 11, 31));

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        event_id,
        event_date,
        event_status,
        event_type,
        venues:venue_id (
          event_venue_name,
          city
        )
      `,
      )
      .gte("event_date", start)
      .lte("event_date", end)
      .neq("event_status", "Deleted")
      .order("event_date", { ascending: true });

    if (!error && data) setEvents(data as unknown as EventLite[]);
    else setEvents([]);
    const { data: userData } = await supabase.auth.getUser();
    const authUserId = userData?.user?.id ?? null;

    if (authUserId) {
      if (authUserId) {
        const { data: unavailableData } = await supabase
          .from("member_unavailability")
          .select(
            `
  id,
  member_id,
  start_date,
  end_date,
  band_members:member_id (
    display_name
  )
`,
          )

          .lte("start_date", end)
          .gte("end_date", start);

        setUnavailability((unavailableData ?? []) as UnavailabilityLite[]);
      } else {
        setUnavailability([]);
      }
    } else {
      setUnavailability([]);
    }
    setLoading(false);
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventLite[]> = {};
    for (const e of events) {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    }
    return map;
  }, [events]);

  const unavailableDates = useMemo(() => {
    const set = new Set<string>();

    for (const row of unavailability) {
      const d = new Date(`${row.start_date}T12:00:00`);
      const endDate = new Date(`${row.end_date}T12:00:00`);

      while (d <= endDate) {
        set.add(ymd(d));
        d.setDate(d.getDate() + 1);
      }
    }

    return set;
  }, [unavailability]);

  const unavailableByDate = useMemo(() => {
    const map: Record<string, string[]> = {};

    for (const row of unavailability) {
      const d = new Date(`${row.start_date}T12:00:00`);
      const endDate = new Date(`${row.end_date}T12:00:00`);
      const name = row.band_members?.display_name ?? "Unknown member";

      while (d <= endDate) {
        const key = ymd(d);
        if (!map[key]) map[key] = [];
        if (!map[key].includes(name)) map[key].push(name);
        d.setDate(d.getDate() + 1);
      }
    }

    return map;
  }, [unavailability]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] ?? [];
  }, [selectedDate, eventsByDate]);

  const selectedUnavailableMembers = useMemo(() => {
    if (!selectedDate) return [];
    return unavailableByDate[selectedDate] ?? [];
  }, [selectedDate, unavailableByDate]);

  function onDayPress(dateKey: string) {
    const dayEvents = eventsByDate[dateKey] ?? [];
    const dayUnavailable = unavailableByDate[dateKey] ?? [];

    if (dayEvents.length === 0 && dayUnavailable.length === 0) return;

    if (dayEvents.length === 1 && dayUnavailable.length === 0) {
      router.push(`/events/${dayEvents[0].event_id}`);
      return;
    }

    setSelectedDate(dateKey);
    setDayModalOpen(true);
  }
  async function shareUnavailabilitySummary() {
    const grouped: Record<string, string[]> = {};

    for (const row of unavailability) {
      const name = row.band_members?.display_name ?? "Unknown member";

      if (!grouped[name]) grouped[name] = [];

      const start = new Intl.DateTimeFormat("en-GB").format(
        new Date(`${row.start_date}T12:00:00`),
      );

      const end = new Intl.DateTimeFormat("en-GB").format(
        new Date(`${row.end_date}T12:00:00`),
      );

      grouped[name].push(`${start} → ${end}`);
    }

    let message = `GigSynq Unavailability Summary – ${year}\n\n`;

    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([name, periods]) => {
        message += `${name}\n`;

        periods.forEach((p) => {
          message += `${p}\n`;
        });

        message += `\n`;
      });

    await Share.share({
      message,
    });
  }
  function renderMonthGrid(monthStart: Date, compact: boolean) {
    const first = startOfMonth(monthStart);
    const last = endOfMonth(monthStart);

    const firstIndex = mondayFirstIndex(first.getDay());
    const daysInMonth = last.getDate();

    const cells: Array<{ label: string; dateKey: string | null }> = [];

    for (let i = 0; i < firstIndex; i++)
      cells.push({ label: "", dateKey: null });

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day);
      cells.push({ label: String(day), dateKey: ymd(d) });
    }

    while (cells.length % 7 !== 0) cells.push({ label: "", dateKey: null });

    return (
      <View style={compact ? styles.monthCardCompact : styles.monthCard}>
        <View style={styles.monthHeaderRow}>
          <Text style={compact ? styles.monthTitleCompact : styles.monthTitle}>
            {monthTitle(monthStart).toUpperCase()}
          </Text>

          {compact ? null : (
            <Pressable
              onPress={() => {
                setViewMode("month");
              }}
              hitSlop={10}
              style={styles.smallLinkPill}
            >
              <Text style={styles.smallLinkText}>Year scroll</Text>
            </Pressable>
          )}
        </View>

        {compact ? null : (
          <View style={styles.weekHeaderRow}>
            {weekdayHeaders().map((w) => (
              <Text key={w} style={styles.weekHeaderText}>
                {w}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.grid}>
          {cells.map((c, idx) => {
            const dayEvents = c.dateKey ? eventsByDate[c.dateKey] : undefined;
            const hasEvents = !!dayEvents && dayEvents.length > 0;
            const isToday = c.dateKey && c.dateKey === todayKey;
            const isWeekend = c.dateKey ? isWeekendFromYmd(c.dateKey) : false;
            const isUnavailable = c.dateKey
              ? unavailableDates.has(c.dateKey)
              : false;

            return (
              <Pressable
                key={`${c.dateKey ?? "blank"}-${idx}`}
                disabled={!c.dateKey}
                onPress={() => {
                  if (!c.dateKey) return;
                  onDayPress(c.dateKey);
                }}
                style={[
                  compact ? styles.cellCompact : styles.cell,
                  isWeekend ? styles.cellWeekend : null,
                  isUnavailable ? styles.cellUnavailable : null,
                  isToday ? styles.cellToday : null,
                ]}
              >
                <Text
                  style={compact ? styles.dayNumberCompact : styles.dayNumber}
                >
                  {c.label}
                </Text>

                {/* YEAR: mini pill. MONTH: colored pills. */}
                {compact ? (
                  hasEvents ? (
                    <View style={styles.miniPillRow}>
                      <View
                        style={[
                          styles.miniPill,
                          { backgroundColor: colorForEvent(dayEvents![0]) },
                        ]}
                      >
                        <Text style={styles.miniPillText} numberOfLines={1}>
                          {pillLabel(dayEvents![0])}
                        </Text>
                      </View>

                      {dayEvents!.length > 1 ? (
                        <Text style={styles.moreTextCompact}>
                          +{dayEvents!.length - 1}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.miniPillRow} />
                  )
                ) : hasEvents ? (
                  <View style={styles.pillsWrap}>
                    {dayEvents!.slice(0, 2).map((e) => (
                      <View
                        key={e.event_id}
                        style={[
                          styles.pill,
                          { backgroundColor: colorForEvent(e) },
                        ]}
                      >
                        <Text style={styles.pillText} numberOfLines={1}>
                          {pillLabel(e)}
                        </Text>
                      </View>
                    ))}

                    {dayEvents!.length > 2 ? (
                      <Text style={styles.morePillsText}>
                        +{dayEvents!.length - 2}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.pillsWrap} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const columnsForYearGrid = useMemo(() => {
    const w = Dimensions.get("window").width;
    return w >= 900 ? 3 : 2;
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Calendar",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTitleStyle: { color: "#fff", fontWeight: "700", fontSize: 18 },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back-outline" size={26} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      ) : (
        <ScrollView
         ref={calendarScrollRef}
         style={styles.page}
         contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* MODE + YEAR NAV */}
          <View style={styles.topRow}>
            <View style={styles.viewModePill}>
              <Pressable
                onPress={() => setViewMode("year")}
                style={[
                  styles.viewModeBtn,
                  viewMode === "year" ? styles.viewModeBtnActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "year" ? styles.viewModeTextActive : null,
                  ]}
                >
                  Year
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setViewMode("month")}
                style={[
                  styles.viewModeBtn,
                  viewMode === "month" ? styles.viewModeBtnActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "month" ? styles.viewModeTextActive : null,
                  ]}
                >
                  Months
                </Text>
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />
            <Pressable
              onPress={shareUnavailabilitySummary}
              style={styles.navBtn}
              hitSlop={10}
            >
              <Ionicons name="share-outline" size={20} color="#111" />
            </Pressable>
            <View style={styles.yearNav}>
              <Pressable
                onPress={() => setAnchorYear((d) => addYears(d, -1))}
                style={styles.navBtn}
                hitSlop={10}
              >
                <Ionicons name="chevron-back-outline" size={20} color="#111" />
              </Pressable>

              <Text style={styles.yearText}>{String(year)}</Text>

              <Pressable
                onPress={() => setAnchorYear((d) => addYears(d, 1))}
                style={styles.navBtn}
                hitSlop={10}
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#111"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.legendRow}>
            <Text style={styles.legendText}>
              <Text style={{ color: "rgba(220, 38, 38, 0.55)" }}>■</Text>{" "}
              Band/Crew Unavailable ·{" "}
              <Text style={{ color: "#16a34a" }}>■</Text> Event ·{" "}
              <Text style={{ color: "#dc2626" }}>■</Text> Cancelled
            </Text>
          </View>

          {/* YEAR VIEW: 12 months, one screen */}
          {viewMode === "year" ? (
            <View style={styles.yearGrid}>
              {monthsInYear.map((m) => (
                <View
                  key={m.toISOString()}
                  style={[
                    styles.yearCell,
                    { width: `${100 / columnsForYearGrid}%` as any },
                  ]}
                >
                  {renderMonthGrid(m, true)}
                </View>
              ))}
            </View>
          ) : (
            /* MONTH VIEW: scroll through the year */
            <View style={{ paddingTop: 4 }}>
              {monthsInYear.map((m) => (
                <View key={m.toISOString()}>{renderMonthGrid(m, false)}</View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* MULTI-EVENT DAY MODAL */}
      <Modal
        visible={dayModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDayModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDayModalOpen(false)}
          />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedDate ? `Events: ${selectedDate}` : "Events"}
            </Text>
            {selectedUnavailableMembers.length > 0 ? (
              <View style={styles.unavailableMembersBox}>
                <Text style={styles.unavailableMembersTitle}>Unavailable</Text>

                <Text style={styles.unavailableMembersText}>
                  {selectedUnavailableMembers.join(", ")}
                </Text>
              </View>
            ) : null}
            {selectedEvents.map((e) => {
              const venueName = e.venues?.event_venue_name ?? "Unknown venue";
              const city = e.venues?.city ?? "";
              const meta = `${e.event_type ?? "Event"}${e.event_status ? `, ${e.event_status}` : ""}`;

              return (
                <Pressable
                  key={e.event_id}
                  onPress={() => {
                    setDayModalOpen(false);
                    router.push(`/events/${e.event_id}`);
                  }}
                  style={styles.modalRow}
                >
                  <View
                    style={[
                      styles.modalStripe,
                      { backgroundColor: colorForEvent(e) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalVenue} numberOfLines={1}>
                      {venueName}
                      {city ? `, ${city}` : ""}
                    </Text>
                    <Text style={styles.modalMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#333"
                  />
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setDayModalOpen(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  legendUnavailable: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  legendEvent: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  legendCancelled: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#dc2626",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },

  viewModePill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  viewModeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  viewModeBtnActive: { backgroundColor: "#e5e7eb" },
  viewModeText: { fontWeight: "600", color: "#222" },
  viewModeTextActive: { fontWeight: "900" },

  yearNav: { flexDirection: "row", alignItems: "center", gap: 10 },
  yearText: { color: "#111", fontWeight: "900", fontSize: 14 },

  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 6,
  },
  yearCell: { padding: 6 },

  monthCardCompact: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  monthTitleCompact: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
    marginBottom: 6,
  },

  monthCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthTitle: { fontSize: 14, fontWeight: "900", color: "#111" },

  smallLinkPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E9F6F6",
  },
  smallLinkText: { color: colors.primary, fontWeight: "900", fontSize: 12 },

  weekHeaderRow: { flexDirection: "row", marginTop: 6 },
  weekHeaderText: {
    width: `${100 / 7}%` as any,
    textAlign: "center",
    color: "#666",
    fontSize: 12,
    fontWeight: "700",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },

  cell: {
    width: `${100 / 7}%` as any,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 10,
    alignItems: "center",
  },
  cellCompact: {
    width: `${100 / 7}%` as any,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },

  cellWeekend: { backgroundColor: "#f8fafc" },
  cellToday: { borderWidth: 2, borderColor: colors.primary },

  cellUnavailable: {
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },

  dayNumber: { fontSize: 13, fontWeight: "900", color: "#111" },
  dayNumberCompact: { fontSize: 11, fontWeight: "900", color: "#111" },

  // YEAR mini pill
  miniPillRow: {
    marginTop: 4,
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  miniPill: {
    maxWidth: "80%",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },
  moreTextCompact: {
    fontSize: 10,
    color: "#666",
    marginLeft: 1,
    fontWeight: "900",
  },

  // MONTH pills
  pillsWrap: {
    marginTop: 6,
    width: "100%",
    gap: 4,
    alignItems: "center",
    minHeight: 30,
  },
  pill: {
    width: "94%",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  morePillsText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#666",
  },

  unavailableMembersBox: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  unavailableMembersTitle: {
    color: "#DC2626",
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 4,
  },

  unavailableMembersText: {
    color: "#7F1D1D",
    fontWeight: "700",
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
    marginBottom: 10,
  },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalStripe: { width: 6, height: 28, borderRadius: 4 },
  modalVenue: { fontSize: 14, fontWeight: "900", color: "#111" },
  modalMeta: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 2 },

  modalCloseBtn: {
    marginTop: 12,
    backgroundColor: "#E9F6F6",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseText: { color: colors.primary, fontWeight: "900" },
});
