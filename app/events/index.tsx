import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import ActionButton from '@/components/ui/ActionButton';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

// ...




type VenueRow = {
  event_venue_name: string;
  city: string;
};

type EventRow = {
  event_id: string;
  event_date: string;
  event_status: string | null;
  event_type: string | null;
  venues: VenueRow | null;   // ⭐ SINGLE OBJECT, NOT ARRAY
};

export default function EventsListScreen() {
  const router = useRouter();
  const { isAdmin } = useCurrentMember();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useFocusEffect(
  useCallback(() => {
    loadEvents();
  }, [])
);


  async function loadEvents() {
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select(`
        event_id,
        event_date,
        event_status,
        event_type,
        venues:venue_id (
          event_venue_name,
          city
        )
      `)
      .order('event_date', { ascending: true });

    if (!error && data) {
  setEvents(data as unknown as EventRow[]);
}

    setLoading(false);
  }

  // -----------------------------
  // DATE FORMATTER (WITH WEEKDAY)
  // -----------------------------
  function formatDisplayDate(dateString: string) {
    const date = new Date(dateString);

    const formatted = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);

    return formatted.replace(',', '').toUpperCase();
  }

  const filteredEvents = events.filter((item) => {
    const venue = item.venues;
    const venueName = venue?.event_venue_name ?? '';
    const city = venue?.city ?? '';
    const status = item.event_status ?? '';
    const type = item.event_type ?? '';

    const haystack = `${venueName} ${city} ${item.event_date} ${status} ${type}`.toLowerCase();
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
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#008080' },
          headerTitleStyle: { color: '#fff', fontWeight: '700', fontSize: 18 },
          headerTintColor: '#fff',

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
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
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
              <TouchableOpacity
                onPress={() => router.push('/')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>

        {/* SEARCH BAR */}
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

        {/* ADD EVENT BUTTON (admin only) */}
{isAdmin ? (
  <ActionButton
    label="Add Event"
    icon="add-circle-outline"
    onPress={() => router.push("/events/add")}
  />
) : null}


        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.event_id}
          renderItem={({ item }) => {
            const venue = item.venues;
            const venueName = venue?.event_venue_name ?? 'Unknown venue';
            const city = venue?.city ?? 'Unknown city';
            const status = item.event_status ?? 'Unknown';
            const type = item.event_type ?? 'Event';

            return (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() =>
                  router.push({ pathname: '/events/[id]', params: { id: item.event_id } })
                }
              >
                <View style={styles.eventRow}>
                  <View style={{ flex: 1 }}>

                    {/* DATE */}
                    <Text style={styles.eventDate}>
                      {formatDisplayDate(item.event_date)}
                    </Text>

                    {/* VENUE + CITY */}
                    <Text style={styles.eventVenue}>
                      {venueName}, {city}
                    </Text>

                    {/* TYPE + STATUS */}
                    <Text style={styles.eventMeta}>
                      {type}, {status}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward-outline" size={24} color="#333" />
                </View>
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

  // SEARCH
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#008080',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },

  // ADD EVENT BUTTON
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4FB3B3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  addEventButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // EVENT ROW
  eventItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // DATE
  eventDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // VENUE + CITY
  eventVenue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },

  // TYPE + STATUS
  eventMeta: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
});