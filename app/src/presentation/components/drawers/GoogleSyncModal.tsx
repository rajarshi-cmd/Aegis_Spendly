import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useFinanceData } from '../../hooks/useFinanceData';
import { SyncCadence, DayOfWeek } from '../../../core/types/sync';
import { GoogleSheetsSyncEngine } from '../../../core/engines/googleSheetsEngine';

interface GoogleSyncModalProps {
  visible: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'SUNDAY', label: 'Sunday', short: 'Sun' },
  { id: 'MONDAY', label: 'Monday', short: 'Mon' },
  { id: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { id: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { id: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { id: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { id: 'SATURDAY', label: 'Saturday', short: 'Sat' },
];

const POPULAR_TIMES = [
  { time: '09:00', label: '9:00 AM' },
  { time: '18:00', label: '6:00 PM' },
  { time: '21:00', label: '9:00 PM' },
  { time: '22:00', label: '10:00 PM' },
  { time: '23:00', label: '11:00 PM' },
];

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const {
    syncConfig,
    updateSyncConfig,
    triggerGoogleSheetsSync,
    isSyncing,
    lastSyncResult,
    pendingChangesCount,
    transactions,
  } = useFinanceData();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [cadence, setCadence] = useState<SyncCadence>(syncConfig.cadence);
  const [dailyTime, setDailyTime] = useState<string>(syncConfig.dailyTime);
  const [weeklyDay, setWeeklyDay] = useState<DayOfWeek>(syncConfig.weeklyDay);
  const [weeklyTime, setWeeklyTime] = useState<string>(syncConfig.weeklyTime);
  const [driveFolderName, setDriveFolderName] = useState<string>(syncConfig.driveFolderName || 'Aegis Spendly');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Compute next scheduled sync
  const nextSyncDate = useMemo(() => {
    return GoogleSheetsSyncEngine.calculateNextSyncDate({
      ...syncConfig,
      cadence,
      dailyTime,
      weeklyDay,
      weeklyTime,
    });
  }, [syncConfig, cadence, dailyTime, weeklyDay, weeklyTime]);

  // Determine active month tabs that will exist in the spreadsheet
  const monthTabs = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      if (!isNaN(d.getTime())) {
        const monthShort = d.toLocaleString('en-US', { month: 'short' });
        set.add(`${monthShort} ${d.getFullYear()}`);
      }
    });
    if (set.size === 0) set.add('Oct 2026');
    return Array.from(set);
  }, [transactions]);

  const handleSaveSchedule = () => {
    updateSyncConfig({
      cadence,
      dailyTime,
      weeklyDay,
      weeklyTime,
      driveFolderName: driveFolderName.trim() || 'Aegis Spendly',
    });
    setSyncToast('Schedule and folder preferences updated ✓');
    setTimeout(() => {
      setSyncToast(null);
      onClose();
    }, 1200);
  };

  const handleManualSyncNow = async () => {
    try {
      const result = await triggerGoogleSheetsSync();
      if (result.success) {
        setSyncToast(`Synced ${result.syncedRows} records across ${result.createdTabs.length} tabs!`);
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (e: any) {
      setSyncToast('Sync error: ' + (e?.message || 'Failed to sync'));
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const openSpreadsheetUrl = () => {
    const url = syncConfig.spreadsheetUrl || 'https://docs.google.com/spreadsheets/';
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.drawerSheet, { backgroundColor: colors.surface, maxWidth: isDesktop ? 620 : '100%' }]} pointerEvents="auto">
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.microHeader, { color: colors.textMuted }]}>CLOUD BACKUP & TEMPLATES</Text>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Google Sheets Sync</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Toast feedback */}
            {syncToast && (
              <View style={[styles.toastBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.toastText}>{syncToast}</Text>
              </View>
            )}

            {/* Google Account & Linked Spreadsheet Card */}
            <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.googleIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="logo-google" size={18} color="#15803D" />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Google Drive Connected</Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>{syncConfig.googleEmail || 'aarav.mehta@gmail.com'}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>Active</Text>
                </View>
              </View>

              <View style={[styles.sheetLinkRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.sheetNameLabel, { color: colors.textMuted }]}>LINKED SPREADSHEET TEMPLATE</Text>
                  <Text style={[styles.sheetName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {syncConfig.spreadsheetTitle}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.openLinkBtn, { backgroundColor: colors.primaryLight }]} onPress={openSpreadsheetUrl}>
                  <Ionicons name="open-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.openLinkText, { color: colors.primary }]}>Open Sheet</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.sheetLinkRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetNameLabel, { color: colors.textMuted }]}>TARGET GOOGLE DRIVE FOLDER</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="folder" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 }}
                      value={driveFolderName}
                      onChangeText={setDriveFolderName}
                      placeholder="Aegis Spendly"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              <Text style={[styles.rateLimitNote, { color: colors.textMuted }]}>
                💡 <Text style={{ fontWeight: '700' }}>Zero 3rd-Party Database Server:</Text> Data is stored on-device in SQLite and pushed straight to your private Google Drive folder above. No external databases, full privacy.
              </Text>
            </View>

            {/* Sync Frequency / Cadence Selection */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>SYNC SCHEDULE & CADENCE</Text>
            <View style={styles.cadenceGrid}>
              {[
                {
                  id: 'MANUAL' as SyncCadence,
                  title: 'Manual (Web Default)',
                  sub: 'Syncs on-demand when you click the sync button at the end of sessions.',
                  icon: 'hand-left-outline',
                },
                {
                  id: 'DAILY' as SyncCadence,
                  title: 'Daily Scheduled',
                  sub: 'Auto-syncs once every 24 hours at your chosen time.',
                  icon: 'today-outline',
                },
                {
                  id: 'WEEKLY' as SyncCadence,
                  title: 'Weekly Scheduled',
                  sub: 'Auto-syncs once per week on your preferred day and time.',
                  icon: 'calendar-outline',
                },
              ].map((item) => {
                const isSelected = cadence === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.cadenceCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.background,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setCadence(item.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.cadenceTitle,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <Text style={[styles.cadenceSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DAILY SCHEDULE TIME PICKER */}
            {cadence === 'DAILY' && (
              <View style={[styles.subScheduleBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.subScheduleTitle, { color: colors.textPrimary }]}>Select Daily Sync Time</Text>
                <Text style={[styles.subScheduleSub, { color: colors.textMuted }]}>
                  The app will bundle all day transactions and push once at this hour.
                </Text>

                <View style={styles.timePillsRow}>
                  {POPULAR_TIMES.map((t) => {
                    const isSelected = dailyTime === t.time;
                    return (
                      <TouchableOpacity
                        key={t.time}
                        style={[
                          styles.timePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setDailyTime(t.time)}
                      >
                        <Text style={[styles.timePillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* WEEKLY SCHEDULE DAY & TIME PICKER */}
            {cadence === 'WEEKLY' && (
              <View style={[styles.subScheduleBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.subScheduleTitle, { color: colors.textPrimary }]}>Select Weekly Sync Day</Text>
                <Text style={[styles.subScheduleSub, { color: colors.textMuted }]}>
                  Choose which day of the week to generate and upload the weekly batch.
                </Text>

                {/* Day selector pills */}
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = weeklyDay === d.id;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[
                          styles.dayPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setWeeklyDay(d.id)}
                      >
                        <Text style={[styles.dayPillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {d.short}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Time selector */}
                <Text style={[styles.subScheduleTitle, { color: colors.textPrimary, marginTop: 14 }]}>
                  Select Time of Day ({DAYS_OF_WEEK.find((d) => d.id === weeklyDay)?.label})
                </Text>
                <View style={styles.timePillsRow}>
                  {POPULAR_TIMES.map((t) => {
                    const isSelected = weeklyTime === t.time;
                    return (
                      <TouchableOpacity
                        key={t.time}
                        style={[
                          styles.timePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setWeeklyTime(t.time)}
                      >
                        <Text style={[styles.timePillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Next Scheduled Sync Display */}
            {nextSyncDate && (
              <View style={[styles.nextSyncBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="time-outline" size={16} color="#15803D" style={{ marginRight: 8 }} />
                <Text style={styles.nextSyncText}>
                  Next automatic sync:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {nextSyncDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                    {nextSyncDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Text>
              </View>
            )}

            {/* Spreadsheet Structure & Year-Month Tabs Preview */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 16 }]}>
              SHEET ARCHITECTURE (YEAR & MONTH TABS)
            </Text>
            <View style={[styles.tabsPreviewCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.tabsPreviewDesc, { color: colors.textSecondary }]}>
                The template automatically creates dedicated year and month tabs with monthly KPI banners and pivot totals:
              </Text>

              <View style={styles.tabsGrid}>
                {/* Master tabs */}
                {['Master Overview', 'Accounts & Cards', 'Investments & SIPs', 'Recurring & EMIs'].map((tab) => (
                  <View key={tab} style={[styles.tabChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="folder-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.tabChipText, { color: colors.textPrimary }]}>{tab}</Text>
                  </View>
                ))}

                {/* Monthly tabs */}
                {monthTabs.map((month) => (
                  <View
                    key={month}
                    style={[
                      styles.tabChip,
                      { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="calendar" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.tabChipText, { color: colors.primary, fontWeight: '700' }]}>{month}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.syncNowBtn,
                { backgroundColor: isSyncing ? colors.textMuted : colors.primary },
              ]}
              onPress={handleManualSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.syncNowBtnText}>
                {isSyncing
                  ? 'Batch Syncing to Sheets...'
                  : pendingChangesCount > 0
                  ? `Sync Now (${pendingChangesCount} pending updates)`
                  : 'Sync Now (All Up-To-Date)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={handleSaveSchedule}>
              <Text style={[styles.saveBtnText, { color: colors.textPrimary }]}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  drawerSheet: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 22,
    gap: 16,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toastText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sheetLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  sheetNameLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sheetName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rateLimitNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cadenceGrid: {
    gap: 10,
  },
  cadenceCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cadenceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cadenceSub: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  subScheduleBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  subScheduleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  subScheduleSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  timePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  nextSyncText: {
    fontSize: 12,
    color: '#15803D',
  },
  tabsPreviewCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabsPreviewDesc: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  tabsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  syncNowBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
