import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account, Transaction } from '../../../core/types';
import { CreateTransactionInput } from '../../../core/types/transactions';
import { CreateInvestmentInput } from '../../../core/types/investments';
import { formatRupee } from '../../../core/utils/currency';

export interface AddTransactionModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
  onAddInvestment?: (input: CreateInvestmentInput) => Promise<any>;
  initialTransaction?: Transaction | null;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

type ModeType = 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'INVESTMENT';

const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'restaurant-outline', color: '#d4a373' },
  { name: 'Shopping', icon: 'cart-outline', color: '#e07a5f' },
  { name: 'Housing & Utilities', icon: 'home-outline', color: '#52b788' },
  { name: 'Transport', icon: 'car-outline', color: '#40916c' },
  { name: 'Subscriptions', icon: 'repeat-outline', color: '#b56576' },
  { name: 'Entertainment', icon: 'film-outline', color: '#ffca45' },
  { name: 'Health & Medical', icon: 'medkit-outline', color: '#ff8a83' },
  { name: 'Personal Care', icon: 'sparkles-outline', color: '#9381ff' },
  { name: 'General', icon: 'pricetag-outline', color: '#94a3b8' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase-outline', color: '#52b788' },
  { name: 'Freelance & Consulting', icon: 'laptop-outline', color: '#40916c' },
  { name: 'Investments & Dividends', icon: 'trending-up-outline', color: '#ffca45' },
  { name: 'Business Income', icon: 'business-outline', color: '#86d7ad' },
  { name: 'Rental Income', icon: 'key-outline', color: '#d4a373' },
  { name: 'Gifts & Grants', icon: 'gift-outline', color: '#b56576' },
  { name: 'Other Inflow', icon: 'cash-outline', color: '#94a3b8' },
];

const TRANSFER_PURPOSES = [
  'Credit Card Bill Repayment',
  'ATM Cash Withdrawal',
  'Savings Allocation',
  'Inter-Account Transfer',
  'Emergency Fund Transfer',
];

const INVESTMENT_CATEGORIES: { key: CreateInvestmentInput['type']; label: string; icon: string }[] = [
  { key: 'MUTUAL_FUND', label: 'Mutual Fund / SIP', icon: 'pie-chart-outline' },
  { key: 'STOCKS', label: 'Stocks / Equity', icon: 'trending-up-outline' },
  { key: 'GOLD', label: 'Gold / SGB', icon: 'medal-outline' },
  { key: 'FIXED_DEPOSIT', label: 'Fixed Deposit', icon: 'lock-closed-outline' },
  { key: 'SIP', label: 'Systematic Investment', icon: 'repeat-outline' },
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
  onAddInvestment,
  initialTransaction,
  onUpdate,
}) => {
  const isEditMode = Boolean(initialTransaction);

  const [mode, setMode] = useState<ModeType>('DEBIT');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [payeeOrSource, setPayeeOrSource] = useState<string>('');
  const [category, setCategory] = useState<string>('Food & Dining');
  const [memo, setMemo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Accounts state
  const bankAccounts = useMemo(() => accounts.filter((a) => a.type === 'BANK_DEPOSIT'), [accounts]);
  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'CREDIT_CARD'), [accounts]);
  const physicalWallets = useMemo(() => accounts.filter((a) => a.type === 'PHYSICAL_WALLET'), [accounts]);

  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedDestId, setSelectedDestId] = useState<string>('');

  // Dropdown states
  const [showSourcePicker, setShowSourcePicker] = useState<boolean>(false);
  const [showDestPicker, setShowDestPicker] = useState<boolean>(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);

  // Investment specific state
  const [investAssetType, setInvestAssetType] = useState<CreateInvestmentInput['type']>('MUTUAL_FUND');
  const [investIsSip, setInvestIsSip] = useState<boolean>(true);

  // Initialize values when opening
  useEffect(() => {
    if (visible) {
      setError(null);
      if (initialTransaction) {
        setAmountStr(initialTransaction.amount.toString());
        setPayeeOrSource(initialTransaction.description || '');
        setCategory(initialTransaction.category || 'Food & Dining');
        setSelectedSourceId(initialTransaction.account_id);
        if (initialTransaction.type === 'OUTFLOW') {
          setMode('DEBIT');
        } else if (initialTransaction.type === 'INFLOW') {
          setMode('CREDIT');
        } else if (initialTransaction.type === 'TRANSFER') {
          setMode('TRANSFER');
          setSelectedDestId(initialTransaction.destination_account_id || '');
        }
      } else {
        setAmountStr('0');
        setPayeeOrSource('');
        setMemo('');
        setCategory('Food & Dining');
        setMode('DEBIT');
        if (bankAccounts.length > 0) {
          setSelectedSourceId(bankAccounts[0].id);
        } else if (accounts.length > 0) {
          setSelectedSourceId(accounts[0].id);
        }
        if (creditCards.length > 0) {
          setSelectedDestId(creditCards[0].id);
        } else if (physicalWallets.length > 0) {
          setSelectedDestId(physicalWallets[0].id);
        } else if (bankAccounts.length > 1) {
          setSelectedDestId(bankAccounts[1].id);
        }
      }
    }
  }, [visible, initialTransaction, accounts]);

  // Auto-detect transfer purpose when source or destination changes in TRANSFER mode
  useEffect(() => {
    if (mode === 'TRANSFER') {
      const destAcc = accounts.find((a) => a.id === selectedDestId);
      const sourceAcc = accounts.find((a) => a.id === selectedSourceId);
      if (destAcc?.type === 'CREDIT_CARD') {
        setCategory('Credit Card Bill Repayment');
      } else if (destAcc?.type === 'PHYSICAL_WALLET' && sourceAcc?.type === 'BANK_DEPOSIT') {
        setCategory('ATM Cash Withdrawal');
      } else if (!TRANSFER_PURPOSES.includes(category)) {
        setCategory('Inter-Account Transfer');
      }
    }
  }, [mode, selectedSourceId, selectedDestId, accounts]);

  const sourceAccount = accounts.find((a) => a.id === selectedSourceId);
  const destAccount = accounts.find((a) => a.id === selectedDestId);

  // Quick Amount Addition
  const handleAddAmount = (addVal: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + addVal).toString());
  };

  const handleClearAmount = () => {
    setAmountStr('0');
  };

  const handleSwapTransfer = () => {
    const temp = selectedSourceId;
    setSelectedSourceId(selectedDestId);
    setSelectedDestId(temp);
  };

  const handleSave = async () => {
    const numericAmount = parseFloat(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!selectedSourceId) {
      setError('Please select a source account.');
      return;
    }

    if (mode === 'TRANSFER' && !selectedDestId) {
      setError('Please select a destination account for the transfer.');
      return;
    }

    if (mode === 'TRANSFER' && selectedSourceId === selectedDestId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'INVESTMENT') {
        if (!payeeOrSource.trim()) {
          setError('Please provide an asset or scheme name.');
          setLoading(false);
          return;
        }

        if (onAddInvestment) {
          await onAddInvestment({
            name: payeeOrSource.trim(),
            type: investAssetType,
            invested_amount: numericAmount,
            current_value: numericAmount,
            monthly_sip_amount: investIsSip ? numericAmount : 0,
            linked_account_id: selectedSourceId,
          });
        }

        // Also record the outflow/transfer transaction for double entry ledger
        await onSubmit({
          account_id: selectedSourceId,
          type: 'OUTFLOW',
          amount: numericAmount,
          category: 'Investments',
          description: `${investIsSip ? 'SIP: ' : 'Investment: '}${payeeOrSource.trim()}`,
        });
      } else if (mode === 'TRANSFER') {
        const desc = payeeOrSource.trim() || category;
        const fullDesc = memo.trim() ? `${desc} (${memo.trim()})` : desc;

        await onSubmit({
          account_id: selectedSourceId,
          destination_account_id: selectedDestId,
          type: 'TRANSFER',
          amount: numericAmount,
          category: category || 'Transfer',
          description: fullDesc,
        });
      } else {
        // DEBIT or CREDIT
        const txType = mode === 'DEBIT' ? 'OUTFLOW' : 'INFLOW';
        const defaultDesc = mode === 'DEBIT' ? 'Expense' : 'Income';
        const mainDesc = payeeOrSource.trim() || defaultDesc;
        const fullDesc = memo.trim() ? `${mainDesc} • ${memo.trim()}` : mainDesc;

        if (isEditMode && initialTransaction && onUpdate) {
          await onUpdate(initialTransaction.id, {
            account_id: selectedSourceId,
            type: txType,
            amount: numericAmount,
            category: category,
            description: fullDesc,
          });
        } else {
          await onSubmit({
            account_id: selectedSourceId,
            type: txType,
            amount: numericAmount,
            category: category,
            description: fullDesc,
          });
        }
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeLabel = (acc?: Account) => {
    if (!acc) return '';
    if (acc.type === 'BANK_DEPOSIT') return `Bank • ₹${acc.balance.toLocaleString('en-IN')}`;
    if (acc.type === 'CREDIT_CARD') return `Card • ₹${acc.balance.toLocaleString('en-IN')} debt`;
    if (acc.type === 'PHYSICAL_WALLET') return `Cash Wallet • ₹${acc.balance.toLocaleString('en-IN')}`;
    return '';
  };

  const getAccountIcon = (acc?: Account) => {
    if (!acc) return 'wallet-outline';
    if (acc.type === 'BANK_DEPOSIT') return 'business-outline';
    if (acc.type === 'CREDIT_CARD') return 'card-outline';
    return 'cash-outline';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.vaultShield}>
              <Ionicons name="shield-checkmark" size={18} color="#52b788" />
            </View>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Transaction' : 'Record Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Segmented Type Switcher */}
          {!isEditMode && (
            <View style={styles.typeNav}>
              <TouchableOpacity
                style={[styles.typeBtn, mode === 'DEBIT' && styles.typeBtnActiveDebit]}
                onPress={() => {
                  setMode('DEBIT');
                  setCategory('Food & Dining');
                }}
              >
                <Ionicons
                  name="trending-down"
                  size={15}
                  color={mode === 'DEBIT' ? '#ffffff' : '#94a3b8'}
                />
                <Text style={[styles.typeBtnText, mode === 'DEBIT' && styles.typeBtnTextActive]}>
                  Debit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, mode === 'CREDIT' && styles.typeBtnActiveCredit]}
                onPress={() => {
                  setMode('CREDIT');
                  setCategory('Salary');
                }}
              >
                <Ionicons
                  name="trending-up"
                  size={15}
                  color={mode === 'CREDIT' ? '#ffffff' : '#94a3b8'}
                />
                <Text style={[styles.typeBtnText, mode === 'CREDIT' && styles.typeBtnTextActive]}>
                  Credit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, mode === 'TRANSFER' && styles.typeBtnActiveTransfer]}
                onPress={() => {
                  setMode('TRANSFER');
                  setCategory('Inter-Account Transfer');
                }}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={15}
                  color={mode === 'TRANSFER' ? '#ffffff' : '#94a3b8'}
                />
                <Text style={[styles.typeBtnText, mode === 'TRANSFER' && styles.typeBtnTextActive]}>
                  Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, mode === 'INVESTMENT' && styles.typeBtnActiveInvest]}
                onPress={() => {
                  setMode('INVESTMENT');
                  setCategory('Investments');
                }}
              >
                <Ionicons
                  name="pie-chart"
                  size={14}
                  color={mode === 'INVESTMENT' ? '#ffffff' : '#94a3b8'}
                />
                <Text style={[styles.typeBtnText, mode === 'INVESTMENT' && styles.typeBtnTextActive]}>
                  Invest
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Hero Numeric Amount Display */}
            <View style={styles.heroAmountCard}>
              <Text style={styles.heroAmountLabel}>
                {mode === 'DEBIT'
                  ? 'TRANSACTION VALUE'
                  : mode === 'CREDIT'
                  ? 'INFLOW VALUE'
                  : mode === 'TRANSFER'
                  ? 'TRANSFER AMOUNT'
                  : 'CAPITAL ALLOCATION'}
              </Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.rupeeSign}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={(val) => setAmountStr(val.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  selectTextOnFocus
                />
              </View>

              {/* Quick Increment Chips */}
              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleAddAmount(100)}
                >
                  <Text style={styles.quickChipText}>+₹100</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleAddAmount(500)}
                >
                  <Text style={styles.quickChipText}>+₹500</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleAddAmount(1000)}
                >
                  <Text style={styles.quickChipText}>+₹1,000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleAddAmount(5000)}
                >
                  <Text style={styles.quickChipText}>+₹5,000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickChip, styles.quickChipClear]}
                  onPress={handleClearAmount}
                >
                  <Text style={[styles.quickChipText, { color: '#ff8a83' }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ERROR BANNER */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#ffb4ab" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* DYNAMIC FORM ACCORDING TO MODE */}

            {/* 1. DEBIT / EXPENSE FORM */}
            {mode === 'DEBIT' && (
              <View style={styles.sectionFields}>
                {/* Source Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>From Source Account</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowSourcePicker(!showSourcePicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.accountIconBox}>
                        <Ionicons name={getAccountIcon(sourceAccount)} size={18} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.selectTitle}>
                          {sourceAccount?.name || 'Select Account'}
                        </Text>
                        <Text style={styles.selectSub}>{getAccountTypeLabel(sourceAccount)}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showSourcePicker && (
                    <View style={styles.pickerDropdown}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.pickerItem,
                            selectedSourceId === acc.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedSourceId(acc.id);
                            setShowSourcePicker(false);
                          }}
                        >
                          <Ionicons name={getAccountIcon(acc)} size={16} color="#52b788" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemTitle}>{acc.name}</Text>
                            <Text style={styles.pickerItemSub}>{getAccountTypeLabel(acc)}</Text>
                          </View>
                          {selectedSourceId === acc.id && (
                            <Ionicons name="checkmark" size={16} color="#52b788" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Merchant / Payee */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Merchant or Payee</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="storefront-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Starbucks Coffee, Amazon, Landlord"
                      placeholderTextColor="#64748b"
                      value={payeeOrSource}
                      onChangeText={setPayeeOrSource}
                    />
                  </View>
                </View>

                {/* Category Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.categoryIconBox}>
                        <Ionicons
                          name={
                            (EXPENSE_CATEGORIES.find((c) => c.name === category)?.icon as any) ||
                            'pricetag-outline'
                          }
                          size={18}
                          color="#52b788"
                        />
                      </View>
                      <Text style={styles.selectTitle}>{category}</Text>
                    </View>
                    <Ionicons
                      name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <View style={styles.categoryGrid}>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.name}
                          style={[
                            styles.categoryChip,
                            category === cat.name && styles.categoryChipActive,
                          ]}
                          onPress={() => {
                            setCategory(cat.name);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Ionicons
                            name={cat.icon as any}
                            size={14}
                            color={category === cat.name ? '#ffffff' : cat.color}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              category === cat.name && styles.categoryChipTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Memo */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Optional Memo & Tags</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Dinner with team (#dining #team)"
                      placeholderTextColor="#64748b"
                      value={memo}
                      onChangeText={setMemo}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 2. CREDIT / INCOME FORM */}
            {mode === 'CREDIT' && (
              <View style={styles.sectionFields}>
                {/* Destination Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>To Account (Deposited Into)</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowSourcePicker(!showSourcePicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.accountIconBox}>
                        <Ionicons name={getAccountIcon(sourceAccount)} size={18} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.selectTitle}>
                          {sourceAccount?.name || 'Select Account'}
                        </Text>
                        <Text style={styles.selectSub}>{getAccountTypeLabel(sourceAccount)}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showSourcePicker && (
                    <View style={styles.pickerDropdown}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.pickerItem,
                            selectedSourceId === acc.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedSourceId(acc.id);
                            setShowSourcePicker(false);
                          }}
                        >
                          <Ionicons name={getAccountIcon(acc)} size={16} color="#52b788" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemTitle}>{acc.name}</Text>
                            <Text style={styles.pickerItemSub}>{getAccountTypeLabel(acc)}</Text>
                          </View>
                          {selectedSourceId === acc.id && (
                            <Ionicons name="checkmark" size={16} color="#52b788" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Income Source / Client */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Income Source / Client</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="business-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Acme Corp Tech Payroll, Freelance Retainer"
                      placeholderTextColor="#64748b"
                      value={payeeOrSource}
                      onChangeText={setPayeeOrSource}
                    />
                  </View>
                </View>

                {/* Category Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Income Stream Category</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.categoryIconBox}>
                        <Ionicons
                          name={
                            (INCOME_CATEGORIES.find((c) => c.name === category)?.icon as any) ||
                            'cash-outline'
                          }
                          size={18}
                          color="#52b788"
                        />
                      </View>
                      <Text style={styles.selectTitle}>{category}</Text>
                    </View>
                    <Ionicons
                      name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <View style={styles.categoryGrid}>
                      {INCOME_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.name}
                          style={[
                            styles.categoryChip,
                            category === cat.name && styles.categoryChipActive,
                          ]}
                          onPress={() => {
                            setCategory(cat.name);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Ionicons
                            name={cat.icon as any}
                            size={14}
                            color={category === cat.name ? '#ffffff' : cat.color}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              category === cat.name && styles.categoryChipTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Memo */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Optional Memo</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. November bonus (#bonus)"
                      placeholderTextColor="#64748b"
                      value={memo}
                      onChangeText={setMemo}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 3. SELF TRANSFER FORM */}
            {mode === 'TRANSFER' && (
              <View style={styles.sectionFields}>
                {/* Neutral flow informative pill */}
                <View style={styles.neutralFlowBanner}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#52b788" />
                  <Text style={styles.neutralFlowText}>
                    Zero Net-Worth Impact. Moves funds between your tools without duplicating expense calculations.
                  </Text>
                </View>

                {/* Source Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>From Own Account (Source)</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowSourcePicker(!showSourcePicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.accountIconBox}>
                        <Ionicons name={getAccountIcon(sourceAccount)} size={18} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.selectTitle}>
                          {sourceAccount?.name || 'Select Source Account'}
                        </Text>
                        <Text style={styles.selectSub}>{getAccountTypeLabel(sourceAccount)}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showSourcePicker && (
                    <View style={styles.pickerDropdown}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.pickerItem,
                            selectedSourceId === acc.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedSourceId(acc.id);
                            setShowSourcePicker(false);
                          }}
                        >
                          <Ionicons name={getAccountIcon(acc)} size={16} color="#52b788" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemTitle}>{acc.name}</Text>
                            <Text style={styles.pickerItemSub}>{getAccountTypeLabel(acc)}</Text>
                          </View>
                          {selectedSourceId === acc.id && (
                            <Ionicons name="checkmark" size={16} color="#52b788" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Swap Transfer Button */}
                <View style={styles.swapButtonRow}>
                  <View style={styles.swapLine} />
                  <TouchableOpacity style={styles.swapButton} onPress={handleSwapTransfer}>
                    <Ionicons name="swap-vertical" size={18} color="#52b788" />
                  </TouchableOpacity>
                  <View style={styles.swapLine} />
                </View>

                {/* Destination Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>To Own Account (Destination)</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowDestPicker(!showDestPicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.accountIconBox}>
                        <Ionicons name={getAccountIcon(destAccount)} size={18} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.selectTitle}>
                          {destAccount?.name || 'Select Destination Account'}
                        </Text>
                        <Text style={styles.selectSub}>{getAccountTypeLabel(destAccount)}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={showDestPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showDestPicker && (
                    <View style={styles.pickerDropdown}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.pickerItem,
                            selectedDestId === acc.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedDestId(acc.id);
                            setShowDestPicker(false);
                          }}
                        >
                          <Ionicons name={getAccountIcon(acc)} size={16} color="#52b788" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemTitle}>{acc.name}</Text>
                            <Text style={styles.pickerItemSub}>{getAccountTypeLabel(acc)}</Text>
                          </View>
                          {selectedDestId === acc.id && (
                            <Ionicons name="checkmark" size={16} color="#52b788" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Transfer Purpose */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Transfer Purpose</Text>
                  <View style={styles.categoryGrid}>
                    {TRANSFER_PURPOSES.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.categoryChip,
                          category === p && styles.categoryChipActive,
                        ]}
                        onPress={() => setCategory(p)}
                      >
                        <Ionicons
                          name="swap-horizontal"
                          size={13}
                          color={category === p ? '#ffffff' : '#52b788'}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            category === p && styles.categoryChipTextActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Memo */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Optional Memo</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Cleared credit bill for Nov"
                      placeholderTextColor="#64748b"
                      value={memo}
                      onChangeText={setMemo}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 4. INVESTMENT FORM */}
            {mode === 'INVESTMENT' && (
              <View style={styles.sectionFields}>
                {/* Asset Category Pills */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Asset Category</Text>
                  <View style={styles.categoryGrid}>
                    {INVESTMENT_CATEGORIES.map((inv) => (
                      <TouchableOpacity
                        key={inv.key}
                        style={[
                          styles.categoryChip,
                          investAssetType === inv.key && styles.categoryChipActive,
                        ]}
                        onPress={() => setInvestAssetType(inv.key)}
                      >
                        <Ionicons
                          name={inv.icon as any}
                          size={14}
                          color={investAssetType === inv.key ? '#ffffff' : '#52b788'}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            investAssetType === inv.key && styles.categoryChipTextActive,
                          ]}
                        >
                          {inv.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Scheme / Asset Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Asset or Scheme Name</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="pie-chart-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Parag Parikh Flexi Cap, HDFC Gold ETF"
                      placeholderTextColor="#64748b"
                      value={payeeOrSource}
                      onChangeText={setPayeeOrSource}
                    />
                  </View>
                </View>

                {/* Mode: SIP vs Lumpsum */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Allocation Mode</Text>
                  <View style={styles.sipModeRow}>
                    <TouchableOpacity
                      style={[styles.sipModeBtn, investIsSip && styles.sipModeBtnActive]}
                      onPress={() => setInvestIsSip(true)}
                    >
                      <Ionicons
                        name="repeat-outline"
                        size={15}
                        color={investIsSip ? '#ffffff' : '#94a3b8'}
                      />
                      <Text style={[styles.sipModeText, investIsSip && styles.sipModeTextActive]}>
                        SIP (Recurring)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sipModeBtn, !investIsSip && styles.sipModeBtnActive]}
                      onPress={() => setInvestIsSip(false)}
                    >
                      <Ionicons
                        name="flash-outline"
                        size={15}
                        color={!investIsSip ? '#ffffff' : '#94a3b8'}
                      />
                      <Text style={[styles.sipModeText, !investIsSip && styles.sipModeTextActive]}>
                        Lumpsum (One-Time)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Funding Bank Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Funding Bank Account</Text>
                  <TouchableOpacity
                    style={styles.selectCard}
                    onPress={() => setShowSourcePicker(!showSourcePicker)}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.accountIconBox}>
                        <Ionicons name={getAccountIcon(sourceAccount)} size={18} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.selectTitle}>
                          {sourceAccount?.name || 'Select Bank Account'}
                        </Text>
                        <Text style={styles.selectSub}>{getAccountTypeLabel(sourceAccount)}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showSourcePicker && (
                    <View style={styles.pickerDropdown}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.pickerItem,
                            selectedSourceId === acc.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedSourceId(acc.id);
                            setShowSourcePicker(false);
                          }}
                        >
                          <Ionicons name={getAccountIcon(acc)} size={16} color="#52b788" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemTitle}>{acc.name}</Text>
                            <Text style={styles.pickerItemSub}>{getAccountTypeLabel(acc)}</Text>
                          </View>
                          {selectedSourceId === acc.id && (
                            <Ionicons name="checkmark" size={16} color="#52b788" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Action CTA */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#b7e4c7" />
            <Text style={styles.submitBtnText}>
              {loading
                ? 'Recording...'
                : mode === 'DEBIT'
                ? 'Record Expense'
                : mode === 'CREDIT'
                ? 'Record Inflow'
                : mode === 'TRANSFER'
                ? 'Record Self-Transfer'
                : 'Record Investment'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#122131',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.25)',
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#273647',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vaultShield: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d4e4fa',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1c2b3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeNav: {
    flexDirection: 'row',
    backgroundColor: '#010f1f',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  typeBtnActiveDebit: {
    backgroundColor: '#2d6a4f',
  },
  typeBtnActiveCredit: {
    backgroundColor: '#2d6a4f',
  },
  typeBtnActiveTransfer: {
    backgroundColor: '#2d6a4f',
  },
  typeBtnActiveInvest: {
    backgroundColor: '#2d6a4f',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  formScroll: {
    maxHeight: 460,
  },
  heroAmountCard: {
    backgroundColor: '#010f1f',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1c2b3c',
  },
  heroAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  rupeeSign: {
    fontSize: 26,
    fontWeight: '600',
    color: '#52b788',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '700',
    color: '#d4e4fa',
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  quickChip: {
    backgroundColor: '#1c2b3c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.2)',
  },
  quickChipClear: {
    borderColor: 'rgba(255, 138, 131, 0.3)',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86d7ad',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(147, 0, 10, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ff8a83',
  },
  errorText: {
    fontSize: 12,
    color: '#ffb4ab',
    flex: 1,
  },
  sectionFields: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#010f1f',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#273647',
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1c2b3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  selectSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  categoryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDropdown: {
    backgroundColor: '#0d1c2d',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#273647',
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b3c',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(82, 183, 136, 0.1)',
  },
  pickerItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4e4fa',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#010f1f',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#273647',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#d4e4fa',
    padding: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#010f1f',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#273647',
  },
  categoryChipActive: {
    backgroundColor: '#2d6a4f',
    borderColor: '#52b788',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#d4e4fa',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  neutralFlowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(82, 183, 136, 0.12)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
  },
  neutralFlowText: {
    fontSize: 11,
    color: '#86d7ad',
    flex: 1,
    lineHeight: 16,
  },
  swapButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#273647',
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#122131',
    borderWidth: 1,
    borderColor: '#52b788',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  sipModeRow: {
    flexDirection: 'row',
    backgroundColor: '#010f1f',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  sipModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sipModeBtnActive: {
    backgroundColor: '#2d6a4f',
  },
  sipModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  sipModeTextActive: {
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#52b788',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
