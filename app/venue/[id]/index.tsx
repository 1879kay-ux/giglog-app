import InfoCard from '@/components/InfoCard';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VenueDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenue();
  }, [id]);

  async function loadVenue() {
    const { data } = await supabase
      .from('venues')
      .select('*')
      .eq('venue_id', id)
      .single();

    setVenue(data);
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
    <>
      <Stack.Screen
        options={{
          title: 'Venue Details',
          headerStyle: { backgroundColor: '#008080' },
          headerTitleStyle: { color: '#fff', fontWeight: '700' },
          headerTitleAlign: 'center',

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

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{venue.event_venue_name}</Text>

        <InfoCard title="Address">
          <Text style={styles.cardText}>{venue.address}</Text>
          <Text style={styles.cardText}>{venue.city}</Text>
          <Text style={styles.cardText}>{venue.postcode}</Text>

          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </InfoCard>

        <InfoCard title="Capacity">
          <Text style={styles.cardText}>{venue.capacity}</Text>
        </InfoCard>

        <InfoCard title="Capacity Notes">
          <Text style={styles.cardText}>
            {venue.capacity_notes || 'No capacity notes provided'}
          </Text>
        </InfoCard>

        <InfoCard title="Venue Contact">
          <Text style={styles.cardText}>Name: {venue.venue_contact_name}</Text>
          <Text style={styles.cardText}>Phone: {venue.venue_contact_phone}</Text>
          <Text style={styles.cardText}>Email: {venue.venue_contact_email}</Text>
        </InfoCard>

        <InfoCard title="Venue Notes">
          <Text style={styles.cardText}>
            {venue.venue_notes || 'No venue notes provided'}
          </Text>
        </InfoCard>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },

  cardText: {
    fontSize: 16,
    marginBottom: 4,
  },

  mapButton: {
    marginTop: 12,
    backgroundColor: '#008080',
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