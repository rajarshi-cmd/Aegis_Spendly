import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee, formatCompactRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';
import { Transaction } from '../../core/types/transactions';

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
  const {
    accounts,
    transactions,
    totalBankCash,
    totalCreditDebt,
    obligations,
    activeMonth,
    setActiveMonth,
  } = useFinanceData();

  // Selected category slice for interactive donut hover/tap
  const [selectedCat, setSelectedCat] = useState<{ cat: string; pct: number; amt: number; color: string } | null>(null);

  // Helper to identify Opening Balances (DEF-010)
  const isOpeningBalance = (t: Transaction) => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return cat === 'opening balance' || desc.includes('opening');
  };

  const isSavingsTx = (t: Transaction) => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return (
      cat.includes('saving') ||
      cat.includes('invest') ||
      desc.includes('sip') ||
      desc.includes('saving') ||
      desc.includes('invest') ||
      isOpeningBalance(t) ||
      t.type === 'TRANSFER'
    );
  };

  // Month-filtered transactions
  const currentMonthTransactions = useMemo(() => {
    if (!activeMonth || activeMonth.toLowerCase() === 'all months') {
      return transactions;
    }
    return transactions.filter((t) => isDateInMonth(t.timestamp, activeMonth));
  }, [transactions, activeMonth]);

  // Calculations for selected active month (DEF-010: exclude opening balances from income and expenses)
  const totalIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'INFLOW' && !isOpeningBalance(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const totalExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t) && !isOpeningBalance(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const availableThisMonth = totalBankCash > 0 ? totalBankCash : Math.max(0, totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Credit card for quick cycle widget
  const regaliaCard = accounts.find((a) => a.type === 'CREDIT_CARD') || accounts[0];
  const cardLimit = regaliaCard?.credit_limit || 52000;
  const cardDebt = regaliaCard?.balance || 0;
  const cardUtil = cardLimit > 0 ? Math.round((cardDebt / cardLimit) * 1000) / 10 : 0;

  // Real 12 Months bar chart data (DEF-014 & DEF-019)
  const monthsData = useMemo(() => {
    const activeYear = parseInt((activeMonth || '').match(/\d{4}/)?.[0] || new Date().getFullYear().toString(), 10);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((name, idx) => {
      const fullMonthName = `${name} ${activeYear}`;
      const shortName = monthShorts[idx];
      const monthExpenses = transactions
        .filter((t) =>
          t.type === 'OUTFLOW' &&
          !isSavingsTx(t) &&
          !isOpeningBalance(t) &&
          isDateInMonth(t.timestamp, fullMonthName)
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const isCurrent = activeMonth === fullMonthName;
      return {
        m: shortName,
        fullName: fullMonthName,
        val: monthExpenses,
        current: isCurrent,
      };
    });
  }, [transactions, activeMonth]);

  const maxVal = Math.max(1, ...monthsData.map((d) => d.val));

  // Category breakdown computed strictly from real transactions (DEF-013)
  const categoryBreakdown = useMemo(() => {
    const expenseTxs = currentMonthTransactions.filter(
      (t) => t.type === 'OUTFLOW' && !isSavingsTx(t) && !isOpeningBalance(t)
    );
    const catTotals: Record<string, number> = {};
    let sum = 0;

    expenseTxs.forEach((t) => {
      const c = t.category || 'Other';
      catTotals[c] = (catTotals[c] || 0) + t.amount;
      sum += t.amount;
    });

    if (sum === 0) return [];

    const categoryColors: Record<string, string> = {
      'Food & drinks': '#F59E0B',
      'Home': '#10B981',
      'Shopping': '#8B5CF6',
      'Transport': '#0284C7',
      'Bills & utilities': '#EF4444',
      'Entertainment': '#EC4899',
      'Investments': '#059669',
      'Other': '#94A3B8',
    };
    const fallbackColors = ['#F59E0B', '#10B981', '#8B5CF6', '#0284C7', '#EF4444', '#EC4899', '#059669', '#94A3B8'];

    return Object.entries(catTotals)
      .map(([cat, amt], idx) => ({
        cat,
        amt,
        pct: Math.round((amt / sum) * 100),
        color: categoryColors[cat] || fallbackColors[idx % fallbackColors.length],
      }))
      .sort((a, b) => b.amt - a.amt);
  }, [currentMonthTransactions]);

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
          <Text style={[styles.kpiSub, { color: colors.successText }]}>Bank cash & liquid reserves</Text>
        </View>

        {/* Total Income (DEF-010: real income only) */}
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>TOTAL INCOME</Text>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>
            {formatRupee(totalIncome)}
          </Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>Salary, credits & earnings</Text>
        </View>

        {/* Total Expenses (DEF-010: real expenses only) */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardCream, borderColor: colors.cardCreamBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>TOTAL EXPENSES</Text>
            <Ionicons name="arrow-up-circle-outline" size={16} color={colors.danger} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>
            {formatRupee(totalExpenses)}
          </Text>
          <Text style={[styles.kpiSub, { color: colors.dangerText }]}>Outflows & card spends</Text>
        </View>

        {/* Net Savings Rate */}
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>SAVINGS RATE</Text>
            <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{savingsRate}%</Text>
          <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Net retained this month</Text>
        </View>
      </View>

      {/* Middle Row: Monthly Expenses Bar Chart & Category Donut */}
      <View style={styles.twoColRow}>
        {/* Monthly Expenses Chart (DEF-014 & DEF-019: Real data, clickable bars) */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1.4 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>MONTHLY EXPENSES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Real expense trends</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Tap bar to switch month</Text>
            </View>
          </View>

          <View style={styles.panelMetricRow}>
            <Text style={[styles.panelBigNum, { color: colors.textPrimary }]}>{formatRupee(totalExpenses)}</Text>
            <Text style={[styles.panelGrowthBadge, { color: colors.textSecondary }]}>Expenses in {activeMonth}</Text>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.barsRow}>
              {monthsData.map((d) => {
                const heightPct = d.val > 0 ? Math.max(16, Math.round((d.val / maxVal) * 110)) : 6;
                return (
                  <TouchableOpacity
                    key={d.fullName}
                    style={styles.barCol}
                    onPress={() => setActiveMonth(d.fullName)}
                    activeOpacity={0.7}
                  >
                    {d.current && d.val > 0 && (
                      <Text style={[styles.barTopLabel, { color: colors.warningText }]}>
                        {formatCompactRupee(d.val)}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: heightPct,
                          backgroundColor: d.current
                            ? '#F59E0B'
                            : d.val > 0
                            ? '#D1FAE5'
                            : '#E2E8F0',
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
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Where it Goes (Category Donut & Legend - DEF-013) */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>WHERE IT GOES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Spend by category</Text>
            </View>
          </View>

          {categoryBreakdown.length === 0 ? (
            <View style={{ padding: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="pie-chart-outline" size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                No expenses in {activeMonth}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                Debit transactions you log will automatically generate your category breakdown here.
              </Text>
            </View>
          ) : (
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
                    {selectedCat ? formatCompactRupee(selectedCat.amt) : formatCompactRupee(totalExpenses)}
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
          )}
        </View>
      </View>

      {/* Bottom Row: Latest Entries (DEF-018: monthFilteredTransactions) & Current Cycles */}
      <View style={styles.twoColRow}>
        {/* Latest Entries for Active Month */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1.2 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>LATEST ENTRIES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Recent transactions ({activeMonth})</Text>
            </View>
            <TouchableOpacity onPress={onNavigateToTransactions} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {currentMonthTransactions.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>No movements recorded for {activeMonth}.</Text>
              </View>
            ) : (
              currentMonthTransactions.slice(0, 4).map((tx) => {
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

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: isIncome ? colors.successText : colors.textPrimary },
                        ]}
                      >
                        {isIncome ? '+' : '-'}{formatRupee(tx.amount)}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.textMuted }]}>
                        {safeFormatDate(tx.timestamp, 'en-IN', { month: 'short', day: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Current Billing Cycles */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.panelMicro, { color: colors.textMuted }]}>CURRENT CYCLES</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Upcoming dues</Text>
            </View>
            <TouchableOpacity onPress={onNavigateToCards} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View cards</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.cycleCardBox}>
            <View style={styles.cycleTop}>
              <View style={[styles.cardTag, { backgroundColor: colors.cardSkinEmerald }]}>
                <Ionicons name="card-outline" size={14} color="#064E3B" style={{ marginRight: 4 }} />
                <Text style={styles.cardTagText}>{regaliaCard?.name || 'Primary Card'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>Healthy ({cardUtil}%)</Text>
              </View>
            </View>

            <View style={styles.cycleDetailsRow}>
              <View>
                <Text style={[styles.cycleDetailLabel, { color: colors.textMuted }]}>Current Balance</Text>
                <Text style={[styles.cycleDetailVal, { color: colors.textPrimary }]}>{formatRupee(cardDebt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.cycleDetailLabel, { color: colors.textMuted }]}>Credit Limit</Text>
                <Text style={[styles.cycleDetailVal, { color: colors.textPrimary }]}>{formatRupee(cardLimit)}</Text>
              </View>
            </View>

            {/* Visual utilization bar */}
            <View style={[styles.utilTrack, { backgroundColor: colors.borderSubtle }]}>
              <View
                style={[
                  styles.utilFill,
                  {
                    width: `${Math.min(100, cardUtil)}%`,
                    backgroundColor: cardUtil > 30 ? colors.danger : colors.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.cycleFooter}>
              <Text style={[styles.cycleFooterText, { color: colors.textMuted }]}>
                Billing cut: {regaliaCard?.billing_cycle_cut_day || 15}th • Due: {regaliaCard?.payment_due_day || 5}th
              </Text>
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
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  panelCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelMicro: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  panelMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 16,
  },
  panelBigNum: {
    fontSize: 24,
    fontWeight: '800',
  },
  panelGrowthBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    height: 140,
    justifyContent: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 16,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  barTopLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  barFill: {
    width: 14,
    borderRadius: 4,
    minHeight: 6,
  },
  barXLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  donutRingBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInnerHole: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  donutCenterAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  legendCol: {
    flex: 1,
    gap: 7,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 12,
    flex: 1,
  },
  legendPct: {
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
  legendAmt: {
    fontSize: 12,
    fontWeight: '600',
    width: 52,
    textAlign: 'right',
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
  },
  txDetails: {
    flex: 1,
    marginLeft: 12,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  txSub: {
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  cycleCardBox: {
    gap: 12,
    paddingTop: 4,
  },
  cycleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cycleDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cycleDetailLabel: {
    fontSize: 11,
  },
  cycleDetailVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  utilTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  utilFill: {
    height: '100%',
    borderRadius: 3,
  },
  cycleFooter: {
    marginTop: 2,
  },
  cycleFooterText: {
    fontSize: 11,
  },
});
