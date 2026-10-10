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
import { PlannedBudget } from '../../core/types/upcoming';
import { formatRupee } from '../../core/utils/currency';
import { isDateInMonth } from '../../core/utils/date';
import { EditCategorySheet } from '../../presentation/components/modals/EditCategorySheet';

interface BudgetsScreenProps {
  onOpenAddExpense?: (category?: string) => void;
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({ onOpenAddExpense }) => {
  const { colors } = useTheme();
  const {
    plannedBudgets,
    transactions,
    activeMonth,
    setActiveMonth,
    updatePlannedBudget,
    removePlannedBudget,
    addPlannedBudget,
  } = useFinanceData();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<PlannedBudget | null>(null);

  // Parse active month and navigation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthIdx = useMemo(() => {
    const name = (activeMonth || '').split(' ')[0];
    const idx = monthNames.findIndex((m) => m.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? idx : 10; // Default Nov
  }, [activeMonth]);

  const currentYear = useMemo(() => {
    return parseInt((activeMonth || '').match(/\d{4}/)?.[0] || new Date().getFullYear().toString(), 10);
  }, [activeMonth]);

  const handlePrevMonth = () => {
    const prevIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
    const year = currentMonthIdx === 0 ? currentYear - 1 : currentYear;
    setActiveMonth(`${monthNames[prevIdx]} ${year}`);
  };

  const handleNextMonth = () => {
    const nextIdx = currentMonthIdx === 11 ? 0 : currentMonthIdx + 1;
    const year = currentMonthIdx === 11 ? currentYear + 1 : currentYear;
    setActiveMonth(`${monthNames[nextIdx]} ${year}`);
  };

  // Month-filtered transactions
  const monthTransactions = useMemo(() => {
    if (!activeMonth || activeMonth.toLowerCase() === 'all months') {
      return transactions;
    }
    return transactions.filter((t) => isDateInMonth(t.timestamp, activeMonth));
  }, [transactions, activeMonth]);

  // Compute spent amount per category
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'OUTFLOW')
      .forEach((t) => {
        const cat = (t.category || 'Other').toLowerCase();
        map[cat] = (map[cat] || 0) + t.amount;
      });
    return map;
  }, [monthTransactions]);

  // Totals
  const totalAllocated = useMemo(() => {
    return plannedBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
  }, [plannedBudgets]);

  const totalSpent = useMemo(() => {
    return Object.values(categorySpentMap).reduce((sum, v) => sum + v, 0);
  }, [categorySpentMap]);

  const remainingSafeSpend = Math.max(0, totalAllocated - totalSpent);
  const consumedPct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0;
  const isOverBudget = totalSpent > totalAllocated;
  const isWarning = consumedPct >= 80 && !isOverBudget;

  // Icon helper
  const getIconForCategory = (cat: string): keyof typeof Ionicons.glyphMap => {
    const c = cat.toLowerCase();
    if (c.includes('food') || c.includes('dining')) return 'restaurant-outline';
    if (c.includes('coffee') || c.includes('cafe')) return 'cafe-outline';
    if (c.includes('grocer') || c.includes('market')) return 'basket-outline';
    if (c.includes('shop')) return 'cart-outline';
    if (c.includes('entertain') || c.includes('game')) return 'game-controller-outline';
    if (c.includes('health') || c.includes('care')) return 'heart-outline';
    if (c.includes('transport') || c.includes('car')) return 'car-outline';
    return 'pricetag-outline';
  };

  // Quick ceiling adjust
  const handleQuickAdjust = (budget: PlannedBudget, delta: number) => {
    const newCap = Math.max(100, budget.planned_amount + delta);
    updatePlannedBudget(budget.id, newCap);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background || '#051424' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation & Safe Velocity Pill */}
        <View style={styles.topNavRow}>
          <View style={[styles.monthSelectorWrap, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={17} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.monthLabelRow}>
              <Ionicons name="calendar-outline" size={15} color="#52b788" />
              <Text style={[styles.monthLabelText, { color: colors.textPrimary }]}>
                {monthNames[currentMonthIdx]} {currentYear}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Health Status Pill */}
          <View
            style={[
              styles.healthPill,
              {
                backgroundColor: isOverBudget
                  ? 'rgba(255, 180, 171, 0.16)'
                  : isWarning
                  ? 'rgba(255, 202, 69, 0.16)'
                  : 'rgba(82, 183, 136, 0.16)',
              },
            ]}
          >
            <View
              style={[
                styles.pulseDot,
                { backgroundColor: isOverBudget ? '#ffb4ab' : isWarning ? '#ffca45' : '#52b788' },
              ]}
            />
            <Text
              style={[
                styles.healthPillText,
                { color: isOverBudget ? '#ffb4ab' : isWarning ? '#ffca45' : '#52b788' },
              ]}
            >
              {isOverBudget ? 'OVER BUDGET' : isWarning ? 'CAUTION' : 'ON TRACK'}
            </Text>
          </View>
        </View>

        {/* Primary Summary Card: Remaining Safe Spend */}
        <View style={[styles.primaryCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          <View style={styles.primaryCardTop}>
            <View>
              <Text style={[styles.primaryLabel, { color: colors.textMuted }]}>Remaining Safe Spend</Text>
              <Text style={[styles.primaryAmount, { color: colors.textPrimary }]}>
                {formatRupee(remainingSafeSpend)}
              </Text>
            </View>
            <View style={[styles.shieldIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#52b788" />
            </View>
          </View>

          {/* Progress Bar & Breakdown */}
          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={[styles.consumedText, { color: colors.textMuted }]}>
                {consumedPct}% consumed
              </Text>
              <Text style={[styles.ratioText, { color: colors.textPrimary }]}>
                {formatRupee(totalSpent)} / {formatRupee(totalAllocated)}
              </Text>
            </View>

            <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${consumedPct}%`,
                    backgroundColor: isOverBudget ? '#ffb4ab' : isWarning ? '#ffca45' : '#52b788',
                  },
                ]}
              />
            </View>
          </View>

          {/* Two-Column Split: Total Allocated & Total Spent */}
          <View style={styles.metricsSplitGrid}>
            <View style={[styles.metricSplitBox, { backgroundColor: colors.surfaceContainerLow || '#0d1c2d' }]}>
              <Text style={[styles.metricSplitLabel, { color: colors.textMuted }]}>Total Allocated</Text>
              <Text style={[styles.metricSplitValue, { color: colors.textPrimary }]}>
                {formatRupee(totalAllocated)}
              </Text>
            </View>
            <View style={[styles.metricSplitBox, { backgroundColor: colors.surfaceContainerLow || '#0d1c2d' }]}>
              <Text style={[styles.metricSplitLabel, { color: colors.textMuted }]}>Total Spent</Text>
              <Text style={[styles.metricSplitValue, { color: colors.textPrimary }]}>
                {formatRupee(totalSpent)}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Header: Category Ceilings */}
        <View style={styles.categoryHeaderRow}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={[styles.categorySectionTitle, { color: colors.textPrimary }]}>
              Category Ceilings
            </Text>
            <View style={[styles.categoryCountBadge, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
              <Text style={[styles.categoryCountText, { color: colors.textMuted }]}>
                {plannedBudgets.length} Active
              </Text>
            </View>
          </View>
        </View>

        {/* Category List */}
        <View style={styles.categoriesList}>
          {plannedBudgets.map((budget) => {
            const isExpanded = expandedId === budget.id;
            const spent = categorySpentMap[budget.category.toLowerCase()] || 0;
            const cap = budget.planned_amount || 1;
            const pct = Math.min(100, Math.round((spent / cap) * 100));
            const left = Math.max(0, cap - spent);
            const isOver = spent > cap;
            const isWarn = pct >= 80 && !isOver;
            const statusColor = isOver ? '#ffb4ab' : isWarn ? '#ffca45' : '#52b788';
            const iconName = getIconForCategory(budget.category);

            return (
              <View
                key={budget.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.surfaceContainer || '#122131',
                    borderColor: isExpanded ? '#52b788' : 'transparent',
                    borderWidth: isExpanded ? 1 : 0,
                  },
                ]}
              >
                {/* Header Row */}
                <TouchableOpacity
                  style={styles.categoryCardHeader}
                  onPress={() => setExpandedId(isExpanded ? null : budget.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.catLeft}>
                    <View style={[styles.catIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                      <Ionicons name={iconName} size={19} color={statusColor} />
                    </View>
                    <View style={styles.catDetails}>
                      <Text style={[styles.catName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {budget.category}
                      </Text>
                      <Text style={[styles.catSub, { color: colors.textMuted }]}>
                        {formatRupee(spent)} / {formatRupee(cap)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catRight}>
                    <View
                      style={[
                        styles.catStatusBadge,
                        {
                          backgroundColor: isOver
                            ? 'rgba(255,180,171,0.15)'
                            : isWarn
                            ? 'rgba(255,202,69,0.15)'
                            : 'rgba(82,183,136,0.15)',
                        },
                      ]}
                    >
                      <Text style={[styles.catStatusText, { color: statusColor }]}>
                        {isOver ? `Over by ${formatRupee(spent - cap)}` : `${formatRupee(left)} left`}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Meter Bar */}
                <View style={[styles.catMeterTrack, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
                  <View
                    style={[
                      styles.catMeterFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>

                {/* Expanded Action Panel */}
                {isExpanded && (
                  <View style={styles.expandedPanel}>
                    <View style={styles.quickAdjustRow}>
                      <Text style={[styles.quickAdjustLabel, { color: colors.textMuted }]}>
                        Quick Ceiling Adjust
                      </Text>
                      <View style={styles.adjustPills}>
                        <TouchableOpacity
                          style={[styles.adjustPill, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                          onPress={() => handleQuickAdjust(budget, -50)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.adjustPillText, { color: colors.textPrimary }]}>-₹50</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.adjustPill, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                          onPress={() => handleQuickAdjust(budget, 50)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.adjustPillText, { color: colors.textPrimary }]}>+₹50</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.adjustPill, { backgroundColor: 'rgba(82,183,136,0.18)' }]}
                          onPress={() => handleQuickAdjust(budget, 250)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.adjustPillText, { color: '#52b788', fontWeight: '700' }]}>+₹250</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.actionButtonsGrid}>
                      <TouchableOpacity
                        style={styles.addExpenseBtn}
                        onPress={() => onOpenAddExpense && onOpenAddExpense(budget.category)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={17} color="#003915" />
                        <Text style={styles.addExpenseBtnText}>Add Expense</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.editCeilingBtn, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                        onPress={() => setEditingBudget(budget)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
                        <Text style={[styles.editCeilingBtnText, { color: colors.textPrimary }]}>
                          Edit Ceiling
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Add New Category Action Button */}
        <TouchableOpacity
          style={[styles.addNewCategoryBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
          onPress={() => {
            addPlannedBudget({
              category: 'New Category',
              planned_amount: 1000,
            });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color="#52b788" />
          <Text style={styles.addNewCategoryText}>Add New Spend Ceiling</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Category Sheet Modal */}
      <EditCategorySheet
        visible={editingBudget !== null}
        budget={editingBudget}
        spentAmount={editingBudget ? categorySpentMap[editingBudget.category.toLowerCase()] || 0 : 0}
        onClose={() => setEditingBudget(null)}
        onSave={(id, updates) => {
          updatePlannedBudget(id, updates);
          setEditingBudget(null);
        }}
        onDelete={(id) => {
          removePlannedBudget(id);
          setEditingBudget(null);
        }}
      />
    </View>
  );
};

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
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthSelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  monthLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  primaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  shieldIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    marginVertical: 14,
    gap: 6,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consumedText: {
    fontSize: 12,
  },
  ratioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsSplitGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricSplitBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
  },
  metricSplitLabel: {
    fontSize: 11,
  },
  metricSplitValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoriesList: {
    gap: 12,
    marginBottom: 16,
  },
  categoryCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catDetails: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catSub: {
    fontSize: 12,
    marginTop: 1,
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  catStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  catStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  catMeterTrack: {
    height: 5,
    borderRadius: 2.5,
    marginTop: 10,
    overflow: 'hidden',
  },
  catMeterFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  expandedPanel: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAdjustLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  adjustPills: {
    flexDirection: 'row',
    gap: 6,
  },
  adjustPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  adjustPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  addExpenseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#52b788',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  addExpenseBtnText: {
    color: '#003915',
    fontSize: 12,
    fontWeight: '700',
  },
  editCeilingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  editCeilingBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addNewCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addNewCategoryText: {
    color: '#52b788',
    fontSize: 13,
    fontWeight: '700',
  },
});
