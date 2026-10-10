import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { FinancialCycleModal } from '../../presentation/components/modals/FinancialCycleModal';
import { NotificationsModal } from '../../presentation/components/modals/NotificationsModal';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';
import { Transaction } from '../../core/types/transactions';

export type AnalyticsSubLedgerTab = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'INVESTMENTS' | 'ARCHIVED';

interface AnalyticsScreenProps {
  initialTab?: AnalyticsSubLedgerTab;
  onOpenAddEntry?: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  initialTab = 'EXPENSE',
  onOpenAddEntry,
  onEditTransaction,
}) => {
  const {
    transactions,
    deletedTransactions,
    accounts,
    bankAccounts,
    creditCards,
    physicalWallets,
    investments,
    plannedBudgets,
    activeMonth,
    setActiveMonth,
    restoreTransaction,
    permanentDeleteTransaction,
    deleteTransaction,
  } = useFinanceData();

  const [activeTab, setActiveTab] = useState<AnalyticsSubLedgerTab>(initialTab);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Filter transactions for active month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.timestamp) return false;
      return isDateInMonth(t.timestamp, activeMonth);
    });
  }, [transactions, activeMonth]);

  // Outflow (Expenses)
  const expenseTransactions = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'OUTFLOW');
  }, [monthTransactions]);

  // Inflow (Income)
  const incomeTransactions = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'INFLOW');
  }, [monthTransactions]);

  // Neutral Transfers (Self-Transfers, Card Bill Payments, ATM Cash Withdrawals)
  const transferTransactions = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'TRANSFER');
  }, [monthTransactions]);

  // Totals
  const totalExpense = useMemo(() => {
    return expenseTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [expenseTransactions]);

  const totalIncome = useMemo(() => {
    return incomeTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [incomeTransactions]);

  const totalTransfer = useMemo(() => {
    return transferTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transferTransactions]);

  const totalInvestedPortfolio = useMemo(() => {
    return investments.reduce((acc, inv) => acc + (inv.invested_amount || 0), 0);
  }, [investments]);

  const totalValuationPortfolio = useMemo(() => {
    return investments.reduce((acc, inv) => acc + (inv.current_value || inv.invested_amount || 0), 0);
  }, [investments]);

  const totalExcludedArchived = useMemo(() => {
    return deletedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [deletedTransactions]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'General';
      map[cat] = (map[cat] || 0) + t.amount;
    });

    const entries = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    return entries.sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions, totalExpense]);

  // Net Cash Delta & Capital Retention
  const netSurplus = totalIncome - totalExpense;
  const retentionRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Account routing
  const bankBurn = useMemo(() => {
    const bankIds = new Set(bankAccounts.map((b) => b.id));
    return expenseTransactions
      .filter((t) => bankIds.has(t.account_id))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [expenseTransactions, bankAccounts]);

  const cardBurn = useMemo(() => {
    const cardIds = new Set(creditCards.map((c) => c.id));
    return expenseTransactions
      .filter((t) => cardIds.has(t.account_id))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [expenseTransactions, creditCards]);

  const walletBurn = useMemo(() => {
    const walletIds = new Set(physicalWallets.map((w) => w.id));
    return expenseTransactions
      .filter((t) => walletIds.has(t.account_id))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [expenseTransactions, physicalWallets]);

  // Helper to find account name
  const getAccountName = (accId?: string | null) => {
    if (!accId) return '';
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Unknown Account';
  };

  // Helper to get category icon
  const getCategoryIcon = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('food') || lower.includes('dining')) return 'restaurant';
    if (lower.includes('shop')) return 'cart';
    if (lower.includes('house') || lower.includes('rent') || lower.includes('util')) return 'home';
    if (lower.includes('trans')) return 'car';
    if (lower.includes('sub')) return 'repeat';
    if (lower.includes('entert')) return 'film';
    if (lower.includes('health') || lower.includes('med')) return 'medkit';
    if (lower.includes('salary')) return 'briefcase';
    if (lower.includes('freelance')) return 'laptop';
    if (lower.includes('invest') || lower.includes('div')) return 'trending-up';
    if (lower.includes('cash') || lower.includes('atm')) return 'cash';
    return 'pricetag';
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#52b788', '#d4a373', '#e07a5f', '#40916c', '#b56576', '#ffca45', '#ff8a83', '#9381ff'];
    return colors[index % colors.length];
  };

  // Confirmation before restoring or permanently deleting
  const handleRestore = (tx: Transaction) => {
    Alert.alert('Restore Transaction', `Restore "${tx.description || tx.category}" to active ledger?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          await restoreTransaction(tx.id);
        },
      },
    ]);
  };

  const handlePermanentDelete = (tx: Transaction) => {
    Alert.alert(
      'Permanent Deletion',
      `Permanently wipe "${tx.description || tx.category}" from vault? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await permanentDeleteTransaction(tx.id);
          },
        },
      ]
    );
  };

  const handleArchive = (tx: Transaction) => {
    Alert.alert('Archive Transaction', `Move "${tx.description || tx.category}" to archived shelf?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(tx.id);
        },
      },
    ]);
  };

  // Filtered expense feed
  const filteredExpenses = useMemo(() => {
    return expenseTransactions.filter((tx) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        !selectedCategoryFilter ||
        tx.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [expenseTransactions, searchQuery, selectedCategoryFilter]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#52b788" />
          </View>
          <Text style={styles.brandTitle}>Ledger & Analytics</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsNotificationsOpen(true)}
          >
            <Ionicons name="notifications-outline" size={20} color="#d4e4fa" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector & Jump Chip */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={styles.periodPill}
            onPress={() => setIsCycleModalOpen(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#52b788" />
            <Text style={styles.periodPillText}>{activeMonth}</Text>
            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.currentPeriodBadge}>
            <Text style={styles.currentPeriodBadgeText}>CURRENT PERIOD</Text>
          </View>
        </View>

        {/* 5 Segmented Sub-ledger Tabs */}
        <View style={styles.segmentedNav}>
          <TouchableOpacity
            style={[styles.segTab, activeTab === 'EXPENSE' && styles.segTabActive]}
            onPress={() => setActiveTab('EXPENSE')}
          >
            <Text
              style={[styles.segTabText, activeTab === 'EXPENSE' && styles.segTabTextActive]}
            >
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'INCOME' && styles.segTabActive]}
            onPress={() => setActiveTab('INCOME')}
          >
            <Text
              style={[styles.segTabText, activeTab === 'INCOME' && styles.segTabTextActive]}
            >
              Income
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'TRANSFER' && styles.segTabActive]}
            onPress={() => setActiveTab('TRANSFER')}
          >
            <Text
              style={[styles.segTabText, activeTab === 'TRANSFER' && styles.segTabTextActive]}
            >
              Self Transfer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'INVESTMENTS' && styles.segTabActive]}
            onPress={() => setActiveTab('INVESTMENTS')}
          >
            <Text
              style={[styles.segTabText, activeTab === 'INVESTMENTS' && styles.segTabTextActive]}
            >
              Investments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'ARCHIVED' && styles.segTabActive]}
            onPress={() => setActiveTab('ARCHIVED')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[styles.segTabText, activeTab === 'ARCHIVED' && styles.segTabTextActive]}
              >
                Archived
              </Text>
              {deletedTransactions.length > 0 && (
                <View style={styles.archivedCountBadge}>
                  <Text style={styles.archivedCountText}>{deletedTransactions.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* TAB 1: EXPENSE VIEW (Default Prominent Analytics View) */}
        {/* ======================================================== */}
        {activeTab === 'EXPENSE' && (
          <View style={styles.tabContentBlock}>
            {/* Monthly Spend Summary Card with Stacked Category Bar */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="stats-chart" size={18} color="#52b788" />
                  <Text style={styles.cardTitle}>Monthly Spend Summary</Text>
                </View>
              </View>

              <View style={styles.spendTotalRow}>
                <View>
                  <Text style={styles.metricSubLabel}>TOTAL OUTFLOW</Text>
                  <Text style={styles.metricBigAmount}>{formatRupee(totalExpense)}</Text>
                </View>
                <View style={styles.trendPill}>
                  <Ionicons name="trending-down" size={14} color="#52b788" />
                  <Text style={styles.trendPillText}>Safe Pace</Text>
                </View>
              </View>

              {/* Stacked Category Distribution Bar */}
              <View style={styles.distributionBarWrapper}>
                <View style={styles.distributionBarHeader}>
                  <Text style={styles.distributionBarLabel}>Category Distribution</Text>
                  <Text style={styles.distributionBarCount}>
                    {categoryBreakdown.length} Categories Tracked
                  </Text>
                </View>

                <View style={styles.stackedBar}>
                  {categoryBreakdown.length === 0 ? (
                    <View style={[styles.barSegment, { width: '100%', backgroundColor: '#273647' }]} />
                  ) : (
                    categoryBreakdown.map((cat, idx) => (
                      <View
                        key={cat.name}
                        style={[
                          styles.barSegment,
                          {
                            width: `${Math.max(2, cat.percentage)}%`,
                            backgroundColor: getCategoryColor(idx),
                          },
                        ]}
                      />
                    ))
                  )}
                </View>

                {/* Category Legend Badges */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendScroll}>
                  <View style={styles.legendRow}>
                    {categoryBreakdown.map((cat, idx) => (
                      <TouchableOpacity
                        key={cat.name}
                        style={[
                          styles.legendItem,
                          selectedCategoryFilter === cat.name && styles.legendItemActive,
                        ]}
                        onPress={() => {
                          setSelectedCategoryFilter(
                            selectedCategoryFilter === cat.name ? null : cat.name
                          );
                        }}
                      >
                        <View
                          style={[styles.legendDot, { backgroundColor: getCategoryColor(idx) }]}
                        />
                        <Text style={styles.legendText}>
                          {cat.name} {cat.percentage.toFixed(0)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Spending Distribution List with Remaining Buffers */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Spending Distribution</Text>
              </View>

              <View style={styles.categoryList}>
                {categoryBreakdown.length === 0 ? (
                  <Text style={styles.emptyText}>No expenses recorded for {activeMonth}.</Text>
                ) : (
                  categoryBreakdown.map((cat, idx) => {
                    const budget = plannedBudgets.find(
                      (b) => b.category.toLowerCase() === cat.name.toLowerCase()
                    );
                    const allocated = budget ? budget.planned_amount : cat.amount * 1.25;
                    const remaining = Math.max(0, allocated - cat.amount);
                    const isOver = cat.amount > allocated;

                    return (
                      <View key={cat.name} style={styles.categoryItem}>
                        <View style={styles.categoryTop}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.catIconBox,
                                { backgroundColor: `${getCategoryColor(idx)}20` },
                              ]}
                            >
                              <Ionicons
                                name={getCategoryIcon(cat.name) as any}
                                size={16}
                                color={getCategoryColor(idx)}
                              />
                            </View>
                            <View>
                              <Text style={styles.catName}>{cat.name}</Text>
                              <Text style={styles.catAllocated}>
                                Allocated: {formatRupee(allocated)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.catRight}>
                            <Text style={styles.catSpent}>{formatRupee(cat.amount)}</Text>
                            <Text
                              style={[
                                styles.catRemaining,
                                isOver && { color: '#ffb4ab' },
                              ]}
                            >
                              {isOver ? 'Exceeded limit' : `${formatRupee(remaining)} remaining`}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.catProgressBar}>
                          <View
                            style={[
                              styles.catProgressFill,
                              {
                                width: `${Math.min(100, (cat.amount / allocated) * 100)}%`,
                                backgroundColor: isOver ? '#ffb4ab' : getCategoryColor(idx),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Net Cash Delta & Flow Routing */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Net Cash Delta</Text>
                  <Text style={styles.cardSubtitle}>Monthly velocity and capital retention</Text>
                </View>
                <View style={styles.deltaPill}>
                  <Text
                    style={[
                      styles.deltaAmount,
                      { color: netSurplus >= 0 ? '#52b788' : '#ffb4ab' },
                    ]}
                  >
                    {netSurplus >= 0 ? `+${formatRupee(netSurplus)}` : formatRupee(netSurplus)}
                  </Text>
                  <Text style={styles.deltaLabel}>
                    {netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit'}
                  </Text>
                </View>
              </View>

              {/* Inflow vs Burn Rate bars */}
              <View style={styles.flowBarsWrapper}>
                <View style={styles.flowBarRow}>
                  <View style={styles.flowBarLabelRow}>
                    <Text style={styles.flowBarLabel}>
                      <Ionicons name="arrow-down" size={13} color="#52b788" /> Monthly Inflow
                    </Text>
                    <Text style={[styles.flowBarValue, { color: '#52b788' }]}>
                      {formatRupee(totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.flowTrack}>
                    <View style={[styles.flowFill, { width: '100%', backgroundColor: '#52b788' }]} />
                  </View>
                </View>

                <View style={styles.flowBarRow}>
                  <View style={styles.flowBarLabelRow}>
                    <Text style={styles.flowBarLabel}>
                      <Ionicons name="arrow-up" size={13} color="#ffb4ab" /> Net Burn Rate
                    </Text>
                    <Text style={[styles.flowBarValue, { color: '#ffb4ab' }]}>
                      {formatRupee(totalExpense)}
                    </Text>
                  </View>
                  <View style={styles.flowTrack}>
                    <View
                      style={[
                        styles.flowFill,
                        {
                          width: `${totalIncome > 0 ? Math.min(100, (totalExpense / totalIncome) * 100) : 100}%`,
                          backgroundColor: '#ffb4ab',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Capital Retention Rate Banner */}
              <View style={styles.retentionBanner}>
                <View style={styles.retentionLeft}>
                  <Ionicons name="pie-chart-outline" size={18} color="#52b788" />
                  <Text style={styles.retentionTitle}>Capital Retention Rate</Text>
                </View>
                <Text style={styles.retentionValue}>{retentionRate.toFixed(1)}%</Text>
              </View>

              {/* Account Level Routing breakdown */}
              <View style={styles.accountRoutingBlock}>
                <Text style={styles.routingHeader}>ACCOUNT LEVEL ROUTING</Text>

                <View style={styles.routingGrid}>
                  <View style={styles.routingCol}>
                    <Text style={styles.routingColLabel}>Bank Inflow</Text>
                    <Text style={[styles.routingColVal, { color: '#52b788' }]}>
                      +{formatRupee(totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.routingCol}>
                    <Text style={styles.routingColLabel}>Bank Outflow</Text>
                    <Text style={styles.routingColVal}>-{formatRupee(bankBurn)}</Text>
                  </View>
                  <View style={styles.routingCol}>
                    <Text style={styles.routingColLabel}>Card Spends</Text>
                    <Text style={[styles.routingColVal, { color: '#ffca45' }]}>
                      -{formatRupee(cardBurn)}
                    </Text>
                  </View>
                  <View style={styles.routingCol}>
                    <Text style={styles.routingColLabel}>Cash Wallet</Text>
                    <Text style={styles.routingColVal}>-{formatRupee(walletBurn)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Itemized Transactions Feed */}
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.cardTitle}>Itemized Debits</Text>
                <Text style={styles.feedCount}>{filteredExpenses.length} entries</Text>
              </View>

              {/* Search input */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by merchant or category..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Item Rows */}
              <View style={styles.txList}>
                {filteredExpenses.length === 0 ? (
                  <Text style={styles.emptyText}>No matching debit entries found.</Text>
                ) : (
                  filteredExpenses.map((tx) => (
                    <View key={tx.id} style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View style={styles.txIconBox}>
                          <Ionicons
                            name={getCategoryIcon(tx.category) as any}
                            size={16}
                            color="#52b788"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.description || tx.category}
                          </Text>
                          <Text style={styles.txSub}>
                            {tx.category} • {safeFormatDate(tx.timestamp)} •{' '}
                            {getAccountName(tx.account_id)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text style={styles.txAmountDebit}>-{formatRupee(tx.amount)}</Text>
                        <View style={styles.txActionRow}>
                          {onEditTransaction && (
                            <TouchableOpacity
                              style={styles.txActionBtn}
                              onPress={() => onEditTransaction(tx)}
                            >
                              <Ionicons name="pencil" size={13} color="#94a3b8" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.txActionBtn}
                            onPress={() => handleArchive(tx)}
                          >
                            <Ionicons name="archive-outline" size={13} color="#ff8a83" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: INCOME VIEW */}
        {/* ======================================================== */}
        {activeTab === 'INCOME' && (
          <View style={styles.tabContentBlock}>
            {/* Monthly Inflow Summary Card */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="business" size={18} color="#52b788" />
                  <Text style={styles.cardTitle}>Monthly Inflow Summary</Text>
                </View>
              </View>

              <View style={styles.spendTotalRow}>
                <View>
                  <Text style={styles.metricSubLabel}>TOTAL INFLOW</Text>
                  <Text style={[styles.metricBigAmount, { color: '#52b788' }]}>
                    {formatRupee(totalIncome)}
                  </Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: 'rgba(82, 183, 136, 0.15)' }]}>
                  <Ionicons name="trending-up" size={14} color="#52b788" />
                  <Text style={[styles.trendPillText, { color: '#86d7ad' }]}>
                    {incomeTransactions.length} Streams
                  </Text>
                </View>
              </View>

              <View style={styles.incomeBadgeRow}>
                <View style={styles.incomeDot} />
                <Text style={styles.incomeBadgeText}>
                  All income credited securely to offline vault
                </Text>
              </View>
            </View>

            {/* Income Streams List */}
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.cardTitle}>Inflow Transactions</Text>
                <Text style={styles.feedCount}>{incomeTransactions.length} items</Text>
              </View>

              <View style={styles.txList}>
                {incomeTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>No income credited for {activeMonth}.</Text>
                ) : (
                  incomeTransactions.map((tx) => (
                    <View key={tx.id} style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View style={[styles.txIconBox, { backgroundColor: 'rgba(82, 183, 136, 0.15)' }]}>
                          <Ionicons name="cash-outline" size={16} color="#52b788" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.description || tx.category}
                          </Text>
                          <Text style={styles.txSub}>
                            {tx.category} • {safeFormatDate(tx.timestamp)} •{' '}
                            {getAccountName(tx.account_id)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text style={styles.txAmountCredit}>+{formatRupee(tx.amount)}</Text>
                        <TouchableOpacity
                          style={styles.txActionBtn}
                          onPress={() => handleArchive(tx)}
                        >
                          <Ionicons name="archive-outline" size={13} color="#ff8a83" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SELF TRANSFER VIEW */}
        {/* ======================================================== */}
        {activeTab === 'TRANSFER' && (
          <View style={styles.tabContentBlock}>
            {/* Total Transferred Summary Card */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="swap-horizontal" size={18} color="#52b788" />
                  <Text style={styles.cardTitle}>Internal Capital Flow</Text>
                </View>
              </View>

              <View style={styles.spendTotalRow}>
                <View>
                  <Text style={styles.metricSubLabel}>TOTAL REALLOCATED</Text>
                  <Text style={styles.metricBigAmount}>{formatRupee(totalTransfer)}</Text>
                </View>
                <View style={styles.neutralFlowPill}>
                  <Text style={styles.neutralFlowPillText}>Neutral Flow</Text>
                </View>
              </View>

              <View style={styles.neutralExplainer}>
                <Ionicons name="information-circle-outline" size={16} color="#86d7ad" />
                <Text style={styles.neutralExplainerText}>
                  Transfers reallocate funds between your own tools (Card bill payments, ATM cash withdrawals, or bank deposits). They do not reduce net-worth or duplicate expense records.
                </Text>
              </View>
            </View>

            {/* Self-Transfer Ledger Rows */}
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.cardTitle}>Transfer Ledger</Text>
                <Text style={styles.feedCount}>{transferTransactions.length} movements</Text>
              </View>

              <View style={styles.txList}>
                {transferTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>No internal transfers recorded for {activeMonth}.</Text>
                ) : (
                  transferTransactions.map((tx) => (
                    <View key={tx.id} style={styles.transferRowCard}>
                      <View style={styles.transferRowTop}>
                        <View style={styles.transferIconBox}>
                          <Ionicons name="sync-outline" size={18} color="#52b788" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.transferPathRow}>
                            <Text style={styles.transferAccountName}>
                              {getAccountName(tx.account_id)}
                            </Text>
                            <Ionicons name="arrow-forward" size={13} color="#94a3b8" />
                            <Text style={styles.transferAccountName}>
                              {getAccountName(tx.destination_account_id)}
                            </Text>
                          </View>
                          <Text style={styles.txSub}>
                            {tx.category} • {safeFormatDate(tx.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.transferAmount}>{formatRupee(tx.amount)}</Text>
                      </View>

                      {tx.description && (
                        <View style={styles.transferNoteBox}>
                          <Text style={styles.transferNoteText}>“{tx.description}”</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 4: INVESTMENTS VIEW */}
        {/* ======================================================== */}
        {activeTab === 'INVESTMENTS' && (
          <View style={styles.tabContentBlock}>
            {/* Portfolio Overview Card */}
            <View style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="pie-chart" size={18} color="#52b788" />
                  <Text style={styles.cardTitle}>Portfolio Overview</Text>
                </View>
              </View>

              <View style={styles.spendTotalRow}>
                <View>
                  <Text style={styles.metricSubLabel}>CURRENT VALUATION</Text>
                  <Text style={[styles.metricBigAmount, { color: '#52b788' }]}>
                    {formatRupee(totalValuationPortfolio)}
                  </Text>
                </View>
                <View style={styles.investGainPill}>
                  <Ionicons name="trending-up" size={14} color="#52b788" />
                  <Text style={styles.investGainText}>
                    {totalInvestedPortfolio > 0
                      ? `${(((totalValuationPortfolio - totalInvestedPortfolio) / totalInvestedPortfolio) * 100).toFixed(1)}%`
                      : '0%'}
                  </Text>
                </View>
              </View>

              <View style={styles.investSubRow}>
                <Text style={styles.investSubText}>
                  Invested Capital: <Text style={{ color: '#d4e4fa' }}>{formatRupee(totalInvestedPortfolio)}</Text>
                </Text>
              </View>
            </View>

            {/* Holdings & Allocations */}
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.cardTitle}>Holdings & Allocations</Text>
                <Text style={styles.feedCount}>{investments.length} assets</Text>
              </View>

              <View style={styles.txList}>
                {investments.length === 0 ? (
                  <Text style={styles.emptyText}>No investments recorded. Tap '+' to add.</Text>
                ) : (
                  investments.map((inv) => (
                    <View key={inv.id} style={styles.holdingCard}>
                      <View style={styles.txLeft}>
                        <View style={styles.holdingIconBox}>
                          <Ionicons name="trending-up-outline" size={18} color="#52b788" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txTitle}>{inv.name}</Text>
                          <Text style={styles.txSub}>
                            {inv.type.replace('_', ' ')} •{' '}
                            {(inv.monthly_sip_amount ?? 0) > 0
                              ? `${formatRupee(inv.monthly_sip_amount ?? 0)}/mo SIP`
                              : 'Lumpsum'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={styles.holdingVal}>
                          {formatRupee(inv.current_value || inv.invested_amount)}
                        </Text>
                        <Text style={styles.holdingCost}>
                          Cost: {formatRupee(inv.invested_amount)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 5: ARCHIVED VIEW (Budget-Excluded Transactions Shelf) */}
        {/* ======================================================== */}
        {activeTab === 'ARCHIVED' && (
          <View style={styles.tabContentBlock}>
            {/* Informational Callout Banner */}
            <View style={styles.archiveNoticeCard}>
              <View style={styles.archiveNoticeLeft}>
                <Ionicons name="information-circle" size={22} color="#ffca45" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.archiveNoticeTitle}>Budget Exclusion Notice</Text>
                <Text style={styles.archiveNoticeSub}>
                  Archived items are excluded from budget calculations. You can restore them to active status or delete them permanently.
                </Text>
              </View>
            </View>

            {/* Summary Metric Header */}
            <View style={styles.archiveHeaderRow}>
              <Text style={styles.archiveHeaderTitle}>ARCHIVED ENTRIES</Text>
              <Text style={styles.archiveHeaderExcluded}>
                Total Excluded: <Text style={{ color: '#d4e4fa', fontWeight: '700' }}>{formatRupee(totalExcludedArchived)}</Text>
              </Text>
            </View>

            {/* Archived Transactions List */}
            <View style={styles.archiveList}>
              {deletedTransactions.length === 0 ? (
                <View style={styles.emptyArchiveBox}>
                  <Ionicons name="archive-outline" size={36} color="#64748b" />
                  <Text style={styles.emptyArchiveText}>No archived transactions.</Text>
                </View>
              ) : (
                deletedTransactions.map((tx) => (
                  <View key={tx.id} style={styles.archiveCard}>
                    <View style={styles.archiveCardTop}>
                      <View style={styles.txLeft}>
                        <View style={styles.archiveIconBox}>
                          <Ionicons
                            name={getCategoryIcon(tx.category) as any}
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.description || tx.category}
                          </Text>
                          <Text style={styles.txSub}>
                            {tx.category} • {safeFormatDate(tx.timestamp)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text style={styles.archiveAmount}>
                          {tx.type === 'INFLOW' ? '+' : '-'}
                          {formatRupee(tx.amount)}
                        </Text>
                        <Text style={styles.archiveShelfLabel}>Archived Shelf</Text>
                      </View>
                    </View>

                    {/* Action Bar: Restore and Delete */}
                    <View style={styles.archiveActionGrid}>
                      <TouchableOpacity
                        style={styles.restoreBtn}
                        onPress={() => handleRestore(tx)}
                      >
                        <Ionicons name="refresh-outline" size={16} color="#52b788" />
                        <Text style={styles.restoreBtnText}>Restore</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.permanentDeleteBtn}
                        onPress={() => handlePermanentDelete(tx)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ffb4ab" />
                        <Text style={styles.permanentDeleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Financial Cycle Selector Modal */}
      <FinancialCycleModal
        visible={isCycleModalOpen}
        activeMonth={activeMonth}
        onClose={() => setIsCycleModalOpen(false)}
        onSelectMonth={(month) => {
          setActiveMonth(month);
          setIsCycleModalOpen(false);
        }}
      />

      {/* Notifications Drawer */}
      <NotificationsModal
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051424',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#122131',
    backgroundColor: '#051424',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d4e4fa',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#122131',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1c2d',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(39, 54, 71, 0.6)',
  },
  periodPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  currentPeriodBadge: {
    backgroundColor: 'rgba(82, 183, 136, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
  },
  currentPeriodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86d7ad',
    letterSpacing: 0.5,
  },
  segmentedNav: {
    flexDirection: 'row',
    backgroundColor: '#0d1c2d',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  segTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segTabActive: {
    backgroundColor: 'rgba(64, 145, 108, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.4)',
  },
  segTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  segTabTextActive: {
    color: '#86d7ad',
    fontWeight: '700',
  },
  archivedCountBadge: {
    backgroundColor: 'rgba(82, 183, 136, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  archivedCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#86d7ad',
  },
  tabContentBlock: {
    gap: 16,
  },
  metricCard: {
    backgroundColor: '#122131',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1c2b3c',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  spendTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricBigAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d4e4fa',
    letterSpacing: -0.5,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1c2d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
  },
  trendPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86d7ad',
  },
  distributionBarWrapper: {
    gap: 8,
    marginTop: 4,
  },
  distributionBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distributionBarLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  distributionBarCount: {
    fontSize: 11,
    color: '#94a3b8',
  },
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1c2b3c',
  },
  barSegment: {
    height: '100%',
  },
  legendScroll: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  legendItemActive: {
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  categoryList: {
    gap: 14,
  },
  categoryItem: {
    gap: 6,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  catAllocated: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catSpent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  catRemaining: {
    fontSize: 10,
    color: '#86d7ad',
    marginTop: 1,
  },
  catProgressBar: {
    height: 6,
    backgroundColor: '#0d1c2d',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  deltaPill: {
    alignItems: 'flex-end',
  },
  deltaAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  deltaLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  flowBarsWrapper: {
    gap: 10,
    marginVertical: 10,
  },
  flowBarRow: {
    gap: 4,
  },
  flowBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowBarLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  flowBarValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  flowTrack: {
    height: 8,
    backgroundColor: '#0d1c2d',
    borderRadius: 4,
    overflow: 'hidden',
  },
  flowFill: {
    height: '100%',
    borderRadius: 4,
  },
  retentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  retentionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retentionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  retentionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#52b788',
  },
  accountRoutingBlock: {
    marginTop: 8,
    gap: 8,
  },
  routingHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  routingGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  routingCol: {
    flex: 1,
    backgroundColor: '#0d1c2d',
    padding: 8,
    borderRadius: 10,
  },
  routingColLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 2,
  },
  routingColVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  feedCard: {
    backgroundColor: '#122131',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1c2b3c',
    gap: 12,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedCount: {
    fontSize: 11,
    color: '#94a3b8',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1c2d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#d4e4fa',
    padding: 0,
  },
  txList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    padding: 10,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1c2b3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  txSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmountDebit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  txAmountCredit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#52b788',
  },
  txActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  txActionBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  incomeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1c2b3c',
  },
  incomeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#52b788',
  },
  incomeBadgeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  neutralFlowPill: {
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
  },
  neutralFlowPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86d7ad',
  },
  neutralExplainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  neutralExplainerText: {
    fontSize: 11,
    color: '#86d7ad',
    flex: 1,
    lineHeight: 16,
  },
  transferRowCard: {
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  transferRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transferIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferAccountName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  transferAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  transferNoteBox: {
    backgroundColor: '#010f1f',
    borderRadius: 8,
    padding: 6,
    marginTop: 2,
  },
  transferNoteText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  investGainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  investGainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#86d7ad',
  },
  investSubRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1c2b3c',
  },
  investSubText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    padding: 12,
  },
  holdingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  holdingCost: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  archiveNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#0d1c2d',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 202, 69, 0.2)',
  },
  archiveNoticeLeft: {
    marginTop: 1,
  },
  archiveNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d4e4fa',
    marginBottom: 2,
  },
  archiveNoticeSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  archiveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  archiveHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  archiveHeaderExcluded: {
    fontSize: 11,
    color: '#94a3b8',
  },
  archiveList: {
    gap: 12,
  },
  emptyArchiveBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyArchiveText: {
    fontSize: 13,
    color: '#64748b',
  },
  archiveCard: {
    backgroundColor: '#0d1c2d',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1c2b3c',
  },
  archiveCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archiveIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1c2b3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d4e4fa',
  },
  archiveShelfLabel: {
    fontSize: 9,
    color: '#ffca45',
    marginTop: 1,
  },
  archiveActionGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1c2b3c',
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1c2b3c',
    paddingVertical: 9,
    borderRadius: 10,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52b788',
  },
  permanentDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(147, 0, 10, 0.25)',
    paddingVertical: 9,
    borderRadius: 10,
  },
  permanentDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffb4ab',
  },
});
