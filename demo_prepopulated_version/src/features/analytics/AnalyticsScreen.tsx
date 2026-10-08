import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Header } from '../../presentation/components/Header';
import { Card } from '../../presentation/components/Card';
import { AnalyticsEngine } from '../../core/engines/analyticsEngine';
import { DatePeriodType, DateRange } from '../../core/types';
import { theme } from '../../presentation/theme';
import { formatRupee } from '../../core/utils/currency';


export const AnalyticsScreen: React.FC = () => {
  const { transactions, loading, refreshData, generatePdfReport } = useFinanceData();

  const [periodType, setPeriodType] = useState<DatePeriodType>('MONTH');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const selectedPeriod: DateRange = useMemo(() => {
    if (periodType === 'YEAR') {
      return AnalyticsEngine.getCurrentYearRange();
    }
    // Default current month
    return AnalyticsEngine.getCurrentMonthRange();
  }, [periodType]);

  const metrics = useMemo(() => {
    return AnalyticsEngine.computeMetrics(transactions, selectedPeriod);
  }, [transactions, selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await generatePdfReport(selectedPeriod);
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Failed to render PDF statement');
    } finally {
      setIsExporting(false);
    }
  };

  const netSavingsPositive = metrics.netSavings >= 0;

  return (
    <View style={styles.container}>
      <Header
        title="Financial Intelligence"
        subtitle="Aggregations & Document Export"
        rightAction={
          <TouchableOpacity
            style={[styles.exportBtn, isExporting && { opacity: 0.7 }]}
            onPress={handleExportPdf}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={16} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Period Switcher */}
        <View style={styles.periodSwitcher}>
          <TouchableOpacity
            style={[styles.periodBtn, periodType === 'MONTH' && styles.periodBtnActive]}
            onPress={() => setPeriodType('MONTH')}
          >
            <Text
              style={[styles.periodBtnText, periodType === 'MONTH' && styles.periodBtnTextActive]}
            >
              Current Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, periodType === 'YEAR' && styles.periodBtnActive]}
            onPress={() => setPeriodType('YEAR')}
          >
            <Text
              style={[styles.periodBtnText, periodType === 'YEAR' && styles.periodBtnTextActive]}
            >
              Fiscal Annual (Year)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected Period Badge */}
        <View style={styles.periodBadgeRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.periodBadgeText}>Aggregating Range: {selectedPeriod.label}</Text>
        </View>

        {/* KPI Tiles (Inflows, Outflows, Net Savings) */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Total Inflows</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.success }]}>
              +{formatRupee(metrics.totalInflows, { decimals: 2 })}
            </Text>
            <Text style={styles.kpiSub}>Earned receipts</Text>
          </Card>

          <Card style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Total Outflows</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.textPrimary }]}>
              -{formatRupee(metrics.totalOutflows, { decimals: 2 })}
            </Text>
            <Text style={styles.kpiSub}>Expenses paid</Text>
          </Card>

        </View>

        {/* Net Savings Master Tile */}
        <Card style={styles.savingsCard}>
          <View style={styles.savingsHeader}>
            <View>
              <Text style={styles.savingsLabel}>Net Savings (Cash Retained)</Text>
              <Text
                style={[
                  styles.savingsValue,
                  { color: netSavingsPositive ? theme.colors.success : theme.colors.danger },
                ]}
              >
                {netSavingsPositive ? '+' : ''}₹
                {metrics.netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View
              style={[
                styles.savingsBadge,
                {
                  backgroundColor: netSavingsPositive
                    ? theme.colors.successBg
                    : theme.colors.dangerBg,
                },
              ]}
            >
              <Ionicons
                name={netSavingsPositive ? 'trending-up' : 'trending-down'}
                size={16}
                color={netSavingsPositive ? theme.colors.success : theme.colors.danger}
              />
              <Text
                style={[
                  styles.savingsBadgeText,
                  { color: netSavingsPositive ? theme.colors.success : theme.colors.danger },
                ]}
              >
                {netSavingsPositive ? 'Surplus' : 'Deficit'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Category Spend Distribution Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Spend Distribution</Text>
          <Text style={styles.sectionSub}>Relative share of total outflow</Text>
        </View>

        <Card style={styles.categoryCard}>
          {metrics.categorySpend.length === 0 ? (
            <View style={styles.emptyCategories}>
              <Text style={styles.emptyText}>No outflow movements recorded in this period</Text>
            </View>
          ) : (
            metrics.categorySpend.map((cat, idx) => {
              return (
                <View
                  key={cat.category}
                  style={[
                    styles.categoryRow,
                    idx !== metrics.categorySpend.length - 1 && styles.categoryRowBorder,
                  ]}
                >
                  <View style={styles.catInfoRow}>
                    <Text style={styles.catName}>{cat.category}</Text>
                    <View style={styles.catAmounts}>
                      <Text style={styles.catAmountVal}>
                        {formatRupee(cat.amount, { decimals: 2 })}
                      </Text>
                      <Text style={styles.catPercentageVal}>({cat.percentage.toFixed(1)}%)</Text>
                    </View>

                  </View>

                  {/* Visual distribution bar */}
                  <View style={styles.catBarTrack}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${Math.min(100, cat.percentage)}%`,
                          backgroundColor:
                            idx === 0
                              ? theme.colors.primary
                              : idx === 1
                              ? theme.colors.info
                              : idx === 2
                              ? theme.colors.warning
                              : theme.colors.textSecondary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Air-Gapped Security Notice */}
        <View style={styles.airGapNotice}>
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
          <Text style={styles.airGapText}>
            PDF generated locally using vector engine. Handed directly to iOS/Android share sheet.
            Zero cloud processing or network transfer.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  periodSwitcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  periodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 4,
  },
  periodBadgeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  kpiTile: {
    flex: 1,
    padding: theme.spacing.md,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  savingsCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  savingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  savingsValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  categoryCard: {
    padding: 0,
    overflow: 'hidden',
  },
  categoryRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catAmountVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
  },
  catPercentageVal: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  catBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyCategories: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  airGapNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  airGapText: {
    flex: 1,
    fontSize: 11,
    color: '#6EE7B7',
    lineHeight: 16,
  },
});
