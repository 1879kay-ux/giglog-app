import InfoCard from '@/components/InfoCard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type VenueRow = {
  event_venue_name: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;
  capacity: number | null;
  venue_notes: string | null;
};

type EventRow = {
  event_date: string | null;
  event_type: string | null;
  event_status: string | null;
  promoter_contact_name: string | null;
  promoter_contact_phone: string | null;
  promoter_contact_email: string | null;
};

type DetailsSectionProps = {
  eventId: string;
  event: EventRow; // event is ALWAYS defined
  venue: VenueRow | null; // venue may be null
  venueId?: string | null; // optional, only if you want edit-venue shortcut
};

export default function DetailsSection({ eventId, event, venue, venueId }: DetailsSectionProps) {
  const router = useRouter();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const headerIconBtn = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={10} style={styles.headerBtn}>
      <Ionicons name="create-outline" size={18} color="#008080" />
    </Pressable>
  );

  const editEventDetails = headerIconBtn(() => router.push(`/events/${eventId}/edit/details`));

  const editVenueDetails = venueId
  ? headerIconBtn(() =>
      router.push({
        pathname: '/venue/[id]/edit',
        params: { id: venueId },
      })
    )
  : null; 

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Event Overview */}
        <InfoCard title="Event Overview" right={editEventDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(event.event_date)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Event Name</Text>
            <Text style={styles.value}>{venue?.event_venue_name || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>City</Text>
            <Text style={styles.value}>{venue?.city || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{event.event_status || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{event.event_type || '—'}</Text>
          </View>
        </InfoCard>

        {/* Venue Details */}
        <InfoCard title="Venue Details" right={editVenueDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>Venue Name</Text>
            <Text style={styles.value}>{venue?.event_venue_name || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>
              {venue?.address || '—'}
              {venue?.postcode ? ` ${venue.postcode}` : ''}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Contact Name</Text>
            <Text style={styles.value}>{venue?.venue_contact_name || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Contact Phone</Text>
            <Text style={styles.value}>{venue?.venue_contact_phone || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Contact Email</Text>
            <Text style={styles.value}>{venue?.venue_contact_email || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Capacity</Text>
            <Text style={styles.value}>{venue?.capacity ?? '—'}</Text>
          </View>

          {venue?.venue_notes ? (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>Venue Notes</Text>
              <Text style={styles.value}>{venue.venue_notes}</Text>
            </View>
          ) : null}
        </InfoCard>

        {/* Promoter Contact */}
        <InfoCard title="Promoter Contact" right={editEventDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{event.promoter_contact_name || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{event.promoter_contact_phone || '—'}</Text>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{event.promoter_contact_email || '—'}</Text>
          </View>
        </InfoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E9F6F6',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 110,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
});
