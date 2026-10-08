import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../presentation/theme';
import { Debt, Account, CreateSettlementInput } from '../../../core/types';

interface RepaymentModalProps {
  visible: boolean;
  debt: Debt | null;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateSettlementInput) => Promise<void>;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  visible,
  debt,
  accounts,
  onClose,
  onSubmit,
}) => {
  if (!debt) return null;

  const [amount, setAmount] = useState<string>(debt.outstanding_balance.toString());
  const [selectedAccountId, setSelectedAccountId] = useState<string>(debt.settlement_account_id);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isLent = debt.direction === 'LENT';

  const handleFullAmount = () => {
    setAmount(debt.outstanding_balance.toString());
  };

  const handleHalfAmount = () => {
    setAmount((debt.outstanding_balance / 2).toFixed(2));
  };

  const handleConfirm = async () => {
    const num = parseFloat(amount.trim());
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please specify a positive repayment amount.');
      return;
    }
    if (num > debt.outstanding_balance) {
      Alert.alert(
        'Overpayment',
        `Maximum remaining balance is ₹${debt.outstanding_balance.toFixed(2)}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        debt_id: debt.id,
        amount: num,
        settlement_account_id: selectedAccountId,
        settlement_date: new Date().toISOString(),
        notes: notes.trim() || null,
      });
      setNotes('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Repayment processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
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
          <View style={styles.modalCard}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.modalTitle}>Process Repayment</Text>
                <Text style={styles.modalSub}>
                  {isLent ? `Collecting from ${debt.counterparty}` : `Settling with ${debt.counterparty}`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceInfoBox}>
              <Text style={styles.balanceInfoLabel}>Outstanding Obligation</Text>
              <Text style={styles.balanceInfoValue}>
                ₹{debt.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Quick Pre-fill shortcuts */}
            <View style={styles.shortcutRow}>
              <TouchableOpacity style={styles.shortcutBtn} onPress={handleFullAmount}>
                <Text style={styles.shortcutText}>Full Settle (100%)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={handleHalfAmount}>
                <Text style={styles.shortcutText}>Partial (50%)</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <Text style={styles.fieldLabel}>Repayment Amount (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Note input */}
            <Text style={styles.fieldLabel}>Settlement Note (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Bank transfer / Cash settlement"
              placeholderTextColor={theme.colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.confirmButton, isSubmitting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmButtonText}>
                {isSubmitting ? 'Recording Settlement...' : 'Confirm Repayment'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  balanceInfoBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  balanceInfoLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceInfoValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
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
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
    paddingVertical: 10,
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
    marginBottom: theme.spacing.lg,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
