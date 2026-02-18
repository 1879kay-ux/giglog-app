import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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

type EventDocsRow = {
  setlist_url: string | null;
  eventinfo_url: string | null;
  promo_material_url: string | null;
  doc_other_url: string | null;
};

function cleanUrlInput(v: string) {
  const s = v.trim();
  return s ? s : null;
}

export default function EditEventDocumentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [setlistUrl, setSetlistUrl] = useState('');
  const [eventinfoUrl, setEventinfoUrl] = useState('');
  const [promoMaterialUrl, setPromoMaterialUrl] = useState('');
  const [docOtherUrl, setDocOtherUrl] = useState('');

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
      .select('setlist_url,eventinfo_url,promo_material_url,doc_other_url')
      .eq('event_id', id)
      .single();

    if (error || !data) {
      setLoading(false);
      Alert.alert('Error', error?.message ?? 'Could not load documents.');
      return;
    }

    const row = data as EventDocsRow;

    setSetlistUrl(row.setlist_url ?? '');
    setEventinfoUrl(row.eventinfo_url ?? '');
    setPromoMaterialUrl(row.promo_material_url ?? '');
    setDocOtherUrl(row.doc_other_url ?? '');

    setLoading(false);
  }

  async function onSave() {
    if (!id) return;

    setSaving(true);

    const payload = {
      setlist_url: cleanUrlInput(setlistUrl),
      eventinfo_url: cleanUrlInput(eventinfoUrl),
      promo_material_url: cleanUrlInput(promoMaterialUrl),
      doc_other_url: cleanUrlInput(docOtherUrl),
    };

    const { error } = await supabase.from('events').update(payload).eq('event_id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    router.back();
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'Edit Documents' }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Documents' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Document Links</Text>
            <Text style={styles.cardSub}>
              Paste URLs to setlist, event info, promo material, or anything else. Leave blank to
              remove.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Setlist URL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="link-outline" size={16} color="#008080" />
                <TextInput
                  value={setlistUrl}
                  onChangeText={setSetlistUrl}
                  placeholder="https://..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Event Info URL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="link-outline" size={16} color="#008080" />
                <TextInput
                  value={eventinfoUrl}
                  onChangeText={setEventinfoUrl}
                  placeholder="https://..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Promo Material URL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="link-outline" size={16} color="#008080" />
                <TextInput
                  value={promoMaterialUrl}
                  onChangeText={setPromoMaterialUrl}
                  placeholder="https://..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Other URL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="link-outline" size={16} color="#008080" />
                <TextInput
                  value={docOtherUrl}
                  onChangeText={setDocOtherUrl}
                  placeholder="https://..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
              </View>
            </View>
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
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 12,
  },

  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    padding: 0,
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
