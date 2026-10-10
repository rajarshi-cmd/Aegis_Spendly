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
import { formatRupee, formatCompactRupee } from '../../core/utils/currency';
import { safeFormatDate } from '../../core/utils/date';
import { Account } from '../../core/types/accounts';
import { FinancialCycleModal } from '../../presentation/components/modals/FinancialCycleModal';

export interface ToolsScreenProps {
  initialTab?: 'BANKS' | 'CARDS' | 'WALLET';
  onOpenAddBank?: () => void;
  onOpenAddCard?: () => void;
  onOpenAddWallet?: () => void;
  onOpenAddTool?: () => void;
  onOpenAddEntry?: () => void;
  onEditAccount?: (account: Account) => void;
  onOpenTransfer?: () => void;
  onOpenRecordSpend?: (accountId?: string) => void;
  onOpenPayCardBill?: (cardId?: string) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  initialTab = 'BANKS',
  onOpenAddBank,
  onOpenAddCard,
  onOpenAddWallet,
  onOpenAddTool,
  onOpenAddEntry,
  onEditAccount,
  onOpenTransfer,
  onOpenRecordSpend,
  onOpenPayCardBill,
}) => {
  const { colors } = useTheme();
  const {
    accounts,
    bankAccounts,
    creditCards,
    physicalWallets,
    transactions,
    obligations,
    totalBankCash,
    totalWalletCash,
    totalCreditDebt,
    activeMonth,
    setActiveMonth,
  } = useFinanceData();

  const [activeSegment, setActiveSegment] = useState<'BANKS' | 'CARDS' | 'WALLET'>(initialTab);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Active items list based on segment
  const currentAccountList = useMemo(() => {
    if (activeSegment === 'BANKS') return bankAccounts;
    if (activeSegment === 'CARDS') return creditCards;
    return physicalWallets;
  }, [activeSegment, bankAccounts, creditCards, physicalWallets]);

  // Selected account for deep-dive actions
  const selectedAccount = useMemo(() => {
    if (selectedAccountId) {
      const match = currentAccountList.find((a) => a.id === selectedAccountId);
      if (match) return match;
    }
    return currentAccountList[0] || null;
  }, [selectedAccountId, currentAccountList]);

  // Combined limit for credit cards
  const combinedCreditLimit = useMemo(() => {
    return creditCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  }, [creditCards]);

  // Filtered transactions for selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter(
      (t) => t.account_id === selectedAccount.id || t.destination_account_id === selectedAccount.id
    );
  }, [transactions, selectedAccount]);

  // Linked obligations for selected account
  const linkedObligations = useMemo(() => {
    if (!selectedAccount) return [];
    return obligations.filter((o) => o.linked_account_id === selectedAccount.id);
  }, [obligations, selectedAccount]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background || '#051424' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header & Segmented Switcher */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.cyclePill,
              {
                backgroundColor: colors.surfaceContainer || '#122131',
                borderColor: colors.borderSubtle || '#1c2b3c',
              },
            ]}
            onPress={() => setIsCalendarOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={15} color="#52b788" />
            <Text style={[styles.cyclePillText, { color: colors.textPrimary }]}>{activeMonth || 'Nov 2026'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.liveSyncBadge}>
            <View style={[styles.liveSyncDot, { backgroundColor: '#52b788' }]} />
            <Text style={styles.liveSyncText}>Encrypted Vault</Text>
          </View>
        </View>

        {/* 3-Way Segmented Tabs (Banks, Cards, Physical Wallet) */}
        <View style={[styles.segmentedBar, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
          {/* Banks */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'BANKS' && [
                styles.segmentBtnActive,
                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
              ],
            ]}
            onPress={() => {
              setActiveSegment('BANKS');
              setSelectedAccountId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business"
              size={15}
              color={activeSegment === 'BANKS' ? '#52b788' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeSegment === 'BANKS' ? '#52b788' : colors.textMuted },
                activeSegment === 'BANKS' && styles.segmentBtnTextActive,
              ]}
            >
              Banks ({bankAccounts.length})
            </Text>
          </TouchableOpacity>

          {/* Cards */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'CARDS' && [
                styles.segmentBtnActive,
                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
              ],
            ]}
            onPress={() => {
              setActiveSegment('CARDS');
              setSelectedAccountId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="card"
              size={15}
              color={activeSegment === 'CARDS' ? '#52b788' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeSegment === 'CARDS' ? '#52b788' : colors.textMuted },
                activeSegment === 'CARDS' && styles.segmentBtnTextActive,
              ]}
            >
              Cards ({creditCards.length})
            </Text>
          </TouchableOpacity>

          {/* Wallet */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'WALLET' && [
                styles.segmentBtnActive,
                { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
              ],
            ]}
            onPress={() => {
              setActiveSegment('WALLET');
              setSelectedAccountId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cash"
              size={15}
              color={activeSegment === 'WALLET' ? '#52b788' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeSegment === 'WALLET' ? '#52b788' : colors.textMuted },
                activeSegment === 'WALLET' && styles.segmentBtnTextActive,
              ]}
            >
              Wallet ({physicalWallets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Aggregate Overview Card */}
        <View style={[styles.aggregateCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
          {activeSegment === 'BANKS' && (
            <View style={styles.aggregateRow}>
              <View>
                <Text style={[styles.aggregateLabel, { color: colors.textMuted }]}>TOTAL BANK LIQUIDITY</Text>
                <Text style={[styles.aggregateAmount, { color: colors.textPrimary }]}>
                  {formatRupee(totalBankCash)}
                </Text>
              </View>
              <View style={styles.aggregateRight}>
                <Text style={[styles.aggregateCountPill, { color: '#52b788' }]}>
                  {bankAccounts.length} Accounts
                </Text>
                <Text style={[styles.aggregateSub, { color: colors.textMuted }]}>Combined capital</Text>
              </View>
            </View>
          )}

          {activeSegment === 'CARDS' && (
            <View style={styles.aggregateRow}>
              <View>
                <Text style={[styles.aggregateLabel, { color: colors.textMuted }]}>TOTAL UNBILLED SPENT</Text>
                <Text style={[styles.aggregateAmount, { color: colors.textPrimary }]}>
                  {formatRupee(totalCreditDebt)}
                </Text>
              </View>
              <View style={[styles.limitBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Text style={[styles.limitLabel, { color: colors.textMuted }]}>Combined Limit</Text>
                <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                  {formatRupee(combinedCreditLimit)}
                </Text>
              </View>
            </View>
          )}

          {activeSegment === 'WALLET' && (
            <View style={styles.aggregateRow}>
              <View>
                <Text style={[styles.aggregateLabel, { color: colors.textMuted }]}>TOTAL CASH IN HAND</Text>
                <Text style={[styles.aggregateAmount, { color: colors.textPrimary }]}>
                  {formatRupee(totalWalletCash)}
                </Text>
              </View>
              <View style={styles.aggregateRight}>
                <Text style={[styles.aggregateCountPill, { color: '#52b788' }]}>Physical Currency</Text>
                <Text style={[styles.aggregateSub, { color: colors.textMuted }]}>In pocket & home</Text>
              </View>
            </View>
          )}
        </View>

        {/* Carousel Section Header */}
        <View style={styles.carouselHeaderRow}>
          <View style={styles.carouselHeaderLeft}>
            <Text style={[styles.carouselTitle, { color: colors.textPrimary }]}>
              {activeSegment === 'BANKS'
                ? 'Primary Ledger Cards'
                : activeSegment === 'CARDS'
                ? 'Your Cards Deck'
                : 'Cash Pockets & Wallets'}
            </Text>
            <Text style={[styles.carouselIndexBadge, { color: colors.textMuted }]}>
              {currentAccountList.length} Total
            </Text>
          </View>

          <TouchableOpacity
            style={styles.linkActionBtn}
            onPress={() => {
              if (activeSegment === 'BANKS') {
                if (onOpenAddBank) onOpenAddBank();
                else if (onOpenAddTool) onOpenAddTool();
              } else if (activeSegment === 'CARDS') {
                if (onOpenAddCard) onOpenAddCard();
                else if (onOpenAddTool) onOpenAddTool();
              } else if (onOpenAddWallet) {
                onOpenAddWallet();
              } else if (onOpenAddTool) {
                onOpenAddTool();
              } else if (onOpenAddBank) {
                onOpenAddBank();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color="#52b788" />
            <Text style={styles.linkActionText}>
              {activeSegment === 'BANKS'
                ? 'Link Bank'
                : activeSegment === 'CARDS'
                ? 'Add Card'
                : 'Add Wallet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Card Deck Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardDeckScroll}
          snapToInterval={288}
          decelerationRate="fast"
        >
          {currentAccountList.map((acc) => {
            const isSelected = selectedAccount?.id === acc.id;

            if (acc.type === 'BANK_DEPOSIT') {
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.bankDeckCard,
                    isSelected && { borderColor: '#52b788', borderWidth: 1.5 },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.deckCardTop}>
                    <View style={styles.deckCardIdentity}>
                      <View style={styles.deckCardIcon}>
                        <Ionicons name="business" size={17} color="#52b788" />
                      </View>
                      <View>
                        <Text style={styles.deckCardName}>{acc.name}</Text>
                        <Text style={styles.deckCardBadge}>SALARY / SAVINGS</Text>
                      </View>
                    </View>
                    <View style={styles.chipRight}>
                      <Ionicons name="radio-outline" size={17} color="#94a3b8" />
                      <View style={styles.activePillSmall}>
                        <Text style={styles.activePillSmallText}>Active</Text>
                      </View>
                    </View>
                  </View>

                  {/* EMV Chip Graphic & Masked Account */}
                  <View style={styles.emvChipRow}>
                    <View style={styles.emvChipGold}>
                      <View style={styles.emvLineH} />
                      <View style={styles.emvLineV} />
                    </View>
                    <Text style={styles.maskedNumber}>
                      •••• •••• •••• {acc.last4 || '8492'}
                    </Text>
                  </View>

                  <View style={styles.deckCardBottom}>
                    <View>
                      <Text style={styles.deckBalanceLabel}>AVAILABLE BALANCE</Text>
                      <Text style={styles.deckBalanceValue}>{formatRupee(acc.balance)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.manageBtnPill}
                      onPress={() => onEditAccount && onEditAccount(acc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="options-outline" size={14} color="#d4e4fa" />
                      <Text style={styles.manageBtnText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }

            if (acc.type === 'CREDIT_CARD') {
              const limit = acc.credit_limit || 50000;
              const utilPct = Math.round((acc.balance / limit) * 100);
              const isHigh = utilPct > 30;

              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.creditDeckCard,
                    isSelected && { borderColor: '#52b788', borderWidth: 1.5 },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.deckCardTop}>
                    <View>
                      <Text style={styles.cardIssuerText}>CREDIT FACILITY</Text>
                      <Text style={styles.deckCardName}>{acc.name}</Text>
                    </View>
                    <View style={styles.chipRight}>
                      <Ionicons name="radio-outline" size={17} color="#ffca45" />
                      <View
                        style={[
                          styles.activePillSmall,
                          { backgroundColor: isHigh ? 'rgba(255,180,171,0.2)' : 'rgba(82,183,136,0.2)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.activePillSmallText,
                            { color: isHigh ? '#ffb4ab' : '#52b788' },
                          ]}
                        >
                          {isHigh ? `${utilPct}% Limit` : 'Optimal'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* EMV Chip */}
                  <View style={styles.emvChipRow}>
                    <View style={styles.emvChipGold}>
                      <View style={styles.emvLineH} />
                      <View style={styles.emvLineV} />
                    </View>
                    <Text style={styles.maskedNumber}>•••• {acc.last4 || '4812'}</Text>
                  </View>

                  <View style={styles.deckCardBottom}>
                    <View>
                      <Text style={styles.deckBalanceLabel}>UNBILLED SPENT</Text>
                      <Text style={styles.deckBalanceValue}>{formatRupee(acc.balance)}</Text>
                    </View>
                    <View style={styles.dueDayWrap}>
                      <Text style={styles.limitDueLabel}>Limit {formatCompactRupee(limit)}</Text>
                      <Text style={styles.dueDayText}>Due {acc.payment_due_day || 25}th</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            // PHYSICAL_WALLET
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.walletDeckCard,
                  isSelected && { borderColor: '#52b788', borderWidth: 1.5 },
                ]}
                onPress={() => setSelectedAccountId(acc.id)}
                activeOpacity={0.9}
              >
                <View style={styles.deckCardTop}>
                  <View style={styles.deckCardIdentity}>
                    <View style={[styles.deckCardIcon, { backgroundColor: '#1c2b3c' }]}>
                      <Ionicons name="cash" size={17} color="#ffca45" />
                    </View>
                    <View>
                      <Text style={styles.deckCardName}>{acc.name || 'Physical Wallet'}</Text>
                      <Text style={styles.deckCardBadge}>CASH ON HAND</Text>
                    </View>
                  </View>
                  <View style={styles.activePillSmall}>
                    <Text style={styles.activePillSmallText}>Liquid</Text>
                  </View>
                </View>

                <View style={styles.emvChipRow}>
                  <Ionicons name="shield-checkmark" size={20} color="#52b788" />
                  <Text style={[styles.maskedNumber, { letterSpacing: 1 }]}>Physical Offline Currency</Text>
                </View>

                <View style={styles.deckCardBottom}>
                  <View>
                    <Text style={styles.deckBalanceLabel}>CURRENT ON-HAND</Text>
                    <Text style={styles.deckBalanceValue}>{formatRupee(acc.balance)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageBtnPill}
                    onPress={() => onEditAccount && onEditAccount(acc)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color="#d4e4fa" />
                    <Text style={styles.manageBtnText}>Adjust</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Controls for Selected Asset */}
        <View style={styles.actionControlsGrid}>
          {activeSegment === 'BANKS' && (
            <>
              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={onOpenTransfer}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="paper-plane-outline" size={18} color="#52b788" />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => onOpenRecordSpend && onOpenRecordSpend(selectedAccount?.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="add-circle-outline" size={18} color="#52b788" />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Add Funds</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => selectedAccount && onEditAccount && onEditAccount(selectedAccount)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Edit Bank</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => setIsCalendarOpen(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Statement</Text>
              </TouchableOpacity>
            </>
          )}

          {activeSegment === 'CARDS' && (
            <>
              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: '#2d6a4f' }]}
                onPress={() => onOpenRecordSpend && onOpenRecordSpend(selectedAccount?.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.actionGridText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Record Spend
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => onOpenPayCardBill && onOpenPayCardBill(selectedAccount?.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={18} color="#52b788" />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Pay Card Bill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => selectedAccount && onEditAccount && onEditAccount(selectedAccount)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="options-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Edit Card</Text>
              </TouchableOpacity>
            </>
          )}

          {activeSegment === 'WALLET' && (
            <>
              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: '#2d6a4f' }]}
                onPress={onOpenTransfer}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="arrow-down-circle-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.actionGridText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  ATM Cash In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => onOpenRecordSpend && onOpenRecordSpend(selectedAccount?.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="cash-outline" size={18} color="#ffca45" />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Cash Spend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                onPress={() => selectedAccount && onEditAccount && onEditAccount(selectedAccount)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                  <Ionicons name="options-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={[styles.actionGridText, { color: colors.textPrimary }]}>Adjust Count</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Linked Fixed Commitments / Auto-Debits for this tool */}
        {linkedObligations.length > 0 && (
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>
                Linked Commitments & Auto-Debits
              </Text>
              <Text style={[styles.subSectionCount, { color: colors.textMuted }]}>
                {linkedObligations.length} Active
              </Text>
            </View>

            <View style={[styles.feedCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
              {linkedObligations.map((ob, idx) => (
                <View
                  key={ob.id}
                  style={[
                    styles.feedRow,
                    idx !== linkedObligations.length - 1 && styles.feedRowBorder,
                  ]}
                >
                  <View style={styles.feedRowLeft}>
                    <View style={[styles.feedIconBox, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}>
                      <Ionicons
                        name={ob.type === 'SUBSCRIPTION' ? 'film-outline' : 'business-outline'}
                        size={17}
                        color="#ffca45"
                      />
                    </View>
                    <View>
                      <Text style={[styles.feedRowName, { color: colors.textPrimary }]}>{ob.name}</Text>
                      <Text style={[styles.feedRowSub, { color: colors.textMuted }]}>
                        Due {ob.due_day}th • Scheduled
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.feedRowAmount, { color: colors.textPrimary }]}>
                    {formatRupee(ob.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Itemized Transactions */}
        <View style={styles.subSection}>
          <View style={styles.subSectionHeader}>
            <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>
              Transactions & Swipes ({selectedAccount?.name || 'Account'})
            </Text>
            <Text style={[styles.subSectionCount, { color: colors.textMuted }]}>
              {accountTransactions.length} Cleared
            </Text>
          </View>

          <View style={[styles.feedCard, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
            {accountTransactions.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Ionicons name="receipt-outline" size={26} color={colors.textMuted} />
                <Text style={[styles.emptyCardText, { color: colors.textMuted }]}>
                  No movements on this account
                </Text>
              </View>
            ) : (
              accountTransactions.slice(0, 8).map((tx, idx) => {
                const isIncome = tx.type === 'INFLOW';
                const sign = isIncome ? '+' : tx.type === 'TRANSFER' ? '' : '-';
                const amtColor = isIncome ? '#52b788' : colors.textPrimary;

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.feedRow,
                      idx !== Math.min(accountTransactions.length, 8) - 1 && styles.feedRowBorder,
                    ]}
                  >
                    <View style={styles.feedRowLeft}>
                      <View
                        style={[
                          styles.feedIconBox,
                          {
                            backgroundColor: isIncome
                              ? 'rgba(82, 183, 136, 0.15)'
                              : 'rgba(255, 202, 69, 0.12)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isIncome
                              ? 'arrow-down-outline'
                              : tx.type === 'TRANSFER'
                              ? 'swap-horizontal'
                              : 'cart-outline'
                          }
                          size={17}
                          color={isIncome ? '#52b788' : '#ffca45'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.feedRowName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {tx.description || tx.category}
                        </Text>
                        <Text style={[styles.feedRowSub, { color: colors.textMuted }]}>
                          {tx.category} • {safeFormatDate(tx.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.feedRowAmount, { color: amtColor }]}>
                      {sign}
                      {formatRupee(tx.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Cycle Selector Modal */}
      <FinancialCycleModal
        visible={isCalendarOpen}
        activeMonth={activeMonth}
        onSelectMonth={setActiveMonth}
        onClose={() => setIsCalendarOpen(false)}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  cyclePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  liveSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveSyncText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    fontWeight: '700',
  },
  aggregateCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  aggregateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aggregateLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  aggregateAmount: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  aggregateRight: {
    alignItems: 'flex-end',
  },
  aggregateCountPill: {
    fontSize: 13,
    fontWeight: '700',
  },
  aggregateSub: {
    fontSize: 11,
    marginTop: 2,
  },
  limitBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  limitLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  limitValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  carouselHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carouselTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  carouselIndexBadge: {
    fontSize: 12,
  },
  linkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkActionText: {
    color: '#52b788',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDeckScroll: {
    gap: 14,
    paddingBottom: 6,
    marginBottom: 20,
  },
  bankDeckCard: {
    width: 275,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#0f233a',
    justifyContent: 'space-between',
    minHeight: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  creditDeckCard: {
    width: 275,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#161d26',
    justifyContent: 'space-between',
    minHeight: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  walletDeckCard: {
    width: 275,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#14202d',
    justifyContent: 'space-between',
    minHeight: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deckCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deckCardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deckCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCardName: {
    color: '#d4e4fa',
    fontSize: 15,
    fontWeight: '700',
  },
  deckCardBadge: {
    color: '#52b788',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  cardIssuerText: {
    color: '#ffca45',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  chipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(82,183,136,0.18)',
  },
  activePillSmallText: {
    color: '#52b788',
    fontSize: 10,
    fontWeight: '700',
  },
  emvChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  emvChipGold: {
    width: 36,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#d4af37',
    position: 'relative',
    overflow: 'hidden',
  },
  emvLineH: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#8a6508',
  },
  emvLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 17,
    width: 1,
    backgroundColor: '#8a6508',
  },
  maskedNumber: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  deckCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  deckBalanceLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deckBalanceValue: {
    color: '#d4e4fa',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  manageBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  manageBtnText: {
    color: '#d4e4fa',
    fontSize: 11,
    fontWeight: '600',
  },
  dueDayWrap: {
    alignItems: 'flex-end',
  },
  limitDueLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
  dueDayText: {
    color: '#ffca45',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  actionControlsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  actionGridBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionGridText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subSection: {
    marginBottom: 24,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  subSectionCount: {
    fontSize: 12,
  },
  feedCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  feedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  feedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  feedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  feedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedRowName: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  feedRowAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyCardBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyCardText: {
    fontSize: 12,
  },
});
