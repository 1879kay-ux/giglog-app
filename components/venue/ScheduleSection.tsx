import InfoCard from '@/components/InfoCard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ScheduleSectionProps = {
  eventId: string;

  callTime?: string | null;
  loadinTime?: string | null;
  soundcheck?: string | null;
  doors?: string | null;
  onstage?: string | null;
  offstage?: string | null;
  venueCurfew?: string | null;

  travelVenue?: string | null; // renamed from call_time
  departVenue?: string | null; // renamed from bus_leave_time

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
  eventId,
  callTime,
  loadinTime,
  soundcheck,
  doors,
  onstage,
  offstage,
  venueCurfew,
  travelVenue,
  departVenue,
  scheduleNotes,
}: ScheduleSectionProps) {
  const router = useRouter();

  const headerIconBtn = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={10} style={styles.headerBtn}>
      <Ionicons name="create-outline" size={18} color="#008080" />
    </Pressable>
  );

  const editSchedule = headerIconBtn(() => router.push(`/events/${eventId}/edit/schedule`));

  const timeFields = [
    { label: 'Travel to Venue', value: travelVenue ?? callTime }, // supports old + new
    { label: 'Load-in', value: loadinTime },
    { label: 'Soundcheck', value: soundcheck },
    { label: 'Doors', value: doors },
    { label: 'Onstage', value: onstage },
    { label: 'Offstage', value: offstage },
    { label: 'Venue Curfew', value: venueCurfew },
    { label: 'Depart Venue', value: departVenue },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <InfoCard title="Schedule" right={editSchedule}>
          {timeFields.map((field, index) => {
            const display = formatTime(field.value) ?? '—';
            const isLast = index === timeFields.length - 1;

            return (
              <View key={field.label} style={[styles.timeRow, isLast && styles.timeRowLast]}>
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

  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E9F6F6',
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeRowLast: {
    borderBottomWidth: 0,
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
