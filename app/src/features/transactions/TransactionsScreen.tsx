import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Transaction } from '../../core/types/transactions';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';

interface TransactionsScreenProps {
  onOpenAddEntry: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onOpenAddEntry }) => {
  const { colors } = useTheme();
  const { transactions, accounts, deleteTransaction, generatePdfReport, activeMonth } = useFinanceData();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EXPENSES' | 'INCOME' | 'SAVINGS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const isSavingsTx = (t: Transaction) => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return (
      cat.includes('saving') ||
      cat.includes('invest') ||
      desc.includes('sip') ||
      desc.includes('saving') ||
      desc.includes('invest') ||
      t.type === 'TRANSFER'
    );
  };

  // Filter by activeMonth if not 'All Months'
  const monthFilteredTransactions = useMemo(() => {
    if (!activeMonth || activeMonth.toLowerCase() === 'all months') {
      return transactions;
    }
    return transactions.filter((tx) => isDateInMonth(tx.timestamp, activeMonth));
  }, [transactions, activeMonth]);

  // Strictly sort descending by timestamp: newest transaction is ALWAYS at the top row!
  const sortedTransactions = useMemo(() => {
    return [...monthFilteredTransactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [monthFilteredTransactions]);

  // Compute counts
  const savingsCount = sortedTransactions.filter(isSavingsTx).length;
  const expenseCount = sortedTransactions.filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t)).length;
  const incomeCount = sortedTransactions.filter((t) => t.type === 'INFLOW').length;

  // Complete calculations across all transactions (including SIPs, EMIs, and Subscriptions)
  const totalInflow = useMemo(() => {
    return sortedTransactions
      .filter((t) => t.type === 'INFLOW')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sortedTransactions]);

  const totalExpenses = useMemo(() => {
    return sortedTransactions
      .filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sortedTransactions]);

  const totalSavings = useMemo(() => {
    return sortedTransactions
      .filter(isSavingsTx)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sortedTransactions]);

  const netBalanceMovement = useMemo(() => {
    return totalInflow - (totalExpenses + totalSavings);
  }, [totalInflow, totalExpenses, totalSavings]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (activeFilter === 'EXPENSES' && (tx.type !== 'OUTFLOW' || isSavingsTx(tx))) return false;
      if (activeFilter === 'INCOME' && tx.type !== 'INFLOW') return false;
      if (activeFilter === 'SAVINGS' && !isSavingsTx(tx)) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesRef = tx.reference_number?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesRef) return false;
      }

      return true;
    });
  }, [sortedTransactions, activeFilter, searchQuery]);

  const handleExport = async () => {
    try {
      const now = new Date();
      await generatePdfReport({
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        label: activeMonth || 'Ledger Export',
      });
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const getCategoryIcon = (category: string, type: string): { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string } => {
    if (type === 'INFLOW') return { icon: 'cash-outline', bg: '#DCFCE7', color: '#15803D' };
    const lower = category.toLowerCase();
    if (lower.includes('sip') || lower.includes('invest')) {
      return { icon: 'trending-up-outline', bg: '#DCFCE7', color: '#16A34A' };
    }
    if (lower.includes('emi') || lower.includes('loan')) {
      return { icon: 'wallet-outline', bg: '#EDE9FE', color: '#7C3AED' };
    }
    if (lower.includes('subscription')) {
      return { icon: 'repeat-outline', bg: '#E0F2FE', color: '#0284C7' };
    }
    if (lower.includes('food') || lower.includes('drink') || lower.includes('coffee')) {
      return { icon: 'cafe-outline', bg: '#FEF3C7', color: '#D97706' };
    }
    if (lower.includes('bill') || lower.includes('utility') || lower.includes('electric')) {
      return { icon: 'flash-outline', bg: '#EDE9FE', color: '#7C3AED' };
    }
    if (lower.includes('transport') || lower.includes('uber') || lower.includes('taxi')) {
      return { icon: 'paper-plane-outline', bg: '#E0F2FE', color: '#0284C7' };
    }
    if (lower.includes('shopping') || lower.includes('supplies')) {
      return { icon: 'bag-handle-outline', bg: '#FEE2E2', color: '#DC2626' };
    }
    if (lower.includes('home') || lower.includes('rent')) {
      return { icon: 'home-outline', bg: '#FFEDD5', color: '#C2410C' };
    }
    return { icon: 'receipt-outline', bg: '#F1F5F9', color: '#64748B' };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: isDesktop ? 24 : 16 }]}>
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local ledger — your transactions, EMIs, and SIP movements are stored air-gapped on this device.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Header Row */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.monthTag, { color: colors.textMuted }]}>{(activeMonth || 'ALL MONTHS').toUpperCase()}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>All transactions</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {filteredTransactions.length} entries in your personal ledger (latest first)
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleExport}
          >
            <Ionicons name="download-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.exportBtnText, { color: colors.textSecondary }]}>Export</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={onOpenAddEntry}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction Calculations Summary Strip */}
      <View style={styles.metricsSummaryRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>TOTAL SPENT</Text>
          <Text style={[styles.metricCardVal, { color: colors.textPrimary }]}>{formatRupee(totalExpenses, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{expenseCount} debits & EMIs</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>TOTAL INFLOW</Text>
          <Text style={[styles.metricCardVal, { color: colors.successText }]}>{formatRupee(totalInflow, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{incomeCount} credits & deposits</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>INVESTMENTS & SIPS</Text>
          <Text style={[styles.metricCardVal, { color: '#059669' }]}>{formatRupee(totalSavings, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{savingsCount} SIP allocations</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>NET CASH MOVEMENT</Text>
          <Text
            style={[
              styles.metricCardVal,
              { color: netBalanceMovement >= 0 ? colors.textPrimary : colors.danger },
            ]}
          >
            {formatRupee(Math.abs(netBalanceMovement), true)}
          </Text>
          <Text style={[styles.metricCardSub, { color: netBalanceMovement >= 0 ? colors.successText : colors.danger }]}>
            {netBalanceMovement >= 0 ? 'Surplus' : 'Deficit'}
          </Text>
        </View>
      </View>

      {/* Filter Pills and Search */}
      <View style={styles.filterRow}>
        <View style={styles.pillsGroup}>
          {[
            { key: 'ALL' as const, label: `All ${sortedTransactions.length}` },
            { key: 'EXPENSES' as const, label: `Debits ${expenseCount}` },
            { key: 'INCOME' as const, label: `Credits ${incomeCount}` },
            { key: 'SAVINGS' as const, label: `Savings & SIPs ${savingsCount}` },
          ].map((pill) => {
            const isSelected = activeFilter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.surface : 'transparent',
                    borderColor: isSelected ? colors.border : 'transparent',
                  },
                ]}
                onPress={() => setActiveFilter(pill.key)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? colors.textPrimary : colors.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={[styles.filterIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="filter-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.filterBtnText, { color: colors.textSecondary }]}>Filters ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions Table Card */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: isDesktop ? '100%' : 540, flex: 1 }}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>TRANSACTION</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>DATE</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.textMuted }]}>AMOUNT</Text>
              <Text style={[styles.th, { width: 90, textAlign: 'right', color: colors.textMuted }]}>TYPE</Text>
              <Text style={[styles.th, { width: 40, textAlign: 'center', color: colors.textMuted }]}></Text>
            </View>

            {/* Rows */}
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
              {filteredTransactions.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                    No transactions found
                  </Text>
                  <Text style={[styles.emptyStateSub, { color: colors.textMuted }]}>
                    {activeMonth && activeMonth !== 'All Months'
                      ? `No movements recorded for ${activeMonth}. Add an entry or switch periods in the header.`
                      : 'No transactions match the selected filter or search query.'}
                  </Text>
                </View>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'INFLOW';
                  const acc = accounts.find((a) => a.id === tx.account_id);
                  const badge = getCategoryIcon(tx.category, tx.type);

                  return (
                    <View key={tx.id} style={[styles.tableRow, { borderBottomColor: colors.borderSubtle }]}>
                      {/* Transaction details */}
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.categorySquare, { backgroundColor: badge.bg }]}>
                          <Ionicons name={badge.icon} size={16} color={badge.color} />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {tx.description || tx.category}
                          </Text>
                          <Text style={[styles.rowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                            {tx.category} • {acc?.name || 'Account'}
                          </Text>
                        </View>
                      </View>

                      {/* Date */}
                      <Text style={[styles.rowDate, { flex: 1, color: colors.textSecondary }]}>
                        {safeFormatDate(tx.timestamp, 'en-IN', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </Text>

                      {/* Amount */}
                      <Text
                        style={[
                          styles.rowAmount,
                          {
                            flex: 1,
                            color: isIncome ? colors.successText : colors.textPrimary,
                          },
                        ]}
                      >
                        {formatRupee(tx.amount, true)}
                      </Text>

                      {/* Type Badge */}
                      <View style={{ width: 90, alignItems: 'flex-end' }}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              { color: isIncome ? '#15803D' : '#B91C1C' },
                            ]}
                          >
                            {isIncome ? 'Credit' : 'Debit'}
                          </Text>
                        </View>
                      </View>

                      {/* Delete Trigger */}
                      <TouchableOpacity
                        style={styles.deleteTrigger}
                        onPress={() => setTxToDelete(tx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onOpenAddEntry}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setTxToDelete(null)}
          onConfirm={() => deleteTransaction(txToDelete.id)}
          title="Delete transaction?"
          description="This will move the entry to History, where it can be restored."
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  monthTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricCardVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  metricCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    width: 160,
  },
  searchInput: {
    fontSize: 13,
    flex: 1,
  },
  filterIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categorySquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  rowDate: {
    fontSize: 12,
    textAlign: 'center',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteTrigger: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyStateBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
});
