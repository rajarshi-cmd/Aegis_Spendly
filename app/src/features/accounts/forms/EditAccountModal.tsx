import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme, theme } from '../../../presentation/theme';
import { Account, UpdateAccountInput } from '../../../core/types';
import { useFinanceData } from '../../../presentation/hooks/useFinanceData';
import { DeleteModal } from '../../../presentation/components/modals/DeleteModal';
import { ReassignAndCloseModal } from '../../../presentation/components/modals/ReassignAndCloseModal';

interface EditAccountModalProps {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSubmit: (input: UpdateAccountInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onOpenAddCard?: () => void;
  onOpenAddBank?: () => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  account,
  onClose,
  onSubmit,
  onDelete,
  onOpenAddCard,
  onOpenAddBank,
}) => {
  if (!account) return null;

  const { colors } = useTheme();
  const { obligations, investments, accounts, reassignAndCloseAccount } = useFinanceData();

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  const accountLinkedObs = useMemo(
    () => obligations.filter((o) => o.linked_account_id === account.id),
    [obligations, account]
  );
  const accountLinkedSips = useMemo(
    () => investments.filter((i) => i.linked_account_id === account.id),
    [investments, account]
  );
  const hasLinkedItems = accountLinkedObs.length > 0 || accountLinkedSips.length > 0;

  const [name, setName] = useState<string>(account.name);
  const [creditLimit, setCreditLimit] = useState<string>(account.credit_limit?.toString() || '');
  const [billingCutDay, setBillingCutDay] = useState<string>(
    account.billing_cycle_cut_day?.toString() || ''
  );
  const [paymentDueDay, setPaymentDueDay] = useState<string>(
    account.payment_due_day?.toString() || ''
  );
  const [minimumBalance, setMinimumBalance] = useState<string>(
    account.minimum_balance?.toString() || ''
  );
  const [keepTrackRatio, setKeepTrackRatio] = useState<number>(account.keep_track_ratio || 50);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setCreditLimit(account.credit_limit?.toString() || '');
      setBillingCutDay(account.billing_cycle_cut_day?.toString() || '');
      setPaymentDueDay(account.payment_due_day?.toString() || '');
      setMinimumBalance(account.minimum_balance?.toString() || '');
      setKeepTrackRatio(account.keep_track_ratio || 50);
    }
  }, [account]);

  const isCreditCard = account.type === 'CREDIT_CARD';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nickname Required', 'Please provide a valid account nickname.');
      return;
    }

    let parsedLimit: number | null = null;
    let parsedCutDay: number | null = null;
    let parsedDueDay: number | null = null;
    let parsedMinBalance: number | null = null;

    if (isCreditCard) {
      if (creditLimit.trim()) {
        parsedLimit = parseFloat(creditLimit.trim());
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          Alert.alert('Invalid Credit Limit', 'Please specify a positive credit limit.');
          return;
        }
      }
      if (billingCutDay.trim()) {
        parsedCutDay = parseInt(billingCutDay.trim(), 10);
        if (isNaN(parsedCutDay) || parsedCutDay < 1 || parsedCutDay > 31) {
          Alert.alert('Invalid Bill Generate Date', 'Cycle cut day must be between 1 and 31.');
          return;
        }
      }
      if (paymentDueDay.trim()) {
        parsedDueDay = parseInt(paymentDueDay.trim(), 10);
        if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
          Alert.alert('Invalid Due Date', 'Payment due day must be between 1 and 31.');
          return;
        }
      }
    } else {
      if (minimumBalance.trim()) {
        parsedMinBalance = parseFloat(minimumBalance.trim());
        if (isNaN(parsedMinBalance) || parsedMinBalance < 0) {
          Alert.alert('Invalid Minimum Balance', 'Please specify a valid non-negative number.');
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        id: account.id,
        name: name.trim(),
        credit_limit: isCreditCard ? parsedLimit : null,
        billing_cycle_cut_day: isCreditCard ? parsedCutDay : null,
        payment_due_day: isCreditCard ? parsedDueDay : null,
        minimum_balance: !isCreditCard ? parsedMinBalance : null,
        keep_track_ratio: isCreditCard ? keepTrackRatio : null,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowConfirmDelete(true);
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
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Edit {account.name}</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  {isCreditCard ? 'Credit Card Parameters' : 'Bank Deposit Settings'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Nickname */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Account Nickname / Label</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. My Salary Checking or Amex Gold"
                placeholderTextColor={colors.textMuted}
              />

              {isCreditCard ? (
                <>
                  {/* Credit Limit */}
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Credit Limit (₹)</Text>
                  <View style={[styles.amountInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
                    <TextInput
                      style={[styles.amountInput, { color: colors.textPrimary }]}
                      keyboardType="decimal-pad"
                      value={creditLimit}
                      onChangeText={setCreditLimit}
                      placeholder="e.g. 10000.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Bill Generate Date & Bill Due Date */}
                  <View style={styles.twoColumnRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bill Generate Day</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                        keyboardType="number-pad"
                        value={billingCutDay}
                        onChangeText={setBillingCutDay}
                        placeholder="e.g. 15 (1-31)"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bill Due Day</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                        keyboardType="number-pad"
                        value={paymentDueDay}
                        onChangeText={setPaymentDueDay}
                        placeholder="e.g. 5 (1-31)"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Target Utilization (Keep Track Ratio) Slider */}
                  <View style={{ marginTop: 14, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.background }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                        Target Keep Track Ratio
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.primaryLight }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{keepTrackRatio}%</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      Amber light triggers halfway to this ceiling (Safe: 0%-{Math.round(keepTrackRatio * 0.5)}%, Amber: {Math.round(keepTrackRatio * 0.5)}%-{keepTrackRatio}%, Red: &gt;{keepTrackRatio}%)
                    </Text>
                    {Platform.OS === 'web' && typeof document !== 'undefined' ? (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={keepTrackRatio}
                        onChange={(e: any) => setKeepTrackRatio(Math.max(0, Math.min(100, Number(e.target.value))))}
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          height: '8px',
                          borderRadius: '4px',
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${Math.round(keepTrackRatio * 0.5)}%, #F59E0B ${Math.round(keepTrackRatio * 0.5)}%, #F59E0B ${keepTrackRatio}%, #EF4444 ${keepTrackRatio}%, #EF4444 100%)`,
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      {[30, 40, 50, 60, 75].map((pct) => (
                        <TouchableOpacity
                          key={pct}
                          style={{
                            flex: 1,
                            paddingVertical: 5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: keepTrackRatio === pct ? colors.primary : colors.borderSubtle,
                            backgroundColor: keepTrackRatio === pct ? colors.primary : colors.surface,
                            alignItems: 'center',
                          }}
                          onPress={() => setKeepTrackRatio(pct)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: keepTrackRatio === pct ? '#FFFFFF' : colors.textPrimary }}>
                            {pct}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Minimum Balance Required */}
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Minimum Balance Required (₹)</Text>
                  <View style={[styles.amountInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
                    <TextInput
                      style={[styles.amountInput, { color: colors.textPrimary }]}
                      keyboardType="decimal-pad"
                      value={minimumBalance}
                      onChangeText={setMinimumBalance}
                      placeholder="e.g. 1500.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    The app alerts you if available liquid cash falls below this mandatory threshold.
                  </Text>
                </>
              )}

              {onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete This Account</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Universal In-App Delete Confirmation Modal */}
      <DeleteModal
        visible={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={async () => {
          setShowConfirmDelete(false);
          if (hasLinkedItems) {
            setShowReassignModal(true);
          } else {
            if (onDelete) {
              await onDelete(account.id);
            }
            onClose();
          }
        }}
        title={`Close ${account.name}?`}
        description={
          hasLinkedItems
            ? `${account.name} has ${accountLinkedObs.length + accountLinkedSips.length} active commitment(s) linked to it. Confirming will open reassignment so you can switch them to your other cards/banks.`
            : `This will move ${account.name} to your Deleted history shelf. All past transactions remain safely preserved, and you can restore this account anytime.`
        }
        confirmButtonText={hasLinkedItems ? 'Confirm & Reassign' : 'Close Account'}
      />

      {/* Reassign Linked Commitments Modal */}
      <ReassignAndCloseModal
        visible={showReassignModal}
        account={account}
        linkedObligations={accountLinkedObs}
        linkedSips={accountLinkedSips}
        availableAccounts={accounts.filter((a) => a.id !== account.id)}
        onClose={() => setShowReassignModal(false)}
        onConfirmReassign={async (reassignments) => {
          await reassignAndCloseAccount(account.id, reassignments);
          onClose();
        }}
        onOpenAddCard={onOpenAddCard || (() => {})}
        onOpenAddBank={onOpenAddBank || (() => {})}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.xl,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 520,
    borderTopWidth: 1,
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
  helperText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 16,
    lineHeight: 16,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
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
