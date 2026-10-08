import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Header } from '../../presentation/components/Header';
import { Card } from '../../presentation/components/Card';
import { Badge } from '../../presentation/components/Badge';
import { DebtEngine } from '../../core/engines/debtEngine';
import { RepaymentModal } from './forms/RepaymentModal';
import { AddDebtModal } from './forms/AddDebtModal';
import { Debt } from '../../core/types';
import { theme } from '../../presentation/theme';
import { safeFormatDate } from '../../core/utils/date';
import { formatRupee } from '../../core/utils/currency';


export const DebtsScreen: React.FC = () => {
  const {
    debts,
    accounts,
    totalReceivables,
    totalPayables,
    loading,
    refreshData,
    addDebt,
    recordRepayment,
  } = useFinanceData();

  const [activeSegment, setActiveSegment] = useState<'ALL' | 'LENT' | 'BORROWED' | 'SETTLED'>('ALL');
  const [selectedDebtForRepay, setSelectedDebtForRepay] = useState<Debt | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (activeSegment === 'SETTLED') {
        return d.status === 'SETTLED';
      }
      if (d.status === 'SETTLED') {
        return false; // Active view excludes settled
      }
      if (activeSegment === 'LENT') {
        return d.direction === 'LENT';
      }
      if (activeSegment === 'BORROWED') {
        return d.direction === 'BORROWED';
      }
      return true;
    });
  }, [debts, activeSegment]);

  return (
    <View style={styles.container}>
      <Header
        title="P2P Debt & Loans"
        subtitle="Bilateral credit and liabilities"
        rightAction={
          <TouchableOpacity
            style={styles.newDebtBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newDebtBtnText}>New Obligation</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Summary Panels */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>To Collect (Lent)</Text>
              <Ionicons name="arrow-up-circle-outline" size={16} color={theme.colors.success} />
            </View>
            <Text style={[styles.kpiVal, { color: theme.colors.success }]}>
              {formatRupee(totalReceivables, { decimals: 2 })}
            </Text>
            <Text style={styles.kpiSub}>Assets due to you</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>To Repay (Borrowed)</Text>
              <Ionicons name="arrow-down-circle-outline" size={16} color={theme.colors.danger} />
            </View>
            <Text style={[styles.kpiVal, { color: theme.colors.danger }]}>
              {formatRupee(totalPayables, { decimals: 2 })}
            </Text>
            <Text style={styles.kpiSub}>Liabilities owed</Text>
          </Card>

        </View>

        {/* Segment Filter Switcher */}
        <View style={styles.segmentContainer}>
          {[
            { id: 'ALL' as const, label: 'Active All' },
            { id: 'LENT' as const, label: 'Lent' },
            { id: 'BORROWED' as const, label: 'Borrowed' },
            { id: 'SETTLED' as const, label: 'Settled' },
          ].map((seg) => {
            const isSelected = activeSegment === seg.id;
            return (
              <TouchableOpacity
                key={seg.id}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => setActiveSegment(seg.id)}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {seg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Counterparty Debt Cards */}
        {filteredDebts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="file-tray-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No obligations found in this view</Text>
            <Text style={styles.emptySub}>Tap '+ New Obligation' to record a bilateral loan</Text>
          </View>
        ) : (
          filteredDebts.map((debt) => {
            const urgency = DebtEngine.classifyUrgency(debt.due_date);
            const isLent = debt.direction === 'LENT';
            const dueFormatted = safeFormatDate(debt.due_date, 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            let urgencyColor = theme.colors.success;
            let urgencyBg = theme.colors.successBg;
            let urgencyLabel = 'Safe (> 3 Days)';

            if (urgency === 'APPROACHING') {
              urgencyColor = theme.colors.warning;
              urgencyBg = theme.colors.warningBg;
              urgencyLabel = 'Approaching (<= 3 Days)';
            } else if (urgency === 'OVERDUE') {
              urgencyColor = theme.colors.danger;
              urgencyBg = theme.colors.dangerBg;
              urgencyLabel = 'Overdue Alert';
            }

            return (
              <Card key={debt.id} style={styles.debtCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.counterpartyInfo}>
                    <Text style={styles.counterpartyName}>{debt.counterparty}</Text>
                    <View style={styles.directionRow}>
                      <Badge
                        label={isLent ? 'Lent (Receivable)' : 'Borrowed (Liability)'}
                        variant={isLent ? 'info' : 'danger'}
                        size="sm"
                      />
                      <Badge
                        label={urgencyLabel}
                        color={urgencyColor}
                        backgroundColor={urgencyBg}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.amountsRow}>
                  <View>
                    <Text style={styles.amountLabel}>Outstanding Balance</Text>
                    <Text style={styles.outstandingVal}>
                      {formatRupee(debt.outstanding_balance, { decimals: 2 })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabel}>Initial Principal</Text>
                    <Text style={styles.principalVal}>
                      {formatRupee(debt.principal_amount, { decimals: 2 })}
                    </Text>
                  </View>

                </View>

                {debt.notes && <Text style={styles.notesText}>{debt.notes}</Text>}

                <View style={styles.cardFooter}>
                  <View style={styles.dueWrap}>
                    <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.dueText}>Target Due: {dueFormatted}</Text>
                  </View>

                  {debt.outstanding_balance > 0 && (
                    <TouchableOpacity
                      style={styles.repayActionBtn}
                      onPress={() => setSelectedDebtForRepay(debt)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.repayActionText}>
                        {isLent ? 'Record Collection' : 'Record Repayment'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Repayment Modal */}
      <RepaymentModal
        visible={selectedDebtForRepay !== null}
        debt={selectedDebtForRepay}
        accounts={accounts}
        onClose={() => setSelectedDebtForRepay(null)}
        onSubmit={async (input) => {
          await recordRepayment(input);
        }}
      />

      {/* Add Debt Modal */}
      <AddDebtModal
        visible={isAddModalOpen}
        accounts={accounts}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (input) => {
          await addDebt(input);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  newDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  newDebtBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  kpiCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  debtCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  counterpartyInfo: {
    flex: 1,
  },
  counterpartyName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginVertical: 10,
  },
  amountLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  outstandingVal: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  principalVal: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
  },
  dueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  repayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  repayActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
