import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface FinancialCycleModalProps {
  visible: boolean;
  activeMonth: string;
  onSelectMonth: (month: string) => void;
  onClose: () => void;
}

const MONTHS = [
  { short: 'Jan', name: 'January', q: 'Q1' },
  { short: 'Feb', name: 'February', q: 'Q1' },
  { short: 'Mar', name: 'March', q: 'Q1' },
  { short: 'Apr', name: 'April', q: 'Q2' },
  { short: 'May', name: 'May', q: 'Q2' },
  { short: 'Jun', name: 'June', q: 'Q2' },
  { short: 'Jul', name: 'July', q: 'Q3' },
  { short: 'Aug', name: 'August', q: 'Q3' },
  { short: 'Sep', name: 'September', q: 'Q3' },
  { short: 'Oct', name: 'October', q: 'Q4' },
  { short: 'Nov', name: 'November', q: 'Q4' },
  { short: 'Dec', name: 'December', q: 'Q4' },
];

export const FinancialCycleModal: React.FC<FinancialCycleModalProps> = ({
  visible,
  activeMonth,
  onSelectMonth,
  onClose,
}) => {
  const { colors } = useTheme();

  // Extract year from activeMonth or default to current year
  const initialYear = parseInt(
    (activeMonth || '').match(/\d{4}/)?.[0] || new Date().getFullYear().toString(),
    10
  );
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  const handleSelect = (monthName: string) => {
    onSelectMonth(`${monthName} ${selectedYear}`);
    onClose();
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
          {/* Subtle Glow Accent Line */}
          <View style={[styles.glowLine, { backgroundColor: colors.primary }]} />

          {/* Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.grabHandle, { backgroundColor: colors.surfaceVariant || '#273647' }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Financial Cycle</Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Select billing & ledger cycle period
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Year Pills */}
          <View style={[styles.yearPillsRow, { backgroundColor: colors.surfaceContainerLowest || '#010f1f' }]}>
            {years.map((y) => {
              const isYearSelected = y === selectedYear;
              return (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.yearPill,
                    isYearSelected && [
                      styles.activeYearPill,
                      { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' },
                    ],
                  ]}
                  onPress={() => setSelectedYear(y)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.yearPillText,
                      { color: isYearSelected ? colors.primary : colors.textMuted },
                      isYearSelected && styles.activeYearPillText,
                    ]}
                  >
                    {y}
                  </Text>
                  {isYearSelected && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ledger Month Header & Indicator */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LEDGER MONTH</Text>
            <View style={styles.qIndicator}>
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={[styles.qText, { color: colors.primary }]}>Active Period</Text>
            </View>
          </View>

          {/* Month 3x4 Grid */}
          <View style={styles.grid}>
            {MONTHS.map((m) => {
              const formattedName = `${m.name} ${selectedYear}`;
              const isSelected = (activeMonth || '').toLowerCase() === formattedName.toLowerCase();

              return (
                <TouchableOpacity
                  key={m.name}
                  style={[
                    styles.monthCell,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight || 'rgba(82, 183, 136, 0.16)'
                        : colors.surfaceContainer || '#122131',
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(m.name)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.monthShort,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                      isSelected && styles.activeMonthText,
                    ]}
                  >
                    {m.short}
                  </Text>
                  <Text style={[styles.quarterBadge, { color: colors.textMuted }]}>{m.q}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPillsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  yearPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  activeYearPill: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeYearPillText: {
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  qIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  monthShort: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeMonthText: {
    fontWeight: '700',
  },
  quarterBadge: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
});
