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
import { Account, CreateInvestmentInput, InvestmentType } from '../../../core/types';

interface AddInvestmentModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (input: CreateInvestmentInput) => Promise<void>;
}

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  visible,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<InvestmentType>('SIP');
  const [name, setName] = useState<string>('');
  const [monthlySipAmount, setMonthlySipAmount] = useState<string>('');
  const [sipDueDay, setSipDueDay] = useState<string>('1');
  const [linkedAccountId, setLinkedAccountId] = useState<string>(accounts[0]?.id || '');
  const [investedAmount, setInvestedAmount] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (accounts.length > 0 && !linkedAccountId) {
      setLinkedAccountId(accounts[0].id);
    }
  }, [accounts, linkedAccountId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the investment or fund.');
      return;
    }

    const numSip = monthlySipAmount.trim() ? parseFloat(monthlySipAmount.trim()) : null;
    const numDueDay = sipDueDay.trim() ? parseInt(sipDueDay.trim(), 10) : null;

    if (numDueDay && (numDueDay < 1 || numDueDay > 31)) {
      Alert.alert('Invalid SIP Day', 'SIP due day must be between 1 and 31.');
      return;
    }

    const numInvested = investedAmount.trim() ? parseFloat(investedAmount.trim()) : 0;
    const numValue = currentValue.trim() ? parseFloat(currentValue.trim()) : numInvested;

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        type,
        monthly_sip_amount: numSip,
        sip_due_day: numDueDay,
        linked_account_id: linkedAccountId || null,
        invested_amount: numInvested,
        current_value: numValue,
        notes: notes.trim() || null,
      });

      setName('');
      setMonthlySipAmount('');
      setInvestedAmount('');
      setCurrentValue('');
      setNotes('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save investment');
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
              <Text style={styles.sheetTitle}>New Investment Asset / SIP</Text>
              <Text style={styles.sheetSub}>Track capital creation, systematic plans, and assets</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Type selector */}
            <View style={styles.typeSelector}>
              {(['SIP', 'MUTUAL_FUND', 'STOCKS', 'GOLD', 'FIXED_DEPOSIT'] as InvestmentType[]).map((t) => {
                const isSelected = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextActive]}>
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Name */}
            <Text style={styles.fieldLabel}>Asset / Fund Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Vanguard S&P 500 Index SIP, Physical Gold ETF"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Monthly SIP Amount */}
            <Text style={styles.fieldLabel}>Recurring Monthly SIP Commitment (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 500.00 (optional if one-off)"
                placeholderTextColor={theme.colors.textMuted}
                value={monthlySipAmount}
                onChangeText={setMonthlySipAmount}
              />
            </View>

            {/* Due day */}
            <Text style={styles.fieldLabel}>SIP Execution Day (1-31)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              placeholder="e.g. 1 (1st of every month)"
              placeholderTextColor={theme.colors.textMuted}
              value={sipDueDay}
              onChangeText={setSipDueDay}
            />

            {/* Linked Bank Account */}
            <Text style={styles.fieldLabel}>Funding Bank Account</Text>
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

            {/* Invested & Current Value */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Total Invested (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={investedAmount}
                  onChangeText={setInvestedAmount}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Current Value (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Investment Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Retirement IRA portfolio, growth asset"
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
              {isSubmitting ? 'Registering Asset...' : 'Save Investment Asset'}
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
    flexWrap: 'wrap',
    gap: 4,
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  typeBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  typeBtnText: {
    fontSize: 11,
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
