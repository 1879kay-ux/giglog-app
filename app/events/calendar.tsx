// app/events/calendar.tsx

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
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

type ViewMode = "two" | "year";

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

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function addMonthsToDate(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function monthTitle(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}

function monthShort(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d);
}

function weekdayHeaders() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function mondayFirstIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function isWeekendFromYmd(dateKey: string) {
  // date-only string; keep stable by anchoring midday local
  const d = new Date(`${dateKey}T12:00:00`);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
}

function colorForEvent(e: EventLite) {
  const type = (e.event_type ?? "").toLowerCase();
  const status = (e.event_status ?? "").toLowerCase();

  // event types: Gig, Rehearsal, Recording, Promo, Meeting, Other
  if (type.includes("rehears")) return "#2563eb"; // blue
  if (type.includes("record")) return "#7c3aed"; // purple
  if (type.includes("promo")) return "#db2777"; // pink
  if (type.includes("meet")) return "#0f766e"; // teal
  if (type.includes("other")) return "#64748b"; // slate

  // default: Gig (use status colours)
  if (status.includes("confirm")) return "#16a34a"; // green
  if (status.includes("cancel")) return "#dc2626"; // red
  if (status.includes("tbc") || status.includes("tent") || status.includes("offer"))
    return "#f59e0b"; // amber

  return "#16a34a";
}

export default function EventsCalendarScreen() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("two");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const todayKey = useMemo(() => ymd(new Date()), []);
  const [anchorMonth, setAnchorMonth] = useState<Date>(() => startOfMonth(new Date()));

  const monthA = useMemo(() => startOfMonth(anchorMonth), [anchorMonth]);
  const monthB = useMemo(() => addMonths(monthA, 1), [monthA]);
  const year = useMemo(() => anchorMonth.getFullYear(), [anchorMonth]);

  useEffect(() => {
    loadEventsForMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, anchorMonth]);

  async function loadEventsForMode() {
    setLoading(true);

    let start: string;
    let end: string;

    if (viewMode === "year") {
      start = ymd(new Date(year, 0, 1));
      end = ymd(new Date(year, 11, 31));
    } else {
      start = ymd(startOfMonth(monthA));
      end = ymd(endOfMonth(monthB));
    }

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
      `
      )
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date", { ascending: true });

    if (!error && data) setEvents(data as unknown as EventLite[]);
    else setEvents([]);

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

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] ?? [];
  }, [selectedDate, eventsByDate]);

  function renderMonth(
    monthStart: Date,
    compact?: boolean,
    onDayPress?: (dateKey: string) => void
  ) {
    const first = startOfMonth(monthStart);
    const last = endOfMonth(monthStart);

    const firstIndex = mondayFirstIndex(first.getDay());
    const daysInMonth = last.getDate();

    const cells: Array<{ label: string; dateKey: string | null }> = [];

    for (let i = 0; i < firstIndex; i++) cells.push({ label: "", dateKey: null });

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day);
      cells.push({ label: String(day), dateKey: ymd(d) });
    }

    while (cells.length % 7 !== 0) cells.push({ label: "", dateKey: null });

    return (
      <View style={compact ? styles.monthCardCompact : styles.monthCard}>
        <Text style={compact ? styles.monthTitleCompact : styles.monthTitle}>
          {(compact ? monthShort(monthStart) : monthTitle(monthStart)).toUpperCase()}
        </Text>

        {!compact ? (
          <View style={styles.weekHeaderRow}>
            {weekdayHeaders().map((w) => (
              <Text key={w} style={styles.weekHeaderText}>
                {w}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.grid}>
          {cells.map((c, idx) => {
            const dayEvents = c.dateKey ? eventsByDate[c.dateKey] : undefined;
            const hasEvents = !!dayEvents && dayEvents.length > 0;
            const isSelected = c.dateKey && selectedDate === c.dateKey;
            const isToday = c.dateKey && c.dateKey === todayKey;
            const isWeekend = c.dateKey ? isWeekendFromYmd(c.dateKey) : false;

            return (
              <Pressable
                key={`${c.dateKey ?? "blank"}-${idx}`}
                disabled={!c.dateKey}
                onPress={() => {
                  if (!c.dateKey) return;

                  if (onDayPress) {
                    onDayPress(c.dateKey);
                  } else {
                    setSelectedDate(c.dateKey);

                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }
                }}
                style={[
                  compact ? styles.cellCompact : styles.cell,
                  isWeekend ? styles.cellWeekend : null,
                  isSelected ? styles.cellSelected : null,
                  isToday ? styles.cellToday : null,
                ]}
              >
                <Text style={compact ? styles.dayNumberCompact : styles.dayNumber}>{c.label}</Text>

                {/* YEAR VIEW keeps compact dots-only. 2-MONTH view gets centered dot + label */}
                {compact ? (
                  hasEvents ? (
                    <View style={styles.dotsRowCompact}>
                      {dayEvents!.slice(0, 2).map((e) => (
                        <View
                          key={e.event_id}
                          style={[styles.dotCompact, { backgroundColor: colorForEvent(e) }]}
                        />
                      ))}
                      {dayEvents!.length > 2 ? (
                        <Text style={styles.moreText}>+{dayEvents!.length - 2}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.dotsRowCompact} />
                  )
                ) : hasEvents ? (
                  <View style={styles.dayEventBlock}>
                    <View style={styles.dayDotWrapper}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: colorForEvent(dayEvents![0]) },
                        ]}
                      />
                    </View>

                    {dayEvents!.length === 1 ? (
                      <Text style={styles.dayHintText} numberOfLines={1}>
                        {dayEvents![0].venues?.city ??
                          dayEvents![0].venues?.event_venue_name ??
                          ""}
                      </Text>
                    ) : (
                      <Text style={styles.dayHintText}>+{dayEvents!.length}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.dayEventBlock} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const monthsInYear = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Calendar",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#008080" },
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
          ref={scrollRef}
          style={styles.page}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* VIEW MODE TOGGLE + NAV */}
          <View style={styles.viewModeRow}>
            <View style={styles.viewModePill}>
              <Pressable
                onPress={() => setViewMode("two")}
                style={[styles.viewModeBtn, viewMode === "two" ? styles.viewModeBtnActive : null]}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "two" ? styles.viewModeTextActive : null,
                  ]}
                >
                  2-Month
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSelectedDate(null);
                  setViewMode("year");
                }}
                style={[styles.viewModeBtn, viewMode === "year" ? styles.viewModeBtnActive : null]}
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
            </View>

            <View style={{ flex: 1 }} />

            {viewMode === "two" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    setSelectedDate(null);
                    setAnchorMonth((d) => addMonthsToDate(d, -1));
                  }}
                  style={styles.navBtn}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back-outline" size={20} color="#111" />
                </Pressable>

                <Text style={styles.rangeHint}>{monthTitle(monthA).toUpperCase()}</Text>

                <Pressable
                  onPress={() => {
                    setSelectedDate(null);
                    setAnchorMonth((d) => addMonthsToDate(d, 1));
                  }}
                  style={styles.navBtn}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward-outline" size={20} color="#111" />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  onPress={() => setAnchorMonth((d) => addMonthsToDate(d, -12))}
                  style={styles.navBtn}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back-outline" size={20} color="#111" />
                </Pressable>

                <Text style={styles.rangeHint}>{String(year)}</Text>

                <Pressable
                  onPress={() => setAnchorMonth((d) => addMonthsToDate(d, 12))}
                  style={styles.navBtn}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward-outline" size={20} color="#111" />
                </Pressable>
              </View>
            )}
          </View>

          {/* LEGEND */}
          <View style={styles.legendCard}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
                <Text style={styles.legendText}>Gig Confirmed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
                <Text style={styles.legendText}>Gig TBC</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#dc2626" }]} />
                <Text style={styles.legendText}>Cancelled</Text>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#2563eb" }]} />
                <Text style={styles.legendText}>Rehearsal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#7c3aed" }]} />
                <Text style={styles.legendText}>Recording</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#db2777" }]} />
                <Text style={styles.legendText}>Promo</Text>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#0f766e" }]} />
                <Text style={styles.legendText}>Meeting</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#64748b" }]} />
                <Text style={styles.legendText}>Other</Text>
              </View>
            </View>
          </View>

          {viewMode === "two" ? (
            <>
              {renderMonth(monthA)}
              {renderMonth(monthB)}

              <View style={styles.agendaCard}>
                <View style={styles.agendaHeaderRow}>
                  <Text style={styles.agendaTitle}>
                    {selectedDate ? `DAY AGENDA: ${selectedDate}` : "TAP A DAY TO SEE EVENTS"}
                  </Text>

                  {selectedDate ? (
                    <Pressable
                      onPress={() => {
                        setSelectedDate(null);
                        scrollRef.current?.scrollTo({ y: 0, animated: true });
                      }}
                      hitSlop={10}
                    >
                      <Text style={styles.backToTopText}>Back to calendar</Text>
                    </Pressable>
                  ) : null}
                </View>

                {selectedDate && selectedEvents.length === 0 ? (
                  <Text style={styles.agendaEmpty}>No events on this date.</Text>
                ) : null}

                {selectedEvents.map((e) => {
                  const venueName = e.venues?.event_venue_name ?? "Unknown venue";
                  const city = e.venues?.city ?? "Unknown city";
                  const status = e.event_status ?? "Unknown";
                  const type = e.event_type ?? "Event";

                  return (
                    <Pressable
                      key={e.event_id}
                      onPress={() =>
                        router.push({ pathname: "/events/[id]", params: { id: e.event_id } })
                      }
                      style={styles.agendaRow}
                    >
                      <View style={[styles.agendaStripe, { backgroundColor: colorForEvent(e) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agendaVenue}>
                          {venueName}, {city}
                        </Text>
                        <Text style={styles.agendaMeta}>
                          {type}, {status}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={22} color="#333" />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.yearGrid}>
                {monthsInYear.map((m) => (
                  <View key={m.toISOString()} style={styles.yearCell}>
                    {renderMonth(m, true, (dateKey) => {
                      const dayEvents = eventsByDate[dateKey] ?? [];
                      if (dayEvents.length === 0) return;

                      const [yyyy, mm] = dateKey.split("-");
                      setAnchorMonth(new Date(Number(yyyy), Number(mm) - 1, 1));
                      setSelectedDate(dateKey);
                      setViewMode("two");
                    })}
                  </View>
                ))}
              </View>

              <Text style={styles.yearHint}>Tap a day with dots to jump to that date.</Text>
            </>
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  viewModeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  viewModePill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#008080",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  viewModeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  viewModeBtnActive: { backgroundColor: "#e5e7eb" },
  viewModeText: { fontWeight: "500", color: "#222" },
  viewModeTextActive: { fontWeight: "800" },
  rangeHint: { color: "#333", fontWeight: "800" },

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

  legendCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 6,
    padding: 12,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  monthCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
  },
  monthTitle: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 10 },

  weekHeaderRow: { flexDirection: "row" },
  weekHeaderText: { width: `${100 / 7}%` as any, textAlign: "center", color: "#666", fontSize: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },

  cell: {
    width: `${100 / 7}%` as any,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cellWeekend: {
    backgroundColor: "#f8fafc",
  },
  cellSelected: {
    backgroundColor: "#e5e7eb",
  },
  cellToday: {
    borderWidth: 2,
    borderColor: "#008080",
  },

  dayNumber: { fontSize: 14, fontWeight: "800", color: "#111" },

  // 2-month view: centered dot + label
  dayEventBlock: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  dayDotWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dayHintText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
    maxWidth: "90%",
  },

  // Year compact dots
  dotsRowCompact: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, height: 12 },
  dotCompact: { width: 9, height: 9, borderRadius: 5 },
  moreText: { fontSize: 10, color: "#666", marginLeft: 2, fontWeight: "900" },

  agendaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
  },
  agendaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  agendaTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  backToTopText: {
    color: "#008080",
    fontWeight: "900",
    fontSize: 12,
  },
  agendaEmpty: { color: "#666", fontWeight: "600" },

  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 10,
  },
  agendaStripe: { width: 6, height: 34, borderRadius: 4 },
  agendaVenue: { fontSize: 16, fontWeight: "900", color: "#111" },
  agendaMeta: { fontSize: 13, color: "#444", marginTop: 2, fontWeight: "600" },

  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 8,
    marginTop: 8,
  },
  yearCell: {
    width: "50%",
    padding: 6,
  },
  yearHint: {
    marginTop: 6,
    marginHorizontal: 12,
    color: "#555",
    fontWeight: "700",
  },

  monthCardCompact: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  monthTitleCompact: { fontSize: 12, fontWeight: "900", color: "#111", marginBottom: 6 },
  cellCompact: {
    width: `${100 / 7}%` as any,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  dayNumberCompact: { fontSize: 11, fontWeight: "800", color: "#111" },
});