import React, { useState } from 'react';
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
import { CreditHealthCard } from './components/CreditHealthCard';
import { AddTransactionModal } from '../ledger/forms/AddTransactionModal';
import { AddAccountModal } from './forms/AddAccountModal';
import { Badge } from '../../presentation/components/Badge';
import { theme } from '../../presentation/theme';
import { safeFormatDate } from '../../core/utils/date';
import { formatRupee } from '../../core/utils/currency';


interface DashboardScreenProps {
  onNavigateToLedger?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateToLedger }) => {
  const {
    accounts,
    transactions,
    creditHealthList,
    totalBankCash,
    totalCreditDebt,
    loading,
    refreshData,
    addTransaction,
    addAccount,
    removeAccount,
  } = useFinanceData();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const netLiquidPosition = totalBankCash - totalCreditDebt;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <View style={styles.container}>
      <Header
        title="Portfolio Overview"
        subtitle="Local-first private ledger"
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Movement</Text>
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
        {/* Contrast Balance Cards */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Liquid Cash</Text>
              <Ionicons name="wallet-outline" size={16} color={theme.colors.success} />
            </View>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              {formatRupee(totalBankCash, { decimals: 2 })}
            </Text>
            <Text style={styles.metricSub}>Available bank reserves</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Card Debt</Text>
              <Ionicons name="card-outline" size={16} color={theme.colors.danger} />
            </View>
            <Text style={[styles.metricValue, { color: theme.colors.danger }]}>
              {formatRupee(totalCreditDebt, { decimals: 2 })}
            </Text>
            <Text style={styles.metricSub}>Unpaid credit liabilities</Text>
          </Card>
        </View>

        {/* Net Reserve Card */}
        <Card style={styles.netCard}>
          <View style={styles.netHeader}>
            <View>
              <Text style={styles.netLabel}>Net Cash Position</Text>
              <Text
                style={[
                  styles.netValue,
                  { color: netLiquidPosition >= 0 ? theme.colors.textPrimary : theme.colors.danger },
                ]}
              >
                {formatRupee(netLiquidPosition, { decimals: 2 })}
              </Text>
            </View>

            <View
              style={[
                styles.netBadge,
                {
                  backgroundColor:
                    netLiquidPosition >= 0 ? theme.colors.successBg : theme.colors.dangerBg,
                },
              ]}
            >
              <Ionicons
                name={netLiquidPosition >= 0 ? 'shield-checkmark' : 'alert-circle'}
                size={14}
                color={netLiquidPosition >= 0 ? theme.colors.success : theme.colors.danger}
              />
              <Text
                style={[
                  styles.netBadgeText,
                  { color: netLiquidPosition >= 0 ? theme.colors.success : theme.colors.danger },
                ]}
              >
                {netLiquidPosition >= 0 ? 'Solvent' : 'Debt Exceeds Cash'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Manual Financial Accounts & Cards Manager */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Accounts & Cards</Text>
          </View>
          <TouchableOpacity
            style={styles.addAccountLink}
            onPress={() => setIsAccountModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.addAccountLinkText}>Add Node</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.accountsListCard}>
          {accounts.map((acc, idx) => {
            const isBank = acc.type === 'BANK_DEPOSIT';
            return (
              <View
                key={acc.id}
                style={[
                  styles.accountRow,
                  idx !== accounts.length - 1 && styles.accountRowBorder,
                ]}
              >
                <View style={styles.accountLeft}>
                  <View
                    style={[
                      styles.accountIconWrap,
                      {
                        backgroundColor: isBank
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(59, 130, 246, 0.12)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isBank ? 'wallet-outline' : 'card-outline'}
                      size={16}
                      color={isBank ? theme.colors.success : theme.colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.accountNameText}>{acc.name}</Text>
                    <Text style={styles.accountMetaText}>
                      {isBank
                        ? 'Bank Deposit Account'
                        : `Credit Card • Limit: ₹${acc.credit_limit?.toLocaleString('en-IN') || 0}`}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.accountBalanceText,
                      { color: isBank ? theme.colors.success : theme.colors.textPrimary },
                    ]}
                  >
                    {formatRupee(acc.balance, { decimals: 2 })}
                  </Text>

                  <Text style={styles.accountTypeLabel}>
                    {isBank ? 'Available' : 'Debt'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Credit Card Health Monitor */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="speedometer-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Credit Health Monitor</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Real-time utilization tiers</Text>
        </View>

        {creditHealthList.map((health) => {
          const acc = accounts.find((a) => a.id === health.accountId);
          return (
            <CreditHealthCard
              key={health.accountId}
              health={health}
              cutDay={acc?.billing_cycle_cut_day ?? null}
              dueDay={acc?.payment_due_day ?? null}
            />
          );
        })}

        {/* Recent Ledger Entries */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Recent Movements</Text>
          </View>
          {onNavigateToLedger && (
            <TouchableOpacity onPress={onNavigateToLedger}>
              <Text style={styles.viewAllText}>View All Ledger →</Text>
            </TouchableOpacity>
          )}
        </View>

        <Card style={styles.activityCard}>
          {recentTransactions.map((tx, idx) => {
            const isPositive = tx.type === 'INFLOW';
            const acc = accounts.find((a) => a.id === tx.account_id);
            return (
              <View
                key={tx.id}
                style={[
                  styles.activityRow,
                  idx !== recentTransactions.length - 1 && styles.activityRowBorder,
                ]}
              >
                <View style={styles.activityLeft}>
                  <View
                    style={[
                      styles.activityIconWrap,
                      {
                        backgroundColor: isPositive
                          ? theme.colors.successBg
                          : theme.colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        tx.type === 'TRANSFER'
                          ? 'swap-horizontal'
                          : isPositive
                          ? 'arrow-down'
                          : 'arrow-up'
                      }
                      size={14}
                      color={
                        tx.type === 'TRANSFER'
                          ? theme.colors.primary
                          : isPositive
                          ? theme.colors.success
                          : theme.colors.textSecondary
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityDesc} numberOfLines={1}>
                      {tx.description || tx.category}
                    </Text>
                    <Text style={styles.activitySub}>
                      {acc?.name} • {safeFormatDate(tx.timestamp)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    { color: isPositive ? theme.colors.success : theme.colors.textPrimary },
                  ]}
                >
                  {isPositive ? '+' : '-'}{formatRupee(tx.amount, { decimals: 2 })}
                </Text>

              </View>
            );
          })}
        </Card>
      </ScrollView>

      {/* Quick Entry Modal */}
      <AddTransactionModal
        visible={isModalOpen}
        accounts={accounts}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (input) => {
          await addTransaction(input);
        }}
      />

      {/* Manual Account / Card Modal */}
      <AddAccountModal
        visible={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSubmit={async (input) => {
          await addAccount(input);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  addAccountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAccountLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  accountsListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  accountRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  accountMetaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  accountBalanceText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  accountTypeLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  netCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  netHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  netValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  netBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  viewAllText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  activityCard: {
    padding: 0,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  activitySub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
