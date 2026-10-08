import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Header } from '../../presentation/components/Header';
import { Card } from '../../presentation/components/Card';
import { Badge } from '../../presentation/components/Badge';
import { UpcomingEngine } from '../../core/engines/upcomingEngine';
import { ObligationType, RecurringObligation } from '../../core/types';
import { AddObligationModal } from './forms/AddObligationModal';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';
import { theme } from '../../presentation/theme';
import { safeFormatDate } from '../../core/utils/date';
import { formatRupee } from '../../core/utils/currency';


export const UpcomingPaymentsScreen: React.FC = () => {
  const {
    obligations,
    accounts,
    loading,
    refreshData,
    addObligation,
    removeObligation,
    payObligation,
  } = useFinanceData();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUBSCRIPTION' | 'EMI' | 'LOAN' | 'COMPLETED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [obToDelete, setObToDelete] = useState<RecurringObligation | null>(null);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const filteredObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (activeFilter === 'COMPLETED') return ob.status === 'COMPLETED';
      if (ob.status === 'COMPLETED') return false;
      if (activeFilter === 'ALL') return true;
      return ob.type === activeFilter;
    });
  }, [obligations, activeFilter]);

  const activeObligations = obligations.filter((o) => o.status !== 'COMPLETED');
  const totalMonthlyCommitment = activeObligations.reduce((sum, o) => sum + o.amount, 0);

  const handlePayClick = (ob: RecurringObligation) => {
    const accountName = accountMap.get(ob.linked_account_id) || 'Account';
    Alert.alert(
      'Confirm Monthly Payment',
      `Record payment of ₹${ob.amount.toFixed(2)} for ${ob.name}?\n\nThis will automatically debit ${accountName} and decrement the tenure schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            try {
              await payObligation(ob.id);
            } catch (err: any) {
              Alert.alert('Payment Error', err?.message || 'Could not record payment');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (ob: RecurringObligation) => {
    setObToDelete(ob);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Upcoming Payments"
        subtitle="Subscriptions, EMIs, & Loans tracker"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>New Payment</Text>
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
        {/* KPI Summary Tiles */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Monthly Outflow Commitment</Text>
            <Text style={styles.kpiVal}>
              {formatRupee(totalMonthlyCommitment, { decimals: 2 })}
            </Text>

            <Text style={styles.kpiSub}>Active monthly installments</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Active Contracts</Text>
            <Text style={[styles.kpiVal, { color: theme.colors.primary }]}>
              {activeObligations.length}
            </Text>
            <Text style={styles.kpiSub}>Recurring schedules</Text>
          </Card>
        </View>

        {/* Filter Switcher */}
        <View style={styles.filterBar}>
          {[
            { id: 'ALL' as const, label: 'All Active' },
            { id: 'SUBSCRIPTION' as const, label: 'Subscriptions' },
            { id: 'EMI' as const, label: 'EMIs' },
            { id: 'LOAN' as const, label: 'Loans' },
            { id: 'COMPLETED' as const, label: 'Completed' },
          ].map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, isSelected && styles.filterBtnActive]}
                onPress={() => setActiveFilter(f.id)}
              >
                <Text style={[styles.filterBtnText, isSelected && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List of Obligations */}
        {filteredObligations.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No obligations in this category</Text>
            <Text style={styles.emptySub}>Tap 'New Payment' to add an EMI, loan, or subscription</Text>
          </View>
        ) : (
          filteredObligations.map((ob) => {
            const isPaid = UpcomingEngine.isPaidThisMonth(ob.last_paid_date);
            const accountName = accountMap.get(ob.linked_account_id) || 'Account';
            const isLoan = ob.type === 'LOAN';
            const isEmi = ob.type === 'EMI';

            let typeBadgeVariant: 'info' | 'warning' | 'danger' = 'info';
            if (ob.type === 'EMI') typeBadgeVariant = 'warning';
            if (ob.type === 'LOAN') typeBadgeVariant = 'danger';

            return (
              <Card key={ob.id} style={styles.obCard}>
                <View style={styles.obHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.obName}>{ob.name}</Text>
                    <View style={styles.badgeRow}>
                      <Badge label={ob.type} variant={typeBadgeVariant} size="sm" />
                      <Text style={styles.dueDayText}>Due on Day {ob.due_day} of month</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountText}>
                      {formatRupee(ob.amount, { decimals: 2 })}
                    </Text>
                    <Text style={styles.amountSub}>per month</Text>
                  </View>

                </View>

                {/* Account binding & details */}
                <View style={styles.accountBindingRow}>
                  <Ionicons name="link-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.bindingText}>Paying via: {accountName}</Text>
                </View>

                {/* Loan & EMI Tenure Details */}
                {(isEmi || isLoan) && ob.total_tenure_months && (
                  <View style={styles.tenureContainer}>
                    <View style={styles.tenureHeader}>
                      <Text style={styles.tenureLabel}>Tenure Schedule</Text>
                      <Text style={styles.tenureProgressText}>
                        {ob.remaining_tenure_months} of {ob.total_tenure_months} months remaining
                      </Text>
                    </View>
                    <View style={styles.tenureTrack}>
                      <View
                        style={[
                          styles.tenureFill,
                          {
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                ((ob.total_tenure_months - (ob.remaining_tenure_months || 0)) /
                                  ob.total_tenure_months) *
                                  100
                              )
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Loan Interest Rate & Principal */}
                {isLoan && (
                  <View style={styles.loanMetricsRow}>
                    {ob.principal_amount && (
                      <Text style={styles.loanMetricText}>
                        Principal: {formatRupee(ob.principal_amount, { decimals: 0 })}
                      </Text>
                    )}

                    {ob.interest_rate !== null && (
                      <Text style={styles.loanMetricText}>
                        Interest: {ob.interest_rate}% APR
                      </Text>
                    )}
                  </View>
                )}

                {ob.notes && <Text style={styles.notesText}>{ob.notes}</Text>}

                {/* Footer with "Click Paid" and Delete actions */}
                <View style={styles.obFooter}>
                  {isPaid ? (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.paidBadgeText}>
                        Paid for this Month ({safeFormatDate(ob.last_paid_date)})
                      </Text>
                    </View>
                  ) : ob.status === 'COMPLETED' ? (
                    <View style={styles.paidBadge}>
                      <Ionicons name="trophy" size={16} color={theme.colors.primary} />
                      <Text style={[styles.paidBadgeText, { color: theme.colors.primary }]}>
                        Obligation Fully Completed
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.clickPaidBtn}
                      onPress={() => handlePayClick(ob)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                      <Text style={styles.clickPaidText}>Click Paid (Mark Month Settled)</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(ob)}>
                    <Ionicons name="trash-outline" size={15} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Obligation Modal */}
      <AddObligationModal
        visible={isAddModalOpen}
        accounts={accounts}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (input) => {
          await addObligation(input);
        }}
      />

      {/* In-App Delete Confirmation Modal */}
      {obToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setObToDelete(null)}
          onConfirm={async () => {
            await removeObligation(obToDelete.id);
            setObToDelete(null);
          }}
          title={`Remove ${obToDelete.name}?`}
          description="This will pause the recurring obligation and move it to past history."
          confirmButtonText="Remove"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
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
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginVertical: 4,
    color: theme.colors.textPrimary,
  },
  kpiSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  obCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  obHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  obName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDayText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
  },
  amountSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  accountBindingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 8,
  },
  bindingText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  tenureContainer: {
    marginVertical: 6,
  },
  tenureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tenureLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tenureProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  tenureTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  tenureFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  loanMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  loanMetricText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  obFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
    marginTop: 8,
  },
  clickPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  clickPaidText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
  },
  deleteIconBtn: {
    padding: 6,
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
