import React, { useState } from 'react';
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
import { Account } from '../../../core/types';
import { CreateTransactionInput } from '../../../core/types/transactions';

interface AddEntryDrawerProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

export const AddEntryDrawer: React.FC<AddEntryDrawerProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();

  const [entryType, setEntryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [party, setParty] = useState('');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & drinks');
  const [paymentMode, setPaymentMode] = useState<'CARD' | 'UPI' | 'CASH'>('UPI');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter accounts based on mode
  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const availableAccounts = paymentMode === 'CARD' ? creditCards : bankAccounts;
  const currentAccount =
    availableAccounts.find((a) => a.id === selectedAccountId) || availableAccounts[0] || accounts[0];

  const handleSave = async () => {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return;

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

    setLoading(true);
    try {
      await onSubmit({
        account_id: targetAcc,
        type: entryType === 'EXPENSE' ? 'OUTFLOW' : 'INFLOW',
        amount: num,
        category: entryType === 'INCOME' && !category ? 'Salary' : category,
        description: desc,
        timestamp: new Date().toISOString(),
      });
      // reset
      setParty('');
      setItem('');
      setAmount('');
      setCategoryDropdownOpen(false);
      setAccountDropdownOpen(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Food & drinks',
    'Home',
    'Bills & utilities',
    'Transport',
    'Shopping',
    'Entertainment',
    'Salary',
    'Investments',
    'Other',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Absolute touchable backdrop to close on outside click */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.microHeader, { color: colors.textMuted }]}>NEW ENTRY</Text>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Add to your ledger</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Segmented Switcher: Expense vs Salary credited */}
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
                  setCategory('Food & drinks');
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
                  Expense
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
                  setCategory('Salary');
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
                  Salary credited
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

            {/* Category Dropdown */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    borderColor: categoryDropdownOpen ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => {
                  setCategoryDropdownOpen(!categoryDropdownOpen);
                  setAccountDropdownOpen(false);
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
                onPress={() => setPaymentMode('CASH')}
              >
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color={paymentMode === 'CASH' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: paymentMode === 'CASH' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Cash
                </Text>
                {paymentMode === 'CASH' && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>

            {/* Account Selection Dropdown */}
            {paymentMode !== 'CASH' && (
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 6 }]}>
                  {paymentMode === 'CARD' ? 'Credit card account' : 'Bank account'}
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
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons
                      name={paymentMode === 'CARD' ? 'card-outline' : 'business-outline'}
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>
                      {currentAccount?.name || 'Select Account'}
                    </Text>
                  </View>
                  <Ionicons
                    name={accountDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {accountDropdownOpen && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                      {availableAccounts.map((acc) => {
                        const isSel = (selectedAccountId || currentAccount?.id) === acc.id;
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
                            <Ionicons
                              name={acc.type === 'CREDIT_CARD' ? 'card-outline' : 'business-outline'}
                              size={16}
                              color={isSel ? colors.primary : colors.textSecondary}
                              style={{ marginRight: 10 }}
                            />
                            <Text
                              style={[
                                styles.dropdownMenuItemText,
                                { color: isSel ? colors.primary : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                              ]}
                            >
                              {acc.name}
                            </Text>
                            {isSel && (
                              <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>Save entry ↗</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
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
