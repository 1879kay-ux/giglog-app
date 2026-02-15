import InfoCard from '@/components/InfoCard';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

type VenueRow = {
  event_venue_name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
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
  venues: VenueRow[] | null;
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

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
          postcode
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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Event Details',
          headerLeft: () => (
            <View style={{ paddingLeft: 12 }}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={{ paddingRight: 12 }}>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{venue?.event_venue_name ?? 'Event Details'}</Text>

        <InfoCard title="Date">
          <Text style={styles.value}>{event.event_date}</Text>
        </InfoCard>

        <InfoCard title="Status">
          <Text style={styles.value}>{event.event_status ?? 'Unknown'}</Text>
        </InfoCard>

        <InfoCard title="Venue">
          <Text style={styles.value}>{venue?.event_venue_name ?? 'Unknown venue'}</Text>
          {venue?.city && <Text style={styles.value}>{venue.city}</Text>}
          {venue?.address && <Text style={styles.value}>{venue.address}</Text>}
          {venue?.postcode && <Text style={styles.value}>{venue.postcode}</Text>}
        </InfoCard>

        <InfoCard title="Event Type">
          <Text style={styles.value}>{event.event_type ?? '—'}</Text>
        </InfoCard>

        <InfoCard title="Notes">
          <Text style={styles.value}>{event.event_notes ?? '—'}</Text>
        </InfoCard>

        <InfoCard title="Promoter Contact">
          <Text style={styles.value}>{event.promoter_contact_name ?? '—'}</Text>
          {event.promoter_contact_phone && <Text style={styles.value}>{event.promoter_contact_phone}</Text>}
          {event.promoter_contact_email && <Text style={styles.value}>{event.promoter_contact_email}</Text>}
        </InfoCard>

        <InfoCard title="Times">
          <Text style={styles.value}>Call: {event.call_time ?? '—'}</Text>
          <Text style={styles.value}>Load-in: {event.loadin_time ?? '—'}</Text>
          <Text style={styles.value}>Soundcheck: {event.soundcheck_time ?? '—'}</Text>
          <Text style={styles.value}>Onstage: {event.onstage ?? '—'}</Text>
          <Text style={styles.value}>Offstage: {event.offstage ?? '—'}</Text>
          <Text style={styles.value}>Curfew: {event.venue_curfew ?? '—'}</Text>
          <Text style={styles.value}>Bus Leaves: {event.bus_leave_time ?? '—'}</Text>
        </InfoCard>

        <InfoCard title="Documents">
          <Text style={styles.value}>Setlist: {event.setlist_url ?? '—'}</Text>
          <Text style={styles.value}>Stage Plan: {event.stageplan_url ?? '—'}</Text>
          <Text style={styles.value}>Input List: {event.inputlist_url ?? '—'}</Text>
          <Text style={styles.value}>Monitor Sends: {event.monitorsends_url ?? '—'}</Text>
          <Text style={styles.value}>Event Info: {event.eventinfo_url ?? '—'}</Text>
        </InfoCard>

        <InfoCard title="Financials">
          <Text style={styles.value}>Fee: {event.income_fee ?? '—'}</Text>
          <Text style={styles.value}>Fee Type: {event.fee_type ?? '—'}</Text>
          <Text style={styles.value}>Paid Status: {event.paid_status ?? '—'}</Text>
        </InfoCard>
      </ScrollView>
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
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  value: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
});