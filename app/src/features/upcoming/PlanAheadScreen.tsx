import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee } from '../../core/utils/currency';
import { calculateTenureLeft, formatMonthShort } from '../../core/utils/date';
import { RecurringObligation } from '../../core/types/upcoming';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';

interface PlanAheadScreenProps {
  onOpenAddPlan: () => void;
  onOpenAddBudget: () => void;
}

export const PlanAheadScreen: React.FC<PlanAheadScreenProps> = ({
  onOpenAddPlan,
  onOpenAddBudget,
}) => {
  const { colors } = useTheme();
  const {
    obligations,
    pastCommitments,
    plannedBudgets,
    payObligation,
    undoPayObligation,
    skipObligation,
    undoSkipObligation,
    paidObligationIds,
    skippedObligationIds,
    isMonthSealed,
    sealMonth,
    unsealMonth,
    removeObligation,
    restoreCommitment,
    permanentDeleteCommitment,
    activeMonth,
  } = useFinanceData();

  const [obToDelete, setObToDelete] = useState<RecurringObligation | null>(null);
  const [showSealModal, setShowSealModal] = useState<boolean>(false);

  const activeMonthShort = formatMonthShort(activeMonth || 'October 2026');

  // Filter obligations based on tenure left relative to activeMonth and created_at
  const visibleObligations = useMemo(() => {
    return obligations.filter((ob) => {
      const { isActive } = calculateTenureLeft(
        ob.created_at,
        activeMonth,
        ob.total_tenure_months,
        ob.remaining_tenure_months
      );
      return isActive;
    });
  }, [obligations, activeMonth]);

  const totalCommitted = visibleObligations.reduce((sum, o) => sum + o.amount, 0);
  const totalPlannedBudget = plannedBudgets.reduce((sum, b) => sum + b.planned_amount, 0);

  // Mock used budget mapping for demo
  const mockUsedBudgets: Record<string, number> = {
    'Food & drinks': 5140,
    Home: 4220,
    Transport: 2940,
    Shopping: 3480,
    Entertainment: 920,
  };

  const handlePay = async (obId: string) => {
    try {
      await payObligation(obId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local budget & upcoming planning — plans stay on your device and become ledger movements only when paid.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.microTag, { color: colors.textMuted }]}>PLANNING CYCLE • {(activeMonth || 'UPCOMING').toUpperCase()}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Plan before it happens</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Edit, close, or confirm every commitment as it comes due.
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.budgetActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onOpenAddBudget}
          >
            <Ionicons name="add" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.budgetActionText, { color: colors.textSecondary }]}>Add budget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addCommitmentBtn, { backgroundColor: colors.primary }]}
            onPress={onOpenAddPlan}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addCommitmentText}>Add subscription, EMI or SIP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Summary Cards */}
      <View style={styles.kpiRow}>
        {/* Committed This Cycle */}
        <View style={[styles.kpiCard, { backgroundColor: colors.cardMint, borderColor: colors.cardMintBorder }]}>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>COMMITTED IN {(activeMonth || 'THIS CYCLE').toUpperCase()}</Text>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{formatRupee(totalCommitted)}</Text>
          <Text style={[styles.kpiSub, { color: colors.successText }]}>{visibleObligations.length} active recurring items</Text>
        </View>

        {/* Planned Category Budget */}
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>PLANNED CATEGORY BUDGET</Text>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{formatRupee(totalPlannedBudget)}</Text>
          <Text style={[styles.kpiSub, { color: colors.textMuted }]}>
            {formatRupee(Math.max(0, totalPlannedBudget - 24600))} still available
          </Text>
        </View>

        {/* Payment check-ins stay visible alert card */}
        <View style={[styles.alertCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="notifications-outline" size={18} color="#B45309" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Payment check ins stay visible.</Text>
            <Text style={styles.alertDesc}>
              Unpaid commitments keep reminding on their due date until you confirm paid or skip this month.
            </Text>
          </View>
        </View>
      </View>

      {/* Two-Column Layout: Commitments vs Guardrails */}
      <View style={styles.twoColRow}>
        {/* Left Column: Fixed Commitments */}
        <View style={[styles.colCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1.3 }]}>
          <View style={styles.colHeader}>
            <View>
              <Text style={[styles.colMicro, { color: colors.textMuted }]}>FIXED COMMITMENTS</Text>
              <Text style={[styles.colTitle, { color: colors.textPrimary }]}>Subscriptions, EMIs & SIPs</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Seal Month Button */}
              <TouchableOpacity
                style={[
                  styles.sealMonthBtn,
                  isMonthSealed
                    ? { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (isMonthSealed) {
                    unsealMonth();
                  } else {
                    setShowSealModal(true);
                  }
                }}
              >
                <Ionicons
                  name={isMonthSealed ? 'lock-closed' : 'lock-open-outline'}
                  size={13}
                  color={isMonthSealed ? '#B45309' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.sealMonthBtnText,
                    { color: isMonthSealed ? '#B45309' : colors.textSecondary },
                  ]}
                >
                  {isMonthSealed ? 'Month Sealed' : 'Seal this month'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.activePill, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.activePillText, { color: colors.primary }]}>{visibleObligations.length} active</Text>
              </View>
            </View>
          </View>

          {/* Obligations List */}
          <View style={styles.obligationsList}>
            {visibleObligations.length === 0 ? (
              <View style={styles.emptyObligationsBox}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyObligationsTitle, { color: colors.textPrimary }]}>
                  No active commitments for {activeMonth}
                </Text>
                <Text style={[styles.emptyObligationsSub, { color: colors.textMuted }]}>
                  Upcoming payments and EMIs only show during their active tenure from their creation date.
                </Text>
              </View>
            ) : (
              visibleObligations.map((ob) => {
                const dueDayFormatted = ob.due_day.toString().padStart(2, '0');
                const isPaid = paidObligationIds[ob.id];
                const isSkipped = skippedObligationIds[ob.id];
                const tenureInfo = calculateTenureLeft(
                  ob.created_at,
                  activeMonth,
                  ob.total_tenure_months,
                  ob.remaining_tenure_months
                );

                return (
                  <View key={ob.id} style={[styles.obCard, { borderColor: colors.borderSubtle }]}>
                    {/* Top Details */}
                    <View style={styles.obTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.obIconBox, { backgroundColor: '#F1F5F9' }]}>
                          <Ionicons
                            name={
                              ob.type === 'SUBSCRIPTION'
                                ? 'repeat-outline'
                                : ob.type === 'EMI'
                                ? 'business-outline'
                                : 'trending-up-outline'
                            }
                            size={16}
                            color={colors.textSecondary}
                          />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={[styles.obName, { color: colors.textPrimary }]}>{ob.name}</Text>
                          <Text style={[styles.obNotes, { color: colors.textMuted }]}>{ob.notes || ob.category}</Text>
                          {ob.total_tenure_months && tenureInfo.tenureLeft !== null ? (
                            <View style={styles.tenureTag}>
                              <Ionicons name="hourglass-outline" size={10} color="#6D28D9" style={{ marginRight: 3 }} />
                              <Text style={styles.tenureTagText}>
                                {tenureInfo.tenureLeft} of {ob.total_tenure_months} mo remaining
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={[styles.obDueDate, { color: colors.textMuted }]}>Due {dueDayFormatted} {activeMonthShort}</Text>
                        <Text style={[styles.obAmount, { color: colors.textPrimary }]}>{formatRupee(ob.amount)}</Text>
                        <Text
                          style={[
                            styles.obStatusLabel,
                            { color: isPaid ? colors.successText : isSkipped ? colors.textMuted : '#B45309' },
                          ]}
                        >
                          {isPaid ? 'Paid' : isSkipped ? 'Skipped' : 'Awaiting confirmation'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setObToDelete(ob)}
                        style={{ marginLeft: 10, padding: 4 }}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                  {/* Paid Confirmed Strip */}
                  {isPaid ? (
                    <View style={[styles.paidConfirmedStrip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
                        <Text style={[styles.paidConfirmedText, { color: '#065F46' }]}>
                          Payment confirmed for this cycle ✓
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.undoBtn, { borderColor: '#A7F3D0', backgroundColor: '#FFFFFF' }]}
                        onPress={() => undoPayObligation(ob.id)}
                      >
                        <Text style={[styles.undoBtnText, { color: '#065F46' }]}>Undo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : isSkipped ? (
                    /* Skipped Strip with Undo */
                    <View style={[styles.skippedStrip, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="play-forward-outline" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.skippedText, { color: colors.textMuted }]}>
                          Skipped for this cycle
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.undoBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
                        onPress={() => undoSkipObligation(ob.id)}
                      >
                        <Text style={[styles.undoBtnText, { color: colors.textSecondary }]}>Undo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Interactive Check-In Prompt Strip */
                      <View style={[styles.checkInStrip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="notifications" size={13} color="#B45309" style={{ marginRight: 6 }} />
                          <Text style={styles.checkInText}>Payment due {dueDayFormatted} {activeMonthShort}. Paid?</Text>
                        </View>

                      <View style={styles.checkInButtons}>
                        <TouchableOpacity
                          style={[styles.skipBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          onPress={() => skipObligation(ob.id)}
                        >
                          <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip this month</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.paidBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                          onPress={() => handlePay(ob.id)}
                        >
                          <Text style={[styles.paidBtnText, { color: '#FFFFFF' }]}>Yes, paid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            }))}
          </View>

          {/* Dashed Add Commitment Button */}
          <TouchableOpacity
            style={[styles.dashedBtn, { borderColor: colors.border }]}
            onPress={onOpenAddPlan}
          >
            <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.dashedBtnText, { color: colors.primary }]}>Add a recurring commitment</Text>
          </TouchableOpacity>
        </View>

        {/* Right Column: Spending Guardrails / Planned Budgets */}
        <View style={[styles.colCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.colHeader}>
            <View>
              <Text style={[styles.colMicro, { color: colors.textMuted }]}>SPENDING GUARDRAILS</Text>
              <Text style={[styles.colTitle, { color: colors.textPrimary }]}>Planned budgets</Text>
            </View>
            <TouchableOpacity onPress={onOpenAddBudget}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.budgetList}>
            {plannedBudgets.map((b) => {
              const used = mockUsedBudgets[b.category] || 0;
              const pct = Math.min(100, Math.round((used / b.planned_amount) * 100));
              const isOver = pct > 90;
              return (
                <View key={b.id} style={styles.budgetItem}>
                  <View style={styles.budgetTopRow}>
                    <Text style={[styles.budgetName, { color: colors.textPrimary }]}>{b.category}</Text>
                    <Text style={[styles.budgetValues, { color: colors.textSecondary }]}>
                      {formatRupee(used)} / {formatRupee(b.planned_amount)}
                    </Text>
                  </View>

                  <View style={[styles.budgetTrack, { backgroundColor: colors.borderSubtle }]}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isOver ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.dashedBtn, { borderColor: colors.border }]}
            onPress={onOpenAddBudget}
          >
            <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.dashedBtnText, { color: colors.primary }]}>Set category budget</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Universal Delete Confirmation Modal for Obligations */}
      {obToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setObToDelete(null)}
          onConfirm={async () => {
            await removeObligation(obToDelete.id);
            setObToDelete(null);
          }}
          title={`Remove ${obToDelete.name}?`}
          description="Are you sure you want to remove this recurring commitment? It will be archived in your commitment recovery shelf."
          confirmButtonText="Remove commitment"
        />
      )}

      {/* Seal Month Confirmation Modal */}
      <DeleteModal
        visible={showSealModal}
        onClose={() => setShowSealModal(false)}
        onConfirm={() => {
          sealMonth();
          setShowSealModal(false);
        }}
        title="Seal this month?"
        description="All remaining unpaid subscriptions and EMIs for this cycle will default to skipped. You can unseal and reopen anytime."
        confirmButtonText="Seal month"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  demoBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  microTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  budgetActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addCommitmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addCommitmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  alertCard: {
    flex: 1.4,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  alertDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  colCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    minWidth: 320,
  },
  colHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  colMicro: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  colTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sealMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sealMonthBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  obligationsList: {
    gap: 12,
    marginBottom: 16,
  },
  obCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  obTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  obIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obName: {
    fontSize: 13,
    fontWeight: '700',
  },
  obNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  obDueDate: {
    fontSize: 11,
  },
  obAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  obStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  paidConfirmedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  paidConfirmedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skippedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  skippedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  undoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  undoBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkInStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  checkInText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  checkInButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  paidBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dashedBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetList: {
    gap: 14,
    marginBottom: 16,
  },
  budgetItem: {
    gap: 6,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetValues: {
    fontSize: 12,
  },
  budgetTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 3,
  },
  tenureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tenureTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
  },
  emptyObligationsBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyObligationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyObligationsSub: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
});
