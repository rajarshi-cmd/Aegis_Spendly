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

interface AddCardDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAccountInput) => Promise<void>;
}

export const AddCardDrawer: React.FC<AddCardDrawerProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();

  const [nickname, setNickname] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [cutDay, setCutDay] = useState('18');
  const [dueDay, setDueDay] = useState('05');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    const limitNum = parseFloat(creditLimit.replace(/[^0-9.]/g, '')) || 50000;

    setLoading(true);
    try {
      await onSubmit({
        name: nickname.trim(),
        type: 'CREDIT_CARD',
        balance: 0,
        credit_limit: limitNum,
        billing_cycle_cut_day: parseInt(cutDay, 10) || 15,
        payment_due_day: parseInt(dueDay, 10) || 5,
        minimum_balance: null,
        card_color: 'EMERALD',
        last4: Math.floor(1000 + Math.random() * 9000).toString(),
      });
      setNickname('');
      setCreditLimit('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

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
                  <Text style={[styles.microHeader, { color: colors.textMuted }]}>CARD SETUP</Text>
                  <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Add a credit card</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Security Callout Banner */}
                <View style={[styles.securityBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={styles.securityText}>
                    No card number, CVV, or banking credential is stored in Spendly.
                  </Text>
                </View>

                {/* Nickname & Credit Limit */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Card nickname</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. SBI Cashback"
                      placeholderTextColor={colors.textMuted}
                      value={nickname}
                      onChangeText={setNickname}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credit limit</Text>
                    <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                      <TextInput
                        style={[styles.currencyInput, { color: colors.textPrimary }]}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={creditLimit}
                        onChangeText={setCreditLimit}
                      />
                    </View>
                  </View>
                </View>

                {/* Bill generation day & Cycle due day */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bill generation day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['01', '05', '10', '12', '15', '18', '20', '22', '25'].map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.dayChip,
                              {
                                borderColor: cutDay === d ? colors.primary : colors.border,
                                backgroundColor: cutDay === d ? colors.primaryLight : colors.surface,
                              },
                            ]}
                            onPress={() => setCutDay(d)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: cutDay === d ? '700' : '500',
                                color: cutDay === d ? colors.primary : colors.textPrimary,
                              }}
                            >
                              {d}th
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cycle due day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['05', '09', '12', '15', '20', '25', '28'].map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.dayChip,
                              {
                                borderColor: dueDay === d ? colors.primary : colors.border,
                                backgroundColor: dueDay === d ? colors.primaryLight : colors.surface,
                              },
                            ]}
                            onPress={() => setDueDay(d)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: dueDay === d ? '700' : '500',
                                color: dueDay === d ? colors.primary : colors.textPrimary,
                              }}
                            >
                              {d}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
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
                  <Text style={styles.saveBtnText}>Add card ✓</Text>
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
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  formCol: {
    flex: 1,
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
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
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
