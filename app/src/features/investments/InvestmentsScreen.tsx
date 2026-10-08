import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { formatRupee } from '../../core/utils/currency';
import { calculateTenureLeft, formatMonthShort } from '../../core/utils/date';
import { InvestmentAsset } from '../../core/types/investments';
import { ExecuteSipModal } from '../../presentation/components/modals/ExecuteSipModal';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';

interface InvestmentsScreenProps {
  onOpenPlanSip: () => void;
  onOpenRecordContribution: () => void;
}

export const InvestmentsScreen: React.FC<InvestmentsScreenProps> = ({
  onOpenPlanSip,
  onOpenRecordContribution,
}) => {
  const { colors } = useTheme();
  const {
    investments,
    accounts,
    portfolioMetrics,
    executeSip,
    undoExecuteSip,
    skipSip,
    undoSkipSip,
    executedSipIds,
    skippedSipIds,
    removeInvestment,
    activeMonth,
  } = useFinanceData();

  const [sipToExecute, setSipToExecute] = useState<InvestmentAsset | null>(null);
  const [invToDelete, setInvToDelete] = useState<InvestmentAsset | null>(null);

  const activeMonthShort = formatMonthShort(activeMonth || 'October 2026');

  const sipPlans = useMemo(() => {
    return investments
      .filter((i) => i.type === 'SIP')
      .filter((i) => {
        const { isActive } = calculateTenureLeft(i.created_at, activeMonth, null, null);
        return isActive;
      });
  }, [investments, activeMonth]);

  const otherInvestments = investments.filter((i) => i.type !== 'SIP');

  const totalMonthlySip = sipPlans.reduce((sum, s) => sum + (s.monthly_sip_amount || 0), 0);
  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local savings lane — assets and SIPs are tracked as savings and wealth accumulation, not consumption expenses.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Header Row */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.microTag, { color: colors.textMuted }]}>SAVINGS LANE • SEPARATE FROM EXPENSES</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Investments</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Track mutual funds, stocks, and SIPs as savings—not spending.
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.recordBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onOpenRecordContribution}
          >
            <Ionicons name="add" size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.recordBtnText, { color: colors.textSecondary }]}>Record investment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.planSipBtn, { backgroundColor: colors.primary }]} onPress={onOpenPlanSip}>
            <Ionicons name="trending-up-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.planSipBtnText}>Plan a SIP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: colors.cardMint, borderColor: colors.cardMintBorder }]}>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>INVESTED THIS MONTH</Text>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{formatRupee(portfolioMetrics.totalInvested)}</Text>
          <Text style={[styles.kpiSub, { color: colors.successText }]}>Excluded from expense totals</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>PLANNED SIPS</Text>
          <Text style={[styles.kpiAmount, { color: colors.textPrimary }]}>{formatRupee(totalMonthlySip)}</Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>{sipPlans.length} monthly plans</Text>
        </View>

        <View style={[styles.futureCard, { backgroundColor: colors.cardIce, borderColor: colors.cardIceBorder }]}>
          <Ionicons name="trending-up" size={18} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.futureTitle, { color: colors.textPrimary }]}>Pay your future self first.</Text>
            <Text style={[styles.futureDesc, { color: colors.textSecondary }]}>
              Investment contributions are shown here and counted as savings.
            </Text>
          </View>
        </View>
      </View>

      {/* Two Columns: Recurring Plans vs Actual Contributions */}
      <View style={styles.twoColRow}>
        {/* Left Column: Recurring Plans (SIPs) */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.colMicro, { color: colors.textMuted }]}>RECURRING PLANS</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>SIPs</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.background }]}>
              <Text style={[styles.badgeText, { color: colors.textMuted }]}>{sipPlans.length} planned</Text>
            </View>
          </View>

          {sipPlans.length > 0 ? (
            <View style={styles.itemsList}>
              {sipPlans.map((sip) => {
                const isExecuted = executedSipIds[sip.id];
                const isSkipped = skippedSipIds[sip.id];

                return (
                  <View key={sip.id} style={[styles.sipItemCard, { borderColor: colors.borderSubtle }]}>
                    <View style={styles.sipItemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sipName, { color: colors.textPrimary }]}>{sip.name}</Text>
                        <Text style={[styles.sipNotes, { color: colors.textMuted }]}>{sip.notes || 'Monthly SIP'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={[styles.sipAmt, { color: colors.textPrimary }]}>
                          {formatRupee(sip.monthly_sip_amount || 0)} / mo
                        </Text>
                        <Text style={[styles.sipDay, { color: colors.textMuted }]}>Due {sip.sip_due_day || 5}th</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setInvToDelete(sip)}
                        style={{ marginLeft: 8, padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Status / Action Row */}
                    <View style={[styles.sipItemBottom, { borderTopColor: colors.borderSubtle }]}>
                      <Text style={[styles.sipValuation, { color: colors.textSecondary }]}>
                        Portfolio value: {formatRupee(sip.current_value)}
                      </Text>

                      {isExecuted ? (
                        <View style={styles.confirmedRow}>
                          <View style={[styles.confirmedBadge, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={13} color="#15803D" style={{ marginRight: 4 }} />
                            <Text style={styles.confirmedBadgeText}>Executed for {activeMonthShort} ✓</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.undoBtn, { borderColor: colors.border }]}
                            onPress={() => undoExecuteSip(sip.id)}
                          >
                            <Text style={[styles.undoBtnText, { color: colors.textSecondary }]}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      ) : isSkipped ? (
                        <View style={styles.confirmedRow}>
                          <View style={[styles.skippedBadge, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="play-forward-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={[styles.skippedBadgeText, { color: colors.textMuted }]}>Skipped this month</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.undoBtn, { borderColor: colors.border }]}
                            onPress={() => undoSkipSip(sip.id)}
                          >
                            <Text style={[styles.undoBtnText, { color: colors.textSecondary }]}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.pendingActionRow}>
                          <TouchableOpacity
                            style={[styles.skipBtn, { borderColor: colors.border }]}
                            onPress={() => skipSip(sip.id)}
                          >
                            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip this month</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.executeBtn, { backgroundColor: colors.primary }]}
                            onPress={() => setSipToExecute(sip)}
                          >
                            <Ionicons name="flash-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.executeBtnText}>Execute SIP</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.background }]}>
                <Ionicons name="cash-outline" size={24} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>
                No SIPs yet. Add a mutual fund or stock plan for the upcoming month.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionDashedBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={onOpenPlanSip}
          >
            <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.actionDashedText, { color: colors.primary }]}>Add mutual fund or stock SIP</Text>
          </TouchableOpacity>
        </View>

        {/* Right Column: Actual Contributions */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, flex: 1 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={[styles.colMicro, { color: colors.textMuted }]}>ACTUAL CONTRIBUTIONS</Text>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Investment activity</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.background }]}>
              <Text style={[styles.badgeText, { color: colors.textMuted }]}>{otherInvestments.length} entries</Text>
            </View>
          </View>

          {otherInvestments.length > 0 ? (
            <View style={styles.itemsList}>
              {otherInvestments.map((inv) => (
                <View key={inv.id} style={[styles.sipItemCard, { borderColor: colors.borderSubtle }]}>
                  <View style={styles.sipItemTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sipName, { color: colors.textPrimary }]}>{inv.name}</Text>
                      <Text style={[styles.sipNotes, { color: colors.textMuted }]}>{inv.type} Asset</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      <Text style={[styles.sipAmt, { color: colors.textPrimary }]}>
                        {formatRupee(inv.invested_amount)}
                      </Text>
                      <Text style={[styles.sipDay, { color: colors.successText }]}>
                        Current: {formatRupee(inv.current_value)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setInvToDelete(inv)}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.background }]}>
                <Ionicons name="cash-outline" size={24} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>
                Investment entries you add from Spendings will appear here.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionDashedBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={onOpenRecordContribution}
          >
            <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.actionDashedText, { color: colors.primary }]}>Record an investment contribution</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Execute SIP Modal with Bank Account Selector */}
      <ExecuteSipModal
        visible={sipToExecute !== null}
        sip={sipToExecute}
        bankAccounts={bankAccounts}
        onClose={() => setSipToExecute(null)}
        onConfirm={async (sipId, debitAccountId) => {
          await executeSip(sipId, debitAccountId);
        }}
      />

      {/* Universal Delete Confirmation Modal */}
      {invToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setInvToDelete(null)}
          onConfirm={async () => {
            await removeInvestment(invToDelete.id);
            setInvToDelete(null);
          }}
          title={`Delete ${invToDelete.name}?`}
          description="Are you sure you want to delete this investment asset? Historical balances will be removed."
          confirmButtonText="Delete Asset"
        />
      )}
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
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  recordBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planSipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  planSipBtnText: {
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
  futureCard: {
    flex: 1.4,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  futureTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  futureDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  panelCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    minWidth: 320,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  colMicro: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  sipItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sipItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sipName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sipNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  sipAmt: {
    fontSize: 14,
    fontWeight: '800',
  },
  sipDay: {
    fontSize: 11,
    marginTop: 2,
  },
  sipItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  sipValuation: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skippedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  pendingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  executeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMsg: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  actionDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  actionDashedText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
