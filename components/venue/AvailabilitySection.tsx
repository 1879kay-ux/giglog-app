import InfoCard from '@/components/InfoCard';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AvailabilitySectionProps = {
  initialStatus?: string | null;
  eventId: string;
};

type BandAvailabilityRow = {
  member_id: string;
  display_name: string | null;
  band_positions: string[] | null;
  status: 'unknown' | 'available' | 'provisional' | 'unavailable' | string;
  responded_at: string | null;
};

export default function AvailabilitySection({ initialStatus, eventId }: AvailabilitySectionProps) {
  const [userStatus, setUserStatus] = useState<'available' | 'provisional' | 'unavailable'>(
    (initialStatus as 'available' | 'provisional' | 'unavailable') || 'available'
  );

  const [bandAvailability, setBandAvailability] = useState<BandAvailabilityRow[]>([]);
  const [loadingBand, setLoadingBand] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const loadAvailability = async () => {
      setLoadingBand(true);

      const { data, error } = await supabase
        .from('v_event_availability')
        .select('member_id, display_name, band_positions, status, responded_at')
        .eq('event_id', eventId)
        .order('display_name', { ascending: true });

      if (error) {
        console.log('loadAvailability error', error);
        setLoadingBand(false);
        return;
      }

      setBandAvailability((data as BandAvailabilityRow[]) ?? []);
      setLoadingBand(false);
    };

    loadAvailability();
  }, [eventId]);

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

  const formatStatus = (status: string) => {
    if (!status || status === 'unknown') return 'Awaiting';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const positionsText = (positions: string[] | null) => {
    if (!positions || positions.length === 0) return '';
    return positions.join(', ');
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

            {loadingBand ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Loading…</Text>
                <Text style={styles.tableCell}> </Text>
              </View>
            ) : bandAvailability.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>No members found</Text>
                <Text style={styles.tableCell}>—</Text>
              </View>
            ) : (
              bandAvailability.map((row) => (
                <View style={styles.tableRow} key={row.member_id}>
                  <View style={[styles.tableCell, styles.memberCell]}>
                    <Text style={styles.memberName}>{row.display_name ?? 'Unnamed'}</Text>
                    {positionsText(row.band_positions) ? (
                      <Text style={styles.memberMeta}>{positionsText(row.band_positions)}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.tableCell}>{formatStatus(row.status)}</Text>
                </View>
              ))
            )}

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
  memberCell: {
    flexDirection: 'column',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#666',
  },
  note: {
    fontSize: 12,
    color: '#999',
    padding: 12,
    fontStyle: 'italic',
  },
});