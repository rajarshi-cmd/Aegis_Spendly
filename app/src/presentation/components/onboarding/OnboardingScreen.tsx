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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';
import { useFinanceData } from '../../hooks/useFinanceData';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { AutoLockPreset, AuthSecurityConfig } from '../../../core/types/auth';
import { SyncCadence, DayOfWeek } from '../../../core/types/sync';
import { formatRupee } from '../../../core/utils/currency';

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
}

interface CardDraft {
  id: string;
  name: string;
  limit: number;
  balance: number;
  cutDay: number;
  dueDay: number;
  color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
}

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, config: securityConfig, updateConfig: updateSecurityConfig, completeOnboarding } = useAuthSecurity();
  const { updateProfile, updateSyncConfig, addAccount } = useFinanceData();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('IDENTITY');
  const [isFinishing, setIsFinishing] = useState(false);

  // Step 1: Identity fields
  const [username, setUsername] = useState(user?.username || 'rajarshi');
  const [displayName, setDisplayName] = useState(user?.name || 'Rajarshi Giri');
  const [email, setEmail] = useState(user?.email || 'rajarshi250500@gmail.com');
  const [avatar, setAvatar] = useState<AvatarId>('Moon cat');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Step 2: Bank Accounts
  const [banks, setBanks] = useState<BankDraft[]>([
    { id: 'b-1', name: 'HDFC Salary Account', balance: 50000 },
  ]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankBalance, setNewBankBalance] = useState('');

  // Step 3: Credit Cards
  const [cards, setCards] = useState<CardDraft[]>([
    { id: 'c-1', name: 'HDFC Regalia Gold', limit: 250000, balance: 14200, cutDay: 15, dueDay: 5, color: 'EMERALD' },
  ]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardCutDay, setNewCardCutDay] = useState('15');
  const [newCardDueDay, setNewCardDueDay] = useState('5');

  // Step 4: Salary
  const [hasSalary, setHasSalary] = useState(true);
  const [salaryAmount, setSalaryAmount] = useState('148000');
  const [salaryDay, setSalaryDay] = useState('1');

  // Step 5: Google Drive
  const [driveFolderName, setDriveFolderName] = useState('Aegis Spendly');
  const [syncCadence, setSyncCadence] = useState<SyncCadence>('DAILY');
  const [dailyTime, setDailyTime] = useState('22:00');
  const [weeklyDay, setWeeklyDay] = useState<DayOfWeek>('SUNDAY');

  // Step 6: Auto-Lock Security
  const [selectedPreset, setSelectedPreset] = useState<AutoLockPreset>('BALANCED');
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(true);
  const [inactivityMinutes, setInactivityMinutes] = useState(5);

  const STEPS: { id: OnboardingStep; label: string; number: number }[] = [
    { id: 'IDENTITY', label: 'Identity', number: 1 },
    { id: 'BANKS', label: 'Banks', number: 2 },
    { id: 'CARDS', label: 'Cards', number: 3 },
    { id: 'SALARY', label: 'Salary', number: 4 },
    { id: 'DRIVE', label: 'Drive Sync', number: 5 },
    { id: 'SECURITY', label: 'Auto-Lock', number: 6 },
    { id: 'CONFIRMATION', label: 'Ready', number: 7 },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Validation for Step 1
  const validateUsername = (val: string): boolean => {
    const cleaned = val.trim().toLowerCase().replace(/^@/, '');
    if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      setUsernameError('Letters, numbers and underscores only.');
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
    const bal = parseFloat(newBankBalance) || 0;
    setBanks((prev) => [...prev, { id: 'b-' + Date.now(), name: newBankName.trim(), balance: bal }]);
    setNewBankName('');
    setNewBankBalance('');
  };

  const handleRemoveBank = (id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddCard = () => {
    if (!newCardName.trim()) return;
    const lim = parseFloat(newCardLimit) || 100000;
    const bal = parseFloat(newCardBalance) || 0;
    const cut = parseInt(newCardCutDay, 10) || 15;
    const due = parseInt(newCardDueDay, 10) || 5;
    setCards((prev) => [
      ...prev,
      {
        id: 'c-' + Date.now(),
        name: newCardName.trim(),
        limit: lim,
        balance: bal,
        cutDay: cut,
        dueDay: due,
        color: 'EMERALD',
      },
    ]);
    setNewCardName('');
    setNewCardLimit('');
    setNewCardBalance('');
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

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      // 1. Create configured bank accounts
      for (const b of banks) {
        await addAccount({
          name: b.name,
          type: 'BANK_DEPOSIT',
          balance: b.balance,
          credit_limit: null,
          billing_cycle_cut_day: null,
          payment_due_day: null,
          minimum_balance: 5000,
        });
      }

      // 2. Create configured credit cards
      for (const c of cards) {
        await addAccount({
          name: c.name,
          type: 'CREDIT_CARD',
          balance: c.balance,
          credit_limit: c.limit,
          billing_cycle_cut_day: c.cutDay,
          payment_due_day: c.dueDay,
          minimum_balance: null,
          card_color: c.color,
        });
      }

      // 3. Update User Profile
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const profileUpdates: Partial<UserProfile> = {
        name: displayName.trim() || 'Rajarshi Giri',
        username: cleanUsername,
        handle: `@${cleanUsername}`,
        email: email.trim(),
        avatar,
        salary_amount: hasSalary ? parseFloat(salaryAmount) || 0 : 0,
        salary_day: hasSalary ? parseInt(salaryDay, 10) || 1 : 1,
        driveFolderName: driveFolderName.trim() || 'Aegis Spendly',
        isOnboarded: true,
      };
      updateProfile(profileUpdates);

      // 4. Update Google Sync preferences
      updateSyncConfig({
        driveFolderName: driveFolderName.trim() || 'Aegis Spendly',
        cadence: syncCadence,
        dailyTime,
        weeklyDay,
        googleEmail: email.trim(),
      });

      // 5. Update Security settings
      updateSecurityConfig({
        autoLockOnBlur,
        inactivityTimeoutMinutes: inactivityMinutes,
        lockPreset: selectedPreset,
      });

      // 6. Complete auth onboarding
      completeOnboarding({
        username: cleanUsername,
        name: displayName.trim(),
        email: email.trim(),
      });
    } catch (e) {
      console.error('[Onboarding] Error during completion:', e);
      // Fallback completion
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { maxWidth: isDesktop ? 680 : '100%' }]}>
        {/* Header Breadcrumbs / Progress */}
        <View style={styles.stepperRow}>
          {STEPS.map((s, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <View key={s.id} style={styles.stepIndicatorItem}>
                <View
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
                </View>
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

        {/* Content Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* STEP 1: IDENTITY & USERNAME */}
          {currentStep === 'IDENTITY' && (
            <View>
              <View style={[styles.badgePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.badgePillText}>STEP 1 • IDENTITY & PROFILE</Text>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to Aegis Spendly</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Let's set up your profile and notifications. Your data is stored locally and in your private Google Drive.
              </Text>

              {/* Username Field (MANDATORY) */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    VAULT USERNAME <Text style={{ color: '#DC2626' }}>*</Text>
                  </Text>
                  <Text style={[styles.helper, { color: colors.textMuted }]}>Cannot be skipped</Text>
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
                    placeholder="your_username"
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
                    placeholder="Your Name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  GOOGLE ACCOUNT EMAIL (DRIVE & NOTIFICATIONS)
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

              {/* CTA Next */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleNextFromIdentity}
              >
                <Text style={styles.primaryBtnText}>Continue to Accounts</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: BANK ACCOUNTS (SKIPPABLE) */}
          {currentStep === 'BANKS' && (
            <View>
              <View style={[styles.badgePill, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                <Ionicons name="business" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={[styles.badgePillText, { color: '#6D28D9' }]}>STEP 2 • BANK ACCOUNTS & WALLETS</Text>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Add Your Bank Accounts</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Track liquidity and balances. You can add your main banks now or skip and add later.
              </Text>

              {/* Configured Banks List */}
              <View style={{ marginBottom: 16 }}>
                {banks.map((b) => (
                  <View
                    key={b.id}
                    style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.itemIconBox, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="business-outline" size={16} color="#15803D" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]}>{b.name}</Text>
                      <Text style={[styles.itemMeta, { color: colors.textMuted }]}>Balance: {formatRupee(b.balance)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveBank(b.id)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Quick Add Bank Row */}
              <View style={[styles.addBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.addBoxTitle, { color: colors.textPrimary }]}>+ Add Another Bank / Wallet</Text>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={[styles.inputSimple, { flex: 2, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Bank nickname (e.g. SBI Savings)"
                    placeholderTextColor={colors.textMuted}
                    value={newBankName}
                    onChangeText={setNewBankName}
                  />
                  <TextInput
                    style={[styles.inputSimple, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Balance (₹)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newBankBalance}
                    onChangeText={setNewBankBalance}
                  />
                  <TouchableOpacity
                    style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
                    onPress={handleAddBank}
                  >
                    <Text style={styles.addBtnSmallText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentStep('CARDS')}>
                  <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: 12 }]}
                  onPress={() => setCurrentStep('CARDS')}
                >
                  <Text style={styles.primaryBtnText}>Continue to Credit Cards</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: CREDIT CARDS (SKIPPABLE) */}
          {currentStep === 'CARDS' && (
            <View>
              <View style={[styles.badgePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Ionicons name="card" size={14} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={[styles.badgePillText, { color: '#B45309' }]}>STEP 3 • CREDIT CARDS</Text>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Add Your Credit Cards</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Keep credit utilization and billing cut-off days in check. Skip if you don't use credit cards.
              </Text>

              {/* Configured Cards List */}
              <View style={{ marginBottom: 16 }}>
                {cards.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.itemIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="card-outline" size={16} color="#B45309" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]}>{c.name}</Text>
                      <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                        Limit: {formatRupee(c.limit)} • Due {c.dueDay}th
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveCard(c.id)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Quick Add Card Row */}
              <View style={[styles.addBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.addBoxTitle, { color: colors.textPrimary }]}>+ Add Another Credit Card</Text>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={[styles.inputSimple, { flex: 2, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Card nickname (e.g. Amazon ICICI)"
                    placeholderTextColor={colors.textMuted}
                    value={newCardName}
                    onChangeText={setNewCardName}
                  />
                  <TextInput
                    style={[styles.inputSimple, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Limit (₹)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newCardLimit}
                    onChangeText={setNewCardLimit}
                  />
                  <TextInput
                    style={[styles.inputSimple, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Due Day (1-31)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newCardDueDay}
                    onChangeText={setNewCardDueDay}
                  />
                  <TouchableOpacity
                    style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
                    onPress={handleAddCard}
                  >
                    <Text style={styles.addBtnSmallText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentStep('SALARY')}>
                  <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: 12 }]}
                  onPress={() => setCurrentStep('SALARY')}
                >
                  <Text style={styles.primaryBtnText}>Continue to Salary</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: SALARY & MONTHLY INFLOW (SKIPPABLE) */}
          {currentStep === 'SALARY' && (
            <View>
              <View style={[styles.badgePill, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                <Ionicons name="cash" size={14} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={[styles.badgePillText, { color: '#15803D' }]}>STEP 4 • SALARY & INFLOW</Text>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Monthly Income Projection</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Spendly projects monthly cash flow and calculates safe-to-spend envelopes based on your regular earnings.
              </Text>

              {/* Toggle Has Salary */}
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor: hasSalary ? colors.primaryLight : colors.background,
                    borderColor: hasSalary ? colors.primary : colors.borderSubtle,
                  },
                ]}
                onPress={() => setHasSalary(!hasSalary)}
              >
                <Ionicons
                  name={hasSalary ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={hasSalary ? colors.primary : colors.textMuted}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    I have a regular monthly salary or recurring income
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
                    Uncheck if your income is variable or freelance.
                  </Text>
                </View>
              </TouchableOpacity>

              {hasSalary && (
                <View style={{ marginTop: 14 }}>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>EXPECTED MONTHLY SALARY (₹)</Text>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[styles.atSign, { color: colors.primary }]}>₹</Text>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={salaryAmount}
                        onChangeText={setSalaryAmount}
                        placeholder="148000"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>PAYDAY (DAY OF MONTH 1 - 31)</Text>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={salaryDay}
                        onChangeText={setSalaryDay}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentStep('DRIVE')}>
                  <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: 12 }]}
                  onPress={() => setCurrentStep('DRIVE')}
                >
                  <Text style={styles.primaryBtnText}>Continue to Drive Sync</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
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
                Zero 3rd-party servers! Spreadsheets and backups will be saved strictly into your private Google Drive folder.
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
                  The app will create or locate this folder at the root of your Google Drive.
                </Text>
              </View>

              {/* Sync Cadence Cards */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>DEFAULT SYNC CADENCE</Text>
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
                          styles.cadenceCard,
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
                              styles.cadenceTitle,
                              { color: isSelected ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {cad.title}
                          </Text>
                          <Text style={[styles.cadenceDesc, { color: colors.textMuted }]}>{cad.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={() => setCurrentStep('SECURITY')}
              >
                <Text style={styles.primaryBtnText}>Continue to Auto-Lock Settings</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 6: AUTO-LOCK SECURITY OPTIONS */}
          {currentStep === 'SECURITY' && (
            <View>
              <View style={[styles.badgePill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="lock-closed" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.badgePillText, { color: '#B91C1C' }]}>STEP 6 • VAULT AUTO-LOCK FREQUENCY</Text>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name={p.icon as any}
                            size={18}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.presetTitle,
                              { color: isSelected ? colors.primary : colors.textPrimary },
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                      Lock immediately on tab switch / window blur
                    </Text>
                    <Text style={[styles.toggleHelper, { color: colors.textMuted }]}>
                      Hides sensitive financials whenever you switch tabs
                    </Text>
                  </View>
                  <Ionicons
                    name={autoLockOnBlur ? 'toggle' : 'toggle-outline'}
                    size={28}
                    color={autoLockOnBlur ? colors.primary : colors.textMuted}
                  />
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
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={() => setCurrentStep('CONFIRMATION')}
              >
                <Text style={styles.primaryBtnText}>Review & Finish</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
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
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bank Accounts</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {banks.length} account{banks.length === 1 ? '' : 's'} added
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Credit Cards</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {cards.length} card{cards.length === 1 ? '' : 's'} configured
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Auto-Lock Policy</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {inactivityMinutes === 0 ? 'No idle lock' : `${inactivityMinutes}m idle`}
                    {autoLockOnBlur ? ' + Tab blur lock' : ''}
                  </Text>
                </View>
              </View>

              {/* Finish Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
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
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 10,
    fontWeight: '700',
  },
  stepConnector: {
    width: 22,
    height: 2,
    marginHorizontal: 4,
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
    marginBottom: 20,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    width: 32,
    height: 32,
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
  addBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputSimple: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addBtnSmall: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cadenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cadenceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cadenceDesc: {
    fontSize: 11,
    marginTop: 2,
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
});
