// app/index.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type NextEvent = {
  event_id: string;
  event_date_label: string;
  venue_city_label: string;
  type_status_label: string;
};

type NextEventQueryRow = {
  event_id: string;
  event_date: string; // date
  event_type: string;
  event_status: string;
  venues: {
    event_venue_name: string | null;
    city: string | null;
  } | null;
};

type BandBrandingQueryRow = {
  band_id: string | null;
  bands:
    | { band_name: string | null; logo_url: string | null }[]
    | { band_name: string | null; logo_url: string | null }
    | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const cm = useCurrentMember() as any;

  const canViewBandAndCrew = !!cm?.canViewBandAndCrew;
  const canViewBandDocs = !!cm?.canViewBandDocs;
  const canViewSettings = !!cm?.canViewSettings;

  const [bandName, setBandName] = useState<string>("GigSynq");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);

  function displayEventType(value: string | null | undefined) {
    const v = String(value ?? "").toLowerCase();
    if (v === "gig") return t("home.typeGig");
    if (v === "rehearsal") return t("home.typeRehearsal");
    if (v === "recording") return t("home.typeRecording");
    if (v === "promo") return t("home.typePromo");
    if (v === "meeting") return t("home.typeMeeting");
    if (v === "other") return t("home.typeOther");
    return t("home.typeEvent");
  }

  function displayEventStatus(value: string | null | undefined) {
    const v = String(value ?? "").toLowerCase();
    if (v === "confirmed") return t("home.statusConfirmed");
    if (v === "provisional") return t("home.statusProvisional");
    if (v === "cancelled") return t("home.statusCancelled");
    if (v === "deleted") return t("home.statusDeleted");
    return t("home.statusUnknown");
  }

  async function loadBandBranding() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("band_members")
      .select(
        `
        band_id,
        bands:band_id (
          band_name,
          logo_url
        )
      `,
      )
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error) {
      console.log("band branding load error", error);
      return;
    }

    const row = data as unknown as BandBrandingQueryRow | null;
    const bandObj = Array.isArray(row?.bands) ? row?.bands?.[0] : row?.bands;

    setBandName(bandObj?.band_name ?? "GigSynq");
    setLogoUrl(bandObj?.logo_url ?? null);
  }

  useEffect(() => {
    loadBandBranding();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadBandBranding();
    }, []),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNextEvent() {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { data, error } = await supabase
        .from("events")
        .select(
          `
          event_id,
          event_date,
          event_type,
          event_status,
          venues:venue_id (
            event_venue_name,
            city
          )
        `,
        )
        .gte("event_date", today)
        .neq("event_status", "Cancelled")
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setNextEvent(null);
        return;
      }

      const row = data as unknown as NextEventQueryRow;

      const venueName = row.venues?.event_venue_name ?? "TBC";
      const city = row.venues?.city ?? "TBC";

      const dateLabel = new Intl.DateTimeFormat(
        i18n.resolvedLanguage || i18n.language,
        {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )
        .format(new Date(row.event_date))
        .toUpperCase();

      const typeRaw = row.event_type ?? "Event";
      const statusRaw = row.event_status ?? "Unknown";
      const typeDisplay = displayEventType(typeRaw);
      const statusDisplay = displayEventStatus(statusRaw);

      setNextEvent({
        event_id: row.event_id,
        event_date_label: dateLabel,
        venue_city_label: `${venueName}, ${city}`,
        type_status_label: `${typeDisplay}, ${statusDisplay}`,
      });
    }

    loadNextEvent();

    return () => {
      cancelled = true;
    };
  }, [i18n.language, i18n.resolvedLanguage, t]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "GigSynq",
          headerRight: () =>
            canViewSettings ? (
              <Link href="./settings" asChild>
                <TouchableOpacity style={styles.headerIconWrapper} hitSlop={10}>
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </Link>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand hero */}
        <View style={styles.brandHero}>
          <View style={styles.brandHeroAccent} />

          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.brandHeroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.brandHeroFallback}>
              <Text style={styles.brandHeroFallbackText}>
                {bandName?.[0]?.toUpperCase() ?? "G"}
              </Text>
            </View>
          )}

          <Text style={styles.brandHeroName} numberOfLines={2}>
            {bandName || "GigSynq"}
          </Text>
        </View>

        {/* Next event */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t("home.nextEvent")}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.nextEventCard,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => {
            if (!nextEvent?.event_id) return;
            router.push(`/events/${nextEvent.event_id}`);
          }}
          disabled={!nextEvent}
        >
          {nextEvent ? (
            <>
              <View style={styles.nextEventLeftAccent} />
              <View style={styles.nextEventContent}>
                <Text style={styles.nextEventDate}>
                  {nextEvent.event_date_label}
                </Text>
                <Text style={styles.nextEventVenue} numberOfLines={1}>
                  {nextEvent.venue_city_label}
                </Text>
                <Text style={styles.nextEventMeta} numberOfLines={1}>
                  {nextEvent.type_status_label}
                </Text>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={22} color="#666" />
              </View>
            </>
          ) : (
            <Text style={styles.noNextEvent}>{t("home.noUpcomingEvents")}</Text>
          )}
        </Pressable>

        {/* Quick links */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>{t("home.quickLinks")}</Text>
        </View>

        <View style={styles.grid}>
          <NavTile
            label={t("home.events")}
            icon="calendar"
            onPress={() => router.push("/events")}
          />

          {canViewBandAndCrew ? (
            <>
              <NavTile
                label={t("home.venues")}
                icon="map-marker"
                onPress={() => router.push("/venue")}
              />
              <NavTile
                label={t("home.bandAndCrew")}
                icon="users"
                onPress={() => router.push("/band")}
              />
            </>
          ) : null}

          {canViewBandDocs ? (
            <NavTile
              label={t("home.bandDocs")}
              icon="file-text-o"
              onPress={() => router.push("/band-documents")}
            />
          ) : null}

          <NavTile
            label={t("home.profile")}
            icon="user"
            onPress={() => router.push("/profile")}
          />
        </View>
      </ScrollView>
    </>
  );
}

type NavTileProps = {
  label: string;
  icon: any;
  onPress: () => void;
};

function NavTile({ label, icon, onPress }: NavTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <FontAwesome name={icon} size={22} color="#333" />
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: "#fff",
  },

  pressed: {
    opacity: 0.85,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#444",
  },

  brandHero: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: "rgba(0,153,153,0.06)",
  },
  brandHeroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#009999",
  },
  brandHeroImage: {
    width: "100%",
    maxWidth: 520,
    height: 110,
    marginTop: 6,
    marginBottom: 6,
  },
  brandHeroFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  brandHeroFallbackText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
  },
  brandHeroName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },

  nextEventCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  nextEventLeftAccent: {
    width: 6,
    backgroundColor: "#009999",
  },
  nextEventContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  nextEventDate: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555",
    marginBottom: 6,
  },
  nextEventVenue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    marginBottom: 4,
  },
  nextEventMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  chevronWrap: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  noNextEvent: {
    padding: 14,
    fontSize: 14,
    color: "#666",
    fontWeight: "700",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "48%",
    backgroundColor: "#f6f6f6",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tileText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },
});
