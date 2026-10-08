import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePresetName, THEME_PRESETS } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';
import { AutoLockPreset } from '../../../core/types/auth';
import { PinVerificationModal } from '../modals/PinVerificationModal';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  initialSecurityUnlocked?: boolean;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  visible,
  onClose,
  initialSecurityUnlocked = false,
}) => {
  const { themeName, colors, setThemeName } = useTheme();
  const { config: securityConfig, updateConfig: updateSecurityConfig } = useAuthSecurity();

  const [activePreset, setActivePreset] = useState<ThemePresetName>(themeName);
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(securityConfig.autoLockOnBlur);
  const [inactivityMinutes, setInactivityMinutes] = useState(securityConfig.inactivityTimeoutMinutes);
  const [selectedLockPreset, setSelectedLockPreset] = useState<AutoLockPreset>(
    securityConfig.lockPreset || 'BALANCED'
  );
  const [securityUnlocked, setSecurityUnlocked] = useState(initialSecurityUnlocked);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (visible) {
      setSecurityUnlocked(initialSecurityUnlocked);
      setActivePreset(themeName);
      setAutoLockOnBlur(securityConfig.autoLockOnBlur);
      setInactivityMinutes(securityConfig.inactivityTimeoutMinutes);
      setSelectedLockPreset(securityConfig.lockPreset || 'BALANCED');
    }
  }, [visible, initialSecurityUnlocked, themeName, securityConfig]);

  const requireSecurityUnlock = (action: () => void) => {
    if (securityUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setShowPinModal(true);
    }
  };

  const presets: { id: ThemePresetName; label: string; dotColor: string }[] = [
    { id: 'Soft Mint', label: 'Soft Mint', dotColor: '#0F4C3A' },
    { id: 'Warm Sunset', label: 'Warm Sunset', dotColor: '#9A3412' },
    { id: 'Night Ledger', label: 'Night Ledger', dotColor: '#10B981' },
    { id: 'Lavender', label: 'Lavender', dotColor: '#6D28D9' },
  ];

  const handleSelectLockPreset = (preset: AutoLockPreset) => {
    requireSecurityUnlock(() => {
      setSelectedLockPreset(preset);
      switch (preset) {
        case 'HIGH':
          setAutoLockOnBlur(true);
          setInactivityMinutes(1);
          break;
        case 'BALANCED':
          setAutoLockOnBlur(true);
          setInactivityMinutes(5);
          break;
        case 'RELAXED':
          setAutoLockOnBlur(false);
          setInactivityMinutes(15);
          break;
        case 'EXTENDED':
          setAutoLockOnBlur(false);
          setInactivityMinutes(30);
          break;
        case 'CUSTOM':
          break;
      }
    });
  };

  const handleSave = () => {
    setThemeName(activePreset);
    if (securityUnlocked) {
      updateSecurityConfig({
        autoLockOnBlur,
        inactivityTimeoutMinutes: inactivityMinutes,
        lockPreset: selectedLockPreset,
      });
    }
    onClose();
  };

  const previewColors = THEME_PRESETS[activePreset];

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.microHeader, { color: colors.textMuted }]}>WORKSPACE PREFERENCES</Text>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Theme & Appearance Section */}
            <View style={[styles.bannerCard, { backgroundColor: colors.primaryLight, borderColor: colors.borderSubtle }]}>
              <Ionicons name="color-palette-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Every color, in one place</Text>
                <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                  Presets and custom tokens update panels, type, borders, headers, and buttons.
                </Text>
              </View>
            </View>

            {/* Theme Preset Cards */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>THEME PRESET</Text>
            <View style={styles.presetsGrid}>
              {presets.map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetCard,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                      },
                    ]}
                    onPress={() => setActivePreset(p.id)}
                  >
                    <View style={[styles.presetDot, { backgroundColor: p.dotColor }]} />
                    <Text
                      style={[
                        styles.presetLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {p.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. VAULT AUTO-LOCK & SECURITY SECTION */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4 }}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 0 }]}>
                VAULT AUTO-LOCK & SECURITY
              </Text>
              <TouchableOpacity
                style={[
                  styles.lockBadge,
                  {
                    backgroundColor: securityUnlocked ? colors.primaryLight : '#FEF3C7',
                    borderColor: securityUnlocked ? colors.primary : '#F59E0B',
                  },
                ]}
                onPress={() => {
                  if (!securityUnlocked) {
                    setShowPinModal(true);
                  }
                }}
              >
                <Ionicons
                  name={securityUnlocked ? 'lock-open-outline' : 'lock-closed'}
                  size={11}
                  color={securityUnlocked ? colors.primary : '#B45309'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.lockBadgeText, { color: securityUnlocked ? colors.primary : '#92400E' }]}>
                  {securityUnlocked ? 'Unlocked' : 'PIN Required'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Choose how often your private ledger locks with your Master PIN.
            </Text>

            <View style={styles.lockOptionsGrid}>
              {[
                {
                  id: 'HIGH' as AutoLockPreset,
                  title: 'Paranoid (1 Min)',
                  desc: '1m idle + Locks immediately when switching tabs.',
                  tag: 'Shared Devices',
                  icon: 'shield-half',
                },
                {
                  id: 'BALANCED' as AutoLockPreset,
                  title: 'Balanced (5 Mins)',
                  desc: '5m idle + Locks immediately when switching tabs.',
                  tag: 'Recommended',
                  icon: 'shield-checkmark',
                },
                {
                  id: 'RELAXED' as AutoLockPreset,
                  title: 'Relaxed (15 Mins)',
                  desc: '15m idle. Quick tab switches do NOT lock vault.',
                  tag: 'Personal Laptops',
                  icon: 'cafe-outline',
                },
                {
                  id: 'EXTENDED' as AutoLockPreset,
                  title: 'Extended (30 Mins)',
                  desc: '30m idle. Uninterrupted tab multitasking.',
                  tag: 'Dedicated Desk',
                  icon: 'laptop-outline',
                },
              ].map((item) => {
                const isSelected = selectedLockPreset === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.lockCard,
                      {
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        backgroundColor: isSelected ? colors.primaryLight : colors.background,
                      },
                    ]}
                    onPress={() => handleSelectLockPreset(item.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.lockCardTitle,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.lockCardBadge,
                          { backgroundColor: isSelected ? colors.primary : '#E2E8F0' },
                        ]}
                      >
                        <Text style={[styles.lockCardBadgeText, { color: isSelected ? '#FFFFFF' : '#475569' }]}>
                          {item.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.lockCardDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fine-Tuning Controls */}
            <View style={[styles.fineTuneCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
              {/* Tab Switch Lock Toggle */}
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => {
                  requireSecurityUnlock(() => {
                    setAutoLockOnBlur(!autoLockOnBlur);
                    setSelectedLockPreset('CUSTOM');
                  });
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                    Lock immediately on tab switch
                  </Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Hides numbers whenever browser tab loses focus
                  </Text>
                </View>
                <View
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: autoLockOnBlur ? colors.primary : '#CBD5E1',
                    padding: 2,
                    justifyContent: 'center',
                    alignItems: autoLockOnBlur ? 'flex-end' : 'flex-start',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#FFFFFF',
                      elevation: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1.5,
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* Inactivity Duration Pills */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                  Inactivity Idle Duration
                </Text>
                <View style={styles.pillsRow}>
                  {[1, 5, 15, 30, 0].map((mins) => {
                    const isSel = inactivityMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.pillBtn,
                          {
                            backgroundColor: isSel ? colors.primary : colors.surface,
                            borderColor: isSel ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => {
                          requireSecurityUnlock(() => {
                            setInactivityMinutes(mins);
                            setSelectedLockPreset('CUSTOM');
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            { color: isSel ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {mins === 0 ? 'Never' : `${mins}m`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Swatches preview */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 24 }]}>
              COLOR TOKENS PREVIEW
            </Text>
            <View style={[styles.swatchesCard, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}>
              {[
                { label: 'Primary accent', color: previewColors.primary },
                { label: 'Panels & surface', color: previewColors.surface },
                { label: 'Text color', color: previewColors.textPrimary },
                { label: 'Border outline', color: previewColors.border },
              ].map((s) => (
                <View key={s.label} style={[styles.swatchRow, { borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[styles.swatchLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  <View style={[styles.swatchBlock, { backgroundColor: s.color, borderColor: colors.border }]} />
                </View>
              ))}
            </View>

            {/* 4. APP VERSION & UPDATES SECTION */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 28 }]}>
              APP VERSION & UPDATES
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Direct install releases for physical Android devices.
            </Text>

            <View style={[styles.updateCard, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}>
              <View style={styles.updateRow}>
                <View>
                  <Text style={[styles.updateTitle, { color: colors.textPrimary }]}>Spendly Mobile</Text>
                  <Text style={[styles.updateVersion, { color: colors.textMuted }]}>Version 1.0.1 (Build 2)</Text>
                </View>
                <View style={[styles.updateTag, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.updateTagText, { color: colors.primary }]}>LATEST</Text>
                </View>
              </View>

              <Text style={[styles.updateDesc, { color: colors.textSecondary }]}>
                Updating via the APK link preserves all your accounts, transactions, and security settings automatically.
              </Text>

              <View style={styles.updateActions}>
                <TouchableOpacity
                  style={[styles.updateBtn, { backgroundColor: colors.primary }]}
                  onPress={() => Linking.openURL('https://rajarshi-cmd.github.io/Aegis_Spendly/')}
                >
                  <Ionicons name="download-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.updateBtnText}>Download Latest APK</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.updateSecondaryBtn, { borderColor: colors.borderSubtle }]}
                  onPress={() => Linking.openURL('https://github.com/rajarshi-cmd/Aegis_Spendly/releases')}
                >
                  <Ionicons name="logo-github" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.updateSecondaryBtnText, { color: colors.textPrimary }]}>Releases</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Settings ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* PIN Verification Modal */}
    <PinVerificationModal
      visible={showPinModal}
      title="Security Verification"
      subtitle="Enter your 4-digit Master PIN to modify Vault Lock Settings."
      iconName="lock-closed"
      onSuccess={() => {
        setShowPinModal(false);
        setSecurityUnlocked(true);
        if (pendingAction) {
          pendingAction();
          setPendingAction(null);
        }
      }}
      onCancel={() => {
        setShowPinModal(false);
        setPendingAction(null);
      }}
    />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 500,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 24,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  lockOptionsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  lockCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  lockCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  lockCardDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  fineTuneCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  swatchesCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  swatchBlock: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
  drawerFooter: {
    padding: 18,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  updateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  updateTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  updateVersion: {
    fontSize: 11,
    marginTop: 2,
  },
  updateTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  updateTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  updateDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  updateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  updateBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  updateSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  updateSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
