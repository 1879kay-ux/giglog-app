import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import AccommodationSection, { type AccommodationRow } from "@/components/venue/AccommodationSection";
import AvailabilitySection from "@/components/venue/AvailabilitySection";
import DetailsSection from "@/components/venue/DetailsSection";
import DocumentsSection from "@/components/venue/DocumentsSection";
import FinanceSection from "@/components/venue/FinanceSection";
import ScheduleSection from "@/components/venue/ScheduleSection";
import TravelSection from "@/components/venue/TravelSection";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

/* ---------------------------------------------------------
   ENABLE LAYOUT ANIMATION ON ANDROID
--------------------------------------------------------- */
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isSmallScreen = Dimensions.get("window").height < 700;

/* ---------------------------------------------------------
   DATE FORMATTER
--------------------------------------------------------- */
function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */
type VenueRow = {
  event_venue_name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;
  capacity: number | null;
  venue_notes: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

type EventFinanceRow = {
  fee_type: string | null;
  paid_status: string | null;
  manual_playing_share_override: number | null;

  income_guarantee: number | null;
  income_fee: number | null;
  income_door: number | null;

  accommodation_cost: number | null;
  dep_cost: number | null;
  driver_cost: number | null;
  foh_eng_cost: number | null;
  other_costs: number | null;

  fee_notes: string | null;
  cost_notes: string | null;
};

type EventRow = {
  event_id: string;
  event_date: string;
  event_type: string | null;
  event_notes: string | null;
  event_status: string | null;

  promoter_contact_name: string | null;
  promoter_contact_phone: string | null;
  promoter_contact_email: string | null;

  travel_venue: string | null;
  loadin: string | null;
  soundcheck: string | null;
  doors: string | null;
  onstage: string | null;
  offstage: string | null;
  venue_curfew: string | null;
  depart_venue: string | null;
  schedule_notes: string | null;

  setlist_url: string | null;
  eventinfo_url: string | null;
  promo_material_url: string | null;
  doc_other_url: string | null;

  // Costs that are not part of "Finance" (still on events)
  van_hire: number | null;
  fuel: number | null;

  // per-event departure override (optional)
  departure_address: string | null;
  departure_postcode: string | null;

  venue_id: string | null;
  venues: VenueRow[] | null;
};

/* ---------------------------------------------------------
   SECTION KEYS
--------------------------------------------------------- */
type SectionKey =
  | "details"
  | "availability"
  | "schedule"
  | "documents"
  | "travel"
  | "finance"
  | "accommodation";

/* ---------------------------------------------------------
   MAIN SCREEN
--------------------------------------------------------- */
export default function EventDetailsScreen() {
  const router = useRouter();

  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  // Safer id handling
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [finance, setFinance] = useState<EventFinanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCustomLineup, setHasCustomLineup] = useState(false);
  const [accommodation, setAccommodation] = useState<AccommodationRow | null>(null);

  // Mapped from auth.users.id -> band_members.member_id
  const [currentMemberId, setCurrentMemberId] = useState<string>("");

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    details: false,
    availability: false,
    schedule: false,
    documents: false,
    travel: false,
    finance: false,
    accommodation: false,
  });

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadEvent();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  async function resolveMemberId(authUserId: string) {
    const { data: bm, error: bmError } = await supabase
      .from("band_members")
      .select("member_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (bmError) {
      console.log("band_members lookup error", bmError);
      setCurrentMemberId("");
      return;
    }

    setCurrentMemberId((bm?.member_id as string) ?? "");
  }

  // Auth gate: if not signed in, redirect to /auth (no sign-in buttons inside feature UI)
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log("auth getSession error", error);
        return;
      }

      const session = data?.session;
      if (!session?.user?.id) {
        router.replace("/auth");
        return;
      }

      if (!isMounted) return;
      await resolveMemberId(session.user.id);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUserId = session?.user?.id;

      if (!authUserId) {
        setCurrentMemberId("");
        router.replace("/auth");
        return;
      }

      resolveMemberId(authUserId);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function loadEvent() {
    if (!id) return;

    setLoading(true);

    const { count, error: lineupErr } = await supabase
      .from("event_members")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

    if (!lineupErr) setHasCustomLineup((count ?? 0) > 0);

    // Events (NON-finance fields only; finance is now in event_finance)
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        event_id,
        event_date,
        event_type,
        event_notes,
        event_status,

        promoter_contact_name,
        promoter_contact_phone,
        promoter_contact_email,

        travel_venue,
        loadin,
        soundcheck,
        doors,
        onstage,
        offstage,
        venue_curfew,
        depart_venue,
        schedule_notes,

        setlist_url,
        eventinfo_url,
        promo_material_url,
        doc_other_url,

        van_hire,
        fuel,

        departure_address,
        departure_postcode,

        venue_id
      `
      )
      .eq("event_id", id)
      .single();

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Venue fetch
    if (data) {
      if (data.venue_id) {
        const { data: venueData } = await supabase
          .from("venues")
          .select("*")
          .eq("venue_id", data.venue_id)
          .single();

        setEvent({ ...(data as any), venues: venueData ? [venueData] : [] } as EventRow);
      } else {
        setEvent(data as EventRow);
      }
    }

    // Finance fetch (RLS will block dep/crew, so treat errors as "no finance available")
    const { data: fin, error: finErr } = await supabase
      .from("event_finance")
      .select(
        `
        fee_type,
        paid_status,
        manual_playing_share_override,
        income_guarantee,
        income_fee,
        income_door,
        accommodation_cost,
        dep_cost,
        driver_cost,
        foh_eng_cost,
        other_costs,
        fee_notes,
        cost_notes
      `
      )
      .eq("event_id", id)
      .maybeSingle();

    if (finErr) {
      console.log("event_finance fetch error", finErr);
      setFinance(null);
    } else {
      setFinance((fin as any) ?? null);
    }

    // Accommodation fetch
    const { data: accData, error: accErr } = await supabase
      .from("accommodation")
      .select("*")
      .eq("event_id", id)
      .maybeSingle();

    if (accErr) {
      console.log("accommodation fetch error", accErr);
      setAccommodation(null);
    } else {
      setAccommodation((accData as AccommodationRow) ?? null);
    }

    setLoading(false);
  }

  if (loading || !event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  const venue = event.venues?.[0] || null;

  // ---------------------------------------------------------
  // TRAVEL HELPERS
  // ---------------------------------------------------------
  const venueDest =
    [venue?.address, venue?.city, venue?.postcode].filter(Boolean).join(", ") ||
    venue?.postcode ||
    "";

  const departureOrigin =
    [event.departure_address, event.departure_postcode].filter(Boolean).join(", ") ||
    event.departure_postcode ||
    "";

  function enc(s: string) {
    return encodeURIComponent(s.trim());
  }

  async function openUrl(url: string) {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error("cannot open");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open maps", "Check the address/postcode and try again.");
    }
  }

  function openToVenue(app: "apple" | "google" | "waze") {
    if (!venueDest) {
      Alert.alert("Venue location missing", "Add an address or postcode to the venue.");
      return;
    }

    const d = enc(venueDest);

    const url =
      app === "apple"
        ? `http://maps.apple.com/?daddr=${d}&dirflg=d`
        : app === "google"
        ? `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`
        : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  function openFromDeparture(app: "apple" | "google" | "waze") {
    if (!departureOrigin) {
      Alert.alert("Departure location not set", "Add a departure address or postcode.");
      return;
    }
    if (!venueDest) {
      Alert.alert("Venue location missing", "Add an address or postcode to the venue.");
      return;
    }

    const o = enc(departureOrigin);
    const d = enc(venueDest);

    const url =
      app === "apple"
        ? `http://maps.apple.com/?saddr=${o}&daddr=${d}&dirflg=d`
        : app === "google"
        ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`
        : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: venue?.event_venue_name || "Event Details",
          headerLeft: () => (
            <View style={styles.headerIconWrapper}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerIconWrapper}>
              <TouchableOpacity onPress={() => router.push("/")}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {/* EVENT SUMMARY */}
        <View style={styles.eventSummary}>
          <Text style={styles.eventSummaryDate}>{formatEventDate(event.event_date)}</Text>

          <Text style={styles.eventSummaryVenue}>
            {venue?.event_venue_name}
            {venue?.city ? `, ${venue.city}` : ""}
          </Text>

          <Text style={styles.eventSummaryMeta}>
            {event.event_type || "Event"}
            {event.event_status ? `, ${event.event_status}` : ""}
          </Text>
        </View>

        {/* ADMIN EDIT HUB (admin + admin mode) */}
        {canEdit ? (
          <View style={styles.adminPillRow}>
            <TouchableOpacity
              style={styles.adminPill}
              onPress={() => {
                if (!id) return;
                router.push(`/events/${id}/edit`);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.adminPillText}>Edit Hub</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* DETAILS */}
          <Section
            title="Details"
            icon="information-circle-outline"
            open={openSections.details}
            onPress={() => toggleSection("details")}
          >
            <DetailsSection
              eventId={event.event_id}
              event={event}
              venue={venue}
              venueId={event.venue_id ?? null}
            />
          </Section>

          {/* AVAILABILITY */}
          <Section
            title="Availability"
            icon="checkmark-circle-outline"
            open={openSections.availability}
            onPress={() => toggleSection("availability")}
          >
            <AvailabilitySection
              key={openSections.availability ? `open-${event.event_id}` : `closed-${event.event_id}`}
              eventId={event.event_id}
              memberId={currentMemberId}
              hasCustomLineup={hasCustomLineup}
              canEdit={canEdit}
            />
          </Section>

          {/* SCHEDULE */}
          <Section
            title="Schedule"
            icon="time-outline"
            open={openSections.schedule}
            onPress={() => toggleSection("schedule")}
          >
            <ScheduleSection
              eventId={event.event_id}
              travelVenue={event.travel_venue}
              loadin={event.loadin}
              soundcheck={event.soundcheck}
              doors={event.doors}
              onstage={event.onstage}
              offstage={event.offstage}
              venueCurfew={event.venue_curfew}
              departVenue={event.depart_venue}
              scheduleNotes={event.schedule_notes}
            />
          </Section>

          {/* DOCUMENTS */}
          <Section
            title="Documents"
            icon="document-text-outline"
            open={openSections.documents}
            onPress={() => toggleSection("documents")}
          >
            <DocumentsSection
              eventId={event.event_id}
              setlistUrl={event.setlist_url}
              eventinfoUrl={event.eventinfo_url}
              promoMaterialUrl={event.promo_material_url}
              docOtherUrl={event.doc_other_url}
            />
          </Section>

          {/* TRAVEL */}
          <Section
            title="Travel"
            icon="navigate-outline"
            open={openSections.travel}
            onPress={() => toggleSection("travel")}
          >
            <TravelSection
              eventId={event.event_id}
              venueAddress={venue?.address}
              venueCity={venue?.city}
              venuePostcode={venue?.postcode}
              departureAddress={event.departure_address}
              departurePostcode={event.departure_postcode}
            />
          </Section>

          {/* ACCOMMODATION (own section, not nested) */}
          {accommodation || canEdit ? (
            <Section
              title="Accommodation"
              icon="bed-outline"
              open={openSections.accommodation}
              onPress={() => toggleSection("accommodation")}
            >
              <AccommodationSection
                accommodation={accommodation}
                canEdit={canEdit}
                onPressEdit={() => {
                  if (!id) return;
                  router.push(`/events/${id}/accommodation`);
                }}
              />
            </Section>
          ) : null}

          {/* FINANCE */}
          {canEdit ? (
            <Section
              title="Finance"
              icon="cash-outline"
              open={openSections.finance}
              onPress={() => toggleSection("finance")}
            >
              <FinanceSection
                eventId={event.event_id}
                isAdmin={canEdit}
                shares={finance?.manual_playing_share_override ?? null}
                incomeGuarantee={finance?.income_guarantee ?? null}
                incomeDoor={finance?.income_door ?? null}
                feeType={finance?.fee_type ?? null}
                paidStatus={finance?.paid_status ?? null}
                vanHire={event.van_hire}
                fuel={event.fuel}
                accommodationCost={accommodation?.total_cost ?? finance?.accommodation_cost ?? null}
                accommodationCostSource={accommodation?.total_cost != null ? "accommodation" : "event"}
                depCost={finance?.dep_cost ?? null}
                driverCost={finance?.driver_cost ?? null}
                fohEngCost={finance?.foh_eng_cost ?? null}
                otherCosts={finance?.other_costs ?? null}
                feeNotes={finance?.fee_notes ?? null}
                costNotes={finance?.cost_notes ?? null}
              />
            </Section>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

/* ---------------------------------------------------------
   SECTION WRAPPER COMPONENT
--------------------------------------------------------- */
function Section({
  title,
  icon,
  open,
  onPress,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrapper} pointerEvents="box-none">
      <Pressable
        style={[styles.sectionHeader, { minHeight: 60, paddingVertical: 20 }]}
        onPress={onPress}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.sectionHeaderLeft} pointerEvents="none">
          <Ionicons name={icon} size={20} color="#fff" />
          <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
        <Text style={styles.sectionHeaderChevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */
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

  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  /* EVENT SUMMARY */
  eventSummary: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  eventSummaryDate: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.text,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  eventSummaryVenue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  eventSummaryMeta: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },

  adminPillRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "flex-end",
  },

  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.12)",
  },

  adminPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  /* SECTION HEADERS */
  sectionWrapper: {
    marginBottom: 16,
  },

  sectionHeader: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 64,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sectionHeaderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  sectionHeaderChevron: {
    color: "#fff",
    fontSize: 16,
  },

  sectionContent: {
    marginTop: 6,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    padding: 12,
  },

  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.10)",
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.primary,
  },
});