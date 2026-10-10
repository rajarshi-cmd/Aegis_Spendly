import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { RecurringObligation } from '../../core/types/upcoming';
import { formatRupee } from '../../core/utils/currency';
import { AddObligationSheet } from '../../presentation/components/modals/AddObligationSheet';

export interface FixedCostsScreenProps {
  onOpenAddRecurring?: () => void;
  onOpenAddObligation?: () => void;
}

export const FixedCostsScreen: React.FC<FixedCostsScreenProps> = () => {
  const { colors } = useTheme();
  const {
    obligations,
    pastCommitments,
    accounts,
    addObligation,
    removeObligation,
    payObligation,
    restoreCommitment,
  } = useFinanceData();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Total monthly sum
  const totalMonthlyObligation = useMemo(() => {
    return obligations.reduce((sum, o) => sum + o.amount, 0);
  }, [obligations]);

  // Today's day of month
  const todayDay = new Date().getDate();

  // Categorize obligations into temporal groups
  const groupedObligations = useMemo(() => {
    const thisWeek: RecurringObligation[] = [];
    const laterThisMonth: RecurringObligation[] = [];
    const nextMonth: RecurringObligation[] = [];

    obligations.forEach((ob) => {
      const diff = ob.due_day - todayDay;
      if (diff >= 0 && diff <= 7) {
        thisWeek.push(ob);
      } else if (diff > 7) {
        laterThisMonth.push(ob);
      } else {
        nextMonth.push(ob);
      }
    });

    return { thisWeek, laterThisMonth, nextMonth };
  }, [obligations, todayDay]);

  // Icon helper
  const getIconForObligation = (type: string, name: string): keyof typeof Ionicons.glyphMap => {
    const n = name.toLowerCase();
    if (n.includes('lease') || n.includes('rent') || n.includes('apartment') || n.includes('home')) {
      return 'business-outline';
    }
    if (n.includes('car') || n.includes('vehicle') || n.includes('auto')) {
      return 'car-outline';
    }
    if (n.includes('sip') || n.includes('fund') || n.includes('invest')) {
      return 'trending-up-outline';
    }
    if (n.includes('netflix') || n.includes('spotify') || n.includes('prime') || type === 'SUBSCRIPTION') {
      return 'film-outline';
    }
    return 'cash-outline';
  };

  const getAccountLabel = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? `${acc.name} (••${acc.last4 || '4821'})` : 'Auto-Debit Account';
  };

  const getDueDaysText = (dueDay: number) => {
    const diff = dueDay - todayDay;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff > 1) return `Due in ${diff} days`;
    return `Passed (${dueDay}th)`;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background || '#051424' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action & Title Row */}
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Ionicons name="repeat-outline" size={20} color="#52b788" />
            <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Fixed Commitments</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#003915" />
            <Text style={styles.addBtnText}>Add Recurring</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Obligation Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="wallet-outline" size={16} color="#52b788" />
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                MONTHLY TOTAL OBLIGATION
              </Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>{obligations.length} Active</Text>
            </View>
          </View>

          <View style={styles.summaryAmountRow}>
            <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
              {formatRupee(totalMonthlyObligation)}
            </Text>
            <Text style={[styles.perMonthText, { color: colors.textMuted }]}>/ month</Text>
          </View>

          <Text style={[styles.summarySub, { color: colors.textMuted }]}>
            All scheduled recurring debits across linked bank accounts
          </Text>
        </View>

        {/* Segmented Tabs (Active vs Past & Archived) */}
        <View style={[styles.segmentedTabs, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          <TouchableOpacity
            style={[
              styles.segmentTabBtn,
              activeTab === 'ACTIVE' && [
                styles.segmentTabBtnActive,
                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
              ],
            ]}
            onPress={() => setActiveTab('ACTIVE')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentTabText,
                { color: activeTab === 'ACTIVE' ? '#52b788' : colors.textMuted },
                activeTab === 'ACTIVE' && styles.segmentTabTextActive,
              ]}
            >
              Active ({obligations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTabBtn,
              activeTab === 'ARCHIVED' && [
                styles.segmentTabBtnActive,
                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
              ],
            ]}
            onPress={() => setActiveTab('ARCHIVED')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentTabText,
                { color: activeTab === 'ARCHIVED' ? '#52b788' : colors.textMuted },
                activeTab === 'ARCHIVED' && styles.segmentTabTextActive,
              ]}
            >
              Past & Archived ({pastCommitments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'ACTIVE' ? (
          <View style={styles.feedContainer}>
            {/* Group 1: Upcoming This Week */}
            {groupedObligations.thisWeek.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: colors.textMuted }]}>UPCOMING THIS WEEK</Text>
                  <Text style={styles.groupCount}>{groupedObligations.thisWeek.length} payments</Text>
                </View>

                {groupedObligations.thisWeek.map((ob) =>
                  renderObligationCard(ob, colors, getIconForObligation, getAccountLabel, getDueDaysText, payObligation, removeObligation)
                )}
              </View>
            )}

            {/* Group 2: Later This Month */}
            {groupedObligations.laterThisMonth.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: colors.textMuted }]}>LATER THIS MONTH</Text>
                  <Text style={styles.groupCount}>{groupedObligations.laterThisMonth.length} payments</Text>
                </View>

                {groupedObligations.laterThisMonth.map((ob) =>
                  renderObligationCard(ob, colors, getIconForObligation, getAccountLabel, getDueDaysText, payObligation, removeObligation)
                )}
              </View>
            )}

            {/* Group 3: Next Month & Completed */}
            {groupedObligations.nextMonth.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: colors.textMuted }]}>UPCOMING NEXT CYCLE</Text>
                  <Text style={styles.groupCount}>{groupedObligations.nextMonth.length} payments</Text>
                </View>

                {groupedObligations.nextMonth.map((ob) =>
                  renderObligationCard(ob, colors, getIconForObligation, getAccountLabel, getDueDaysText, payObligation, removeObligation)
                )}
              </View>
            )}

            {obligations.length === 0 && (
              <View style={styles.emptyFeed}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No recurring obligations</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Add subscriptions, EMIs, or loans to automate tracking.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Archived / Past Obligations Feed */
          <View style={styles.feedContainer}>
            {pastCommitments.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Ionicons name="archive-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Archive is clean</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  No paused or completed commitments found.
                </Text>
              </View>
            ) : (
              pastCommitments.map((ob) => (
                <View
                  key={ob.id}
                  style={[styles.itemCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                >
                  <View style={styles.itemCardHeader}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                        <Ionicons name="archive-outline" size={18} color={colors.textMuted} />
                      </View>
                      <View>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{ob.name}</Text>
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                          Status: {ob.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.textMuted }]}>
                      {formatRupee(ob.amount)}
                    </Text>
                  </View>

                  <View style={styles.itemFooter}>
                    <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
                      {getAccountLabel(ob.linked_account_id)}
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionPill, { backgroundColor: 'rgba(82,183,136,0.18)' }]}
                      onPress={() => restoreCommitment(ob.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="reload-outline" size={13} color="#52b788" />
                      <Text style={[styles.actionPillText, { color: '#52b788' }]}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Recurring Obligation Sheet */}
      <AddObligationSheet
        visible={isAddSheetOpen}
        accounts={accounts}
        onClose={() => setIsAddSheetOpen(false)}
        onSubmit={async (input) => {
          await addObligation(input);
        }}
      />
    </View>
  );
};

// Helper card renderer
function renderObligationCard(
  ob: RecurringObligation,
  colors: any,
  getIconForObligation: any,
  getAccountLabel: any,
  getDueDaysText: any,
  payObligation: any,
  removeObligation: any
) {
  const iconName = getIconForObligation(ob.type, ob.name);
  const dueDays = getDueDaysText(ob.due_day);
  const isUrgent = dueDays.includes('2 days') || dueDays.includes('today') || dueDays.includes('tomorrow');

  return (
    <View
      key={ob.id}
      style={[styles.itemCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}
    >
      <View style={styles.itemCardHeader}>
        <View style={styles.itemLeft}>
          <View style={[styles.itemIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
            <Ionicons name={iconName} size={18} color={isUrgent ? '#ffca45' : '#52b788'} />
          </View>
          <View style={styles.itemMeta}>
            <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
              {ob.name}
            </Text>
            <Text style={[styles.itemSub, { color: colors.textMuted }]}>
              Due {ob.due_day}th • Monthly
            </Text>
          </View>
        </View>

        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: colors.textPrimary }]}>
            {formatRupee(ob.amount)}
          </Text>
          <Text
            style={[
              styles.dueText,
              { color: isUrgent ? '#ffca45' : colors.textMuted },
            ]}
          >
            {dueDays}
          </Text>
        </View>
      </View>

      <View style={styles.itemFooter}>
        <Text style={[styles.accountLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {getAccountLabel(ob.linked_account_id)}
        </Text>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: 'rgba(82,183,136,0.18)' }]}
            onPress={() => payObligation(ob.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-outline" size={13} color="#52b788" />
            <Text style={[styles.actionPillText, { color: '#52b788' }]}>Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: 'rgba(255,180,171,0.15)' }]}
            onPress={() => removeObligation(ob.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={13} color="#ffb4ab" />
            <Text style={[styles.actionPillText, { color: '#ffb4ab' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#52b788',
    gap: 5,
    shadowColor: '#52b788',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  addBtnText: {
    color: '#003915',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#52b788',
  },
  activeBadgeText: {
    color: '#52b788',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  perMonthText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summarySub: {
    fontSize: 11,
  },
  segmentedTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  segmentTabTextActive: {
    fontWeight: '700',
  },
  feedContainer: {
    gap: 16,
  },
  groupSection: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  groupCount: {
    color: '#52b788',
    fontSize: 11,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
  accountLabel: {
    fontSize: 11,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
});
