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
import { Account, CreateDebtInput, DebtDirection } from '../../../core/types';

interface AddDebtModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateDebtInput) => Promise<void>;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [direction, setDirection] = useState<DebtDirection>('LENT');
  const [counterparty, setCounterparty] = useState<string>('');
  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [daysUntilDue, setDaysUntilDue] = useState<number>(14);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSave = async () => {
    const amount = parseFloat(principalAmount.trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid loan principal amount.');
      return;
    }
    if (!counterparty.trim()) {
      Alert.alert('Counterparty Required', 'Please provide the name of the peer or entity.');
      return;
    }
    if (!accountId) {
      Alert.alert('Settlement Account Required', 'Please select a linked bank account.');
      return;
    }

    const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString();

    try {
      setIsSubmitting(true);
      await onSubmit({
        counterparty: counterparty.trim(),
        direction,
        principal_amount: amount,
        settlement_account_id: accountId,
        due_date: dueDate,
        notes: notes.trim() || null,
      });

      setCounterparty('');
      setPrincipalAmount('');
      setNotes('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create debt record');
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
            <Text style={styles.sheetTitle}>New P2P Obligation</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Direction Selector */}
            <View style={styles.directionSelector}>
              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  direction === 'LENT' && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setDirection('LENT')}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={16}
                  color={direction === 'LENT' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dirText,
                    direction === 'LENT' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  I Lent Money (Asset)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  direction === 'BORROWED' && { backgroundColor: theme.colors.danger },
                ]}
                onPress={() => setDirection('BORROWED')}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={16}
                  color={direction === 'BORROWED' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dirText,
                    direction === 'BORROWED' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  I Borrowed (Liability)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Counterparty */}
            <Text style={styles.fieldLabel}>Counterparty Entity</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Sarah Jenkins or Bob's Tech LLC"
              placeholderTextColor={theme.colors.textMuted}
              value={counterparty}
              onChangeText={setCounterparty}
            />

            {/* Principal Amount */}
            <Text style={styles.fieldLabel}>Principal Amount (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={principalAmount}
                onChangeText={setPrincipalAmount}
              />
            </View>

            {/* Settlement Account */}
            <Text style={styles.fieldLabel}>Settling Bank Account</Text>
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
                      name="wallet-outline"
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

            {/* Due In preset days */}
            <Text style={styles.fieldLabel}>Repayment Target Schedule</Text>
            <View style={styles.duePresetsRow}>
              {[
                { days: 3, label: '3 Days' },
                { days: 7, label: '1 Week' },
                { days: 14, label: '2 Weeks' },
                { days: 30, label: '1 Month' },
              ].map((p) => {
                const isSelected = daysUntilDue === p.days;
                return (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                    onPress={() => setDaysUntilDue(p.days)}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes / Contract Terms (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Travel split / Temporary emergency buffer"
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Recording Obligation...' : 'Save P2P Obligation'}
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
  directionSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dirText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
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
    fontSize: 14,
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
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    paddingVertical: 10,
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
  duePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  presetBtnText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
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
