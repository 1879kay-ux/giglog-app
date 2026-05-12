// app/events/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import ActionButton from "@/components/ui/ActionButton";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
  venue_id: string;
  event_venue_name: string | null;
  city: string | null;
};

type EventRow = {
  event_id: string;
  event_date: string;
  event_status: string | null;
  event_type: string | null;
  venue_id: string | null;
  venues?: { event_venue_name: string | null; city: string | null } | null; // hydrated client-side
};

type AvailabilityStatus = string | null;

type Readiness = "green" | "amber" | "red";

function normStatus(s: any): "available" | "provisional" | "unavailable" | "awaiting" {
  const v = String(s ?? "awaiting").toLowerCase();
  if (v === "available") return "available";
  if (v === "provisional") return "provisional";
  if (v === "unavailable") return "unavailable";
  return "awaiting";
}

function computeReadiness(
  expectedMemberIds: string[],
  availabilityRows: { member_id: string; status: AvailabilityStatus; is_dep?: boolean }[]
): Readiness {
  if (expectedMemberIds.length === 0) return "amber";

  const map = new Map(availabilityRows.map((r) => [r.member_id, r.status]));

  let hasUnavailable = false;
  let hasAwaitingOrProvisional = false;

  for (const memberId of expectedMemberIds) {
    const status = normStatus(map.get(memberId));

    if (status === "unavailable") hasUnavailable = true;
    else if (status === "awaiting" || status === "provisional") hasAwaitingOrProvisional = true;
  }

  const hasAvailableDep = availabilityRows.some(
    (r) => r.is_dep && normStatus(r.status) === "available"
  );

  if (hasUnavailable && hasAvailableDep && !hasAwaitingOrProvisional) return "green";
  if (hasUnavailable && hasAvailableDep && hasAwaitingOrProvisional) return "amber";
  if (hasUnavailable) return "red";
  if (hasAwaitingOrProvisional) return "amber";
  return "green";
}

function getTodayLondonYYYYMMDD() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

let savedEventsReturnEventId: string | null = null;

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
  const [needsAvailabilityOnly, setNeedsAvailabilityOnly] = useState(false);
const [availabilityConflictOnly, setAvailabilityConflictOnly] = useState(false);
const [gridOpen, setGridOpen] = useState(false);
  const [readinessByEventId, setReadinessByEventId] = useState<Record<string, Readiness>>({});
  const listRef = useRef<FlatList<EventRow>>(null);

  const [bandName, setBandName] = useState<string>("");

  const [needsResponseByEventId, setNeedsResponseByEventId] = useState<Record<string, boolean>>(
  {}
);
const [availabilityConflictByEventId, setAvailabilityConflictByEventId] = useState<Record<string, boolean>>({});

  const todayLondon = useMemo(() => getTodayLondonYYYYMMDD(), []);

  const loadEvents = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    const { data: s } = await supabase.auth.getSession();
    console.log("SESSION USER ID", s?.session?.user?.id, "EMAIL", s?.session?.user?.email);

    // NOTE: do NOT embed venues here; if venues RLS blocks SELECT, PostgREST will error and return 0 events.
    let q = supabase
      .from("events")
      .select(`
        event_id,
        event_date,
        event_status,
        event_type,
        venue_id
      `)
      .neq("event_status", "Deleted");

    if (eventsMode === "upcoming") {
      q = q.gte("event_date", todayLondon).order("event_date", { ascending: true });
    } else {
      q = q.lt("event_date", todayLondon).order("event_date", { ascending: false });
    }

    const { data, error } = await q;

    if (error) {
      console.log("events list load error", error);
      setEvents([]);
setReadinessByEventId({});
setNeedsResponseByEventId({});
setAvailabilityConflictByEventId({});
setLoading(false);
      return;
    }

    const baseEvents = data ? (data as unknown as EventRow[]) : [];

    // Hydrate venue name/city best-effort (ignore failures, still show events)
    const venueIds = Array.from(
      new Set(baseEvents.map((e) => e.venue_id).filter(Boolean) as string[])
    );

    let venuesById: Record<string, { event_venue_name: string | null; city: string | null }> = {};
    if (venueIds.length > 0) {
      const { data: vData, error: vErr } = await supabase
        .from("venues")
        .select("venue_id,event_venue_name,city")
        .in("venue_id", venueIds);

      if (vErr) {
        console.log("venues hydrate error (ignored)", vErr);
      } else {
        for (const v of (vData ?? []) as any[]) {
          if (!v?.venue_id) continue;
          venuesById[v.venue_id] = {
            event_venue_name: v.event_venue_name ?? null,
            city: v.city ?? null,
          };
        }
      }
    }

    const nextEvents = baseEvents.map((e) => ({
      ...e,
      venues: e.venue_id ? venuesById[e.venue_id] ?? null : null,
    }));

    setEvents(nextEvents);

    // --- Readiness dots (expected lineup only) ---
    try {
      const eventIds = nextEvents.map((e) => e.event_id);
      if (eventIds.length === 0) {
        setReadinessByEventId({});
      } else {
        const { data: coreData } = await supabase
          .from("band_members")
          .select("member_id")
          .eq("is_active", true)
          .eq("is_dep", false)
          .eq("band_role", "Band")
          .eq("member_type", "musician");

        const { data: depData } = await supabase
          .from("band_members")
          .select("member_id")
          .eq("is_active", true)
          .eq("is_dep", true);

        const coreMemberIds = (coreData ?? [])
          .map((r: any) => r.member_id)
          .filter(Boolean);

        const depMemberIds = (depData ?? [])
          .map((r: any) => r.member_id)
          .filter(Boolean);

        const { data: emData } = await supabase
          .from("event_members")
          .select("event_id, member_id")
          .in("event_id", eventIds);

        const customByEventId: Record<string, string[]> = {};
        for (const r of (emData ?? []) as any[]) {
          if (!r?.event_id || !r?.member_id) continue;
          (customByEventId[r.event_id] ??= []).push(r.member_id);
        }

        const hasCustomByEventId: Record<string, boolean> = {};
        for (const id of eventIds) hasCustomByEventId[id] = (customByEventId[id]?.length ?? 0) > 0;

        const memberIdSet = new Set<string>([...coreMemberIds, ...depMemberIds]);
        for (const id of eventIds) {
          for (const mid of customByEventId[id] ?? []) memberIdSet.add(mid);
        }
        const memberIds = Array.from(memberIdSet);

        const { data: avAllData } = await supabase
          .from("event_availability")
          .select("event_id, member_id, status")
          .in("event_id", eventIds)
          .in("member_id", memberIds);

        const avByEventId: Record<string, { member_id: string; status: AvailabilityStatus; is_dep?: boolean }[]> = {};
        for (const r of (avAllData ?? []) as any[]) {
          if (!r?.event_id || !r?.member_id) continue;
          (avByEventId[r.event_id] ??= []).push({
            member_id: r.member_id,
            status: r.status,
            is_dep: depMemberIds.includes(r.member_id),
          });
        }

        const nextReadiness: Record<string, Readiness> = {};
        for (const id of eventIds) {
          const expected = hasCustomByEventId[id] ? (customByEventId[id] ?? []) : coreMemberIds;
          const rows = avByEventId[id] ?? [];
          nextReadiness[id] = computeReadiness(expected, rows);
        }

        setReadinessByEventId(nextReadiness);
      }
    } catch (e) {
      console.log("readiness compute error (ignored)", e);
      setReadinessByEventId({});
    }

    if (eventsMode === "upcoming" && currentMemberId && nextEvents.length > 0) {
      const eventIds = nextEvents.map((e) => e.event_id);

      const { data: avData, error: avError } = await supabase
        .from("event_availability")
        .select("event_id, status")
        .eq("member_id", currentMemberId)
        .in("event_id", eventIds);

      if (!avError && avData) {
  const map: Record<string, boolean> = {};
  const statusByEventId: Record<string, AvailabilityStatus> = {};

  for (const row of avData as { event_id: string; status: AvailabilityStatus }[]) {
    const status = row.status;
    statusByEventId[row.event_id] = status;
          const needs = status === null || String(status).toLowerCase() === "awaiting";
          map[row.event_id] = needs;
        }

        for (const id of eventIds) {
          if (map[id] === undefined) map[id] = true;
        }

        setNeedsResponseByEventId(map);

const { data: unavailabilityData } = await supabase
  .from("member_unavailability")
  .select("start_date, end_date")
  .eq("member_id", currentMemberId);

const conflictMap: Record<string, boolean> = {};
for (const e of nextEvents) {
  const status = statusByEventId[e.event_id];
  conflictMap[e.event_id] =
    String(status).toLowerCase() === "available" &&
    (unavailabilityData ?? []).some(
      (u: any) => u.start_date <= e.event_date && u.end_date >= e.event_date
    );
}

setAvailabilityConflictByEventId(conflictMap);
      } else {
        setNeedsResponseByEventId({});
        setAvailabilityConflictByEventId({});
      }
    } else {
      setNeedsResponseByEventId({});
      setAvailabilityConflictByEventId({});
    }

    setLoading(false);
  }, [eventsMode, todayLondon, currentMemberId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      loadEvents(false);
    }, [loadEvents])
  );

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
    if (needsAvailabilityOnly && !needsResponseByEventId[item.event_id]) return false;
if (availabilityConflictOnly && !availabilityConflictByEventId[item.event_id]) return false;

const venue = item.venues;
    const venueName = venue?.event_venue_name ?? "";
    const city = venue?.city ?? "";
    const status = item.event_status ?? "";
    const type = item.event_type ?? "";

    const haystack = `${venueName} ${city} ${item.event_date} ${status} ${type}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const filteredEventsRef = useRef<EventRow[]>([]);
  useEffect(() => {
    filteredEventsRef.current = filteredEvents ?? [];
  }, [filteredEvents]);

  useEffect(() => {
    if (loading || !savedEventsReturnEventId) return;

    const index = filteredEvents.findIndex((e) => e.event_id === savedEventsReturnEventId);

    if (index < 0 || filteredEvents.length === 0) {
      if (needsAvailabilityOnly) {
        setNeedsAvailabilityOnly(false);
      }

      savedEventsReturnEventId = null;
      return;
    }

    setTimeout(() => {
      const latestIndex = filteredEventsRef.current.findIndex(
        (e) => e.event_id === savedEventsReturnEventId
      );

      if (latestIndex < 0 || filteredEventsRef.current.length === 0) {
        savedEventsReturnEventId = null;
        return;
      }

      listRef.current?.scrollToIndex({
        index: latestIndex,
        animated: false,
        viewPosition: 0,
      });
    }, 100);
  }, [loading, filteredEvents]);

  useEffect(() => {
    if (!needsAvailabilityOnly) return;
    if (loading) return;
    if (filteredEvents.length > 0) return;

    setNeedsAvailabilityOnly(false);
  }, [needsAvailabilityOnly, loading, filteredEvents.length]);

  const responseRequiredCount = useMemo(() => {
  if (eventsMode !== "upcoming") return 0;
  return filteredEvents.reduce((acc, e) => acc + (needsResponseByEventId[e.event_id] ? 1 : 0), 0);
}, [eventsMode, filteredEvents, needsResponseByEventId]);

const availabilityConflictCount = useMemo(() => {
  if (eventsMode !== "upcoming") return 0;
  return events.reduce((acc, e) => acc + (availabilityConflictByEventId[e.event_id] ? 1 : 0), 0);
}, [eventsMode, events, availabilityConflictByEventId]);

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

        <View style={styles.actionsRow}>
          {eventsMode === "upcoming" && availabilityConflictCount > 0 ? (
  <Pressable
  onPress={() => setAvailabilityConflictOnly((v) => !v)}
  style={[styles.conflictPill, availabilityConflictOnly ? styles.conflictPillActive : null]}
>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Ionicons name="filter-outline" size={14} color="#B45309" />

    <Text style={styles.conflictPillText}>
      {availabilityConflictCount} Availability Conflict
    </Text>
  </View>
</Pressable>
) : null}
          {eventsMode === "upcoming" && responseRequiredCount > 0 ? (
            <Pressable
              onPress={() => setNeedsAvailabilityOnly((v) => !v)}
              style={[styles.countPill, needsAvailabilityOnly ? styles.countPillActive : null]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons
                  name={needsAvailabilityOnly ? "close-circle-outline" : "filter-outline"}
                  size={14}
                  color={colors.danger}
                />

                <Text style={styles.countPillText}>
                  {needsAvailabilityOnly
                    ? "Showing Awaiting Availability"
                    : `${responseRequiredCount} Confirm Availability`}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View />
          )}

          {canEdit ? (
            <ActionButton
              label="Add Event"
              icon="add-circle-outline"
              onPress={() => router.push("/events/add")}
            />
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={filteredEvents}
          onScrollToIndexFailed={() => {}}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venueName = item.venues?.event_venue_name ?? "—";
            const city = item.venues?.city ?? "—";
            const statusRaw = item.event_status ?? "Unknown";
            const statusNorm = String(item.event_status ?? "").toLowerCase();
            const type = item.event_type ?? "Event";

            const needsResponse = eventsMode === "upcoming" && !!needsResponseByEventId[item.event_id];

const hasAvailabilityConflict =
  eventsMode === "upcoming" && !!availabilityConflictByEventId[item.event_id];

const readiness: Readiness | null =
              statusNorm === "cancelled" ? null : readinessByEventId[item.event_id] ?? "amber";

            return (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() => {
                  savedEventsReturnEventId = item.event_id;
                  router.push({ pathname: "/events/[id]", params: { id: item.event_id } });
                }}
              >
                <View style={styles.eventRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventDate}>{formatDisplayDate(item.event_date)}</Text>

                    <Text style={styles.eventVenue}>
                      {venueName}, {city}
                    </Text>

                    {eventsMode === "archived" ? <Text style={styles.archivedBadge}>ARCHIVED</Text> : null}

                    <Text style={styles.eventMeta}>
                      {type},{" "}
                      <Text
                        style={[
                          styles.eventMetaStatus,
                          statusRaw === "Provisional"
                            ? styles.statusProvisional
                            : statusRaw === "Cancelled"
                              ? styles.statusCancelled
                              : null,
                        ]}
                      >
                        {statusRaw}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.rightCol}>
                    {hasAvailabilityConflict ? (
  <Text style={styles.conflictBadgeSmall}>Availability conflict</Text>
) : null}
                    {needsResponse ? <Text style={styles.responseBadgeSmall}>Confirm availability</Text> : null}

                    <View style={styles.rightIcons}>
                      {readiness ? (
                        <View
                          style={[
                            styles.readinessDot,
                            readiness === "green"
                              ? styles.dotGreen
                              : readiness === "red"
                                ? styles.dotRed
                                : styles.dotAmber,
                          ]}
                        />
                      ) : null}

                      <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <AvailabilityGridModal
          visible={gridOpen}
          onClose={() => setGridOpen(false)}
          events={filteredEventsRef.current}
        />
      </View>
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
      if (typeNorm !== "gig") return false;
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
    backgroundColor: "#FFFFFF",
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
  countPillActive: {
    borderColor: colors.danger,
  },
  countPillText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
conflictPill: {
  borderWidth: 1,
  borderColor: "#F59E0B",
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  paddingVertical: 8,
  paddingHorizontal: 10,
  borderRadius: 10,
},

conflictPillActive: {
  borderColor: "#D97706",
},

conflictPillText: {
  color: "#B45309",
  fontSize: 12,
  fontWeight: "700",
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

  eventItem: {
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 5,
    borderLeftColor: "#0D9488",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  eventDate: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  eventVenue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
    lineHeight: 22,
  },

  eventMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  eventMetaStatus: {
    fontWeight: "600",
  },
  statusProvisional: {
    color: "#F59E0B",
    fontWeight: "800",
  },
  statusCancelled: {
    color: "#EF4444",
    fontWeight: "800",
  },

  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },

  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  responseBadgeSmall: {
    alignSelf: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "none",
  },
conflictBadgeSmall: {
  alignSelf: "flex-end",
  marginBottom: 8,
  paddingHorizontal: 10,
  paddingVertical: 2,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#F59E0B",
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  color: "#B45309",
  fontSize: 11,
  fontWeight: "700",
},
  readinessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: "#22C55E" },
  dotAmber: { backgroundColor: "#F59E0B" },
  dotRed: { backgroundColor: "#EF4444" },
});