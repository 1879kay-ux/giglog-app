import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type DocumentsSectionProps = {
  setlistUrl?: string | null;
  eventinfoUrl?: string | null;
  promoMaterial?: string | null;
};

export default function DocumentsSection({
  setlistUrl,
  eventinfoUrl,
  promoMaterial,
}: DocumentsSectionProps) {
  const documents = [
    { label: 'Setlist', value: setlistUrl },
    { label: 'Event Info', value: eventinfoUrl },
    { label: 'Promo Material', value: promoMaterial },
  ];

  return (
    <ScrollView style={styles.container}>
      <InfoCard title="Documents">
        {documents.map((doc, index) => (
          <View key={index} style={styles.docRow}>
            <Text style={styles.label}>{doc.label}</Text>
            <Text style={styles.value}>{doc.value ? '📎 Available' : '—'}</Text>
          </View>
        ))}
      </InfoCard>

      <InfoCard title="Document Links">
        <Text style={styles.note}>
          Document links will appear here when available
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
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  note: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
