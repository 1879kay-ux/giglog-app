import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "react-native";

type TravelRow = {
  departure_address: string | null;
  departure_postcode: string | null;
};

function clean(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export default function EditEventTravelScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departureAddress, setDepartureAddress] = useState("");
  const [departurePostcode, setDeparturePostcode] = useState("");

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("departure_address,departure_postcode")
      .eq("event_id", id)
      .single();

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    const row = data as TravelRow;
    setDepartureAddress(row.departure_address ?? "");
    setDeparturePostcode(row.departure_postcode ?? "");

    setLoading(false);
  }

  async function onSave() {
    if (!id || saving) return;

    setSaving(true);

    const payload = {
      departure_address: clean(departureAddress),
      departure_postcode: clean(departurePostcode),
    };

    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("event_id", id);

    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    router.back();
  }

  async function doClear() {
    if (!id || saving) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("events")
      .update({ departure_address: null, departure_postcode: null })
      .eq("event_id", id)
      .select("departure_address, departure_postcode")
      .maybeSingle();

    setSaving(false);

    if (error) {
      Alert.alert("Clear failed", error.message);
      return;
    }

    // Update UI immediately (so you can SEE it cleared)
    setDepartureAddress(data?.departure_address ?? "");
    setDeparturePostcode(data?.departure_postcode ?? "");

    router.back();
  }

  function onClear() {
    if (!id || saving) return;

    const msg =
      "This will clear the departure fields for this event.\n\nAfter clearing, the Travel section will fall back to the default bus departure.";

    // Web confirm (reliable)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(msg);
      if (ok) void doClear();
      return;
    }

    // Native confirm
    Alert.alert("Clear for this event", msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void doClear() },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: "Edit Travel" }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Travel" }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("eventsEditTravel.departureLocation")}</Text>
            <Text style={styles.help}>
              This is the starting point for “Departure Location → Venue”
              directions.
            </Text>

            <Text style={styles.label}>{t("eventsEditTravel.departureAddress")}</Text>
            <TextInput
              style={styles.input}
              value={departureAddress}
              onChangeText={setDepartureAddress}
              placeholder={t("eventsEditTravel.placeholderAddress")}
              placeholderTextColor="#999"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>
              Departure Postcode
            </Text>
            <TextInput
              style={styles.input}
              value={departurePostcode}
              onChangeText={setDeparturePostcode}
              placeholder={t("eventsEditTravel.placeholderPostcode")}
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={onClear}
              disabled={saving}
            >
              <Text style={styles.clearText}>{t("eventsEditTravel.clearForThisEvent")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t("eventsEditTravel.saving") : t("eventsEditTravel.save")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.pageBg,
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: colors.pageBg,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 6,
  },
  help: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  clearBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: colors.button,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
