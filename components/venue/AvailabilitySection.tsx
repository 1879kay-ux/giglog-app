import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

type AvailabilitySectionProps = {
  initialStatus?: string | null;
};

export default function AvailabilitySection({ initialStatus }: AvailabilitySectionProps) {
  const [userStatus, setUserStatus] = useState<'available' | 'provisional' | 'unavailable'>(
    (initialStatus as 'available' | 'provisional' | 'unavailable') || 'available'
  );

  return (
    <ScrollView style={styles.container}>
      <InfoCard title="Your Availability">
        <View style={styles.chipContainer}>
          <TouchableOpacity
            style={[styles.chip, userStatus === 'available' && styles.chipActive, styles.chipGreen]}
            onPress={() => setUserStatus('available')}
          >
            <Text style={[styles.chipText, userStatus === 'available' && styles.chipTextActive]}>
              Available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, userStatus === 'provisional' && styles.chipActive, styles.chipAmber]}
            onPress={() => setUserStatus('provisional')}
          >
            <Text style={[styles.chipText, userStatus === 'provisional' && styles.chipTextActive]}>
              Provisional
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, userStatus === 'unavailable' && styles.chipActive, styles.chipRed]}
            onPress={() => setUserStatus('unavailable')}
          >
            <Text style={[styles.chipText, userStatus === 'unavailable' && styles.chipTextActive]}>
              Unavailable
            </Text>
          </TouchableOpacity>
        </View>
      </InfoCard>

      <InfoCard title="Band Availability">
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellHeader]}>Member</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader]}>Status</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Band Members</Text>
            <Text style={styles.tableCell}>—</Text>
          </View>
          <Text style={styles.note}>Data synced from band schedule</Text>
        </View>
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
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipGreen: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  chipAmber: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  chipRed: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  chipActive: {
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: '#333',
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  tableCellHeader: {
    fontWeight: '600',
    color: '#666',
  },
  note: {
    fontSize: 12,
    color: '#999',
    padding: 12,
    fontStyle: 'italic',
  },
});
