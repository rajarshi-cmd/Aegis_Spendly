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
  onOpenProfile,
  deletedCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
      <View style={styles.barRow}>
        {/* 1. Overview */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('OVERVIEW')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              currentTab === 'OVERVIEW' && { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={currentTab === 'OVERVIEW' ? 'grid' : 'grid-outline'}
              size={19}
              color={currentTab === 'OVERVIEW' ? colors.primary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: currentTab === 'OVERVIEW' ? colors.primary : colors.textMuted },
              currentTab === 'OVERVIEW' && { fontWeight: '700' },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        {/* 2. Entries (Transactions) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('TRANSACTIONS')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              currentTab === 'TRANSACTIONS' && { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={currentTab === 'TRANSACTIONS' ? 'receipt' : 'receipt-outline'}
              size={19}
              color={currentTab === 'TRANSACTIONS' ? colors.primary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: currentTab === 'TRANSACTIONS' ? colors.primary : colors.textMuted },
              currentTab === 'TRANSACTIONS' && { fontWeight: '700' },
            ]}
          >
            Entries
          </Text>
        </TouchableOpacity>

        {/* 3. Big Elevated Plus Button (Center Primary Action) */}
        <View style={styles.centerButtonContainer}>
          <TouchableOpacity
            style={[
              styles.bigPlusButton,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
            onPress={onOpenAddEntry}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 4. Cards (Credit Cards) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('CREDIT_CARDS')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              currentTab === 'CREDIT_CARDS' && { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={currentTab === 'CREDIT_CARDS' ? 'card' : 'card-outline'}
              size={19}
              color={currentTab === 'CREDIT_CARDS' ? colors.primary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: currentTab === 'CREDIT_CARDS' ? colors.primary : colors.textMuted },
              currentTab === 'CREDIT_CARDS' && { fontWeight: '700' },
            ]}
          >
            Cards
          </Text>
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={onOpenProfile}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="person-outline"
              size={19}
              color={colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, { color: colors.textMuted }]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    borderTopWidth: 1,
    paddingTop: 6,
    position: 'relative',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: -16, // Protrudes above the bar
  },
  bigPlusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
