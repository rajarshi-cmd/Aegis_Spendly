import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData, DeletedAccount } from '../../presentation/hooks/useFinanceData';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate, safeFormatTime } from '../../core/utils/date';
import { DeleteModal } from '../../presentation/components/modals/DeleteModal';
import { RecurringObligation } from '../../core/types';

export const HistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    deletedTransactions,
    deletedAccounts,
    pastCommitments,
    transactions,
    restoreTransaction,
    permanentDeleteTransaction,
    restoreAccount,
    permanentDeleteAccount,
    restoreCommitment,
    permanentDeleteCommitment,
  } = useFinanceData();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'ACCOUNTS' | 'COMMITMENTS'>('TRANSACTIONS');
  const [expandedAccountIds, setExpandedAccountIds] = useState<Record<string, boolean>>({});

  // Universal Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'TRANSACTION' | 'ACCOUNT' | 'COMMITMENT';
    id: string;
    name: string;
  } | null>(null);

  const toggleAccountExpand = (id: string) => {
    setExpandedAccountIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'TRANSACTION') {
      await permanentDeleteTransaction(itemToDelete.id);
    } else if (itemToDelete.type === 'ACCOUNT') {
      await permanentDeleteAccount(itemToDelete.id);
    } else if (itemToDelete.type === 'COMMITMENT') {
      await permanentDeleteCommitment(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: isDesktop ? 24 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local recovery shelf — deleted entries and closed accounts stay here so you can undo or review past records anytime.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.microTag, { color: colors.textMuted }]}>RECOVERY SHELF & AUDIT</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History & Archive</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Review closed accounts, past commitments, and deleted entries. Restore or permanently erase.
          </Text>
        </View>
      </View>

      {/* Segmented Navigation Tabs */}
      <View style={[styles.segmentedRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'TRANSACTIONS' && [styles.segmentBtnActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('TRANSACTIONS')}
        >
          <Ionicons
            name="receipt-outline"
            size={14}
            color={activeTab === 'TRANSACTIONS' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'TRANSACTIONS' ? colors.primary : colors.textSecondary },
              activeTab === 'TRANSACTIONS' && styles.segmentTextActive,
            ]}
          >
            Transactions ({deletedTransactions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'ACCOUNTS' && [styles.segmentBtnActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('ACCOUNTS')}
        >
          <Ionicons
            name="card-outline"
            size={14}
            color={activeTab === 'ACCOUNTS' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'ACCOUNTS' ? colors.primary : colors.textSecondary },
              activeTab === 'ACCOUNTS' && styles.segmentTextActive,
            ]}
          >
            Closed Banks & Cards ({deletedAccounts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'COMMITMENTS' && [styles.segmentBtnActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('COMMITMENTS')}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={activeTab === 'COMMITMENTS' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'COMMITMENTS' ? colors.primary : colors.textSecondary },
              activeTab === 'COMMITMENTS' && styles.segmentTextActive,
            ]}
          >
            Archived Commitments ({pastCommitments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isDesktop ? '100%' : 540, flex: 1 }}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>DELETED TRANSACTION</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>DELETED ON</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.textMuted }]}>AMOUNT</Text>
                <Text style={[styles.th, { width: 100, textAlign: 'center', color: colors.textMuted }]}>ACTIONS</Text>
              </View>

              {deletedTransactions.length > 0 ? (
                <View>
                  {deletedTransactions.map((tx) => {
                    const isIncome = tx.type === 'INFLOW';
                    return (
                      <View key={tx.id} style={[styles.tableRow, { borderBottomColor: colors.borderSubtle }]}>
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.iconBox, { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' }]}>
                            <Ionicons
                              name={isIncome ? 'cash-outline' : 'receipt-outline'}
                              size={16}
                              color={isIncome ? '#15803D' : '#B91C1C'}
                            />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {tx.description || tx.category}
                            </Text>
                            <Text style={[styles.rowSub, { color: colors.textMuted }]}>{tx.category}</Text>
                          </View>
                        </View>

                        <Text style={[styles.rowTime, { flex: 1, color: colors.textMuted }]}>
                          {safeFormatTime(tx.deleted_at, 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>

                        <Text
                          style={[
                            styles.rowAmount,
                            {
                              flex: 1,
                              color: isIncome ? colors.successText : colors.textPrimary,
                            },
                          ]}
                        >
                          {formatRupee(tx.amount, true)}
                        </Text>

                        <View style={styles.actionsCell}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
                            onPress={() => restoreTransaction(tx.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="reload-outline" size={15} color={colors.primary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                            onPress={() =>
                              setItemToDelete({
                                type: 'TRANSACTION',
                                id: tx.id,
                                name: tx.description || tx.category,
                              })
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={15} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.background }]}>
                    <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No deleted transactions</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    All your ledger entries are active. Deleted transactions will appear here for safe recovery.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* TAB 2: CLOSED BANKS & CARDS */}
      {activeTab === 'ACCOUNTS' && (
        <View style={{ gap: 14 }}>
          {deletedAccounts.length > 0 ? (
            deletedAccounts.map((acc: DeletedAccount) => {
              const isCard = acc.type === 'CREDIT_CARD';
              const isExpanded = !!expandedAccountIds[acc.id];
              // All past transactions linked to this account
              const linkedTxs = transactions.filter((t) => t.account_id === acc.id);

              return (
                <View
                  key={acc.id}
                  style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                >
                  <View style={styles.accountCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                      <View
                        style={[
                          styles.accountIconBox,
                          { backgroundColor: isCard ? '#EDE9FE' : '#E0F2FE' },
                        ]}
                      >
                        <Ionicons
                          name={isCard ? 'card-outline' : 'business-outline'}
                          size={20}
                          color={isCard ? '#7C3AED' : '#0284C7'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={[styles.accountCardTitle, { color: colors.textPrimary }]}>
                            {acc.name}
                          </Text>
                          <View
                            style={[
                              styles.typePill,
                              { backgroundColor: isCard ? '#F3E8FF' : '#E0F2FE' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typePillText,
                                { color: isCard ? '#7E22CE' : '#0369A1' },
                              ]}
                            >
                              {isCard ? 'Credit Card' : 'Bank Account'}
                            </Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.statusPillText, { color: '#B91C1C' }]}>Closed</Text>
                          </View>
                        </View>
                        <Text style={[styles.accountCardMeta, { color: colors.textMuted }]}>
                          Closed on {safeFormatDate(acc.deleted_at)} • {linkedTxs.length} past ledger records
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.btnOutline, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                        onPress={() => restoreAccount(acc.id)}
                      >
                        <Ionicons name="reload-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Restore</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnDanger, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                        onPress={() =>
                          setItemToDelete({
                            type: 'ACCOUNT',
                            id: acc.id,
                            name: acc.name,
                          })
                        }
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnDangerText}>Erase</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Summary metric values */}
                  <View style={[styles.accountMetricsRow, { borderTopColor: colors.borderSubtle, borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        {isCard ? 'CREDIT LIMIT' : 'CLOSING BALANCE'}
                      </Text>
                      <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                        {formatRupee(isCard ? acc.credit_limit || 0 : acc.balance)}
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PAST TRANSACTIONS</Text>
                      <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                        {linkedTxs.length} entries
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.expandToggleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => toggleAccountExpand(acc.id)}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={15}
                        color={colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.expandToggleText, { color: colors.textSecondary }]}>
                        {isExpanded ? 'Hide' : 'View'} past transactions
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expandable Past Transactions List */}
                  {isExpanded && (
                    <View style={[styles.expandedTxsWrap, { backgroundColor: colors.background }]}>
                      <Text style={[styles.expandedTitle, { color: colors.textSecondary }]}>
                        Past Transactions linked to {acc.name} ({linkedTxs.length}):
                      </Text>

                      {linkedTxs.length > 0 ? (
                        <View style={{ gap: 6, marginTop: 8 }}>
                          {linkedTxs.map((tx) => {
                            const isIncome = tx.type === 'INFLOW';
                            return (
                              <View
                                key={tx.id}
                                style={[styles.linkedTxRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                              >
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                  <View
                                    style={[
                                      styles.miniIconBox,
                                      { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
                                    ]}
                                  >
                                    <Ionicons
                                      name={isIncome ? 'arrow-down' : 'arrow-up'}
                                      size={12}
                                      color={isIncome ? '#15803D' : '#B91C1C'}
                                    />
                                  </View>
                                  <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={[styles.linkedTxDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                                      {tx.description || tx.category}
                                    </Text>
                                    <Text style={[styles.linkedTxMeta, { color: colors.textMuted }]}>
                                      {safeFormatDate(tx.timestamp)} • {tx.category}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={[
                                    styles.linkedTxAmount,
                                    { color: isIncome ? colors.successText : colors.textPrimary },
                                  ]}
                                >
                                  {isIncome ? '+' : '-'} {formatRupee(tx.amount)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={[styles.emptyLinkedText, { color: colors.textMuted }]}>
                          No transactions were recorded under this account.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.background }]}>
                <Ionicons name="card-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No closed banks or cards</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                When you close an account, it will safely appear here alongside all past transactions, allowing full audit and one-click restoration.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: ARCHIVED COMMITMENTS */}
      {activeTab === 'COMMITMENTS' && (
        <View style={{ gap: 14 }}>
          {pastCommitments.length > 0 ? (
            pastCommitments.map((c: RecurringObligation) => (
              <View
                key={c.id}
                style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              >
                <View style={styles.accountCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                    <View style={[styles.accountIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="repeat-outline" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={[styles.accountCardTitle, { color: colors.textPrimary }]}>{c.name}</Text>
                        <View style={[styles.typePill, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={[styles.typePillText, { color: '#475569' }]}>{c.type}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: c.status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: c.status === 'COMPLETED' ? '#15803D' : '#B45309' },
                            ]}
                          >
                            {c.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.accountCardMeta, { color: colors.textMuted }]}>
                        {c.category} • Due Day {c.due_day} of month • Monthly: {formatRupee(c.amount)}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.btnOutline, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                      onPress={() => restoreCommitment(c.id)}
                    >
                      <Ionicons name="reload-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Reactivate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnDanger, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                      onPress={() =>
                        setItemToDelete({
                          type: 'COMMITMENT',
                          id: c.id,
                          name: c.name,
                        })
                      }
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.btnDangerText}>Erase</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.background }]}>
                <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No archived commitments</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Completed loan EMIs or cancelled subscriptions will appear here so you can review or reactivate them anytime.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Universal Delete Confirmation Modal */}
      {itemToDelete && (
        <DeleteModal
          visible={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmPermanentDelete}
          title={`Permanently erase ${itemToDelete.name}?`}
          description={
            itemToDelete.type === 'ACCOUNT'
              ? `This will permanently remove ${itemToDelete.name} from the local database. Past ledger transactions are preserved.`
              : itemToDelete.type === 'COMMITMENT'
              ? `This will permanently remove the commitment ${itemToDelete.name}.`
              : `This will permanently delete this transaction from local storage.`
          }
          confirmButtonText="Permanently Erase"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {},
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowTime: {
    fontSize: 12,
    textAlign: 'center',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  actionsCell: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 380,
    lineHeight: 18,
  },
  accountCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountCardMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  accountMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    marginRight: 16,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedTxsWrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkedTxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedTxDesc: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkedTxMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  linkedTxAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyLinkedText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
