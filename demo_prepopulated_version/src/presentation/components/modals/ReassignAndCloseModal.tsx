import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Account } from '../../../core/types/accounts';
import { RecurringObligation } from '../../../core/types/upcoming';
import { InvestmentAsset } from '../../../core/types/investments';
import { formatRupee } from '../../../core/utils/currency';

interface ReassignAndCloseModalProps {
  visible: boolean;
  account: Account | null;
  linkedObligations: RecurringObligation[];
  linkedSips: InvestmentAsset[];
  availableAccounts: Account[];
  onClose: () => void;
  onConfirmReassign: (reassignments: Record<string, string>) => Promise<void>;
  onOpenAddCard: () => void;
  onOpenAddBank: () => void;
}

export const ReassignAndCloseModal: React.FC<ReassignAndCloseModalProps> = ({
  visible,
  account,
  linkedObligations,
  linkedSips,
  availableAccounts,
  onClose,
  onConfirmReassign,
  onOpenAddCard,
  onOpenAddBank,
}) => {
  const { colors } = useTheme();

  // Map of commitmentId -> newAccountId
  const [reassignments, setReassignments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize reassignments to the first available account
  useEffect(() => {
    if (availableAccounts.length > 0) {
      const initial: Record<string, string> = {};
      const defaultId = availableAccounts[0].id;
      linkedObligations.forEach((ob) => {
        initial[ob.id] = defaultId;
      });
      linkedSips.forEach((sip) => {
        // Prefer a bank account for SIP if available
        const defaultBank = availableAccounts.find((a) => a.type === 'BANK_DEPOSIT') || availableAccounts[0];
        initial[sip.id] = defaultBank.id;
      });
      setReassignments(initial);
    }
  }, [linkedObligations, linkedSips, availableAccounts]);

  if (!account) return null;

  const totalLinked = linkedObligations.length + linkedSips.length;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirmReassign(reassignments);
      onClose();
    } catch (e) {
      console.error('Failed to reassign commitments:', e);
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
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="git-branch-outline" size={22} color="#B45309" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Reassign Linked Commitments</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Closing {account.name} requires reassigning {totalLinked} active payment{totalLinked > 1 ? 's' : ''}.
              </Text>
            </View>
          </View>

          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Choose which active card or bank account will take over each recurring installment before closing this account.
          </Text>

          {/* Quick Add Buttons */}
          <View style={styles.quickAddRow}>
            <TouchableOpacity
              style={[styles.quickAddBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}
              onPress={onOpenAddCard}
            >
              <Ionicons name="card-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.quickAddText, { color: colors.primary }]}>+ Add new card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAddBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}
              onPress={onOpenAddBank}
            >
              <Ionicons name="business-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.quickAddText, { color: colors.primary }]}>+ Add new bank</Text>
            </TouchableOpacity>
          </View>

          {/* Linked Items List */}
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {/* Obligations */}
            {linkedObligations.map((ob) => {
              const selectedTarget = reassignments[ob.id] || (availableAccounts[0]?.id ?? '');
              return (
                <View
                  key={ob.id}
                  style={[styles.itemCard, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}
                >
                  <View style={styles.itemTopRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor:
                                ob.type === 'EMI' ? '#FEF3C7' : ob.type === 'SUBSCRIPTION' ? '#EDE9FE' : '#DBEAFE',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  ob.type === 'EMI' ? '#B45309' : ob.type === 'SUBSCRIPTION' ? '#6D28D9' : '#1E40AF',
                              },
                            ]}
                          >
                            {ob.type}
                          </Text>
                        </View>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{ob.name}</Text>
                      </View>
                      <Text style={[styles.itemAmount, { color: colors.textSecondary }]}>
                        {formatRupee(ob.amount)} / month • Due on {ob.due_day}th
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>REASSIGN DEBITS TO:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.targetsScroll}>
                    <View style={styles.targetsRow}>
                      {availableAccounts.map((targetAcc) => {
                        const isChosen = targetAcc.id === selectedTarget;
                        return (
                          <TouchableOpacity
                            key={targetAcc.id}
                            onPress={() =>
                              setReassignments((prev) => ({ ...prev, [ob.id]: targetAcc.id }))
                            }
                            style={[
                              styles.targetChip,
                              {
                                borderColor: isChosen ? colors.primary : colors.border,
                                backgroundColor: isChosen ? colors.primaryLight : colors.surface,
                              },
                            ]}
                          >
                            <Ionicons
                              name={targetAcc.type === 'CREDIT_CARD' ? 'card-outline' : 'business-outline'}
                              size={12}
                              color={isChosen ? colors.primary : colors.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.targetChipText,
                                {
                                  color: isChosen ? colors.primary : colors.textPrimary,
                                  fontWeight: isChosen ? '700' : '500',
                                },
                              ]}
                            >
                              {targetAcc.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              );
            })}

            {/* SIPs */}
            {linkedSips.map((sip) => {
              const selectedTarget = reassignments[sip.id] || (availableAccounts[0]?.id ?? '');
              return (
                <View
                  key={sip.id}
                  style={[styles.itemCard, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}
                >
                  <View style={styles.itemTopRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.badge, { backgroundColor: '#CCFBF1' }]}>
                          <Text style={[styles.badgeText, { color: '#0F766E' }]}>SIP</Text>
                        </View>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{sip.name}</Text>
                      </View>
                      <Text style={[styles.itemAmount, { color: colors.textSecondary }]}>
                        {formatRupee(sip.monthly_sip_amount || 0)} / month • Due on {sip.sip_due_day || 5}th
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>REASSIGN DEBITS TO:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.targetsScroll}>
                    <View style={styles.targetsRow}>
                      {availableAccounts.map((targetAcc) => {
                        const isChosen = targetAcc.id === selectedTarget;
                        return (
                          <TouchableOpacity
                            key={targetAcc.id}
                            onPress={() =>
                              setReassignments((prev) => ({ ...prev, [sip.id]: targetAcc.id }))
                            }
                            style={[
                              styles.targetChip,
                              {
                                borderColor: isChosen ? colors.primary : colors.border,
                                backgroundColor: isChosen ? colors.primaryLight : colors.surface,
                              },
                            ]}
                          >
                            <Ionicons
                              name={targetAcc.type === 'CREDIT_CARD' ? 'card-outline' : 'business-outline'}
                              size={12}
                              color={isChosen ? colors.primary : colors.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.targetChipText,
                                {
                                  color: isChosen ? colors.primary : colors.textPrimary,
                                  fontWeight: isChosen ? '700' : '500',
                                },
                              ]}
                            >
                              {targetAcc.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#B91C1C', opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Processing...' : 'Reassign & Close Account'}
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
    maxWidth: 500,
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
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsList: {
    maxHeight: 280,
    marginBottom: 20,
  },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  selectorLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  targetsScroll: {
    flexDirection: 'row',
  },
  targetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  targetChipText: {
    fontSize: 11,
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
