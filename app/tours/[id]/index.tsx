// app/tours/[id]/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";

import { supabase } from "@/lib/supabase";

import { colors } from "@/theme/colors";

import { Ionicons } from "@expo/vector-icons";

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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

type TourMember = { tour_member_id: string; member_id: string };

type MemberName = { member_id: string; display_name: string | null };

type MemberCapability = { tour_member_id: string; capability_id: string };

type Capability = { capability_id: string; name: string; category: string; sort_order: number };



const CATEGORIES = [

  { key: "performance", titleKey: "people.category.performance" },

  { key: "crew", titleKey: "people.category.crew" },

  { key: "logistics", titleKey: "people.category.logistics" },

  { key: "business", titleKey: "people.category.business" },

  { key: "creative_specialist", titleKey: "people.category.creativeSpecialist" },

  { key: "other", titleKey: "people.category.other" },

];



function formatDate(dateOnly: string, language: string): string {

  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Intl.DateTimeFormat(language, {

    day: "numeric",

    month: "short",

    year: "numeric",

  }).format(new Date(year, month - 1, day));

}

export default function TourOverviewScreen() {

  const router = useRouter();
  const { t, i18n } = useTranslation();

  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();

  const canManage = isAdmin && adminModeEnabled;

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tour, setTour] = useState<TourRow | null>(null);

  const [actName, setActName] = useState<string | null>(null);

  const [events, setEvents] = useState<TourEventRow[]>([]);

  const [tourMembers, setTourMembers] = useState<TourMember[]>([]);

  const [memberNames, setMemberNames] = useState<MemberName[]>([]);

  const [memberCapabilities, setMemberCapabilities] = useState<MemberCapability[]>([]);

  const [capabilities, setCapabilities] = useState<Capability[]>([]);

  const loadTour = useCallback(async () => {

    if (!tourId || !bandId) {

      setErrorMessage(t("tours.unavailableTour"));

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

      setActName(actResult.data?.act_name ?? null);

        setEvents((eventsResult.data ?? []) as unknown as TourEventRow[]);



        // Read-only Tour line-up. Query tables separately to avoid ambiguous FK joins.

        const { data: tourMemberData, error: tourMemberError } = await supabase

          .from("tour_members")

          .select("tour_member_id, member_id")

          .eq("tour_id", tourId);

        if (tourMemberError) throw tourMemberError;

        const members = (tourMemberData ?? []) as TourMember[];

        setTourMembers(members);



        if (members.length) {

          const memberIds = members.map((m) => m.member_id);

          const assignmentIds = members.map((m) => m.tour_member_id);

          const [namesResult, assignmentsResult] = await Promise.all([

            supabase.from("band_members")

              .select("member_id, display_name")

              .eq("band_id", bandId).in("member_id", memberIds),

            supabase.from("tour_member_capabilities")

              .select("tour_member_id, capability_id")

              .in("tour_member_id", assignmentIds),

          ]);

          if (namesResult.error) throw namesResult.error;

          if (assignmentsResult.error) throw assignmentsResult.error;

          setMemberNames((namesResult.data ?? []) as MemberName[]);

          setMemberCapabilities((assignmentsResult.data ?? []) as MemberCapability[]);

        } else {

          setMemberNames([]);

          setMemberCapabilities([]);

        }



        const { data: capsData, error: capsError } = await supabase

          .from("capabilities")

          .select("capability_id, name, category, sort_order")

          .eq("band_id", bandId);

        if (capsError) throw capsError;

        setCapabilities((capsData ?? []) as Capability[]);

    } catch (error: any) {

      console.log("tour overview load error", error);

      setErrorMessage(error?.message ?? t("tours.loadOverviewError"));

      setTour(null);

        setEvents([]);

        setTourMembers([]);

        setMemberNames([]);

        setMemberCapabilities([]);

        setCapabilities([]);

    } finally {

      setLoading(false);

    }

  }, [bandId, tourId, t]);

  useFocusEffect(useCallback(() => { void loadTour(); }, [loadTour]));

  const dateRange = useMemo(() => {

    if (events.length === 0) return t("tours.datesToBeConfirmed");

    const first = events[0].event_date;

    const last = events[events.length - 1].event_date;

    return first === last
      ? formatDate(first, i18n.language)
      : `${formatDate(first, i18n.language)} – ${formatDate(last, i18n.language)}`;

  }, [events, i18n.language, t]);

  const sections = useMemo(() => {

    const namesById = new Map(memberNames.map((m) => [m.member_id, m.display_name ?? t("tours.unknownMember")]));

    const capabilitiesById = new Map(capabilities.map((c) => [c.capability_id, c]));

    return CATEGORIES.map((category) => {

      const people = tourMembers.map((member) => {

        const roles = memberCapabilities

          .filter((a) => a.tour_member_id === member.tour_member_id)

          .map((a) => capabilitiesById.get(a.capability_id))

          .filter((cap): cap is Capability => !!cap && cap.category === category.key)

          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

        // Members without assigned roles are shown in Other, rather than disappearing.

        const hasAnyRole = memberCapabilities.some((a) => a.tour_member_id === member.tour_member_id);

        if (!roles.length && !(category.key === "other" && !hasAnyRole)) return null;

        return {

          id: member.member_id,

          name: namesById.get(member.member_id) ?? t("tours.unknownMember"),

          roleNames: roles.map((r) => r.name).join(" · ") || t("tours.noRoleAssigned"),

        };

      }).filter((m): m is NonNullable<typeof m> => m !== null)

        .sort((a, b) => a.name.localeCompare(b.name));

      return { ...category, people };

    }).filter((category) => category.people.length > 0);

  }, [tourMembers, memberNames, memberCapabilities, capabilities, t]);

  const translateTourStatus = (value: string) => {
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

  const translateEventType = (value: string) => {
    const key = value.trim().toLowerCase();
    const translationKeys: Record<string, string> = {
      gig: "eventsIndex.typeGig",
      rehearsal: "eventsIndex.typeRehearsal",
      recording: "eventsIndex.typeRecording",
      promo: "eventsIndex.typePromo",
      meeting: "eventsIndex.typeMeeting",
      other: "eventsIndex.typeOther",
    };
    return translationKeys[key] ? t(translationKeys[key]) : t("eventsIndex.typeOther");
  };

  const translateEventStatus = (value: string) => {
    const key = value.trim().toLowerCase();
    const translationKeys: Record<string, string> = {
      confirmed: "eventsIndex.statusConfirmed",
      provisional: "eventsIndex.statusProvisional",
      cancelled: "eventsIndex.statusCancelled",
      deleted: "eventsIndex.statusDeleted",
    };
    return translationKeys[key] ? t(translationKeys[key]) : t("eventsIndex.statusUnknown");
  };



  return (

    <>

      <Stack.Screen

        options={{

          title: t("tours.overviewTitle"),

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

            <Text style={styles.retryText}>{t("tours.tryAgain")}</Text>

          </Pressable>

        </View>

      ) : tour ? (

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

          <View style={styles.card}>

            <View style={styles.titleRow}>

              <Text style={styles.tourName}>{tour.tour_name}</Text>

              <View style={styles.statusBadge}>

                <Text style={styles.statusText}>{translateTourStatus(tour.status)}</Text>

              </View>

            </View>

            <Text style={styles.actName}>{actName ?? t("tours.unknownAct")}</Text>

            <View style={styles.metaRow}>

              <Ionicons name="calendar-outline" size={18} color={colors.primary} />

              <Text style={styles.metaText}>{dateRange}</Text>

            </View>

            <View style={styles.metaRow}>

              <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />

              <Text style={styles.metaText}>{t(events.length === 1 ? "tours.eventCount_one" : "tours.eventCount_other", { count: events.length })}</Text>

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

              <Text style={styles.editTourButtonText}>{t("tours.edit")}</Text>

            </Pressable>

          ) : null}

          <Text style={styles.sectionTitle}>{t("tours.events")}</Text>

          <View style={styles.card}>

            {events.length === 0 ? (

              <Text style={styles.empty}>{t("tours.noEventsAssigned")}</Text>

            ) : (

              events.map((event, index) => (

                <Pressable

                  key={event.event_id}

                  onPress={() => router.push(`/events/${event.event_id}` as any)}

                  style={[styles.eventRow, index !== events.length - 1 && styles.eventDivider]}

                >

                  <View style={styles.eventInfo}>

                    <Text style={styles.venueName}>{event.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>

                    <Text style={styles.eventDetail}>

                      {formatDate(event.event_date, i18n.language)} · {event.venues?.city || t("tours.locationToBeConfirmed")}

                    </Text>

                    <Text style={styles.eventDetail}>{translateEventType(event.event_type)} · {translateEventStatus(event.event_status)}</Text>

                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#777" />

                </Pressable>

              ))

            )}

          </View>

          <Text style={styles.sectionTitle}>{t("tours.lineup")}</Text>

          <View style={styles.card}>

                          <Text style={styles.lineupSummary}>

                {t(tourMembers.length === 1 ? "tours.personCount_one" : "tours.personCount_other", { count: tourMembers.length })}

              </Text>

              {tourMembers.length === 0 ? (

                <Text style={styles.empty}>{t("tours.noLineupAssigned")}</Text>

              ) : (

                sections.map((section) => (

                  <View key={section.key} style={styles.lineupSection}>

                    <Text style={styles.lineupSectionTitle}>{t(section.titleKey)}</Text>

                    {section.people.map((person) => (

                      <View key={`${section.key}-${person.id}`} style={styles.lineupPerson}>

                        <Text style={styles.lineupPersonName}>{person.name}</Text>

                        <Text style={styles.lineupPersonRoles}>{person.roleNames}</Text>

                      </View>

                    ))}

                  </View>

                ))

              )}

              <Text style={styles.empty}>{t("tours.rolesIndependent")}</Text>

            {canManage ? (

              <Pressable

                accessibilityRole="button"

                onPress={() => router.push(`/tours/${tourId}/lineup` as any)}

                style={styles.lineupButton}

              >

                <Ionicons name="people-outline" size={19} color="#fff" />

                <Text style={styles.editTourButtonText}>{t("tours.manageLineup")}</Text>

              </Pressable>

            ) : null}

              {canManage ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/tours/${tourId}/assign` as any)}
                  style={styles.assignButton}
                >
                  <Ionicons name="copy-outline" size={19} color="#fff" />
                  <Text style={styles.editTourButtonText}>{t("tours.assignLineupToEvents")}</Text>
                </Pressable>
              ) : null}

          </View>

        </ScrollView>

      ) : (

        <View style={styles.center}><Text style={styles.error}>{t("tours.tourNotFound")}</Text></View>

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

  lineupButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
    assignButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },

  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },

  eventDivider: { borderBottomWidth: 1, borderBottomColor: "#e7e7e7" },

  eventInfo: { flex: 1 },

  venueName: { fontSize: 15, fontWeight: "800", color: "#222" },

  eventDetail: { fontSize: 13, color: "#666", marginTop: 4 },

  empty: { fontSize: 13, color: "#666", lineHeight: 20 },

  lineupSummary: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 14 },

  lineupSection: { paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: "#e7e7e7" },

  lineupSectionTitle: { fontSize: 14, fontWeight: "800", color: colors.primary, marginBottom: 8 },

  lineupPerson: { paddingVertical: 6 },

  lineupPersonName: { fontSize: 14, fontWeight: "700", color: "#222" },

  lineupPersonRoles: { fontSize: 12, color: "#666", marginTop: 3 },

});
