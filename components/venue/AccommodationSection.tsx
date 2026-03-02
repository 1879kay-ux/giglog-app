// components/venue/AccommodationSection.tsx

import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type AccommodationRow = {
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

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // fall back if weird value

  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMoneyGBP(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        {typeof value === "string" ? <Text style={styles.value}>{value}</Text> : value}
      </View>
    </View>
  );
}

export default function AccommodationSection({
  accommodation,
  canEdit,
  onPressEdit,
}: {
  accommodation: AccommodationRow | null;
  canEdit: boolean;
  onPressEdit: () => void;
}) {
  if (!accommodation) {
    // Admins only should ever see this empty state (Event screen hides section for non-admin if null)
    return (
      <View>
        <Text style={styles.muted}>No accommodation added.</Text>

        {canEdit ? (
          <Pressable style={styles.editPill} onPress={onPressEdit}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.editPillText}>Add accommodation</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const addressBits = [accommodation.address_line, accommodation.postcode].filter(Boolean).join(", ");

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{accommodation.name}</Text>

        {canEdit ? (
          <Pressable style={styles.editPill} onPress={onPressEdit}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.editPillText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {addressBits ? <Text style={styles.subtle}>{addressBits}</Text> : null}

      <View style={styles.card}>
        <Row label="Check-in" value={formatDateTime(accommodation.check_in_at)} />
        <Row label="Check-out" value={formatDateTime(accommodation.check_out_at)} />

        {accommodation.rooms_count !== null ? (
          <Row label="Rooms" value={String(accommodation.rooms_count)} />
        ) : null}

        {accommodation.total_cost !== null ? (
          <Row label="Total cost" value={formatMoneyGBP(accommodation.total_cost)} />
        ) : null}

        {accommodation.booked_under_name ? (
          <Row label="Booked under" value={accommodation.booked_under_name} />
        ) : null}

        {accommodation.booking_reference ? (
          <Row label="Booking ref" value={accommodation.booking_reference} />
        ) : null}

        <Row label="Breakfast" value={accommodation.breakfast_included ? "Yes" : "No"} />
        <Row label="Parking" value={accommodation.parking_available ? "Yes" : "No"} />
      </View>

      {accommodation.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notes}>{accommodation.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: colors.textMuted,
    fontWeight: "600",
    marginBottom: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    flex: 1,
  },
  subtle: {
    color: colors.textMuted,
    fontWeight: "600",
    marginBottom: 10,
  },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.pageBg,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 12,
  },
  label: {
    width: 110,
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  valueWrap: { flex: 1, alignItems: "flex-end" },
  value: { color: colors.text, fontWeight: "700" },

  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.10)",
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.primary,
  },

  notesBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  notes: {
    color: colors.text,
    fontWeight: "600",
    lineHeight: 18,
  },
});