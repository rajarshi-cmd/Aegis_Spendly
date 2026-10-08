import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee, formatCompactRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';

interface OverviewScreenProps {
  onNavigateToTransactions: () => void;
  onNavigateToCards: () => void;
  onOpenAddEntry: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  onNavigateToTransactions,
  onNavigateToCards,
  onOpenAddEntry,
}) => {
  const { colors } = useTheme();
  const { accounts, transactions, totalBankCash, totalCreditDebt, obligations, activeMonth } = useFinanceData();

  // Selected category slice for interactive donut hover/tap
  const [selectedCat, setSelectedCat] = useState<{ cat: string; pct: number; amt: number; color: string } | null>(null);

  // Month-filtered transactions
  const currentMonthTransactions = useMemo(() => {
    if (!activeMonth || activeMonth.toLowerCase() === 'all months') {
      return transactions;
    }
    return transactions.filter((t) => isDateInMonth(t.timestamp, activeMonth));
  }, [transactions, activeMonth]);

  // Calculations for selected active month
  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'INFLOW')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter((t) => t.type === 'OUTFLOW')
    .reduce((sum, t) => sum + t.amount, 0);

  const availableThisMonth = totalBankCash > 0 ? totalBankCash : Math.max(0, totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Credit card for quick cycle widget
  const regaliaCard = accounts.find((a) => a.type === 'CREDIT_CARD') || accounts[0];
  const cardLimit = regaliaCard?.credit_limit || 52000;
  const cardDebt = regaliaCard?.balance || 8420;
  const cardUtil = Math.round((cardDebt / cardLimit) * 1000) / 10;

  // 12 Months bar chart mock amounts
  const monthsData = [
    { m: 'Nov', val: 14200 },
    { m: 'Dec', val: 16800 },
    { m: 'Jan', val: 15400 },
    { m: 'Feb', val: 21000 },
    { m: 'Mar', val: 17500 },
    { m: 'Apr', val: 19200 },
    { m: 'May', val: 22800 },
    { m: 'Jun', val: 18100 },
    { m: 'Jul', val: 16500 },
    { m: 'Aug', val: 20400 },
    { m: 'Sep', val: 19500 },
    { m: 'Oct', val: 18600, current: true },
  ];

  const maxVal = Math.max(...monthsData.map((d) => d.val));

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return [
      { cat: 'Food & drinks', pct: 28, amt: 5140, color: '#F59E0B' },
      { cat: 'Home', pct: 23, amt: 4220, color: '#10B981' },
      { cat: 'Shopping', pct: 19, amt: 3480, color: '#8B5CF6' },
      { cat: 'Transport', pct: 16, amt: 2940, color: '#0284C7' },
      { cat: 'Other', pct: 14, amt: 2600, color: '#94A3B8' },
      { cat: 'Investments saved', pct: 0, amt: 0, color: '#0F4C3A' },
    ];
  }, []);

  // Compute CSS conic gradient for real pie/donut slices
  const conicGradient = useMemo(() => {
    const valid = categoryBreakdown.filter((item) => item.pct > 0);
    if (valid.length === 0) return '#E2E8F0';
    let accum = 0;
    const stops: string[] = [];
    for (const item of valid) {
      const start = accum;
      const end = Math.min(100, accum + item.pct);
      accum = end;
      stops.push(`${item.color} ${start}% ${end}%`);
    }
    if (accum < 100) {
      stops.push(`#CBD5E1 ${accum}% 100%`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [categoryBreakdown]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Demo Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Air-gapped private ledger — all financial data persists locally on this physical device.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        {/* Available this month */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardMint, borderColor: colors.cardMintBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>AVAILABLE IN {(activeMonth || 'THIS MONTH').toUpperCase()}</Text>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{formatRupee(availableThisMonth)}</Text>
          <Text style={[styles.kpiSub, { color: colors.successText }]}>↗ 12.8% vs last month</Text>
        </View>

        {/* Total Income */}
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>TOTAL INCOME</Text>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>
            {formatRupee(totalIncome > 0 ? totalIncome : 148000)}
          </Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>↗ 8.4% salary + side income</Text>
        </View>

        {/* Total Expenses */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardCream, borderColor: colors.cardCreamBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>TOTAL EXPENSES</Text>
            <Ionicons name="bar-chart-outline" size={16} color={colors.warning} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>
            {formatRupee(totalExpenses > 0 ? totalExpenses : 18600)}
          </Text>
          <Text style={[styles.kpiSub, { color: colors.warningText }]}>-4.2% under your budget</Text>
        </View>

        {/* Savings Rate */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardLavender, borderColor: colors.cardLavenderBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>SAVINGS RATE</Text>
            <Ionicons name="trending-up-outline" size={16} color="#6D28D9" />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{savingsRate || 87}%</Text>
          <Text style={[styles.kpiSub, { color: '#6D28D9' }]}>↗ 6 pts better than Sep</Text>
        </View>

        {/* Investments Saved */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardIce, borderColor: colors.cardIceBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>INVESTMENTS SAVED</Text>
            <Ionicons name="leaf-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>₹0</Text>
          <Text style={[styles.kpiSub, { color: colors.primary }]}>↗ Savings, not an expense</Text>
        </View>
      </View>

      {/* Middle Row: Spending Rhythm & Where it goes */}
      <View style={styles.twoColRow}>
        {/* Spending Rhythm */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1.3 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>SPENDING RHYTHM</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Monthly expenses</Text>
            </View>
            <View style={styles.panelActions}>
              <TouchableOpacity style={[styles.actionIconBtn, { borderColor: colors.borderSubtle }]}>
                <Ionicons name="download-outline" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.filterDropdown, { borderColor: colors.borderSubtle }]}>
                <Text style={[styles.filterDropdownText, { color: colors.textSecondary }]}>Last 12 months</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>

          <View style={styles.panelMetricRow}>
            <Text style={[styles.panelBigNum, { color: colors.textPrimary }]}>{formatRupee(totalExpenses > 0 ? totalExpenses : 18600)}</Text>
            <Text style={[styles.panelGrowthBadge, { color: colors.successText }]}>↗ 4.7% lower than your monthly average</Text>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.barsRow}>
              {monthsData.map((d) => {
                const heightPct = Math.max(15, Math.round((d.val / maxVal) * 110));
                return (
                  <View key={d.m} style={styles.barCol}>
                    {d.current && (
                      <Text style={[styles.barTopLabel, { color: colors.warningText }]}>
                        {formatCompactRupee(d.val)}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: heightPct,
                          backgroundColor: d.current ? '#F59E0B' : '#D1FAE5',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.barXLabel,
                        { color: d.current ? colors.textPrimary : colors.textMuted },
                        d.current && { fontWeight: '700' },
                      ]}
                    >
                      {d.m}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Where it Goes (Category Donut & Legend) */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>WHERE IT GOES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Spend & save by category</Text>
            </View>
            <TouchableOpacity style={[styles.actionIconBtn, { borderColor: colors.borderSubtle }]}>
              <Ionicons name="ellipsis-horizontal" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Visual Segmented Donut Ring Representation */}
          <View style={styles.donutRow}>
            <View
              style={[
                styles.donutRingBox,
                {
                  // @ts-ignore
                  backgroundImage: conicGradient,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                },
              ]}
            >
              <View
                style={[
                  styles.donutInnerHole,
                  {
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.donutCenterAmount,
                    { color: selectedCat ? selectedCat.color : colors.textPrimary },
                  ]}
                >
                  {selectedCat ? formatCompactRupee(selectedCat.amt) : '₹18.6k'}
                </Text>
                <Text
                  style={[
                    styles.donutCenterLabel,
                    { color: selectedCat ? colors.textPrimary : colors.textMuted },
                    selectedCat && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {selectedCat ? `${selectedCat.pct}% ${selectedCat.cat}` : 'expenses'}
                </Text>
              </View>
            </View>

            {/* Legend Column with Interactive Taps */}
            <View style={styles.legendCol}>
              {categoryBreakdown.map((item) => {
                const isSelected = selectedCat?.cat === item.cat;
                return (
                  <TouchableOpacity
                    key={item.cat}
                    onPress={() => setSelectedCat(isSelected ? null : item)}
                    style={[
                      styles.legendItem,
                      isSelected && {
                        backgroundColor: '#F1F5F9',
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      },
                    ]}
                  >
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text
                      style={[
                        styles.legendName,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                        isSelected && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.cat}
                    </Text>
                    <Text style={[styles.legendPct, { color: colors.textMuted }]}>{item.pct}%</Text>
                    <Text
                      style={[
                        styles.legendAmt,
                        { color: isSelected ? item.color : colors.textPrimary },
                      ]}
                    >
                      {formatCompactRupee(item.amt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Row: Latest Entries & Current Cycles */}
      <View style={styles.twoColRow}>
        {/* Latest Entries */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1.2 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>LATEST ENTRIES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Recent transactions</Text>
            </View>
            <TouchableOpacity onPress={onNavigateToTransactions} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {transactions.slice(0, 4).map((tx) => {
              const isIncome = tx.type === 'INFLOW';
              const acc = accounts.find((a) => a.id === tx.account_id);
              return (
                <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.borderSubtle }]}>
                  <View
                    style={[
                      styles.txIconBox,
                      { backgroundColor: isIncome ? colors.cardMint : '#FEE2E2' },
                    ]}
                  >
                    <Ionicons
                      name={isIncome ? 'cash-outline' : 'cafe-outline'}
                      size={18}
                      color={isIncome ? colors.successText : colors.dangerText}
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={[styles.txTitle, { color: colors.textPrimary }]}>{tx.description || tx.category}</Text>
                    <Text style={[styles.txSub, { color: colors.textMuted }]}>
                      {tx.category} • {acc?.name || 'Account'}
                    </Text>
                  </View>

                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {safeFormatDate(tx.timestamp, 'en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </Text>

                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? colors.successText : colors.textPrimary },
                      ]}
                    >
                      {formatRupee(tx.amount, true)}
                    </Text>
                    <View
                      style={[
                        styles.txBadge,
                        { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txBadgeText,
                          { color: isIncome ? '#15803D' : '#B91C1C' },
                        ]}
                      >
                        {isIncome ? 'Credit' : 'Debit'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Current Cycles (Credit card usage) */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>CURRENT CYCLES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Credit card usage</Text>
            </View>
            <TouchableOpacity onPress={onNavigateToCards} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Manage</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Card Cycle Card */}
          <View style={[styles.cycleBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
            <View style={styles.cycleTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.cardIconSmall, { backgroundColor: colors.cardMint }]}>
                  <Ionicons name="card" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.cycleCardName, { color: colors.textPrimary }]}>
                    {regaliaCard?.name || 'HDFC Regalia'}
                  </Text>
                  <Text style={[styles.cycleCardDigits, { color: colors.textMuted }]}>
                    •• {regaliaCard?.last4 || '4812'}
                  </Text>
                </View>
              </View>
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
            </View>

            {/* Usage Progress Bar */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.usageRow}>
                <Text style={[styles.usageAmounts, { color: colors.textPrimary }]}>
                  {formatRupee(cardDebt)} <Text style={{ color: colors.textMuted, fontSize: 12 }}>used of {formatRupee(cardLimit)}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: cardUtil > 30 ? colors.danger : cardUtil > 15 ? colors.warning : colors.success }]} />
                  <Text
                    style={[
                      styles.utilBadgeText,
                      { color: cardUtil > 30 ? colors.danger : cardUtil > 15 ? colors.warningText : colors.successText },
                    ]}
                  >
                    {cardUtil}% • {cardUtil > 30 ? 'Attention' : cardUtil > 15 ? 'Watch' : 'Healthy'}
                  </Text>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, cardUtil)}%`,
                      backgroundColor: cardUtil > 30 ? colors.danger : cardUtil > 15 ? colors.warning : colors.success,
                    },
                  ]}
                />
              </View>

              <View style={styles.cycleDatesRow}>
                <Text style={[styles.cycleDateText, { color: colors.textMuted }]}>
                  Bill generated {regaliaCard?.billing_cycle_cut_day || 10}th
                </Text>
                <Text style={[styles.cycleDateText, { color: colors.textMuted }]}>
                  Due {regaliaCard?.payment_due_day || 25} Nov
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  demoBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  twoColRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  panelCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 280,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelMicro: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterDropdownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  panelMetricRow: {
    marginBottom: 16,
  },
  panelBigNum: {
    fontSize: 24,
    fontWeight: '800',
  },
  panelGrowthBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chartContainer: {
    height: 150,
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTopLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  barFill: {
    width: 14,
    borderRadius: 4,
  },
  barXLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 14,
  },
  donutRingBox: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  donutInnerHole: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: 10,
  },
  legendCol: {
    flex: 1,
    paddingLeft: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendName: {
    fontSize: 12,
    flex: 1,
  },
  legendPct: {
    fontSize: 11,
    marginRight: 10,
  },
  legendAmt: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  txList: {
    gap: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  txSub: {
    fontSize: 11,
    marginTop: 2,
  },
  txDate: {
    fontSize: 11,
    marginRight: 16,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cycleBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cycleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleCardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  cycleCardDigits: {
    fontSize: 11,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageAmounts: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  utilBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cycleDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cycleDateText: {
    fontSize: 11,
  },
});
