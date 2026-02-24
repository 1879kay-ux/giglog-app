// app/events/add.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

function formatDisplayDate(isoDate: string) {
  if (!isoDate) return "Select date";
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
  const { isAdmin, loading: memberLoading } = useCurrentMember();

  const [eventType, setEventType] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string>(todayIsoDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | null>(null);

  // Debug + save errors shown on screen (works on web and native)
  const [debugMsg, setDebugMsg] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");

  const [venueSearch, setVenueSearch] = useState("");
  const [allVenues, setAllVenues] = useState<VenueRow[]>([]);
  const [venueResults, setVenueResults] = useState<VenueRow[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  const [bandId, setBandId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const eventTypes = useMemo(
    () => ["Gig", "Rehearsal", "Recording", "Promo", "Meeting", "Other"],
    []
  );

  const statusColors: Record<string, string> = {
    Confirmed: "#2e7d32",
    Provisional: "#f9a825",
    Cancelled: "#c62828",
  };

  // RETURN FROM ADD VENUE
  const { newVenueName, newVenueCity } = useLocalSearchParams<{
    newVenueName?: string;
    newVenueCity?: string;
  }>();

  useEffect(() => {
    if (newVenueName && newVenueCity) {
      const formatted = `${newVenueName} (${newVenueCity})`;
      setVenueSearch(formatted);
    }
  }, [newVenueName, newVenueCity]);

  useEffect(() => {
    (async () => {
      await loadBandIdAndVenues();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBandIdAndVenues() {
    // 1) resolve current user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    console.log("AUTH user id:", userData?.user?.id);

    if (userErr) {
      Alert.alert("Error", userErr.message);
      return;
    }
    const user = userData.user;
    if (!user) {
      Alert.alert("Not signed in", "Please sign in.");
      return;
    }

    // 2) resolve band_id from band_members
    const { data: bm, error: bmErr } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (bmErr) {
      Alert.alert("Error", bmErr.message);
      return;
    }

    const resolvedBandId = (bm as any)?.band_id ?? null;
    if (!resolvedBandId) {
      Alert.alert("Setup needed", "No band membership found for your user.");
      return;
    }

    setBandId(resolvedBandId);

    // 3) load venues
    const { data, error } = await supabase
      .from("venues")
      .select("venue_id,event_venue_name,city")
      .order("event_venue_name", { ascending: true });

    if (error) {
      Alert.alert("Error", `Could not load venues.\n\n${error.message}`);
      return;
    }

    if (data) {
      setAllVenues(data as VenueRow[]);
      setVenueResults(data as VenueRow[]);
    }
  }

  function handleVenueSearch(text: string) {
    setVenueSearch(text);

    const q = text.trim().toLowerCase();

    if (q === "") {
      setVenueResults(allVenues);
      setNoMatch(false);
      setSelectedVenue(null);
      return;
    }

    const filtered = allVenues.filter((v) =>
      `${v.event_venue_name} (${v.city})`.toLowerCase().includes(q)
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
  }

  async function saveEvent() {
    if (saving) return;

    // clear and show debug on screen
    setSaveError("");
    setDebugMsg("saveEvent fired");

    Keyboard.dismiss();

    // Replace Alert validation with on-screen errors (Alert is unreliable on web)
    if (!selectedVenue) return setSaveError("Choose a venue.");
    if (!eventDate) return setSaveError("Choose a date.");
    if (!eventType) return setSaveError("Select an event type.");
    if (!eventStatus) return setSaveError("Select a status.");
    if (!bandId) return setSaveError("Band ID not loaded. Try again.");

    setSaving(true);
    try {
      const payload: any = {
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

      // success
      console.log("INSERT DATA:", data);
      router.back();
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
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#008080" },
            headerTitleStyle: { color: "#fff", fontWeight: "700" },
            headerTintColor: "#fff",
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
            Admin access required
          </Text>
          <Text style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
            You do not have permission to add events. Ask the band admin if you need access.
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
            <Text style={{ color: "#fff", fontWeight: "900" }}>Go back</Text>
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
      {/* VENUE FIRST */}
      <Text style={styles.label}>
        Venue <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#666" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venue..."
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
            No venues match "{venueSearch}"
          </Text>

          <TouchableOpacity style={styles.addVenueButton} onPress={() => router.push("/(modals)/add")}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addVenueButtonText}>Add New Venue</Text>
          </TouchableOpacity>
        </View>
      )}

      {(venueSearch.length === 0 || venueResults.length > 0) && (
        <View style={styles.venueList}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {(venueSearch.length === 0 ? allVenues : venueResults).map((item) => (
              <TouchableOpacity
                key={item.venue_id}
                style={styles.venueItem}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedVenue(item);
                  setVenueSearch(`${item.event_venue_name} (${item.city})`);
                  setNoMatch(false);
                }}
              >
                <Text style={styles.venueName}>{item.event_venue_name}</Text>
                <Text style={styles.venueCity}>{item.city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* DATE SECOND */}
      <Text style={styles.label}>
        Event Date <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.dateRow}>
        <View style={styles.dateBoxWide}>
          <Text style={styles.dateText}>{formatDisplayDate(eventDate)}</Text>

          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setCalendarOpen(true);
            }}
            style={styles.calendarIconBtn}
            accessibilityLabel="Pick date"
          >
            <Ionicons name="calendar-outline" size={18} color="#008080" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <Calendar
              current={eventDate}
              enableSwipeMonths
              markedDates={{
                [eventDate]: { selected: true, selectedColor: "#4FB3B3" },
              }}
              onDayPress={(day) => {
                setEventDate(day.dateString);
                setCalendarOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* EVENT TYPE THIRD */}
      <Text style={styles.label}>
        Event Type <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.chipRow}>
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, eventType === type && styles.chipSelected]}
            onPress={() => setEventType(type)}
          >
            <Text style={[styles.chipText, eventType === type && styles.chipTextSelected]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STATUS FOURTH */}
      <Text style={styles.label}>
        Status <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.chipRow}>
        {["Confirmed", "Provisional", "Cancelled"].map((status) => {
          const selected = eventStatus === status;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.chip, selected && { backgroundColor: statusColors[status] }]}
              onPress={() => setEventStatus(status)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{status}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* DEBUG / ERROR (on screen) */}
      {debugMsg ? (
        <Text style={{ marginTop: 16, color: "#c62828", fontWeight: "700" }}>{debugMsg}</Text>
      ) : null}

      {saveError ? (
        <Text style={{ marginTop: 8, color: "#c62828", fontWeight: "700" }}>{saveError}</Text>
      ) : null}

      {/* SAVE */}
      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={saveEvent}
        disabled={saving}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Event"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Event",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#008080" },
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
  },

  required: {
    color: "red",
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
    backgroundColor: "#ddd",
  },

  chipSelected: {
    backgroundColor: "#008080",
  },

  chipText: {
    color: "#333",
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "#fff",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#008080",
    borderRadius: 8,
  },

  dateText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },

  calendarIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cfe8e8",
    backgroundColor: "#f3fbfb",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },

  calendarModal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    overflow: "hidden",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#008080",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  venueList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    maxHeight: 220,
    backgroundColor: "#fff",
  },

  venueItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  venueName: {
    fontSize: 16,
    fontWeight: "600",
  },

  venueCity: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  addVenueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#008080",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },

  addVenueButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#008080",
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