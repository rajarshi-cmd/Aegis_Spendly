import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ActiveTabKey } from './SpendlySidebar';

interface TabBarProps {
  currentTab: ActiveTabKey;
  onSelectTab: (tab: ActiveTabKey) => void;
  onOpenAddEntry?: () => void;
  onOpenProfile?: () => void;
  deletedCount?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddEntry,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const isHomeActive = currentTab === 'OVERVIEW';
  const isAnalyticsActive = currentTab === 'ANALYTICS' || currentTab === 'TRANSACTIONS';
  const isBudgetsActive = currentTab === 'BUDGETS';
  const isFixedActive = currentTab === 'FIXED' || currentTab === 'PLAN_AHEAD';
  const isToolsActive =
    currentTab === 'TOOLS' || currentTab === 'BANKS' || currentTab === 'CREDIT_CARDS';

  const tabs: {
    key: ActiveTabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    isActive: boolean;
  }[] = [
    {
      key: 'OVERVIEW',
      label: 'Home',
      icon: 'grid-outline',
      activeIcon: 'grid',
      isActive: isHomeActive,
    },
    {
      key: 'ANALYTICS',
      label: 'Analytics',
      icon: 'stats-chart-outline',
      activeIcon: 'stats-chart',
      isActive: isAnalyticsActive,
    },
    {
      key: 'BUDGETS',
      label: 'Budget',
      icon: 'pie-chart-outline',
      activeIcon: 'pie-chart',
      isActive: isBudgetsActive,
    },
    {
      key: 'FIXED',
      label: 'Fixed',
      icon: 'time-outline',
      activeIcon: 'time',
      isActive: isFixedActive,
    },
    {
      key: 'TOOLS',
      label: 'Tools',
      icon: 'wallet-outline',
      activeIcon: 'wallet',
      isActive: isToolsActive,
    },
  ];

  return (
    <View
      style={[
        styles.navBarWrapper,
        {
          backgroundColor: colors.background || '#051424',
          borderTopColor: colors.borderSubtle || '#1c2b3c',
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View style={styles.navRow}>
        {/* Navigation Items (Left Segment) */}
        <View style={styles.tabIconsGroup}>
          {tabs.map((tab) => {
            if (tab.isActive) {
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.activePill,
                    {
                      backgroundColor: 'rgba(82, 183, 136, 0.14)',
                      borderColor: 'rgba(82, 183, 136, 0.4)',
                    },
                  ]}
                  onPress={() => onSelectTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.activeIcon} size={18} color="#52b788" />
                  <Text style={[styles.activePillText, { color: '#52b788' }]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.inactiveIconBtn}
                onPress={() => onSelectTab(tab.key)}
                activeOpacity={0.7}
                accessibilityLabel={tab.label}
              >
                <Ionicons name={tab.icon} size={21} color={colors.textMuted || '#94a3b8'} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Divider */}
        <View style={[styles.verticalDivider, { backgroundColor: colors.surfaceVariant || '#273647' }]} />

        {/* Elevated Gradient FAB (+) */}
        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: '#2d6a4f',
              shadowColor: '#2d6a4f',
            },
          ]}
          onPress={onOpenAddEntry}
          activeOpacity={0.85}
          accessibilityLabel="Add Transaction"
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBarWrapper: {
    borderTopWidth: 1,
    paddingTop: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  tabIconsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inactiveIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 6,
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
});
