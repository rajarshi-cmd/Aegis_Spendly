import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useFinanceData } from '../../hooks/useFinanceData';
import { RecurringObligation } from '../../../core/types/upcoming';
import { Account } from '../../../core/types/accounts';
import { formatRupee } from '../../../core/utils/currency';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenEditObligation?: (obId: string) => void;
}

type FilterType = 'all' | 'upcoming' | 'subscriptions';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onOpenEditObligation,
}) => {
  const { colors } = useTheme();
  const {
    obligations,
    creditCards,
    payObligation,
    accounts,
  } = useFinanceData();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter items
  const duesList: RecurringObligation[] = obligations.filter((o: RecurringObligation) => {
    if (activeFilter === 'upcoming') return o.type === 'EMI' || o.type === 'LOAN';
    if (activeFilter === 'subscriptions') return o.type === 'SUBSCRIPTION';
    return true;
  });

  const handlePay = async (id: string) => {
    try {
      await payObligation(id);
    } catch (e) {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.surfaceContainerLow || '#0d1c2d', borderColor: colors.borderSubtle },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Subtle Glow Line & Handle */}
          <View style={[styles.glowLine, { backgroundColor: colors.primary }]} />
          <View style={styles.handleWrap}>
            <View style={[styles.grabHandle, { backgroundColor: colors.surfaceVariant || '#273647' }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight || 'rgba(82, 183, 136, 0.15)' }]}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.primaryLight || 'rgba(82, 183, 136, 0.15)', borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>{duesList.length} Dues</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(['all', 'upcoming', 'subscriptions'] as FilterType[]).map((f) => {
              const isSelected = activeFilter === f;
              const label = f === 'all' ? `All (${obligations.length})` : f === 'upcoming' ? 'Upcoming' : 'Subscriptions';
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryHover || '#2d6a4f'
                        : colors.surfaceContainer || '#122131',
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? '#FFFFFF' : colors.textMuted },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dues Feed */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {duesList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
                  <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Inbox Clear</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  No active dues or obligations under this filter.
                </Text>
              </View>
            ) : (
              duesList.map((item: RecurringObligation) => {
                const isExpanded = expandedId === item.id;
                const linkedAcc = accounts.find((a: Account) => a.id === item.linked_account_id);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: colors.surfaceContainer || '#122131',
                        borderColor: isExpanded ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    {/* Item Row */}
                    <TouchableOpacity
                      style={styles.itemHeader}
                      onPress={() => setExpandedId(isExpanded ? null : item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.itemHeaderLeft}>
                        <View style={[styles.itemIcon, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                          <Ionicons
                            name={
                              item.type === 'SUBSCRIPTION'
                                ? 'film-outline'
                                : item.type === 'EMI'
                                ? 'business-outline'
                                : 'cash-outline'
                            }
                            size={18}
                            color={colors.secondary || '#ffca45'}
                          />
                        </View>
                        <View style={styles.itemMeta}>
                          <View style={styles.statusRow}>
                            <Text style={[styles.dueBadge, { color: colors.secondary || '#ffca45' }]}>
                              Due Day {item.due_day}
                            </Text>
                            <View style={[styles.smallDot, { backgroundColor: colors.textMuted }]} />
                            <Text style={[styles.typeText, { color: colors.textMuted }]}>{item.type}</Text>
                          </View>
                          <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemHeaderRight}>
                        <Text style={[styles.itemAmount, { color: colors.textPrimary }]}>
                          {formatRupee(item.amount)}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Detail Tray */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={[styles.detailBox, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Linked Account</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                              {linkedAcc?.name || 'Primary Bank'}
                            </Text>
                          </View>
                          {item.remaining_tenure_months !== null && (
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Remaining Tenure</Text>
                              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {item.remaining_tenure_months} of {item.total_tenure_months || item.remaining_tenure_months} mo
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Quick Action Buttons */}
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={[styles.payBtn, { backgroundColor: colors.primaryHover || '#2d6a4f' }]}
                            onPress={() => handlePay(item.id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.payBtnText}>Pay Now</Text>
                          </TouchableOpacity>

                          {onOpenEditObligation && (
                            <TouchableOpacity
                              style={[
                                styles.editBtn,
                                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
                              ]}
                              onPress={() => {
                                onClose();
                                onOpenEditObligation(item.id);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
                              <Text style={[styles.editBtnText, { color: colors.textPrimary }]}>Edit</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  glowLine: {
    height: 2,
    width: '100%',
    opacity: 0.7,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  scrollList: {
    maxHeight: 450,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 20,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dueBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  smallDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  typeText: {
    fontSize: 11,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  detailBox: {
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
