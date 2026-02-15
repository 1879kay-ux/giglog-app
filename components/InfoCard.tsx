import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type InfoCardProps = {
  title: string;
  children: ReactNode;
};

export default function InfoCard({ title, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
});