import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
};

export default function ActionButton({ label, icon, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4FB3B3',
    alignSelf: 'flex-start',
    minWidth: 170,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2AA3A3',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
