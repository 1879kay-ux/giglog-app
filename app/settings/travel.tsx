import { supabase } from '@/lib/supabase';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ProfileRow = {
  id: string;
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

function clean(v: string) {
  const t = v.trim();
  return t.length ? t : null;
}

export default function TravelDefaultsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    if (authErr || !userId) {
      setLoading(false);
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, default_departure_address, default_departure_postcode')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    const row = (data as ProfileRow) ?? null;
    setAddress(row?.default_departure_address ?? '');
    setPostcode(row?.default_departure_postcode ?? '');
    setLoading(false);
  }

  async function onSave() {
    setSaving(true);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    if (authErr || !userId) {
      setSaving(false);
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const payload = {
      id: userId,
      default_departure_address: clean(address),
      default_departure_postcode: clean(postcode),
      updated_at: new Date().toISOString(),
    };

    // Upsert so it works even if the profile row doesn’t exist yet
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Travel Defaults' }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Default departure location</Text>
            <Text style={styles.sub}>Used for all events unless you override it on a specific event.</Text>

            <Text style={styles.label}>Departure address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. Rehearsal Room, 12 High St"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Departure postcode</Text>
            <TextInput
              style={styles.input}
              value={postcode}
              onChangeText={setPostcode}
              placeholder="e.g. NE1 1AA"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving || loading}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save defaults'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e6e6e6' },
  title: { fontSize: 16, fontWeight: '900', color: '#111' },
  sub: { marginTop: 6, fontSize: 12, color: '#666', lineHeight: 16 },
  label: { marginTop: 14, fontSize: 12, fontWeight: '900', color: '#444' },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fff',
  },
  saveBtn: { marginTop: 12, backgroundColor: '#4FB3B3', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
