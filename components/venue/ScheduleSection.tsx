import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type ScheduleSectionProps = {
  callTime?: string | null;
  loadinTime?: string | null;
  soundcheckTime?: string | null;
  onstage?: string | null;
  offstage?: string | null;
  venueCurfew?: string | null;
  busLeaveTime?: string | null;
};

export default function ScheduleSection({
  callTime,
  loadinTime,
  soundcheckTime,
  onstage,
  offstage,
  venueCurfew,
  busLeaveTime,
}: ScheduleSectionProps) {
  const timeFields = [
    { label: 'Call Time', value: callTime },
    { label: 'Load-in', value: loadinTime },
    { label: 'Soundcheck', value: soundcheckTime },
    { label: 'Onstage', value: onstage },
    { label: 'Offstage', value: offstage },
    { label: 'Venue Curfew', value: venueCurfew },
    { label: 'Bus Leaves', value: busLeaveTime },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <InfoCard title="Schedule">
        {timeFields.map((field, index) => (
          <View key={index} style={styles.timeRow}>
            <Text style={styles.label}>{field.label}</Text>
            <Text style={styles.value}>{field.value || '—'}</Text>
          </View>
        ))}
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
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
});
