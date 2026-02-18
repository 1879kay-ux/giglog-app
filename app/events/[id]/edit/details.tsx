import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

type VenueRow = {
  venue_id: string;
  event_venue_name: string | null;
  city: string | null;
  address: string | null;
  postcode: string | null;
  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;
  venue_notes: string | null;
  capacity: number | null;
};

type EventRow = {
  event_id: string;
  event_date: string;
  venue_id: string | null;

  event_type: string | null;
  event_status: string | null;
  event_notes: string | null;

  promoter_contact_name: string | null;
  promoter_contact_phone: string | null;
  promoter_contact_email: string | null;
};

// Display: Wed 1 Apr 2026 (no comma). Input must be YYYY-MM-DD
function formatEventDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace(',', '');
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && String(value).trim() ? String(value) : '—';
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{display}</Text>
    </View>
  );
}

type ChipOption = { key: string; selectedColor: string };

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: ChipOption[];
  onChange: (next: string) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionTitle}>{label}</Text>

      <View style={styles.chipRow}>
        {options.map(opt => {
          const selected = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[
                styles.chip,
                selected && {
                  backgroundColor: opt.selectedColor,
                  borderColor: opt.selectedColor,
                },
              ]}
            >
              <Text style={[styles.chipText, selected && { color: '#fff' }]}>{opt.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function EditEventDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [venue, setVenue] = useState<VenueRow | null>(null);

  // date picker state (store ISO: YYYY-MM-DD)
  const [eventDate, setEventDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // editable fields
  const [eventType, setEventType] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [promoterName, setPromoterName] = useState('');
  const [promoterPhone, setPromoterPhone] = useState('');
  const [promoterEmail, setPromoterEmail] = useState('');
  const [notes, setNotes] = useState('');

  const typeOptions: ChipOption[] = useMemo(
    () => [
      { key: 'Gig', selectedColor: '#2ECC71' },
      { key: 'Rehearsal', selectedColor: '#2ECC71' },
      { key: 'Recording', selectedColor: '#2ECC71' },
      { key: 'Promo', selectedColor: '#2ECC71' },
      { key: 'Meeting', selectedColor: '#2ECC71' },
      { key: 'Other', selectedColor: '#2ECC71' },
    ],
    []
  );

  const statusOptions: ChipOption[] = useMemo(
    () => [
      { key: 'Confirmed', selectedColor: '#2ECC71' },
      { key: 'Provisional', selectedColor: '#F39C12' },
      { key: 'Cancelled', selectedColor: '#E74C3C' },
    ],
    []
  );

  useFocusEffect(
  useCallback(() => {
    if (!id) return;
    load(); // <-- use YOUR real function name
  }, [id])
);



  async function load() {
    if (!id) return;

    setLoading(true);

    const { data: eventData, error: eventErr } = await supabase
      .from('events')
      .select(
        'event_id,event_date,venue_id,event_type,event_status,event_notes,promoter_contact_name,promoter_contact_phone,promoter_contact_email'
      )
      .eq('event_id', id)
      .single();

    if (eventErr || !eventData) {
      setLoading(false);
      Alert.alert('Error', 'Could not load event.');
      return;
    }

    setEvent(eventData as EventRow);

    // IMPORTANT: copy date into local state for picker + UI updates
    setEventDate(eventData.event_date);

    // hydrate form state
    setEventType(eventData.event_type ?? null);
    setEventStatus(eventData.event_status ?? null);
    setPromoterName(eventData.promoter_contact_name ?? '');
    setPromoterPhone(eventData.promoter_contact_phone ?? '');
    setPromoterEmail(eventData.promoter_contact_email ?? '');
    setNotes(eventData.event_notes ?? '');

    if (eventData.venue_id) {
      const { data: venueData } = await supabase
        .from('venues')
        .select(
          'venue_id,event_venue_name,city,address,postcode,venue_contact_name,venue_contact_phone,venue_contact_email,venue_notes,capacity'
        )
        .eq('venue_id', eventData.venue_id)
        .single();

      setVenue((venueData as VenueRow) ?? null);
    } else {
      setVenue(null);
    }

    setLoading(false);
  }

  async function onSave() {
    if (!id) return;

    if (!eventDate) {
      Alert.alert('Missing', 'Please choose a Date.');
      return;
    }
    if (!eventType) {
      Alert.alert('Missing', 'Please choose an Event Type.');
      return;
    }
    if (!eventStatus) {
      Alert.alert('Missing', 'Please choose a Status.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('events')
      .update({
        event_date: eventDate,
        event_type: eventType,
        event_status: eventStatus,
        promoter_contact_name: promoterName.trim() || null,
        promoter_contact_phone: promoterPhone.trim() || null,
        promoter_contact_email: promoterEmail.trim() || null,
        event_notes: notes.trim() || null,
      })
      .eq('event_id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    router.back();
  }

  if (loading || !event) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'Edit Details' }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  const safeDate = eventDate || event.event_date;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Details' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={[styles.container, { paddingBottom: 180 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Context header block */}
            <View style={styles.summary}>
              <Text style={styles.summaryDate}>{formatEventDate(safeDate)}</Text>
              <Text style={styles.summaryVenue}>
                {venue?.event_venue_name ?? 'Venue'}
                {venue?.city ? `, ${venue.city}` : ''}
              </Text>
              <Text style={styles.summaryMeta}>
                {(eventType ?? event.event_type ?? 'Event')}
                {eventStatus
                  ? `, ${eventStatus}`
                  : event.event_status
                    ? `, ${event.event_status}`
                    : ''}
              </Text>
            </View>

            {/* EVENT OVERVIEW */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Event Overview</Text>

              {/* DATE ROW */}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Date</Text>

                <TouchableOpacity
                  style={styles.dateValueWrap}
                  onPress={() => setShowCalendar(v => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowValue}>{formatEventDate(safeDate)}</Text>
                  <Ionicons name="calendar-outline" size={18} color="#008080" />
                </TouchableOpacity>
              </View>

              {showCalendar && (
                <View style={styles.calendarWrap}>
                  <Calendar
                    current={safeDate}
                    enableSwipeMonths
                    markedDates={{
                      [safeDate]: { selected: true, selectedColor: '#4FB3B3' },
                    }}
                    onDayPress={(day) => {
                      setEventDate(day.dateString);
                      setShowCalendar(false);
                    }}
                  />
                </View>
              )}

              <ChipGroup
                label="Event Type"
                value={eventType}
                options={typeOptions}
                onChange={setEventType}
              />

              <ChipGroup
                label="Status"
                value={eventStatus}
                options={statusOptions}
                onChange={setEventStatus}
              />
            </View>

            {/* VENUE DETAILS */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Venue Details</Text>
              <InfoRow label="Venue Name" value={venue?.event_venue_name ?? null} />
              <InfoRow label="Address" value={venue?.address ?? null} />
              <InfoRow label="Postcode" value={venue?.postcode ?? null} />
              <InfoRow label="Contact Name" value={venue?.venue_contact_name ?? null} />
              <InfoRow label="Contact Phone" value={venue?.venue_contact_phone ?? null} />
              <InfoRow label="Contact Email" value={venue?.venue_contact_email ?? null} />
              <InfoRow label="Capacity" value={venue?.capacity != null ? String(venue.capacity) : null} />
              <InfoRow label="Venue Notes" value={venue?.venue_notes ?? null} />

              <Text style={styles.helper}>
                If you need to change venue details, edit the venue record.
              </Text>

              {!!event.venue_id && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push(`/venue/${event.venue_id}/edit`)}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Edit Venue</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* PROMOTER CONTACT */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Promoter Contact</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.input} value={promoterName} onChangeText={setPromoterName} />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.input} value={promoterPhone} onChangeText={setPromoterPhone} />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} value={promoterEmail} onChangeText={setPromoterEmail} />
            </View>

            {/* NOTES */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes for this event..."
                placeholderTextColor="#999"
              />
            </View>

            {/* SAVE */}
            <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
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
    backgroundColor: '#f5f5f5',
  },

  summary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginBottom: 12,
  },
  summaryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  summaryVenue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  summaryMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
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
    gap: 12,
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: '#111',
    textAlign: 'right',
    flex: 1,
  },

  dateValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },

  calendarWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    overflow: 'hidden',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
    marginTop: 6,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },

  helper: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
  },

  secondaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4FB3B3',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginTop: 8,
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
  multiline: {
    height: 110,
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
