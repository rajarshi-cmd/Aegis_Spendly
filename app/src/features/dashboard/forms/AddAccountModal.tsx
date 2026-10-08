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
import { AccountType, CreateAccountInput } from '../../../core/types';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAccountInput) => Promise<void>;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [accountType, setAccountType] = useState<AccountType>('BANK_DEPOSIT');
  const [name, setName] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [billingCutDay, setBillingCutDay] = useState<string>('');
  const [paymentDueDay, setPaymentDueDay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setName('');
    setBalance('');
    setCreditLimit('');
    setBillingCutDay('');
    setPaymentDueDay('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter an account or card label.');
      return;
    }

    const numBalance = balance.trim() ? parseFloat(balance.trim()) : 0;
    if (isNaN(numBalance) || numBalance < 0) {
      Alert.alert('Invalid Balance', 'Please enter a valid non-negative balance.');
      return;
    }

    let parsedCreditLimit: number | null = null;
    let parsedCutDay: number | null = null;
    let parsedDueDay: number | null = null;

    if (accountType === 'CREDIT_CARD') {
      parsedCreditLimit = creditLimit.trim() ? parseFloat(creditLimit.trim()) : null;
      if (!parsedCreditLimit || parsedCreditLimit <= 0) {
        Alert.alert('Credit Limit Required', 'Please provide a valid credit limit for the card.');
        return;
      }

      if (billingCutDay.trim()) {
        parsedCutDay = parseInt(billingCutDay.trim(), 10);
        if (isNaN(parsedCutDay) || parsedCutDay < 1 || parsedCutDay > 31) {
          Alert.alert('Invalid Cut Day', 'Billing cycle day must be between 1 and 31.');
          return;
        }
      }

      if (paymentDueDay.trim()) {
        parsedDueDay = parseInt(paymentDueDay.trim(), 10);
        if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
          Alert.alert('Invalid Due Day', 'Payment due day must be between 1 and 31.');
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        type: accountType,
        balance: numBalance,
        credit_limit: parsedCreditLimit,
        billing_cycle_cut_day: parsedCutDay,
        payment_due_day: parsedDueDay,
      });

      resetForm();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save account');
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
            <View>
              <Text style={styles.sheetTitle}>Add Account or Card</Text>
              <Text style={styles.sheetSub}>Configure your manual financial node</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Account Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  accountType === 'BANK_DEPOSIT' && styles.typeBtnActive,
                ]}
                onPress={() => setAccountType('BANK_DEPOSIT')}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={accountType === 'BANK_DEPOSIT' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    accountType === 'BANK_DEPOSIT' && styles.typeBtnTextActive,
                  ]}
                >
                  Bank Deposit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  accountType === 'CREDIT_CARD' && styles.typeBtnActive,
                ]}
                onPress={() => setAccountType('CREDIT_CARD')}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={accountType === 'CREDIT_CARD' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    accountType === 'CREDIT_CARD' && styles.typeBtnTextActive,
                  ]}
                >
                  Credit Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Label / Name */}
            <Text style={styles.fieldLabel}>
              {accountType === 'BANK_DEPOSIT' ? 'Account Label / Bank Name' : 'Card Label / Issuer'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                accountType === 'BANK_DEPOSIT'
                  ? 'e.g. Chase Premier Checking or Vault Savings'
                  : 'e.g. Amex Gold Card or Chase Sapphire'
              }
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Balance */}
            <Text style={styles.fieldLabel}>
              {accountType === 'BANK_DEPOSIT' ? 'Opening Cash Balance (₹)' : 'Current Unpaid Card Debt (₹)'}
            </Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            {/* Credit Card Specific Fields */}
            {accountType === 'CREDIT_CARD' && (
              <>
                <Text style={styles.fieldLabel}>Total Credit Limit (₹)</Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 5000.00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                  />
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Cycle Cut Day</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 15 (1-31)"
                      placeholderTextColor={theme.colors.textMuted}
                      value={billingCutDay}
                      onChangeText={setBillingCutDay}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Payment Due Day</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 5 (1-31)"
                      placeholderTextColor={theme.colors.textMuted}
                      value={paymentDueDay}
                      onChangeText={setPaymentDueDay}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.privacyNote}>
              <Ionicons name="lock-closed" size={14} color="#10B981" />
              <Text style={styles.privacyNoteText}>
                Encrypted locally in device sandbox. No bank credentials, logins, or cloud links needed.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Registering Account...' : 'Save Financial Node'}
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sheetSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
  },
  typeBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    paddingVertical: 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#6EE7B7',
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
