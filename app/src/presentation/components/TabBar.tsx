import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ActiveTabKey } from './SpendlySidebar';

interface TabBarProps {
  currentTab: ActiveTabKey;
  onSelectTab: (tab: ActiveTabKey) => void;
  deletedCount?: number;
  onOpenProfile?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onSelectTab, deletedCount = 0, onOpenProfile }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const tabs: { key: ActiveTabKey | 'PROFILE'; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { key: 'OVERVIEW', label: 'Overview', icon: 'grid-outline' },
    { key: 'TRANSACTIONS', label: 'Entries', icon: 'list-outline' },
    { key: 'CREDIT_CARDS', label: 'Cards', icon: 'card-outline' },
    { key: 'BANKS', label: 'Banks', icon: 'business-outline' },
    { key: 'PLAN_AHEAD', label: 'Plan', icon: 'calendar-outline' },
    { key: 'INVESTMENTS', label: 'Invest', icon: 'trending-up-outline' },
    { key: 'HISTORY', label: 'History', icon: 'reload-outline', badge: deletedCount > 0 ? deletedCount : undefined },
    { key: 'PROFILE', label: 'Profile', icon: 'person-outline' },
  ];

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                if (tab.key === 'PROFILE') {
                  onOpenProfile?.();
                } else {
                  onSelectTab(tab.key);
                }
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                {tab.badge !== undefined && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textMuted },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexGrow: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    minWidth: 54,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
