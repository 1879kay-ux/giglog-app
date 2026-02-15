import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

type VenueRow = {
  event_venue_name: string;
  city: string;
};

type EventRow = {
  event_id: string;
  event_date: string;
  event_status: string | null;
  venues: VenueRow[] | null;
};

export default function EventsListScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select(`
        event_id,
        event_date,
        event_status,
        venues (
          event_venue_name,
          city
        )
      `)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as EventRow[]);
    }

    setLoading(false);
  }

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
          title: 'Events',
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
      <View style={styles.container}>
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venue = item.venues?.[0];
            const venueName = venue?.event_venue_name ?? 'Unknown venue';
            const city = venue?.city ?? 'Unknown city';
            const status = item.event_status ?? 'Unknown';

            return (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.event_id } })}
              >
                <Text style={styles.eventDate}>{item.event_date}</Text>
                <Text style={styles.eventVenue}>{venueName}</Text>
                <Text style={styles.eventCity}>{city}</Text>
                <Text style={styles.eventStatus}>Status: {status}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  eventItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  eventDate: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventCity: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  eventStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
});