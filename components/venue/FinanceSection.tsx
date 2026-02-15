import InfoCard from '@/components/InfoCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type FinanceSectionProps = {
  incomeFee?: number | null;
  feeType?: string | null;
  paidStatus?: string | null;
  vanHire?: number | null;
  fuel?: number | null;
  depCost?: number | null;
  driverCost?: number | null;
  fohEngCost?: number | null;
  otherCosts?: number | null;
};

export default function FinanceSection({
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
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `£${value.toFixed(2)}`;
  };

  return (
    <ScrollView style={styles.container}>
      <InfoCard title="Income">
        <View style={styles.row}>
          <Text style={styles.label}>Fee</Text>
          <Text style={styles.value}>{formatCurrency(incomeFee)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fee Type</Text>
          <Text style={styles.value}>{feeType || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Paid Status</Text>
          <Text style={styles.value}>{paidStatus || '—'}</Text>
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
          <Text style={styles.label}>Depreciation</Text>
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
        <View style={styles.row}>
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
          <Text style={styles.valueBold}>
            {formatCurrency(
              (vanHire || 0) +
              (fuel || 0) +
              (depCost || 0) +
              (driverCost || 0) +
              (fohEngCost || 0) +
              (otherCosts || 0)
            )}
          </Text>
        </View>
        <View style={[styles.row, styles.netRow]}>
          <Text style={styles.labelBold}>Net Income</Text>
          <Text style={styles.valueBold}>
            {formatCurrency(
              (incomeFee || 0) -
              ((vanHire || 0) +
                (fuel || 0) +
                (depCost || 0) +
                (driverCost || 0) +
                (fohEngCost || 0) +
                (otherCosts || 0))
            )}
          </Text>
        </View>
      </InfoCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  netRow: {
    borderTopWidth: 2,
    borderTopColor: '#008080',
    paddingTop: 12,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  labelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  valueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008080',
  },
});
