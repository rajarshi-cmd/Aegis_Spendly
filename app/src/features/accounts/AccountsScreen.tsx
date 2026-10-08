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
import { CreditMonitor } from '../../core/engines/creditMonitor';
import { Account, AccountType } from '../../core/types';
import { EditAccountModal } from './forms/EditAccountModal';
import { AddAccountModal } from '../dashboard/forms/AddAccountModal';
import { theme } from '../../presentation/theme';
import { safeFormatDate } from '../../core/utils/date';
import { formatRupee } from '../../core/utils/currency';


export const AccountsScreen: React.FC = () => {
  const {
    accounts,
    transactions,
    obligations,
    loading,
    refreshData,
    addAccount,
    editAccount,
    removeAccount,
  } = useFinanceData();

  const [activeSegment, setActiveSegment] = useState<'ALL' | 'BANK' | 'CARD'>('ALL');
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (activeSegment === 'BANK') return acc.type === 'BANK_DEPOSIT';
      if (activeSegment === 'CARD') return acc.type === 'CREDIT_CARD';
      return true;
    });
  }, [accounts, activeSegment]);

  const toggleExpand = (id: string) => {
    setExpandedAccountId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Accounts & Cards"
        subtitle="Manage limits, billing cycles, & individual ledgers"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Node</Text>
          </TouchableOpacity>
        }
      />

      {/* Segment switcher */}
      <View style={styles.segmentContainer}>
        {[
          { id: 'ALL' as const, label: 'All Financial Nodes' },
          { id: 'BANK' as const, label: 'Bank Deposits' },
          { id: 'CARD' as const, label: 'Credit Cards' },
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {filteredAccounts.map((acc) => {
          const isBank = acc.type === 'BANK_DEPOSIT';
          const isExpanded = expandedAccountId === acc.id;

          // Transactions belonging to this account
          const accountTxs = transactions.filter((t) => t.account_id === acc.id);

          // Linked EMIs / obligations
          const accountObligations = obligations.filter((o) => o.linked_account_id === acc.id);

          // Minimum balance warning check for banks
          const isBelowMinimum =
            isBank && acc.minimum_balance !== null && acc.balance < acc.minimum_balance;

          // Credit card health assessment
          const cardHealth = !isBank ? CreditMonitor.assessCreditHealth(acc) : null;

          return (
            <Card key={acc.id} style={styles.nodeCard}>
              {/* Header Row */}
              <View style={styles.cardHeader}>
                <View style={styles.titleWithIcon}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isBank
                          ? 'rgba(16, 185, 129, 0.12)'
                          : cardHealth?.backgroundColor || 'rgba(59, 130, 246, 0.12)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isBank ? 'wallet-outline' : 'card-outline'}
                      size={18}
                      color={isBank ? theme.colors.success : cardHealth?.themeColor || theme.colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.nodeName}>{acc.name}</Text>
                    <Text style={styles.nodeTypeSub}>
                      {isBank ? 'Deposit Account' : 'Revolving Credit Line'}
                    </Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  {cardHealth && (
                    <Badge
                      label={cardHealth.badgeLabel}
                      color={cardHealth.themeColor}
                      backgroundColor={cardHealth.backgroundColor}
                      size="sm"
                    />
                  )}
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => setSelectedAccountForEdit(acc)}
                  >
                    <Ionicons name="pencil" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Balance & Limits Display */}
              <View style={styles.balanceSection}>
                <View>
                  <Text style={styles.balanceLabel}>
                    {isBank ? 'Available Cash Balance' : 'Current Unpaid Debt'}
                  </Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: isBank ? theme.colors.success : theme.colors.textPrimary },
                    ]}
                  >
                    {formatRupee(acc.balance, { decimals: 2 })}
                  </Text>
                </View>

                {!isBank && acc.credit_limit && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.balanceLabel}>Credit Limit</Text>
                    <Text style={styles.limitAmount}>
                      {formatRupee(acc.credit_limit, { decimals: 2 })}
                    </Text>
                  </View>
                )}

              </View>

              {/* Credit Utilization Bar */}
              {!isBank && cardHealth && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, cardHealth.utilizationPercentage)}%`,
                          backgroundColor: cardHealth.themeColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressSub}>
                      {cardHealth.utilizationPercentage.toFixed(1)}% utilized
                    </Text>
                    <Text style={[styles.progressSub, { color: cardHealth.themeColor }]}>
                      {cardHealth.description}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bank Minimum Balance Alert Banner */}
              {isBank && acc.minimum_balance !== null && (
                <View
                  style={[
                    styles.minBalanceRow,
                    isBelowMinimum ? styles.minBalanceDanger : styles.minBalanceNormal,
                  ]}
                >
                  <Ionicons
                    name={isBelowMinimum ? 'alert-circle' : 'shield-checkmark-outline'}
                    size={14}
                    color={isBelowMinimum ? theme.colors.danger : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.minBalanceText,
                      isBelowMinimum && { color: theme.colors.danger, fontWeight: '700' },
                    ]}
                  >
                    {isBelowMinimum
                      ? `ALERT: Balance is below required minimum of ₹${acc.minimum_balance.toLocaleString('en-IN')}!`
                      : `Minimum Required Balance: ₹${acc.minimum_balance.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              )}

              {/* Dates Row (Billing Cycle & Due Date) */}
              <View style={styles.datesRow}>
                {acc.billing_cycle_cut_day && (
                  <View style={styles.dateTag}>
                    <Ionicons name="document-text-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.dateTagText}>
                      Bill Generate: Day {acc.billing_cycle_cut_day}
                    </Text>
                  </View>
                )}
                {acc.payment_due_day && (
                  <View style={styles.dateTag}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.dateTagText}>
                      Bill Due: Day {acc.payment_due_day}
                    </Text>
                  </View>
                )}
              </View>

              {/* Accordion Toggle: Linked EMIs & Transactions */}
              <TouchableOpacity
                style={styles.expandToggleBtn}
                onPress={() => toggleExpand(acc.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandToggleText}>
                  {isExpanded
                    ? 'Hide Individual Ledgers & EMIs'
                    : `View History & Linked EMIs (${accountTxs.length} txs, ${accountObligations.length} obligations)`}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              {/* Expanded Detail Section */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Linked EMIs and Obligations */}
                  <Text style={styles.detailSectionTitle}>Linked EMIs & Obligations</Text>
                  {accountObligations.length === 0 ? (
                    <Text style={styles.detailEmptyText}>No active EMIs or loans linked to this node.</Text>
                  ) : (
                    accountObligations.map((ob) => (
                      <View key={ob.id} style={styles.linkedObRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.linkedObName}>{ob.name}</Text>
                          <Text style={styles.linkedObSub}>
                            {ob.type} • Due Day {ob.due_day}
                            {ob.remaining_tenure_months ? ` • ${ob.remaining_tenure_months} months remaining` : ''}
                          </Text>
                        </View>
                        <Text style={styles.linkedObAmount}>{formatRupee(ob.amount)}/mo</Text>
                      </View>
                    ))
                  )}

                  {/* Individual Account Transactions */}
                  <Text style={[styles.detailSectionTitle, { marginTop: 14 }]}>
                    Individual Account Movements ({accountTxs.length})
                  </Text>
                  {accountTxs.length === 0 ? (
                    <Text style={styles.detailEmptyText}>No transactions recorded on this account yet.</Text>
                  ) : (
                    accountTxs.slice(0, 10).map((tx) => {
                      const isPositive = tx.type === 'INFLOW';
                      return (
                        <View key={tx.id} style={styles.indivTxRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.indivTxDesc} numberOfLines={1}>
                              {tx.description || tx.category}
                            </Text>
                            <Text style={styles.indivTxDate}>
                              {safeFormatDate(tx.timestamp)} • {tx.category}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.indivTxAmount,
                              { color: isPositive ? theme.colors.success : theme.colors.textPrimary },
                            ]}
                          >
                            {isPositive ? '+' : '-'}{formatRupee(tx.amount, { decimals: 2 })}
                          </Text>
                        </View>
                      );
                    })
                  )}

                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Edit Account Modal */}
      <EditAccountModal
        visible={selectedAccountForEdit !== null}
        account={selectedAccountForEdit}
        onClose={() => setSelectedAccountForEdit(null)}
        onSubmit={async (input) => {
          await editAccount(input);
        }}
        onDelete={async (id) => {
          await removeAccount(id);
        }}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (input) => {
          await addAccount(input);
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    padding: 3,
    marginBottom: theme.spacing.md,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  nodeCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nodeTypeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconBtn: {
    padding: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  limitAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  progressWrap: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  minBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  minBalanceNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  minBalanceDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  minBalanceText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTagText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
    marginTop: 4,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  expandedContent: {
    backgroundColor: '#090D18',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailEmptyText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  linkedObRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  linkedObName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  linkedObSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  linkedObAmount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
  },
  indivTxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  indivTxDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  indivTxDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  indivTxAmount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
