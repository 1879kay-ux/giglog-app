import EditEventHeader from '@/components/events/EditEventHeader';
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type EventDetailsRow = {
  event_id: string;
  event_type: string | null;
  event_status: string | null;
  event_notes: string | null;
};

export default function EditEventDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [eventType, setEventType] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  async function load() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('event_id,event_type,event_status,event_notes')
      .eq('event_id', id)
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    const row = data as EventDetailsRow;

    setEventType(row.event_type ?? '');
    setEventStatus(row.event_status ?? '');
    setEventNotes(row.event_notes ?? '');

    setLoading(false);
  }

  async function save() {
    if (!id) return;

    setSaving(true);

    const { error } = await supabase
      .from('events')
      .update({
        event_type: eventType.trim() || null,
        event_status: eventStatus.trim() || null,
        event_notes: eventNotes.trim() || null,
      })
      .eq('event_id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    Alert.alert('Saved', 'Details updated');
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Details' }} />

    {id ? <EditEventHeader eventId={id} /> : null}

    <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Type</Text>
        <TextInput style={styles.input} value={eventType} onChangeText={setEventType} />

        <Text style={styles.label}>Status</Text>
        <TextInput style={styles.input} value={eventStatus} onChangeText={setEventStatus} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={eventNotes}
          onChangeText={setEventNotes}
          multiline
        />

        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    padding: 16,
    paddingBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },

  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },

  saveButton: {
    marginTop: 22,
    backgroundColor: '#4FB3B3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2AA3A3',
  },

  saveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
