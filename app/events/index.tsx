// app/events/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import ActionButton from "@/components/ui/ActionButton";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AvailabilityGridModal from "./AvailabilityGridModal";

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  venues: VenueRow | null; // single object
};

type AvailabilityStatus = string | null;

function getTodayLondonYYYYMMDD() {
  // en-CA returns YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function EventsListScreen() {
  const router = useRouter();

  const cm: any = useCurrentMember();
  const isAdmin = !!cm?.isAdmin;
  const adminModeEnabled = !!cm?.adminModeEnabled;

  const currentMemberId =
    cm?.currentMemberId ??
    cm?.memberId ??
    cm?.currentMember?.member_id ??
    cm?.member?.member_id ??
    cm?.member?.id ??
    null;

  const canEdit = isAdmin && adminModeEnabled;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventsMode, setEventsMode] = useState<"upcoming" | "archived">("upcoming");
  const [gridOpen, setGridOpen] = useState(false);

  // Dynamic band name (from bands table)
  const [bandName, setBandName] = useState<string>("");

  // Step 1 state: map of event_id -> needsResponse
  const [needsResponseByEventId, setNeedsResponseByEventId] = useState<Record<string, boolean>>({});

  const todayLondon = useMemo(() => getTodayLondonYYYYMMDD(), []);

  const loadEvents = useCallback(async () => {
    setLoading(true);

    let q = supabase.from("events").select(`
      event_id,
      event_date,
      event_status,
      event_type,
      venues:venue_id (
        event_venue_name,
        city
      )
    `);

    if (eventsMode === "upcoming") {
      q = q.gte("event_date", todayLondon).order("event_date", { ascending: true });
    } else {
      q = q.lt("event_date", todayLondon).order("event_date", { ascending: false });
    }

    const { data, error } = await q;

    const nextEvents = !error && data ? (data as unknown as EventRow[]) : [];
    setEvents(nextEvents);

    // only compute response-needed flags for upcoming
    if (eventsMode === "upcoming" && currentMemberId && nextEvents.length > 0) {
      const eventIds = nextEvents.map((e) => e.event_id);

      const { data: avData, error: avError } = await supabase
        .from("event_availability")
        .select("event_id, status")
        .eq("member_id", currentMemberId)
        .in("event_id", eventIds);

      if (!avError && avData) {
        const map: Record<string, boolean> = {};

        for (const row of avData as { event_id: string; status: AvailabilityStatus }[]) {
          const status = row.status;
          const needs = status === null || String(status).toLowerCase() === "awaiting";
          map[row.event_id] = needs;
        }

        // if no row returned for a given event, treat as needs response
        for (const id of eventIds) {
          if (map[id] === undefined) map[id] = true;
        }

        setNeedsResponseByEventId(map);
      } else {
        setNeedsResponseByEventId({});
      }
    } else {
      setNeedsResponseByEventId({});
    }

    setLoading(false);
  }, [eventsMode, todayLondon, currentMemberId]);

  // ✅ re-fetch when eventsMode changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ✅ load band name once (no hardcoding)
  useEffect(() => {
    const loadBandName = async () => {
      const { data, error } = await supabase
        .from("bands")
        .select("band_name")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.band_name) setBandName(data.band_name);
    };

    loadBandName();
  }, []);

  function formatDisplayDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);
    const formatted = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);

    return formatted.replace(",", "").toUpperCase();
  }

  const filteredEvents = events.filter((item) => {
    const venue = item.venues;
    const venueName = venue?.event_venue_name ?? "";
    const city = venue?.city ?? "";
    const status = item.event_status ?? "";
    const type = item.event_type ?? "";

    const haystack = `${venueName} ${city} ${item.event_date} ${status} ${type}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  // IMPORTANT: avoid stale header closures by keeping latest list in a ref
  const filteredEventsRef = useRef<EventRow[]>([]);
  useEffect(() => {
    filteredEventsRef.current = filteredEvents ?? [];
  }, [filteredEvents]);

  const responseRequiredCount = useMemo(() => {
    if (eventsMode !== "upcoming") return 0;
    return filteredEvents.reduce((acc, e) => acc + (needsResponseByEventId[e.event_id] ? 1 : 0), 0);
  }, [eventsMode, filteredEvents, needsResponseByEventId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Events",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: PRIMARY_TEAL },
          headerTitleStyle: { color: "#fff", fontWeight: "700", fontSize: 18 },
          headerTintColor: "#fff",

          headerLeft: () => (
            <View
              style={Platform.select({
                ios: {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                },
                default: { paddingLeft: 12 },
              })}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),

          headerRight: () => {
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingRight: 12 }}>
                <TouchableOpacity
                  onPress={() =>
                    shareUpcomingNext6Months({
                      bandName,
                      events: filteredEventsRef.current,
                    })
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="share-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/events/calendar")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
  onPress={() => setGridOpen(true)}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Ionicons name="grid-outline" size={24} color="#fff" />
</TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="home-outline" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          },
        }}
      />

      <View style={styles.container}>
        {/* MODE TOGGLE */}
        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <Pressable
              onPress={() => setEventsMode("upcoming")}
              style={[styles.modeBtn, eventsMode === "upcoming" ? styles.modeBtnActive : null]}
            >
              <Text style={[styles.modeText, eventsMode === "upcoming" ? styles.modeTextActive : null]}>
                Upcoming
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEventsMode("archived")}
              style={[styles.modeBtn, eventsMode === "archived" ? styles.modeBtnActive : null]}
            >
              <Text style={[styles.modeText, eventsMode === "archived" ? styles.modeTextActive : null]}>
                Archived
              </Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* COUNT + ADD EVENT */}
        <View style={styles.actionsRow}>
          {eventsMode === "upcoming" && responseRequiredCount > 0 ? (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{responseRequiredCount} Confirm Availability</Text>
            </View>
          ) : (
            <View />
          )}

          {canEdit ? (
            <ActionButton label="Add Event" icon="add-circle-outline" onPress={() => router.push("/events/add")} />
          ) : null}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venue = item.venues;
            const venueName = venue?.event_venue_name ?? "Unknown venue";
            const city = venue?.city ?? "Unknown city";
            const status = item.event_status ?? "Unknown";
            const type = item.event_type ?? "Event";

            const needsResponse = eventsMode === "upcoming" && !!needsResponseByEventId[item.event_id];

            return (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.event_id } })}
              >
                <View style={styles.eventRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventDate}>{formatDisplayDate(item.event_date)}</Text>

                    <Text style={styles.eventVenue}>
                      {venueName}, {city}
                    </Text>

                    {eventsMode === "archived" ? <Text style={styles.archivedBadge}>ARCHIVED</Text> : null}

                    <Text style={styles.eventMeta}>
                      {type}, {status}
                    </Text>

                    {needsResponse ? <Text style={styles.responseBadge}>Confirm availability</Text> : null}
                  </View>

                  <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <AvailabilityGridModal
  visible={gridOpen}
  onClose={() => setGridOpen(false)}
  events={filteredEventsRef.current}
/>
    </>
  );
}

// ---------- Share helpers (Phase 1, safe fields only) ----------

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function parseEventDateLocal(dateVal: any): Date | null {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    return Number.isNaN(dateVal.getTime()) ? null : dateVal;
  }

  const s = String(dateVal).trim();
  if (!s) return null;

  // Treat YYYY-MM-DD as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyyStr, mmStr, ddStr] = s.split("-");
    const yyyy = parseInt(yyyyStr, 10);
    const mm = parseInt(mmStr, 10);
    const dd = parseInt(ddStr, 10);
    const d = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFullDateGB(dateLike: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateLike);
}

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function buildUpcomingShareMessage(opts: { bandName?: string | null; events: EventRow[] }) {
  const today = startOfTodayLocal();

  const until = addMonths(today, 6);
  until.setHours(23, 59, 59, 999);

  const allowedStatuses = new Set(["confirmed", "provisional", "cancelled"]);

  const upcoming = (opts.events || [])
    .map((e) => {
      const dt = parseEventDateLocal(e?.event_date);
      const statusRaw = safeTrim(e?.event_status);
      const statusNorm = statusRaw.toLowerCase();
      const typeNorm = safeTrim(e?.event_type).toLowerCase();
      return { e, dt, statusNorm, typeNorm };
    })
    .filter(({ dt, statusNorm, typeNorm }) => {
      // Only share gigs
      if (typeNorm !== "gig") return false;

      // Must be within next 6 months
      if (!dt) return false;
      dt.setHours(0, 0, 0, 0);

      return dt >= today && dt <= until && allowedStatuses.has(statusNorm);
    })
    .sort((a, b) => a.dt!.getTime() - b.dt!.getTime())
    .map(({ e }) => e);

  const lines: string[] = [];

  const band = safeTrim(opts.bandName) || "Band";
  lines.push(`${band} – Upcoming Gigs`);
  lines.push(`Next 6 months (as of ${formatFullDateGB(today)})`);
  lines.push("");

  if (upcoming.length === 0) {
    lines.push("No gigs in the next 6 months.");
    return lines.join("\n").trim();
  }

  for (const e of upcoming) {
    const dt = parseEventDateLocal(e?.event_date);
    const dateText = dt ? formatFullDateGB(dt) : "";

    const venueName = safeTrim(e?.venues?.event_venue_name) || "Unknown venue";
    const city = safeTrim(e?.venues?.city) || "Unknown city";
    const status = safeTrim(e?.event_status) || "Unknown";

    // Subtle marker: only for exceptions
    const statusNorm = safeTrim(e?.event_status).toLowerCase();
    const mark = statusNorm === "provisional" ? "P" : statusNorm === "cancelled" ? "X" : "";

    lines.push([mark, dateText, venueName, city, status].filter(Boolean).join(" · "));
  }
  lines.push("");
lines.push("Shared via GigLog");

  return lines.join("\n").trim();
}

async function shareUpcomingNext6Months(params: { bandName?: string | null; events: EventRow[] }) {
  const message = buildUpcomingShareMessage(params);
  await Share.share({ message });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },

  // MODE TOGGLE
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  modePill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.cardBg,
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeBtnActive: {
    backgroundColor: colors.border,
  },
  modeText: {
    fontWeight: "400",
    color: colors.text,
  },
  modeTextActive: {
    fontWeight: "700",
  },

  // SEARCH
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },

  // COUNT + ADD EVENT ROW
  actionsRow: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  countPill: {
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  countPillText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  archivedBadge: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 2,
    textTransform: "uppercase",
  },

  // EVENT ROW
  eventItem: {
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,

    borderLeftWidth: 3,
    borderLeftColor: colors.accent,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // DATE
  eventDate: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // VENUE + CITY
  eventVenue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
    lineHeight: 22,
  },

  // TYPE + STATUS
  eventMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  // CONFIRM AVAILABILITY (quiet, below meta)
  responseBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
});