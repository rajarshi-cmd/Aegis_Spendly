import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Account } from '../../../core/types/accounts';
import { CreateObligationInput } from '../../../core/types/upcoming';

interface AddObligationSheetProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateObligationInput) => Promise<void>;
}

type ObligationType = 'SUBSCRIPTION' | 'EMI' | 'LOAN';

export const AddObligationSheet: React.FC<AddObligationSheetProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<ObligationType>('EMI');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [linkedAccountId, setLinkedAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState('Housing');
  const [totalTenure, setTotalTenure] = useState('12');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (accounts.length > 0 && !linkedAccountId) {
      setLinkedAccountId(accounts[0].id);
    }
  }, [accounts, linkedAccountId]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    const parsedDueDay = parseInt(dueDay, 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || isNaN(parsedDueDay)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const tenure = type === 'SUBSCRIPTION' ? null : parseInt(totalTenure, 10) || null;
      await onSubmit({
        name: name.trim(),
        type,
        amount: parsedAmount,
        due_day: Math.min(31, Math.max(1, parsedDueDay)),
        linked_account_id: linkedAccountId || accounts[0]?.id || '',
        category,
        total_tenure_months: tenure,
        remaining_tenure_months: tenure,
      });
      setName('');
      setAmount('');
      onClose();
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.surfaceContainerLow || '#0d1c2d', borderColor: colors.borderSubtle },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.grabHandle, { backgroundColor: colors.surfaceVariant || '#273647' }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="calendar-outline" size={20} color="#52b788" />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Add Fixed Commitment</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollForm} contentContainerStyle={styles.scrollFormContent} showsVerticalScrollIndicator={false}>
            {/* Type Switcher: SUBSCRIPTION, EMI, LOAN */}
            <View style={[styles.typeSwitcher, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
              {(['EMI', 'SUBSCRIPTION', 'LOAN'] as ObligationType[]).map((t) => {
                const isSelected = type === t;
                const label = t === 'EMI' ? 'EMI / Lease' : t === 'SUBSCRIPTION' ? 'Subscription' : 'Loan';
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      isSelected && [styles.typeBtnActive, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }],
                    ]}
                    onPress={() => setType(t)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        { color: isSelected ? '#52b788' : colors.textMuted },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Commitment Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Obligation Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceContainerLowest || '#010f1f',
                    color: colors.textPrimary,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Apartment Lease EMI or Netflix Bundle"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Monthly Amount */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Monthly Recurring Amount (₹)</Text>
              <View
                style={[
                  styles.amountInputRow,
                  {
                    backgroundColor: colors.surfaceContainerLowest || '#010f1f',
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Due Day & Tenure Grid */}
            <View style={styles.twoColumnGrid}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Due Day of Month (1-31)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceContainerLowest || '#010f1f',
                      color: colors.textPrimary,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              {type !== 'SUBSCRIPTION' && (
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Total Tenure (Months)</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceContainerLowest || '#010f1f',
                        color: colors.textPrimary,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    value={totalTenure}
                    onChangeText={setTotalTenure}
                    keyboardType="number-pad"
                  />
                </View>
              )}
            </View>

            {/* Linked Bank / Source Account */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Linked Auto-Debit Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountScroll}>
                {accounts.map((acc) => {
                  const isSelected = linkedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accPill,
                        {
                          backgroundColor: isSelected ? 'rgba(82, 183, 136, 0.18)' : colors.surfaceContainerHigh || '#1c2b3c',
                          borderColor: isSelected ? '#52b788' : 'transparent',
                        },
                      ]}
                      onPress={() => setLinkedAccountId(acc.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={acc.type === 'CREDIT_CARD' ? 'card-outline' : 'business-outline'}
                        size={15}
                        color={isSelected ? '#52b788' : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.accPillText,
                          { color: isSelected ? '#52b788' : colors.textPrimary },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={19} color="#003915" />
              <Text style={styles.submitBtnText}>Save Fixed Commitment</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollForm: {
    maxHeight: 520,
  },
  scrollFormContent: {
    gap: 14,
    paddingBottom: 20,
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  rupeeSymbol: {
    color: '#52b788',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  accountScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  accPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  accPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#52b788',
    gap: 6,
    marginTop: 8,
    shadowColor: '#52b788',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#003915',
    fontSize: 14,
    fontWeight: '700',
  },
});
