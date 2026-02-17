import ActionButton from '@/components/ui/ActionButton';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type VenueRow = {
  venue_id: string;
  event_venue_name: string | null;
  city: string | null;
  address: string | null;
  postcode: string | null;

  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;

  venue_notes: string | null;
  capacity: number | null;
  capacity_notes: string | null;
  is_active: boolean | null;
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value.trim() ? value : '—'}</Text>
    </View>
  );
}

export default function VenueDetailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadVenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadVenue() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('venues')
      .select(
        'venue_id,event_venue_name,city,address,postcode,venue_contact_name,venue_contact_phone,venue_contact_email,venue_notes,capacity,capacity_notes,is_active'
      )
      .eq('venue_id', id)
      .single();

    if (!error) setVenue(data as VenueRow);
    setLoading(false);
  }

  const openGoogleMaps = async () => {
    if (!venue) return;

    const queryParts = [
      venue.event_venue_name,
      venue.address,
      venue.city,
      venue.postcode,
    ].filter(Boolean);

    const query = encodeURIComponent(queryParts.join(', '));
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#333' }}>Venue not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Venue Details',
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
        {/* VENUE INFO BLOCK */}
        <View style={styles.summary}>
          <Text style={styles.title}>{venue.event_venue_name ?? 'Venue'}</Text>
          <Text style={styles.subtitle}>
            {(venue.city ?? '—')}
            {venue.postcode ? `, ${venue.postcode}` : ''}
          </Text>
        </View>

        {/* EDIT VENUE BUTTON */}
        <ActionButton
          label="Edit Venue"
          icon="create-outline"
          onPress={() => router.push(`/venue/${venue.venue_id}/edit`)}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Field label="Address" value={venue.address} />
          <Field label="Postcode" value={venue.postcode} />

          {/* GOOGLE MAPS BUTTON */}
          <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.mapButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>

          <Field label="Contact" value={venue.venue_contact_name} />
          <Field label="Phone" value={venue.venue_contact_phone} />
          <Field label="Email" value={venue.venue_contact_email} />
          <Field label="Capacity" value={venue.capacity != null ? String(venue.capacity) : null} />
          <Field label="Capacity notes" value={venue.capacity_notes} />
          <Field label="Notes" value={venue.venue_notes} />
          <Field
            label="Active"
            value={venue.is_active == null ? null : venue.is_active ? 'Yes' : 'No'}
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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

  summary: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },

  content: {
    padding: 16,
    paddingBottom: 28,
  },

  field: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: '#111',
  },

  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#008080',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
