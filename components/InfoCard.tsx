import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type InfoCardProps = {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

export default function InfoCard({ title, right, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111',
  },
  right: {
    marginLeft: 12,
  },
  body: {},
});
