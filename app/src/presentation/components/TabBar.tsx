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
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View style={styles.barRow}>
        {/* 1. Expenses (Transactions / Expense Tracker) */}
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
            Expenses
          </Text>
        </TouchableOpacity>

        {/* 2. Plan Ahead (Upcoming Commitments / Next Month) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('PLAN_AHEAD')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              currentTab === 'PLAN_AHEAD' && { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={currentTab === 'PLAN_AHEAD' ? 'calendar' : 'calendar-outline'}
              size={19}
              color={currentTab === 'PLAN_AHEAD' ? colors.primary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: currentTab === 'PLAN_AHEAD' ? colors.primary : colors.textMuted },
              currentTab === 'PLAN_AHEAD' && { fontWeight: '700' },
            ]}
          >
            Plan Ahead
          </Text>
        </TouchableOpacity>

        {/* 3. Big Elevated Plus Button (Center Primary Action — TikTok Style) */}
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
            <Ionicons name="add" size={30} color="#FFFFFF" />
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

        {/* 5. Banks (Bank Accounts) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('BANKS')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              currentTab === 'BANKS' && { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={currentTab === 'BANKS' ? 'business' : 'business-outline'}
              size={19}
              color={currentTab === 'BANKS' ? colors.primary : colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: currentTab === 'BANKS' ? colors.primary : colors.textMuted },
              currentTab === 'BANKS' && { fontWeight: '700' },
            ]}
          >
            Banks
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
    width: '100%',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
    marginTop: -20, // Elevated TikTok style protrusion above the bar
  },
  bigPlusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
