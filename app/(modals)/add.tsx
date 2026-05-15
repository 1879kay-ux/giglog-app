// Add Venue Modal Screen
// This screen lives in app/(modals)/add.tsx so Expo Router treats it as a modal.
// Default header is shown, so we DO NOT render a custom header inside the component.

import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

export const unstable_settings = {
  initialRouteName: "add",
};

import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";

export default function AddVenueModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");

  async function saveVenue() {
    if (!name.trim() || !city.trim()) {
      Alert.alert("Missing Information", "Name and City are required.");
      return;
    }

    const payload = {
      event_venue_name: name.trim(),
      city: city.trim(),
      postcode: postcode.trim() || null,
      venue_notes: notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("venues")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.log(error);
      Alert.alert("Error", error.message);
      return;
    }

    router.replace({
      pathname: "/events/add",
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
          title: t("addVenue.title"),
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerLeft: () => (
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
              style={{ marginLeft: 16 }}
              onPress={() => router.back()}
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 120,
            backgroundColor: colors.pageBg,
            flexGrow: 1,
          }}
        >
          {/* NAME */}
          <Text style={styles.label}>
            {t("addVenue.venueName")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Venue name"
            placeholderTextColor={colors.textMuted}
          />

          {/* CITY */}
          <Text style={styles.label}>
            {t("addVenue.city")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={colors.textMuted}
          />

          {/* POSTCODE */}
          <Text style={styles.label}>{t("addVenue.postcode")}</Text>
          <TextInput
            style={styles.input}
            value={postcode}
            onChangeText={setPostcode}
            placeholder="Postcode"
            placeholderTextColor={colors.textMuted}
          />

          {/* NOTES */}
          <Text style={styles.label}>{t("addVenue.notes")}</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes about the venue"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {/* SAVE BUTTON */}
          <TouchableOpacity style={styles.saveButton} onPress={saveVenue}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>{t("addVenue.saveButton")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 6,
    color: colors.text,
  },

  required: {
    color: colors.danger,
    fontWeight: "900",
  },

  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 40,
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
