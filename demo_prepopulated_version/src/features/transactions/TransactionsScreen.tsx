import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Transaction } from '../../core/types/transactions';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';
import { AddEntryDrawer } from '../../presentation/components/drawers/AddEntryDrawer';

interface TransactionsScreenProps {
  onOpenAddEntry: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onOpenAddEntry }) => {
  const { colors } = useTheme();
  const {
    transactions,
    accounts,
    deleteTransaction,
    editTransaction,
    addTransaction,
    userProfile,
    updateProfile,
    generatePdfReport,
    activeMonth,
  } = useFinanceData();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EXPENSES' | 'INCOME' | 'SAVINGS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // DEF-011: Salary prompt state
  const [salaryDismissedMonths, setSalaryDismissedMonths] = useState<Record<string, boolean>>({});
  const [showSalaryEditModal, setShowSalaryEditModal] = useState<boolean>(false);
  const [showSalaryProfilePrompt, setShowSalaryProfilePrompt] = useState<boolean>(false);
  const [editedSalaryInput, setEditedSalaryInput] = useState<string>('');
  const [pendingCreditedAmount, setPendingCreditedAmount] = useState<number>(0);

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

  // DEF-010: Exclude opening balance from Total Inflow and Total Expenses!
  const expenseCount = sortedTransactions.filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t) && !isOpeningBalance(t)).length;
  const incomeCount = sortedTransactions.filter((t) => t.type === 'INFLOW' && !isOpeningBalance(t)).length;
  const savingsCount = sortedTransactions.filter(isSavingsTx).length;

  const totalInflow = useMemo(() => {
    return sortedTransactions
      .filter((t) => t.type === 'INFLOW' && !isOpeningBalance(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sortedTransactions]);

  const totalExpenses = useMemo(() => {
    return sortedTransactions
      .filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t) && !isOpeningBalance(t))
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
      if (activeFilter === 'EXPENSES' && (tx.type !== 'OUTFLOW' || isSavingsTx(tx) || isOpeningBalance(tx))) return false;
      if (activeFilter === 'INCOME' && (tx.type !== 'INFLOW' || isOpeningBalance(tx))) return false;
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

  // Salary Check-in Computation (DEF-011)
  const salaryCreditedTx = useMemo(() => {
    return monthFilteredTransactions.find(
      (t) =>
        t.type === 'INFLOW' &&
        !isOpeningBalance(t) &&
        (t.category.toLowerCase().includes('salary') ||
          (t.description || '').toLowerCase().includes('salary'))
    );
  }, [monthFilteredTransactions]);

  const expectedSalary = userProfile.salary_amount > 0 ? userProfile.salary_amount : 148000;
  const defaultBank =
    accounts.find((a) => a.id === userProfile.salary_account_id) ||
    accounts.find((a) => a.type === 'BANK_DEPOSIT') ||
    accounts[0];

  const isSalaryPromptVisible =
    !salaryCreditedTx &&
    !salaryDismissedMonths[activeMonth] &&
    activeMonth &&
    activeMonth !== 'All Months';

  const handleConfirmSalary = async (amountToCredit: number) => {
    if (!defaultBank) return;
    try {
      await addTransaction({
        account_id: defaultBank.id,
        type: 'INFLOW',
        amount: amountToCredit,
        category: 'Salary',
        description: `Monthly Salary - ${activeMonth}`,
        timestamp: new Date().toISOString(),
      });
      setShowSalaryEditModal(false);
      setShowSalaryProfilePrompt(false);
    } catch (e) {
      console.error('Error confirming salary credit:', e);
    }
  };

  const handleOpenSalaryEdit = () => {
    setEditedSalaryInput(expectedSalary.toString());
    setShowSalaryEditModal(true);
  };

  const handleSubmitSalaryEdit = () => {
    const parsed = parseFloat(editedSalaryInput.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed) || parsed <= 0) return;
    setPendingCreditedAmount(parsed);
    setShowSalaryEditModal(false);

    if (parsed !== expectedSalary) {
      // Ask prompt: "From future your salary can be updated to this? Yes or No"
      setShowSalaryProfilePrompt(true);
    } else {
      handleConfirmSalary(parsed);
    }
  };

  const handleSalaryProfilePromptResponse = async (updateFuture: boolean) => {
    if (updateFuture) {
      updateProfile({ salary_amount: pendingCreditedAmount });
    }
    await handleConfirmSalary(pendingCreditedAmount);
  };

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

      {/* Transaction Calculations Summary Strip (DEF-010) */}
      <View style={styles.metricsSummaryRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>TOTAL SPENT</Text>
          <Text style={[styles.metricCardVal, { color: colors.textPrimary }]}>{formatRupee(totalExpenses, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{expenseCount} debits & EMIs</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>TOTAL INFLOW</Text>
          <Text style={[styles.metricCardVal, { color: colors.successText }]}>{formatRupee(totalInflow, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{incomeCount} credits & salary</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>SAVINGS & SIPS</Text>
          <Text style={[styles.metricCardVal, { color: '#059669' }]}>{formatRupee(totalSavings, true)}</Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>{savingsCount} allocations & assets</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>NET MOVEMENT</Text>
          <Text
            style={[
              styles.metricCardVal,
              { color: netBalanceMovement >= 0 ? colors.textPrimary : colors.danger },
            ]}
          >
            {formatRupee(netBalanceMovement, true)}
          </Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>Net flow this period</Text>
        </View>
      </View>

      {/* DEF-011: Salary Day Check-In Prompt Banner */}
      {isSalaryPromptVisible && (
        <View style={[styles.salaryPromptCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={styles.salaryPromptLeft}>
            <View style={[styles.salaryIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="cash-outline" size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.salaryPromptTitle, { color: '#14532D' }]}>
                Salary Day Check-In • {activeMonth}
              </Text>
              <Text style={[styles.salaryPromptSubtitle, { color: '#166534' }]}>
                Has your monthly salary of {formatRupee(expectedSalary)} credited to {defaultBank?.name || 'your bank'}?
              </Text>
            </View>
          </View>

          <View style={styles.salaryPromptActions}>
            <TouchableOpacity
              style={[styles.salaryBtnDismiss, { borderColor: '#BBF7D0' }]}
              onPress={() => setSalaryDismissedMonths((prev) => ({ ...prev, [activeMonth]: true }))}
            >
              <Text style={[styles.salaryBtnDismissText, { color: '#166534' }]}>Not yet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.salaryBtnEdit, { borderColor: '#86EFAC', backgroundColor: '#FFFFFF' }]}
              onPress={handleOpenSalaryEdit}
            >
              <Ionicons name="create-outline" size={14} color="#15803D" style={{ marginRight: 4 }} />
              <Text style={[styles.salaryBtnEditText, { color: '#15803D' }]}>Edit amount</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.salaryBtnConfirm, { backgroundColor: '#15803D' }]}
              onPress={() => handleConfirmSalary(expectedSalary)}
            >
              <Ionicons name="checkmark" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.salaryBtnConfirmText}>Yes, credited</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter and Search Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterPills}>
          {(
            [
              { key: 'ALL', label: `All (${sortedTransactions.length})` },
              { key: 'EXPENSES', label: `Expenses (${expenseCount})` },
              { key: 'INCOME', label: `Income (${incomeCount})` },
              { key: 'SAVINGS', label: `Savings & SIPs (${savingsCount})` },
            ] as const
          ).map((pill) => {
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
              placeholder="Search description, category..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* Transactions Table Card */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: isDesktop ? '100%' : 580, flex: 1 }}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>TRANSACTION</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>DATE</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.textMuted }]}>AMOUNT</Text>
              <Text style={[styles.th, { width: 90, textAlign: 'right', color: colors.textMuted }]}>TYPE</Text>
              <Text style={[styles.th, { width: 70, textAlign: 'center', color: colors.textMuted }]}>ACTIONS</Text>
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

                      {/* Action Triggers: Edit (DEF-016) & Delete */}
                      <View style={{ width: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.actionTrigger}
                          onPress={() => setTxToEdit(tx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionTrigger}
                          onPress={() => setTxToDelete(tx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
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

      {/* Universal Delete Modal */}
      {txToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setTxToDelete(null)}
          onConfirm={async () => {
            await deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }}
          title="Delete Transaction?"
          description={`Are you sure you want to remove "${txToDelete.description || txToDelete.category}" of ${formatRupee(
            txToDelete.amount
          )} from your ledger?`}
          confirmButtonText="Delete movement"
        />
      )}

      {/* DEF-016: Edit Transaction Drawer */}
      {txToEdit && (
        <AddEntryDrawer
          visible={Boolean(txToEdit)}
          accounts={accounts}
          initialTransaction={txToEdit}
          onClose={() => setTxToEdit(null)}
          onSubmit={async () => {}}
          onUpdate={async (id, updates) => {
            await editTransaction(id, updates);
            setTxToEdit(null);
          }}
        />
      )}

      {/* DEF-011: Salary Edit Amount Modal */}
      <Modal visible={showSalaryEditModal} transparent animationType="fade" onRequestClose={() => setShowSalaryEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.surface }]}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cash-outline" size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>Edit Credited Salary</Text>
                <Text style={[styles.dialogSub, { color: colors.textMuted }]}>
                  Enter the actual salary amount received for {activeMonth}
                </Text>
              </View>
            </View>

            <View style={styles.dialogBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credited Amount</Text>
              <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                <TextInput
                  style={[styles.currencyInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={editedSalaryInput}
                  onChangeText={setEditedSalaryInput}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={[styles.dialogCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => setShowSalaryEditModal(false)}
              >
                <Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitSalaryEdit}
              >
                <Text style={styles.dialogConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DEF-011: Update Future Profile Salary Prompt Modal */}
      <Modal visible={showSalaryProfilePrompt} transparent animationType="fade" onRequestClose={() => handleSalaryProfilePromptResponse(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.surface }]}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>Update Future Salary?</Text>
                <Text style={[styles.dialogSub, { color: colors.textMuted }]}>
                  You credited {formatRupee(pendingCreditedAmount)} (default: {formatRupee(expectedSalary)}).
                </Text>
              </View>
            </View>

            <View style={{ marginVertical: 14 }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textPrimary }}>
                Would you like to update your expected salary under Profile to {formatRupee(pendingCreditedAmount)} for all future months?
              </Text>
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={[styles.dialogCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => handleSalaryProfilePromptResponse(false)}
              >
                <Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>No, this month only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSalaryProfilePromptResponse(true)}
              >
                <Text style={styles.dialogConfirmText}>Yes, update profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  monthTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
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
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
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
  salaryPromptCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  salaryPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 260,
  },
  salaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryPromptTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  salaryPromptSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  salaryPromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salaryBtnDismiss: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
  },
  salaryBtnDismissText: {
    fontSize: 12,
    fontWeight: '600',
  },
  salaryBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
  },
  salaryBtnEditText: {
    fontSize: 12,
    fontWeight: '600',
  },
  salaryBtnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
  },
  salaryBtnConfirmText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  searchInput: {
    fontSize: 13,
    flex: 1,
    padding: 0,
  },
  tableCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tableBody: {
    maxHeight: 520,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: '600',
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
    fontSize: 13,
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
  actionTrigger: {
    padding: 6,
    borderRadius: 6,
  },
  emptyStateBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 360,
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
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dialogSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dialogBody: {
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dialogConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  dialogConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
