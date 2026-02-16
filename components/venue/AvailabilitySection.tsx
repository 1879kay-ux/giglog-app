import InfoCard from '@/components/InfoCard';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AvailabilitySectionProps = {
  initialStatus?: string | null;
};

export default function AvailabilitySection({ initialStatus }: AvailabilitySectionProps) {
  const [userStatus, setUserStatus] = useState<'available' | 'provisional' | 'unavailable'>(
    (initialStatus as 'available' | 'provisional' | 'unavailable') || 'available'
  );

  const getChipStyle = (status: 'available' | 'provisional' | 'unavailable') => {
    const isSelected = userStatus === status;
    if (isSelected) {
      switch (status) {
        case 'available':
          return { backgroundColor: '#4caf50' };
        case 'provisional':
          return { backgroundColor: '#ff9800' };
        case 'unavailable':
          return { backgroundColor: '#f44336' };
      }
    }
    return { backgroundColor: '#e0e0e0' };
  };

  const getChipTextColor = (status: 'available' | 'provisional' | 'unavailable') => {
    return userStatus === status ? '#fff' : '#333';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <InfoCard title="Your Availability">
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, getChipStyle('available')]}
              onPress={() => setUserStatus('available')}
            >
              <Text style={[styles.chipText, { color: getChipTextColor('available') }]}>
                Available
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, getChipStyle('provisional')]}
              onPress={() => setUserStatus('provisional')}
            >
              <Text style={[styles.chipText, { color: getChipTextColor('provisional') }]}>
                Provisional
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, getChipStyle('unavailable')]}
              onPress={() => setUserStatus('unavailable')}
            >
              <Text style={[styles.chipText, { color: getChipTextColor('unavailable') }]}>
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
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
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