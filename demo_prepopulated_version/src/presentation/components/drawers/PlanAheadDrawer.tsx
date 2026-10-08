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
import { Account } from '../../../core/types/accounts';
import { CreateObligationInput } from '../../../core/types/upcoming';
import { CreateInvestmentInput } from '../../../core/types/investments';
import { PlannedBudget } from '../../../core/types/upcoming';

export type PlanAheadTab = 'SUBSCRIPTION' | 'EMI' | 'SIP' | 'BUDGET';

interface PlanAheadDrawerProps {
  visible: boolean;
  defaultTab?: PlanAheadTab;
  accounts: Account[];
  onClose: () => void;
  onSubmitObligation: (input: CreateObligationInput) => Promise<void>;
  onSubmitInvestment: (input: CreateInvestmentInput) => Promise<void>;
  onSubmitBudget: (budget: Omit<PlannedBudget, 'id'>) => void;
}

export const PlanAheadDrawer: React.FC<PlanAheadDrawerProps> = ({
  visible,
  defaultTab = 'SUBSCRIPTION',
  accounts,
  onClose,
  onSubmitObligation,
  onSubmitInvestment,
  onSubmitBudget,
}) => {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<PlanAheadTab>(defaultTab);

  // Common fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [debitDay, setDebitDay] = useState('05');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [sipType, setSipType] = useState('Mutual fund');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [loading, setLoading] = useState(false);

  // Dropdown open states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const categories = [
    'Entertainment',
    'Home',
    'Food & drinks',
    'Transport',
    'Shopping',
    'Digital services',
    'Other',
  ];

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleSave = async () => {
    if (!name.trim()) return;
    const num = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const day = parseInt(debitDay, 10) || 5;
    const months = parseInt(tenureMonths, 10) || 12;
    const accId = selectedAccountId || accounts[0]?.id || '';

    setLoading(true);
    try {
      if (activeTab === 'SUBSCRIPTION') {
        await onSubmitObligation({
          name: name.trim(),
          type: 'SUBSCRIPTION',
          amount: num,
          due_day: day,
          linked_account_id: accId,
          category,
          notes: `Monthly subscription • ${accounts.find((a) => a.id === accId)?.name || 'Account'}`,
        });
      } else if (activeTab === 'EMI') {
        await onSubmitObligation({
          name: name.trim(),
          type: 'EMI',
          amount: num,
          due_day: day,
          linked_account_id: accId,
          category,
          total_tenure_months: months,
          remaining_tenure_months: months,
          principal_amount: num * months,
          notes: `${months} months EMI • ${accounts.find((a) => a.id === accId)?.name || 'Account'}`,
        });
      } else if (activeTab === 'SIP') {
        await onSubmitInvestment({
          name: name.trim(),
          type: 'SIP',
          monthly_sip_amount: num,
          sip_due_day: day,
          linked_account_id: accId,
          invested_amount: 0,
          current_value: 0,
          notes: `${sipType} SIP • ${months} months commitment`,
        });
      } else if (activeTab === 'BUDGET') {
        onSubmitBudget({
          category,
          planned_amount: num,
        });
      }

      // Reset
      setName('');
      setAmount('');
      setCategoryDropdownOpen(false);
      setDayDropdownOpen(false);
      setAccountDropdownOpen(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

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
              <Text style={[styles.microHeader, { color: colors.textMuted }]}>NOVEMBER PLANNING</Text>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Plan ahead, gently</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 4-Way Segmented Tabs */}
            <View style={[styles.pillBar, { backgroundColor: colors.background }]}>
              {[
                { key: 'SUBSCRIPTION' as const, label: 'Subscription', icon: 'repeat-outline' as const },
                { key: 'EMI' as const, label: 'EMI', icon: 'business-outline' as const },
                { key: 'SIP' as const, label: 'SIP', icon: 'trending-up-outline' as const },
                { key: 'BUDGET' as const, label: 'Budget', icon: 'wallet-outline' as const },
              ].map((tab) => {
                const isSelected = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabPill,
                      isSelected && [
                        styles.tabPillActive,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                      ],
                    ]}
                    onPress={() => {
                      setActiveTab(tab.key);
                      setCategoryDropdownOpen(false);
                      setDayDropdownOpen(false);
                      setAccountDropdownOpen(false);
                    }}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isSelected ? colors.primary : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.tabPillText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                        isSelected && styles.tabPillTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {activeTab === 'SUBSCRIPTION'
                  ? 'Subscription name'
                  : activeTab === 'EMI'
                  ? 'EMI name'
                  : activeTab === 'SIP'
                  ? 'Fund or stock name'
                  : 'Budget item name'}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                placeholder={
                  activeTab === 'SUBSCRIPTION'
                    ? 'e.g. Spotify'
                    : activeTab === 'EMI'
                    ? 'e.g. Car loan EMI'
                    : activeTab === 'SIP'
                    ? 'e.g. Nifty 50 Index Fund'
                    : 'e.g. Food & drinks'
                }
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Category / SIP type */}
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {activeTab === 'SIP' ? 'SIP type' : 'Category'}
              </Text>
              {activeTab === 'SIP' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Mutual fund', 'Stocks', 'Retirement'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.sipTypeChip,
                        {
                          borderColor: sipType === t ? colors.primary : colors.border,
                          backgroundColor: sipType === t ? colors.primaryLight : colors.surface,
                        },
                      ]}
                      onPress={() => setSipType(t)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: sipType === t ? '700' : '500',
                          color: sipType === t ? colors.primary : colors.textSecondary,
                        }}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  {/* Category Dropdown Selector */}
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
                      setDayDropdownOpen(false);
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
                        {categories.map((c) => {
                          const isSel = category === c;
                          return (
                            <TouchableOpacity
                              key={c}
                              style={[
                                styles.dropdownMenuItem,
                                { borderBottomColor: colors.borderSubtle },
                                isSel && { backgroundColor: colors.primaryLight },
                              ]}
                              onPress={() => {
                                setCategory(c);
                                setCategoryDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownMenuItemText,
                                  { color: isSel ? colors.primary : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                                ]}
                              >
                                {c}
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
                </>
              )}
            </View>

            {/* Amount & Debit Day */}
            <View style={styles.formRow}>
              {/* Monthly Amount */}
              <View style={styles.formCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly amount</Text>
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

              {/* Debit Day Dropdown */}
              <View style={styles.formCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Debit day in November</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    {
                      borderColor: dayDropdownOpen ? colors.primary : colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={() => {
                    setDayDropdownOpen(!dayDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAccountDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>Day {debitDay}</Text>
                  <Ionicons
                    name={dayDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Day Dropdown Picker Grid */}
            {dayDropdownOpen && (
              <View style={[styles.dayGridContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.gridHelperLabel, { color: colors.textMuted }]}>Select day of November:</Text>
                <View style={styles.dayGrid}>
                  {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((d) => {
                    const isSel = debitDay === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayGridCell,
                          {
                            borderColor: isSel ? colors.primary : colors.borderSubtle,
                            backgroundColor: isSel ? colors.primary : colors.surface,
                          },
                        ]}
                        onPress={() => {
                          setDebitDay(d);
                          setDayDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayGridCellText,
                            { color: isSel ? '#FFFFFF' : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tenure months if EMI or SIP */}
            {(activeTab === 'EMI' || activeTab === 'SIP') && (
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {activeTab === 'EMI' ? 'EMI months' : 'SIP commitment months'}
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. 12"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={tenureMonths}
                  onChangeText={setTenureMonths}
                />
              </View>
            )}

            {/* Paid from Account Dropdown (Instead of wrapping cards!) */}
            {activeTab !== 'BUDGET' && (
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Paid from</Text>
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
                    setDayDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <Ionicons
                      name={selectedAccount?.type === 'CREDIT_CARD' ? 'card-outline' : 'business-outline'}
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.dropdownValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {selectedAccount?.name || 'Select Account'}
                    </Text>
                    <Text style={[styles.accountTypeTag, { color: colors.textMuted }]}>
                      • {selectedAccount?.type === 'CREDIT_CARD' ? 'Credit Card' : 'Bank'}
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
                      {accounts.map((acc) => {
                        const isSel = selectedAccountId === acc.id;
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
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.dropdownMenuItemText,
                                  { color: isSel ? colors.primary : colors.textPrimary, fontWeight: isSel ? '700' : '500' },
                                ]}
                              >
                                {acc.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                                {acc.type === 'CREDIT_CARD' ? 'Credit Card' : 'Bank Deposit'}
                              </Text>
                            </View>
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
            )}

            {/* Helper caption */}
            <Text style={[styles.helperCaption, { color: colors.textMuted }]}>
              {activeTab === 'SIP'
                ? 'SIPs are tracked as savings and investments, not monthly expenses. You will be prompted on the due day until marked paid.'
                : 'This stays in your upcoming-month plan and does not become a transaction until you record the payment.'}
            </Text>
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
              <Text style={styles.saveBtnText}>Add to plan +</Text>
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
  pillBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabPillActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabPillTextActive: {
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
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
  sipTypeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  accountTypeTag: {
    fontSize: 12,
    marginLeft: 6,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dropdownMenuItemText: {
    fontSize: 13,
  },
  dayGridContainer: {
    marginTop: -8,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  gridHelperLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayGridCell: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  dayGridCellText: {
    fontSize: 12,
  },
  helperCaption: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
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
