import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee, formatCompactRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';
import { Transaction } from '../../core/types/transactions';
import { Account } from '../../core/types/accounts';
import { FinancialCycleModal } from '../../presentation/components/modals/FinancialCycleModal';
import { NotificationsModal } from '../../presentation/components/modals/NotificationsModal';

interface OverviewScreenProps {
  onNavigateToTransactions: () => void;
  onNavigateToCards: () => void;
  onOpenAddEntry: () => void;
  onOpenProfile?: () => void;
  onOpenAddAccount?: () => void;
  onEditAccount?: (acc: Account) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  onNavigateToTransactions,
  onNavigateToCards,
  onOpenAddEntry,
  onOpenProfile,
  onOpenAddAccount,
  onEditAccount,
}) => {
  const { colors } = useTheme();
  const {
    accounts,
    transactions,
    totalLiquidCash,
    totalBankCash,
    totalWalletCash,
    totalCreditDebt,
    obligations,
    investments,
    portfolioMetrics,
    activeMonth,
    setActiveMonth,
    plannedBudgets,
  } = useFinanceData();

  // Modals state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Micro toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Helper to identify Opening Balances
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

  // Total Outflow Expenses
  const totalExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t) && !isOpeningBalance(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // Total Planned Budget
  const totalAllocatedBudget = useMemo(() => {
    return plannedBudgets.reduce((sum, b) => sum + b.planned_amount, 0) || 1;
  }, [plannedBudgets]);

  const budgetProgressPct = Math.min(
    100,
    Math.round((totalExpenses / totalAllocatedBudget) * 100)
  );

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return currentMonthTransactions.slice(0, 6);
  }, [currentMonthTransactions]);

  // Account display helper
  const getAccountName = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? acc.name : 'Vault Account';
  };

  // Category Icon helper
  const getCategoryIcon = (category: string, type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'TRANSFER') return 'swap-horizontal';
    const c = (category || '').toLowerCase();
    if (c.includes('food') || c.includes('coffee') || c.includes('dining')) return 'cafe-outline';
    if (c.includes('salary') || c.includes('income')) return 'briefcase-outline';
    if (c.includes('grocer') || c.includes('shop')) return 'cart-outline';
    if (c.includes('car') || c.includes('transport') || c.includes('fuel')) return 'car-outline';
    if (c.includes('bill') || c.includes('utilities')) return 'flash-outline';
    if (c.includes('invest') || c.includes('sip')) return 'trending-up-outline';
    return 'card-outline';
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background || '#051424' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector & Quick Actions Bar */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[
              styles.monthPillBtn,
              {
                backgroundColor: colors.surfaceContainer || '#122131',
                borderColor: colors.surfaceVariant || '#273647',
              },
            ]}
            onPress={() => setIsCalendarOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color="#52b788" />
            <Text style={[styles.monthPillText, { color: colors.textPrimary || '#d4e4fa' }]}>
              {activeMonth || 'Current Period'}
            </Text>
            <Ionicons name="chevron-down" size={15} color={colors.textMuted || '#94a3b8'} />
          </TouchableOpacity>

          <View
            style={[
              styles.currentPeriodBadge,
              {
                backgroundColor: 'rgba(82, 183, 136, 0.12)',
                borderColor: 'rgba(82, 183, 136, 0.3)',
              },
            ]}
          >
            <Text style={styles.currentPeriodText}>CURRENT PERIOD</Text>
          </View>
        </View>

        {/* Top Metric Bar: 3-column split card */}
        <View style={[styles.topMetricCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          <View style={styles.topMetricGrid}>
            {/* 1. Liquid Net */}
            <View style={[styles.metricColumn, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted || '#94a3b8' }]}>Liquid Net</Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary || '#d4e4fa' }]} numberOfLines={1}>
                {formatRupee(totalLiquidCash)}
              </Text>
              <View style={styles.metricMetaRow}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#52b788" />
                <Text style={[styles.metricSubText, { color: '#52b788' }]}>Available</Text>
              </View>
            </View>

            {/* 2. Total Expenses with Progress Bar */}
            <View style={[styles.metricColumn, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted || '#94a3b8' }]}>
                Spent / {activeMonth ? activeMonth.split(' ')[0].substring(0, 3) : 'Month'}
              </Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary || '#d4e4fa' }]} numberOfLines={1}>
                {formatRupee(totalExpenses)}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${budgetProgressPct}%`,
                      backgroundColor: budgetProgressPct > 90 ? '#ffb4ab' : '#ffca45',
                    },
                  ]}
                />
              </View>
            </View>

            {/* 3. Investments / SIP */}
            <View style={[styles.metricColumn, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted || '#94a3b8' }]}>Invested / SIP</Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary || '#d4e4fa' }]} numberOfLines={1}>
                {formatRupee(portfolioMetrics.totalInvested)}
              </Text>
              <View style={styles.metricMetaRow}>
                <Ionicons name="pie-chart-outline" size={12} color="#52b788" />
                <Text style={[styles.metricSubText, { color: '#52b788' }]}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Asset Carousel Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet-outline" size={18} color="#52b788" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#d4e4fa' }]}>
              Active Accounts & Cards
            </Text>
          </View>
          <Text style={[styles.sectionCountText, { color: colors.textMuted || '#94a3b8' }]}>
            {accounts.length} Assets
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={272}
          decelerationRate="fast"
        >
          {accounts.map((acc) => {
            if (acc.type === 'BANK_DEPOSIT') {
              const isHealthy = (acc.minimum_balance || 0) <= acc.balance;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.carouselCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                  onPress={() => onEditAccount && onEditAccount(acc)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIdentity}>
                      <View style={[styles.cardIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                        <Ionicons name="business" size={17} color="#52b788" />
                      </View>
                      <View>
                        <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {acc.name}
                        </Text>
                        <Text style={[styles.cardSubtype, { color: colors.textMuted }]}>Bank Account</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isHealthy ? 'rgba(82, 183, 136, 0.15)' : 'rgba(255, 180, 171, 0.15)',
                        },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: isHealthy ? '#52b788' : '#ffb4ab' }]}>
                        {isHealthy ? 'Healthy' : 'Alert'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMiddle}>
                    <Text style={[styles.cardBalanceLabel, { color: colors.textMuted }]}>Available Cash</Text>
                    <Text style={[styles.cardBalanceValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {formatRupee(acc.balance)}
                    </Text>
                  </View>

                  <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
                    <Text style={[styles.footerSubText, { color: colors.textMuted }]}>
                      Min: {formatRupee(acc.minimum_balance || 0)}
                    </Text>
                    <Text style={[styles.footerActionText, { color: '#52b788' }]}>Manage</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            if (acc.type === 'CREDIT_CARD') {
              const limit = acc.credit_limit || 50000;
              const utilPct = Math.round((acc.balance / limit) * 100);
              const isHigh = utilPct > 30;

              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.carouselCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                  onPress={() => onEditAccount && onEditAccount(acc)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIdentity}>
                      <View style={[styles.cardIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                        <Ionicons name="card" size={17} color="#ffca45" />
                      </View>
                      <View>
                        <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {acc.name}
                        </Text>
                        <Text style={[styles.cardSubtype, { color: colors.textMuted }]}>
                          Due {acc.payment_due_day || 20}th
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isHigh ? 'rgba(255, 180, 171, 0.15)' : 'rgba(82, 183, 136, 0.15)',
                        },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: isHigh ? '#ffb4ab' : '#52b788' }]}>
                        {isHigh ? `High ${utilPct}%` : `Safe ${utilPct}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMiddle}>
                    <Text style={[styles.cardBalanceLabel, { color: colors.textMuted }]}>Pending Balance</Text>
                    <Text style={[styles.cardBalanceValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {formatRupee(acc.balance)}
                    </Text>
                  </View>

                  <View style={styles.cardProgressWrap}>
                    <View style={styles.cardProgressHeader}>
                      <Text style={[styles.cardLimitText, { color: colors.textMuted }]}>
                        Limit {formatCompactRupee(limit)}
                      </Text>
                      <Text style={[styles.cardTargetText, { color: isHigh ? '#ffb4ab' : '#52b788' }]}>
                        {isHigh ? '>30% Limit' : '<30% Target'}
                      </Text>
                    </View>
                    <View style={styles.cardProgressBarBg}>
                      <View
                        style={[
                          styles.cardProgressBarFill,
                          {
                            width: `${Math.min(100, utilPct)}%`,
                            backgroundColor: isHigh ? '#ffb4ab' : '#52b788',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            // PHYSICAL_WALLET
            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.carouselCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => onEditAccount && onEditAccount(acc)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIdentity}>
                    <View style={[styles.cardIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                      <Ionicons name="cash" size={17} color="#ffca45" />
                    </View>
                    <View>
                      <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {acc.name || 'Cash Wallet'}
                      </Text>
                      <Text style={[styles.cardSubtype, { color: colors.textMuted }]}>Physical Pocket</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(82, 183, 136, 0.15)' }]}>
                    <Text style={[styles.statusPillText, { color: '#52b788' }]}>Active</Text>
                  </View>
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={[styles.cardBalanceLabel, { color: colors.textMuted }]}>On-Hand Currency</Text>
                  <Text style={[styles.cardBalanceValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    {formatRupee(acc.balance)}
                  </Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
                  <Text style={[styles.footerSubText, { color: colors.textMuted }]}>Physical Cash</Text>
                  <Text style={[styles.footerActionText, { color: '#52b788' }]}>Adjust</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add Account Card */}
          {onOpenAddAccount && (
            <TouchableOpacity
              style={[
                styles.carouselCard,
                styles.addCardSlot,
                {
                  backgroundColor: colors.surfaceContainer || '#122131',
                  borderColor: colors.borderSubtle || '#1c2b3c',
                },
              ]}
              onPress={onOpenAddAccount}
              activeOpacity={0.8}
            >
              <View style={[styles.addCardIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                <Ionicons name="add" size={24} color="#52b788" />
              </View>
              <Text style={[styles.addCardTitle, { color: colors.textPrimary }]}>+ Add Tool</Text>
              <Text style={[styles.addCardSub, { color: colors.textMuted }]}>Bank, Card or Wallet</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={18} color="#52b788" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#d4e4fa' }]}>
              Recent Activity
            </Text>
          </View>
          <TouchableOpacity onPress={onNavigateToTransactions} activeOpacity={0.7}>
            <Text style={[styles.viewAllBtn, { color: '#52b788' }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Card List */}
        <View style={[styles.activityListCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Ionicons name="receipt-outline" size={32} color={colors.textMuted || '#94a3b8'} />
              <Text style={[styles.emptyActivityTitle, { color: colors.textPrimary }]}>No movements recorded</Text>
              <Text style={[styles.emptyActivitySub, { color: colors.textMuted }]}>
                Use the + action button to record a spend or credit.
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx, idx) => {
              const isIncome = tx.type === 'INFLOW';
              const isTransfer = tx.type === 'TRANSFER';
              const sign = isIncome ? '+' : isTransfer ? '' : '-';
              const amountColor = isIncome ? '#52b788' : isTransfer ? colors.textPrimary : colors.textPrimary;
              const iconName = getCategoryIcon(tx.category, tx.type);

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.activityRow,
                    idx !== recentTransactions.length - 1 && [
                      styles.activityRowBorder,
                      { borderBottomColor: 'rgba(255,255,255,0.06)' },
                    ],
                  ]}
                >
                  <View style={styles.activityLeft}>
                    <View
                      style={[
                        styles.activityIconBox,
                        {
                          backgroundColor: isIncome
                            ? 'rgba(82, 183, 136, 0.15)'
                            : 'rgba(255, 202, 69, 0.12)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={19}
                        color={isIncome ? '#52b788' : '#ffca45'}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {tx.description || tx.category || 'Transaction'}
                      </Text>
                      <View style={styles.activitySubRow}>
                        <View style={[styles.accountTag, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                          <Text style={[styles.accountTagText, { color: colors.textMuted }]}>
                            {getAccountName(tx.account_id)}
                          </Text>
                        </View>
                        <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                          • {safeFormatDate(tx.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.activityRight}>
                    <Text style={[styles.activityAmount, { color: amountColor }]}>
                      {sign}
                      {formatRupee(tx.amount)}
                    </Text>
                    <Text style={[styles.activityCategoryText, { color: colors.textMuted }]}>
                      {tx.category}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Micro Toast */}
      {toastMessage && (
        <View style={styles.toastWrap}>
          <View style={[styles.toastPill, { backgroundColor: colors.surfaceContainerHighest || '#273647' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#52b788" />
            <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Financial Cycle Selector Modal */}
      <FinancialCycleModal
        visible={isCalendarOpen}
        activeMonth={activeMonth}
        onSelectMonth={(m) => {
          setActiveMonth(m);
          showToast(`Cycle updated to ${m}`);
        }}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* Notifications Drawer Modal */}
      <NotificationsModal
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  currentPeriodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  currentPeriodText: {
    color: '#52b788',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topMetricCard: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  topMetricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricColumn: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metricMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metricSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#1c2b3c',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionCountText: {
    fontSize: 12,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: '700',
  },
  carouselContainer: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 22,
  },
  carouselCard: {
    width: 260,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtype: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMiddle: {
    marginVertical: 14,
  },
  cardBalanceLabel: {
    fontSize: 11,
  },
  cardBalanceValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerSubText: {
    fontSize: 11,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardProgressWrap: {
    marginTop: 2,
  },
  cardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLimitText: {
    fontSize: 11,
  },
  cardTargetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardProgressBarBg: {
    height: 6,
    backgroundColor: '#1c2b3c',
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  addCardSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    minHeight: 160,
  },
  addCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  activityListCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  activitySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  accountTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  accountTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 11,
  },
  activityRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityCategoryText: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyActivityBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyActivityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyActivitySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  toastWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
