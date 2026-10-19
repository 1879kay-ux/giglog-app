// app/tours/add.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";

import { supabase } from "@/lib/supabase";

import { colors } from "@/theme/colors";

import { Ionicons } from "@expo/vector-icons";

import { Stack, useRouter } from "expo-router";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ActivityIndicator,

  Alert,

  KeyboardAvoidingView,

  Modal,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,
} from "react-native";



type ActRow = { act_id: string; act_name: string; is_default: boolean };

type EventRow = {

  event_id: string;

  event_date: string;

  event_type: string;

  event_status: string;

  tour_id: string | null;

  venue_id: string | null;

  venues: { event_venue_name: string | null; city: string | null } | null;

};

type SelectionMode = "range" | "individual";

type TourStatus = "planning" | "confirmed" | "completed" | "cancelled";

const statusOptions: TourStatus[] = ["planning", "confirmed", "completed", "cancelled"];



function dateLabel(value: string, language: string): string {

  const [y, m, d] = value.split("-").map(Number);

  if (!y || !m || !d) return value;

  return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));

}



function toISODate(value: Date): string {

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

}



function inputDateLabel(value: string, language: string, chooseDateLabel: string): string {
  if (!validDate(value)) return chooseDateLabel;
  const [year, month, day] = value.split("-");
  return new Intl.DateTimeFormat(language, { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
}



function validDate(value: string): boolean {

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);

  const d = new Date(year, month - 1, day);

  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;

}



export default function CreateTourScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();

  const canManage = isAdmin && adminModeEnabled;



  const [loading, setLoading] = useState(true);

  const [loadingEvents, setLoadingEvents] = useState(false);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [acts, setActs] = useState<ActRow[]>([]);

  const [selectedActId, setSelectedActId] = useState<string | null>(null);

  const [tourName, setTourName] = useState("");

  const [status, setStatus] = useState<TourStatus>("planning");

  const [notes, setNotes] = useState("");

  const [mode, setMode] = useState<SelectionMode>("range");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);

  const [pickerMonth, setPickerMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [search, setSearch] = useState("");

  const [events, setEvents] = useState<EventRow[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showReview, setShowReview] = useState(false);

  const statusLabel = (value: TourStatus) => t(`tours.status${value[0].toUpperCase()}${value.slice(1)}`);
  const eventTypeLabel = (value: string) => {
    const key = value.trim().toLowerCase();
    const translationKeys: Record<string, string> = {
      gig: "eventsAdd.typeGig",
      rehearsal: "eventsAdd.typeRehearsal",
      recording: "eventsAdd.typeRecording",
      promo: "eventsAdd.typePromo",
      meeting: "eventsAdd.typeMeeting",
      other: "eventsAdd.typeOther",
    };
    return translationKeys[key] ? t(translationKeys[key]) : value;
  };
  const eventStatusLabel = (value: string) => {
    const key = value.trim().toLowerCase();
    const translationKeys: Record<string, string> = {
      confirmed: "eventsAdd.statusConfirmed",
      provisional: "eventsAdd.statusProvisional",
      cancelled: "eventsAdd.statusCancelled",
    };
    return translationKeys[key] ? t(translationKeys[key]) : value;
  };
  const calendarMonth = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(pickerMonth);
  const calendarWeekdays = Array.from({ length: 7 }, (_, index) => (
    new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(new Date(2024, 0, index + 1))
  ));



  useEffect(() => {

    let alive = true;

    async function loadActs() {

      if (!bandId || !canManage) { setLoading(false); return; }

      const { data, error } = await supabase.from("acts")

        .select("act_id, act_name, is_default")

        .eq("band_id", bandId).order("act_name");

      if (!alive) return;

      if (error) setErrorMessage(error.message);

      else {

        const found = (data ?? []) as ActRow[];

        setActs(found);

        setSelectedActId((prev) => prev ?? (found.find((a) => a.is_default)?.act_id ?? found[0]?.act_id ?? null));

      }

      setLoading(false);

    }

    void loadActs();

    return () => { alive = false; };

  }, [bandId, canManage]);



  const loadEvents = useCallback(async () => {

    if (!bandId || !selectedActId) { setEvents([]); return; }

    setLoadingEvents(true);

    setErrorMessage(null);

    const { data, error } = await supabase.from("events")

      .select("event_id, event_date, event_type, event_status, tour_id, venue_id, venues:venue_id(event_venue_name, city)")

      .eq("band_id", bandId).eq("act_id", selectedActId)

      .is("tour_id", null)

      .order("event_date", { ascending: true });

    if (error) {

      setErrorMessage(error.message);

      setEvents([]);

    } else {

      // Deleted events must never appear in either selection mode.

      setEvents(((data ?? []) as unknown as EventRow[]).filter(

        (event) => event.event_status?.trim().toLowerCase() !== "deleted",

      ));

    }

    setLoadingEvents(false);

  }, [bandId, selectedActId]);



  useEffect(() => {

    setEvents([]);

    setSelectedIds(new Set());

    setShowReview(false);

    void loadEvents();

  }, [loadEvents]);



  const dateRangeValid = validDate(startDate) && validDate(endDate) && startDate <= endDate;

  const eligible = useMemo(() => {

    if (mode === "individual") {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return events.filter((e) => e.event_date >= today);
}

    if (!dateRangeValid) return [];

    return events.filter((e) => e.event_date >= startDate && e.event_date <= endDate);

  }, [events, mode, dateRangeValid, startDate, endDate]);

  useEffect(() => {

    if (mode === "range") setSelectedIds(new Set(eligible.map((e) => e.event_id)));

  }, [mode, startDate, endDate, events]);

  const visibleEvents = useMemo(() => {

    const term = search.trim().toLowerCase();

    if (!term) return eligible;

    return eligible.filter((e) =>

      [e.event_date, e.event_type, e.event_status, e.venues?.event_venue_name, e.venues?.city]

        .some((field) => String(field ?? "").toLowerCase().includes(term))

    );

  }, [eligible, search]);

  const selectedEvents = useMemo(() => events.filter((e) => selectedIds.has(e.event_id)), [events, selectedIds]);



  function openDatePicker(target: "start" | "end") {

    const currentValue = target === "start" ? startDate : endDate;

    // Start at the selected date, or at the From date when choosing To.
    // Otherwise open at the current month, not the first eligible event.
    const initial = validDate(currentValue)
      ? currentValue
      : target === "end" && validDate(startDate)
        ? startDate
        : null;

    if (initial && validDate(initial)) {

      const [year, month] = initial.split("-").map(Number);

      setPickerMonth(new Date(year, month - 1, 1));

    } else {

      const today = new Date();

      setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));

    }

    setPickerTarget(target);

  }



  function chooseDate(day: number) {

    const value = toISODate(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day));

    if (pickerTarget === "start") setStartDate(value);

    if (pickerTarget === "end") setEndDate(value);

    setSelectedIds(new Set());

    setShowReview(false);

    setPickerTarget(null);

  }



  function movePickerMonth(amount: number) {

    setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  }



  const firstWeekday = (pickerMonth.getDay() + 6) % 7; // Monday first.

  const daysInMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();

  const calendarCells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, i) => {

    const day = i - firstWeekday + 1;

    return day >= 1 && day <= daysInMonth ? day : null;

  });



  function changeAct(id: string) { setSelectedActId(id); }

  function changeMode(next: SelectionMode) {

    setMode(next); setSearch(""); setSelectedIds(new Set()); setShowReview(false);

  }

  function toggleEvent(id: string) {

    setSelectedIds((previous) => {

      const next = new Set(previous);

      if (next.has(id)) next.delete(id); else next.add(id);

      return next;

    });

  }

  function selectAllEligible() { setSelectedIds(new Set(eligible.map((e) => e.event_id))); }

  function clearSelection() { setSelectedIds(new Set()); }



  async function saveTour() {

    if (saving || !bandId || !selectedActId || !canManage) return;

    if (!tourName.trim()) { Alert.alert(t("tours.tourNameRequired"), t("tours.enterTourName")); return; }

    if (selectedIds.size === 0) { Alert.alert(t("tours.selectEvents"), t("tours.chooseAtLeastOneEvent")); return; }

    if (mode === "range" && !dateRangeValid) { Alert.alert(t("tours.invalidDateRange"), t("tours.chooseValidDateRange")); return; }

    setSaving(true);

    let tourId: string | null = null;

    try {

      // Check event eligibility again immediately before saving.

      const ids = Array.from(selectedIds);

      const { data: fresh, error: checkError } = await supabase.from("events")

        .select("event_id, tour_id, act_id, band_id, event_status")

        .in("event_id", ids);

      if (checkError) throw checkError;

      if ((fresh ?? []).length !== ids.length || (fresh ?? []).some((e) => e.tour_id !== null || e.act_id !== selectedActId || e.band_id !== bandId || e.event_status?.trim().toLowerCase() === "deleted")) {

        throw new Error("One or more selected events are no longer available for this tour. Refresh the list and try again.");

      }



      const { data: created, error: createError } = await supabase.from("tours")

        .insert({ band_id: bandId, act_id: selectedActId, tour_name: tourName.trim(), status, notes: notes.trim() || null })

        .select("tour_id").single();

      if (createError) throw createError;

      tourId = created.tour_id;



      // Never overwrite a tour assignment made by another administrator.

      const { data: updated, error: updateError } = await supabase.from("events")

        .update({ tour_id: tourId })

        .in("event_id", ids)

        .eq("band_id", bandId).eq("act_id", selectedActId)

        .is("tour_id", null)

        .select("event_id");

      if (updateError) throw updateError;

      if ((updated ?? []).length !== ids.length) {

        throw new Error("Not all selected events could be assigned. No completed tour was saved.");

      }

      router.replace("/tours" as any);

    } catch (error: any) {

      // Best-effort rollback. ON DELETE SET NULL (tour_id) keeps events intact.

      if (tourId) {

        const { error: rollbackError } = await supabase.from("tours").delete().eq("tour_id", tourId);

        if (rollbackError) {

          Alert.alert(t("tours.saveIncomplete"), t("tours.saveIncompleteMessage", { error: rollbackError.message }));

          setSaving(false);

          return;

        }

      }

      Alert.alert(t("tours.createError"), error?.message ?? t("tours.tryAgain"));

      void loadEvents();

    } finally {

      setSaving(false);

    }

  }



  if (!canManage) return <View style={styles.center}><Text style={styles.message}>{t("tours.adminModeRequiredCreate")}</Text></View>;



  return (

    <>

      <Stack.Screen options={{ title: t("tours.createTitle"), headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff" }} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {loading ? <ActivityIndicator /> : null}

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          {!loading && acts.length === 0 ? <Text style={styles.message}>{t("tours.createActFirst")}</Text> : null}

          <Text style={styles.sectionTitle}>{t("tours.details")}</Text>

          <Text style={styles.label}>{t("tours.name")}<Text style={styles.required}> *</Text></Text>

          <TextInput style={styles.input} value={tourName} onChangeText={setTourName} placeholder={t("tours.namePlaceholder")} maxLength={120} editable={!saving} />

            <Text style={styles.requiredHint}>{t("tours.requiredField")}</Text>



          <Text style={styles.label}>{t("tours.act")}</Text>

          <View style={styles.chips}>

            {acts.map((act) => <Pressable key={act.act_id} disabled={saving} onPress={() => changeAct(act.act_id)} style={[styles.chip, selectedActId === act.act_id && styles.chipSelected]}>

              <Text style={[styles.chipText, selectedActId === act.act_id && styles.chipTextSelected]}>{act.act_name}</Text>

            </Pressable>)}

          </View>



          <Text style={styles.label}>{t("tours.status")}</Text>

          <View style={styles.chips}>

            {statusOptions.map((s) => <Pressable key={s} disabled={saving} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipSelected]}>

              <Text style={[styles.chipText, status === s && styles.chipTextSelected]}>{statusLabel(s)}</Text>

            </Pressable>)}

          </View>

          <Text style={styles.label}>{t("tours.notesOptional")}</Text>

          <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder={t("tours.notesPlaceholder")} editable={!saving} />



          <Text style={styles.sectionTitle}>{t("tours.chooseExistingEvents")}</Text>

          <View style={styles.modeRow}>

            <Pressable style={[styles.modeButton, mode === "range" && styles.modeSelected]} onPress={() => changeMode("range")} disabled={saving}>

              <Text style={[styles.modeText, mode === "range" && styles.modeTextSelected]}>{t("tours.dateRange")}</Text>

            </Pressable>

            <Pressable style={[styles.modeButton, mode === "individual" && styles.modeSelected]} onPress={() => changeMode("individual")} disabled={saving}>

              <Text style={[styles.modeText, mode === "individual" && styles.modeTextSelected]}>{t("tours.individualEvents")}</Text>

            </Pressable>

          </View>

          {mode === "range" ? (

            <>

              <View style={styles.dateRow}>

                <View style={styles.dateField}>

                  <Text style={styles.label}>{t("tours.from")}</Text>

                  <Pressable accessibilityRole="button" accessibilityLabel={t("tours.chooseStartDate")} disabled={saving} onPress={() => openDatePicker("start")} style={styles.datePickerButton}>

                    <Text style={[styles.datePickerText, !startDate && styles.datePlaceholder]}>{inputDateLabel(startDate, i18n.language, t("tours.chooseDate"))}</Text>

                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />

                  </Pressable>

                </View>

                <View style={styles.dateField}>

                  <Text style={styles.label}>{t("tours.to")}</Text>

                  <Pressable accessibilityRole="button" accessibilityLabel={t("tours.chooseEndDate")} disabled={saving} onPress={() => openDatePicker("end")} style={styles.datePickerButton}>

                    <Text style={[styles.datePickerText, !endDate && styles.datePlaceholder]}>{inputDateLabel(endDate, i18n.language, t("tours.chooseDate"))}</Text>

                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />

                  </Pressable>

                </View>

              </View>

              {!dateRangeValid ? <Text style={styles.hint}>{t("tours.dateRangeHint")}</Text> : null}

            </>

          ) : null}

          <Text style={styles.hint}>{t("tours.eventAvailabilityHint")}</Text>

          <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder={t("tours.searchEventsPlaceholder")} autoCapitalize="none" />

          <View style={styles.toolbar}>

            <Text style={styles.count}>{t("tours.eligibleSelected", { eligible: eligible.length, selected: selectedIds.size })}</Text>

            <Pressable onPress={selectAllEligible} disabled={saving || eligible.length === 0}><Text style={styles.actionText}>{t("tours.selectAll")}</Text></Pressable>

            <Pressable onPress={clearSelection} disabled={saving}><Text style={styles.actionText}>{t("tours.clear")}</Text></Pressable>

          </View>

          {loadingEvents ? <ActivityIndicator /> : visibleEvents.length === 0 ? <Text style={styles.hint}>{t("tours.noMatchingEvents")}</Text> : (

            <View style={styles.eventList}>

              {visibleEvents.map((e) => (

                <Pressable key={e.event_id} disabled={saving} onPress={() => toggleEvent(e.event_id)} style={styles.eventRow}>

                  <Ionicons name={selectedIds.has(e.event_id) ? "checkbox" : "square-outline"} size={24} color={colors.primary} />

                  <View style={styles.eventInfo}>

                    <Text style={styles.eventName}>{e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>
                    <Text style={styles.eventMeta}>{dateLabel(e.event_date, i18n.language)} · {e.venues?.city || t("tours.locationToBeConfirmed")}</Text>
                    <Text style={styles.eventMeta}>{eventTypeLabel(e.event_type)} · {eventStatusLabel(e.event_status)}</Text>

                  </View>

                </Pressable>

              ))}

            </View>

          )}

          <Pressable onPress={() => setShowReview((v) => !v)} style={styles.reviewButton} disabled={selectedIds.size === 0 || saving}>

            <Text style={styles.reviewText}>{showReview ? t("tours.hideReview") : t(selectedIds.size === 1 ? "tours.reviewSelectedEvents_one" : "tours.reviewSelectedEvents_other", { count: selectedIds.size })}</Text>

          </Pressable>

          {showReview ? <View style={styles.review}>

            <Text style={styles.sectionTitle}>{t("tours.reviewTour")}</Text>

            <Text style={styles.hint}>{tourName.trim() || t("tours.unnamedTour")} · {acts.find((a) => a.act_id === selectedActId)?.act_name ?? ""}</Text>

            {selectedEvents.map((e) => <Text key={e.event_id} style={styles.reviewLine}>• {dateLabel(e.event_date, i18n.language)} — {e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>)}

          </View> : null}

          <Pressable onPress={() => void saveTour()} disabled={saving || loading || loadingEvents || !selectedActId || !tourName.trim() || selectedIds.size === 0} style={[styles.saveButton, (saving || !selectedActId || !tourName.trim() || selectedIds.size === 0) && styles.disabled]}>

            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t("tours.saveTour")}</Text>}

          </Pressable>

          <Text style={styles.hint}>{t("tours.createLineupHint")}</Text>

        </ScrollView>

      </KeyboardAvoidingView>

      <Modal visible={pickerTarget !== null} transparent animationType="fade" onRequestClose={() => setPickerTarget(null)}>

        <View style={styles.modalOverlay}>

          <View style={styles.calendarModal}>

            <View style={styles.calendarTitleRow}>

              <Text style={styles.calendarTitle}>{pickerTarget === "start" ? t("tours.fromDate") : t("tours.toDate")}</Text>

              <Pressable onPress={() => setPickerTarget(null)} hitSlop={10} accessibilityLabel={t("tours.closeCalendar")}>

                <Ionicons name="close" size={25} color="#555" />

              </Pressable>

            </View>

            <View style={styles.calendarNav}>

              <Pressable onPress={() => movePickerMonth(-12)} style={styles.calendarArrow} accessibilityLabel={t("tours.previousYear")}><Ionicons name="chevron-back" size={16} color={colors.primary} /><Ionicons name="chevron-back" size={16} color={colors.primary} /></Pressable>

              <Pressable onPress={() => movePickerMonth(-1)} style={styles.calendarArrow} accessibilityLabel={t("tours.previousMonth")}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>

              <Text style={styles.calendarMonth}>{calendarMonth}</Text>

              <Pressable onPress={() => movePickerMonth(1)} style={styles.calendarArrow} accessibilityLabel={t("tours.nextMonth")}><Ionicons name="chevron-forward" size={22} color={colors.primary} /></Pressable>

              <Pressable onPress={() => movePickerMonth(12)} style={styles.calendarArrow} accessibilityLabel={t("tours.nextYear")}><Ionicons name="chevron-forward" size={16} color={colors.primary} /><Ionicons name="chevron-forward" size={16} color={colors.primary} /></Pressable>

            </View>

            <View style={styles.calendarGrid}>
              <View style={styles.calendarWeekRow}>
                {calendarWeekdays.map((day, i) => (
                  <View key={`heading-${i}`} style={styles.calendarDay}>
                    <Text style={styles.calendarWeekday}>{day}</Text>
                  </View>
                ))}
              </View>
              {Array.from({ length: calendarCells.length / 7 }, (_, week) => (
                <View key={`week-${week}`} style={styles.calendarWeekRow}>
                  {calendarCells.slice(week * 7, week * 7 + 7).map((day, i) => {
                    const iso = day
                      ? toISODate(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day))
                      : "";
                    const chosen = iso !== "" && iso === (pickerTarget === "start" ? startDate : endDate);
                    return (
                      <View key={`cell-${week}-${i}`} style={styles.calendarDay}>
                        {day ? (
                          <Pressable
                            onPress={() => chooseDate(day)}
                            style={[styles.calendarDayButton, chosen && styles.calendarDaySelected]}
                            accessibilityLabel={t("tours.chooseCalendarDate", { day, month: calendarMonth })}
                          >
                            <Text style={[styles.calendarDayText, chosen && styles.calendarSelectedText]}>{day}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <Text style={styles.calendarHelp}>{t("tours.calendarHelp")}</Text>

          </View>

        </View>

      </Modal>

    </>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#fff" },

  content: { padding: 16, paddingBottom: 50, gap: 8 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  message: { fontSize: 14, color: "#555" },

  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginTop: 14, marginBottom: 4 },

  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 5 },

  required: { color: "#C62828" },

  requiredHint: { fontSize: 11, color: "#666", marginTop: -4 },

  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: "#222", backgroundColor: "#fff" },

  notes: { height: 80 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 9 },

  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  chipText: { color: "#444", fontSize: 13, fontWeight: "700" },

  chipTextSelected: { color: "#fff" },

  modeRow: { flexDirection: "row", gap: 10 },

  modeButton: { flex: 1, alignItems: "center", paddingVertical: 12, borderWidth: 1, borderColor: colors.primary, borderRadius: 10 },

  modeSelected: { backgroundColor: colors.primary },

  modeText: { fontSize: 13, fontWeight: "800", color: colors.primary },

  modeTextSelected: { color: "#fff" },

  dateRow: { flexDirection: "row", gap: 10 },

  dateField: { flex: 1 },

  datePickerButton: { minHeight: 48, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4, backgroundColor: "#fff" },

  datePickerText: { color: "#222", fontSize: 14, flexShrink: 1 },

  datePlaceholder: { color: "#888" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 18 },

  calendarModal: { backgroundColor: "#fff", borderRadius: 16, padding: 16, width: "100%", maxWidth: 400 },

  calendarTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },

  calendarTitle: { fontSize: 18, fontWeight: "800", color: "#222" },

  calendarNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

  calendarArrow: { flexDirection: "row", alignItems: "center", justifyContent: "center", minWidth: 32, minHeight: 40 },

  calendarMonth: { flex: 1, fontSize: 15, fontWeight: "800", textAlign: "center", color: "#222" },

  calendarGrid: { width: "100%" },

  calendarWeekRow: { flexDirection: "row", width: "100%" },

  calendarDay: { flex: 1, minWidth: 0, minHeight: 43, alignItems: "center", justifyContent: "center" },

  calendarWeekday: { fontSize: 12, color: "#666", fontWeight: "800" },

  calendarDayButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },

  calendarDaySelected: { backgroundColor: colors.primary },

  calendarDayText: { color: "#222", fontSize: 14 },

  calendarSelectedText: { color: "#fff", fontWeight: "800" },

  calendarHelp: { marginTop: 10, color: "#666", fontSize: 12, textAlign: "center" },

  hint: { fontSize: 12, color: "#666", marginVertical: 6 },

  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginVertical: 7 },

  count: { fontSize: 12, color: "#333", fontWeight: "700", flex: 1 },

  actionText: { fontSize: 12, color: colors.primary, fontWeight: "800" },

  eventList: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, overflow: "hidden" },

  eventRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },

  eventInfo: { flex: 1 },

  eventName: { fontSize: 14, color: "#222", fontWeight: "800" },

  eventMeta: { fontSize: 12, color: "#666", marginTop: 2 },

  reviewButton: { borderRadius: 10, borderWidth: 1, borderColor: colors.primary, padding: 12, alignItems: "center", marginTop: 10 },

  reviewText: { color: colors.primary, fontWeight: "800" },

  review: { borderRadius: 10, padding: 12, backgroundColor: "#f6f6f6" },

  reviewLine: { fontSize: 13, color: "#333", marginTop: 6 },

  saveButton: { backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", padding: 15, marginTop: 14 },

  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  disabled: { opacity: 0.45 },

  error: { fontSize: 13, color: "#c62828", marginVertical: 8 },

});
