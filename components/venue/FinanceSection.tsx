import InfoCard from "@/components/InfoCard";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type FinanceSectionProps = {
  eventId: string;
  isAdmin: boolean;
  shares: number | null;

  incomeGuarantee: number | null;
  incomeDoor: number | null;
  feeType: string | null;
  paidStatus: string | null;

  vanHire: number | null;
  fuel: number | null;
  accommodationCost: number | null;
  depCost: number | null;
  driverCost: number | null;
  fohEngCost: number | null;
  otherCosts: number | null;

  // Optional: if the Accommodation cost shown here is coming from accommodation.total_cost
  accommodationCostSource?: "accommodation" | "event" | null;

  feeNotes?: string | null;
  costNotes?: string | null;
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `£${n.toFixed(2)}`;
}

function Row({
  label,
  value,
  last,
  bold,
}: {
  label: string;
  value: string;
  last?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={[styles.row, last ? styles.rowLast : null]}>
      <Text style={bold ? styles.labelBold : styles.label}>{label}</Text>
      <Text style={bold ? styles.valueBold : styles.value}>{value}</Text>
    </View>
  );
}

export default function FinanceSection({
  eventId,
  isAdmin,
  shares,
  incomeGuarantee,
  incomeDoor,
  feeType,
  paidStatus,
  vanHire,
  fuel,
  accommodationCost,
  depCost,
  driverCost,
  fohEngCost,
  otherCosts,
  accommodationCostSource,
  feeNotes,
  costNotes,
}: FinanceSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const grossIncome = (incomeGuarantee || 0) + (incomeDoor || 0);

  const totalCosts =
    (vanHire || 0) +
    (fuel || 0) +
    (accommodationCost || 0) +
    (depCost || 0) +
    (driverCost || 0) +
    (fohEngCost || 0) +
    (otherCosts || 0);

  const netIncome = grossIncome - totalCosts;

  const shareCount = shares ?? null;
  const perShare = shareCount && shareCount > 0 ? netIncome / shareCount : null;

  const showAccommodationSourceHint =
    accommodationCostSource === "accommodation" && accommodationCost !== null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("financeSection.finance")}</Text>

          {isAdmin ? (
            <Pressable
              onPress={() => router.push(`/events/${eventId}/edit/finance`)}
              hitSlop={10}
              style={styles.editPill}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.editPillText}>{t("financeSection.edit")}</Text>
            </Pressable>
          ) : null}
        </View>

        <InfoCard title={t("financeSection.income")}>
          <Row label={t("financeSection.guarantee")} value={formatCurrency(incomeGuarantee)} />
          <Row label={t("financeSection.door")} value={formatCurrency(incomeDoor)} />
          <Row label={t("financeSection.feeType")} value={feeType || "—"} />
          <Row label={t("financeSection.paidStatus")} value={paidStatus || "—"} last />

          {feeNotes?.trim() ? (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>{t("financeSection.feeNotes")}</Text>
              <Text style={styles.noteText}>{feeNotes}</Text>
            </View>
          ) : null}
        </InfoCard>

        <InfoCard title={t("financeSection.costs")}>
          <Row label={t("financeSection.vanHire")} value={formatCurrency(vanHire)} />
          <Row label={t("financeSection.fuel")} value={formatCurrency(fuel)} />

          <Row
            label={t("financeSection.accommodation")}
            value={formatCurrency(accommodationCost)}
          />
          {showAccommodationSourceHint ? (
            <Text style={styles.sourceHint}>{t("financeSection.fromAccommodationDetails")}</Text>
          ) : null}

          <Row label={t("financeSection.depFees")} value={formatCurrency(depCost)} />
          <Row label={t("financeSection.driverCost")} value={formatCurrency(driverCost)} />
          <Row label={t("financeSection.fohEngineer")} value={formatCurrency(fohEngCost)} />
          <Row label={t("financeSection.otherCosts")} value={formatCurrency(otherCosts)} last />

          {costNotes?.trim() ? (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>{t("financeSection.costNotes")}</Text>
              <Text style={styles.noteText}>{costNotes}</Text>
            </View>
          ) : null}
        </InfoCard>

        <InfoCard title={t("financeSection.summary")}>
          <Row label={t("financeSection.grossIncome")} value={formatCurrency(grossIncome)} bold />
          <Row label={t("financeSection.totalCosts")} value={formatCurrency(totalCosts)} bold />

          <View style={styles.netDivider} />
          <Row label={t("financeSection.netIncome")} value={formatCurrency(netIncome)} bold />

          <View style={styles.smallDivider} />
          <Row
            label={t("financeSection.shares")}
            value={shareCount && shareCount > 0 ? String(shareCount) : "—"}
            bold
          />
          <Row label={t("financeSection.perShare")} value={formatCurrency(perShare)} bold last />
        </InfoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

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

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  label: { fontSize: 14, fontWeight: "600", color: "#666" },
  labelBold: { fontSize: 14, fontWeight: "800", color: "#333" },

  value: { fontSize: 14, color: "#333" },
  valueBold: { fontSize: 14, fontWeight: "800", color: colors.primary },

  sourceHint: {
    marginTop: -2,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "right",
  },

  netDivider: {
    height: 2,
    backgroundColor: "#111",
    marginTop: 8,
    marginBottom: 8,
    opacity: 0.15,
  },
  smallDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 8,
    marginBottom: 8,
  },

  noteBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
