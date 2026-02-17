import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createClient } from '@supabase/supabase-js';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  venue_id: string;
  event_venue_name: string;
  city: string;
};

export default function AddEventScreen() {
  const router = useRouter();

  const [eventType, setEventType] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | null>(null);

  const [venueSearch, setVenueSearch] = useState('');
  const [allVenues, setAllVenues] = useState<VenueRow[]>([]);
  const [venueResults, setVenueResults] = useState<VenueRow[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  const eventTypes = ['Gig', 'Rehearsal', 'Recording', 'Promo', 'Meeting', 'Other'];

  const statusColors: Record<string, string> = {
    Confirmed: '#2e7d32',
    Provisional: '#f9a825',
    Cancelled: '#c62828',
  };

  // ⭐ RETURN FROM ADD VENUE
  const { newVenueName, newVenueCity } = useLocalSearchParams();

  useEffect(() => {
    if (newVenueName && newVenueCity) {
      const formatted = `${newVenueName} (${newVenueCity})`;
      setVenueSearch(formatted);
    }
  }, [newVenueName, newVenueCity]);

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    const { data } = await supabase
      .from('venues')
      .select('*')
      .order('event_venue_name', { ascending: true });

    if (data) {
      setAllVenues(data);
      setVenueResults(data);
    }
  }

  function handleVenueSearch(text: string) {
    setVenueSearch(text);

    const q = text.trim().toLowerCase();

    if (q === '') {
      setVenueResults(allVenues);
      setNoMatch(false);
      return;
    }

    const filtered = allVenues.filter(v =>
      `${v.event_venue_name} (${v.city})`.toLowerCase().includes(q)
    );

    setVenueResults(filtered);
    setNoMatch(filtered.length === 0);
  }

  function clearVenueSearch() {
    setVenueSearch('');
    setVenueResults(allVenues);
    setSelectedVenue(null);
    setNoMatch(false);
  }

  async function saveEvent() {
    if (!selectedVenue) return Alert.alert('Missing Information', 'Choose a venue.');
    if (!eventDate) return Alert.alert('Missing Information', 'Choose a date.');
    if (!eventType) return Alert.alert('Missing Information', 'Select an event type.');
    if (!eventStatus) return Alert.alert('Missing Information', 'Select a status.');

    const payload = {
      event_type: eventType,
      event_date: eventDate,
      event_status: eventStatus,
      venue_id: selectedVenue.venue_id,
    };

    const { error } = await supabase.from('events').insert(payload);

    if (error) {
      Alert.alert('Error', 'Could not save event.');
      return;
    }

    router.back();
  }

  function formatDisplayDate(value: string) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  function onNativeDateChange(event: any, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      const iso = selectedDate.toISOString().split('T')[0];
      setEventDate(iso);
    }
    setShowPicker(false);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Event',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#008080' },
          headerTitleStyle: { color: '#fff', fontWeight: '700' },
          headerTintColor: '#fff',
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

          {/* VENUE FIRST */}
          <Text style={styles.label}>
            Venue <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#666" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venue..."
              value={venueSearch}
              onChangeText={handleVenueSearch}
            />
            {venueSearch.length > 0 && (
              <TouchableOpacity onPress={clearVenueSearch}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {noMatch && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#c62828', fontWeight: '600' }}>
                No venues match "{venueSearch}"
              </Text>

              <TouchableOpacity
                style={styles.addVenueButton}
                onPress={() => router.push('/(modals)/add')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.addVenueButtonText}>Add New Venue</Text>
              </TouchableOpacity>
            </View>
          )}

          {venueSearch.length === 0 && (
            <View style={styles.venueList}>
              <FlatList
                nestedScrollEnabled={true}
                data={allVenues}
                keyExtractor={item => item.venue_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.venueItem}
                    onPress={() => {
                      setSelectedVenue(item);
                      setVenueSearch(`${item.event_venue_name} (${item.city})`);
                    }}
                  >
                    <Text style={styles.venueName}>{item.event_venue_name}</Text>
                    <Text style={styles.venueCity}>{item.city}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {venueSearch.length > 0 && venueResults.length > 0 && (
            <View style={styles.venueList}>
              <FlatList
                nestedScrollEnabled={true}
                data={venueResults}
                keyExtractor={item => item.venue_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.venueItem}
                    onPress={() => {
                      setSelectedVenue(item);
                      setVenueSearch(`${item.event_venue_name} (${item.city})`);
                    }}
                  >
                    <Text style={styles.venueName}>{item.event_venue_name}</Text>
                    <Text style={styles.venueCity}>{item.city}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* DATE SECOND */}
          <Text style={styles.label}>
            Event Date <Text style={styles.required}>*</Text>
          </Text>

          {Platform.OS === 'web' ? (
            <View style={styles.dateRow}>
              {/* @ts-ignore */}
              <input
                type="date"
                value={eventDate}
                onChange={(e: any) => setEventDate(e.target.value)}
                style={{
                  width: 150,
                  padding: 10,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #008080',
                }}
              />
            </View>
          ) : (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setShowPicker(true)}
              >
                <Text style={{ fontSize: 16 }}>
                  {eventDate ? formatDisplayDate(eventDate) : 'Select date'}
                </Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={eventDate ? new Date(eventDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={onNativeDateChange}
                />
              )}
            </View>
          )}

          {/* EVENT TYPE THIRD */}
          <Text style={styles.label}>
            Event Type <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.chipRow}>
            {eventTypes.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, eventType === type && styles.chipSelected]}
                onPress={() => setEventType(type)}
              >
                <Text style={[styles.chipText, eventType === type && styles.chipTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* STATUS FOURTH */}
          <Text style={styles.label}>
            Status <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.chipRow}>
            {['Confirmed', 'Provisional', 'Cancelled'].map(status => {
              const selected = eventStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: statusColors[status] },
                  ]}
                  onPress={() => setEventStatus(status)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SAVE */}
          <TouchableOpacity style={styles.saveButton} onPress={saveEvent}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Event</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 6,
  },

  required: {
    color: 'red',
    fontWeight: '900',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },

  chipSelected: {
    backgroundColor: '#008080',
  },

  chipText: {
    color: '#333',
    fontWeight: '600',
  },

  chipTextSelected: {
    color: '#fff',
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },

  dateBox: {
    width: 150,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#008080',
    borderRadius: 8,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#008080',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  venueList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 220,
    backgroundColor: '#fff',
  },

  venueItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  venueName: {
    fontSize: 16,
    fontWeight: '600',
  },

  venueCity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  addVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008080',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },

  addVenueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008080',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 40,
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});