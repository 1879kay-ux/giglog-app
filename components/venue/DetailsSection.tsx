import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type VenueRow = {
  event_venue_name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  venue_contact_name?: string | null;
  venue_contact_phone?: string | null;
  venue_contact_email?: string | null;
  capacity?: number | null;
  capacity_notes?: string | null;
  venue_notes?: string | null;
};

type DetailsSectionProps = {
  venue: VenueRow;
  eventType?: string | null;
};

export default function DetailsSection({ venue, eventType }: DetailsSectionProps) {
  return (
    <ScrollView style={styles.container}>
      <InfoCard title="Event Type">
        <Text style={styles.value}>{eventType || 'Not specified'}</Text>
      </InfoCard>

      <InfoCard title="Venue">
        <Text style={styles.value}>{venue.event_venue_name}</Text>
        {venue.address && <Text style={styles.value}>{venue.address}</Text>}
        {venue.city && <Text style={styles.value}>{venue.city}</Text>}
        {venue.postcode && <Text style={styles.value}>{venue.postcode}</Text>}
      </InfoCard>

      <InfoCard title="Venue Contact">
        <Text style={styles.value}>
          {venue.venue_contact_name || '—'}
        </Text>
        {venue.venue_contact_phone && (
          <Text style={styles.value}>{venue.venue_contact_phone}</Text>
        )}
        {venue.venue_contact_email && (
          <Text style={styles.value}>{venue.venue_contact_email}</Text>
        )}
      </InfoCard>

      <InfoCard title="Capacity">
        <Text style={styles.value}>
          {venue.capacity || '—'} {venue.capacity_notes && `(${venue.capacity_notes})`}
        </Text>
      </InfoCard>

      <InfoCard title="Venue Notes">
        <Text style={styles.value}>
          {venue.venue_notes || 'No notes'}
        </Text>
      </InfoCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
});
