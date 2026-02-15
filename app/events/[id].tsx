import { createClient } from '@supabase/supabase-js';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Event Details</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{event.event_date}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{event.event_status ?? 'Unknown'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Venue</Text>
        <Text style={styles.value}>{venue?.event_venue_name ?? 'Unknown venue'}</Text>
        <Text style={styles.value}>{venue?.city ?? ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Event Type</Text>
        <Text style={styles.value}>{event.event_type ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <Text style={styles.value}>{event.event_notes ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Promoter Contact</Text>
        <Text style={styles.value}>{event.promoter_contact_name ?? '—'}</Text>
        <Text style={styles.value}>{event.promoter_contact_phone ?? ''}</Text>
        <Text style={styles.value}>{event.promoter_contact_email ?? ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Times</Text>
        <Text style={styles.value}>Call: {event.call_time ?? '—'}</Text>
        <Text style={styles.value}>Load-in: {event.loadin_time ?? '—'}</Text>
        <Text style={styles.value}>Soundcheck: {event.soundcheck_time ?? '—'}</Text>
        <Text style={styles.value}>Onstage: {event.onstage ?? '—'}</Text>
        <Text style={styles.value}>Offstage: {event.offstage ?? '—'}</Text>
        <Text style={styles.value}>Curfew: {event.venue_curfew ?? '—'}</Text>
        <Text style={styles.value}>Bus Leaves: {event.bus_leave_time ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Documents</Text>
        <Text style={styles.value}>Setlist: {event.setlist_url ?? '—'}</Text>
        <Text style={styles.value}>Stage Plan: {event.stageplan_url ?? '—'}</Text>
        <Text style={styles.value}>Input List: {event.inputlist_url ?? '—'}</Text>
        <Text style={styles.value}>Monitor Sends: {event.monitorsends_url ?? '—'}</Text>
        <Text style={styles.value}>Event Info: {event.eventinfo_url ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Financials</Text>
        <Text style={styles.value}>Fee: {event.income_fee ?? '—'}</Text>
        <Text style={styles.value}>Fee Type: {event.fee_type ?? '—'}</Text>
        <Text style={styles.value}>Paid Status: {event.paid_status ?? '—'}</Text>
      </View>
    </ScrollView>
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
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    marginBottom: 2,
  },
});