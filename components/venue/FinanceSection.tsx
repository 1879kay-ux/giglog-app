import InfoCard from "@/components/InfoCard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type FinanceSectionProps = {
  eventId: string;
  isAdmin: boolean;
  shares: number | null;

  incomeFee: number | null;
  feeType: string | null;
  paidStatus: string | null;
  vanHire: number | null;
  fuel: number | null;
  depCost: number | null;
  driverCost: number | null;
  fohEngCost: number | null;
  otherCosts: number | null;
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `£${n.toFixed(2)}`;
}

export default function FinanceSection({
  eventId,
  isAdmin,
  shares,
  incomeFee,
  feeType,
  paidStatus,
  vanHire,
  fuel,
  depCost,
  driverCost,
  fohEngCost,
  otherCosts,
}: FinanceSectionProps) {
  const router = useRouter();

  const totalCosts =
    (vanHire || 0) +
    (fuel || 0) +
    (depCost || 0) +
    (driverCost || 0) +
    (fohEngCost || 0) +
    (otherCosts || 0);

  const netIncome = (incomeFee || 0) - totalCosts;

  const shareCount = shares ?? null;
  const perShare = shareCount && shareCount > 0 ? netIncome / shareCount : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Finance</Text>

          {isAdmin ? (
            <Pressable
              onPress={() => router.push(`/events/${eventId}/edit/finance`)}
              hitSlop={10}
              style={styles.editPill}
            >
              <Ionicons name="create-outline" size={16} color="#008080" />
              <Text style={styles.editPillText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        <InfoCard title="Income">
          <View style={styles.row}>
            <Text style={styles.label}>Fee</Text>
            <Text style={styles.value}>{formatCurrency(incomeFee)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Fee Type</Text>
            <Text style={styles.value}>{feeType || "—"}</Text>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Paid Status</Text>
            <Text style={styles.value}>{paidStatus || "—"}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Costs">
          <View style={styles.row}>
            <Text style={styles.label}>Van Hire</Text>
            <Text style={styles.value}>{formatCurrency(vanHire)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Fuel</Text>
            <Text style={styles.value}>{formatCurrency(fuel)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Dep Fees</Text>
            <Text style={styles.value}>{formatCurrency(depCost)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Driver Cost</Text>
            <Text style={styles.value}>{formatCurrency(driverCost)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>FOH/Engineer</Text>
            <Text style={styles.value}>{formatCurrency(fohEngCost)}</Text>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Other Costs</Text>
            <Text style={styles.value}>{formatCurrency(otherCosts)}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Summary">
          <View style={styles.row}>
            <Text style={styles.labelBold}>Gross Income</Text>
            <Text style={styles.valueBold}>{formatCurrency(incomeFee)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.labelBold}>Total Costs</Text>
            <Text style={styles.valueBold}>{formatCurrency(totalCosts)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.labelBold}>Shares</Text>
            <Text style={styles.valueBold}>
              {shareCount && shareCount > 0 ? String(shareCount) : "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.labelBold}>Per Share</Text>
            <Text style={styles.valueBold}>{formatCurrency(perShare)}</Text>
          </View>

          <View style={[styles.row, styles.netRow, styles.rowLast]}>
            <Text style={styles.labelBold}>Net Income</Text>
            <Text style={styles.valueBold}>{formatCurrency(netIncome)}</Text>
          </View>
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
    backgroundColor: "rgba(0,128,128,0.10)",
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#008080",
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

  netRow: {
    borderTopWidth: 2,
    borderTopColor: "#008080",
    paddingTop: 12,
    marginTop: 4,
  },

  label: { fontSize: 14, fontWeight: "600", color: "#666" },
  labelBold: { fontSize: 14, fontWeight: "700", color: "#333" },

  value: { fontSize: 14, color: "#333" },
  valueBold: { fontSize: 14, fontWeight: "700", color: "#008080" },
});