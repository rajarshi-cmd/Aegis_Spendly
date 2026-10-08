import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Account, Transaction } from '../../../core/types';
import { CreateTransactionInput } from '../../../core/types/transactions';

interface AddEntryDrawerProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
  initialTransaction?: Transaction | null;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

function generateMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }
  return days;
}

export const AddEntryDrawer: React.FC<AddEntryDrawerProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
  initialTransaction,
  onUpdate,
}) => {
  const { colors } = useTheme();

  const isEditMode = Boolean(initialTransaction);

  const [entryType, setEntryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [party, setParty] = useState('');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & drinks');
  const [paymentMode, setPaymentMode] = useState<'CARD' | 'UPI' | 'CASH'>('UPI');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter accounts based on mode
  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const availableAccounts = paymentMode === 'CARD' ? creditCards : bankAccounts;
  const currentAccount =
    availableAccounts.find((a) => a.id === selectedAccountId) || availableAccounts[0] || accounts[0];

  useEffect(() => {
    if (initialTransaction) {
      setEntryType(initialTransaction.type === 'INFLOW' ? 'INCOME' : 'EXPENSE');
      setAmount(initialTransaction.amount.toString());
      setCategory(initialTransaction.category || (initialTransaction.type === 'INFLOW' ? 'Salary' : 'Food & drinks'));
      const parts = (initialTransaction.description || '').split(' • ');
      if (parts.length > 1) {
        setParty(parts[0]);
        setItem(parts.slice(1).join(' • '));
      } else {
        setParty(initialTransaction.description || '');
        setItem('');
      }
      const txDate = new Date(initialTransaction.timestamp);
      setSelectedDate(isNaN(txDate.getTime()) ? new Date() : txDate);
      setCalMonth(isNaN(txDate.getTime()) ? new Date().getMonth() : txDate.getMonth());
      setCalYear(isNaN(txDate.getTime()) ? new Date().getFullYear() : txDate.getFullYear());
      setSelectedAccountId(initialTransaction.account_id);
      const acc = accounts.find((a) => a.id === initialTransaction.account_id);
      if (acc?.type === 'CREDIT_CARD') {
        setPaymentMode('CARD');
      } else {
        setPaymentMode('UPI');
      }
      setCategoryError(null);
    } else {
      setEntryType('EXPENSE');
      setParty('');
      setItem('');
      setAmount('');
      setCategory('Food & drinks');
      const now = new Date();
      setSelectedDate(now);
      setCalMonth(now.getMonth());
      setCalYear(now.getFullYear());
      setPaymentMode('UPI');
      if (bankAccounts.length > 0) {
        setSelectedAccountId(bankAccounts[0].id);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
      setCategoryError(null);
    }
  }, [initialTransaction, visible]);

  const handleSave = async () => {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return;

    if (!category || !category.trim()) {
      setCategoryError('Category is mandatory for all transactions.');
      return;
    }
    setCategoryError(null);

    let targetAcc = selectedAccountId;
    if (paymentMode === 'CARD' && creditCards.length > 0) {
      if (!creditCards.some((c) => c.id === targetAcc)) {
        targetAcc = creditCards[0].id;
      }
    } else if (paymentMode === 'UPI' && bankAccounts.length > 0) {
      if (!bankAccounts.some((b) => b.id === targetAcc)) {
        targetAcc = bankAccounts[0].id;
      }
    } else if (!targetAcc && accounts.length > 0) {
      targetAcc = accounts[0].id;
    }

    const desc = item ? `${party ? party + ' • ' : ''}${item}` : party || 'Transaction';
    const timestampIso = selectedDate.toISOString();

    setLoading(true);
    try {
      if (isEditMode && initialTransaction && onUpdate) {
        await onUpdate(initialTransaction.id, {
          account_id: targetAcc,
          type: entryType === 'EXPENSE' ? 'OUTFLOW' : 'INFLOW',
          amount: num,
          category,
          description: desc,
          timestamp: timestampIso,
        });
      } else {
        await onSubmit({
          account_id: targetAcc,
          type: entryType === 'EXPENSE' ? 'OUTFLOW' : 'INFLOW',
          amount: num,
          category,
          description: desc,
          timestamp: timestampIso,
        });
      }
      // reset
      setParty('');
      setItem('');
      setAmount('');
      setCategoryDropdownOpen(false);
      setAccountDropdownOpen(false);
      setCalendarPickerOpen(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = [
    'Food & drinks',
    'Home',
    'Bills & utilities',
    'Transport',
    'Shopping',
    'Entertainment',
    'Investments',
    'Other',
  ];

  const incomeCategories = [
    'Salary',
    'Bonus / Incentive',
    'Interest / Dividend',
    'Refund',
    'Freelance / Side Income',
    'Other',
  ];

  const categories = entryType === 'EXPENSE' ? expenseCategories : incomeCategories;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.microHeader, { color: colors.textMuted }]}>
                {isEditMode ? 'EDIT TRANSACTION' : 'NEW ENTRY'}
              </Text>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                {isEditMode ? 'Modify movement details' : 'Add to your ledger'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Segmented Switcher: Debit vs Credit */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  entryType === 'EXPENSE' && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ],
                ]}
                onPress={() => {
                  setEntryType('EXPENSE');
                  if (!expenseCategories.includes(category)) {
                    setCategory('Food & drinks');
                  }
                  setCategoryError(null);
                }}
              >
                <Ionicons
                  name="arrow-up-outline"
                  size={15}
                  color={entryType === 'EXPENSE' ? colors.danger : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: entryType === 'EXPENSE' ? colors.danger : colors.textMuted },
                  ]}
                >
                  Debit (Expense)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  entryType === 'INCOME' && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ],
                ]}
                onPress={() => {
                  setEntryType('INCOME');
                  if (!incomeCategories.includes(category)) {
                    setCategory('Salary');
                  }
                  setCategoryError(null);
                }}
              >
                <Ionicons
                  name="arrow-down-outline"
                  size={15}
                  color={entryType === 'INCOME' ? colors.success : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: entryType === 'INCOME' ? colors.success : colors.textMuted },
                  ]}
                >
                  Credit (Income)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Paid To / Received From & Item */}
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {entryType === 'EXPENSE' ? 'Paid to' : 'Received from'}
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder={entryType === 'EXPENSE' ? 'e.g. Swiggy, Apple' : 'e.g. Employer Inc'}
                  placeholderTextColor={colors.textMuted}
                  value={party}
                  onChangeText={setParty}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>What for? (Item)</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Dinner, Monthly salary"
                  placeholderTextColor={colors.textMuted}
                  value={item}
                  onChangeText={setItem}
                />
              </View>
            </View>

            {/* Amount */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount</Text>
              <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                <TextInput
                  style={[styles.currencyInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Date Selector with Calendar (DEF-015) */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Date (Past or Present)
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    borderColor: calendarPickerOpen ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => {
                  setCalendarPickerOpen(!calendarPickerOpen);
                  setCategoryDropdownOpen(false);
                  setAccountDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>
                    {selectedDate.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={calendarPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {calendarPickerOpen && (
                <View style={[styles.calendarBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  {/* Calendar Month & Year Controls */}
                  <View style={styles.calHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      style={styles.calNavBtn}
                    >
                      <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.calMonthText, { color: colors.textPrimary }]}>
                      {new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear((y) => y + 1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      style={styles.calNavBtn}
                    >
                      <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {/* Day of Week Labels */}
                  <View style={styles.calWeekRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <Text key={d} style={[styles.calWeekDay, { color: colors.textMuted }]}>
                        {d}
                      </Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.calDaysGrid}>
                    {generateMonthDays(calYear, calMonth).map((d, idx) => {
                      if (!d) {
                        return <View key={`empty-${idx}`} style={styles.calDayCell} />;
                      }
                      const isSelected =
                        selectedDate.getDate() === d &&
                        selectedDate.getMonth() === calMonth &&
                        selectedDate.getFullYear() === calYear;
                      const isToday =
                        new Date().getDate() === d &&
                        new Date().getMonth() === calMonth &&
                        new Date().getFullYear() === calYear;

                      return (
                        <TouchableOpacity
                          key={`day-${d}`}
                          style={[
                            styles.calDayCell,
                            isSelected && { backgroundColor: colors.primary, borderRadius: 8 },
                            isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary, borderRadius: 8 },
                          ]}
                          onPress={() => {
                            setSelectedDate(new Date(calYear, calMonth, d, 12, 0, 0));
                            setCalendarPickerOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.calDayText,
                              { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                              isToday && !isSelected && { color: colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Quick Shortcut Buttons */}
                  <View style={styles.calQuickRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setCalMonth(today.getMonth());
                        setCalYear(today.getFullYear());
                        setCalendarPickerOpen(false);
                      }}
                      style={[styles.calQuickBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.calQuickText, { color: colors.primary }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const yest = new Date(Date.now() - 86400000);
                        setSelectedDate(yest);
                        setCalMonth(yest.getMonth());
                        setCalYear(yest.getFullYear());
                        setCalendarPickerOpen(false);
                      }}
                      style={[styles.calQuickBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.calQuickText, { color: colors.textSecondary }]}>Yesterday</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Category Dropdown (DEF-013: Mandatory Category) */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category *</Text>
                {categoryError && (
                  <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '600' }}>
                    {categoryError}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    borderColor: categoryError ? colors.danger : categoryDropdownOpen ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => {
                  setCategoryDropdownOpen(!categoryDropdownOpen);
                  setAccountDropdownOpen(false);
                  setCalendarPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>{category}</Text>
                <Ionicons
                  name={categoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {categoryDropdownOpen && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                    {categories.map((cat) => {
                      const isSel = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.dropdownMenuItem,
                            { borderBottomColor: colors.borderSubtle },
                            isSel && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setCategory(cat);
                            setCategoryError(null);
                            setCategoryDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownMenuItemText,
                              { color: isSel ? colors.primary : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                            ]}
                          >
                            {cat}
                          </Text>
                          {isSel && (
                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Mode of Payment */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>MODE OF PAYMENT</Text>
            <View style={styles.modeContainer}>
              {/* Credit Card */}
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  {
                    borderColor: paymentMode === 'CARD' ? colors.primary : colors.border,
                    backgroundColor: paymentMode === 'CARD' ? colors.primaryLight : colors.surface,
                  },
                ]}
                onPress={() => {
                  setPaymentMode('CARD');
                  if (creditCards.length > 0) setSelectedAccountId(creditCards[0].id);
                }}
              >
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={paymentMode === 'CARD' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: paymentMode === 'CARD' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Credit card
                </Text>
                {paymentMode === 'CARD' && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>

              {/* Bank via UPI */}
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  {
                    borderColor: paymentMode === 'UPI' ? colors.primary : colors.border,
                    backgroundColor: paymentMode === 'UPI' ? colors.primaryLight : colors.surface,
                  },
                ]}
                onPress={() => {
                  setPaymentMode('UPI');
                  if (bankAccounts.length > 0) setSelectedAccountId(bankAccounts[0].id);
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={paymentMode === 'UPI' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: paymentMode === 'UPI' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Bank via UPI
                </Text>
                {paymentMode === 'UPI' && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>

              {/* Cash */}
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  {
                    borderColor: paymentMode === 'CASH' ? colors.primary : colors.border,
                    backgroundColor: paymentMode === 'CASH' ? colors.primaryLight : colors.surface,
                  },
                ]}
                onPress={() => {
                  setPaymentMode('CASH');
                  if (bankAccounts.length > 0) setSelectedAccountId(bankAccounts[0].id);
                }}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={paymentMode === 'CASH' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: paymentMode === 'CASH' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Cash in hand
                </Text>
                {paymentMode === 'CASH' && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>

            {/* Account Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {paymentMode === 'CARD' ? 'Charging Card' : 'Settlement Bank Account'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    borderColor: accountDropdownOpen ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => {
                  setAccountDropdownOpen(!accountDropdownOpen);
                  setCategoryDropdownOpen(false);
                  setCalendarPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>
                  {currentAccount?.name || 'Select Account'}
                </Text>
                <Ionicons
                  name={accountDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {accountDropdownOpen && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  {availableAccounts.map((acc) => {
                    const isSel = acc.id === currentAccount?.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.dropdownMenuItem,
                          { borderBottomColor: colors.borderSubtle },
                          isSel && { backgroundColor: colors.primaryLight },
                        ]}
                        onPress={() => {
                          setSelectedAccountId(acc.id);
                          setAccountDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownMenuItemText,
                            { color: isSel ? colors.primary : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                          ]}
                        >
                          {acc.name}
                        </Text>
                        {isSel && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={loading || !amount}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: loading || !amount ? colors.textMuted : colors.primary,
                },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add entry'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  toggleBtnActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 220,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  dropdownMenuItemText: {
    fontSize: 13,
  },
  calendarBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 6,
  },
  calMonthText: {
    fontSize: 14,
    fontWeight: '700',
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  calWeekDay: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calDayCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calQuickRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  calQuickBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  calQuickText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 10,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
