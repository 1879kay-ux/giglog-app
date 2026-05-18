// app/events/accommodation.tsx

import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  unstable_createElement,
  View,
} from "react-native";

function toLocalInputString(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

type AccommodationRow = {
  id: string;
  event_id: string;

  name: string;
  address_line: string | null;
  postcode: string | null;

  check_in_at: string;
  check_out_at: string;

  rooms_count: number | null;
  total_cost: number | null;

  booked_under_name: string | null;
  booking_reference: string | null;

  breakfast_included: boolean;
  parking_available: boolean;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  booked_under_name: string;
  booking_reference: string;

  address_line: string;
  postcode: string;

  check_in_at: string;
  check_out_at: string;

  rooms_count: string;
  total_cost: string;

  breakfast_included: boolean;
  parking_available: boolean;

  notes: string;
};

type AccommodationSuggestion = {
  name: string;
  address_line: string | null;
  postcode: string | null;
  breakfast_included: boolean;
  parking_available: boolean;
  notes: string | null;
};

function isoNowPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function toIntOrNull(s: string) {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, n);
}

function toMoneyOrNull(s: string) {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  if (Number.isNaN(n)) return null;
  return Math.max(0, n);
}

/* -----------------------------
   ANDROID DATE+TIME (two-step)
------------------------------*/
function openAndroidDateTimePicker(
  valueIso: string,
  onChangeIso: (iso: string) => void,
) {
  const initial = new Date(valueIso);

  // Step 1: date
  DateTimePickerAndroid.open({
    value: initial,
    mode: "date",
    onChange: (event, dateSelected) => {
      if (event.type === "dismissed" || !dateSelected) return;

      // Carry across existing time from initial
      const withDate = new Date(initial);
      withDate.setFullYear(
        dateSelected.getFullYear(),
        dateSelected.getMonth(),
        dateSelected.getDate(),
      );

      // Step 2: time
      DateTimePickerAndroid.open({
        value: withDate,
        mode: "time",
        is24Hour: true,
        onChange: (event2, timeSelected) => {
          if (event2.type === "dismissed" || !timeSelected) return;

          const finalDt = new Date(withDate);
          finalDt.setHours(
            timeSelected.getHours(),
            timeSelected.getMinutes(),
            0,
            0,
          );

          onChangeIso(finalDt.toISOString());
        },
      });
    },
  });
}

/* -----------------------------
   WEB DATE + TIME (split inputs)
------------------------------*/
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function WebDateTimeSplit({
  valueIso,
  onChangeIso,
  disabled,
}: {
  valueIso: string;
  onChangeIso: (iso: string) => void;
  disabled: boolean;
}) {
  const d = new Date(valueIso);
  const dateValue = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const timeValue = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  function setDatePart(yyyyMmDd: string) {
    const [y, m, day] = yyyyMmDd.split("-").map(Number);
    if (!y || !m || !day) return;
    const next = new Date(valueIso);
    next.setFullYear(y, m - 1, day);
    onChangeIso(next.toISOString());
  }

  function setTimePart(hhmm: string) {
    const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    if (hh < 0 || hh > 23) return;
    if (mm < 0 || mm > 59) return;

    const next = new Date(valueIso);
    next.setHours(hh, mm, 0, 0);
    onChangeIso(next.toISOString());
  }

  return (
    <View style={styles.webDateRow}>
      {unstable_createElement("input", {
        type: "date",
        value: dateValue,
        disabled,
        onChange: (e: any) => setDatePart(e?.target?.value),
        style: styles.webDateInput as any,
      })}

      {unstable_createElement("input", {
        type: "time",
        value: timeValue,
        disabled,
        step: 300,
        onChange: (e: any) => setTimePart(e?.target?.value),
        style: styles.webTimeInput as any,
      })}
    </View>
  );
}

export default function EventAccommodationEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { isAdmin } = useCurrentMember();
  const canEdit = isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // iOS only (Android uses imperative picker)
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const [row, setRow] = useState<AccommodationRow | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    booked_under_name: "",
    booking_reference: "",

    address_line: "",
    postcode: "",

    check_in_at: isoNowPlus(0),
    check_out_at: isoNowPlus(1),

    rooms_count: "",
    total_cost: "",

    breakfast_included: false,
    parking_available: false,

    notes: "",
  });

  // ---- Name suggestions ----
  const [nameQuery, setNameQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AccommodationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      // RLS should already restrict rows to the user's band membership.
      const { data, error } = await supabase
        .from("accommodation")
        .select(
          "name,address_line,postcode,breakfast_included,parking_available,notes,updated_at,event_id",
        )
        .ilike("name", `%${query}%`)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (error) {
        console.log("accommodation suggestions error", error);
        setSuggestions([]);
        return;
      }

      const seen = new Set<string>();
      const items =
        ((data as any[]) ?? [])
          .filter((r) => r?.event_id !== eventId) // don't suggest itself
          .filter((r) => {
            const key = String(r?.name ?? "")
              .trim()
              .toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((r) => ({
            name: r.name,
            address_line: r.address_line ?? null,
            postcode: r.postcode ?? null,
            breakfast_included: !!r.breakfast_included,
            parking_available: !!r.parking_available,
            notes: r.notes ?? null,
          })) ?? [];

      setSuggestions(items);
    },
    [eventId],
  );

  useEffect(() => {
    if (!showSuggestions) return;
    if (!canEdit || saving) return;

    const q = nameQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(() => {
      fetchSuggestions(q);
    }, 180);

    return () => clearTimeout(t);
  }, [nameQuery, showSuggestions, canEdit, saving, fetchSuggestions]);

  const load = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("accommodation")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    const r = (data as AccommodationRow) ?? null;
    setRow(r);

    if (r) {
      setForm({
        name: r.name ?? "",
        booked_under_name: r.booked_under_name ?? "",
        booking_reference: r.booking_reference ?? "",

        address_line: r.address_line ?? "",
        postcode: r.postcode ?? "",

        check_in_at: r.check_in_at,
        check_out_at: r.check_out_at,

        rooms_count: r.rooms_count === null ? "" : String(r.rooms_count),
        total_cost: r.total_cost === null ? "" : String(r.total_cost),

        breakfast_included: !!r.breakfast_included,
        parking_available: !!r.parking_available,

        notes: r.notes ?? "",
      });

      setNameQuery(r.name ?? "");
    }

    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = useMemo(() => {
    if (!canEdit) return false;
    if (!eventId) return false;
    if (!form.name.trim()) return false;
    if (!form.check_in_at.trim() || !form.check_out_at.trim()) return false;

    const ci = new Date(form.check_in_at).getTime();
    const co = new Date(form.check_out_at).getTime();
    if (!Number.isFinite(ci) || !Number.isFinite(co)) return false;
    if (co <= ci) return false;

    return true;
  }, [canEdit, eventId, form]);

  async function save() {
    if (!eventId) return;
    if (!canSave) return;

    setSaving(true);

    const payload = {
      event_id: eventId,
      name: form.name.trim(),

      booked_under_name: form.booked_under_name.trim()
        ? form.booked_under_name.trim()
        : null,
      booking_reference: form.booking_reference.trim()
        ? form.booking_reference.trim()
        : null,

      address_line: form.address_line.trim() ? form.address_line.trim() : null,
      postcode: form.postcode.trim() ? form.postcode.trim() : null,

      check_in_at: form.check_in_at.trim(),
      check_out_at: form.check_out_at.trim(),

      rooms_count: toIntOrNull(form.rooms_count),
      total_cost: toMoneyOrNull(form.total_cost),

      breakfast_included: !!form.breakfast_included,
      parking_available: !!form.parking_available,

      notes: form.notes.trim() ? form.notes.trim() : null,
    };

    const { error } = row
      ? await supabase
          .from("accommodation")
          .update(payload)
          .eq("event_id", eventId)
      : await supabase.from("accommodation").insert(payload);

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.back();
  }

  async function deleteAccommodation() {
    if (!eventId) return;
    if (!row) return;

    Alert.alert(
      "Delete accommodation?",
      "This will remove accommodation for this event.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            const { error } = await supabase
              .from("accommodation")
              .delete()
              .eq("event_id", eventId);
            setSaving(false);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            Alert.alert("Deleted", "Accommodation removed.");
            router.back();
          },
        },
      ],
    );
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
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          {!canEdit ? (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyTitle}>Read only</Text>
              <Text style={styles.readOnlyText}>
                Admins can add or edit accommodation.
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Label>Accommodation name</Label>
            <TextInput
              value={form.name}
              onChangeText={(t) => {
                setForm((p) => ({ ...p, name: t }));
                setNameQuery(t);
                if (canEdit && !saving) setShowSuggestions(true);
              }}
              onFocus={() => {
                if (blurHideTimer.current) clearTimeout(blurHideTimer.current);
                if (canEdit && !saving) setShowSuggestions(true);
                setNameQuery(form.name);
              }}
              onBlur={() => {
                // delay so taps on suggestion register
                blurHideTimer.current = setTimeout(
                  () => setShowSuggestions(false),
                  160,
                );
              }}
              placeholder="Premier Inn"
              style={styles.input}
              editable={canEdit && !saving}
            />

            {canEdit && showSuggestions && suggestions.length > 0 ? (
              <View style={styles.suggestBox}>
                {suggestions.map((s, idx) => (
                  <Pressable
                    key={`${s.name}-${idx}`}
                    style={[
                      styles.suggestRow,
                      idx === 0 ? { borderTopWidth: 0 } : null,
                    ]}
                    onPress={() => {
                      if (blurHideTimer.current)
                        clearTimeout(blurHideTimer.current);

                      setForm((p) => ({
                        ...p,
                        name: s.name,
                        address_line: s.address_line ?? "",
                        postcode: s.postcode ?? "",
                        breakfast_included: !!s.breakfast_included,
                        parking_available: !!s.parking_available,
                        notes: p.notes.trim() ? p.notes : (s.notes ?? ""),
                      }));

                      setNameQuery(s.name);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                  >
                    <Text style={styles.suggestTitle}>{s.name}</Text>
                    <Text style={styles.suggestMeta}>
                      {[s.postcode, s.address_line]
                        .filter(Boolean)
                        .join(" • ") || "No saved details"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Label>Booked under</Label>
            <TextInput
              value={form.booked_under_name}
              onChangeText={(t) =>
                setForm((p) => ({ ...p, booked_under_name: t }))
              }
              placeholder="Name on booking"
              style={styles.input}
              editable={canEdit && !saving}
            />

            <Label>Booking reference</Label>
            <TextInput
              value={form.booking_reference}
              onChangeText={(t) =>
                setForm((p) => ({ ...p, booking_reference: t }))
              }
              placeholder="Ref"
              style={styles.input}
              autoCapitalize="characters"
              editable={canEdit && !saving}
            />

            <Label>Address line</Label>
            <TextInput
              value={form.address_line}
              onChangeText={(t) => setForm((p) => ({ ...p, address_line: t }))}
              placeholder="Optional"
              style={styles.input}
              editable={canEdit && !saving}
            />

            <Label>Postcode</Label>
            <TextInput
              value={form.postcode}
              onChangeText={(t) => setForm((p) => ({ ...p, postcode: t }))}
              placeholder="Optional"
              style={styles.input}
              autoCapitalize="characters"
              editable={canEdit && !saving}
            />

            <Label>Check-in</Label>
            {Platform.OS === "web" ? (
              <WebDateTimeSplit
                valueIso={form.check_in_at}
                disabled={!canEdit || saving}
                onChangeIso={(iso) =>
                  setForm((p) => ({ ...p, check_in_at: iso }))
                }
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateBtn}
                  onPress={() => {
                    if (!canEdit || saving) return;

                    if (Platform.OS === "android") {
                      openAndroidDateTimePicker(form.check_in_at, (iso) =>
                        setForm((p) => ({ ...p, check_in_at: iso })),
                      );
                      return;
                    }

                    // iOS
                    setShowCheckIn(true);
                  }}
                  disabled={!canEdit || saving}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text style={styles.dateBtnText}>
                    {toLocalInputString(form.check_in_at)}
                  </Text>
                </Pressable>

                {/* iOS only */}
                {Platform.OS === "ios" && showCheckIn ? (
                  <DateTimePicker
                    value={new Date(form.check_in_at)}
                    mode="datetime"
                    display="spinner"
                 onChange={(event, selected) => {
  if (event.type === "dismissed" || !selected) {
    setShowCheckIn(false);
    return;
  }

  setForm((p) => ({
    ...p,
    check_in_at: selected.toISOString(),
  }));
}}
                  />
                ) : null}
              </>
            )}

            <Label>Check-out</Label>
            {Platform.OS === "web" ? (
              <WebDateTimeSplit
                valueIso={form.check_out_at}
                disabled={!canEdit || saving}
                onChangeIso={(iso) =>
                  setForm((p) => ({ ...p, check_out_at: iso }))
                }
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateBtn}
                  onPress={() => {
                    if (!canEdit || saving) return;

                    if (Platform.OS === "android") {
                      openAndroidDateTimePicker(form.check_out_at, (iso) =>
                        setForm((p) => ({ ...p, check_out_at: iso })),
                      );
                      return;
                    }

                    // iOS
                    setShowCheckOut(true);
                  }}
                  disabled={!canEdit || saving}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text style={styles.dateBtnText}>
                    {toLocalInputString(form.check_out_at)}
                  </Text>
                </Pressable>

                {/* iOS only */}
                {Platform.OS === "ios" && showCheckOut ? (
                  <DateTimePicker
                    value={new Date(form.check_out_at)}
                    mode="datetime"
                    display="spinner"
                   onChange={(event, selected) => {
  if (event.type === "dismissed" || !selected) {
    setShowCheckOut(false);
    return;
  }

  setForm((p) => ({
    ...p,
    check_out_at: selected.toISOString(),
  }));
}}
                  />
                ) : null}
              </>
            )}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Label>Rooms</Label>
                <TextInput
                  value={form.rooms_count}
                  onChangeText={(t) =>
                    setForm((p) => ({ ...p, rooms_count: t }))
                  }
                  placeholder="1"
                  style={styles.input}
                  keyboardType="number-pad"
                  editable={canEdit && !saving}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Label>Total cost</Label>
                <TextInput
                  value={form.total_cost}
                  onChangeText={(t) =>
                    setForm((p) => ({ ...p, total_cost: t }))
                  }
                  placeholder="120"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  editable={canEdit && !saving}
                />
              </View>
            </View>

            <ToggleRow
              label="Breakfast included"
              value={form.breakfast_included}
              disabled={!canEdit || saving}
              onChange={(v) =>
                setForm((p) => ({ ...p, breakfast_included: v }))
              }
            />

            <ToggleRow
              label="Parking available"
              value={form.parking_available}
              disabled={!canEdit || saving}
              onChange={(v) => setForm((p) => ({ ...p, parking_available: v }))}
            />

            <Label>Notes</Label>
            <TextInput
              value={form.notes}
              onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
              placeholder="Late check-in code, parking instructions, etc."
              style={[styles.input, { height: 110, textAlignVertical: "top" }]}
              multiline
              editable={canEdit && !saving}
            />

               {canEdit ? <View style={styles.footerSpacer} /> : null}
                    </View>
        </ScrollView>

        {canEdit ? (
          <View style={styles.stickyFooter}>
            <Pressable
              style={[
                styles.saveBtn,
                !canSave || saving ? styles.saveBtnDisabled : null,
              ]}
              onPress={save}
              disabled={!canSave || saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>

            {row ? (
              <Pressable
                style={[
                  styles.deleteBtn,
                  saving ? styles.saveBtnDisabled : null,
                ]}
                onPress={deleteAccommodation}
                disabled={saving}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
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

  readOnlyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  readOnlyTitle: { fontWeight: "900", color: colors.text, marginBottom: 4 },
  readOnlyText: { fontWeight: "700", color: colors.textMuted },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
  },

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

  stickyFooter: {
    backgroundColor: colors.pageBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },

  footerSpacer: {
    height: 130,
  },

  saveBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  deleteBtn: {
    marginTop: 10,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnText: { color: "rgb(239,68,68)", fontWeight: "900", fontSize: 15 },

  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateBtnText: {
    fontWeight: "800",
    color: colors.text,
  },

  webDateRow: {
    flexDirection: "row",
    gap: 10,
  },
  webDateInput: {
    width: "60%",
    boxSizing: "border-box",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontWeight: "700",
    color: colors.text,
    fontSize: 14,
  },
  webTimeInput: {
    width: "40%",
    boxSizing: "border-box",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontWeight: "700",
    color: colors.text,
    fontSize: 14,
  },

  suggestBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
  },
  suggestRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestTitle: {
    fontWeight: "900",
    color: colors.text,
  },
  suggestMeta: {
    marginTop: 2,
    fontWeight: "700",
    color: colors.textMuted,
    fontSize: 12,
  },
});
