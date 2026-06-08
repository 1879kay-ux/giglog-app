// app/events/add.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";
import { Calendar } from "react-native-calendars";

type VenueRow = {
  venue_id: string;
  event_venue_name: string;
  city: string;
};

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(isoDate: string, fallbackText: string) {
  if (!isoDate) return fallbackText;
  const d = new Date(`${isoDate}T00:00:00`);
  return d
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(",", "");
}

export default function AddEventScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAdmin, loading: memberLoading } = useCurrentMember();

  const [eventType, setEventType] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string>(todayIsoDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string>("");

  const [venueSearch, setVenueSearch] = useState("");
  const [allVenues, setAllVenues] = useState<VenueRow[]>([]);
  const [venueResults, setVenueResults] = useState<VenueRow[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  const [bandId, setBandId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const eventTypes = useMemo(
    () => [
      { value: "Gig", label: t("eventsAdd.typeGig") },
      { value: "Rehearsal", label: t("eventsAdd.typeRehearsal") },
      { value: "Recording", label: t("eventsAdd.typeRecording") },
      { value: "Promo", label: t("eventsAdd.typePromo") },
      { value: "Meeting", label: t("eventsAdd.typeMeeting") },
      { value: "Other", label: t("eventsAdd.typeOther") },
    ],
    [t],
  );

  const statusColors: Record<string, string> = {
    Confirmed: "#2e7d32",
    Provisional: "#f9a825",
    Cancelled: "#c62828",
  };

  const { newVenueName, newVenueCity } = useLocalSearchParams<{
    newVenueName?: string;
    newVenueCity?: string;
  }>();

  useEffect(() => {
    (async () => {
      await loadBandIdAndVenues();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!newVenueName || !newVenueCity || allVenues.length === 0) return;

    const matchedVenue = allVenues.find(
      (v) =>
        v.event_venue_name.trim().toLowerCase() ===
          newVenueName.trim().toLowerCase() &&
        v.city.trim().toLowerCase() === newVenueCity.trim().toLowerCase(),
    );

    const formatted = `${newVenueName} (${newVenueCity})`;
    setVenueSearch(formatted);
    setVenueResults(
      allVenues.filter((v) =>
        `${v.event_venue_name} (${v.city})`
          .toLowerCase()
          .includes(formatted.toLowerCase()),
      ),
    );
    setNoMatch(false);

    if (matchedVenue) {
      setSelectedVenue(matchedVenue);
      setSaveError("");
    } else {
      setSelectedVenue(null);
    }
  }, [newVenueName, newVenueCity, allVenues]);

  async function loadBandIdAndVenues() {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    console.log("AUTH user id:", userData?.user?.id);

    if (userErr) {
      Alert.alert(t("eventsAdd.alert.errorTitle"), userErr.message);
      return;
    }

    const user = userData.user;
    if (!user) {
      Alert.alert(
        t("eventsAdd.alert.notSignedInTitle"),
        t("eventsAdd.alert.pleaseSignIn"),
      );
      return;
    }

    const { data: bm, error: bmErr } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (bmErr) {
      Alert.alert(t("eventsAdd.alert.errorTitle"), bmErr.message);
      return;
    }

    const resolvedBandId = (bm as any)?.band_id ?? null;
    if (!resolvedBandId) {
      Alert.alert(
        t("eventsAdd.alert.setupNeededTitle"),
        t("eventsAdd.alert.noBandMembershipForUser"),
      );
      return;
    }

    setBandId(resolvedBandId);

    const { data, error } = await supabase
      .from("venues")
      .select("venue_id,event_venue_name,city")
      .order("event_venue_name", { ascending: true });

    if (error) {
      Alert.alert(
        t("eventsAdd.alert.errorTitle"),
        `${t("eventsAdd.alert.couldNotLoadVenues")}\n\n${error.message}`,
      );
      return;
    }

    if (data) {
      const venues = data as VenueRow[];
      setAllVenues(venues);
      setVenueResults(venues);
    }
  }

  function handleVenueSearch(text: string) {
    setVenueSearch(text);
    setSaveError("");

    const q = text.trim().toLowerCase();

    if (q === "") {
      setVenueResults(allVenues);
      setNoMatch(false);
      setSelectedVenue(null);
      return;
    }

    const filtered = allVenues.filter((v) =>
      `${v.event_venue_name} (${v.city})`.toLowerCase().includes(q),
    );

    setVenueResults(filtered);
    setNoMatch(filtered.length === 0);
    setSelectedVenue(null);
  }

  function clearVenueSearch() {
    setVenueSearch("");
    setVenueResults(allVenues);
    setSelectedVenue(null);
    setNoMatch(false);
    setSaveError("");
  }

  async function saveEvent() {
    if (saving) return;

    setSaveError("");
    Keyboard.dismiss();

    if (!selectedVenue) return setSaveError(t("eventsAdd.validationChooseVenue"));
    if (!eventDate) return setSaveError(t("eventsAdd.validationChooseDate"));
    if (!eventType) return setSaveError(t("eventsAdd.validationSelectEventType"));
    if (!eventStatus) return setSaveError(t("eventsAdd.validationSelectStatus"));
    if (!bandId) return setSaveError(t("eventsAdd.validationBandIdNotLoaded"));

    setSaving(true);

    try {
      const payload = {
        band_id: bandId,
        event_type: eventType,
        event_date: eventDate,
        event_status: eventStatus,
        venue_id: selectedVenue.venue_id,
      };

      const { data, error } = await supabase
        .from("events")
        .insert([payload])
        .select()
        .single();

      if (error) {
        setSaveError(`${error.code ?? ""} ${error.message}`.trim());
        return;
      }

      console.log("INSERT DATA:", data);

      const { data: unavailableMembers } = await supabase
        .from("member_unavailability")
        .select("member_id")
        .lte("start_date", eventDate)
        .gte("end_date", eventDate);

      if (unavailableMembers && unavailableMembers.length > 0) {
        await supabase.from("event_availability").upsert(
          unavailableMembers.map((row: any) => ({
            event_id: data.event_id,
            member_id: row.member_id,
            status: "unavailable",
            status_source: "unavailability_period",
          })),
          { onConflict: "event_id,member_id" },
        );
      }

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: t("eventsAdd.notificationTitle"),
body: `${eventType} at ${selectedVenue.event_venue_name}${selectedVenue.city ? `, ${selectedVenue.city}` : ""} ${t("eventsAdd.notificationAddedFor")} ${formatDisplayDate(eventDate)}. ${t("eventsAdd.notificationPleaseConfirmAvailability")}`,
            data: {
  type: "event_created",
  event_id: data.event_id,
  open: "availability",
},
          },
        });
      } catch (notifyError) {
        console.log("New event push notification error:", notifyError);
      }

      router.replace("/events");
    } catch (e: any) {
      console.log("saveEvent error:", e);
      setSaveError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  if (memberLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Add Event",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "700" },
          }}
        />

        <View style={{ flex: 1, padding: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: "#C62828",
              marginBottom: 10,
            }}
          >
            {t("eventsAdd.adminAccessRequired")}
          </Text>
          <Text style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
            {t("eventsAdd.adminAccessHelper")}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#009999",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              alignSelf: "flex-start",
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {t("eventsAdd.goBack")}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const content = (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.label}>
        {t("eventsAdd.venue")} <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color="#666"
          style={{ marginRight: 6 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t("eventsAdd.searchVenue")}
          value={venueSearch}
          onChangeText={handleVenueSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {venueSearch.length > 0 && (
          <TouchableOpacity onPress={clearVenueSearch}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {noMatch && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: "#c62828", fontWeight: "600" }}>
            {t("eventsAdd.noVenuesMatch", { venueSearch })}
          </Text>

          <TouchableOpacity
            style={styles.addVenueButton}
            onPress={() => router.push("/(modals)/add")}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addVenueButtonText}>
              {t("eventsAdd.addNewVenue")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {(venueSearch.length === 0 || venueResults.length > 0) && (
        <View style={styles.venueList}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {(venueSearch.length === 0 ? allVenues : venueResults).map(
              (item) => (
                <TouchableOpacity
                  key={item.venue_id}
                  style={[
                    styles.venueItem,
                    selectedVenue?.venue_id === item.venue_id &&
                      styles.venueItemSelected,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelectedVenue(item);
                    setVenueSearch(`${item.event_venue_name} (${item.city})`);
                    setNoMatch(false);
                    setSaveError("");
                  }}
                >
                  <Text style={styles.venueName}>{item.event_venue_name}</Text>
                  <Text style={styles.venueCity}>{item.city}</Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>
        {t("eventsAdd.eventDate")} <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.dateRow}>
        <View style={styles.dateBoxWide}>
          <Text style={styles.dateText}>
            {formatDisplayDate(eventDate, t("eventsAdd.selectDate"))}
          </Text>

          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setCalendarOpen(true);
            }}
            style={styles.calendarIconBtn}
            accessibilityLabel={t("eventsAdd.pickDate")}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCalendarOpen(false)}
        >
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <Calendar
              current={eventDate}
              enableSwipeMonths
              markedDates={{
                [eventDate]: { selected: true, selectedColor: colors.primary },
              }}
              onDayPress={(day) => {
                setEventDate(day.dateString);
                setCalendarOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.label}>
        {t("eventsAdd.eventType")} <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.chipRow}>
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.chip,
              eventType === type.value && styles.chipSelected,
            ]}
            onPress={() => setEventType(type.value)}
          >
            <Text
              style={[
                styles.chipText,
                eventType === type.value && styles.chipTextSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>
        {t("eventsAdd.status")} <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.chipRow}>
        {[
          { value: "Confirmed", label: t("eventsAdd.statusConfirmed") },
          { value: "Provisional", label: t("eventsAdd.statusProvisional") },
          { value: "Cancelled", label: t("eventsAdd.statusCancelled") },
        ].map((status) => {
          const selected = eventStatus === status.value;
          return (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.chip,
                selected && { backgroundColor: statusColors[status.value] },
              ]}
              onPress={() => setEventStatus(status.value)}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {saveError ? (
        <Text style={{ marginTop: 8, color: "#c62828", fontWeight: "700" }}>
          {saveError}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={saveEvent}
        disabled={saving}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>
          {saving ? t("eventsAdd.saving") : t("eventsAdd.saveEvent")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("eventsAdd.title"),
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerTintColor: "#fff",
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {content}
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

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.border,
  },

  chipSelected: {
    backgroundColor: colors.primary,
  },

  chipText: {
    color: colors.text,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: colors.cardBg,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 4,
  },

  dateBoxWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 220,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },

  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },

  calendarIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },

  calendarModal: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 10,
    overflow: "hidden",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },

  venueList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    maxHeight: 220,
    backgroundColor: colors.cardBg,
  },

  venueItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  venueItemSelected: {
    backgroundColor: "#E6F7F7",
  },

  venueName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },

  venueCity: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  addVenueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },

  addVenueButtonText: {
    color: colors.cardBg,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
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
    color: colors.cardBg,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
