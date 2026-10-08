import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export type ActiveTabKey =
  | 'OVERVIEW'
  | 'TRANSACTIONS'
  | 'CREDIT_CARDS'
  | 'BANKS'
  | 'PLAN_AHEAD'
  | 'INVESTMENTS'
  | 'HISTORY';

interface SpendlySidebarProps {
  activeTab: ActiveTabKey;
  onSelectTab: (tab: ActiveTabKey) => void;
  transactionCount: number;
  deletedCount: number;
}

export const SpendlySidebar: React.FC<SpendlySidebarProps> = ({
  activeTab,
  onSelectTab,
  transactionCount,
  deletedCount,
}) => {
  const { colors } = useTheme();

  const navItems: {
    key: ActiveTabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: number;
  }[] = [
    { key: 'OVERVIEW', label: 'Overview', icon: 'grid-outline' },
    { key: 'TRANSACTIONS', label: 'Transactions', icon: 'list-outline' },
    { key: 'CREDIT_CARDS', label: 'Credit cards', icon: 'card-outline' },
    { key: 'BANKS', label: 'Banks', icon: 'business-outline' },
    { key: 'PLAN_AHEAD', label: 'Plan ahead', icon: 'calendar-outline' },
    { key: 'INVESTMENTS', label: 'Investments', icon: 'trending-up-outline' },
    { key: 'HISTORY', label: 'History', icon: 'reload-outline', badge: deletedCount > 0 ? deletedCount : undefined },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRightColor: colors.borderSubtle }]}>
      {/* Brand Logo */}
      <View style={styles.brandRow}>
        <View style={[styles.logoIconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="wallet" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.brandText, { color: colors.textPrimary }]}>spendly</Text>
      </View>

      {/* Workspace pill */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.workspacePill, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
      >
        <View style={styles.workspacePillLeft}>
          <View style={[styles.workspaceIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.workspaceTitle, { color: colors.textPrimary }]}>Personal space</Text>
            <Text style={[styles.workspaceSubtitle, { color: colors.textMuted }]}>Private workspace</Text>
          </View>
        </View>
        <Ionicons name="chevron-expand" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WORKSPACE</Text>

      {/* Nav Items */}
      <View style={styles.navGroup}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && [styles.navItemActive, { backgroundColor: colors.primaryLight }],
              ]}
              onPress={() => onSelectTab(item.key)}
              activeOpacity={0.7}
            >
              <View style={styles.navItemLeft}>
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={isActive ? colors.primary : colors.textSecondary}
                  style={styles.navIcon}
                />
                <Text
                  style={[
                    styles.navLabel,
                    { color: isActive ? colors.primary : colors.textSecondary },
                    isActive && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              {item.badge !== undefined && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isActive ? colors.primary : colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isActive ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {/* Small wins footer card */}
      <View style={[styles.smallWinsCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={styles.smallWinsIcon}>
          <Ionicons name="trending-up" size={16} color="#B45309" />
        </View>
        <View style={styles.smallWinsBody}>
          <Text style={styles.smallWinsTitle}>Small wins add up</Text>
          <Text style={styles.smallWinsDesc}>You saved 62% this month.</Text>
        </View>
      </View>

      {/* Version and sync indicator */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Spendly v1.0</Text>
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.syncText, { color: colors.textMuted }]}>Synced just now</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  workspacePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  workspaceTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  workspaceSubtitle: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  navGroup: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: {
    // handled inline with primaryLight
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navIcon: {
    marginRight: 12,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  smallWinsCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  smallWinsIcon: {
    marginRight: 10,
  },
  smallWinsBody: {
    flex: 1,
  },
  smallWinsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  smallWinsDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  syncText: {
    fontSize: 11,
  },
});
