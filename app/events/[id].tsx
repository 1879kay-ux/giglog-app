import DetailsSection from '@/components/venue/DetailsSection';
import AvailabilitySection from '@/components/venue/AvailabilitySection';
import ScheduleSection from '@/components/venue/ScheduleSection';
import DocumentsSection from '@/components/venue/DocumentsSection';
import TravelSection from '@/components/venue/TravelSection';
import FinanceSection from '@/components/venue/FinanceSection';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

type VenueRow = {
  event_venue_name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  venue_contact_name?: string | null;
  venue_contact_phone?: string | null;
  venue_contact_email?: string | null;
  capacity?: number | null;
  capacity_notes?: string | null;
  venue_notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  stageplan_url: string | null;
  inputlist_url: string | null;
  monitorsends_url: string | null;
  eventinfo_url: string | null;
  income_fee: number | null;
  fee_type: string | null;
  paid_status: string | null;
  venue_id: string | null;
  availability_status?: string | null;
  van_hire?: number | null;
  fuel?: number | null;
  dep_cost?: number | null;
  driver_cost?: number | null;
  foh_eng_cost?: number | null;
  other_costs?: number | null;
  promo_material?: string | null;
  venues: VenueRow[] | null;
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['Details', 'Availability', 'Schedule', 'Documents', 'Travel', 'Finance'];

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues (
          event_venue_name,
          address,
          city,
          postcode,
          venue_contact_name,
          venue_contact_phone,
          venue_contact_email,
          capacity,
          capacity_notes,
          venue_notes,
          latitude,
          longitude
        )
      `)
      .eq('event_id', id)
      .single();

    if (!error && data) {
      setEvent(data as EventRow);
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

  const venue = event.venues?.[0];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return venue ? <DetailsSection venue={venue} eventType={event.event_type} /> : null;
      case 1:
        return <AvailabilitySection initialStatus={event.availability_status} />;
      case 2:
        return (
          <ScheduleSection
            callTime={event.call_time}
            loadinTime={event.loadin_time}
            soundcheckTime={event.soundcheck_time}
            onstage={event.onstage}
            offstage={event.offstage}
            venueCurfew={event.venue_curfew}
            busLeaveTime={event.bus_leave_time}
          />
        );
      case 3:
        return (
          <DocumentsSection
            setlistUrl={event.setlist_url}
            eventinfoUrl={event.eventinfo_url}
            promoMaterial={event.promo_material}
          />
        );
      case 4:
        return <TravelSection venue={venue} />;
      case 5:
        return (
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
        );
      default:
        return venue ? <DetailsSection venue={venue} eventType={event.event_type} /> : null;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: venue?.event_venue_name || 'Event Details',
          headerLeft: () => (
            <View style={Platform.select({ ios: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'relative', opacity: 1 }, default: { paddingLeft: 12 } })}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={Platform.select({ ios: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'relative', opacity: 1 }, default: { paddingRight: 12 } })}>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.tab, activeTab === index && styles.tabActive]}
              onPress={() => setActiveTab(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {renderTabContent()}
      </View>
    </>
  );
}

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
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#008080',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#008080',
  },
});