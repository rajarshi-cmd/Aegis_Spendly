import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';
import { useFinanceData } from '../../hooks/useFinanceData';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { AutoLockPreset } from '../../../core/types/auth';
import { SyncCadence, DayOfWeek } from '../../../core/types/sync';
import { formatRupee } from '../../../core/utils/currency';
import {
  validateUsername as checkUsername,
  validateCalendarDay,
  clampCalendarDay,
  validateKeepTrackRatio,
  parseBalanceInput,
} from '../../../core/utils/validators';

type OnboardingStep =
  | 'IDENTITY'
  | 'BANKS'
  | 'CARDS'
  | 'SALARY'
  | 'DRIVE'
  | 'SECURITY'
  | 'CONFIRMATION';

interface BankDraft {
  id: string;
  name: string;
  balance: number;
  minBalance: number;
}

interface CardDraft {
  id: string;
  name: string;
  limit: number;
  balance: number;
  cutDay: number;
  dueDay: number;
  keepTrackRatio: number; // e.g. 50 (for 50%)
  color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
}

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, updateConfig: updateSecurityConfig, completeOnboarding } = useAuthSecurity();
  const { updateProfile, updateSyncConfig, initializeUserVault } = useFinanceData();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('IDENTITY');
  const [isFinishing, setIsFinishing] = useState(false);

  // Step 1: Identity fields
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<AvatarId>('Moon cat');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Step 2: Bank Accounts (STARTS COMPLETELY EMPTY - No pre-added accounts!)
  const [banks, setBanks] = useState<BankDraft[]>([]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankBalance, setNewBankBalance] = useState('');
  const [newBankMinBalance, setNewBankMinBalance] = useState('');

  // Step 3: Credit Cards (STARTS COMPLETELY EMPTY - No pre-added cards!)
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardCutDay, setNewCardCutDay] = useState('15');
  const [newCardDueDay, setNewCardDueDay] = useState('5');
  const [newCardKeepTrackRatio, setNewCardKeepTrackRatio] = useState<number>(50); // Default 50%
  const [newCardColor, setNewCardColor] = useState<'EMERALD' | 'PURPLE' | 'CARAMEL'>('EMERALD');
  const [cardCutDayError, setCardCutDayError] = useState<string | null>(null);
  const [cardDueDayError, setCardDueDayError] = useState<string | null>(null);

  // Step 4: Income Type (Salaried vs Other Payments)
  const [incomeType, setIncomeType] = useState<'SALARIED' | 'OTHER'>('SALARIED');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDay, setSalaryDay] = useState('1');
  const [selectedSalaryBank, setSelectedSalaryBank] = useState<string>('');
  const [salaryBankError, setSalaryBankError] = useState<string | null>(null);

  // Step 5: Google Drive (Hidden per DEF-008 until Phase 2)
  const SHOW_DRIVE_STEP = false;
  const [driveFolderName, setDriveFolderName] = useState('Aegis Spendly');
  const [syncCadence, setSyncCadence] = useState<SyncCadence>('DAILY');
  const [dailyTime, setDailyTime] = useState('22:00');
  const [weeklyDay, setWeeklyDay] = useState<DayOfWeek>('SUNDAY');

  // Step 6: Auto-Lock Security & Auto-Delete (DEF-001, DEF-007)
  const [selectedPreset, setSelectedPreset] = useState<AutoLockPreset>('BALANCED');
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(true);
  const [inactivityMinutes, setInactivityMinutes] = useState(5);
  const [autoDeleteOnFailedPin, setAutoDeleteOnFailedPin] = useState(false);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState(5);

  const STEPS: { id: OnboardingStep; label: string; number: number }[] = [
    { id: 'IDENTITY', label: 'Identity', number: 1 },
    { id: 'BANKS', label: 'Banks', number: 2 },
    { id: 'CARDS', label: 'Cards', number: 3 },
    { id: 'SALARY', label: 'Income', number: 4 },
    ...(SHOW_DRIVE_STEP ? [{ id: 'DRIVE' as OnboardingStep, label: 'Drive Sync', number: 5 }] : []),
    { id: 'SECURITY', label: 'Auto-Lock', number: SHOW_DRIVE_STEP ? 6 : 5 },
    { id: 'CONFIRMATION', label: 'Ready', number: SHOW_DRIVE_STEP ? 7 : 6 },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Stepper Back helper
  const handleGoBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleJumpToStep = (targetIdx: number) => {
    // Only allow clicking to steps that have already been reached
    if (targetIdx <= currentStepIndex) {
      setCurrentStep(STEPS[targetIdx].id);
    }
  };

  // Validation for Step 1
  const validateUsername = (val: string): boolean => {
    const res = checkUsername(val);
    if (!res.isValid) {
      setUsernameError(res.error || 'Invalid username');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleNextFromIdentity = () => {
    if (!validateUsername(username)) return;
    setCurrentStep('BANKS');
  };

  const handleAddBank = () => {
    if (!newBankName.trim()) return;
    const bal = parseBalanceInput(newBankBalance, 0);
    const minBal = parseBalanceInput(newBankMinBalance, 0);
    setBanks((prev) => [
      ...prev,
      {
        id: 'b-' + Date.now(),
        name: newBankName.trim(),
        balance: bal,
        minBalance: minBal,
      },
    ]);
    setNewBankName('');
    setNewBankBalance('');
    setNewBankMinBalance('');
  };

  const handleRemoveBank = (id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
  };

  const validateCutDayInput = (val: string): boolean => {
    const res = validateCalendarDay(val);
    if (!res.isValid) {
      setCardCutDayError(res.error || 'Day must be between 1 and 31');
      return false;
    }
    setCardCutDayError(null);
    return true;
  };

  const validateDueDayInput = (val: string): boolean => {
    const res = validateCalendarDay(val);
    if (!res.isValid) {
      setCardDueDayError(res.error || 'Day must be between 1 and 31');
      return false;
    }
    setCardDueDayError(null);
    return true;
  };

  const handleAddCard = () => {
    if (!newCardName.trim()) return;
    const isCutValid = validateCutDayInput(newCardCutDay);
    const isDueValid = validateDueDayInput(newCardDueDay);
    if (!isCutValid || !isDueValid) return;

    const lim = parseBalanceInput(newCardLimit, 100000);
    const bal = parseBalanceInput(newCardBalance, 0);
    const cut = clampCalendarDay(newCardCutDay, 15);
    const due = clampCalendarDay(newCardDueDay, 5);
    const ratio = validateKeepTrackRatio(newCardKeepTrackRatio);
    setCards((prev) => [
      ...prev,
      {
        id: 'c-' + Date.now(),
        name: newCardName.trim(),
        limit: lim,
        balance: bal,
        cutDay: cut,
        dueDay: due,
        keepTrackRatio: ratio,
        color: newCardColor,
      },
    ]);
    setNewCardName('');
    setNewCardLimit('');
    setNewCardBalance('');
    setNewCardCutDay('15');
    setNewCardDueDay('5');
    setNewCardKeepTrackRatio(50);
    setCardCutDayError(null);
    setCardDueDayError(null);
  };

  const handleRemoveCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSelectPreset = (preset: AutoLockPreset) => {
    setSelectedPreset(preset);
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
  };

  const handleContinueFromBanks = () => {
    if (newBankName.trim()) {
      const bal = parseBalanceInput(newBankBalance, 0);
      const minBal = parseBalanceInput(newBankMinBalance, 0);
      setBanks((prev) => [
        ...prev,
        {
          id: 'b-' + Date.now(),
          name: newBankName.trim(),
          balance: bal,
          minBalance: minBal,
        },
      ]);
      setNewBankName('');
      setNewBankBalance('');
      setNewBankMinBalance('');
    }
    setCurrentStep('CARDS');
  };

  const handleContinueFromCards = () => {
    if (newCardName.trim()) {
      const isCutValid = validateCutDayInput(newCardCutDay);
      const isDueValid = validateDueDayInput(newCardDueDay);
      if (!isCutValid || !isDueValid) return;

      const lim = parseBalanceInput(newCardLimit, 100000);
      const bal = parseBalanceInput(newCardBalance, 0);
      const cut = clampCalendarDay(newCardCutDay, 15);
      const due = clampCalendarDay(newCardDueDay, 5);
      const ratio = validateKeepTrackRatio(newCardKeepTrackRatio);
      setCards((prev) => [
        ...prev,
        {
          id: 'c-' + Date.now(),
          name: newCardName.trim(),
          limit: lim,
          balance: bal,
          cutDay: cut,
          dueDay: due,
          keepTrackRatio: ratio,
          color: newCardColor,
        },
      ]);
      setNewCardName('');
      setNewCardLimit('');
      setNewCardBalance('');
      setNewCardCutDay('15');
      setNewCardDueDay('5');
      setNewCardKeepTrackRatio(50);
      setCardCutDayError(null);
      setCardDueDayError(null);
    }
    setCurrentStep('SALARY');
  };

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      // Auto-commit any trailing entered bank or card if user didn't hit + Add
      const allBanks = [...banks];
      if (newBankName.trim()) {
        const bal = parseBalanceInput(newBankBalance, 0);
        const minBal = parseBalanceInput(newBankMinBalance, 0);
        allBanks.push({
          id: 'b-' + Date.now(),
          name: newBankName.trim(),
          balance: bal,
          minBalance: minBal,
        });
      }

      const allCards = [...cards];
      if (newCardName.trim()) {
        const lim = parseBalanceInput(newCardLimit, 100000);
        const bal = parseBalanceInput(newCardBalance, 0);
        const cut = clampCalendarDay(newCardCutDay, 15);
        const due = clampCalendarDay(newCardDueDay, 5);
        const ratio = validateKeepTrackRatio(newCardKeepTrackRatio);
        allCards.push({
          id: 'c-' + Date.now(),
          name: newCardName.trim(),
          limit: lim,
          balance: bal,
          cutDay: cut,
          dueDay: due,
          keepTrackRatio: ratio,
          color: newCardColor,
        });
      }

      // 1. Initialize user database vault with EXACT user banks & cards (purges all dummy seed accounts & placeholder txs)
      await initializeUserVault(
        allBanks.map((b) => ({
          name: b.name,
          balance: b.balance,
          minimum_balance: b.minBalance,
        })),
        allCards.map((c) => ({
          name: c.name,
          limit: c.limit,
          balance: c.balance,
          cutDay: c.cutDay,
          dueDay: c.dueDay,
          color: c.color,
          keepTrackRatio: c.keepTrackRatio,
        }))
      );

      // 2. Update User Profile
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const profileUpdates: Partial<UserProfile> = {
        name: displayName.trim() || cleanUsername || 'User',
        username: cleanUsername,
        handle: `@${cleanUsername}`,
        email: email.trim(),
        avatar,
        salary_amount: incomeType === 'SALARIED' ? parseBalanceInput(salaryAmount, 0) : 0,
        salary_day: incomeType === 'SALARIED' ? clampCalendarDay(salaryDay, 1) : 1,
        salary_account_id: selectedSalaryBank || (banks[0]?.name ?? ''),
        driveFolderName: driveFolderName.trim() || 'Aegis Spendly',
        isOnboarded: true,
      };
      updateProfile(profileUpdates);

      // 3. Update Google Sync preferences
      updateSyncConfig({
        driveFolderName: driveFolderName.trim() || 'Aegis Spendly',
        cadence: syncCadence,
        dailyTime,
        weeklyDay,
        googleEmail: email.trim(),
      });

      // 4. Update Security settings
      updateSecurityConfig({
        autoLockOnBlur,
        inactivityTimeoutMinutes: inactivityMinutes,
        lockPreset: selectedPreset,
        autoDeleteOnFailedPin,
        autoDeleteThreshold,
      });

      // 5. Complete auth onboarding
      completeOnboarding({
        username: cleanUsername,
        name: displayName.trim(),
        email: email.trim(),
      });
    } catch (e) {
      console.error('[Onboarding] Error during completion:', e);
      completeOnboarding({ username: username.trim() });
    } finally {
      setIsFinishing(false);
    }
  };

  const avatarOptions: { id: AvatarId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'Moon cat', label: 'Moon cat', icon: 'paw' },
    { id: 'Forest rabbit', label: 'Forest rabbit', icon: 'leaf' },
    { id: 'Little ghost', label: 'Little ghost', icon: 'happy' },
    { id: 'Star mage', label: 'Star mage', icon: 'sparkles' },
  ];

  // Threshold preview values for the slider in Step 3
  const greenThreshold = Math.round(newCardKeepTrackRatio * 0.5);
  const yellowThreshold = newCardKeepTrackRatio;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollRoot, { padding: isDesktop ? 16 : 10 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { maxWidth: isDesktop ? 680 : '100%' }]}>
          {/* Header Stepper Navigation */}
          <View style={styles.stepperRow}>
            {STEPS.map((s, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const canClick = idx <= currentStepIndex;
              return (
                <View key={s.id} style={styles.stepIndicatorItem}>
                  <TouchableOpacity
                    disabled={!canClick}
                    onPress={() => handleJumpToStep(idx)}
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isDone || isCurrent ? colors.primary : colors.surface,
                        borderColor: isDone || isCurrent ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepDotText,
                          { color: isCurrent ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {s.number}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {idx < STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepConnector,
                        { backgroundColor: isDone ? colors.primary : colors.borderSubtle },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Main Content Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                padding: isDesktop ? 24 : 16,
              },
            ]}
          >
            {/* STEP 1: IDENTITY & USERNAME */}
            {currentStep === 'IDENTITY' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.badgePillText}>STEP 1 • IDENTITY & PROFILE</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to Aegis Spendly</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Let's personalize your ledger. All data is kept strictly on-device, fully encrypted and 100% offline.
                </Text>

                {/* Username Field (MANDATORY) */}
                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      VAULT USERNAME <Text style={{ color: '#DC2626' }}>*</Text>
                    </Text>
                    <Text style={[styles.helper, { color: colors.textMuted }]}>Mandatory (Cannot be skipped)</Text>
                  </View>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        borderColor: usernameError ? '#DC2626' : colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text style={[styles.atSign, { color: colors.primary }]}>@</Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={username}
                      onChangeText={(val) => {
                        setUsername(val);
                        validateUsername(val);
                      }}
                      placeholder="your_unique_username"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
                </View>

                {/* Display Name Field */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>FULL NAME / DISPLAY NAME</Text>
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your Full Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    ACCOUNT EMAIL (OPTIONAL ALERTS & NOTIFICATIONS)
                  </Text>
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="mail-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@gmail.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Avatar Selector */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>CHOOSE VAULT AVATAR</Text>
                  <View style={styles.avatarGrid}>
                    {avatarOptions.map((opt) => {
                      const isSelected = avatar === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.avatarOption,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryLight : colors.background,
                            },
                          ]}
                          onPress={() => setAvatar(opt.id)}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.avatarLabel,
                              { color: isSelected ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Continue CTA */}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleNextFromIdentity}
                >
                  <Text style={styles.primaryBtnText}>Continue to Bank Accounts</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: BANK ACCOUNTS (STARTS EMPTY, FULL DATA ENTRY) */}
            {currentStep === 'BANKS' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                  <Ionicons name="business" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#6D28D9' }]}>STEP 2 • BANK ACCOUNTS & WALLETS</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Add Your Bank Accounts</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Record your liquid accounts, cash balances, and minimum required balances.
                </Text>

                {/* List of User's Added Banks */}
                {banks.length === 0 ? (
                  <View style={[styles.emptyNoticeBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                    <Ionicons name="wallet-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6 }} />
                    <Text style={[styles.emptyNoticeTitle, { color: colors.textPrimary }]}>No Banks Added Yet</Text>
                    <Text style={[styles.emptyNoticeSub, { color: colors.textMuted }]}>
                      Fill in your bank account details below, or click "Skip for now" to add them later.
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    {banks.map((b) => (
                      <View
                        key={b.id}
                        style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                      >
                        <View style={[styles.itemIconBox, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="business-outline" size={16} color="#15803D" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.itemName, { color: colors.textPrimary }]}>{b.name}</Text>
                          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                            Current: {formatRupee(b.balance)} • Min Required: {formatRupee(b.minBalance)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveBank(b.id)} style={styles.removeBtn}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Full Form: Add A Bank Account */}
                <View style={[styles.formContainerCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.formCardHeading, { color: colors.textPrimary }]}>+ Add A Bank Account</Text>

                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BANK NICKNAME / ACCOUNT NAME</Text>
                    <TextInput
                      style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. HDFC Salary, SBI Savings, Cash Wallet"
                      placeholderTextColor={colors.textMuted}
                      value={newBankName}
                      onChangeText={setNewBankName}
                    />
                  </View>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CURRENT BALANCE (₹)</Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="e.g. 50000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newBankBalance}
                        onChangeText={setNewBankBalance}
                      />
                    </View>

                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MINIMUM BALANCE REQUIRED (₹)</Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="0 (Optional)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newBankMinBalance}
                        onChangeText={setNewBankMinBalance}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.addCardBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddBank}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addCardBtnText}>Add This Bank</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Navigation with Back, Skip, Continue */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentStep('CARDS')}>
                      <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                      onPress={handleContinueFromBanks}
                    >
                      <Text style={styles.primaryBtnText}>Continue to Cards</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: CREDIT CARDS (STARTS EMPTY, CLEAR LABELED FORM & TRACK SLIDER) */}
            {currentStep === 'CARDS' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Ionicons name="card" size={14} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#B45309' }]}>STEP 3 • CREDIT CARDS</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Add Your Credit Cards</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Set your credit limits, billing statement cut-off days, due dates, and custom utilization thresholds.
                </Text>

                {/* List of User's Added Cards */}
                {cards.length === 0 ? (
                  <View style={[styles.emptyNoticeBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                    <Ionicons name="card-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6 }} />
                    <Text style={[styles.emptyNoticeTitle, { color: colors.textPrimary }]}>No Credit Cards Added Yet</Text>
                    <Text style={[styles.emptyNoticeSub, { color: colors.textMuted }]}>
                      Add your cards using the labeled form below, or click "Skip for now" if you don't use credit cards.
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    {cards.map((c) => (
                      <View
                        key={c.id}
                        style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                      >
                        <View style={[styles.itemIconBox, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="card-outline" size={16} color="#B45309" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.itemName, { color: colors.textPrimary }]}>{c.name}</Text>
                          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                            Limit: {formatRupee(c.limit)} • Bill Cut: {c.cutDay}th • Due: {c.dueDay}th • Track Ratio: {c.keepTrackRatio}%
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveCard(c.id)} style={styles.removeBtn}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Full Form: Add A Credit Card with Clear Labels */}
                <View style={[styles.formContainerCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.formCardHeading, { color: colors.textPrimary }]}>+ Add A Credit Card</Text>

                  {/* 1. Card Nickname */}
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CARD NICKNAME / BANK</Text>
                    <TextInput
                      style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. HDFC Regalia Gold, Amazon Pay ICICI, Tata Neu"
                      placeholderTextColor={colors.textMuted}
                      value={newCardName}
                      onChangeText={setNewCardName}
                    />
                  </View>

                  {/* 2. Limit & Current Outstanding Balance */}
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TOTAL CREDIT LIMIT (₹)</Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="e.g. 200000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newCardLimit}
                        onChangeText={setNewCardLimit}
                      />
                    </View>

                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CURRENT OUTSTANDING / SPENT (₹)</Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="0 (Optional)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newCardBalance}
                        onChangeText={setNewCardBalance}
                      />
                    </View>
                  </View>

                  {/* 3. Statement Cut Day & Due Date */}
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BILL STATEMENT CUT-OFF DAY (1 - 31)</Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          {
                            borderColor: cardCutDayError ? '#DC2626' : colors.border,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="e.g. 15 (15th of month)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newCardCutDay}
                        onChangeText={(val) => {
                          setNewCardCutDay(val);
                          validateCutDayInput(val);
                        }}
                      />
                      {cardCutDayError && <Text style={styles.errorText}>{cardCutDayError}</Text>}
                    </View>

                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PAYMENT DUE DATE (1 - 31)</Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          {
                            borderColor: cardDueDayError ? '#DC2626' : colors.border,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="e.g. 5 (5th of next month)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={newCardDueDay}
                        onChangeText={(val) => {
                          setNewCardDueDay(val);
                          validateDueDayInput(val);
                        }}
                      />
                      {cardDueDayError && <Text style={styles.errorText}>{cardDueDayError}</Text>}
                    </View>
                  </View>

                  {/* 4. KEEP TRACK RATIO SLIDER (Smooth interactive slider) */}
                  <View style={[styles.sliderBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.sliderHeader, { color: colors.textPrimary }]}>
                        Target Max Utilization (Keep Track Ratio)
                      </Text>
                      <View style={[styles.ratioBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.ratioBadgeText, { color: colors.primary }]}>{newCardKeepTrackRatio}%</Text>
                      </View>
                    </View>

                    <Text style={[styles.sliderSub, { color: colors.textMuted }]}>
                      Choose your comfort ceiling. Amber caution activates halfway to this target.
                    </Text>

                    {/* Smooth Slider Control (Web standard HTML range slider + quick preset pills) */}
                    {Platform.OS === 'web' && typeof document !== 'undefined' ? (
                      <View style={{ marginVertical: 10 }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={newCardKeepTrackRatio}
                          onChange={(e: any) => setNewCardKeepTrackRatio(validateKeepTrackRatio(e.target.value))}
                          style={{
                            width: '100%',
                            height: '8px',
                            borderRadius: '4px',
                            background: `linear-gradient(to right, #10B981 0%, #10B981 ${greenThreshold}%, #F59E0B ${greenThreshold}%, #F59E0B ${yellowThreshold}%, #EF4444 ${yellowThreshold}%, #EF4444 100%)`,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                      </View>
                    ) : null}

                    {/* Quick Preset Buttons for Mobile or Quick Click */}
                    <View style={styles.quickRatioRow}>
                      {[0, 30, 50, 75, 100].map((pct) => (
                        <TouchableOpacity
                          key={pct}
                          style={[
                            styles.quickRatioBtn,
                            {
                              backgroundColor: newCardKeepTrackRatio === pct ? colors.primary : colors.background,
                              borderColor: newCardKeepTrackRatio === pct ? colors.primary : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => setNewCardKeepTrackRatio(pct)}
                        >
                          <Text
                            style={[
                              styles.quickRatioBtnText,
                              { color: newCardKeepTrackRatio === pct ? '#FFFFFF' : colors.textPrimary },
                            ]}
                          >
                            {pct}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Dynamic Threshold Legend */}
                    <View style={styles.thresholdLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>
                          Green (Safe): <Text style={{ color: '#10B981', fontWeight: '700' }}>0% – {greenThreshold}%</Text>
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>
                          Amber (Caution): <Text style={{ color: '#B45309', fontWeight: '700' }}>{greenThreshold}% – {yellowThreshold}%</Text>
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>
                          Red (Alert): <Text style={{ color: '#EF4444', fontWeight: '700' }}>&gt; {yellowThreshold}%</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 5. Card Skin Theme */}
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CARD VISUAL THEME</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      {[
                        { id: 'EMERALD' as const, label: 'Emerald', color: '#0F4C3A' },
                        { id: 'PURPLE' as const, label: 'Purple', color: '#581C87' },
                        { id: 'CARAMEL' as const, label: 'Caramel', color: '#78350F' },
                      ].map((sk) => (
                        <TouchableOpacity
                          key={sk.id}
                          style={[
                            styles.skinOption,
                            {
                              borderColor: newCardColor === sk.id ? colors.primary : colors.borderSubtle,
                              backgroundColor: newCardColor === sk.id ? colors.primaryLight : colors.surface,
                            },
                          ]}
                          onPress={() => setNewCardColor(sk.id)}
                        >
                          <View style={[styles.skinDot, { backgroundColor: sk.color }]} />
                          <Text style={[styles.skinLabel, { color: colors.textPrimary }]}>{sk.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Add Card Submit Button */}
                  <TouchableOpacity
                    style={[styles.addCardBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddCard}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addCardBtnText}>Add This Credit Card</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentStep('SALARY')}>
                      <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                      onPress={handleContinueFromCards}
                    >
                      <Text style={styles.primaryBtnText}>Continue to Income</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 4: INCOME (SALARIED VS OTHER PAYMENTS) */}
            {currentStep === 'SALARY' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="cash" size={14} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#15803D' }]}>STEP 4 • INCOME & EARNINGS TYPE</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>How Do You Receive Income?</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Choose your earnings structure to customize monthly projections.
                </Text>

                {/* 2 Clear Options: Salaried vs Other Payments */}
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {/* Option 1: Salaried Employee */}
                  <TouchableOpacity
                    style={[
                      styles.incomeTypeCard,
                      {
                        backgroundColor: incomeType === 'SALARIED' ? colors.primaryLight : colors.background,
                        borderColor: incomeType === 'SALARIED' ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setIncomeType('SALARIED')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, width: '100%' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                        <View style={[styles.incomeIconBox, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="briefcase-outline" size={18} color="#15803D" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.incomeTypeTitle, { color: colors.textPrimary }]}>
                            Salaried Employee (Regular Monthly Inflow)
                          </Text>
                          <Text style={[styles.incomeTypeSub, { color: colors.textMuted }]}>
                            Fixed monthly salary credited on a specific date.
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={incomeType === 'SALARIED' ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={incomeType === 'SALARIED' ? colors.primary : colors.textMuted}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Freelance / Other Payments */}
                  <TouchableOpacity
                    style={[
                      styles.incomeTypeCard,
                      {
                        backgroundColor: incomeType === 'OTHER' ? colors.primaryLight : colors.background,
                        borderColor: incomeType === 'OTHER' ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setIncomeType('OTHER')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, width: '100%' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                        <View style={[styles.incomeIconBox, { backgroundColor: '#EDE9FE' }]}>
                          <Ionicons name="cash-outline" size={18} color="#7C3AED" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.incomeTypeTitle, { color: colors.textPrimary }]}>
                            Freelance / Variable Income / Other Payments
                          </Text>
                          <Text style={[styles.incomeTypeSub, { color: colors.textMuted }]}>
                            No regular fixed salary date. Income arrives as deposits.
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={incomeType === 'OTHER' ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={incomeType === 'OTHER' ? colors.primary : colors.textMuted}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Salaried Mode: Inputs for monthly salary and payday */}
                {incomeType === 'SALARIED' ? (
                  <View style={[styles.formContainerCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.formCardHeading, { color: colors.textPrimary }]}>Salary Details</Text>

                    <View style={styles.formField}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EXPECTED MONTHLY SALARY (₹)</Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        value={salaryAmount}
                        onChangeText={setSalaryAmount}
                        placeholder="e.g. 148000"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        SALARY RECEIVE DATE OF MONTH (1 - 31)
                      </Text>
                      <TextInput
                        style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary }]}
                        value={salaryDay}
                        onChangeText={setSalaryDay}
                        placeholder="e.g. 1 (1st of month)"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Linked Bank Selection (MANDATORY per DEF-003) */}
                    {banks.length === 0 ? (
                      <View style={[styles.guidanceCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginTop: 12 }]}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.guidanceTitle, { color: '#DC2626' }]}>Bank Account Required</Text>
                          <Text style={[styles.guidanceSub, { color: '#991B1B' }]}>
                            You haven't added any banks yet. To set up salaried income, please go back to the Banks step and add your salary bank, or switch to Flexible Inflow mode below.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.formField}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                            SALARY CREDITED TO BANK <Text style={{ color: '#DC2626' }}>*</Text>
                          </Text>
                          <Text style={[styles.helper, { color: '#DC2626', fontSize: 11 }]}>Mandatory</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          {banks.map((b) => {
                            const isSelected = selectedSalaryBank === b.name;
                            return (
                              <TouchableOpacity
                                key={b.id}
                                style={[
                                  styles.quickRatioBtn,
                                  {
                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                                  },
                                ]}
                                onPress={() => {
                                  setSelectedSalaryBank(b.name);
                                  setSalaryBankError(null);
                                }}
                              >
                                <Text style={{ color: isSelected ? '#FFFFFF' : colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                                  {b.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {salaryBankError && (
                      <Text style={[styles.errorText, { marginTop: 6 }]}>{salaryBankError}</Text>
                    )}
                  </View>
                ) : (
                  /* Other Income Mode: Friendly Guidance Banner */
                  <View style={[styles.guidanceCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                    <Ionicons name="information-circle" size={20} color="#15803D" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.guidanceTitle, { color: '#15803D' }]}>
                        Flexible Inflow Mode Active
                      </Text>
                      <Text style={[styles.guidanceSub, { color: '#166534' }]}>
                        Whenever you receive client payouts, freelance fees, or dividends, simply tap the bottom '+ Add Entry' button and record a 'Credit / Inflow' to your account.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Bottom Navigation */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={() => {
                        setSalaryBankError(null);
                        setIncomeType('OTHER');
                        setCurrentStep(SHOW_DRIVE_STEP ? 'DRIVE' : 'SECURITY');
                      }}
                    >
                      <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        if (incomeType === 'SALARIED') {
                          if (banks.length === 0) {
                            setSalaryBankError('Please go back to Banks step to add at least one bank account first.');
                            return;
                          }
                          if (!selectedSalaryBank) {
                            setSalaryBankError('Please select at least one bank account where your salary is credited.');
                            return;
                          }
                        }
                        setSalaryBankError(null);
                        setCurrentStep(SHOW_DRIVE_STEP ? 'DRIVE' : 'SECURITY');
                      }}
                    >
                      <Text style={styles.primaryBtnText}>
                        {SHOW_DRIVE_STEP ? 'Continue to Drive Sync' : 'Continue to Auto-Lock'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 5: GOOGLE DRIVE FOLDER & CADENCE */}
            {currentStep === 'DRIVE' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="logo-google" size={14} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#15803D' }]}>STEP 5 • GOOGLE DRIVE STORAGE</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Choose Google Drive Folder</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Zero 3rd-party database servers! Spreadsheets will be created and saved directly inside your personal Google Drive folder.
                </Text>

                {/* Folder Name Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET GOOGLE DRIVE FOLDER</Text>
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="folder-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={driveFolderName}
                      onChangeText={setDriveFolderName}
                      placeholder="Aegis Spendly"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.helper, { color: colors.textMuted, marginTop: 4 }]}>
                    The app creates or uses this folder in your personal Google Drive.
                  </Text>
                </View>

                {/* Sync Cadence Cards */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>SYNC CADENCE</Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {[
                      {
                        id: 'MANUAL' as SyncCadence,
                        title: 'Manual (Web Default)',
                        desc: 'Sync on-demand via the header button when finished entering transactions.',
                      },
                      {
                        id: 'DAILY' as SyncCadence,
                        title: 'Daily Scheduled (10:00 PM)',
                        desc: 'Bundles all changes of the day and pushes once per day at 10 PM.',
                      },
                      {
                        id: 'WEEKLY' as SyncCadence,
                        title: 'Weekly Scheduled (Sunday)',
                        desc: 'Pushes weekly batch every Sunday night at 11 PM.',
                      },
                    ].map((cad) => {
                      const isSelected = syncCadence === cad.id;
                      return (
                        <TouchableOpacity
                          key={cad.id}
                          style={[
                            styles.incomeTypeCard,
                            {
                              backgroundColor: isSelected ? colors.primaryLight : colors.background,
                              borderColor: isSelected ? colors.primary : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => setSyncCadence(cad.id)}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? colors.primary : colors.textMuted}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.incomeTypeTitle,
                                { color: isSelected ? colors.primary : colors.textPrimary },
                              ]}
                            >
                              {cad.title}
                            </Text>
                            <Text style={[styles.incomeTypeSub, { color: colors.textMuted }]}>{cad.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                    onPress={() => setCurrentStep('SECURITY')}
                  >
                    <Text style={styles.primaryBtnText}>Continue to Auto-Lock</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 6: AUTO-LOCK SECURITY OPTIONS */}
            {currentStep === 'SECURITY' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Ionicons name="lock-closed" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#B91C1C' }]}>
                    STEP {SHOW_DRIVE_STEP ? 6 : 5} • VAULT AUTO-LOCK & SECURITY
                  </Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Choose Auto-Lock Policy</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Decide when the webpage automatically locks itself with your Master PIN. Choose from 4 curated modes:
                </Text>

                {/* 4 Lock Policy Cards */}
                <View style={{ gap: 10, marginBottom: 16 }}>
                  {[
                    {
                      id: 'HIGH' as AutoLockPreset,
                      title: 'Paranoid Security (1 Minute)',
                      desc: 'Locks after 1 min idle AND immediately when switching browser tabs or minimizing.',
                      tag: 'Shared Devices',
                      icon: 'shield-half',
                    },
                    {
                      id: 'BALANCED' as AutoLockPreset,
                      title: 'Balanced (5 Minutes) — Recommended',
                      desc: 'Locks after 5 min idle AND immediately when switching browser tabs.',
                      tag: 'Default',
                      icon: 'shield-checkmark',
                    },
                    {
                      id: 'RELAXED' as AutoLockPreset,
                      title: 'Relaxed (15 Minutes)',
                      desc: 'Locks after 15 min idle. Does NOT lock on quick tab switches.',
                      tag: 'Personal Laptops',
                      icon: 'cafe-outline',
                    },
                    {
                      id: 'EXTENDED' as AutoLockPreset,
                      title: 'Extended Session (30 Minutes)',
                      desc: 'Locks after 30 min idle. Tab switching remains uninterrupted.',
                      tag: 'Dedicated Workspace',
                      icon: 'laptop-outline',
                    },
                  ].map((p) => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.presetCard,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.background,
                            borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => handleSelectPreset(p.id)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                            <Ionicons
                              name={p.icon as any}
                              size={18}
                              color={isSelected ? colors.primary : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.presetTitle,
                                { color: isSelected ? colors.primary : colors.textPrimary, flexShrink: 1 },
                              ]}
                            >
                              {p.title}
                            </Text>
                          </View>
                          <View style={[styles.tagPill, { backgroundColor: isSelected ? colors.primary : '#F1F5F9' }]}>
                            <Text style={[styles.tagText, { color: isSelected ? '#FFFFFF' : colors.textMuted }]}>
                              {p.tag}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.presetDesc, { color: colors.textMuted }]}>{p.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Fine-Tuning Switches */}
                <View style={[styles.customToggleBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.customToggleHeader, { color: colors.textSecondary }]}>FINE-TUNE PREFERENCES</Text>

                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => {
                      setAutoLockOnBlur(!autoLockOnBlur);
                      setSelectedPreset('CUSTOM');
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                        Lock immediately on tab switch / window blur
                      </Text>
                      <Text style={[styles.toggleHelper, { color: colors.textMuted }]}>
                        Hides sensitive financials whenever you switch tabs or minimize app
                      </Text>
                    </View>
                    {/* Custom Sliding Toggle Knob (DEF-001) */}
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

                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Inactivity Timeout</Text>
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
                              setSelectedPreset('CUSTOM');
                            }}
                          >
                            <Text style={[styles.minutePillText, { color: isSel ? '#FFFFFF' : colors.textPrimary }]}>
                              {mins === 0 ? 'Never' : `${mins}m`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Auto-Delete Vault on Failed PIN Inputs (DEF-007) */}
                  <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
                    <TouchableOpacity
                      style={styles.toggleRow}
                      onPress={() => setAutoDeleteOnFailedPin(!autoDeleteOnFailedPin)}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.toggleLabel, { color: autoDeleteOnFailedPin ? '#DC2626' : colors.textPrimary }]}>
                          Auto-delete vault on failed PIN attempts
                        </Text>
                        <Text style={[styles.toggleHelper, { color: colors.textMuted }]}>
                          Permanently wipes all local accounts and records if consecutive wrong PINs are entered.
                        </Text>
                      </View>
                      {/* Sliding Knob for Auto-Delete (DEF-001) */}
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
                                onPress={() => setAutoDeleteThreshold(num)}
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
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                    onPress={() => setCurrentStep('CONFIRMATION')}
                  >
                    <Text style={styles.primaryBtnText}>Review & Finish</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 7: REVIEW & COMPLETE */}
            {currentStep === 'CONFIRMATION' && (
              <View>
                <View style={[styles.badgePill, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark-done-circle" size={14} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgePillText, { color: '#15803D' }]}>FINAL STEP • READY TO LAUNCH</Text>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>Your Aegis Spendly Vault</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  Everything is configured and encrypted. Review your personalized setup below:
                </Text>

                {/* Summary Cards */}
                <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Profile Identity</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                      {displayName} (@{username})
                    </Text>
                  </View>
                  {SHOW_DRIVE_STEP && (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Google Account</Text>
                        <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{email}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Drive Folder</Text>
                        <Text style={[styles.summaryVal, { color: colors.primary, fontWeight: '700' }]}>
                          📁 {driveFolderName}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bank Accounts</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                      {banks.length === 0 ? 'None added (can add later)' : `${banks.length} account${banks.length === 1 ? '' : 's'} added`}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Credit Cards</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                      {cards.length === 0 ? 'None added (can add later)' : `${cards.length} card${cards.length === 1 ? '' : 's'} configured`}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income Type</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                      {incomeType === 'SALARIED' ? `Salaried (${formatRupee(parseFloat(salaryAmount) || 0)} on ${salaryDay}th)` : 'Flexible Inflow / Freelance'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Auto-Lock Policy</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                      {inactivityMinutes === 0 ? 'No idle lock' : `${inactivityMinutes}m idle`}
                      {autoLockOnBlur ? ' + Tab blur lock' : ''}
                    </Text>
                  </View>
                  {autoDeleteOnFailedPin && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Auto-Delete Vault</Text>
                      <Text style={[styles.summaryVal, { color: '#DC2626', fontWeight: '700' }]}>
                        Wipe after {autoDeleteThreshold} failed PIN attempts
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bottom Navigation with Back and Launch */}
                <View style={styles.bottomNavRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtnSmall, { backgroundColor: colors.primary, flex: 1, marginLeft: 14 }]}
                    onPress={handleFinishOnboarding}
                    disabled={isFinishing}
                  >
                    {isFinishing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="rocket-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Launch Spendly Vault</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: '100%',
  },
  container: {
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    maxWidth: '100%',
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stepConnector: {
    width: 14,
    height: 2,
    marginHorizontal: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  helper: {
    fontSize: 11,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  atSign: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyNoticeBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyNoticeSub: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  formContainerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formCardHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 8,
    marginTop: 6,
  },
  addCardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sliderBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  sliderHeader: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratioBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratioBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sliderSub: {
    fontSize: 11,
    marginTop: 2,
  },
  quickRatioRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  quickRatioBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRatioBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thresholdLegend: {
    gap: 4,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
  },
  skinOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  skinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  skinLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  incomeTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  incomeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  incomeTypeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  guidanceCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  guidanceSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  presetCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customToggleBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  customToggleHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleHelper: {
    fontSize: 10,
    marginTop: 2,
  },
  inactivityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  minutePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
