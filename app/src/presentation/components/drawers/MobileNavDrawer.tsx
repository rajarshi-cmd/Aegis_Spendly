import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { UserProfile } from '../../../core/types/profile';
import { ActiveTabKey } from '../SpendlySidebar';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

interface MobileNavDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentTab: ActiveTabKey;
  onSelectTab: (tab: ActiveTabKey) => void;
  profile: UserProfile;
  deletedCount?: number;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenSync: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  visible,
  onClose,
  currentTab,
  onSelectTab,
  profile,
  deletedCount = 0,
  onOpenProfile,
  onOpenSettings,
  onOpenSync,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lockSession } = useAuthSecurity();
  const { width } = useWindowDimensions();

  if (!visible) return null;

  const sideNavItems: {
    key?: ActiveTabKey;
    action?: () => void;
    label: string;
    sublabel: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: number;
    color?: string;
  }[] = [
    {
      key: 'BANKS',
      label: 'Banks & Liquidity',
      sublabel: 'Savings, deposits & MAB Amber alerts',
      icon: 'business-outline',
    },
    {
      key: 'PLAN_AHEAD',
      label: 'Plan Ahead',
      sublabel: 'Subscriptions, recurring EMIs & budgets',
      icon: 'calendar-outline',
    },
    {
      key: 'INVESTMENTS',
      label: 'Investments & SIPs',
      sublabel: 'Portfolio tracking & wealth growth',
      icon: 'trending-up-outline',
    },
    {
      key: 'HISTORY',
      label: 'Recovery Shelf',
      sublabel: 'Restore accidentally deleted entries',
      icon: 'reload-outline',
      badge: deletedCount > 0 ? deletedCount : undefined,
    },
    {
      action: () => {
        onClose();
        onOpenSync();
      },
      label: 'Google Drive Sync',
      sublabel: 'Backup sheets to dedicated Drive folder',
      icon: 'cloud-upload-outline',
      color: '#3B82F6',
    },
    {
      action: () => {
        onClose();
        onOpenSettings();
      },
      label: 'Settings & Security',
      sublabel: 'Theme, auto-lock & PIN preferences',
      icon: 'settings-outline',
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.drawerContainer,
            {
              backgroundColor: colors.surface,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              borderRightColor: colors.borderSubtle,
            },
          ]}
        >
          {/* Header with App Logo & Close */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={[styles.brandIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Aegis Spendly</Text>
                <Text style={[styles.brandSub, { color: colors.textMuted }]}>Offline Secure Vault</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <TouchableOpacity
            style={[styles.userCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
            onPress={() => {
              onClose();
              onOpenProfile();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.userAvatarBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {profile.name || profile.username || 'Vault User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {profile.email || 'Encrypted on-device'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>EXTENDED HUBS</Text>

            {sideNavItems.map((item, idx) => {
              const isSelected = item.key ? currentTab === item.key : false;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.navItem,
                    isSelected && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.key) {
                      onSelectTab(item.key);
                      onClose();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.itemIconWrap,
                      { backgroundColor: isSelected ? colors.primary : colors.background },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isSelected ? '#FFFFFF' : item.color || colors.textPrimary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.sublabel}
                    </Text>
                  </View>
                  {item.badge !== undefined && (
                    <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Warning Box */}
            <View style={[styles.dataWarningBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" style={{ marginTop: 2, marginRight: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dataWarningTitle}>UNLINKED STORAGE WARNING</Text>
                <Text style={[styles.dataWarningText, { color: colors.textSecondary }]}>
                  Data deleted on uninstall unless backed up to Google Drive.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer with Lock Vault */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.lockBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => {
                onClose();
                lockSession();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.lockBtnText, { color: colors.textPrimary }]}>Lock Vault Session</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: '82%',
    maxWidth: 340,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
  },
  closeBtn: {
    padding: 6,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  userAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  menuScroll: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  dataWarningBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  dataWarningTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  dataWarningText: {
    fontSize: 10,
    lineHeight: 14,
  },
  drawerFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  lockBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
