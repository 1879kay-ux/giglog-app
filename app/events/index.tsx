import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

  const [search, setSearch] = useState('');

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

  const filteredEvents = events.filter((item) => {
    const venue = item.venues?.[0];
    const venueName = venue?.event_venue_name ?? '';
    const city = venue?.city ?? '';
    const status = item.event_status ?? '';

    const haystack = `${venueName} ${city} ${item.event_date} ${status}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

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
            <View
              style={Platform.select({
                ios: {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                default: { paddingLeft: 12 },
              })}
            >
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View
              style={Platform.select({
                ios: {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                default: { paddingRight: 12 },
              })}
            >
              <TouchableOpacity onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>

        {/* ⭐ SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venue = item.venues?.[0];
            const venueName = venue?.event_venue_name ?? 'Unknown venue';
            const city = venue?.city ?? 'Unknown city';
            const status = item.event_status ?? 'Unknown';

            return (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() =>
                  router.push({ pathname: '/events/[id]', params: { id: item.event_id } })
                }
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

  /* ⭐ SEARCH BAR */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#008080',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
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