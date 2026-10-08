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
import { CreateAccountInput } from '../../../core/types/accounts';

interface AddBankDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAccountInput) => Promise<void>;
}

export const AddBankDrawer: React.FC<AddBankDrawerProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();

  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!bankName.trim()) return;
    const balNum = parseFloat(balance.replace(/[^0-9.]/g, '')) || 0;
    const minNum = parseFloat(minBalance.replace(/[^0-9.]/g, '')) || 0;

    setLoading(true);
    try {
      await onSubmit({
        name: bankName.trim(),
        type: 'BANK_DEPOSIT',
        balance: balNum,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: minNum,
      });
      setBankName('');
      setBalance('');
      setMinBalance('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
                <View>
                  <Text style={[styles.microHeader, { color: colors.textMuted }]}>ACCOUNT DETAILS</Text>
                  <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Add bank account</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Bank Name & Current Balance */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bank name</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. ICICI Bank"
                      placeholderTextColor={colors.textMuted}
                      value={bankName}
                      onChangeText={setBankName}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current balance</Text>
                    <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                      <TextInput
                        style={[styles.currencyInput, { color: colors.textPrimary }]}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={balance}
                        onChangeText={setBalance}
                      />
                    </View>
                  </View>
                </View>

                {/* Minimum Balance Required */}
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minimum balance required</Text>
                  <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                    <TextInput
                      style={[styles.currencyInput, { color: colors.textPrimary }]}
                      placeholder="0 (Optional)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={minBalance}
                      onChangeText={setMinBalance}
                    />
                  </View>
                </View>

                {/* Helper notice */}
                <Text style={[styles.helperNote, { color: colors.textMuted }]}>
                  Balances are manually tracked. Spendly shows the last update time beside every account.
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
                  <Text style={styles.saveBtnText}>Save account ✓</Text>
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
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 18,
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
    paddingVertical: 9,
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
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
  },
  helperNote: {
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
