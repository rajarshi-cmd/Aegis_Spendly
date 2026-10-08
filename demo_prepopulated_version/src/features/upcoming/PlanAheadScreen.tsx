import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee } from '../../core/utils/currency';
import { calculateTenureLeft, formatMonthShort, isDateInMonth } from '../../core/utils/date';
import { RecurringObligation } from '../../core/types/upcoming';
import { Transaction } from '../../core/types/transactions';
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
    transactions,
    obligations,
    pastCommitments,
    plannedBudgets,
    updatePlannedBudget,
    removePlannedBudget,
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
  const [isEditingBudgets, setIsEditingBudgets] = useState<boolean>(false);

  // DEF-012: Custom pay obligation state
  const [selectedObForCustomPay, setSelectedObForCustomPay] = useState<RecurringObligation | null>(null);
  const [customPayAmount, setCustomPayAmount] = useState<string>('');
  const [customPayError, setCustomPayError] = useState<string | null>(null);

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

  // Helper to identify Opening Balances (DEF-010)
  const isOpeningBalance = (t: Transaction) => {
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return cat === 'opening balance' || desc.includes('opening');
  };

  // DEF-012: Real used budget mapping calculated strictly from actual transactions!
  const usedBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    plannedBudgets.forEach((b) => {
      const bCat = (b.category || '').toLowerCase().trim();
      const sum = transactions
        .filter(
          (t) =>
            t.type === 'OUTFLOW' &&
            !isOpeningBalance(t) &&
            ((t.category || '').toLowerCase().trim() === bCat ||
              (t.description || '').toLowerCase().includes(bCat)) &&
            (!activeMonth || activeMonth.toLowerCase() === 'all months' || isDateInMonth(t.timestamp, activeMonth))
        )
        .reduce((s, t) => s + t.amount, 0);
      map[b.id] = sum;
      map[b.category] = sum;
    });
    return map;
  }, [plannedBudgets, transactions, activeMonth]);

  const totalUsedBudget = Object.values(usedBudgets).reduce((sum, v) => sum + v, 0);

  const handlePay = async (obId: string) => {
    try {
      await payObligation(obId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmCustomPay = async () => {
    if (!selectedObForCustomPay) return;
    const num = parseFloat(customPayAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) {
      setCustomPayError('Amount must be strictly greater than ₹0. 0 cannot be entered.');
      return;
    }
    setCustomPayError(null);
    try {
      await payObligation(selectedObForCustomPay.id, num);
      setSelectedObForCustomPay(null);
      setCustomPayAmount('');
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
            {formatRupee(Math.max(0, totalPlannedBudget - totalUsedBudget))} remaining in guardrails
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
                            {
                              color: isPaid
                                ? colors.successText
                                : isSkipped
                                ? colors.textMuted
                                : colors.warningText,
                            },
                          ]}
                        >
                          {isPaid ? 'Paid this cycle' : isSkipped ? 'Skipped this month' : 'Due this cycle'}
                        </Text>
                      </View>
                    </View>

                    {/* Action Bar */}
                    {isPaid ? (
                      <View style={[styles.obActionRow, { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.successText }}>
                            Logged in ledger
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => undoPayObligation(ob.id)}>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>Undo payment</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isSkipped ? (
                      <View style={[styles.obActionRow, { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 }]}>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>Skipped for this cycle</Text>
                        <TouchableOpacity onPress={() => undoSkipObligation(ob.id)}>
                          <Text style={{ fontSize: 12, color: colors.primary }}>Undo skip</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.obActionRow}>
                        <TouchableOpacity
                          style={styles.archiveActionBtn}
                          onPress={() => setObToDelete(ob)}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.skipBtn, { borderColor: colors.border }]}
                            onPress={() => skipObligation(ob.id)}
                          >
                            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
                          </TouchableOpacity>

                          {/* DEF-012: Pay with edited amount */}
                          <TouchableOpacity
                            style={[styles.customPayBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                            onPress={() => {
                              setSelectedObForCustomPay(ob);
                              setCustomPayAmount(ob.amount.toString());
                              setCustomPayError(null);
                            }}
                          >
                            <Text style={[styles.customPayBtnText, { color: colors.textSecondary }]}>Pay custom...</Text>
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
              })
            )}
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

        {/* Right Column: Spending Guardrails / Planned Budgets (DEF-012: Sliders & Editing) */}
        <View style={[styles.colCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.colHeader}>
            <View>
              <Text style={[styles.colMicro, { color: colors.textMuted }]}>SPENDING GUARDRAILS</Text>
              <Text style={[styles.colTitle, { color: colors.textPrimary }]}>Planned budgets</Text>
            </View>
            <TouchableOpacity onPress={() => setIsEditingBudgets(!isEditingBudgets)}>
              <Text style={[styles.editLink, { color: colors.primary, fontWeight: '700' }]}>
                {isEditingBudgets ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.budgetList}>
            {plannedBudgets.map((b) => {
              const used = usedBudgets[b.id] ?? usedBudgets[b.category] ?? 0;
              const pct = b.planned_amount > 0 ? Math.min(100, Math.round((used / b.planned_amount) * 100)) : 0;
              const isOver = pct > 90;

              return (
                <View key={b.id} style={styles.budgetItem}>
                  <View style={styles.budgetTopRow}>
                    {isEditingBudgets ? (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                        <TextInput
                          style={[
                            styles.budgetNameInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          value={b.category}
                          onChangeText={(txt) => updatePlannedBudget(b.id, { category: txt })}
                          placeholder="Budget name..."
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    ) : (
                      <Text style={[styles.budgetName, { color: colors.textPrimary }]}>{b.category}</Text>
                    )}
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

                  {/* Interactive Slider / Stepper Controls & Delete when Editing */}
                  {isEditingBudgets && (
                    <View style={styles.budgetSliderRow}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                        onPress={() => updatePlannedBudget(b.id, Math.max(500, b.planned_amount - 500))}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>- ₹500</Text>
                      </TouchableOpacity>

                      <View style={[styles.budgetAmountBox, { borderColor: colors.border }]}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginRight: 2 }}>₹</Text>
                        <TextInput
                          style={[styles.budgetAmountInput, { color: colors.textPrimary }]}
                          keyboardType="numeric"
                          value={b.planned_amount.toString()}
                          onChangeText={(txt) => {
                            const val = parseFloat(txt.replace(/[^0-9]/g, ''));
                            if (!isNaN(val)) updatePlannedBudget(b.id, val);
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                        onPress={() => updatePlannedBudget(b.id, b.planned_amount + 500)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>+ ₹500</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.deleteBudgetBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                        onPress={() => removePlannedBudget(b.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  )}
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

      {/* DEF-012: Pay With Custom Amount Modal */}
      {selectedObForCustomPay && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedObForCustomPay(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.dialogCard, { backgroundColor: colors.surface }]}>
              <View style={styles.dialogHeader}>
                <View style={[styles.dialogIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="cash-outline" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
                    Pay {selectedObForCustomPay.name}
                  </Text>
                  <Text style={[styles.dialogSub, { color: colors.textMuted }]}>
                    Default amount is {formatRupee(selectedObForCustomPay.amount)}. Enter the exact amount paid.
                  </Text>
                </View>
              </View>

              <View style={{ marginVertical: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount Paid *</Text>
                <View style={[styles.currencyInputWrap, { borderColor: customPayError ? colors.danger : colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                  <TextInput
                    style={[styles.currencyInput, { color: colors.textPrimary }]}
                    keyboardType="numeric"
                    value={customPayAmount}
                    onChangeText={(txt) => {
                      setCustomPayAmount(txt);
                      setCustomPayError(null);
                    }}
                    autoFocus
                  />
                </View>
                {customPayError && (
                  <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6, fontWeight: '600' }}>
                    {customPayError}
                  </Text>
                )}
              </View>

              <View style={styles.dialogFooter}>
                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { backgroundColor: colors.background }]}
                  onPress={() => setSelectedObForCustomPay(null)}
                >
                  <Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogConfirmBtn, { backgroundColor: colors.primary }]}
                  onPress={handleConfirmCustomPay}
                >
                  <Text style={styles.dialogConfirmText}>Confirm & Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  budgetActionText: {
    fontSize: 13,
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 4,
  },
  alertCard: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
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
  },
  twoColRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colMicro: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  colTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  sealMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  sealMonthBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  obligationsList: {
    gap: 12,
  },
  emptyObligationsBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyObligationsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyObligationsSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  obCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  obTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  obIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obName: {
    fontSize: 14,
    fontWeight: '700',
  },
  obNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  tenureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tenureTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D28D9',
  },
  obDueDate: {
    fontSize: 11,
  },
  obAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  obStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  obActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  archiveActionBtn: {
    padding: 6,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customPayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  customPayBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paidBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  paidBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  dashedBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editLink: {
    fontSize: 13,
  },
  budgetList: {
    gap: 16,
  },
  budgetItem: {
    gap: 6,
  },
  budgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetValues: {
    fontSize: 12,
  },
  budgetTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  budgetAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flex: 1,
  },
  budgetAmountInput: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    padding: 0,
  },
  budgetNameInput: {
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flex: 1,
  },
  deleteBudgetBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dialogSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
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
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dialogConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  dialogConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
