import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

export const unstable_settings = {
  initialRouteName: 'add',
};

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddVenueModal() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [notes, setNotes] = useState('');

  async function saveVenue() {
    if (!name.trim() || !city.trim()) {
      Alert.alert('Missing Information', 'Name and City are required.');
      return;
    }

    const payload = {
      event_venue_name: name.trim(),
      city: city.trim(),
      postcode: postcode.trim() || null,
      venue_notes: notes.trim() || null,
    };

    const { data, error } = await supabase
      .from('venues')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.log(error);
      Alert.alert('Error', error.message);
      return;
    }

    // ⭐ DO NOT CHANGE — this is correct
    router.replace({
      pathname: '/events/add',
      params: {
        newVenueName: data.event_venue_name,
        newVenueCity: data.city,
      },
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Venue</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

          {/* NAME */}
          <Text style={styles.label}>
            Venue Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Venue name"
          />

          {/* CITY */}
          <Text style={styles.label}>
            City <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
          />

          {/* POSTCODE */}
          <Text style={styles.label}>Postcode</Text>
          <TextInput
            style={styles.input}
            value={postcode}
            onChangeText={setPostcode}
            placeholder="Postcode"
          />

          {/* NOTES */}
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes about the venue"
            multiline
          />

          {/* SAVE BUTTON */}
          <TouchableOpacity style={styles.saveButton} onPress={saveVenue}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Venue</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    backgroundColor: '#008080',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 6,
  },

  required: {
    color: 'red',
    fontWeight: '900',
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#008080',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008080',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 40,
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});