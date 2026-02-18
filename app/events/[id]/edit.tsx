import EditEventHeader from '@/components/events/EditEventHeader';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SectionKey = 'details' | 'schedule' | 'documents' | 'finance';

export default function EditEventMenuScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // bump this whenever the screen comes back into focus
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setRefreshKey((k) => k + 1);
    }, [id])
  );

  const go = (section: SectionKey) => {
    if (!id) return;
    router.push(`/events/${id}/edit/${section}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Event' }} />

      {/* key forces remount so header reloads latest data */}
      {id ? <EditEventHeader key={`${id}-${refreshKey}`} eventId={id} /> : null}

      <View style={styles.container}>
        <Text style={styles.subtitle}>Choose what you want to edit</Text>

        <MenuButton title="Details" icon="information-circle-outline" onPress={() => go('details')} />
        <MenuButton title="Schedule" icon="time-outline" onPress={() => go('schedule')} />
        <MenuButton title="Documents" icon="document-text-outline" onPress={() => go('documents')} />
        <MenuButton title="Finance" icon="cash-outline" onPress={() => go('finance')} />
      </View>
    </>
  );
}

function MenuButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color="#fff" />
        <Text style={styles.buttonText}>{title}</Text>
      </View>
      <Text style={styles.chev}>▸</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#f5f5f5',
  },
  subtitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#009999',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  chev: {
    color: '#fff',
    fontSize: 16,
  },
});
