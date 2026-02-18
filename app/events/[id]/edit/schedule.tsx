import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type EventScheduleRow = {
  travel_venue: string | null;
  loadin: string | null;
  soundcheck: string | null;
  doors: string | null;
  onstage: string | null;
  offstage: string | null;
  venue_curfew: string | null;
  depart_venue: string | null;
  schedule_notes: string | null;
};

function toHHMM(value?: string | null) {
  if (!value) return '';
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function hhmmToDbTime(hhmm: string) {
  const v = hhmm.trim();
  if (!v) return null;
  const m = v.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}:00`; // safe for Postgres time
}

function hhmmToDate(hhmm: string) {
  const d = new Date();
  const [hh, mm] = hhmm.split(':').map(Number);
  d.setHours(Number.isFinite(hh) ? hh : 0);
  d.setMinutes(Number.isFinite(mm) ? mm : 0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function dateToHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

type TimeFieldKey =
  | 'travel_venue'
  | 'loadin'
  | 'soundcheck'
  | 'doors'
  | 'onstage'
  | 'offstage'
  | 'venue_curfew'
  | 'depart_venue';

export default function EditEventScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // store edit values as HH:MM strings (or '')
  const [times, setTimes] = useState<Record<TimeFieldKey, string>>({
    travel_venue: '',
    loadin: '',
    soundcheck: '',
    doors: '',
    onstage: '',
    offstage: '',
    venue_curfew: '',
    depart_venue: '',
  });

  const [scheduleNotes, setScheduleNotes] = useState('');

  // native picker state (iOS/Android)
  const [pickerKey, setPickerKey] = useState<TimeFieldKey | null>(null);

  
// iOS modal picker state (extra)
const [iosPickerVisible, setIosPickerVisible] = useState(false);
const [iosTempTime, setIosTempTime] = useState<Date>(new Date());


  const fields = useMemo(
    () =>
      [
        { key: 'travel_venue', label: 'Travel to Venue' },
        { key: 'loadin', label: 'Load-in' },
        { key: 'soundcheck', label: 'Soundcheck' },
        { key: 'doors', label: 'Doors' },
        { key: 'onstage', label: 'Onstage' },
        { key: 'offstage', label: 'Offstage' },
        { key: 'venue_curfew', label: 'Venue Curfew' },
        { key: 'depart_venue', label: 'Depart Venue' },
      ] as { key: TimeFieldKey; label: string }[],
    []
  );

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
      .select(
        'travel_venue,loadin,soundcheck,doors,onstage,offstage,venue_curfew,depart_venue,schedule_notes'
      )
      .eq('event_id', id)
      .single();

    if (error || !data) {
      setLoading(false);
      Alert.alert('Error', error?.message ?? 'Could not load schedule.');
      return;
    }

    const row = data as EventScheduleRow;

    setTimes({
      travel_venue: toHHMM(row.travel_venue),
      loadin: toHHMM(row.loadin),
      soundcheck: toHHMM(row.soundcheck),
      doors: toHHMM(row.doors),
      onstage: toHHMM(row.onstage),
      offstage: toHHMM(row.offstage),
      venue_curfew: toHHMM(row.venue_curfew),
      depart_venue: toHHMM(row.depart_venue),
    });

    setScheduleNotes(row.schedule_notes ?? '');
    setLoading(false);
  }

  function setTime(key: TimeFieldKey, hhmm: string) {
    setTimes(prev => ({ ...prev, [key]: hhmm }));
  }

  async function onSave() {
    if (!id) return;

    setSaving(true);

    const payload = {
      travel_venue: hhmmToDbTime(times.travel_venue),
      loadin: hhmmToDbTime(times.loadin),
      soundcheck: hhmmToDbTime(times.soundcheck),
      doors: hhmmToDbTime(times.doors),
      onstage: hhmmToDbTime(times.onstage),
      offstage: hhmmToDbTime(times.offstage),
      venue_curfew: hhmmToDbTime(times.venue_curfew),
      depart_venue: hhmmToDbTime(times.depart_venue),
      schedule_notes: scheduleNotes.trim() ? scheduleNotes.trim() : null,
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
        <Stack.Screen options={{ title: 'Edit Schedule' }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Schedule' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule</Text>

            {fields.map(f => (
              <View key={f.key} style={styles.row}>
                <Text style={styles.rowLabel}>{f.label}</Text>

                {/* Web: native time input */}
                {Platform.OS === 'web' ? (
                  // @ts-ignore web-only input
                  <input
                    type="time"
                    value={times[f.key]}
                    onChange={(e: any) => setTime(f.key, e.target.value)}
                    style={{
                      width: 110,
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                    setPickerKey(f.key);
                    const current = times[f.key] || '00:00';
                    setIosTempTime(hhmmToDate(current));

                    if (Platform.OS === 'ios') {
                    setIosPickerVisible(true);
                 }
                }}

                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeText}>{times[f.key] || '—'}</Text>
                    <Ionicons name="time-outline" size={16} color="#008080" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.notesWrap}>
              <Text style={styles.notesLabel}>Schedule Notes</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                value={scheduleNotes}
                onChangeText={setScheduleNotes}
                placeholder="Add schedule notes..."
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Native time picker */}
       {/* ANDROID picker: close on selection (works fine) */}
{Platform.OS === 'android' && pickerKey && (
  <DateTimePicker
    value={hhmmToDate(times[pickerKey] || '00:00')}
    mode="time"
    is24Hour
    display="default"
    onChange={(event, selected) => {
      if (event.type === 'dismissed') {
        setPickerKey(null);
        return;
      }
      if (selected) setTime(pickerKey, dateToHHMM(selected));
      setPickerKey(null);
    }}
  />
)}

{/* IOS picker: modal with Cancel / Done (does NOT auto-close) */}
{Platform.OS === 'ios' && pickerKey && (
  <Modal
    visible={iosPickerVisible}
    transparent
    animationType="fade"
    onRequestClose={() => setIosPickerVisible(false)}
  >
    <View style={styles.modalBackdrop}>
      <View style={styles.iosPickerCard}>
        <View style={styles.iosPickerHeader}>
          <TouchableOpacity
            onPress={() => {
              setIosPickerVisible(false);
              setPickerKey(null);
            }}
          >
            <Text style={styles.iosPickerBtn}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.iosPickerTitle}>Select time</Text>

          <TouchableOpacity
            onPress={() => {
              setTime(pickerKey, dateToHHMM(iosTempTime));
              setIosPickerVisible(false);
              setPickerKey(null);
            }}
          >
            <Text style={styles.iosPickerBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        <DateTimePicker
          value={iosTempTime}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_, selected) => {
            if (selected) setIosTempTime(selected);
          }}
        />
      </View>
    </View>
  </Modal>
)}

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

  modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  padding: 16,
},
iosPickerCard: {
  backgroundColor: '#fff',
  borderRadius: 14,
  overflow: 'hidden',
},
iosPickerHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
iosPickerTitle: {
  fontSize: 14,
  fontWeight: '800',
  color: '#111',
},
iosPickerBtn: {
  fontSize: 14,
  fontWeight: '800',
  color: '#008080',
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
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
    flex: 1,
  },

  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    color: '#111',
    fontWeight: '700',
  },

  notesWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    minHeight: 110,
    textAlignVertical: 'top',
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
