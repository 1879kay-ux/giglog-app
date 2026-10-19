// app/tours/[id]/edit.tsx
// Edit tour details and event membership independently of Act and Event line-ups.

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

type TourStatus = "planning" | "confirmed" | "completed" | "cancelled";
type SelectionMode = "range" | "individual";
type EventRow = {
  event_id: string;
  event_date: string;
  event_type: string;
  event_status: string;
  tour_id: string | null;
  venues: { event_venue_name: string | null; city: string | null } | null;
};
type TourRow = {
  tour_id: string;
  band_id: string;
  act_id: string;
  tour_name: string;
  status: string;
  notes: string | null;
};

const statusOptions: TourStatus[] = ["planning", "confirmed", "completed", "cancelled"];
const isDeleted = (status: string) => status?.trim().toLowerCase() === "deleted";
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function displayDate(value: string, language: string, chooseDateLabel: string) {
  if (!validDate(value)) return chooseDateLabel;
  const [year, month, day] = value.split("-");
  return new Intl.DateTimeFormat(language, { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
}
function eventDateLabel(value: string, language: string) {
  if (!validDate(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}

export default function EditTourScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { bandId, isAdmin, adminModeEnabled } = useCurrentMember();
  const canManage = isAdmin && adminModeEnabled;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tour, setTour] = useState<TourRow | null>(null);
  const [actName, setActName] = useState<string | null>(null);
  const [tourName, setTourName] = useState("");
  const [status, setStatus] = useState<TourStatus>("planning");
  const [notes, setNotes] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<SelectionMode>("range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showReview, setShowReview] = useState(false);

  const load = useCallback(async () => {
    if (!tourId || !bandId || !canManage) { setLoading(false); return; }
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: tourData, error: tourError } = await supabase.from("tours")
        .select("tour_id, band_id, act_id, tour_name, status, notes")
        .eq("tour_id", tourId).eq("band_id", bandId).single();
      if (tourError) throw tourError;
      const row = tourData as TourRow;
      const { data: actData, error: actError } = await supabase.from("acts")
        .select("act_name").eq("act_id", row.act_id).eq("band_id", bandId).single();
      if (actError) throw actError;
      const { data: eventData, error: eventError } = await supabase.from("events")
        .select("event_id, event_date, event_type, event_status, tour_id, venues:venue_id(event_venue_name, city)")
        .eq("band_id", bandId).eq("act_id", row.act_id)
        .order("event_date", { ascending: true });
      if (eventError) throw eventError;
      // Retain all current tour events (even old/deleted ones so they may be removed).
      // Only unrelated events that are unassigned and not deleted may be added.
      const candidates = ((eventData ?? []) as unknown as EventRow[]).filter(
        (event) => event.tour_id === tourId || (event.tour_id === null && !isDeleted(event.event_status)),
      );
      const assigned = new Set(candidates.filter((event) => event.tour_id === tourId).map((event) => event.event_id));
      setTour(row);
      setActName(actData?.act_name ?? null);
      setTourName(row.tour_name);
      setStatus(statusOptions.includes(row.status as TourStatus) ? row.status as TourStatus : "planning");
      setNotes(row.notes ?? "");
      setEvents(candidates);
      setOriginalIds(assigned);
      setSelectedIds(new Set(assigned));
      setStartDate(""); setEndDate(""); setMode("range"); setShowReview(false);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t("tours.loadOverviewError"));
    } finally {
      setLoading(false);
    }
  }, [tourId, bandId, canManage, t]);

  useEffect(() => { void load(); }, [load]);

  const existingEvents = useMemo(() => events.filter((e) => originalIds.has(e.event_id)), [events, originalIds]);
  const dateRangeValid = validDate(startDate) && validDate(endDate) && startDate <= endDate;
  const addableEvents = useMemo(() => {
    const unassigned = events.filter((e) => e.tour_id === null && !isDeleted(e.event_status));
    if (mode === "individual") {
      const today = isoDate(new Date());
      return unassigned.filter((e) => e.event_date >= today);
    }
    if (!dateRangeValid) return [];
    return unassigned.filter((e) => e.event_date >= startDate && e.event_date <= endDate);
  }, [events, mode, dateRangeValid, startDate, endDate]);

  // Date-range selection adds matching events; it does not undo explicit removals
  // from the existing tour or overwrite any user's manual deselections.
  useEffect(() => {
    if (mode !== "range" || !dateRangeValid) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const event of addableEvents) next.add(event.event_id);
      return next;
    });
  // Only fire on change to range/mode or loaded events, not on checkbox changes.
  }, [mode, startDate, endDate, events]);

  const visibleAddable = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return addableEvents;
    return addableEvents.filter((e) =>
      [e.event_date, e.event_type, e.event_status, e.venues?.event_venue_name, e.venues?.city]
        .some((v) => String(v ?? "").toLowerCase().includes(term)),
    );
  }, [addableEvents, search]);
  const added = useMemo(() => events.filter((e) => selectedIds.has(e.event_id) && !originalIds.has(e.event_id)), [events, selectedIds, originalIds]);
  const removed = useMemo(() => events.filter((e) => originalIds.has(e.event_id) && !selectedIds.has(e.event_id)), [events, selectedIds, originalIds]);
  const finalEvents = useMemo(() => events.filter((e) => selectedIds.has(e.event_id)), [events, selectedIds]);
  const statusLabel = (value: TourStatus) => t(`tours.status${value[0].toUpperCase()}${value.slice(1)}`);
  const eventTypeLabel = (value: string) => {
    const translationKeys: Record<string, string> = {
      gig: "eventsIndex.typeGig",
      rehearsal: "eventsIndex.typeRehearsal",
      recording: "eventsIndex.typeRecording",
      promo: "eventsIndex.typePromo",
      meeting: "eventsIndex.typeMeeting",
      other: "eventsIndex.typeOther",
    };
    return translationKeys[value.trim().toLowerCase()] ? t(translationKeys[value.trim().toLowerCase()]) : t("eventsIndex.typeOther");
  };
  const eventStatusLabel = (value: string) => {
    const translationKeys: Record<string, string> = {
      confirmed: "eventsIndex.statusConfirmed",
      provisional: "eventsIndex.statusProvisional",
      cancelled: "eventsIndex.statusCancelled",
      deleted: "eventsIndex.statusDeleted",
    };
    return translationKeys[value.trim().toLowerCase()] ? t(translationKeys[value.trim().toLowerCase()]) : t("eventsIndex.statusUnknown");
  };
  const calendarMonth = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(pickerMonth);
  const calendarWeekdays = Array.from({ length: 7 }, (_, index) => (
    new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(new Date(2024, 0, index + 1))
  ));

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setShowReview(false);
  }
  function openPicker(target: "start" | "end") {
    const value = target === "start" ? startDate : endDate;
    const initial = validDate(value) ? value : target === "end" && validDate(startDate) ? startDate : "";
    if (initial) {
      const [year, month] = initial.split("-").map(Number);
      setPickerMonth(new Date(year, month - 1, 1));
    } else {
      const today = new Date();
      setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    setPickerTarget(target);
  }
  function chooseDate(day: number) {
    const value = isoDate(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day));
    if (pickerTarget === "start") setStartDate(value);
    if (pickerTarget === "end") setEndDate(value);
    setShowReview(false);
    setPickerTarget(null);
  }
  const firstWeekday = (pickerMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  async function doSave() {
    if (!tour || !bandId || !canManage || saving) return;
    if (!tourName.trim()) { Alert.alert(t("tours.tourNameRequired"), t("tours.enterTourName")); return; }
    setSaving(true);
    const addedIds = added.map((e) => e.event_id);
    const removedIds = removed.map((e) => e.event_id);
    let addedApplied = false;
    let removedApplied = false;
    try {
      // Verify membership has not been changed elsewhere before applying edits.
      const { data: fresh, error: checkError } = await supabase.from("events")
        .select("event_id, tour_id, act_id, band_id, event_status")
        .or(`tour_id.eq.${tour.tour_id},event_id.in.(${addedIds.length ? addedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .eq("band_id", bandId);
      if (checkError) throw checkError;
      const freshRows = fresh ?? [];
      const freshExisting = new Set(freshRows.filter((e) => e.tour_id === tour.tour_id).map((e) => e.event_id));
      if (freshExisting.size !== originalIds.size || [...originalIds].some((id) => !freshExisting.has(id))) {
        throw new Error(t("tours.eventsChangedElsewhere"));
      }
      if (addedIds.some((id) => !freshRows.some((e) => e.event_id === id && e.tour_id === null && e.act_id === tour.act_id && !isDeleted(e.event_status)))) {
        throw new Error(t("tours.eventsNoLongerAvailable"));
      }

      if (addedIds.length) {
        const { data, error } = await supabase.from("events").update({ tour_id: tour.tour_id })
          .in("event_id", addedIds).eq("band_id", bandId).eq("act_id", tour.act_id)
          .is("tour_id", null).select("event_id");
        if (error) throw error;
        addedApplied = true;
        if ((data ?? []).length !== addedIds.length) throw new Error(t("tours.eventAdditionsIncomplete"));
      }
      if (removedIds.length) {
        const { data, error } = await supabase.from("events").update({ tour_id: null })
          .in("event_id", removedIds).eq("band_id", bandId)
          .eq("tour_id", tour.tour_id).select("event_id");
        if (error) throw error;
        removedApplied = true;
        if ((data ?? []).length !== removedIds.length) throw new Error(t("tours.eventRemovalsIncomplete"));
      }
      const { data: updatedTour, error: updateError } = await supabase.from("tours")
        .update({ tour_name: tourName.trim(), status, notes: notes.trim() || null })
        .eq("tour_id", tour.tour_id).eq("band_id", bandId).select("tour_id");
      if (updateError) throw updateError;
      if (updatedTour?.length !== 1) throw new Error(t("tours.detailsNotUpdated"));
      router.replace(`/tours/${tour.tour_id}` as any);
    } catch (error: any) {
      // Compensating rollback: not a database transaction. If rollback fails, warn.
      const failures: string[] = [];
      if (removedApplied && removedIds.length) {
        const { error: rollbackError } = await supabase.from("events")
          .update({ tour_id: tour.tour_id }).in("event_id", removedIds).is("tour_id", null);
        if (rollbackError) failures.push(t("tours.restoreRemovedEvents", { error: rollbackError.message }));
      }
      if (addedApplied && addedIds.length) {
        const { error: rollbackError } = await supabase.from("events")
          .update({ tour_id: null }).in("event_id", addedIds).eq("tour_id", tour.tour_id);
        if (rollbackError) failures.push(t("tours.restoreAddedEvents", { error: rollbackError.message }));
      }
      Alert.alert(failures.length ? t("tours.saveIncomplete") : t("tours.updateError"),
        `${error?.message ?? t("tours.tryAgain")}${failures.length ? t("tours.updateCleanupFailed", { failures: failures.join("; ") }) : ""}`);
      if (!failures.length) void load();
    } finally {
      setSaving(false);
    }
  }

  function saveTour() {
    if (removed.length > 0) {
      Alert.alert(t("tours.removeEventsConfirmationTitle"),
        t(removed.length === 1 ? "tours.removeEventsConfirmationMessage_one" : "tours.removeEventsConfirmationMessage_other", { count: removed.length }),
        [{ text: t("common.cancel"), style: "cancel" }, { text: t("tours.saveChanges"), onPress: () => void doSave() }]);
    } else void doSave();
  }

  if (!tourId) return <View style={styles.center}><Text>{t("tours.missingTourId")}</Text></View>;
  if (!canManage) return <View style={styles.center}><Text>{t("tours.adminModeRequiredEdit")}</Text></View>;
  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (errorMessage && !tour) return <View style={styles.center}><Text style={styles.error}>{errorMessage}</Text><Pressable onPress={() => void load()}><Text style={styles.action}>{t("tours.tryAgain")}</Text></Pressable></View>;

  return (
    <>
      <Stack.Screen options={{ title: t("tours.editTitle"), headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff" }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Text style={styles.sectionTitle}>{t("tours.details")}</Text>
          <Text style={styles.label}>{t("tours.name")}<Text style={styles.required}> *</Text></Text>
          <TextInput style={styles.input} value={tourName} onChangeText={setTourName} editable={!saving} maxLength={120} />
          <Text style={styles.requiredHint}>{t("tours.requiredField")}</Text>
          <Text style={styles.label}>{t("tours.act")}</Text>
          <View style={styles.readOnly}><Text style={styles.readOnlyText}>{actName ?? t("tours.unknownAct")}</Text><Ionicons name="lock-closed-outline" size={16} color="#777" /></View>
          <Text style={styles.hint}>{t("tours.actCannotChange")}</Text>
          <Text style={styles.label}>{t("tours.status")}</Text>
          <View style={styles.chips}>{statusOptions.map((s) => (
            <Pressable key={s} disabled={saving} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipSelected]}>
              <Text style={[styles.chipText, status === s && styles.chipTextSelected]}>{statusLabel(s)}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.label}>{t("tours.notesOptional")}</Text>
          <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline textAlignVertical="top" editable={!saving} />

          <Text style={styles.sectionTitle}>{t("tours.eventsCurrentlyInTour")}</Text>
          <Text style={styles.hint}>{t("tours.removeEventHint")}</Text>
          {existingEvents.length === 0 ? <Text style={styles.hint}>{t("tours.noEventsAssignedYet")}</Text> : (
            <View style={styles.eventList}>{existingEvents.map((e) => (
              <Pressable key={e.event_id} disabled={saving} onPress={() => toggle(e.event_id)} style={styles.eventRow}>
                <Ionicons name={selectedIds.has(e.event_id) ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>
                  <Text style={styles.eventMeta}>{eventDateLabel(e.event_date, i18n.language)} · {e.venues?.city || t("tours.locationToBeConfirmed")}</Text>
                  <Text style={styles.eventMeta}>{eventTypeLabel(e.event_type)} · {eventStatusLabel(e.event_status)}</Text>
                </View>
              </Pressable>
            ))}</View>
          )}

          <Text style={styles.sectionTitle}>{t("tours.addEventsToTour")}</Text>
          <View style={styles.modeRow}>
            <Pressable disabled={saving} onPress={() => { setMode("range"); setSearch(""); }} style={[styles.modeButton, mode === "range" && styles.modeSelected]}>
              <Text style={[styles.modeText, mode === "range" && styles.modeTextSelected]}>{t("tours.dateRange")}</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={() => { setMode("individual"); setSearch(""); }} style={[styles.modeButton, mode === "individual" && styles.modeSelected]}>
              <Text style={[styles.modeText, mode === "individual" && styles.modeTextSelected]}>{t("tours.individualEvents")}</Text>
            </Pressable>
          </View>
          {mode === "range" ? (
            <View style={styles.dateRow}>
              <View style={styles.dateField}><Text style={styles.label}>{t("tours.from")}</Text>
                <Pressable accessibilityLabel={t("tours.chooseStartDate")} onPress={() => openPicker("start")} style={styles.datePickerButton} disabled={saving}>
                  <Text style={[styles.datePickerText, !startDate && styles.datePlaceholder]}>{displayDate(startDate, i18n.language, t("tours.chooseDate"))}</Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>
              <View style={styles.dateField}><Text style={styles.label}>{t("tours.to")}</Text>
                <Pressable accessibilityLabel={t("tours.chooseEndDate")} onPress={() => openPicker("end")} style={styles.datePickerButton} disabled={saving}>
                  <Text style={[styles.datePickerText, !endDate && styles.datePlaceholder]}>{displayDate(endDate, i18n.language, t("tours.chooseDate"))}</Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          ) : null}
          {mode === "range" && !dateRangeValid ? <Text style={styles.hint}>{t("tours.editDateRangeHint")}</Text> : null}
          <Text style={styles.hint}>{t("tours.editEventAvailabilityHint")}</Text>
          <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder={t("tours.searchEventsPlaceholder")} autoCapitalize="none" editable={!saving} />
          <View style={styles.toolbar}>
            <Text style={styles.count}>{t("tours.eligibleToAdd", { eligible: addableEvents.length, added: added.length })}</Text>
            <Pressable disabled={saving || addableEvents.length === 0} onPress={() => setSelectedIds((prev) => new Set([...prev, ...addableEvents.map((e) => e.event_id)]))}>
              <Text style={styles.action}>{t("tours.selectAll")}</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={() => setSelectedIds((prev) => { const next = new Set(prev); for (const e of addableEvents) next.delete(e.event_id); return next; })}>
              <Text style={styles.action}>{t("tours.clear")}</Text>
            </Pressable>
          </View>
          {visibleAddable.length === 0 ? <Text style={styles.hint}>{t("tours.noMatchingEvents")}</Text> : (
            <View style={styles.eventList}>{visibleAddable.map((e) => (
              <Pressable key={e.event_id} disabled={saving} onPress={() => toggle(e.event_id)} style={styles.eventRow}>
                <Ionicons name={selectedIds.has(e.event_id) ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>
                  <Text style={styles.eventMeta}>{eventDateLabel(e.event_date, i18n.language)} · {e.venues?.city || t("tours.locationToBeConfirmed")}</Text>
                  <Text style={styles.eventMeta}>{eventTypeLabel(e.event_type)} · {eventStatusLabel(e.event_status)}</Text>
                </View>
              </Pressable>
            ))}</View>
          )}
          <Pressable disabled={saving} style={styles.reviewButton} onPress={() => setShowReview((prev) => !prev)}>
            <Text style={styles.reviewText}>{showReview ? t("tours.hideReview") : t("tours.reviewChanges")}</Text>
          </Pressable>
          {showReview ? (
            <View style={styles.review}>
              <Text style={styles.reviewTitle}>{t(finalEvents.length === 1 ? "tours.afterSavingEventCount_one" : "tours.afterSavingEventCount_other", { count: finalEvents.length })}</Text>
              <Text style={styles.hint}>{t("tours.reviewChangeSummary", { added: added.length, removed: removed.length })}</Text>
              {finalEvents.map((e) => <Text key={e.event_id} style={styles.reviewLine}>• {eventDateLabel(e.event_date, i18n.language)} — {e.venues?.event_venue_name || t("tours.venueToBeConfirmed")}</Text>)}
            </View>
          ) : null}
          <Pressable disabled={saving || !tourName.trim()} onPress={saveTour} style={[styles.saveButton, (saving || !tourName.trim()) && styles.disabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t("tours.saveChanges")}</Text>}
          </Pressable>
          <Text style={styles.hint}>{t("tours.editingProtectionHint")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={pickerTarget !== null} transparent animationType="fade" onRequestClose={() => setPickerTarget(null)}>
        <View style={styles.modalOverlay}><View style={styles.calendarModal}>
          <View style={styles.calendarTitleRow}>
            <Text style={styles.calendarTitle}>{pickerTarget === "start" ? t("tours.fromDate") : t("tours.toDate")}</Text>
            <Pressable accessibilityLabel={t("tours.closeCalendar")} onPress={() => setPickerTarget(null)} hitSlop={10}><Ionicons name="close" size={25} color="#555" /></Pressable>
          </View>
          <View style={styles.calendarNav}>
            <Pressable onPress={() => setPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() - 12, 1))} style={styles.calendarArrow} accessibilityLabel={t("tours.previousYear")}><Ionicons name="chevron-back" size={16} color={colors.primary} /><Ionicons name="chevron-back" size={16} color={colors.primary} /></Pressable>
            <Pressable onPress={() => setPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={styles.calendarArrow} accessibilityLabel={t("tours.previousMonth")}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>
            <Text style={styles.calendarMonth}>{calendarMonth}</Text>
            <Pressable onPress={() => setPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={styles.calendarArrow} accessibilityLabel={t("tours.nextMonth")}><Ionicons name="chevron-forward" size={22} color={colors.primary} /></Pressable>
            <Pressable onPress={() => setPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() + 12, 1))} style={styles.calendarArrow} accessibilityLabel={t("tours.nextYear")}><Ionicons name="chevron-forward" size={16} color={colors.primary} /><Ionicons name="chevron-forward" size={16} color={colors.primary} /></Pressable>
          </View>
          <View style={styles.calendarGrid}>
            <View style={styles.calendarWeekRow}>{calendarWeekdays.map((day, i) => <View key={`head-${i}`} style={styles.calendarDay}><Text style={styles.calendarWeekday}>{day}</Text></View>)}</View>
            {Array.from({ length: cells.length / 7 }, (_, week) => <View key={`week-${week}`} style={styles.calendarWeekRow}>
              {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                const chosen = Boolean(day) && isoDate(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day ?? 1)) === (pickerTarget === "start" ? startDate : endDate);
                return <View key={`cell-${week}-${i}`} style={styles.calendarDay}>{day ? (
                  <Pressable accessibilityLabel={t("tours.chooseCalendarDate", { day: day ?? undefined, month: calendarMonth })} onPress={() => chooseDate(day ?? 1)} style={[styles.calendarDayButton, chosen && styles.calendarDaySelected]}>
                    <Text style={[styles.calendarDayText, chosen && styles.calendarSelectedText]}>{day}</Text>
                  </Pressable>
                ) : null}</View>;
              })}
            </View>)}
          </View>
          <Text style={styles.calendarHelp}>{t("tours.calendarHelp")}</Text>
        </View></View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 50, gap: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginTop: 14, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 5 },
  required: { color: "#C62828" },
  requiredHint: { fontSize: 11, color: "#666", marginTop: -4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: "#222", backgroundColor: "#fff" },
  readOnly: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#f5f5f5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  readOnlyText: { fontSize: 14, color: "#555", fontWeight: "700" },
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
  action: { fontSize: 12, color: colors.primary, fontWeight: "800" },
  eventList: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, overflow: "hidden" },
  eventRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, color: "#222", fontWeight: "800" },
  eventMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  reviewButton: { borderRadius: 10, borderWidth: 1, borderColor: colors.primary, padding: 12, alignItems: "center", marginTop: 10 },
  reviewText: { color: colors.primary, fontWeight: "800" },
  review: { borderRadius: 10, padding: 12, backgroundColor: "#f6f6f6" },
  reviewTitle: { fontSize: 14, fontWeight: "800", color: "#222" },
  reviewLine: { fontSize: 13, color: "#333", marginTop: 6 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", padding: 15, marginTop: 14 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  error: { fontSize: 13, color: "#C62828", marginVertical: 8 },
});
