// app/tours/[id]/index.tsx
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TourRow = {
  tour_id: string;
  band_id: string;
  act_id: string;
  tour_name: string;
  status: string;
  notes: string | null;
};

type TourEventRow = {
  event_id: string;
  event_date: string;
  event_status: string;
  event_type: string;
  venues: { event_venue_name: string | null; city: string | null } | null;
};

function formatDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function TourOverviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();
  const canManage = isAdmin && adminModeEnabled;
  console.log("TOUR OVERVIEW PERMISSIONS:", {
  isAdmin,
  adminModeEnabled,
  canManage,
});

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tour, setTour] = useState<TourRow | null>(null);
  const [actName, setActName] = useState<string>("");
  const [events, setEvents] = useState<TourEventRow[]>([]);

  const loadTour = useCallback(async () => {
    if (!tourId || !bandId) {
      setErrorMessage("Tour or organisation not available.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: tourData, error: tourError } = await supabase
        .from("tours")
        .select("tour_id, band_id, act_id, tour_name, status, notes")
        .eq("tour_id", tourId)
        .eq("band_id", bandId)
        .single();
      if (tourError) throw tourError;

      const loadedTour = tourData as TourRow;
      const [actResult, eventsResult] = await Promise.all([
        supabase
          .from("acts")
          .select("act_name")
          .eq("act_id", loadedTour.act_id)
          .eq("band_id", bandId)
          .single(),
        supabase
          .from("events")
          .select("event_id, event_date, event_status, event_type, venues:venue_id(event_venue_name, city)")
          .eq("tour_id", tourId)
          .eq("band_id", bandId)
          .order("event_date", { ascending: true }),
      ]);
      if (actResult.error) throw actResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setTour(loadedTour);
      setActName(actResult.data?.act_name ?? "Unknown Act");
      setEvents((eventsResult.data ?? []) as unknown as TourEventRow[]);
    } catch (error: any) {
      console.log("tour overview load error", error);
      setErrorMessage(error?.message ?? "Unable to load tour.");
      setTour(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [bandId, tourId]);

  useFocusEffect(useCallback(() => { void loadTour(); }, [loadTour]));

  const dateRange = useMemo(() => {
    if (events.length === 0) return "Dates to be confirmed";
    const first = events[0].event_date;
    const last = events[events.length - 1].event_date;
    return first === last ? formatDate(first) : `${formatDate(first)} – ${formatDate(last)}`;
  }, [events]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Tour Overview",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push("/")} hitSlop={10} style={styles.headerButton}>
              <Ionicons name="home-outline" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : errorMessage ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMessage}</Text>
          <Pressable onPress={() => void loadTour()} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : tour ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.tourName}>{tour.tour_name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{tour.status}</Text>
              </View>
            </View>
            <Text style={styles.actName}>{actName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.metaText}>{dateRange}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
              <Text style={styles.metaText}>{events.length} {events.length === 1 ? "event" : "events"}</Text>
            </View>
            {tour.notes ? <Text style={styles.notes}>{tour.notes}</Text> : null}
          </View>

          {canManage ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/tours/${tourId}/edit` as any)}
              style={styles.editTourButton}
            >
              <Ionicons name="create-outline" size={19} color="#fff" />
              <Text style={styles.editTourButtonText}>Edit Tour</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Tour Events</Text>
          <View style={styles.card}>
            {events.length === 0 ? (
              <Text style={styles.empty}>No events assigned to this tour yet.</Text>
            ) : (
              events.map((event, index) => (
                <Pressable
                  key={event.event_id}
                  onPress={() => router.push(`/events/${event.event_id}` as any)}
                  style={[styles.eventRow, index !== events.length - 1 && styles.eventDivider]}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.venueName}>{event.venues?.event_venue_name || "Venue TBC"}</Text>
                    <Text style={styles.eventDetail}>
                      {formatDate(event.event_date)} · {event.venues?.city || "Location TBC"}
                    </Text>
                    <Text style={styles.eventDetail}>{event.event_type} · {event.event_status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#777" />
                </Pressable>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Tour Line-up</Text>
          <View style={styles.card}>
            <Text style={styles.empty}>Tour line-up management will be added next. Existing Event line-ups remain unchanged.</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}><Text style={styles.error}>Tour not found.</Text></View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  headerButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#C62828", fontSize: 14, textAlign: "center" },
  retryButton: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: colors.primary, borderRadius: 10 },
  retryText: { color: colors.primary, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#e7e7e7", borderRadius: 12, padding: 14, backgroundColor: "#f9f9f9", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  tourName: { flex: 1, fontSize: 20, fontWeight: "800", color: "#111" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#E7F8F5", borderRadius: 999 },
  statusText: { color: "#0F766E", fontWeight: "800", textTransform: "capitalize", fontSize: 12 },
  actName: { fontSize: 15, color: "#444", marginTop: 8, marginBottom: 12 },
  metaRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 8 },
  metaText: { fontSize: 14, color: "#444" },
  notes: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e7e7e7", fontSize: 13, color: "#555" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginTop: 12, marginBottom: 10 },
  editTourButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2, marginBottom: 10 },
  editTourButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  eventDivider: { borderBottomWidth: 1, borderBottomColor: "#e7e7e7" },
  eventInfo: { flex: 1 },
  venueName: { fontSize: 15, fontWeight: "800", color: "#222" },
  eventDetail: { fontSize: 13, color: "#666", marginTop: 4 },
  empty: { fontSize: 13, color: "#666", lineHeight: 20 },
});
