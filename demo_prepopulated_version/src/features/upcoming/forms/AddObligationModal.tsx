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
import { Account, CreateObligationInput, ObligationType } from '../../../core/types';

interface AddObligationModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateObligationInput) => Promise<void>;
}

export const AddObligationModal: React.FC<AddObligationModalProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<ObligationType>('EMI');
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDay, setDueDay] = useState<string>('5');
  const [linkedAccountId, setLinkedAccountId] = useState<string>(accounts[0]?.id || '');
  const [totalTenure, setTotalTenure] = useState<string>('12');
  const [remainingTenure, setRemainingTenure] = useState<string>('12');
  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (accounts.length > 0 && !linkedAccountId) {
      setLinkedAccountId(accounts[0].id);
    }
  }, [accounts, linkedAccountId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the subscription, EMI, or loan.');
      return;
    }

    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive monthly installment amount.');
      return;
    }

    const numDueDay = parseInt(dueDay.trim(), 10);
    if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
      Alert.alert('Invalid Due Day', 'Due day must be between 1 and 31.');
      return;
    }

    if (!linkedAccountId) {
      Alert.alert('Linked Account Required', 'Please select a paying bank account or card.');
      return;
    }

    let parsedTotalTenure: number | null = null;
    let parsedRemTenure: number | null = null;
    let parsedPrincipal: number | null = null;
    let parsedInterest: number | null = null;

    if (type === 'EMI' || type === 'LOAN') {
      if (totalTenure.trim()) {
        parsedTotalTenure = parseInt(totalTenure.trim(), 10);
        parsedRemTenure = remainingTenure.trim()
          ? parseInt(remainingTenure.trim(), 10)
          : parsedTotalTenure;
      }
    }

    if (type === 'LOAN') {
      if (principalAmount.trim()) {
        parsedPrincipal = parseFloat(principalAmount.trim());
      }
      if (interestRate.trim()) {
        parsedInterest = parseFloat(interestRate.trim());
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        type,
        amount: numAmount,
        due_day: numDueDay,
        linked_account_id: linkedAccountId,
        total_tenure_months: parsedTotalTenure,
        remaining_tenure_months: parsedRemTenure,
        principal_amount: parsedPrincipal,
        interest_rate: parsedInterest,
        notes: notes.trim() || null,
      });

      setName('');
      setAmount('');
      setNotes('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save obligation');
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
              <Text style={styles.sheetTitle}>New Upcoming Obligation</Text>
              <Text style={styles.sheetSub}>Configure recurring payments, EMIs, or loans</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              {(['SUBSCRIPTION', 'EMI', 'LOAN'] as ObligationType[]).map((t) => {
                const isSelected = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Name / Title */}
            <Text style={styles.fieldLabel}>Obligation Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                type === 'SUBSCRIPTION'
                  ? 'e.g. Netflix 4K, Gym Membership'
                  : type === 'EMI'
                  ? 'e.g. MacBook Pro M3 EMI, iPhone 16'
                  : 'e.g. Home Mortgage, Car Auto Loan'
              }
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Monthly Installment Amount */}
            <Text style={styles.fieldLabel}>Monthly Installment / Fee (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Due Day of Month */}
            <Text style={styles.fieldLabel}>Due Day of Every Month (1-31)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              placeholder="e.g. 5 for the 5th of each month"
              placeholderTextColor={theme.colors.textMuted}
              value={dueDay}
              onChangeText={setDueDay}
            />

            {/* Linked Account */}
            <Text style={styles.fieldLabel}>Paying Bank Account or Card</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {accounts.map((acc) => {
                const isSelected = linkedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                    onPress={() => setLinkedAccountId(acc.id)}
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

            {/* Tenure months for EMI & Loans */}
            {(type === 'EMI' || type === 'LOAN') && (
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Total Tenure (Mo.)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 24"
                    placeholderTextColor={theme.colors.textMuted}
                    value={totalTenure}
                    onChangeText={setTotalTenure}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Remaining (Mo.)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 18"
                    placeholderTextColor={theme.colors.textMuted}
                    value={remainingTenure}
                    onChangeText={setRemainingTenure}
                  />
                </View>
              </View>
            )}

            {/* Principal & Interest rate for Loans */}
            {type === 'LOAN' && (
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Principal Total (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 25000"
                    placeholderTextColor={theme.colors.textMuted}
                    value={principalAmount}
                    onChangeText={setPrincipalAmount}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Interest Rate (%)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 6.5"
                    placeholderTextColor={theme.colors.textMuted}
                    value={interestRate}
                    onChangeText={setInterestRate}
                  />
                </View>
              </View>
            )}

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes / Contract Memo (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 0% APR promo, auto-debit on 5th"
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving Obligation...' : 'Save Upcoming Payment'}
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
    paddingVertical: 9,
    alignItems: 'center',
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
  chipsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
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
  chipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
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
