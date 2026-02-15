import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VenueDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenue();
  }, [id]);

  async function loadVenue() {
    setLoading(true);

    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('venue_id', id)
      .single();

    if (!error) setVenue(data);

    setLoading(false);
  }

  function openMap() {
    if (!venue) return;

    const query = encodeURIComponent(
      `${venue.event_venue_name}, ${venue.address}, ${venue.city}, ${venue.postcode}`
    );

    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  if (loading || !venue) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Title */}
      <Text style={styles.title}>{venue.event_venue_name}</Text>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.text}>{venue.address}</Text>
        <Text style={styles.text}>{venue.city}</Text>
        <Text style={styles.text}>{venue.postcode}</Text>

        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Capacity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capacity</Text>
        <Text style={styles.text}>{venue.capacity}</Text>
      </View>

      {/* Capacity Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capacity Notes</Text>
        <Text style={styles.text}>
          {venue.capacity_notes || 'No capacity notes provided'}
        </Text>
      </View>

      {/* Venue Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue Contact</Text>
        <Text style={styles.text}>Name: {venue.venue_contact_name}</Text>
        <Text style={styles.text}>Phone: {venue.venue_contact_phone}</Text>
        <Text style={styles.text}>Email: {venue.venue_contact_email}</Text>
      </View>

      {/* Venue Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue Notes</Text>
        <Text style={styles.text}>
          {venue.venue_notes || 'No venue notes provided'}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },

  title: { fontSize: 26, fontWeight: '700', marginBottom: 20 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },

  text: { fontSize: 16, marginBottom: 4 },

  mapButton: {
    marginTop: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});