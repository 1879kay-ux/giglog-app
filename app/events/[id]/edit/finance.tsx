import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

type EventFinanceRow = {
  income_guarantee: number | null;
  income_door: number | null;
  income_fee: number | null;
  manual_playing_share_override: number | null;

  fee_type: string | null;
  paid_status: string | null;

  van_hire: number | null;
  fuel: number | null;

  accommodation_cost: number | null;
  dep_cost: number | null;
  driver_cost: number | null;
  foh_eng_cost: number | null;
  other_costs: number | null;

  fee_notes: string | null;
  cost_notes: string | null;
};

const FEE_TYPE_OPTIONS = [
  "Guaranteed Fee (flat)",
  "Door Deal",
  "Guarantee plus percentage (vs door)",
  "Expenses Only",
  "Charity",
] as const;

const PAID_STATUS_OPTIONS = ["No", "Part", "Yes"] as const;

function numToStr(v: number | null | undefined) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function parseNullableNumber(raw: string) {
  const s = raw.trim();
  if (!s) return { ok: true as const, value: null as number | null };

  if (!/^\d+(\.\d+)?$/.test(s)) {
    return { ok: false as const, error: "Enter a valid number or leave blank." };
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return { ok: false as const, error: "Enter a valid number or leave blank." };
  }

  return { ok: true as const, value: n };
}

function cleanText(v: string) {
  const t = v.trim();
  return t.length ? t : null;
}

export default function EditEventFinanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [incomeGuarantee, setIncomeGuarantee] = useState("");
  const [incomeDoor, setIncomeDoor] = useState("");
  const [incomeFee, setIncomeFee] = useState("");
  const [shares, setShares] = useState("");

  const [feeType, setFeeType] = useState("");
  const [paidStatus, setPaidStatus] = useState("");

  const [vanHire, setVanHire] = useState("");
  const [fuel, setFuel] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [depCost, setDepCost] = useState("");
  const [driverCost, setDriverCost] = useState("");
  const [fohEngCost, setFohEngCost] = useState("");
  const [otherCosts, setOtherCosts] = useState("");

  const [feeNotes, setFeeNotes] = useState("");
  const [costNotes, setCostNotes] = useState("");

  const numericFields = useMemo(
    () => [
      {
        key: "income_guarantee",
        label: "Guarantee",
        value: incomeGuarantee,
        setValue: setIncomeGuarantee,
      },
      { key: "income_door", label: "Door", value: incomeDoor, setValue: setIncomeDoor },
      { key: "income_fee", label: "Fee (legacy)", value: incomeFee, setValue: setIncomeFee },
      {
        key: "manual_playing_share_override",
        label: "Shares",
        value: shares,
        setValue: setShares,
      },

      { key: "van_hire", label: "Van Hire", value: vanHire, setValue: setVanHire },
      { key: "fuel", label: "Fuel", value: fuel, setValue: setFuel },
      {
        key: "accommodation_cost",
        label: "Accommodation",
        value: accommodation,
        setValue: setAccommodation,
      },
      { key: "dep_cost", label: "Dep Fees", value: depCost, setValue: setDepCost },
      { key: "driver_cost", label: "Driver Cost", value: driverCost, setValue: setDriverCost },
      { key: "foh_eng_cost", label: "FOH/Engineer", value: fohEngCost, setValue: setFohEngCost },
      { key: "other_costs", label: "Other Costs", value: otherCosts, setValue: setOtherCosts },
    ],
    [
      incomeGuarantee,
      incomeDoor,
      incomeFee,
      shares,
      vanHire,
      fuel,
      accommodation,
      depCost,
      driverCost,
      fohEngCost,
      otherCosts,
    ]
  );

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;

    setLoading(true);

    // Load van/fuel from events (still lives there)
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select(["van_hire", "fuel"].join(","))
      .eq("event_id", id)
      .single();

    if (evErr) {
      setLoading(false);
      Alert.alert("Error", evErr.message);
      return;
    }

    // Load finance from event_finance
    const { data: fin, error: finErr } = await supabase
      .from("event_finance")
      .select(
        [
          "income_guarantee",
          "income_door",
          "income_fee",
          "manual_playing_share_override",
          "fee_type",
          "paid_status",
          "accommodation_cost",
          "dep_cost",
          "driver_cost",
          "foh_eng_cost",
          "other_costs",
          "fee_notes",
          "cost_notes",
        ].join(",")
      )
      .eq("event_id", id)
      .maybeSingle();

    if (finErr) {
      setLoading(false);
      Alert.alert("Error", finErr.message);
      return;
    }

    const row = (fin ?? {}) as Partial<EventFinanceRow>;

    setIncomeGuarantee(numToStr(row.income_guarantee));
    setIncomeDoor(numToStr(row.income_door));
    setIncomeFee(numToStr(row.income_fee));
    setShares(numToStr(row.manual_playing_share_override));

    setFeeType(row.fee_type ?? "");
    setPaidStatus(row.paid_status ?? "");

    setVanHire(numToStr((ev as any)?.van_hire));
    setFuel(numToStr((ev as any)?.fuel));

    setAccommodation(numToStr(row.accommodation_cost));
    setDepCost(numToStr(row.dep_cost));
    setDriverCost(numToStr(row.driver_cost));
    setFohEngCost(numToStr(row.foh_eng_cost));
    setOtherCosts(numToStr(row.other_costs));

    setFeeNotes(row.fee_notes ?? "");
    setCostNotes(row.cost_notes ?? "");

    setLoading(false);
  }

  async function onSave() {
    if (!id) return;

    const parsed: Record<
      string,
      { ok: true; value: number | null } | { ok: false; error: string }
    > = {};
    for (const f of numericFields) parsed[f.key] = parseNullableNumber(f.value);

    for (const f of numericFields) {
      const res = parsed[f.key];
      if (!res.ok) {
        Alert.alert("Check values", `${f.label}: ${res.error}`);
        return;
      }
    }

    const financePayload = {
      event_id: id,

      income_guarantee: (parsed["income_guarantee"] as any).value,
      income_door: (parsed["income_door"] as any).value,
      income_fee: (parsed["income_fee"] as any).value,
      manual_playing_share_override: (parsed["manual_playing_share_override"] as any).value,

      fee_type: feeType.trim() ? feeType.trim() : null,
      paid_status: paidStatus.trim() ? paidStatus.trim() : null,

      accommodation_cost: (parsed["accommodation_cost"] as any).value,
      dep_cost: (parsed["dep_cost"] as any).value,
      driver_cost: (parsed["driver_cost"] as any).value,
      foh_eng_cost: (parsed["foh_eng_cost"] as any).value,
      other_costs: (parsed["other_costs"] as any).value,

      fee_notes: cleanText(feeNotes),
      cost_notes: cleanText(costNotes),
    };

    const eventPayload = {
      van_hire: (parsed["van_hire"] as any).value,
      fuel: (parsed["fuel"] as any).value,
    };

    setSaving(true);

    // 1) Update events for van/fuel
    const { error: evErr } = await supabase.from("events").update(eventPayload).eq("event_id", id);

    if (evErr) {
      setSaving(false);
      Alert.alert("Save failed", evErr.message);
      return;
    }

    // 2) Upsert finance into event_finance (admin-only by RLS)
    const { data: saved, error: finErr } = await supabase
      .from("event_finance")
      .upsert(financePayload, { onConflict: "event_id" })
      .select("event_id")
      .single();

    setSaving(false);

    if (finErr) {
      Alert.alert("Save failed", finErr.message);
      return;
    }

    console.log("FINANCE SAVED", saved);

    router.back();
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: "Edit Finance" }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Finance" }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Finance</Text>

            <Text style={styles.sectionLabel}>Income</Text>

            <RowNumber label="Guarantee" value={incomeGuarantee} onChange={setIncomeGuarantee} />
            <RowNumber label="Door" value={incomeDoor} onChange={setIncomeDoor} />

            <RowChips
              label="Fee Type"
              value={feeType}
              options={[...FEE_TYPE_OPTIONS]}
              onChange={setFeeType}
            />

            <RowChips
              label="Paid Status"
              value={paidStatus}
              options={[...PAID_STATUS_OPTIONS]}
              onChange={setPaidStatus}
            />

            <RowNotes label="Fee Notes" value={feeNotes} onChange={setFeeNotes} />

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Costs</Text>

            <RowNumber label="Van Hire" value={vanHire} onChange={setVanHire} />
            <RowNumber label="Fuel" value={fuel} onChange={setFuel} />
            <RowNumber label="Accommodation" value={accommodation} onChange={setAccommodation} />
            <RowNumber label="Dep Fees" value={depCost} onChange={setDepCost} />
            <RowNumber label="Driver Cost" value={driverCost} onChange={setDriverCost} />
            <RowNumber label="FOH/Engineer" value={fohEngCost} onChange={setFohEngCost} />
            <RowNumber label="Other Costs" value={otherCosts} onChange={setOtherCosts} />

            <RowNotes label="Cost Notes" value={costNotes} onChange={setCostNotes} />

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Net Income Split</Text>
            <RowNumber label="Shares" value={shares} onChange={setShares} />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function RowNumber(props: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{props.label}</Text>

      {Platform.OS === "web" ? (
        // @ts-ignore web-only input
        <input
          type="number"
          step="1"
          value={props.value}
          onChange={(e: any) => props.onChange(e.target.value)}
          style={{
            width: 140,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
            textAlign: "right",
          }}
        />
      ) : (
        <TextInput
          style={styles.numberInput}
          value={props.value}
          onChangeText={props.onChange}
          placeholder=""
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </View>
  );
}

function RowNotes(props: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <View style={styles.notesBlock}>
      <Text style={styles.notesLabel}>{props.label}</Text>
      <TextInput
        style={styles.notesInput}
        value={props.value}
        onChangeText={props.onChange}
        placeholder="Add notes…"
        placeholderTextColor="#999"
        multiline
      />
    </View>
  );
}

function RowChips(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (t: string) => void;
}) {
  return (
    <View style={styles.chipBlock}>
      <View style={styles.chipHeaderRow}>
        <Text style={styles.rowLabel}>{props.label}</Text>

        {!!props.value && (
          <TouchableOpacity onPress={() => props.onChange("")} hitSlop={10}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipWrap}>
        {props.options.map((opt) => {
          const selected = props.value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => props.onChange(selected ? "" : opt)}
              activeOpacity={0.8}
              style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
    flex: 1,
  },

  numberInput: {
    width: 140,
    textAlign: "right",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.cardBg,
  },

  chipBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  chipHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  clearText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  chipUnselected: {
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },

  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(13,148,136,0.12)",
  },

  chipText: {
    fontSize: 13,
    fontWeight: "800",
  },

  chipTextUnselected: {
    color: colors.text,
  },

  chipTextSelected: {
    color: colors.primary,
  },

  notesBlock: {
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: "top",
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