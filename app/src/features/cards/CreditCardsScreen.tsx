import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../presentation/theme';
import { useFinanceData } from '../../presentation/hooks/useFinanceData';
import { Account } from '../../core/types/accounts';
import { formatRupee } from '../../core/utils/currency';
import { safeFormatDate } from '../../core/utils/date';

interface CreditCardsScreenProps {
  onOpenAddCard: () => void;
  onEditCard: (card: Account) => void;
}

export const CreditCardsScreen: React.FC<CreditCardsScreenProps> = ({
  onOpenAddCard,
  onEditCard,
}) => {
  const { colors } = useTheme();
  const { accounts, transactions, obligations, paidObligationIds, payObligation } = useFinanceData();

  // State for expanded card (null = master overview, cardId = expanded detail)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Filters for Column 1 (Transactions)
  const [txFilter, setTxFilter] = useState<'ALL' | 'EXPENSE' | 'CREDIT'>('ALL');
  const [txSearch, setTxSearch] = useState('');

  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const totalLimit = creditCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  const totalUsage = creditCards.reduce((sum, c) => sum + c.balance, 0);
  const aggregatePct = totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 1000) / 10 : 0;

  const getCardColor = (c: Account) => {
    if (c.card_color === 'PURPLE' || c.name.toLowerCase().includes('axis') || c.name.toLowerCase().includes('ace')) {
      return colors.cardSkinPurple;
    }
    if (c.card_color === 'CARAMEL' || c.name.toLowerCase().includes('coral') || c.name.toLowerCase().includes('icici')) {
      return colors.cardSkinCaramel;
    }
    return colors.cardSkinEmerald;
  };

  const getUtilTier = (util: number) => {
    if (util > 30) return { label: 'Attention', color: colors.danger, dotBg: colors.danger };
    if (util > 15) return { label: 'Watch', color: colors.warningText, dotBg: colors.warning };
    return { label: 'Healthy', color: colors.successText, dotBg: colors.success };
  };

  // Find currently selected card
  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return creditCards.find((c) => c.id === selectedCardId) || creditCards[0] || null;
  }, [creditCards, selectedCardId]);

  // Selected card's transactions
  const cardTxs = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter((t) => t.account_id === selectedCard.id);
  }, [transactions, selectedCard]);

  // Filtered transactions for Column 1
  const filteredTxs = useMemo(() => {
    return cardTxs.filter((t) => {
      if (txFilter === 'EXPENSE' && t.type !== 'OUTFLOW') return false;
      if (txFilter === 'CREDIT' && t.type !== 'INFLOW') return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const catMatch = (t.category || '').toLowerCase().includes(q);
        return descMatch || catMatch;
      }
      return true;
    });
  }, [cardTxs, txFilter, txSearch]);

  const expenseCount = cardTxs.filter((t) => t.type === 'OUTFLOW').length;
  const creditCount = cardTxs.filter((t) => t.type === 'INFLOW').length;

  // Selected card's linked recurring costs (Column 2)
  const linkedObs = useMemo(() => {
    if (!selectedCard) return [];
    return obligations.filter((o) => o.linked_account_id === selectedCard.id);
  }, [obligations, selectedCard]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Banner */}
      <View style={[styles.demoBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.demoBannerLeft}>
          <Ionicons name="sparkles" size={14} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.demoBannerText}>
            Local credit management — track billing cycles and limits without sharing card numbers or CVVs.
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
      </View>

      {/* Header Row */}
      <View style={styles.subHeader}>
        <View>
          <Text style={[styles.microTag, { color: colors.textMuted }]}>YOUR PAYMENT SOURCES</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Credit cards</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Track cycles without sharing card numbers.
          </Text>
        </View>

        <View style={styles.topActions}>
          {selectedCard && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedCardId(null)}
            >
              <Ionicons name="apps-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>View all cards</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={onOpenAddCard}>
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add card</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary KPI Strip */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOTAL LIMIT</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{formatRupee(totalLimit)}</Text>
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>CURRENT USAGE</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{formatRupee(totalUsage)}</Text>
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ACROSS {creditCards.length} CARDS</Text>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{aggregatePct}%</Text>
        </View>

        {/* Legend */}
        <View style={styles.legendWrap}>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>0-15% healthy</Text>
          </View>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>15-30% watch</Text>
          </View>
          <View style={styles.legendEntry}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>30%+ attention</Text>
          </View>
        </View>
      </View>

      {/* VIEW MODE 1: MASTER OVERVIEW (Cards Grid with sidewise bars filling up) */}
      {!selectedCard && (
        <View style={styles.cardsGrid}>
          {creditCards.map((card) => {
            const limit = card.credit_limit || 50000;
            const usage = card.balance;
            const util = limit > 0 ? Math.round((usage / limit) * 1000) / 10 : 0;
            const skinBg = getCardColor(card);
            const tier = getUtilTier(util);

            return (
              <TouchableOpacity
                key={card.id}
                activeOpacity={0.9}
                onPress={() => setSelectedCardId(card.id)}
                style={[
                  styles.masterCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                {/* Visual Card Face */}
                <View style={[styles.physicalCard, { backgroundColor: skinBg }]}>
                  <View style={styles.physicalCardTop}>
                    <Text style={styles.spendlyLogo}>spendly</Text>
                    <Ionicons name="card-outline" size={20} color="rgba(255,255,255,0.7)" />
                  </View>

                  <View style={styles.chipRow}>
                    <View style={styles.cardChip} />
                  </View>

                  <View style={styles.physicalCardBottom}>
                    <View>
                      <Text style={styles.cardMasked}>•• {card.last4 || '4812'}</Text>
                      <Text style={styles.cardHolderName}>{card.name}</Text>
                    </View>
                    <Text style={styles.trackingTag}>Digital • Tracking only</Text>
                  </View>
                </View>

                {/* Card Meta Row */}
                <View style={styles.cardMetaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.cardMiniIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="card" size={14} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.metaCardName, { color: colors.textPrimary }]}>{card.name}</Text>
                      <Text style={[styles.metaMasked, { color: colors.textMuted }]}>•• {card.last4 || '4812'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onEditCard(card);
                    }}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Utilization Progress Bar */}
                <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
                  <View style={styles.utilRow}>
                    <Text style={[styles.utilNumbers, { color: colors.textPrimary }]}>
                      {formatRupee(usage)}{' '}
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '400' }}>
                        used of {formatRupee(limit)}
                      </Text>
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.dot, { backgroundColor: tier.dotBg }]} />
                      <Text style={[styles.utilTierText, { color: tier.color }]}>
                        {util}% • {tier.label}
                      </Text>
                    </View>
                  </View>

                  {/* Sidewise bar filling up */}
                  <View style={[styles.track, { backgroundColor: colors.borderSubtle }]}>
                    <View
                      style={[
                        styles.trackFill,
                        {
                          width: `${Math.min(100, util)}%`,
                          backgroundColor: tier.dotBg,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.dueDatesRow}>
                    <Text style={[styles.dueDateLabel, { color: colors.textMuted }]}>
                      Bill generated {card.billing_cycle_cut_day || 10}th
                    </Text>
                    <Text style={[styles.dueDateLabel, { color: colors.textMuted }]}>
                      Due {card.payment_due_day || 25} Nov
                    </Text>
                  </View>
                </View>

                {/* Click to Expand Action Banner */}
                <View style={[styles.expandBanner, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.expandBannerText, { color: colors.primary }]}>
                    Click to view ledger & linked EMIs
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* VIEW MODE 2: EXPANDED DETAIL VIEW (Side Rail + 2 Columns Layout) */}
      {selectedCard && (
        <View style={styles.expandedWrapper}>
          {/* Back Banner / Breadcrumb */}
          <View style={styles.expandedHeaderRow}>
            <TouchableOpacity
              style={[styles.backToGridBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setSelectedCardId(null)}
            >
              <Ionicons name="arrow-back" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.backToGridText, { color: colors.textPrimary }]}>All cards</Text>
            </TouchableOpacity>

            <View style={styles.breadcrumbBadge}>
              <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>Active card: </Text>
              <Text style={[styles.breadcrumbTextBold, { color: colors.primary }]}>{selectedCard.name}</Text>
            </View>
          </View>

          <View style={styles.detailSplitLayout}>
            {/* LEFT SIDE RAIL: OTHER CARDS SWITCHER */}
            <View style={[styles.sideRail, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.sideRailHeader}>
                <Text style={[styles.sideRailTitle, { color: colors.textMuted }]}>YOUR CARDS ({creditCards.length})</Text>
              </View>

              <View style={styles.sideRailList}>
                {creditCards.map((c) => {
                  const isCurrent = c.id === selectedCard.id;
                  const cLimit = c.credit_limit || 50000;
                  const cUtil = cLimit > 0 ? Math.round((c.balance / cLimit) * 1000) / 10 : 0;
                  const cTier = getUtilTier(cUtil);

                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setSelectedCardId(c.id)}
                      style={[
                        styles.sideRailItem,
                        { borderColor: isCurrent ? colors.primary : colors.borderSubtle },
                        isCurrent && { backgroundColor: '#F0FDF4' },
                      ]}
                    >
                      <View style={styles.sideRailItemTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.sideRailDot, { backgroundColor: cTier.dotBg }]} />
                          <Text
                            style={[
                              styles.sideRailCardName,
                              { color: colors.textPrimary, fontWeight: isCurrent ? '700' : '600' },
                            ]}
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                        </View>
                        <Text style={[styles.sideRailCardDigits, { color: colors.textMuted }]}>•• {c.last4 || '4812'}</Text>
                      </View>

                      {/* Mini sidewise progress bar */}
                      <View style={[styles.sideRailTrack, { backgroundColor: colors.borderSubtle }]}>
                        <View
                          style={[
                            styles.sideRailTrackFill,
                            {
                              width: `${Math.min(100, cUtil)}%`,
                              backgroundColor: cTier.dotBg,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.sideRailAmountsRow}>
                        <Text style={[styles.sideRailUsageText, { color: colors.textPrimary }]}>
                          {formatRupee(c.balance)}
                        </Text>
                        <Text style={[styles.sideRailLimitText, { color: cTier.color }]}>
                          {cUtil}% {cTier.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.sideRailAddBtn, { borderColor: colors.border }]}
                onPress={onOpenAddCard}
              >
                <Ionicons name="add" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sideRailAddBtnText, { color: colors.textSecondary }]}>Add another card</Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT MAIN CANVAS: ACTIVE CARD HERO + 2-COLUMN DISPLAY */}
            <View style={styles.mainCanvas}>
              {/* Selected Card Hero Overview */}
              {(() => {
                const limit = selectedCard.credit_limit || 50000;
                const usage = selectedCard.balance;
                const util = limit > 0 ? Math.round((usage / limit) * 1000) / 10 : 0;
                const tier = getUtilTier(util);
                const skinBg = getCardColor(selectedCard);
                const available = Math.max(0, limit - usage);

                return (
                  <View
                    style={[
                      styles.heroCardBanner,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={styles.heroTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.heroSkinBadge, { backgroundColor: skinBg }]}>
                          <Ionicons name="card" size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.heroCardName, { color: colors.textPrimary }]}>
                              {selectedCard.name}
                            </Text>
                            <View style={[styles.heroStatusChip, { backgroundColor: tier.dotBg + '20' }]}>
                              <View style={[styles.dot, { backgroundColor: tier.dotBg }]} />
                              <Text style={[styles.heroStatusChipText, { color: tier.color }]}>
                                {util}% {tier.label}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.heroCardSub, { color: colors.textMuted }]}>
                            •• {selectedCard.last4 || '4812'} • Bill generates {selectedCard.billing_cycle_cut_day || 10}th • Due {selectedCard.payment_due_day || 25} Nov
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.heroEditBtn, { borderColor: colors.border }]}
                        onPress={() => onEditCard(selectedCard)}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.heroEditBtnText, { color: colors.textSecondary }]}>Edit card</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Sidewise Progress Bar */}
                    <View style={{ marginTop: 14 }}>
                      <View style={styles.heroStatsRow}>
                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>CURRENT SPEND / USAGE</Text>
                          <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>
                            {formatRupee(usage)}
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>AVAILABLE CREDIT</Text>
                          <Text style={[styles.heroStatValue, { color: colors.successText }]}>
                            {formatRupee(available)}
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>TOTAL CREDIT LIMIT</Text>
                          <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>
                            {formatRupee(limit)}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.heroTrack, { backgroundColor: colors.borderSubtle }]}>
                        <View
                          style={[
                            styles.heroTrackFill,
                            {
                              width: `${Math.min(100, util)}%`,
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
                {/* COLUMN 1: TRANSACTIONS ON THIS CARD */}
                <View
                  style={[
                    styles.columnCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.columnHeader}>
                    <View>
                      <Text style={[styles.columnMicro, { color: colors.textMuted }]}>COLUMN 1 • LEDGER</Text>
                      <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>
                        Card transactions ({cardTxs.length})
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
                        All {cardTxs.length}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setTxFilter('EXPENSE')}
                      style={[
                        styles.filterPill,
                        txFilter === 'EXPENSE'
                          ? { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }
                          : { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: txFilter === 'EXPENSE' ? colors.textPrimary : colors.textMuted },
                          txFilter === 'EXPENSE' && { fontWeight: '700' },
                        ]}
                      >
                        Expenses {expenseCount}
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
                        Credits {creditCount}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Search input */}
                  <View style={[styles.searchBox, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}>
                    <Ionicons name="search-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      placeholder="Search transactions..."
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
                                name={isIncome ? 'arrow-down' : 'card-outline'}
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
                                  {isIncome ? 'Credited' : 'Expense'}
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
                          No transactions found on this card.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* COLUMN 2: LINKED RECURRING COSTS (EMIs, SUBSCRIPTIONS) */}
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
                        Linked EMIs & subscriptions ({linkedObs.length})
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.columnSubDesc, { color: colors.textMuted }]}>
                    Recurring monthly commitments charged directly to this card.
                  </Text>

                  {/* Obligations list */}
                  <View style={styles.linkedListContainer}>
                    {linkedObs.length > 0 ? (
                      linkedObs.map((ob) => {
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
                                    {isEmi ? 'EMI' : 'Subscription'}
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
                                  Due on {ob.due_day}th every month
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
                      })
                    ) : (
                      <View style={styles.emptyColumnBox}>
                        <Ionicons name="link-outline" size={28} color={colors.textMuted} />
                        <Text style={[styles.emptyColumnText, { color: colors.textMuted }]}>
                          No EMI or subscription linked to this card.
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
  // Master Overview Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  masterCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  physicalCard: {
    margin: 12,
    borderRadius: 12,
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  physicalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendlyLogo: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.3,
  },
  chipRow: {
    marginVertical: 4,
  },
  cardChip: {
    width: 28,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  physicalCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardMasked: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardHolderName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  trackingTag: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '500',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  cardMiniIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaMasked: {
    fontSize: 11,
  },
  iconBtn: {
    padding: 6,
  },
  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  utilNumbers: {
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  utilTierText: {
    fontSize: 11,
    fontWeight: '600',
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
  dueDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  dueDateLabel: {
    fontSize: 11,
  },
  expandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  sideRailCardDigits: {
    fontSize: 11,
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
  heroCardBanner: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSkinBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardName: {
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
  heroCardSub: {
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
