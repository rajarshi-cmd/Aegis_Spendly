import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Header } from '../../presentation/components/Header';
import { Badge } from '../../presentation/components/Badge';
import { AddTransactionModal } from './forms/AddTransactionModal';
import { DebtsScreen } from '../debts/DebtsScreen';
import { Transaction, TransactionType } from '../../core/types';
import { theme } from '../../presentation/theme';
import { safeFormatDate } from '../../core/utils/date';
import { formatRupee } from '../../core/utils/currency';


export const LedgerScreen: React.FC = () => {
  const { accounts, transactions, loading, refreshData, addTransaction } = useFinanceData();

  const [subTab, setSubTab] = useState<'JOURNAL' | 'P2P_DEBTS'>('JOURNAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type segment filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
        return false;
      }
      // Account filter
      if (selectedAccountId !== 'ALL' && tx.account_id !== selectedAccountId) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        const ref = (tx.reference_number || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q) && !ref.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, selectedAccountId, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const renderTransactionRow = ({ item, index }: { item: Transaction; index: number }) => {
    const isEven = index % 2 === 0;
    const isPositive = item.type === 'INFLOW';
    const accountName = accountMap.get(item.account_id) || 'Account';
    const dateStr = safeFormatDate(item.timestamp, 'en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <View
        style={[
          styles.tableRow,
          isEven ? styles.rowEven : styles.rowOdd,
        ]}
      >
        {/* Column 1: Date & Note */}
        <View style={styles.colDetails}>
          <Text style={styles.cellDate}>{dateStr}</Text>
          <Text style={styles.cellNote} numberOfLines={1}>
            {item.description || item.category}
          </Text>
          <Text style={styles.cellAccount} numberOfLines={1}>
            {accountName} {item.reference_number ? `• #${item.reference_number}` : ''}
          </Text>
        </View>

        {/* Column 2: Category Badge Chip */}
        <View style={styles.colCategory}>
          <Badge label={item.category} size="sm" variant="info" />
        </View>

        {/* Column 3: Right-Aligned Monetary Value */}
        <View style={styles.colAmount}>
          <Text
            style={[
              styles.cellAmount,
              { color: isPositive ? theme.colors.success : theme.colors.textPrimary },
            ]}
          >
            {isPositive ? '+' : '-'}{formatRupee(item.amount, { decimals: 2 })}
          </Text>

          <Text style={styles.cellType}>{item.type}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Ledger Journal"
        subtitle="Double-entry movement records"
        rightAction={
          <TouchableOpacity
            style={styles.newEntryButton}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newEntryButtonText}>New Entry</Text>
          </TouchableOpacity>
        }
      />

      {/* Mode Switcher: Ledger Journal vs P2P Loans */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'JOURNAL' && styles.subTabBtnActive]}
          onPress={() => setSubTab('JOURNAL')}
        >
          <Text style={[styles.subTabText, subTab === 'JOURNAL' && styles.subTabTextActive]}>
            Ledger Journal Movements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'P2P_DEBTS' && styles.subTabBtnActive]}
          onPress={() => setSubTab('P2P_DEBTS')}
        >
          <Text style={[styles.subTabText, subTab === 'P2P_DEBTS' && styles.subTabTextActive]}>
            P2P Loans & Debts
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'P2P_DEBTS' ? (
        <DebtsScreen />
      ) : (
        <>
          {/* Search Input Bar */}
          <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by description, category, or ref..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Segment Controls (ALL / OUTFLOW / INFLOW) */}
      <View style={styles.segmentContainer}>
        {[
          { label: 'All Movements', val: 'ALL' as const },
          { label: 'Debits', val: 'OUTFLOW' as const },
          { label: 'Credits', val: 'INFLOW' as const },
        ].map((seg) => {
          const isSelected = typeFilter === seg.val;
          return (
            <TouchableOpacity
              key={seg.val}
              style={[styles.segmentTab, isSelected && styles.segmentTabActive]}
              onPress={() => setTypeFilter(seg.val)}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  isSelected && styles.segmentTabTextActive,
                ]}
              >
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account filter chips */}
      <View style={styles.accountChipsBar}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedAccountId === 'ALL' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedAccountId('ALL')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedAccountId === 'ALL' && styles.filterChipTextActive,
            ]}
          >
            All Accounts
          </Text>
        </TouchableOpacity>
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setSelectedAccountId(acc.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {acc.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ledger Grid Header */}
      <View style={styles.gridHeader}>
        <Text style={[styles.gridHeaderText, styles.colDetails]}>Date & Details</Text>
        <Text style={[styles.gridHeaderText, styles.colCategory]}>Category</Text>
        <Text style={[styles.gridHeaderText, styles.colAmount, { textAlign: 'right' }]}>Amount</Text>
      </View>

      {/* FlatList Structured Grid */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No matching ledger movements found</Text>
          </View>
        }
      />
    </>
  )}

      <AddTransactionModal
        visible={isModalOpen}
        accounts={accounts}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (input) => {
          await addTransaction(input);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    padding: 3,
    marginBottom: theme.spacing.sm,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  subTabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  newEntryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    padding: 3,
    marginBottom: theme.spacing.sm,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentTabActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accountChipsBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  gridHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowEven: {
    backgroundColor: '#0F172A',
  },
  rowOdd: {
    backgroundColor: '#131D31',
  },
  colDetails: {
    flex: 4,
    paddingRight: 6,
  },
  colCategory: {
    flex: 3,
    alignItems: 'flex-start',
  },
  colAmount: {
    flex: 3,
    alignItems: 'flex-end',
  },
  cellDate: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  cellNote: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cellAccount: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cellAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cellType: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});
