import DetailsSection from '@/components/venue/DetailsSection';
import DocumentsSection from '@/components/venue/DocumentsSection';
import FinanceSection from '@/components/venue/FinanceSection';
import ScheduleSection from '@/components/venue/ScheduleSection';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

/* ---------------------------------------------------------
   ENABLE LAYOUT ANIMATION ON ANDROID
--------------------------------------------------------- */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ---------------------------------------------------------
   SUPABASE
--------------------------------------------------------- */
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const isSmallScreen = Dimensions.get('window').height < 700;

/* ---------------------------------------------------------
   DATE FORMATTER
--------------------------------------------------------- */
function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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

type EventRow = {
  event_id: string;
  event_date: string;
  event_type: string | null;
  event_notes: string | null;
  event_status: string | null;

  promoter_contact_name: string | null;
  promoter_contact_phone: string | null;
  promoter_contact_email: string | null;

  call_time: string | null;
  loadin_time: string | null;
  soundcheck_time: string | null;
  onstage: string | null;
  offstage: string | null;
  venue_curfew: string | null;
  bus_leave_time: string | null;

  setlist_url: string | null;
  eventinfo_url: string | null;

  income_fee: number | null;
  fee_type: string | null;
  paid_status: string | null;

  van_hire: number | null;
  fuel: number | null;
  dep_cost: number | null;
  driver_cost: number | null;
  foh_eng_cost: number | null;
  other_costs: number | null;

  venue_id: string | null;
  venues: VenueRow[] | null;
};

/* ---------------------------------------------------------
   SECTION KEYS
--------------------------------------------------------- */
type SectionKey =
  | 'details'
  | 'availability'
  | 'schedule'
  | 'documents'
  | 'travel'
  | 'finance';

/* ---------------------------------------------------------
   AVAILABILITY SECTION (OPTION C + COLOUR CODING)
--------------------------------------------------------- */
function AvailabilitySection({ initialStatus }: { initialStatus: string | null }) {
  const [status, setStatus] = useState(initialStatus || '');

  type IoniconName = keyof typeof Ionicons.glyphMap;

  const options: { key: string; icon: IoniconName; color: string }[] = [
    { key: 'Available', icon: 'checkmark-circle-outline', color: '#2ECC71' }, // green
    { key: 'Provisional', icon: 'help-circle-outline', color: '#F1C40F' },   // amber
    { key: 'Unavailable', icon: 'close-circle-outline', color: '#E74C3C' },  // red
  ];

  return (
    <View style={{ paddingVertical: 4 }}>
      <Text style={styles.heading}>Your Availability</Text>

      <View style={styles.avRow}>
        {options.map(opt => {
          const selected = status === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.avChip,
                selected && {
                  backgroundColor: opt.color,
                  borderColor: opt.color,
                },
              ]}
              onPress={() => setStatus(opt.key)}
            >
              <Ionicons
                name={opt.icon}
                size={28}
                color={selected ? '#fff' : '#008080'}
              />
              <Text
                style={[
                  styles.avLabel,
                  selected && { color: '#fff' },
                ]}
              >
                {opt.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      <Text style={styles.heading}>Band Availability</Text>
      <Text style={styles.bandNote}>Data synced from band schedule.</Text>

      <View style={styles.bandRow}>
        <Text style={styles.bandName}>Band Members</Text>
        <Text style={styles.bandStatus}>—</Text>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------
   MAIN SCREEN
--------------------------------------------------------- */
export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    details: false,
    availability: false,
    schedule: false,
    documents: false,
    travel: false,
    finance: false,
  });

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', id)
      .single();

    if (data) {
      if (data.venue_id) {
        const { data: venueData } = await supabase
          .from('venues')
          .select('*')
          .eq('venue_id', data.venue_id)
          .single();

        setEvent({ ...data, venues: venueData ? [venueData] : [] } as EventRow);
      } else {
        setEvent(data as EventRow);
      }
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

  return (
    <>
      <Stack.Screen
        options={{
          title: venue?.event_venue_name || 'Event Details',
          headerLeft: () => (
            <View style={styles.headerIconWrapper}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerIconWrapper}>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {/* EVENT SUMMARY */}
        <View style={styles.eventSummary}>
          <Text style={styles.eventSummaryDate}>
            {formatEventDate(event.event_date)}
          </Text>
          <Text style={styles.eventSummaryType}>
            {event.event_type || 'Event'} • {event.event_status || 'Status'}
          </Text>
          <Text style={styles.eventSummaryVenue}>
            {venue?.event_venue_name}
            {venue?.city ? `, ${venue.city}` : ''}
          </Text>
        </View>

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
            onPress={() => toggleSection('details')}
          >
            <DetailsSection event={event} venue={venue} />
          </Section>

          {/* AVAILABILITY */}
          <Section
            title="Availability"
            icon="checkmark-circle-outline"
            open={openSections.availability}
            onPress={() => toggleSection('availability')}
          >
            <AvailabilitySection initialStatus={event.event_status} />
          </Section>

          {/* SCHEDULE */}
          <Section
            title="Schedule"
            icon="time-outline"
            open={openSections.schedule}
            onPress={() => toggleSection('schedule')}
          >
            <ScheduleSection
              callTime={event.call_time}
              loadinTime={event.loadin_time}
              soundcheckTime={event.soundcheck_time}
              onstage={event.onstage}
              offstage={event.offstage}
              venueCurfew={event.venue_curfew}
              busLeaveTime={event.bus_leave_time}
            />
          </Section>

          {/* DOCUMENTS */}
          <Section
            title="Documents"
            icon="document-text-outline"
            open={openSections.documents}
            onPress={() => toggleSection('documents')}
          >
            <DocumentsSection
              setlistUrl={event.setlist_url}
              eventinfoUrl={event.eventinfo_url}
              promoMaterial={null}
            />
          </Section>

          {/* TRAVEL */}
          <Section
            title="Travel"
            icon="navigate-outline"
            open={openSections.travel}
            onPress={() => toggleSection('travel')}
          >
            <View>
              <View style={styles.travelRow}>
                <Text style={styles.travelLabel}>Homebase → Venue</Text>
                <View style={styles.travelButtonRow}>
                  <TravelButton label="Apple" />
                  <TravelButton label="Google" />
                  <TravelButton label="Waze" />
                </View>
              </View>

              <View style={styles.travelRow}>
                <Text style={styles.travelLabel}>Current Location → Venue</Text>
                <View style={styles.travelButtonRow}>
                  <TravelButton label="Apple" />
                  <TravelButton label="Google" />
                  <TravelButton label="Waze" />
                </View>
              </View>

              <View style={styles.travelLocationBox}>
                <Text style={styles.travelLocationTitle}>Venue Location</Text>
                <Text style={styles.travelLocationText}>{venue?.address}</Text>
                <Text style={styles.travelLocationText}>
                  {venue?.city} {venue?.postcode}
                </Text>
              </View>
            </View>
          </Section>

          {/* FINANCE */}
          <Section
            title="Finance"
            icon="cash-outline"
            open={openSections.finance}
            onPress={() => toggleSection('finance')}
          >
            <FinanceSection
              incomeFee={event.income_fee}
              feeType={event.fee_type}
              paidStatus={event.paid_status}
              vanHire={event.van_hire}
              fuel={event.fuel}
              depCost={event.dep_cost}
              driverCost={event.driver_cost}
              fohEngCost={event.foh_eng_cost}
              otherCosts={event.other_costs}
            />
          </Section>
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
    <View style={styles.sectionWrapper}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon} size={18} color="#fff" />
          <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
        <Text style={styles.sectionHeaderChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

/* ---------------------------------------------------------
   TRAVEL BUTTON
--------------------------------------------------------- */
function TravelButton({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.travelButton}>
      <Text style={styles.travelButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* EVENT SUMMARY */
  eventSummary: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 12,
  },
  eventSummaryDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  eventSummaryType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  eventSummaryVenue: {
    fontSize: 14,
    color: '#555',
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
    marginBottom: 12,
  },
  sectionHeader: {
    backgroundColor: '#009999',
    paddingVertical: isSmallScreen ? 6 : 8,
    paddingHorizontal: isSmallScreen ? 12 : 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 8 : 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
  },
  sectionHeaderChevron: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 15,
  },

  sectionContent: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },

  /* AVAILABILITY */
  heading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  avRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avChip: {
    width: '30%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#008080',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  avLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#008080',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  bandNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  bandName: {
    fontSize: 14,
    color: '#333',
  },
  bandStatus: {
    fontSize: 14,
    color: '#333',
  },

  /* TRAVEL */
  travelRow: {
    marginBottom: 16,
  },
  travelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  travelButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelButton: {
    backgroundColor: '#008080',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 6,
  },
  travelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  travelLocationBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f7f7f7',
    borderRadius: 6,
  },
  travelLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  travelLocationText: {
    fontSize: 13,
    color: '#555',
  },
});