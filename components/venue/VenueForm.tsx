import { colors } from "@/theme/colors";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Venue } from "../../types/venue";

export default function VenueForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: Partial<Venue>;
  onSubmit: (venue: Venue) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<Venue>>({
    venue_id: initialValues?.venue_id ?? "",
    event_venue_name: initialValues?.event_venue_name ?? "",
    address: initialValues?.address ?? "",
    city: initialValues?.city ?? "",
    postcode: initialValues?.postcode ?? "",
    venue_contact_name: initialValues?.venue_contact_name ?? "",
    venue_contact_phone: initialValues?.venue_contact_phone ?? "",
    venue_contact_email: initialValues?.venue_contact_email ?? "",
    venue_notes: initialValues?.venue_notes ?? "",
    is_active: initialValues?.is_active ?? true,
    capacity: initialValues?.capacity ?? null,
    capacity_notes: initialValues?.capacity_notes ?? "",
  });

  // Optional but robust: if initialValues ever change, hydrate once.
  // This prevents weirdness if the form is rendered before values are ready in other screens.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated) return;
    if (!initialValues) return;

    setForm({
      venue_id: initialValues?.venue_id ?? "",
      event_venue_name: initialValues?.event_venue_name ?? "",
      address: initialValues?.address ?? "",
      city: initialValues?.city ?? "",
      postcode: initialValues?.postcode ?? "",
      venue_contact_name: initialValues?.venue_contact_name ?? "",
      venue_contact_phone: initialValues?.venue_contact_phone ?? "",
      venue_contact_email: initialValues?.venue_contact_email ?? "",
      venue_notes: initialValues?.venue_notes ?? "",
      is_active: initialValues?.is_active ?? true,
      capacity: initialValues?.capacity ?? null,
      capacity_notes: initialValues?.capacity_notes ?? "",
    });

    setHydrated(true);
  }, [initialValues, hydrated]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const update = (key: keyof Venue, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const newErrors: any = {};
    if (!form.event_venue_name?.trim()) newErrors.event_venue_name = "Required";
    if (!form.city?.trim()) newErrors.city = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const finalVenue: Venue = {
      ...form,
      venue_id: form.venue_id || "",
      is_active: form.is_active ?? true,
      capacity: form.capacity ?? null,
    } as Venue;

    onSubmit(finalVenue);
  };

 const content = (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* VENUE NAME */}
      <Text style={styles.label}>
        {t("venueForm.venueName")} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, errors.event_venue_name && styles.inputError]}
        value={form.event_venue_name ?? ""}
        onChangeText={(t) => update("event_venue_name", t)}
        returnKeyType="next"
      />
      {errors.event_venue_name && (
        <Text style={styles.errorText}>{errors.event_venue_name}</Text>
      )}

      {/* ADDRESS */}
      <Text style={styles.label}>{t("venueForm.address")}</Text>
      <TextInput
        style={styles.input}
        value={form.address ?? ""}
        onChangeText={(t) => update("address", t)}
        returnKeyType="next"
      />

      {/* CITY */}
      <Text style={styles.label}>
        {t("venueForm.city")} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, errors.city && styles.inputError]}
        value={form.city ?? ""}
        onChangeText={(t) => update("city", t)}
        returnKeyType="next"
      />
      {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

      {/* POSTCODE */}
      <Text style={styles.label}>{t("venueForm.postcode")}</Text>
      <TextInput
        style={styles.input}
        value={form.postcode ?? ""}
        onChangeText={(t) => update("postcode", t)}
        returnKeyType="next"
      />

      {/* CONTACT NAME */}
      <Text style={styles.label}>{t("venueForm.contactName")}</Text>
      <TextInput
        style={styles.input}
        value={form.venue_contact_name ?? ""}
        onChangeText={(t) => update("venue_contact_name", t)}
        returnKeyType="next"
      />

      {/* CONTACT PHONE */}
      <Text style={styles.label}>{t("venueForm.contactPhone")}</Text>
      <TextInput
        style={styles.input}
        value={form.venue_contact_phone ?? ""}
        onChangeText={(t) => update("venue_contact_phone", t)}
        returnKeyType="next"
      />

      {/* CONTACT EMAIL */}
      <Text style={styles.label}>{t("venueForm.contactEmail")}</Text>
      <TextInput
        style={styles.input}
        value={form.venue_contact_email ?? ""}
        onChangeText={(t) => update("venue_contact_email", t)}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
      />

      {/* CAPACITY */}
      <Text style={styles.label}>{t("venueForm.capacity")}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form.capacity?.toString() ?? ""}
        onChangeText={(t) => update("capacity", t ? Number(t) : null)}
        returnKeyType="next"
      />

      {/* CAPACITY NOTES */}
      <Text style={styles.label}>{t("venueForm.capacityNotes")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        value={form.capacity_notes ?? ""}
        onChangeText={(t) => update("capacity_notes", t)}
      />

      {/* VENUE NOTES */}
      <Text style={styles.label}>{t("venueForm.venueNotes")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        value={form.venue_notes ?? ""}
        onChangeText={(t) => update("venue_notes", t)}
      />

      {/* ACTIVE TOGGLE */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("venueForm.active")}</Text>
          <Text style={styles.helperText}>
            {t("venueForm.activeHelper")}
          </Text>
        </View>
        <Switch
          value={!!form.is_active}
          onValueChange={(v) => update("is_active", v)}
        />
      </View>

            </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
          <Text style={styles.saveButtonText}>{t("venueForm.saveVenue")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {Platform.OS === "web" ? (
        // On web, TouchableWithoutFeedback can block TextInput focus/typing.
        <View style={{ flex: 1 }}>{content}</View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>{content}</View>
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#f5f5f5",
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 14,
    color: "#111",
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -6,
    marginBottom: 6,
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    gap: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  stickyFooter: {
  padding: 16,
  paddingBottom: 24,
  backgroundColor: "#f5f5f5",
  borderTopWidth: 1,
  borderTopColor: "#ddd",
},
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "700",
  },
});
