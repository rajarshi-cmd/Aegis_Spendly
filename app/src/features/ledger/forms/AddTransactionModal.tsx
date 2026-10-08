import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../presentation/theme';
import { Account, CreateTransactionInput, TransactionType } from '../../../core/types';

interface AddTransactionModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

const DEFAULT_CATEGORIES: Record<TransactionType, string[]> = {
  OUTFLOW: ['Groceries', 'Dining', 'Utilities', 'Software', 'Health', 'Transport', 'Shopping', 'Other'],
  INFLOW: ['Salary', 'Freelance', 'Refund', 'Dividends', 'Gift', 'Other'],
  TRANSFER: ['Transfer', 'Card Payment', 'Savings Deposit'],
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>('OUTFLOW');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('Groceries');
  const [description, setDescription] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-select first account when accounts load
  React.useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(DEFAULT_CATEGORIES[newType][0] || 'Other');
    if (newType === 'TRANSFER' && accounts.length > 1) {
      const other = accounts.find((a) => a.id !== accountId);
      if (other) setDestAccountId(other.id);
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive numeric transaction amount.');
      return;
    }

    if (!accountId) {
      Alert.alert('Account Required', 'Please select an account for this movement.');
      return;
    }

    if (type === 'TRANSFER') {
      if (!destAccountId) {
        Alert.alert('Destination Required', 'Please select a destination account for the transfer.');
        return;
      }
      if (accountId === destAccountId) {
        Alert.alert('Invalid Accounts', 'Source and destination accounts must be different.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        account_id: accountId,
        type,
        amount: numAmount,
        category: category.trim() || 'General',
        description: description.trim() || null,
        reference_number: referenceNumber.trim() || null,
        timestamp: new Date().toISOString(),
        destination_account_id: type === 'TRANSFER' ? destAccountId : null,
      });

      // Reset
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.sheetContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>New Ledger Entry</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              {(['OUTFLOW', 'INFLOW', 'TRANSFER'] as TransactionType[]).map((t) => {
                const isSelected = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeButton,
                      isSelected && styles.typeButtonSelected,
                      isSelected && t === 'OUTFLOW' && { backgroundColor: theme.colors.danger },
                      isSelected && t === 'INFLOW' && { backgroundColor: theme.colors.success },
                      isSelected && t === 'TRANSFER' && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => handleTypeChange(t)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount Input */}
            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Account Selector */}
            <Text style={styles.fieldLabel}>
              {type === 'TRANSFER' ? 'Source Account' : 'Account'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {accounts.map((acc) => {
                const isSelected = accountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Ionicons
                      name={acc.type === 'BANK_DEPOSIT' ? 'wallet-outline' : 'card-outline'}
                      size={14}
                      color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    />
                    <Text
                      style={[styles.chipText, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Destination Account if Transfer */}
            {type === 'TRANSFER' && (
              <>
                <Text style={styles.fieldLabel}>Destination Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => {
                      const isSelected = destAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                          onPress={() => setDestAccountId(acc.id)}
                        >
                          <Ionicons
                            name={acc.type === 'BANK_DEPOSIT' ? 'wallet-outline' : 'card-outline'}
                            size={14}
                            color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {DEFAULT_CATEGORIES[type].map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Trader Joe's organic groceries"
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            {/* Reference Number */}
            <Text style={styles.fieldLabel}>Reference / Audit Tag (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. REC-98214"
              placeholderTextColor={theme.colors.textMuted}
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />
          </ScrollView>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Recording Movement...' : 'Save Movement'}
            </Text>
          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.xl,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scroll: {
    marginBottom: theme.spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  typeButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    marginBottom: theme.spacing.lg,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingVertical: 12,
    fontFamily: 'monospace',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChip: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
