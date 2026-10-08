import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Account } from '../../core/types/accounts';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate, isDateInMonth } from '../../core/utils/date';

interface BanksScreenProps {
  onOpenAddBank: () => void;
  onEditBank: (bank: Account) => void;
}

export const BanksScreen: React.FC<BanksScreenProps> = ({
  onOpenAddBank,
  onEditBank,
}) => {
  const { colors } = useTheme();
  const {
    accounts,
    transactions,
    obligations,
    investments,
    paidObligationIds,
    payObligation,
    executeSip,
    activeMonth,
  } = useFinanceData();

  // State for expanded bank (null = master overview, bankId = expanded detail)
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  // Filters for Column 1 (Transactions)
  const [txFilter, setTxFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [txSearch, setTxSearch] = useState('');

  // Filters for Column 2 (Scheduled)
  const [schedFilter, setSchedFilter] = useState<'ALL' | 'EMI' | 'SIP'>('ALL');

  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');

  const totalBankCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  const getBankBufferTier = (bank: Account) => {
    const minBal = bank.minimum_balance || 10000;
    const diff = bank.balance - minBal;
    if (diff < 0) {
      return {
        label: 'Below minimum',
        color: colors.danger,
        dotBg: colors.danger,
        isAbove: false,
        diffText: `${formatRupee(Math.abs(diff))} deficit`,
      };
    }
    if (diff <= minBal * 0.10) {
      return {
        label: 'Near minimum (Amber)',
        color: colors.warningText,
        dotBg: colors.warning,
        isAbove: true,
        diffText: `${formatRupee(diff)} buffer`,
      };
    }
    return {
      label: 'Above minimum',
      color: colors.successText,
      dotBg: colors.success,
      isAbove: true,
      diffText: `${formatRupee(diff)} buffer`,
    };
  };

  // Find currently selected bank
  const selectedBank = useMemo(() => {
    if (!selectedBankId) return null;
    return bankAccounts.find((b) => b.id === selectedBankId) || bankAccounts[0] || null;
  }, [bankAccounts, selectedBankId]);

  // Selected bank's transactions (DEF-019: Filtered by activeMonth)
  const bankTxs = useMemo(() => {
    if (!selectedBank) return [];
    return transactions.filter((t) => {
      if (t.account_id !== selectedBank.id) return false;
      if (!activeMonth || activeMonth.toLowerCase() === 'all months') return true;
      return isDateInMonth(t.timestamp, activeMonth);
    });
  }, [transactions, selectedBank, activeMonth]);

  // Filtered transactions for Column 1
  const filteredTxs = useMemo(() => {
    return bankTxs.filter((t) => {
      if (txFilter === 'DEBIT' && t.type !== 'OUTFLOW') return false;
      if (txFilter === 'CREDIT' && t.type !== 'INFLOW') return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const catMatch = (t.category || '').toLowerCase().includes(q);
        return descMatch || catMatch;
      }
      return true;
    });
  }, [bankTxs, txFilter, txSearch]);

  const debitCount = bankTxs.filter((t) => t.type === 'OUTFLOW').length;
  const creditCount = bankTxs.filter((t) => t.type === 'INFLOW').length;

  // Selected bank's scheduled commitments (Column 2: Obligations + SIPs)
  const bankObligations = useMemo(() => {
    if (!selectedBank) return [];
    return obligations.filter((o) => o.linked_account_id === selectedBank.id);
  }, [obligations, selectedBank]);

  const bankSips = useMemo(() => {
    if (!selectedBank) return [];
    return investments.filter(
      (inv) =>
        inv.linked_account_id === selectedBank.id ||
        (inv.type === 'SIP' && inv.monthly_sip_amount && inv.monthly_sip_amount > 0)
    );
  }, [investments, selectedBank]);

  const scheduledCount = bankObligations.length + bankSips.length;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local balance tracking — know exactly what came in, what is scheduled, and what is safe.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Header Row */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.microTag, { color: colors.textMuted }]}>BANK ACCOUNTS • LIVE SNAPSHOT</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Balances and account commitments</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            See what each bank received, what it holds, and what is scheduled from it.
          </Text>
        </View>

        <View style={styles.topActions}>
          {selectedBank && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedBankId(null)}
            >
              <Ionicons name="apps-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>View all accounts</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={onOpenAddBank}>
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add bank account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary KPI Strip */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOTAL BANK CASH</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{formatRupee(totalBankCash)}</Text>
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ACTIVE ACCOUNTS</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{bankAccounts.length} accounts</Text>
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>BUFFER HEALTH</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.kpiValueSub, { color: colors.successText }]}>All safe</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendWrap}>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Healthy buffer</Text>
          </View>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Near min</Text>
          </View>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Below required</Text>
          </View>
        </View>
      </View>

      {/* VIEW MODE 1: MASTER OVERVIEW (Independent Cards with Sidewise Bars Filling Up) */}
      {!selectedBank && (
        <View style={styles.banksGrid}>
          {bankAccounts.map((bank) => {
            const minBal = bank.minimum_balance || 10000;
            const tier = getBankBufferTier(bank);
            // Sidewise bar ratio: percentage of target comfortable buffer
            const bufferProgress = minBal > 0 ? Math.min(100, Math.round((bank.balance / (minBal * 2)) * 100)) : 100;

            return (
              <TouchableOpacity
                key={bank.id}
                activeOpacity={0.9}
                onPress={() => setSelectedBankId(bank.id)}
                style={[
                  styles.masterBankCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                {/* Bank Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.bankIconBox, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="business" size={16} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
                      <Text style={[styles.accountTypeSub, { color: colors.textMuted }]}>
                        Savings account • Verified
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onEditBank(bank);
                    }}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Available Balance */}
                <View style={styles.balanceSection}>
                  <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Available balance</Text>
                  <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>{formatRupee(bank.balance)}</Text>

                  {/* Status condition tag */}
                  <View style={styles.conditionRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.dot, { backgroundColor: tier.dotBg }]} />
                      <Text style={[styles.conditionText, { color: tier.color }]}>
                        {tier.label} • {tier.diffText}
                      </Text>
                    </View>
                    <Text style={[styles.minRequiredText, { color: colors.textMuted }]}>
                      Min {formatRupee(minBal)}
                    </Text>
                  </View>

                  {/* Sidewise bar filling up */}
                  <View style={[styles.track, { backgroundColor: colors.borderSubtle }]}>
                    <View
                      style={[
                        styles.trackFill,
                        {
                          width: `${bufferProgress}%`,
                          backgroundColor: tier.dotBg,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Click to Expand Action Banner */}
                <View style={[styles.expandBanner, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.expandBannerText, { color: colors.primary }]}>
                    Click to view ledger & scheduled commitments
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* VIEW MODE 2: EXPANDED DETAIL VIEW (Side Rail + 2 Columns Layout) */}
      {selectedBank && (
        <View style={styles.expandedWrapper}>
          {/* Back Banner / Breadcrumb */}
          <View style={styles.expandedHeaderRow}>
            <TouchableOpacity
              style={[styles.backToGridBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setSelectedBankId(null)}
            >
              <Ionicons name="arrow-back" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.backToGridText, { color: colors.textPrimary }]}>All accounts</Text>
            </TouchableOpacity>

            <View style={styles.breadcrumbBadge}>
              <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>Active account: </Text>
              <Text style={[styles.breadcrumbTextBold, { color: colors.primary }]}>{selectedBank.name}</Text>
            </View>
          </View>

          <View style={styles.detailSplitLayout}>
            {/* LEFT SIDE RAIL: OTHER BANKS SWITCHER */}
            <View style={[styles.sideRail, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.sideRailHeader}>
                <Text style={[styles.sideRailTitle, { color: colors.textMuted }]}>
                  YOUR ACCOUNTS ({bankAccounts.length})
                </Text>
              </View>

              <View style={styles.sideRailList}>
                {bankAccounts.map((b) => {
                  const isCurrent = b.id === selectedBank.id;
                  const bTier = getBankBufferTier(b);
                  const bMin = b.minimum_balance || 10000;
                  const bProgress = bMin > 0 ? Math.min(100, Math.round((b.balance / (bMin * 2)) * 100)) : 100;

                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setSelectedBankId(b.id)}
                      style={[
                        styles.sideRailItem,
                        { borderColor: isCurrent ? colors.primary : colors.borderSubtle },
                        isCurrent && { backgroundColor: '#F0FDF4' },
                      ]}
                    >
                      <View style={styles.sideRailItemTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.sideRailDot, { backgroundColor: bTier.dotBg }]} />
                          <Text
                            style={[
                              styles.sideRailCardName,
                              { color: colors.textPrimary, fontWeight: isCurrent ? '700' : '600' },
                            ]}
                            numberOfLines={1}
                          >
                            {b.name}
                          </Text>
                        </View>
                      </View>

                      {/* Mini sidewise buffer bar */}
                      <View style={[styles.sideRailTrack, { backgroundColor: colors.borderSubtle }]}>
                        <View
                          style={[
                            styles.sideRailTrackFill,
                            {
                              width: `${bProgress}%`,
                              backgroundColor: bTier.dotBg,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.sideRailAmountsRow}>
                        <Text style={[styles.sideRailUsageText, { color: colors.textPrimary }]}>
                          {formatRupee(b.balance)}
                        </Text>
                        <Text style={[styles.sideRailLimitText, { color: bTier.color }]}>
                          {bTier.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.sideRailAddBtn, { borderColor: colors.border }]}
                onPress={onOpenAddBank}
              >
                <Ionicons name="add" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sideRailAddBtnText, { color: colors.textSecondary }]}>Add another bank</Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT MAIN CANVAS: ACTIVE BANK HERO + 2-COLUMN DISPLAY */}
            <View style={styles.mainCanvas}>
              {/* Selected Bank Hero Overview */}
              {(() => {
                const minBal = selectedBank.minimum_balance || 10000;
                const tier = getBankBufferTier(selectedBank);
                const bufferProgress = minBal > 0 ? Math.min(100, Math.round((selectedBank.balance / (minBal * 2)) * 100)) : 100;
                const safeSpend = Math.max(0, selectedBank.balance - minBal);

                return (
                  <View
                    style={[
                      styles.heroBankBanner,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={styles.heroTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.heroBankBadge, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name="business" size={20} color={colors.primary} />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.heroBankName, { color: colors.textPrimary }]}>
                              {selectedBank.name}
                            </Text>
                            <View style={[styles.heroStatusChip, { backgroundColor: tier.dotBg + '20' }]}>
                              <View style={[styles.dot, { backgroundColor: tier.dotBg }]} />
                              <Text style={[styles.heroStatusChipText, { color: tier.color }]}>
                                {tier.label}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.heroBankSub, { color: colors.textMuted }]}>
                            Primary savings ledger • Min balance requirement: {formatRupee(minBal)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.heroEditBtn, { borderColor: colors.border }]}
                        onPress={() => onEditBank(selectedBank)}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.heroEditBtnText, { color: colors.textSecondary }]}>Edit account</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Sidewise Progress Bar */}
                    <View style={{ marginTop: 14 }}>
                      <View style={styles.heroStatsRow}>
                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>TOTAL BALANCE</Text>
                          <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>
                            {formatRupee(selectedBank.balance)}
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>SAFE TO SPEND (ABOVE MIN)</Text>
                          <Text style={[styles.heroStatValue, { color: colors.successText }]}>
                            {formatRupee(safeSpend)}
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>REQUIRED MINIMUM</Text>
                          <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>
                            {formatRupee(minBal)}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.heroTrack, { backgroundColor: colors.borderSubtle }]}>
                        <View
                          style={[
                            styles.heroTrackFill,
                            {
                              width: `${bufferProgress}%`,
                              backgroundColor: tier.dotBg,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* TWO SEPARATE COLUMNS (LIKE THE THIRD PIC) */}
              <View style={styles.twoColumnsContainer}>
                {/* COLUMN 1: TRANSACTIONS / MOVEMENTS IN THIS BANK */}
                <View
                  style={[
                    styles.columnCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.columnHeader}>
                    <View>
                      <Text style={[styles.columnMicro, { color: colors.textMuted }]}>COLUMN 1 • ACCOUNT MOVEMENTS</Text>
                      <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>
                        Account ledger ({bankTxs.length})
                      </Text>
                    </View>
                  </View>

                  {/* Filter Pills (Styled like user's screenshot) */}
                  <View style={styles.filterPillsRow}>
                    <TouchableOpacity
                      onPress={() => setTxFilter('ALL')}
                      style={[
                        styles.filterPill,
                        txFilter === 'ALL'
                          ? { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }
                          : { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: txFilter === 'ALL' ? colors.textPrimary : colors.textMuted },
                          txFilter === 'ALL' && { fontWeight: '700' },
                        ]}
                      >
                        All {bankTxs.length}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setTxFilter('DEBIT')}
                      style={[
                        styles.filterPill,
                        txFilter === 'DEBIT'
                          ? { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }
                          : { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: txFilter === 'DEBIT' ? colors.textPrimary : colors.textMuted },
                          txFilter === 'DEBIT' && { fontWeight: '700' },
                        ]}
                      >
                        Debited {debitCount}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setTxFilter('CREDIT')}
                      style={[
                        styles.filterPill,
                        txFilter === 'CREDIT'
                          ? { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }
                          : { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: txFilter === 'CREDIT' ? colors.textPrimary : colors.textMuted },
                          txFilter === 'CREDIT' && { fontWeight: '700' },
                        ]}
                      >
                        Credited {creditCount}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Search input */}
                  <View style={[styles.searchBox, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}>
                    <Ionicons name="search-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      placeholder="Search account entries..."
                      placeholderTextColor={colors.textMuted}
                      value={txSearch}
                      onChangeText={setTxSearch}
                    />
                    {txSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setTxSearch('')}>
                        <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Transaction List */}
                  <View style={styles.txListContainer}>
                    {filteredTxs.length > 0 ? (
                      filteredTxs.map((tx) => {
                        const isIncome = tx.type === 'INFLOW';
                        return (
                          <View
                            key={tx.id}
                            style={[
                              styles.txItemRow,
                              { borderBottomColor: colors.borderSubtle },
                            ]}
                          >
                            <View style={[styles.txIconBox, { backgroundColor: isIncome ? '#DCFCE7' : '#F1F5F9' }]}>
                              <Ionicons
                                name={isIncome ? 'arrow-down' : 'arrow-up'}
                                size={14}
                                color={isIncome ? '#15803D' : colors.textSecondary}
                              />
                            </View>

                            <View style={{ flex: 1, marginRight: 10 }}>
                              <Text style={[styles.txTitleText, { color: colors.textPrimary }]} numberOfLines={1}>
                                {tx.description || tx.category}
                              </Text>
                              <Text style={[styles.txDateText, { color: colors.textMuted }]}>
                                {safeFormatDate(tx.timestamp, 'en-US', { month: 'short', day: '2-digit' })} • {tx.category}
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text
                                style={[
                                  styles.txAmountText,
                                  { color: isIncome ? colors.successText : colors.textPrimary },
                                ]}
                              >
                                {isIncome ? '+' : '-'}{formatRupee(tx.amount)}
                              </Text>
                              <View
                                style={[
                                  styles.txTypeBadge,
                                  { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.txTypeBadgeText,
                                    { color: isIncome ? '#15803D' : '#B91C1C' },
                                  ]}
                                >
                                  {isIncome ? 'Credited' : 'Debited'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.emptyColumnBox}>
                        <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
                        <Text style={[styles.emptyColumnText, { color: colors.textMuted }]}>
                          No transactions found on this account.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* COLUMN 2: SCHEDULED COMMITMENTS (EMIs, SUBSCRIPTIONS & SIPs) */}
                <View
                  style={[
                    styles.columnCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.columnHeader}>
                    <View>
                      <Text style={[styles.columnMicro, { color: colors.textMuted }]}>COLUMN 2 • COMMITMENTS</Text>
                      <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>
                        Scheduled from this account ({scheduledCount})
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.columnSubDesc, { color: colors.textMuted }]}>
                    Recurring EMIs, subscriptions and SIP investments debited from this bank.
                  </Text>

                  {/* Scheduled items list */}
                  <View style={styles.linkedListContainer}>
                    {/* Render Bank Obligations (EMIs / Subscriptions / Loans) */}
                    {bankObligations.map((ob) => {
                      const isPaid = paidObligationIds[ob.id];
                      const isEmi = ob.type === 'EMI';
                      return (
                        <View
                          key={ob.id}
                          style={[
                            styles.linkedObCard,
                            { backgroundColor: colors.background, borderColor: colors.borderSubtle },
                          ]}
                        >
                          <View style={styles.linkedObTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View
                                style={[
                                  styles.obTypeTag,
                                  { backgroundColor: isEmi ? '#FEF3C7' : '#EDE9FE' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.obTypeTagText,
                                    { color: isEmi ? '#B45309' : '#6D28D9' },
                                  ]}
                                >
                                  {isEmi ? 'EMI' : ob.type === 'SUBSCRIPTION' ? 'Subscription' : 'Loan'}
                                </Text>
                              </View>
                              <Text style={[styles.linkedObName, { color: colors.textPrimary }]}>
                                {ob.name}
                              </Text>
                            </View>

                            <Text style={[styles.linkedObAmount, { color: colors.textPrimary }]}>
                              {formatRupee(ob.amount)}
                              <Text style={{ fontSize: 11, fontWeight: '400', color: colors.textMuted }}> /mo</Text>
                            </Text>
                          </View>

                          <View style={styles.linkedObMetaRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                              <Text style={[styles.linkedObMetaText, { color: colors.textMuted }]}>
                                Debits on {ob.due_day}th every month
                              </Text>
                            </View>

                            {isEmi && ob.total_tenure_months && (
                              <Text style={[styles.tenureBadge, { color: colors.textSecondary }]}>
                                Tenure: {ob.total_tenure_months} mo
                              </Text>
                            )}
                          </View>

                          {/* Paid Action Button */}
                          <View style={styles.obActionRow}>
                            <TouchableOpacity
                              style={[
                                styles.payStatusBtn,
                                isPaid
                                  ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                                  : { backgroundColor: colors.surface, borderColor: colors.border },
                              ]}
                              onPress={() => payObligation(ob.id)}
                            >
                              <Ionicons
                                name={isPaid ? 'checkmark-circle' : 'time-outline'}
                                size={14}
                                color={isPaid ? '#15803D' : colors.textSecondary}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.payStatusBtnText,
                                  { color: isPaid ? '#15803D' : colors.textSecondary },
                                ]}
                              >
                                {isPaid ? 'Paid for this month' : 'Mark as paid'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {/* Render Bank SIP Investments */}
                    {bankSips.map((sip) => (
                      <View
                        key={sip.id}
                        style={[
                          styles.linkedObCard,
                          { backgroundColor: colors.background, borderColor: colors.borderSubtle },
                        ]}
                      >
                        <View style={styles.linkedObTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.obTypeTag, { backgroundColor: '#CCFBF1' }]}>
                              <Text style={[styles.obTypeTagText, { color: '#0F766E' }]}>SIP</Text>
                            </View>
                            <Text style={[styles.linkedObName, { color: colors.textPrimary }]}>
                              {sip.name}
                            </Text>
                          </View>

                          <Text style={[styles.linkedObAmount, { color: colors.textPrimary }]}>
                            {formatRupee(sip.monthly_sip_amount || 0)}
                            <Text style={{ fontSize: 11, fontWeight: '400', color: colors.textMuted }}> /mo</Text>
                          </Text>
                        </View>

                        <View style={styles.linkedObMetaRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="trending-up-outline" size={13} color="#0F766E" style={{ marginRight: 4 }} />
                            <Text style={[styles.linkedObMetaText, { color: colors.textMuted }]}>
                              Debits on {sip.sip_due_day || 5}th • Portfolio: {formatRupee(sip.current_value)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.obActionRow}>
                          <TouchableOpacity
                            style={[styles.payStatusBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                            onPress={() => executeSip(sip.id)}
                          >
                            <Ionicons name="sparkles" size={13} color="#15803D" style={{ marginRight: 4 }} />
                            <Text style={[styles.payStatusBtnText, { color: '#15803D' }]}>Execute monthly SIP</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {scheduledCount === 0 && (
                      <View style={styles.emptyColumnBox}>
                        <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
                        <Text style={[styles.emptyColumnText, { color: colors.textMuted }]}>
                          No EMI, subscription or SIP linked to this bank account.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiItem: {
    marginRight: 10,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiValueSub: {
    fontSize: 14,
    fontWeight: '700',
  },
  kpiDivider: {
    width: 1,
    height: 32,
  },
  legendWrap: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  // Master Overview Banks Grid
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  masterBankCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingBottom: 12,
  },
  bankIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountTypeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
  },
  balanceSection: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 10,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  minRequiredText: {
    fontSize: 11,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  expandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  expandBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Expanded Detail Layout
  expandedWrapper: {
    gap: 16,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backToGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  backToGridText: {
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 12,
  },
  breadcrumbTextBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailSplitLayout: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  // Left Side Rail
  sideRail: {
    width: 270,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sideRailHeader: {
    marginBottom: 4,
  },
  sideRailTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sideRailList: {
    gap: 10,
  },
  sideRailItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  sideRailItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideRailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  sideRailCardName: {
    fontSize: 12,
  },
  sideRailTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sideRailTrackFill: {
    height: '100%',
    borderRadius: 2,
  },
  sideRailAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideRailUsageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sideRailLimitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sideRailAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  sideRailAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Right Main Canvas
  mainCanvas: {
    flex: 1,
    minWidth: 340,
    gap: 16,
  },
  heroBankBanner: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBankBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBankName: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  heroStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroBankSub: {
    fontSize: 12,
    marginTop: 2,
  },
  heroEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  heroTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Two Columns
  twoColumnsContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  columnCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  columnMicro: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  columnTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  columnSubDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  txListContainer: {
    gap: 4,
  },
  txItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txTitleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  txDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  txTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  txTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyColumnBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyColumnText: {
    fontSize: 12,
  },
  linkedListContainer: {
    gap: 10,
  },
  linkedObCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  linkedObTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  obTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  obTypeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  linkedObName: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkedObAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  linkedObMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkedObMetaText: {
    fontSize: 11,
  },
  tenureBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  obActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  payStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  payStatusBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
