// app/events/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import ActionButton from "@/components/ui/ActionButton";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventsMode, setEventsMode] = useState<"upcoming" | "archived">("upcoming");

  const todayLondon = useMemo(() => getTodayLondonYYYYMMDD(), []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventsMode])
  );

  async function loadEvents() {
    setLoading(true);

        let q = supabase
      .from("events")
      .select(`
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
      q = q
        .gte("event_date", todayLondon)
        .order("event_date", { ascending: true });
    } else {
      q = q
        .lt("event_date", todayLondon)
        .order("event_date", { ascending: false });
    }

    const { data, error } = await q;

    if (!error && data) {
      setEvents(data as unknown as EventRow[]);
    } else {
      setEvents([]);
    }

    setLoading(false);
  }

  function formatDisplayDate(dateString: string) {
    // Avoid timezone shifting for date-only strings
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
          headerStyle: { backgroundColor: "#008080" },
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

          headerRight: () => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingRight: 12 }}>
    <TouchableOpacity
      onPress={() => router.push("/events/calendar")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="calendar-outline" size={26} color="#fff" />
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => router.push("/")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="home-outline" size={26} color="#fff" />
    </TouchableOpacity>
  </View>
),
        }}
      />

      <View style={styles.container}>
        {/* MODE TOGGLE */}
        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <Pressable
              onPress={() => setEventsMode("upcoming")}
              style={[
                styles.modeBtn,
                eventsMode === "upcoming" ? styles.modeBtnActive : null,
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  eventsMode === "upcoming" ? styles.modeTextActive : null,
                ]}
              >
                Upcoming
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEventsMode("archived")}
              style={[
                styles.modeBtn,
                eventsMode === "archived" ? styles.modeBtnActive : null,
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  eventsMode === "archived" ? styles.modeTextActive : null,
                ]}
              >
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

        {/* ADD EVENT BUTTON (admin + admin mode) */}
        {canEdit ? (
          <ActionButton
            label="Add Event"
            icon="add-circle-outline"
            onPress={() => router.push("/events/add")}
          />
        ) : null}

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venue = item.venues;
            const venueName = venue?.event_venue_name ?? "Unknown venue";
            const city = venue?.city ?? "Unknown city";
            const status = item.event_status ?? "Unknown";
            const type = item.event_type ?? "Event";

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

                    {eventsMode === "archived" ? (
  <Text style={styles.archivedBadge}>ARCHIVED</Text>
) : null}

{/* TYPE + STATUS */}
<Text style={styles.eventMeta}>
  {type}, {status}
</Text>
                  </View>

                  <Ionicons name="chevron-forward-outline" size={24} color="#333" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    borderColor: "#008080",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeBtnActive: {
    backgroundColor: "#e5e7eb",
  },
  modeText: {
    fontWeight: "400",
    color: "#222",
  },
  modeTextActive: {
    fontWeight: "700",
  },
  archivedBadge: {
  alignSelf: "flex-start",
  fontSize: 12,
  fontWeight: "700",
  color: "#666",
  marginTop: 2,
  marginBottom: 2,
  textTransform: "uppercase",
},

  // SEARCH
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#008080",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },

  // EVENT ROW
  eventItem: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // DATE
  eventDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  // VENUE + CITY
  eventVenue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },

  // TYPE + STATUS
  eventMeta: {
    fontSize: 14,
    color: "#444",
    marginTop: 2,
  },
});