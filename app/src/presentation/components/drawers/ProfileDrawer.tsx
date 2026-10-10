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
import { useTheme, ThemePresetName } from '../../theme';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { Account } from '../../../core/types/accounts';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

export interface ProfileDrawerProps {
  visible: boolean;
  profile: UserProfile;
  accounts: Account[];
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenAddCard?: () => void;
  onOpenAddBank?: () => void;
  onEditAccount?: (acc: Account) => void;
  onNavigateToTools?: () => void;
  onOpenSync?: () => void;
}

export type ProfileTab = 'PROFILE' | 'SALARY' | 'SECURITY' | 'THEME';

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  visible,
  profile,
  accounts,
  onClose,
  onUpdateProfile,
}) => {
  const { colors, themeName, setThemeName } = useTheme();
  const {
    config: securityConfig,
    updateConfig: updateSecurityConfig,
    updatePin,
    verifyCurrentPin,
    deleteVault,
    signOut,
    lockSession,
  } = useAuthSecurity();

  // Clean segmented tabs
  const [activeTab, setActiveTab] = useState<ProfileTab>('PROFILE');

  // Profile fields
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || 'user');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(profile.avatar);

  // Salary fields
  const [salaryAmount, setSalaryAmount] = useState(profile.salary_amount.toString());
  const [salaryDay, setSalaryDay] = useState(profile.salary_day.toString().padStart(2, '0'));
  const [salaryAcc, setSalaryAcc] = useState(profile.salary_account_id);
  const [salarySavedToast, setSalarySavedToast] = useState(false);

  // Security preferences
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(securityConfig.autoLockOnBlur);
  const [inactivityMinutes, setInactivityMinutes] = useState(securityConfig.inactivityTimeoutMinutes);
  const [autoDeleteOnFailedPin, setAutoDeleteOnFailedPin] = useState(!!securityConfig.autoDeleteOnFailedPin);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState<number>(securityConfig.autoDeleteThreshold || 5);

  // PIN modal state
  const [showUpdatePinModal, setShowUpdatePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Delete Vault modal state
  const [showDeleteVaultModal, setShowDeleteVaultModal] = useState(false);
  const [deletePin1, setDeletePin1] = useState('');
  const [deletePin2, setDeletePin2] = useState('');
  const [deletePinError, setDeletePinError] = useState<string | null>(null);
  const [isDeletingVault, setIsDeletingVault] = useState(false);

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

  const avatarOptions: { id: AvatarId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'Moon cat', label: 'Moon Cat', icon: 'paw' },
    { id: 'Forest rabbit', label: 'Rabbit', icon: 'leaf' },
    { id: 'Little ghost', label: 'Ghost', icon: 'happy' },
    { id: 'Star mage', label: 'Star Mage', icon: 'sparkles' },
    { id: 'Custom Google', label: 'Google', icon: 'logo-google' },
  ];

  const themePresetsList: { id: ThemePresetName; label: string; dotColor: string }[] = [
    { id: 'Night Ledger', label: 'Obsidian Wealth', dotColor: '#52b788' },
    { id: 'Soft Mint', label: 'Soft Mint', dotColor: '#0F4C3A' },
    { id: 'Warm Sunset', label: 'Warm Sunset', dotColor: '#F97316' },
    { id: 'Lavender', label: 'Lavender', dotColor: '#8B5CF6' },
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

  const handleSaveAllAndClose = () => {
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    onUpdateProfile({
      name: name.trim() || profile.name,
      username: cleanUser || profile.username,
      handle: `@${cleanUser || profile.username}`,
      avatar: selectedAvatar,
      salary_amount: parseFloat(salaryAmount) || profile.salary_amount,
      salary_day: parseInt(salaryDay, 10) || profile.salary_day,
      salary_account_id: salaryAcc,
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
    if (oldPin.length !== 4 || newPin.length !== 4) {
      setPinError('PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PINs do not match.');
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
        setPinSuccess('PIN updated ✓');
        setTimeout(() => {
          setShowUpdatePinModal(false);
          setOldPin('');
          setNewPin('');
          setConfirmNewPin('');
          setPinSuccess(null);
        }, 1000);
      } else {
        setPinError('Failed to update PIN.');
      }
    } catch (e: any) {
      setPinError('Error: ' + (e?.message || 'Failed'));
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleDeleteVaultSubmit = async () => {
    setDeletePinError(null);
    if (deletePin1.length !== 4 || deletePin2.length !== 4) {
      setDeletePinError('PIN must be 4 digits in both fields.');
      return;
    }
    if (deletePin1 !== deletePin2) {
      setDeletePinError('PIN entries do not match.');
      return;
    }

    setIsDeletingVault(true);
    try {
      const isCorrect = await verifyCurrentPin(deletePin1);
      if (!isCorrect) {
        setDeletePinError('Incorrect Master PIN.');
        setIsDeletingVault(false);
        return;
      }

      await deleteVault();
      setShowDeleteVaultModal(false);
      onClose();
    } catch (e: any) {
      setDeletePinError('Error: ' + (e?.message || 'Failed'));
      setIsDeletingVault(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={styles.drawerSheet} pointerEvents="auto">
            {/* Header: Clean title & close */}
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>{name || profile.username || 'Profile'}</Text>
                <Text style={styles.drawerSubtitle}>@{username || 'user'}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Segmented Tabs: Profile, Salary, Security, Theme */}
            <View style={styles.segmentedTabBar}>
              {[
                { id: 'PROFILE' as ProfileTab, label: 'Profile', icon: 'person-outline' },
                { id: 'SALARY' as ProfileTab, label: 'Salary', icon: 'cash-outline' },
                { id: 'SECURITY' as ProfileTab, label: 'Security', icon: 'shield-checkmark-outline' },
                { id: 'THEME' as ProfileTab, label: 'Theme', icon: 'color-palette-outline' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.segmentTab,
                      isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={15}
                      color={isActive ? colors.primary : '#64748B'}
                      style={{ marginBottom: 3 }}
                    />
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: isActive ? colors.primary : '#94A3B8' },
                        isActive && { fontWeight: '700' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab Contents */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* TAB 1: PROFILE */}
              {activeTab === 'PROFILE' && (
                <View style={styles.tabContainer}>
                  {/* Avatar Picker: ONE ROW SCROLLABLE */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>VAULT AVATAR</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScrollRow}
                    >
                      {avatarOptions.map((opt) => {
                        const isSelected = selectedAvatar === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.avatarCard,
                              {
                                backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                                borderColor: isSelected ? colors.primary : '#1C2B3C',
                              },
                            ]}
                            onPress={() => setSelectedAvatar(opt.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={opt.icon}
                              size={20}
                              color={isSelected ? colors.primary : '#94A3B8'}
                            />
                            <Text
                              style={[
                                styles.avatarCardText,
                                { color: isSelected ? colors.primary : '#94A3B8' },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Display Name Input */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="person-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your Name"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                  </View>

                  {/* Username Handle Input */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>USERNAME HANDLE</Text>
                    <View style={styles.inputBox}>
                      <Text style={styles.atPrefix}>@</Text>
                      <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="username"
                        placeholderTextColor="#64748B"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: SALARY */}
              {activeTab === 'SALARY' && (
                <View style={styles.tabContainer}>
                  {/* Monthly Net Salary Input */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>NET MONTHLY SALARY</Text>
                    <View style={styles.inputBox}>
                      <Text style={[styles.currencyPrefix, { color: colors.primary }]}>₹</Text>
                      <TextInput
                        style={[styles.textInput, { fontSize: 16, fontWeight: '700' }]}
                        value={salaryAmount}
                        onChangeText={setSalaryAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                  </View>

                  {/* Payday Date Presets: ONE ROW SCROLLABLE */}
                  <View style={styles.formGroup}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.fieldLabel}>PAYDAY DATE OF MONTH</Text>
                      <Text style={styles.fieldSubValue}>Day {salaryDay}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScrollRow}
                    >
                      {['01', '05', '10', '15', '20', '25', '30', '31'].map((d) => {
                        const isSelected = salaryDay === d;
                        return (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.chipPill,
                              {
                                backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                                borderColor: isSelected ? colors.primary : '#1C2B3C',
                              },
                            ]}
                            onPress={() => setSalaryDay(d)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? colors.primary : '#94A3B8' },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              Day {d}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Credited Bank Account: ONE ROW SCROLLABLE */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>CREDITED TO BANK ACCOUNT</Text>
                    {bankAccounts.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>No bank accounts linked. Add one in Financial Tools.</Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollRow}
                      >
                        {bankAccounts.map((b) => {
                          const isSelected = salaryAcc === b.id || salaryAcc === b.name;
                          return (
                            <TouchableOpacity
                              key={b.id}
                              style={[
                                styles.chipPill,
                                {
                                  backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                                  borderColor: isSelected ? colors.primary : '#1C2B3C',
                                },
                              ]}
                              onPress={() => setSalaryAcc(b.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="business-outline"
                                size={14}
                                color={isSelected ? colors.primary : '#94A3B8'}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: isSelected ? colors.primary : '#94A3B8' },
                                  isSelected && { fontWeight: '700' },
                                ]}
                              >
                                {b.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Save Salary Action Button */}
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveSalary}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={salarySavedToast ? 'checkmark' : 'save-outline'}
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.primaryActionBtnText}>
                      {salarySavedToast ? 'Salary Saved ✓' : 'Save Salary'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 3: SECURITY */}
              {activeTab === 'SECURITY' && (
                <View style={styles.tabContainer}>
                  {/* Master PIN */}
                  <View style={styles.securityRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.securityTitle}>Master PIN</Text>
                      <Text style={styles.securitySub}>4-digit on-device encryption key</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.outlineActionBtn, { borderColor: colors.primary }]}
                      onPress={() => setShowUpdatePinModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.outlineActionBtnText, { color: colors.primary }]}>Change PIN</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inactivity Auto-Lock: ONE ROW SCROLLABLE */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>INACTIVITY AUTO-LOCK</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScrollRow}
                    >
                      {[1, 5, 15, 30, 0].map((mins) => {
                        const isSelected = inactivityMinutes === mins;
                        const label = mins === 0 ? 'Never' : `${mins}m`;
                        return (
                          <TouchableOpacity
                            key={mins}
                            style={[
                              styles.chipPill,
                              {
                                backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                                borderColor: isSelected ? colors.primary : '#1C2B3C',
                              },
                            ]}
                            onPress={() => {
                              setInactivityMinutes(mins);
                              updateSecurityConfig({ inactivityTimeoutMinutes: mins });
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? colors.primary : '#94A3B8' },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Auto-Lock On App Blur Switch */}
                  <View style={styles.toggleRowCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.toggleTitle}>Lock on App Switch / Blur</Text>
                      <Text style={styles.toggleSub}>Protects vault during multitasking</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleSwitch,
                        {
                          backgroundColor: autoLockOnBlur ? colors.primary : '#1C2B3C',
                          alignItems: autoLockOnBlur ? 'flex-end' : 'flex-start',
                        },
                      ]}
                      onPress={() => {
                        const next = !autoLockOnBlur;
                        setAutoLockOnBlur(next);
                        updateSecurityConfig({ autoLockOnBlur: next });
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.toggleThumb} />
                    </TouchableOpacity>
                  </View>

                  {/* Auto-Delete Vault on Failed PIN Switch */}
                  <View style={styles.toggleRowCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.toggleTitle}>Auto-Delete on Failed PIN</Text>
                      <Text style={styles.toggleSub}>Wipes database on repeated wrong attempts</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleSwitch,
                        {
                          backgroundColor: autoDeleteOnFailedPin ? '#DC2626' : '#1C2B3C',
                          alignItems: autoDeleteOnFailedPin ? 'flex-end' : 'flex-start',
                        },
                      ]}
                      onPress={() => {
                        const next = !autoDeleteOnFailedPin;
                        setAutoDeleteOnFailedPin(next);
                        updateSecurityConfig({ autoDeleteOnFailedPin: next, autoDeleteThreshold });
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.toggleThumb} />
                    </TouchableOpacity>
                  </View>

                  {/* Failed Attempt Threshold: ONE ROW SCROLLABLE */}
                  {autoDeleteOnFailedPin && (
                    <View style={styles.formGroup}>
                      <Text style={styles.fieldLabel}>WIPE AFTER FAILED ATTEMPTS</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollRow}
                      >
                        {[3, 5, 10].map((t) => {
                          const isSelected = autoDeleteThreshold === t;
                          return (
                            <TouchableOpacity
                              key={t}
                              style={[
                                styles.chipPill,
                                {
                                  backgroundColor: isSelected ? 'rgba(220, 38, 38, 0.15)' : '#0D1C2D',
                                  borderColor: isSelected ? '#DC2626' : '#1C2B3C',
                                },
                              ]}
                              onPress={() => {
                                setAutoDeleteThreshold(t);
                                updateSecurityConfig({ autoDeleteThreshold: t });
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: isSelected ? '#DC2626' : '#94A3B8' },
                                  isSelected && { fontWeight: '700' },
                                ]}
                              >
                                {t} attempts
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Danger Zone: Wipe Vault */}
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity
                      style={styles.dangerOutlineBtn}
                      onPress={() => setShowDeleteVaultModal(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.dangerOutlineBtnText}>Wipe Vault & Reset</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 4: THEME */}
              {activeTab === 'THEME' && (
                <View style={styles.tabContainer}>
                  <Text style={styles.fieldLabel}>COLOR PRESET</Text>
                  {/* ONE ROW SCROLLABLE THEMES */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScrollRow}
                  >
                    {themePresetsList.map((preset) => {
                      const isSelected = themeName === preset.id;
                      return (
                        <TouchableOpacity
                          key={preset.id}
                          style={[
                            styles.themePill,
                            {
                              backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                              borderColor: isSelected ? colors.primary : '#1C2B3C',
                            },
                          ]}
                          onPress={() => setThemeName(preset.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.themeDot, { backgroundColor: preset.dotColor }]} />
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? colors.primary : '#94A3B8' },
                              isSelected && { fontWeight: '700' },
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.signOutBtn}
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
                onPress={handleSaveAllAndClose}
                activeOpacity={0.8}
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Change Master PIN</Text>
              <TouchableOpacity onPress={() => setShowUpdatePinModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginVertical: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>CURRENT PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={oldPin}
                  onChangeText={(t) => setOldPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>NEW PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={newPin}
                  onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>CONFIRM NEW PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={confirmNewPin}
                  onChangeText={(t) => setConfirmNewPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            {pinError && <Text style={styles.errorText}>{pinError}</Text>}
            {pinSuccess && <Text style={styles.successText}>{pinSuccess}</Text>}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowUpdatePinModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePinSubmit}
                disabled={isUpdatingPin}
              >
                {isUpdatingPin ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE VAULT 2X PIN CONFIRMATION MODAL */}
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
          <View style={[styles.modalCard, { borderColor: '#DC2626' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Confirm Vault Wipe</Text>
              <TouchableOpacity onPress={() => setShowDeleteVaultModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, lineHeight: 16 }}>
              This will permanently delete all local accounts, transactions, and keys. Enter Master PIN twice to confirm.
            </Text>

            <View style={{ gap: 10, marginBottom: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>ENTER PIN (1 OF 2)</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: 'rgba(220, 38, 38, 0.4)' }]}
                  value={deletePin1}
                  onChangeText={(t) => setDeletePin1(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>CONFIRM PIN (2 OF 2)</Text>
                <TextInput
                  style={[styles.pinInput, { borderColor: 'rgba(220, 38, 38, 0.4)' }]}
                  value={deletePin2}
                  onChangeText={(t) => setDeletePin2(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            {deletePinError && <Text style={styles.errorText}>{deletePinError}</Text>}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteVaultModal(false)}
                disabled={isDeletingVault}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleDeleteVaultSubmit}
                disabled={isDeletingVault}
              >
                {isDeletingVault ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Wipe Everything</Text>
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
    backgroundColor: 'rgba(5, 20, 36, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 460,
    height: '100%',
    backgroundColor: '#051424',
    borderLeftWidth: 1,
    borderLeftColor: '#1C2B3C',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2B3C',
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#D4E4FA',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2B3C',
    paddingHorizontal: 12,
    backgroundColor: '#0D1C2D',
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  tabContainer: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  fieldSubValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52b788',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#0D1C2D',
    borderWidth: 1,
    borderColor: '#1C2B3C',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#D4E4FA',
  },
  atPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 6,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  horizontalScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  avatarCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    minWidth: 72,
  },
  avatarCardText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyBox: {
    padding: 12,
    backgroundColor: '#0D1C2D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C2B3C',
  },
  emptyBoxText: {
    fontSize: 12,
    color: '#64748B',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  securityRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#0D1C2D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C2B3C',
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4E4FA',
  },
  securitySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  outlineActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0D1C2D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C2B3C',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4E4FA',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  dangerOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  dangerOutlineBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1C2B3C',
    gap: 12,
    backgroundColor: '#051424',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#0D1C2D',
    borderWidth: 1,
    borderColor: '#1C2B3C',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D4E4FA',
  },
  pinInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#1C2B3C',
    borderRadius: 8,
    backgroundColor: '#051424',
    color: '#D4E4FA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  successText: {
    color: '#52b788',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C2B3C',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
