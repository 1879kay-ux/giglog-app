import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type ScheduleSectionProps = {
  callTime?: string | null;
  loadinTime?: string | null;
  soundcheckTime?: string | null;
  doors?: string | null;
  onstage?: string | null;
  offstage?: string | null;
  venueCurfew?: string | null;

  travelVenue?: string | null;   // renamed from call_time
  departVenue?: string | null;   // renamed from bus_leave_time

  scheduleNotes?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return null;

  // "HH:MM:SS" or "HH:MM"
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(value).trim();
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  return `${hh}:${mm}`;
}

export default function ScheduleSection({
  callTime,
  loadinTime,
  soundcheckTime,
  doors,
  onstage,
  offstage,
  venueCurfew,
  travelVenue,
  departVenue,
  scheduleNotes,
}: ScheduleSectionProps) {
  const timeFields = [
    { label: 'Travel to Venue', value: travelVenue ?? callTime }, // supports old + new
    { label: 'Load-in', value: loadinTime },
    { label: 'Soundcheck', value: soundcheckTime },
    { label: 'Doors', value: doors },
    { label: 'Onstage', value: onstage },
    { label: 'Offstage', value: offstage },
    { label: 'Venue Curfew', value: venueCurfew },
    { label: 'Depart Venue', value: departVenue },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <InfoCard title="Schedule">
          {timeFields.map((field, index) => {
            const display = formatTime(field.value) ?? '—';
            return (
              <View key={index} style={styles.timeRow}>
                <Text style={styles.label}>{field.label}</Text>
                <Text style={styles.value}>{display}</Text>
              </View>
            );
          })}

          <View style={styles.notesWrap}>
            <Text style={styles.notesLabel}>Schedule Notes</Text>
            <Text style={styles.notesText}>
              {scheduleNotes && scheduleNotes.trim() ? scheduleNotes : '—'}
            </Text>
          </View>
        </InfoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#666' },
  value: { fontSize: 14, color: '#333' },

  notesWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
