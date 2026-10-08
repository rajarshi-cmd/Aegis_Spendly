import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePresetName, THEME_PRESETS } from '../../theme';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { Account } from '../../../core/types/accounts';
import { formatRupee } from '../../../core/utils/currency';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

interface ProfileDrawerProps {
  visible: boolean;
  profile: UserProfile;
  accounts: Account[];
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenAddCard: () => void;
  onOpenAddBank: () => void;
  onEditAccount: (acc: Account) => void;
}

type ProfileTab = 'ACCOUNTS' | 'CUSTOMISE' | 'SECURITY' | 'GUIDE';

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  visible,
  profile,
  accounts,
  onClose,
  onUpdateProfile,
  onOpenAddCard,
  onOpenAddBank,
  onEditAccount,
}) => {
  const { colors, themeName, setThemeName } = useTheme();
  const {
    config: securityConfig,
    updateConfig: updateSecurityConfig,
    updatePin,
    verifyCurrentPin,
    deleteVault,
    signOut,
  } = useAuthSecurity();

  // Active sub-navigation tab (DEF-006)
  const [activeTab, setActiveTab] = useState<ProfileTab>('ACCOUNTS');

  // Profile info
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || 'user');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(profile.avatar);

  // Salary preferences
  const [salaryAmount, setSalaryAmount] = useState(profile.salary_amount.toString());
  const [salaryDay, setSalaryDay] = useState(profile.salary_day.toString().padStart(2, '0'));
  const [salaryAcc, setSalaryAcc] = useState(profile.salary_account_id);
  const [salarySavedToast, setSalarySavedToast] = useState(false);

  // Security preferences
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(securityConfig.autoLockOnBlur);
  const [inactivityMinutes, setInactivityMinutes] = useState(securityConfig.inactivityTimeoutMinutes);
  const [autoDeleteOnFailedPin, setAutoDeleteOnFailedPin] = useState(!!securityConfig.autoDeleteOnFailedPin);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState<number>(securityConfig.autoDeleteThreshold || 5);

  // Update PIN modal state
  const [showUpdatePinModal, setShowUpdatePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Delete Vault 2x PIN modal state (DEF-006 & DEF-007)
  const [showDeleteVaultModal, setShowDeleteVaultModal] = useState(false);
  const [deletePin1, setDeletePin1] = useState('');
  const [deletePin2, setDeletePin2] = useState('');
  const [deletePinError, setDeletePinError] = useState<string | null>(null);
  const [isDeletingVault, setIsDeletingVault] = useState(false);

  // Sync state when drawer opens
  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setUsername(profile.username || 'user');
      setSelectedAvatar(profile.avatar);
      setSalaryAmount(profile.salary_amount.toString());
      setSalaryDay(profile.salary_day.toString().padStart(2, '0'));
      setSalaryAcc(profile.salary_account_id);
      setAutoLockOnBlur(securityConfig.autoLockOnBlur);
      setInactivityMinutes(securityConfig.inactivityTimeoutMinutes);
      setAutoDeleteOnFailedPin(!!securityConfig.autoDeleteOnFailedPin);
      setAutoDeleteThreshold(securityConfig.autoDeleteThreshold || 5);
      setPinError(null);
      setPinSuccess(null);
      setDeletePinError(null);
    }
  }, [visible, profile, securityConfig]);

  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const avatarOptions: { id: AvatarId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'Moon cat', label: 'Moon cat', icon: 'paw' },
    { id: 'Forest rabbit', label: 'Forest rabbit', icon: 'leaf' },
    { id: 'Little ghost', label: 'Little ghost', icon: 'happy' },
    { id: 'Star mage', label: 'Star mage', icon: 'sparkles' },
    { id: 'Custom Google', label: 'Custom Google', icon: 'logo-google' },
  ];

  const themePresetsList: { id: ThemePresetName; label: string; dotColor: string }[] = [
    { id: 'Soft Mint', label: 'Soft Mint', dotColor: '#0F4C3A' },
    { id: 'Warm Sunset', label: 'Warm Sunset', dotColor: '#9A3412' },
    { id: 'Night Ledger', label: 'Night Ledger', dotColor: '#10B981' },
    { id: 'Lavender', label: 'Lavender', dotColor: '#6D28D9' },
  ];

  const handleSaveSalary = () => {
    const num = parseFloat(salaryAmount) || 0;
    const day = parseInt(salaryDay, 10) || 1;
    onUpdateProfile({
      salary_amount: num,
      salary_day: day,
      salary_account_id: salaryAcc,
    });
    setSalarySavedToast(true);
    setTimeout(() => setSalarySavedToast(false), 2000);
  };

  const commitProfileAndSecurityChanges = () => {
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    onUpdateProfile({
      name: name.trim() || profile.name,
      username: cleanUser || profile.username,
      handle: `@${cleanUser || profile.username}`,
      avatar: selectedAvatar,
    });

    updateSecurityConfig({
      autoLockOnBlur,
      inactivityTimeoutMinutes: inactivityMinutes,
      autoDeleteOnFailedPin,
      autoDeleteThreshold,
    });

    onClose();
  };

  const handleUpdatePinSubmit = async () => {
    setPinError(null);
    if (oldPin.length !== 4) {
      setPinError('Current PIN must be 4 digits.');
      return;
    }
    if (newPin.length !== 4) {
      setPinError('New PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PIN and confirmation PIN do not match.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const isCurrentValid = await verifyCurrentPin(oldPin);
      if (!isCurrentValid) {
        setPinError('Current PIN is incorrect.');
        setIsUpdatingPin(false);
        return;
      }

      const success = await updatePin(newPin);
      if (success) {
        setPinSuccess('Master PIN updated successfully! ✓');
        setTimeout(() => {
          setShowUpdatePinModal(false);
          setOldPin('');
          setNewPin('');
          setConfirmNewPin('');
          setPinSuccess(null);
        }, 1200);
      } else {
        setPinError('Failed to update PIN.');
      }
    } catch (e: any) {
      setPinError('Error updating PIN: ' + (e?.message || 'Failed'));
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleDeleteVaultSubmit = async () => {
    setDeletePinError(null);
    if (deletePin1.length !== 4 || deletePin2.length !== 4) {
      setDeletePinError('PIN must be 4 digits in both confirmation fields.');
      return;
    }
    if (deletePin1 !== deletePin2) {
      setDeletePinError('PIN entries do not match. Please re-enter identical PINs.');
      return;
    }

    setIsDeletingVault(true);
    try {
      const isCorrect = await verifyCurrentPin(deletePin1);
      if (!isCorrect) {
        setDeletePinError('Incorrect Master PIN. Vault was NOT deleted.');
        setIsDeletingVault(false);
        return;
      }

      await deleteVault();
      setShowDeleteVaultModal(false);
      onClose();
    } catch (e: any) {
      setDeletePinError('Error erasing vault: ' + (e?.message || 'Failed'));
      setIsDeletingVault(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.microHeader, { color: colors.textMuted }]}>COMMAND CENTER</Text>
                <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                  {profile.name || profile.username || 'Profile'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Profile Overview Banner */}
            <View style={[styles.profileBanner, { backgroundColor: colors.primaryLight }]}>
              <View style={[styles.bannerAvatar, { backgroundColor: colors.surface }]}>
                <Ionicons
                  name={
                    selectedAvatar === 'Forest rabbit'
                      ? 'leaf'
                      : selectedAvatar === 'Little ghost'
                      ? 'happy'
                      : selectedAvatar === 'Star mage'
                      ? 'sparkles'
                      : selectedAvatar === 'Custom Google'
                      ? 'logo-google'
                      : 'paw'
                  }
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.bannerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {profile.name || 'User'}
                </Text>
                <Text style={[styles.bannerEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  @{profile.username || 'user'} • Master Vault
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.signOutPill, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                onPress={() => {
                  onClose();
                  signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={13} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* 4 Dedicated Tabs per DEF-006: Accounts, Customise, Security, User Guide */}
            <View style={[styles.segmentedTabBar, { borderBottomColor: colors.borderSubtle }]}>
              {[
                { id: 'ACCOUNTS' as ProfileTab, label: 'Accounts', icon: 'wallet-outline' },
                { id: 'CUSTOMISE' as ProfileTab, label: 'Customise', icon: 'color-palette-outline' },
                { id: 'SECURITY' as ProfileTab, label: 'Security', icon: 'shield-checkmark-outline' },
                { id: 'GUIDE' as ProfileTab, label: 'User Guide', icon: 'book-outline' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.segmentTab,
                      isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={14}
                      color={isActive ? colors.primary : colors.textMuted}
                      style={{ marginBottom: 2 }}
                    />
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: isActive ? colors.primary : colors.textSecondary },
                        isActive && { fontWeight: '700' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Scrollable Tab Content */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* TAB 1: ACCOUNTS DETAILS */}
              {activeTab === 'ACCOUNTS' && (
                <View>
                  {/* Recurring Salary Section */}
                  <View style={styles.subHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>RECURRING SALARY</Text>
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly amount</Text>
                      <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                        <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                        <TextInput
                          style={[styles.currencyInput, { color: colors.textPrimary }]}
                          value={salaryAmount}
                          onChangeText={setSalaryAmount}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.formCol}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Payday date</Text>
                      <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                        value={salaryDay}
                        onChangeText={setSalaryDay}
                        keyboardType="numeric"
                        placeholder="01"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credited to bank</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {bankAccounts.map((b) => {
                        const isSelected = salaryAcc === b.id || salaryAcc === b.name;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            style={[
                              styles.smallChip,
                              {
                                borderColor: isSelected ? colors.primary : colors.border,
                                backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                              },
                            ]}
                            onPress={() => setSalaryAcc(b.id)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? colors.primary : colors.textPrimary,
                              }}
                            >
                              {b.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveSalaryBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={handleSaveSalary}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.saveSalaryText, { color: colors.primary }]}>
                      {salarySavedToast ? 'Saved!' : 'Save recurring salary'}
                    </Text>
                  </TouchableOpacity>

                  {/* Bank Accounts Section */}
                  <View style={[styles.subHeaderRow, { marginTop: 22 }]}>
                    <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>BANK BALANCES</Text>
                    <TouchableOpacity onPress={onOpenAddBank}>
                      <Text style={[styles.actionLink, { color: colors.primary }]}>+ Add Bank</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardsList}>
                    {bankAccounts.length === 0 ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 8 }}>
                        No bank accounts registered yet.
                      </Text>
                    ) : (
                      bankAccounts.map((b) => (
                        <View key={b.id} style={[styles.listItem, { borderBottomColor: colors.borderSubtle }]}>
                          <View>
                            <Text style={[styles.listItemTitle, { color: colors.textPrimary }]}>{b.name}</Text>
                            <Text style={[styles.listItemSub, { color: colors.textMuted }]}>
                              Balance: {formatRupee(b.balance)}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => onEditAccount(b)}>
                            <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Credit Cards Section */}
                  <View style={[styles.subHeaderRow, { marginTop: 22 }]}>
                    <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CREDIT CARDS</Text>
                    <TouchableOpacity onPress={onOpenAddCard}>
                      <Text style={[styles.actionLink, { color: colors.primary }]}>+ Add Card</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardsList}>
                    {creditCards.length === 0 ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 8 }}>
                        No credit cards configured yet.
                      </Text>
                    ) : (
                      creditCards.map((c) => (
                        <View key={c.id} style={[styles.listItem, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="card-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <View>
                              <Text style={[styles.listItemTitle, { color: colors.textPrimary }]}>{c.name}</Text>
                              <Text style={[styles.listItemSub, { color: colors.textMuted }]}>
                                Limit: {formatRupee(c.credit_limit || 0)}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => onEditAccount(c)}>
                            <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* TAB 2: CUSTOMISE (Avatar & App Themes) */}
              {activeTab === 'CUSTOMISE' && (
                <View>
                  <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>AVATAR & IDENTITY</Text>
                  <View style={styles.avatarGrid}>
                    {avatarOptions.map((opt) => {
                      const isSelected = selectedAvatar === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.avatarCard,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                            },
                          ]}
                          onPress={() => setSelectedAvatar(opt.id)}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.avatarLabel,
                              { color: isSelected ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {opt.label}
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

                  <View style={[styles.formRow, { marginTop: 14 }]}>
                    <View style={styles.formCol}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display name</Text>
                      <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vault Username</Text>
                      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', borderColor: colors.border }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700', marginRight: 4 }}>@</Text>
                        <TextInput
                          style={{ flex: 1, color: colors.textPrimary }}
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  </View>

                  {/* App Theme Presets (DEF-006) */}
                  <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 22 }]}>
                    APP THEME PRESET
                  </Text>
                  <View style={styles.presetsGrid}>
                    {themePresetsList.map((p) => {
                      const isSelected = themeName === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.themePresetCard,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                            },
                          ]}
                          onPress={() => setThemeName(p.id)}
                        >
                          <View style={[styles.colorDot, { backgroundColor: p.dotColor }]} />
                          <Text
                            style={[
                              styles.presetTitle,
                              { color: isSelected ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {p.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* TAB 3: SECURITY (Auto-Lock, Update PIN, Auto-Delete Slider, Delete Vault) */}
              {activeTab === 'SECURITY' && (
                <View>
                  {/* Master PIN Update */}
                  <View style={[styles.cardBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.cardBoxTitle, { color: colors.textPrimary }]}>Master PIN Security</Text>
                        <Text style={[styles.cardBoxSub, { color: colors.textMuted }]}>
                          Your 4-digit PIN encrypts all local data and unlocks your device session.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.outlineBtn, { borderColor: colors.primary }]}
                        onPress={() => {
                          setOldPin('');
                          setNewPin('');
                          setConfirmNewPin('');
                          setPinError(null);
                          setShowUpdatePinModal(true);
                        }}
                      >
                        <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Update PIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Inactivity Lock Duration */}
                  <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 18 }]}>
                    INACTIVITY AUTO-LOCK
                  </Text>
                  <View style={styles.inactivityRow}>
                    {[1, 5, 15, 30, 0].map((mins) => {
                      const isSel = inactivityMinutes === mins;
                      return (
                        <TouchableOpacity
                          key={mins}
                          style={[
                            styles.minutePill,
                            {
                              backgroundColor: isSel ? colors.primary : colors.surface,
                              borderColor: isSel ? colors.primary : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => {
                            setInactivityMinutes(mins);
                            updateSecurityConfig({ inactivityTimeoutMinutes: mins });
                          }}
                        >
                          <Text style={[styles.minutePillText, { color: isSel ? '#FFFFFF' : colors.textPrimary }]}>
                            {mins === 0 ? 'Never' : `${mins}m`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Lock on Tab Switch / Window Blur Toggle (Sliding Knob DEF-001) */}
                  <View style={[styles.cardBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle, marginTop: 14 }]}>
                    <TouchableOpacity
                      style={styles.toggleRow}
                      onPress={() => {
                        const next = !autoLockOnBlur;
                        setAutoLockOnBlur(next);
                        updateSecurityConfig({ autoLockOnBlur: next });
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                          Lock immediately on tab switch / window blur
                        </Text>
                        <Text style={[styles.toggleHelper, { color: colors.textMuted }]}>
                          Protects numbers whenever you multitask away from Spendly
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
                  </View>

                  {/* Auto-Delete Vault on Failed PIN Inputs (DEF-006, DEF-007) */}
                  <View style={[styles.cardBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle, marginTop: 14 }]}>
                    <TouchableOpacity
                      style={styles.toggleRow}
                      onPress={() => {
                        const next = !autoDeleteOnFailedPin;
                        setAutoDeleteOnFailedPin(next);
                        updateSecurityConfig({ autoDeleteOnFailedPin: next, autoDeleteThreshold });
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.toggleLabel, { color: autoDeleteOnFailedPin ? '#DC2626' : colors.textPrimary }]}>
                          Auto-delete vault on failed PIN attempts
                        </Text>
                        <Text style={[styles.toggleHelper, { color: colors.textMuted }]}>
                          Permanently wipes all local accounts and records if consecutive wrong PINs are entered.
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 46,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: autoDeleteOnFailedPin ? '#DC2626' : '#CBD5E1',
                          padding: 2,
                          justifyContent: 'center',
                          alignItems: autoDeleteOnFailedPin ? 'flex-end' : 'flex-start',
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

                    {autoDeleteOnFailedPin && (
                      <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderColor: '#FECACA', borderWidth: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C', marginBottom: 4 }}>
                          Auto-Delete Threshold: {autoDeleteThreshold} Failed Inputs
                        </Text>
                        <Text style={{ fontSize: 11, color: '#7F1D1D', marginBottom: 10 }}>
                          Vault will be permanently deleted after {autoDeleteThreshold} wrong inputs. Select a threshold from 3 to 10:
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                            const isSel = autoDeleteThreshold === num;
                            return (
                              <TouchableOpacity
                                key={num}
                                style={[
                                  styles.minutePill,
                                  {
                                    backgroundColor: isSel ? '#DC2626' : '#FFFFFF',
                                    borderColor: isSel ? '#DC2626' : '#FECACA',
                                    minWidth: 34,
                                  },
                                ]}
                                onPress={() => {
                                  setAutoDeleteThreshold(num);
                                  updateSecurityConfig({ autoDeleteThreshold: num });
                                }}
                              >
                                <Text style={[styles.minutePillText, { color: isSel ? '#FFFFFF' : '#991B1B', fontWeight: isSel ? '700' : '500' }]}>
                                  {num}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Danger Zone: Delete Vault with 2x PIN Confirmation (DEF-006) */}
                  <View style={[styles.dangerCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginTop: 22 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="trash-bin-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>Delete Vault</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 16, marginBottom: 12 }}>
                      Permanent action: securely wipes all local SQLite database tables, credentials, and settings.
                      Requires your Master PIN confirmation twice.
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteVaultBtn}
                      onPress={() => {
                        setDeletePin1('');
                        setDeletePin2('');
                        setDeletePinError(null);
                        setShowDeleteVaultModal(true);
                      }}
                    >
                      <Text style={styles.deleteVaultBtnText}>Delete Vault (Requires 2x PIN)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 4: USER GUIDE (DEF-006) */}
              {activeTab === 'GUIDE' && (
                <View style={{ gap: 12 }}>
                  <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>HOW AEGIS SPENDLY WORKS</Text>

                  {[
                    {
                      icon: 'shield-checkmark',
                      title: '100% Offline & Private by Design',
                      desc: 'Spendly has zero backend servers. All your financial entries, card numbers, and budgets are kept strictly encrypted in local on-device SQLite storage.',
                    },
                    {
                      icon: 'key',
                      title: 'Master PIN & Safe Sign Out',
                      desc: 'Your 4-digit Master PIN is the master key to your device vault. If you Sign Out, your encrypted ledger is safely preserved. You can unlock it anytime with your PIN.',
                    },
                    {
                      icon: 'add-circle',
                      title: 'Center (+) Add Entry Button',
                      desc: 'Add transactions on the fly like in TikTok! The elevated center button on the bottom bar opens quick-entry logging for Debits, Credits, and Transfers.',
                    },
                    {
                      icon: 'card',
                      title: 'Credit Cards & Cut-Off Tracking',
                      desc: 'Manage multiple credit cards with cycle awareness. Track statement cut dates and due dates so you never pay interest fees.',
                    },
                    {
                      icon: 'calendar',
                      title: 'Plan Ahead & Commitments',
                      desc: 'Reserve funds for upcoming bills, subscriptions, and SIP investments before next month starts to maintain healthy cashflow.',
                    },
                    {
                      icon: 'alert-circle',
                      title: 'Auto-Delete Brute Force Protection',
                      desc: 'Configure auto-deletion (3 to 10 attempts) under Security. If someone guesses your PIN repeatedly, the vault wipes automatically to protect privacy.',
                    },
                  ].map((guide, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.guideCard,
                        { backgroundColor: colors.background, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name={guide.icon as any} size={16} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>{guide.title}</Text>
                      </View>
                      <Text style={[styles.guideDesc, { color: colors.textSecondary }]}>{guide.desc}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.signOutBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                onPress={() => {
                  onClose();
                  signOut();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={commitProfileAndSecurityChanges}
              >
                <Text style={styles.doneBtnText}>Done ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* UPDATE MASTER PIN MODAL */}
      <Modal
        visible={showUpdatePinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpdatePinModal(false)}
      >
        <View style={styles.centerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowUpdatePinModal(false)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Master PIN</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpdatePinModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Enter your current 4-digit PIN, then choose a new Master PIN.
            </Text>

            <View style={{ gap: 12, marginVertical: 14 }}>
              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CURRENT MASTER PIN</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={oldPin}
                  onChangeText={(t) => setOldPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NEW 4-DIGIT PIN</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={newPin}
                  onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONFIRM NEW PIN</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={confirmNewPin}
                  onChangeText={(t) => setConfirmNewPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            {pinError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{pinError}</Text>}
            {pinSuccess && <Text style={[styles.successText, { marginBottom: 10 }]}>{pinSuccess}</Text>}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtnOutline, { borderColor: colors.border }]}
                onPress={() => setShowUpdatePinModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveAccountBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePinSubmit}
                disabled={isUpdatingPin}
              >
                {isUpdatingPin ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save New PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE VAULT 2X PIN CONFIRMATION MODAL (DEF-006 & DEF-007) */}
      <Modal
        visible={showDeleteVaultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteVaultModal(false)}
      >
        <View style={styles.centerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDeleteVaultModal(false)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: '#FECACA' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={22} color="#DC2626" />
                <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Confirm Vault Erasure</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteVaultModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: '#991B1B', lineHeight: 16 }}>
                ⚠️ Danger: This will permanently delete all transactions, bank accounts, cards, and keys.
                To prevent accidental loss, please enter your Master PIN twice to confirm.
              </Text>
            </View>

            <View style={{ gap: 12, marginBottom: 14 }}>
              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ENTER MASTER PIN (1 of 2)</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: '#FECACA', color: colors.textPrimary }]}
                  value={deletePin1}
                  onChangeText={(t) => setDeletePin1(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONFIRM MASTER PIN (2 of 2)</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: '#FECACA', color: colors.textPrimary }]}
                  value={deletePin2}
                  onChangeText={(t) => setDeletePin2(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            {deletePinError && <Text style={[styles.errorText, { marginBottom: 12 }]}>{deletePinError}</Text>}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtnOutline, { borderColor: colors.border }]}
                onPress={() => setShowDeleteVaultModal(false)}
                disabled={isDeletingVault}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveAccountBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleDeleteVaultSubmit}
                disabled={isDeletingVault}
              >
                {isDeletingVault ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Permanently Erase</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
  },
  bannerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardsList: {
    marginBottom: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  listItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveSalaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 14,
  },
  saveSalaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '45%',
    flex: 1,
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsGrid: {
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  themePresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardBoxSub: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  outlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inactivityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  minutePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleHelper: {
    fontSize: 11,
    marginTop: 2,
  },
  dangerCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteVaultBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteVaultBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guideCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  guideDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 9,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  pinInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  successText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAccountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
