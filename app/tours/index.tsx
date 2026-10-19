// app/tours/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type TourDbRow = {
  tour_id: string;
  tour_name: string;
  status: string;
  created_at: string;
  act_id: string;
  acts: { act_name: string | null } | { act_name: string | null }[] | null;
};

type EventDbRow = {
  tour_id: string | null;
  event_date: string;
};

type TourListRow = {
  tour_id: string;
  tour_name: string;
  act_name: string | null;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  event_count: number;
};

function formatDate(value: string, language: string): string {
  // event_date is a date-only value. Parse locally to avoid timezone date shifts.
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function tourSort(a: TourListRow, b: TourListRow, today: string): number {
  const bucket = (tour: TourListRow) => {
    if (!tour.end_date) return 1; // Tours not yet assigned any events.
    if (tour.end_date >= today) return 0; // Upcoming and in-progress.
    return 2; // Past tours.
  };
  const aBucket = bucket(a);
  const bBucket = bucket(b);
  if (aBucket !== bBucket) return aBucket - bBucket;
  if (aBucket === 0) return (a.start_date ?? "").localeCompare(b.start_date ?? "");
  if (aBucket === 2) return (b.end_date ?? "").localeCompare(a.end_date ?? "");
  return a.tour_name.localeCompare(b.tour_name);
}

export default function ToursScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();
  const canManage = isAdmin && adminModeEnabled;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tours, setTours] = useState<TourListRow[]>([]);

  const loadTours = useCallback(async () => {
    if (!bandId) {
      setTours([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: tourData, error: toursError } = await supabase
        .from("tours")
       .select("tour_id, tour_name, status, created_at, act_id, acts!tours_act_band_fkey(act_name)")
        .eq("band_id", bandId);
      if (toursError) throw toursError;

      const dbTours = (tourData ?? []) as unknown as TourDbRow[];
      if (dbTours.length === 0) {
        setTours([]);
        return;
      }

      // Query events for this organisation, then derive ranges and counts in memory.
      // No fixed date range is stored on tours: it updates when events are added/removed.
      const { data: eventData, error: eventsError } = await supabase
        .from("events")
        .select("tour_id, event_date")
        .eq("band_id", bandId)
        .in("tour_id", dbTours.map((tour) => tour.tour_id));
      if (eventsError) throw eventsError;

      const stats = new Map<string, { count: number; start: string; end: string }>();
      for (const ev of (eventData ?? []) as EventDbRow[]) {
        if (!ev.tour_id) continue;
        const current = stats.get(ev.tour_id);
        if (!current) {
          stats.set(ev.tour_id, { count: 1, start: ev.event_date, end: ev.event_date });
        } else {
          current.count += 1;
          if (ev.event_date < current.start) current.start = ev.event_date;
          if (ev.event_date > current.end) current.end = ev.event_date;
        }
      }

      const today = new Date();
      const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const mapped = dbTours.map((tour): TourListRow => {
        const act = Array.isArray(tour.acts) ? tour.acts[0] : tour.acts;
        const stat = stats.get(tour.tour_id);
        return {
          tour_id: tour.tour_id,
          tour_name: tour.tour_name,
          act_name: act?.act_name ?? null,
          status: tour.status,
          created_at: tour.created_at,
          start_date: stat?.start ?? null,
          end_date: stat?.end ?? null,
          event_count: stat?.count ?? 0,
        };
      });
      mapped.sort((a, b) => tourSort(a, b, localToday));
      setTours(mapped);
    } catch (error: any) {
      console.log("tours load error", error);
      setErrorMessage(error?.message ?? t("tours.loadError"));
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [bandId, t]);

  useFocusEffect(useCallback(() => { void loadTours(); }, [loadTours]));

  const headerRight = useMemo(
    () => () => (
      <Pressable onPress={() => router.push("/")} hitSlop={10} style={styles.headerBtn}>
        <Ionicons name="home-outline" size={22} color="#fff" />
      </Pressable>
    ),
    [router],
  );

  const translateStatus = (value: string) => {
    switch (value.trim().toLowerCase()) {
      case "planning":
        return t("tours.statusPlanning");
      case "confirmed":
        return t("tours.statusConfirmed");
      case "completed":
        return t("tours.statusCompleted");
      case "cancelled":
        return t("tours.statusCancelled");
      default:
        return t("tours.statusUnknown");
    }
  };

  const renderTour = ({ item }: { item: TourListRow }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      onPress={() => router.push(`/tours/${item.tour_id}` as any)}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.tour_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{translateStatus(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.detail}>{item.act_name ?? t("tours.unknownAct")}</Text>
      <Text style={styles.detail}>
        {item.start_date && item.end_date
          ? item.start_date === item.end_date
            ? formatDate(item.start_date, i18n.language)
            : `${formatDate(item.start_date, i18n.language)} – ${formatDate(item.end_date, i18n.language)}`
          : t("tours.datesToBeConfirmed")}
      </Text>
      <Text style={styles.count}>
        {t(item.event_count === 1 ? "tours.eventCount_one" : "tours.eventCount_other", { count: item.event_count })}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("tours.title"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
          headerRight,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
        }}
      />
      <View style={styles.container}>
        {canManage ? (
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/tours/add" as any)}
          >
            <Ionicons name="add-circle-outline" size={21} color="#fff" />
            <Text style={styles.addButtonText}>{t("tours.create")}</Text>
          </Pressable>
        ) : null}
        {loading ? (
          <View style={styles.center}><ActivityIndicator /></View>
        ) : errorMessage ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadTours()} style={styles.retryButton}>
              <Text style={styles.retryText}>{t("tours.tryAgain")}</Text>
            </Pressable>
          </View>
        ) : tours.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t("tours.emptyTitle")}</Text>
            <Text style={styles.emptyText}>
              {canManage
                ? t("tours.emptyDescriptionManage")
                : t("tours.emptyDescriptionReadOnly")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={tours}
            keyExtractor={(item) => item.tour_id}
            renderItem={renderTour}
            contentContainerStyle={styles.listContent}
            refreshing={false}
            onRefresh={() => void loadTours()}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  pressed: { opacity: 0.85 },
  listContent: { padding: 16 },
  card: { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e7e7e7" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: "#111" },
  badge: { backgroundColor: "#E7F8F5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#0F766E", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  detail: { fontSize: 14, color: "#444", marginTop: 3 },
  count: { fontSize: 13, fontWeight: "700", color: colors.primary, marginTop: 8 },
  addButton: { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addButtonText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  errorText: { fontSize: 14, color: "#C62828", textAlign: "center" },
  retryButton: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
  retryText: { color: colors.primary, fontWeight: "700" },
});
