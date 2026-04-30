// app/events/[id]/accommodation.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import AccommodationSection, { type AccommodationRow } from "@/components/venue/AccommodationSection";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

type FormState = {
  name: string;
  address_line: string;
  postcode: string;

  check_in_at: string;
  check_out_at: string;

  rooms_count: string;
  total_cost: string;

  booked_under_name: string;
  booking_reference: string;

  breakfast_included: boolean;
  parking_available: boolean;

  notes: string;
};

function isoNowRounded() {
  // Simple default; user can overwrite
  return new Date().toISOString();
}

export default function EventAccommodationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accommodation, setAccommodation] = useState<AccommodationRow | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    address_line: "",
    postcode: "",
    check_in_at: isoNowRounded(),
    check_out_at: isoNowRounded(),
    rooms_count: "",
    total_cost: "",
    booked_under_name: "",
    booking_reference: "",
    breakfast_included: false,
    parking_available: false,
    notes: "",
  });

  const hasExisting = !!accommodation?.id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("accommodation")
      .select("*")
      .eq("event_id", id)
      .maybeSingle();

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    const row = (data as AccommodationRow) ?? null;
    setAccommodation(row);

    if (row) {
      setForm({
        name: row.name ?? "",
        address_line: row.address_line ?? "",
        postcode: row.postcode ?? "",
        check_in_at: row.check_in_at,
        check_out_at: row.check_out_at,
        rooms_count: row.rooms_count === null ? "" : String(row.rooms_count),
        total_cost: row.total_cost === null ? "" : String(row.total_cost),
        booked_under_name: row.booked_under_name ?? "",
        booking_reference: row.booking_reference ?? "",
        breakfast_included: !!row.breakfast_included,
        parking_available: !!row.parking_available,
        notes: row.notes ?? "",
      });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = useMemo(() => {
    if (!canEdit) return false;
    if (!form.name.trim()) return false;
    if (!form.check_in_at || !form.check_out_at) return false;
    return true;
  }, [canEdit, form]);

  async function save() {
    if (!id) return;
    if (!canSave) return;

    setSaving(true);

    const roomsCount =
      form.rooms_count.trim() === "" ? null : Math.max(0, parseInt(form.rooms_count, 10));
    const totalCost =
      form.total_cost.trim() === "" ? null : Math.max(0, Number(form.total_cost));

    const payload = {
      event_id: id,
      name: form.name.trim(),
      address_line: form.address_line.trim() ? form.address_line.trim() : null,
      postcode: form.postcode.trim() ? form.postcode.trim() : null,
      check_in_at: form.check_in_at,
      check_out_at: form.check_out_at,
      rooms_count: Number.isNaN(roomsCount as any) ? null : roomsCount,
      total_cost: Number.isNaN(totalCost as any) ? null : totalCost,
      booked_under_name: form.booked_under_name.trim() ? form.booked_under_name.trim() : null,
      booking_reference: form.booking_reference.trim() ? form.booking_reference.trim() : null,
      breakfast_included: !!form.breakfast_included,
      parking_available: !!form.parking_available,
      notes: form.notes.trim() ? form.notes.trim() : null,
    };

    const { error } = hasExisting
      ? await supabase.from("accommodation").update(payload).eq("event_id", id)
      : await supabase.from("accommodation").insert(payload);

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    await load();
    Alert.alert("Saved", "Accommodation updated.");
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
      <Stack.Screen
        options={{
          title: "Accommodation",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back-outline" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Read-only preview for everyone */}
          <View style={styles.preview}>
            <AccommodationSection
              accommodation={accommodation}
              canEdit={false}
              onPressEdit={() => {}}
            />
          </View>

          {!canEdit ? (
            <Text style={styles.readOnlyNote}>Read only. Admins can edit accommodation.</Text>
          ) : (
            <View style={styles.form}>
              <Text style={styles.h2}>Edit</Text>

              <Label>Accommodation name</Label>
              <TextInput
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="Premier Inn, Travelodge, etc."
                style={styles.input}
              />

              <Label>Booked under</Label>
              <TextInput
                value={form.booked_under_name}
                onChangeText={(t) => setForm((p) => ({ ...p, booked_under_name: t }))}
                placeholder="Name on booking"
                style={styles.input}
              />

              <Label>Booking reference</Label>
              <TextInput
                value={form.booking_reference}
                onChangeText={(t) => setForm((p) => ({ ...p, booking_reference: t }))}
                placeholder="Ref"
                style={styles.input}
                autoCapitalize="characters"
              />

              <Label>Address line</Label>
              <TextInput
                value={form.address_line}
                onChangeText={(t) => setForm((p) => ({ ...p, address_line: t }))}
                placeholder="Optional"
                style={styles.input}
              />

              <Label>Postcode</Label>
              <TextInput
                value={form.postcode}
                onChangeText={(t) => setForm((p) => ({ ...p, postcode: t }))}
                placeholder="Optional"
                style={styles.input}
                autoCapitalize="characters"
              />

              <Label>Check-in (ISO datetime)</Label>
              <TextInput
                value={form.check_in_at}
                onChangeText={(t) => setForm((p) => ({ ...p, check_in_at: t }))}
                placeholder="2026-03-10T15:00:00.000Z"
                style={styles.input}
              />

              <Label>Check-out (ISO datetime)</Label>
              <TextInput
                value={form.check_out_at}
                onChangeText={(t) => setForm((p) => ({ ...p, check_out_at: t }))}
                placeholder="2026-03-11T11:00:00.000Z"
                style={styles.input}
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Label>Rooms</Label>
                  <TextInput
                    value={form.rooms_count}
                    onChangeText={(t) => setForm((p) => ({ ...p, rooms_count: t }))}
                    placeholder="1"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Label>Total cost</Label>
                  <TextInput
                    value={form.total_cost}
                    onChangeText={(t) => setForm((p) => ({ ...p, total_cost: t }))}
                    placeholder="120"
                    style={styles.input}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <ToggleRow
                label="Breakfast included"
                value={form.breakfast_included}
                onPress={() => setForm((p) => ({ ...p, breakfast_included: !p.breakfast_included }))}
              />

              <ToggleRow
                label="Parking available"
                value={form.parking_available}
                onPress={() => setForm((p) => ({ ...p, parking_available: !p.parking_available }))}
              />

              <Label>Notes</Label>
              <TextInput
                value={form.notes}
                onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
                placeholder="Late check-in code, parking instructions, etc."
                style={[styles.input, { height: 110, textAlignVertical: "top" }]}
                multiline
              />

              <Pressable
                style={[styles.saveBtn, !canSave || saving ? styles.saveBtnDisabled : null]}
                onPress={save}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>

              <Text style={styles.help}>
                Tip: for v1 we are using ISO datetime input. If you want, next step is a proper
                date-time picker.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function ToggleRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.togglePill, value ? styles.toggleOn : styles.toggleOff]}>
        <Text style={styles.togglePillText}>{value ? "Yes" : "No"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  container: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: 16, paddingBottom: Platform.OS === "ios" ? 180 : 140 },

  preview: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  readOnlyNote: {
    color: colors.textMuted,
    fontWeight: "700",
    paddingHorizontal: 2,
  },

  form: {
    marginTop: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  h2: { fontSize: 16, fontWeight: "900", color: colors.text, marginBottom: 10 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "700",
    color: colors.text,
  },

  twoCol: { flexDirection: "row", gap: 10 },

  toggleRow: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: { fontWeight: "800", color: colors.text },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
    alignItems: "center",
  },
  toggleOn: { backgroundColor: "rgba(13,148,136,0.12)", borderColor: colors.primary },
  toggleOff: { backgroundColor: "rgba(148,163,184,0.12)" },
  togglePillText: { fontWeight: "900", color: colors.text },

  saveBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  help: { marginTop: 10, color: colors.textMuted, fontWeight: "600", lineHeight: 18 },
});