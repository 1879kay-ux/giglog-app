import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type TravelRow = {
  departure_address: string | null;
  departure_postcode: string | null;
};

export default function EditEventTravelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departureAddress, setDepartureAddress] = useState('');
  const [departurePostcode, setDeparturePostcode] = useState('');

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('departure_address,departure_postcode')
      .eq('event_id', id)
      .single();

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    const row = data as TravelRow;

    setDepartureAddress(row.departure_address ?? '');
    setDeparturePostcode(row.departure_postcode ?? '');

    setLoading(false);
  }

  async function onSave() {
    if (!id) return;

    setSaving(true);

    const payload = {
      departure_address: departureAddress.trim() ? departureAddress.trim() : null,
      departure_postcode: departurePostcode.trim() ? departurePostcode.trim() : null,
    };

    const { error } = await supabase.from('events').update(payload).eq('event_id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    router.back();
  }

  async function onClear() {
    if (!id) return;

    Alert.alert(
      'Use blank departure',
      'This will clear the departure fields for this event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const { error } = await supabase
              .from('events')
              .update({ departure_address: null, departure_postcode: null })
              .eq('event_id', id);

            setSaving(false);

            if (error) {
              Alert.alert('Clear failed', error.message);
              return;
            }

            router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'Edit Travel' }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Travel' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Departure Location</Text>
            <Text style={styles.help}>
              This is the starting point for “Departure Location → Venue” directions.
            </Text>

            <Text style={styles.label}>Departure Address</Text>
            <TextInput
              style={styles.input}
              value={departureAddress}
              onChangeText={setDepartureAddress}
              placeholder="e.g. Band lockup, street, town"
              placeholderTextColor="#999"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Departure Postcode</Text>
            <TextInput
              style={styles.input}
              value={departurePostcode}
              onChangeText={setDeparturePostcode}
              placeholder="e.g. SW1A 1AA"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.clearBtn} onPress={onClear} disabled={saving}>
              <Text style={styles.clearText}>Clear for this event</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111',
    marginBottom: 6,
  },
  help: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  clearBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearText: {
    color: '#B00020',
    fontWeight: '800',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#4FB3B3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
