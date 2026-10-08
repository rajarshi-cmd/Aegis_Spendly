import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { InvestmentAsset } from '../../../core/types/investments';
import { Account } from '../../../core/types/accounts';
import { formatRupee } from '../../../core/utils/currency';

interface ExecuteSipModalProps {
  visible: boolean;
  sip: InvestmentAsset | null;
  bankAccounts: Account[];
  onClose: () => void;
  onConfirm: (sipId: string, debitAccountId: string) => Promise<void>;
}

export const ExecuteSipModal: React.FC<ExecuteSipModalProps> = ({
  visible,
  sip,
  bankAccounts,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sip) {
      // Default to linked account if available, else first bank account
      if (sip.linked_account_id && bankAccounts.some((b) => b.id === sip.linked_account_id)) {
        setSelectedAccountId(sip.linked_account_id);
      } else if (bankAccounts.length > 0) {
        setSelectedAccountId(bankAccounts[0].id);
      }
    }
  }, [sip, bankAccounts]);

  if (!sip) return null;

  const handleExecute = async () => {
    if (!selectedAccountId) return;
    try {
      setIsSubmitting(true);
      await onConfirm(sip.id, selectedAccountId);
      onClose();
    } catch (e) {
      console.error('Error executing SIP:', e);
    } finally {
      setIsSubmitting(false);
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
        <View style={[styles.dialogCard, { backgroundColor: colors.surface }]} pointerEvents="auto">
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="trending-up" size={20} color="#0F766E" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Execute Monthly SIP</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{sip.name}</Text>
            </View>
          </View>

          {/* Amount Box */}
          <View style={[styles.amountBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>SIP CONTRIBUTION AMOUNT</Text>
            <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
              {formatRupee(sip.monthly_sip_amount || 0)}
            </Text>
            <Text style={[styles.amountSub, { color: colors.primary }]}>
              Counted as wealth accumulation & savings, not spending.
            </Text>
          </View>

          {/* Account Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Debit from which bank account?
          </Text>

          <ScrollView style={styles.accountsList} showsVerticalScrollIndicator={false}>
            {bankAccounts.map((b) => {
              const isSelected = b.id === selectedAccountId;
              return (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => setSelectedAccountId(b.id)}
                  style={[
                    styles.accountOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      backgroundColor: isSelected ? '#F0FDF4' : colors.surface,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.bankIconBox, { backgroundColor: isSelected ? '#DCFCE7' : colors.background }]}>
                      <Ionicons name="business-outline" size={16} color={isSelected ? '#15803D' : colors.textSecondary} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.bankName, { color: colors.textPrimary, fontWeight: isSelected ? '700' : '600' }]}>
                        {b.name}
                      </Text>
                      <Text style={[styles.bankBalance, { color: colors.textMuted }]}>
                        Available: {formatRupee(b.balance)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.primary, opacity: isSubmitting || !selectedAccountId ? 0.6 : 1 },
              ]}
              onPress={handleExecute}
              disabled={isSubmitting || !selectedAccountId}
            >
              <Ionicons name="sparkles" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Recording...' : `Pay ${formatRupee(sip.monthly_sip_amount || 0)}`}
              </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  amountBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 2,
  },
  amountSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  accountsList: {
    maxHeight: 180,
    marginBottom: 20,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  bankIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 13,
  },
  bankBalance: {
    fontSize: 11,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
