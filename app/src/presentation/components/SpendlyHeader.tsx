import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { UserProfile } from '../../core/types/profile';
import { ActiveTabKey } from './SpendlySidebar';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuthSecurity } from '../hooks/useAuthSecurity';
import { formatRupee } from '../../core/utils/currency';
import { isDateInMonth } from '../../core/utils/date';
import { PinVerificationModal } from './modals/PinVerificationModal';

interface SpendlyHeaderProps {
  activeTab: ActiveTabKey;
  profile: UserProfile;
  activeMonth: string;
  onSelectMonth?: (month: string) => void;
  onOpenAddEntry: () => void;
  onOpenProfile: () => void;
  onOpenSettings: (securityUnlocked?: boolean) => void;
  onOpenSync?: () => void;
}

export const SpendlyHeader: React.FC<SpendlyHeaderProps> = ({
  activeTab,
  profile,
  activeMonth,
  onSelectMonth,
  onOpenAddEntry,
  onOpenProfile,
  onOpenSettings,
  onOpenSync,
}) => {
  const { colors } = useTheme();
  const {
    obligations,
    accounts,
    transactions,
    snoozedObligationIds,
    paidObligationIds,
    payObligation,
    isSyncing,
    pendingChangesCount,
    triggerGoogleSheetsSync,
    setActiveMonth: setContextActiveMonth,
  } = useFinanceData();

  const { lockSession } = useAuthSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showLockMenu, setShowLockMenu] = useState(false);
  const [showPinForLockSettings, setShowPinForLockSettings] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleManualSync = async () => {
    try {
      const res = await triggerGoogleSheetsSync();
      setSyncToast(`Synced ${res.syncedRows} records across ${res.createdTabs.length} tabs ✓`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch (e: any) {
      setSyncToast('Sync error: ' + (e?.message || 'Failed'));
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const MONTH_OPTIONS = [
    { label: 'All Months', value: 'All Months', description: 'View full history', isAll: true },
    { label: 'August 2026', value: 'August 2026', tag: 'Past' },
    { label: 'September 2026', value: 'September 2026', tag: 'Past' },
    { label: 'October 2026', value: 'October 2026', tag: 'Current' },
    { label: 'November 2026', value: 'November 2026', tag: 'Next Cycle' },
    { label: 'December 2026', value: 'December 2026', tag: 'Future' },
    { label: 'January 2027', value: 'January 2027', tag: 'Future' },
    { label: 'February 2027', value: 'February 2027', tag: 'Future' },
    { label: 'March 2027', value: 'March 2027', tag: 'Future' },
  ];

  const handleSelectMonth = (monthVal: string) => {
    if (onSelectMonth) {
      onSelectMonth(monthVal);
    }
    if (setContextActiveMonth) {
      setContextActiveMonth(monthVal);
    }
    setShowMonthDropdown(false);
  };

  const getMonthCount = (monthVal: string) => {
    if (monthVal === 'All Months') return transactions.length;
    return transactions.filter((t) => isDateInMonth(t.timestamp, monthVal)).length;
  };

  // Compute pending notifications:
  // All active obligations that have been snoozed via "Not yet" (or due early in cycle) and not yet marked paid
  const notificationItems = obligations.filter((ob) => {
    if (ob.status !== 'ACTIVE' || paidObligationIds[ob.id]) return false;
    // Show if snoozed via "Not yet", or due early in November
    return snoozedObligationIds[ob.id] || ob.due_day <= 5;
  });

  const pendingCount = notificationItems.length;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const getSubtitles = (): { title: string; subtitle: string } => {
    const firstName = ((profile.name || profile.username || 'User').split(' ')[0] || 'USER').toUpperCase();
    switch (activeTab) {
      case 'OVERVIEW':
        return {
          title: `GOOD MORNING, ${firstName}`,
          subtitle: 'A clearer view of this month.',
        };
      case 'TRANSACTIONS':
        return {
          title: `YOUR ACTIVITY, ${firstName}`,
          subtitle: 'Every debit and credit, in one place.',
        };
      case 'CREDIT_CARDS':
        return {
          title: `CREDIT CARDS, ${firstName}`,
          subtitle: 'Keep every cycle within a comfortable range.',
        };
      case 'BANKS':
        return {
          title: `BANK ACCOUNTS, ${firstName}`,
          subtitle: 'Know what came in, what is due, and what is safe.',
        };
      case 'PLAN_AHEAD':
        return {
          title: `PLAN AHEAD, ${firstName}`,
          subtitle: 'Make space for next month before it starts.',
        };
      case 'INVESTMENTS':
        return {
          title: `INVESTMENTS, ${firstName}`,
          subtitle: 'Build savings without inflating your expenses.',
        };
      case 'HISTORY':
        return {
          title: `RECOVERY SHELF, ${firstName}`,
          subtitle: 'Bring back an entry if you deleted it by accident.',
        };
      default:
        return {
          title: `HELLO, ${firstName}`,
          subtitle: 'Personal finance, private and offline.',
        };
    }
  };

  const { title, subtitle } = getSubtitles();

  return (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: colors.background },
        !isDesktop && styles.headerContainerMobile,
      ]}
    >
      {isDesktop ? (
        <>
          {/* Left Title Column */}
          <View style={styles.titleColumn}>
            <Text style={[styles.greetingLabel, { color: colors.textMuted }]}>{title}</Text>
            <Text style={[styles.mainSubtitle, { color: colors.textPrimary }]}>{subtitle}</Text>
          </View>

          {/* Right Controls */}
          <View style={styles.controlsRow}>
            {/* Dedicated Google Sheets Sync Button */}
            <View style={styles.syncButtonGroup}>
              <TouchableOpacity
                style={[
                  styles.syncBtn,
                  {
                    backgroundColor: isSyncing
                      ? colors.primaryLight
                      : pendingChangesCount > 0
                      ? colors.surface
                      : colors.surface,
                    borderColor: pendingChangesCount > 0 ? colors.primary : colors.borderSubtle,
                  },
                ]}
                onPress={handleManualSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons
                    name={pendingChangesCount > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
                    size={15}
                    color={pendingChangesCount > 0 ? colors.primary : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={[
                    styles.syncBtnText,
                    { color: pendingChangesCount > 0 ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {isSyncing
                    ? 'Syncing...'
                    : pendingChangesCount > 0
                    ? `Sync (${pendingChangesCount})`
                    : 'Sheets Synced'}
                </Text>
              </TouchableOpacity>

              {onOpenSync && (
                <TouchableOpacity
                  style={[
                    styles.syncGearBtn,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                  onPress={onOpenSync}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Month Selector Pill */}
            <TouchableOpacity
              style={[
                styles.monthPill,
                {
                  backgroundColor: showMonthDropdown ? colors.primaryLight : colors.surface,
                  borderColor: showMonthDropdown ? colors.primary : colors.borderSubtle,
                },
              ]}
              onPress={() => setShowMonthDropdown(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={showMonthDropdown ? colors.primary : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.monthText,
                  { color: showMonthDropdown ? colors.primary : colors.textPrimary },
                ]}
              >
                {activeMonth}
              </Text>
              <Ionicons
                name={showMonthDropdown ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={showMonthDropdown ? colors.primary : colors.textMuted}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            {/* Bell Notifications Button with dynamic count badge */}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                pendingCount > 0 && { borderColor: '#F59E0B' },
              ]}
              onPress={() => setShowNotifications(!showNotifications)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={pendingCount > 0 ? 'notifications' : 'notifications-outline'}
                size={16}
                color={pendingCount > 0 ? '#B45309' : colors.textSecondary}
              />
              {pendingCount > 0 && (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* User Profile Chip */}
            <TouchableOpacity
              style={[
                styles.profileChip,
                { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 },
              ]}
              onPress={onOpenProfile}
              activeOpacity={0.8}
            >
              <View style={[styles.avatarIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name={
                    profile.avatar === 'Forest rabbit'
                      ? 'leaf'
                      : profile.avatar === 'Little ghost'
                      ? 'happy'
                      : profile.avatar === 'Star mage'
                      ? 'sparkles'
                      : profile.avatar === 'Custom Google'
                      ? 'logo-google'
                      : 'person'
                  }
                  size={13}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.profileName, { color: colors.textPrimary, fontWeight: '700' }]}>
                Profile ({(profile.name || profile.username || 'User').split(' ')[0]})
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* + Add Entry Button (Primary Action) */}
            <TouchableOpacity
              style={[styles.addEntryBtn, { backgroundColor: colors.primary }]}
              onPress={onOpenAddEntry}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addEntryText}>Add entry</Text>
            </TouchableOpacity>

            {/* Settings button */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => onOpenSettings(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="color-palette-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Lock Vault Button */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setShowLockMenu(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={{ width: '100%', gap: 10 }}>
          {/* Mobile Top Row: Greeting on left, Profile & Lock on right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.greetingLabel, { color: colors.textMuted }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.mainSubtitle, { color: colors.textPrimary, fontSize: 16 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Profile Button - Crystal Clear and Prominent */}
              <TouchableOpacity
                style={[
                  styles.profileChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  },
                ]}
                onPress={onOpenProfile}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarIconBox, { backgroundColor: colors.primaryLight, marginRight: 6 }]}>
                  <Ionicons
                    name={
                      profile.avatar === 'Forest rabbit'
                        ? 'leaf'
                        : profile.avatar === 'Little ghost'
                        ? 'happy'
                        : profile.avatar === 'Star mage'
                        ? 'sparkles'
                        : profile.avatar === 'Custom Google'
                        ? 'logo-google'
                        : 'person'
                    }
                    size={14}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.profileName, { color: colors.textPrimary, fontWeight: '700', fontSize: 13 }]}>
                  Profile
                </Text>
              </TouchableOpacity>

              {/* Bell Notifications */}
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  pendingCount > 0 && { borderColor: '#F59E0B' },
                ]}
                onPress={() => setShowNotifications(!showNotifications)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={pendingCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={16}
                  color={pendingCount > 0 ? '#B45309' : colors.textSecondary}
                />
                {pendingCount > 0 && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Lock Vault */}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                onPress={() => setShowLockMenu(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mobile Bottom Row: Month Selector + Sync Status + Add Entry */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
            {/* Month Selector */}
            <TouchableOpacity
              style={[
                styles.monthPill,
                {
                  flex: 1.3,
                  justifyContent: 'center',
                  backgroundColor: showMonthDropdown ? colors.primaryLight : colors.surface,
                  borderColor: showMonthDropdown ? colors.primary : colors.borderSubtle,
                  paddingHorizontal: 8,
                },
              ]}
              onPress={() => setShowMonthDropdown(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={showMonthDropdown ? colors.primary : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.monthText,
                  { color: showMonthDropdown ? colors.primary : colors.textPrimary, fontSize: 12 },
                ]}
                numberOfLines={1}
              >
                {activeMonth}
              </Text>
              <Ionicons
                name={showMonthDropdown ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={showMonthDropdown ? colors.primary : colors.textMuted}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            {/* Sync Button */}
            <TouchableOpacity
              style={[
                styles.syncBtn,
                {
                  backgroundColor: isSyncing
                    ? colors.primaryLight
                    : pendingChangesCount > 0
                    ? colors.surface
                    : colors.surface,
                  borderColor: pendingChangesCount > 0 ? colors.primary : colors.borderSubtle,
                  paddingHorizontal: 8,
                },
              ]}
              onPress={handleManualSync}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
              ) : (
                <Ionicons
                  name={pendingChangesCount > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
                  size={14}
                  color={pendingChangesCount > 0 ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.syncBtnText,
                  { color: pendingChangesCount > 0 ? colors.primary : colors.textSecondary, fontSize: 11 },
                ]}
              >
                {isSyncing ? 'Syncing...' : pendingChangesCount > 0 ? `Sync (${pendingChangesCount})` : 'Sync'}
              </Text>
            </TouchableOpacity>

            {/* + Add Entry Button */}
            <TouchableOpacity
              style={[styles.addEntryBtn, { backgroundColor: colors.primary, paddingHorizontal: 12 }]}
              onPress={onOpenAddEntry}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={[styles.addEntryText, { fontSize: 12 }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bell Notification Popover Dropdown */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View
          style={[
            styles.popoverBackdrop,
            !isDesktop && styles.popoverBackdropMobile,
          ]}
        >
          {/* Absolute touchable backdrop: clicking outside anywhere closes popover! */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowNotifications(false)}
          />

          <View style={[styles.popoverCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {/* Popover Header */}
            <View style={[styles.popoverHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>Payment Reminders</Text>
                {pendingCount > 0 && (
                  <View style={[styles.countPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.countPillText}>{pendingCount} pending</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closePopoverBtn}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.popoverSub, { color: colors.textMuted }]}>
              Items marked "Not yet" stay here until confirmed paid.
            </Text>

            {/* Notification Rows List */}
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {notificationItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    No payment check-ins awaiting confirmation.
                  </Text>
                </View>
              ) : (
                notificationItems.map((ob) => {
                  const dueDayFormatted = ob.due_day.toString().padStart(2, '0');
                  const acc = accounts.find((a) => a.id === ob.linked_account_id);
                  const isSnoozed = snoozedObligationIds[ob.id];

                  return (
                    <View
                      key={ob.id}
                      style={[styles.notificationRow, { borderBottomColor: colors.borderSubtle }]}
                    >
                      <View style={[styles.notifIconBox, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons
                          name={ob.type === 'SUBSCRIPTION' ? 'repeat-outline' : 'business-outline'}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.notifName, { color: colors.textPrimary }]}>{ob.name}</Text>
                          {isSnoozed && (
                            <View style={[styles.snoozedTag, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={styles.snoozedTagText}>Not yet</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.notifMeta, { color: colors.textMuted }]}>
                          Due {dueDayFormatted} Nov • {acc?.name || 'Account'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={[styles.notifAmount, { color: colors.textPrimary }]}>
                          {formatRupee(ob.amount)}
                        </Text>
                        <TouchableOpacity
                          style={[styles.payConfirmBtn, { backgroundColor: colors.primary }]}
                          onPress={async () => {
                            await payObligation(ob.id);
                          }}
                        >
                          <Text style={styles.payConfirmBtnText}>Yes, paid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Month Dropdown Modal */}
      <Modal
        visible={showMonthDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthDropdown(false)}
      >
        <View
          style={[
            styles.popoverBackdrop,
            !isDesktop && styles.popoverBackdropMobile,
          ]}
        >
          {/* Absolute touchable backdrop: clicking outside closes popover immediately! */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowMonthDropdown(false)}
          />

          <View style={[styles.popoverCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, maxWidth: 420 }]}>
            {/* Modal Header */}
            <View style={[styles.popoverHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>Select Ledger Period</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowMonthDropdown(false)}
                style={styles.closePopoverBtn}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.popoverSub, { color: colors.textMuted }]}>
              Inspect historical records in past months, current ledger movements, or forecast upcoming commitment tenures.
            </Text>

            {/* Scrollable Month Options List */}
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {MONTH_OPTIONS.map((m) => {
                const isSelected = activeMonth === m.value;
                const count = getMonthCount(m.value);

                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.monthOptionRow,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => handleSelectMonth(m.value)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View
                        style={[
                          styles.monthOptionIconBox,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : m.isAll
                              ? '#EEF2FF'
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <Ionicons
                          name={m.isAll ? 'infinite' : 'calendar-outline'}
                          size={15}
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        />
                      </View>

                      <View style={{ marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={[
                              styles.monthOptionTitle,
                              {
                                color: isSelected ? colors.primary : colors.textPrimary,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {m.label}
                          </Text>
                          {m.tag && (
                            <View
                              style={[
                                styles.monthTagPill,
                                {
                                  backgroundColor:
                                    m.tag === 'Current'
                                      ? '#DCFCE7'
                                      : m.tag === 'Next Cycle'
                                      ? '#FEF3C7'
                                      : '#F1F5F9',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.monthTagText,
                                  {
                                    color:
                                      m.tag === 'Current'
                                        ? '#15803D'
                                        : m.tag === 'Next Cycle'
                                        ? '#B45309'
                                        : colors.textMuted,
                                  },
                                ]}
                              >
                                {m.tag}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.monthOptionSub, { color: colors.textMuted }]}>
                          {count === 0 ? 'No recorded transactions' : `${count} transaction${count === 1 ? '' : 's'}`}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lock Action Modal */}
      <Modal
        visible={showLockMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLockMenu(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLockMenu(false)}
          />
          <View style={[styles.lockMenuCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} pointerEvents="auto">
            <View style={styles.lockMenuHeader}>
              <View style={[styles.lockMenuIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.lockMenuTitle, { color: colors.textPrimary }]}>Vault Security</Text>
                <Text style={[styles.lockMenuSub, { color: colors.textMuted }]}>Choose an action for your private ledger</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLockMenu(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.lockMenuOptions}>
              {/* Option 1: Lock Vault Now */}
              <TouchableOpacity
                style={[styles.lockMenuOption, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                onPress={() => {
                  setShowLockMenu(false);
                  lockSession();
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="lock-closed" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Lock Vault Now</Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Immediately locks screen; requires Master PIN to open</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option 2: Change Lock Settings */}
              <TouchableOpacity
                style={[styles.lockMenuOption, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                onPress={() => {
                  setShowLockMenu(false);
                  setShowPinForLockSettings(true);
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Change Lock Settings</Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Configure auto-lock duration, tab switch lock & presets</Text>
                </View>
                <Ionicons name="key-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Verification before opening lock settings */}
      <PinVerificationModal
        visible={showPinForLockSettings}
        title="Security Verification"
        subtitle="Enter your 4-digit Master PIN to modify Vault Lock Settings."
        iconName="lock-closed"
        onSuccess={() => {
          setShowPinForLockSettings(false);
          onOpenSettings(true);
        }}
        onCancel={() => setShowPinForLockSettings(false)}
      />

      {/* Floating Sync Toast Notification */}
      {syncToast && (
        <View style={styles.floatingToast}>
          <Ionicons name="cloud-done" size={15} color="#34D399" style={{ marginRight: 8 }} />
          <Text style={styles.floatingToastText}>{syncToast}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  syncButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncGearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingToast: {
    position: 'absolute',
    bottom: -16,
    alignSelf: 'center',
    backgroundColor: '#064E3B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 999,
  },
  floatingToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerContainer: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    minWidth: 240,
  },
  greetingLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addEntryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerContainerMobile: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  titleColumnMobile: {
    minWidth: '100%',
  },
  mainSubtitleMobile: {
    fontSize: 18,
  },
  controlsRowMobile: {
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    justifyContent: 'flex-start',
  },
  popoverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 68,
    paddingRight: 32,
    paddingLeft: 16,
  },
  popoverBackdropMobile: {
    paddingRight: 16,
    paddingLeft: 16,
    paddingTop: 56,
    alignItems: 'center',
  },
  popoverCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  countPill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  closePopoverBtn: {
    padding: 2,
  },
  popoverSub: {
    fontSize: 11,
    marginTop: 8,
    marginBottom: 10,
    lineHeight: 15,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifName: {
    fontSize: 13,
    fontWeight: '700',
  },
  snoozedTag: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  snoozedTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  notifMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  notifAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  payConfirmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  monthOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  monthOptionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthOptionTitle: {
    fontSize: 13,
  },
  monthTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  monthTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  lockMenuCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 20,
  },
  lockMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockMenuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockMenuTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  lockMenuSub: {
    fontSize: 12,
    marginTop: 2,
  },
  lockMenuOptions: {
    gap: 10,
  },
  lockMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
