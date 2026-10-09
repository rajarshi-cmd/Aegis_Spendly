import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';
import { useFinanceData } from '../../hooks/useFinanceData';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { AutoLockPreset } from '../../../core/types/auth';
import { formatRupee } from '../../../core/utils/currency';
import {
  validateUsername as checkUsername,
  validateCalendarDay,
  clampCalendarDay,
  validateKeepTrackRatio,
  parseBalanceInput,
} from '../../../core/utils/validators';
import { AnimatedVault } from './AnimatedVault';
import { formatOrdinalDay } from '../../../core/utils/date';

type OnboardingStep =
  | 'IDENTITY'
  | 'BANKS'
  | 'CARDS'
  | 'INCOME'
  | 'SECURITY'
  | 'PIN'
  | 'READY';

interface BankDraft {
  id: string;
  name: string;
  type: 'SAVINGS' | 'CURRENT';
  nickname: string;
  balance: number;
  minBalance: number;
}

interface CardDraft {
  id: string;
  provider: string;
  name: string;
  network: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex';
  limit: number;
  balance: number;
  cutDay: number;
  dueDay: number;
  keepTrackRatio: number;
  color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
}

interface IncomeStreamDraft {
  id: string;
  sourceName: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  bankAccountId: string;
}

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, updateConfig: updateSecurityConfig, setupPin, completeOnboarding } = useAuthSecurity();
  const { updateProfile, initializeUserVault } = useFinanceData();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('IDENTITY');
  const [isFinishing, setIsFinishing] = useState(false);

  // ---------------------------------------------------------
  // STEP 1: IDENTITY
  // ---------------------------------------------------------
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<AvatarId>('Moon cat');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // STEP 2: BANK ACCOUNTS
  // ---------------------------------------------------------
  const [banks, setBanks] = useState<BankDraft[]>([]);
  const [isAddBankSheetOpen, setIsAddBankSheetOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [draftBankType, setDraftBankType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [draftBankName, setDraftBankName] = useState('');
  const [draftBankNickname, setDraftBankNickname] = useState('');
  const [draftBankBalance, setDraftBankBalance] = useState('');
  const [draftBankMinBalance, setDraftBankMinBalance] = useState('');

  // ---------------------------------------------------------
  // STEP 3: CREDIT CARDS
  // ---------------------------------------------------------
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [isAddCardSheetOpen, setIsAddCardSheetOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draftCardProvider, setDraftCardProvider] = useState('');
  const [draftCardNickname, setDraftCardNickname] = useState('');
  const [draftCardNetwork, setDraftCardNetwork] = useState<'Visa' | 'Mastercard' | 'RuPay' | 'Amex'>('Visa');
  const [draftCardLimit, setDraftCardLimit] = useState('');
  const [draftCardBalance, setDraftCardBalance] = useState('');
  const [draftCardCapRatio, setDraftCardCapRatio] = useState<number>(30);
  const [draftCardCutDay, setDraftCardCutDay] = useState('');
  const [draftCardDueDay, setDraftCardDueDay] = useState('');
  const [draftCardColor, setDraftCardColor] = useState<'EMERALD' | 'PURPLE' | 'CARAMEL'>('EMERALD');
  const [cardCutDayError, setCardCutDayError] = useState<string | null>(null);
  const [cardDueDayError, setCardDueDayError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // STEP 4: INCOME STREAMS
  // ---------------------------------------------------------
  const [incomeStreams, setIncomeStreams] = useState<IncomeStreamDraft[]>([]);
  const [isAddIncomeSheetOpen, setIsAddIncomeSheetOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeSheetTab, setIncomeSheetTab] = useState<'SALARY' | 'FREELANCE'>('SALARY');
  const [draftIncomeSource, setDraftIncomeSource] = useState('');
  const [draftIncomeAmount, setDraftIncomeAmount] = useState('');
  const [draftIncomeDay, setDraftIncomeDay] = useState<number>(1);
  const [draftIncomeBank, setDraftIncomeBank] = useState('');
  const [returnToIncomeSheetAfterBank, setReturnToIncomeSheetAfterBank] = useState(false);

  // ---------------------------------------------------------
  // PULSING AMBIENT AURA (DEF-025)
  // ---------------------------------------------------------
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;
  const pulseGlowOpacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScaleAnim, {
            toValue: 1.22,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScaleAnim, {
            toValue: 1.0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseGlowOpacity, {
            toValue: 0.42,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseGlowOpacity, {
            toValue: 0.14,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseScaleAnim, pulseGlowOpacity]);

  // ---------------------------------------------------------
  // STEP 5: VAULT SECURITY PRESETS & GUARDRAILS
  // ---------------------------------------------------------
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(true);
  const [inactivityMinutes, setInactivityMinutes] = useState(5);
  const [selectedPreset, setSelectedPreset] = useState<AutoLockPreset>('BALANCED');
  const [autoDeleteOnFailedPin, setAutoDeleteOnFailedPin] = useState(false);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState(5);

  // ---------------------------------------------------------
  // STEP 6: PIN SETUP & CONFIRMATION
  // ---------------------------------------------------------
  const [pinSubStep, setPinSubStep] = useState<'CREATE' | 'CONFIRM'>('CREATE');
  const [createdPin, setCreatedPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isEncryptingPin, setIsEncryptingPin] = useState(false);

  // Physical keyboard support for PIN input on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || currentStep !== 'PIN') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadPress('backspace');
      } else if (e.key === 'Enter') {
        if (pinSubStep === 'CREATE' && createdPin.length === 4) {
          setPinSubStep('CONFIRM');
        } else if (pinSubStep === 'CONFIRM' && confirmPin.length === 4) {
          handleConfirmPin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, pinSubStep, createdPin, confirmPin]);

  // Stepper steps definition
  const STEP_CONFIG = [
    { id: 'IDENTITY', label: 'Create Identity', num: 1 },
    { id: 'BANKS', label: 'Bank Accounts', num: 2 },
    { id: 'CARDS', label: 'Credit Cards', num: 3 },
    { id: 'INCOME', label: 'Income Streams', num: 4 },
    { id: 'SECURITY', label: 'Vault Security', num: 5 },
    { id: 'PIN', label: 'Vault Security PIN', num: 6 },
  ];

  const currentStepNumber =
    currentStep === 'READY'
      ? 6
      : STEP_CONFIG.findIndex((s) => s.id === currentStep) + 1;

  // Handle back button
  const handleGoBack = () => {
    switch (currentStep) {
      case 'BANKS':
        setCurrentStep('IDENTITY');
        break;
      case 'CARDS':
        setCurrentStep('BANKS');
        break;
      case 'INCOME':
        setCurrentStep('CARDS');
        break;
      case 'SECURITY':
        setCurrentStep('INCOME');
        break;
      case 'PIN':
        if (pinSubStep === 'CONFIRM') {
          setPinSubStep('CREATE');
          setConfirmPin('');
          setPinError(null);
        } else {
          setCurrentStep('SECURITY');
        }
        break;
      default:
        break;
    }
  };

  // ---------------------------------------------------------
  // VALIDATIONS & ACTIONS
  // ---------------------------------------------------------
  const validateUsernameInput = (val: string): boolean => {
    const res = checkUsername(val);
    if (!res.isValid) {
      setUsernameError(res.error || 'Invalid handle');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  // Draft Reset Helpers
  const resetBankDraft = () => {
    setEditingBankId(null);
    setDraftBankType('SAVINGS');
    setDraftBankName('');
    setDraftBankNickname('');
    setDraftBankBalance('');
    setDraftBankMinBalance('');
  };

  const resetCardDraft = () => {
    setEditingCardId(null);
    setDraftCardProvider('');
    setDraftCardNickname('');
    setDraftCardNetwork('Visa');
    setDraftCardLimit('');
    setDraftCardBalance('');
    setDraftCardCapRatio(30);
    setDraftCardCutDay('');
    setDraftCardDueDay('');
    setDraftCardColor('EMERALD');
    setCardCutDayError(null);
    setCardDueDayError(null);
  };

  const resetIncomeDraft = () => {
    setEditingIncomeId(null);
    setIncomeSheetTab('SALARY');
    setDraftIncomeSource('');
    setDraftIncomeAmount('');
    setDraftIncomeDay(1);
    setDraftIncomeBank(banks[0]?.name || 'Primary Cash Vault');
  };

  const handleOpenBankSheet = () => {
    resetBankDraft();
    setIsAddBankSheetOpen(true);
  };

  const handleEditBank = (bank: BankDraft) => {
    setEditingBankId(bank.id);
    setDraftBankType(bank.type);
    setDraftBankName(bank.name);
    setDraftBankNickname(bank.nickname);
    setDraftBankBalance(bank.balance > 0 ? String(bank.balance) : '');
    setDraftBankMinBalance(bank.minBalance > 0 ? String(bank.minBalance) : '');
    setIsAddBankSheetOpen(true);
  };

  const handleCloseBankSheet = () => {
    setIsAddBankSheetOpen(false);
    resetBankDraft();
    if (returnToIncomeSheetAfterBank) {
      setReturnToIncomeSheetAfterBank(false);
      setIsAddIncomeSheetOpen(true);
    }
  };

  const handleOpenCardSheet = () => {
    resetCardDraft();
    setIsAddCardSheetOpen(true);
  };

  const handleEditCard = (card: CardDraft) => {
    setEditingCardId(card.id);
    setDraftCardProvider(card.provider);
    setDraftCardNickname(card.name);
    setDraftCardNetwork(card.network);
    setDraftCardLimit(card.limit > 0 ? String(card.limit) : '');
    setDraftCardBalance(card.balance > 0 ? String(card.balance) : '');
    setDraftCardCapRatio(card.keepTrackRatio);
    setDraftCardCutDay(card.cutDay ? String(card.cutDay) : '');
    setDraftCardDueDay(card.dueDay ? String(card.dueDay) : '');
    setDraftCardColor(card.color);
    setIsAddCardSheetOpen(true);
  };

  const handleCloseCardSheet = () => {
    setIsAddCardSheetOpen(false);
    resetCardDraft();
  };

  const handleOpenIncomeSheet = () => {
    resetIncomeDraft();
    setIsAddIncomeSheetOpen(true);
  };

  const handleEditIncomeStream = (stream: IncomeStreamDraft) => {
    setEditingIncomeId(stream.id);
    setIncomeSheetTab(stream.category === 'Salaried Paycheck' ? 'SALARY' : 'FREELANCE');
    setDraftIncomeSource(stream.sourceName);
    setDraftIncomeAmount(stream.amount > 0 ? String(stream.amount) : '');
    setDraftIncomeDay(stream.dayOfMonth);
    setDraftIncomeBank(stream.bankAccountId || banks[0]?.name || 'Primary Cash Vault');
    setIsAddIncomeSheetOpen(true);
  };

  const handleCloseIncomeSheet = () => {
    setIsAddIncomeSheetOpen(false);
    resetIncomeDraft();
  };

  const handleOpenBankFromIncome = () => {
    setReturnToIncomeSheetAfterBank(true);
    setIsAddIncomeSheetOpen(false);
    handleOpenBankSheet();
  };

  // Add / Update Bank
  const handleSaveBankDraft = () => {
    if (!draftBankName.trim()) return;
    if (editingBankId) {
      setBanks((prev) =>
        prev.map((b) =>
          b.id === editingBankId
            ? {
                ...b,
                name: draftBankName.trim(),
                type: draftBankType,
                nickname: draftBankNickname.trim() || `${draftBankName.trim()} Account`,
                balance: parseBalanceInput(draftBankBalance, 0),
                minBalance: parseBalanceInput(draftBankMinBalance, 0),
              }
            : b
        )
      );
      setEditingBankId(null);
    } else {
      const newBank: BankDraft = {
        id: 'b-' + Date.now(),
        name: draftBankName.trim(),
        type: draftBankType,
        nickname: draftBankNickname.trim() || `${draftBankName.trim()} Account`,
        balance: parseBalanceInput(draftBankBalance, 0),
        minBalance: parseBalanceInput(draftBankMinBalance, 0),
      };
      setBanks((prev) => [...prev, newBank]);
      setDraftIncomeBank(newBank.name);
    }
    resetBankDraft();
    setIsAddBankSheetOpen(false);
    if (returnToIncomeSheetAfterBank) {
      setReturnToIncomeSheetAfterBank(false);
      setIsAddIncomeSheetOpen(true);
    }
  };

  const handleRemoveBank = (id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
  };

  // Add / Update Card
  const handleSaveCardDraft = () => {
    if (!draftCardProvider.trim()) return;
    const isCutValid = validateCalendarDay(draftCardCutDay).isValid;
    const isDueValid = validateCalendarDay(draftCardDueDay).isValid;
    if (!isCutValid) {
      setCardCutDayError('Day must be 1 to 31');
      return;
    }
    if (!isDueValid) {
      setCardDueDayError('Day must be 1 to 31');
      return;
    }

    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                provider: draftCardProvider.trim(),
                name: draftCardNickname.trim() || draftCardProvider.trim(),
                network: draftCardNetwork,
                limit: parseBalanceInput(draftCardLimit, 100000),
                balance: parseBalanceInput(draftCardBalance, 0),
                cutDay: clampCalendarDay(draftCardCutDay, 15),
                dueDay: clampCalendarDay(draftCardDueDay, 5),
                keepTrackRatio: validateKeepTrackRatio(draftCardCapRatio),
                color: draftCardColor,
              }
            : c
        )
      );
      setEditingCardId(null);
    } else {
      const newCard: CardDraft = {
        id: 'c-' + Date.now(),
        provider: draftCardProvider.trim(),
        name: draftCardNickname.trim() || draftCardProvider.trim(),
        network: draftCardNetwork,
        limit: parseBalanceInput(draftCardLimit, 100000),
        balance: parseBalanceInput(draftCardBalance, 0),
        cutDay: clampCalendarDay(draftCardCutDay, 15),
        dueDay: clampCalendarDay(draftCardDueDay, 5),
        keepTrackRatio: validateKeepTrackRatio(draftCardCapRatio),
        color: draftCardColor,
      };
      setCards((prev) => [...prev, newCard]);
    }
    resetCardDraft();
    setIsAddCardSheetOpen(false);
    setCardCutDayError(null);
    setCardDueDayError(null);
  };

  const handleRemoveCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Add / Update Income Stream
  const handleSaveIncomeDraft = () => {
    if (!draftIncomeSource.trim()) return;
    const amountVal = parseBalanceInput(draftIncomeAmount, 0);
    const categoryName = incomeSheetTab === 'SALARY' ? 'Salaried Paycheck' : 'Freelance / Other';
    if (editingIncomeId) {
      setIncomeStreams((prev) =>
        prev.map((s) =>
          s.id === editingIncomeId
            ? {
                ...s,
                sourceName: draftIncomeSource.trim(),
                category: categoryName,
                amount: amountVal,
                dayOfMonth: clampCalendarDay(draftIncomeDay || 1, 1),
                bankAccountId: draftIncomeBank || (banks[0]?.name ?? 'Primary Cash Vault'),
              }
            : s
        )
      );
      setEditingIncomeId(null);
    } else {
      const newStream: IncomeStreamDraft = {
        id: 'inc-' + Date.now(),
        sourceName: draftIncomeSource.trim(),
        category: categoryName,
        amount: amountVal,
        dayOfMonth: clampCalendarDay(draftIncomeDay || 1, 1),
        bankAccountId: draftIncomeBank || (banks[0]?.name ?? 'Primary Cash Vault'),
      };
      setIncomeStreams((prev) => [...prev, newStream]);
    }
    resetIncomeDraft();
    setIsAddIncomeSheetOpen(false);
  };

  const handleRemoveIncomeStream = (id: string) => {
    setIncomeStreams((prev) => prev.filter((s) => s.id !== id));
  };

  // Keypad handling for PIN
  const handleKeypadPress = (key: string) => {
    setPinError(null);
    const activePin = pinSubStep === 'CREATE' ? createdPin : confirmPin;
    const setPin = pinSubStep === 'CREATE' ? setCreatedPin : setConfirmPin;

    if (key === 'backspace') {
      if (activePin.length > 0) {
        setPin(activePin.slice(0, -1));
      }
    } else if (key >= '0' && key <= '9') {
      if (activePin.length < 4) {
        const next = activePin + key;
        setPin(next);
      }
    }
  };

  // Confirm PIN & Advance to Ready Screen
  const handleConfirmPin = async () => {
    if (confirmPin !== createdPin) {
      setPinError('PINs do not match. Please re-enter.');
      setConfirmPin('');
      return;
    }

    setIsEncryptingPin(true);
    try {
      await setupPin(createdPin);
      setTimeout(() => {
        setIsEncryptingPin(false);
        setCurrentStep('READY');
      }, 600);
    } catch (e) {
      console.error('[Onboarding] Error during PIN setup:', e);
      setIsEncryptingPin(false);
      setCurrentStep('READY');
    }
  };

  // Final Launch Spendly Vault
  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      // 1. Initialize SQLite Database with user accounts
      await initializeUserVault(
        banks.map((b) => ({
          name: b.name + (b.nickname ? ` (${b.nickname})` : ''),
          balance: b.balance,
          minimum_balance: b.minBalance,
        })),
        cards.map((c) => ({
          name: c.name,
          limit: c.limit,
          balance: c.balance,
          cutDay: c.cutDay,
          dueDay: c.dueDay,
          color: c.color,
          keepTrackRatio: c.keepTrackRatio,
        }))
      );

      // 2. Update user profile
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const primaryStream = incomeStreams[0];
      const profileUpdates: Partial<UserProfile> = {
        name: displayName.trim() || cleanUsername || 'User',
        username: cleanUsername,
        handle: `@${cleanUsername}`,
        email: email.trim(),
        avatar,
        salary_amount: primaryStream ? primaryStream.amount : 0,
        salary_day: primaryStream ? primaryStream.dayOfMonth : 1,
        salary_account_id: primaryStream ? primaryStream.bankAccountId : (banks[0]?.name ?? ''),
        driveFolderName: 'Aegis Spendly',
        isOnboarded: true,
      };
      updateProfile(profileUpdates);

      // 3. Update security config
      updateSecurityConfig({
        autoLockOnBlur,
        inactivityTimeoutMinutes: inactivityMinutes,
        lockPreset: selectedPreset,
        autoDeleteOnFailedPin,
        autoDeleteThreshold,
      });

      // 4. Complete auth onboarding
      completeOnboarding({
        username: cleanUsername,
        name: displayName.trim(),
        email: email.trim(),
      });
    } catch (e) {
      console.error('[Onboarding] Error finishing vault setup:', e);
      completeOnboarding({ username: username.trim() });
    } finally {
      setIsFinishing(false);
    }
  };

  // Total liquid calculation
  const totalLiquidCash = banks.reduce((sum, b) => sum + b.balance, 0);

  // Total card balance vs limit
  const totalCardSpent = cards.reduce((sum, c) => sum + c.balance, 0);
  const totalCardLimit = cards.reduce((sum, c) => sum + c.limit, 0);
  const cardUtilizationPct = totalCardLimit > 0 ? Math.round((totalCardSpent / totalCardLimit) * 100) : 0;

  // Total income inflow
  const totalMonthlyInflow = incomeStreams.reduce((sum, s) => sum + s.amount, 0);

  // Active PIN displayed
  const currentPinDigits = pinSubStep === 'CREATE' ? createdPin : confirmPin;

  // Render header
  const renderHeader = () => {
    if (currentStep === 'READY') return null;

    const currentConfig = STEP_CONFIG.find((s) => s.id === currentStep);

    return (
      <View style={styles.fixedHeader}>
        <View style={styles.headerTopRow}>
          {currentStepNumber > 1 ? (
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.headerBackBtn}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {currentConfig?.label || 'Onboarding'}
          </Text>

          <View style={[styles.stepPill, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.stepPillText, { color: colors.textPrimary }]}>
              {currentStepNumber} of 6
            </Text>
          </View>
        </View>

        {/* 6-segment stepper progress bar */}
        <View style={styles.stepperBarRow}>
          {STEP_CONFIG.map((s, idx) => {
            const isFilled = idx < currentStepNumber;
            const isCurrent = idx === currentStepNumber - 1;
            return (
              <View
                key={s.id}
                style={[
                  styles.stepperSegment,
                  {
                    backgroundColor: isFilled ? colors.primary : '#1C2B3C',
                    shadowColor: isCurrent ? colors.primary : 'transparent',
                    shadowOpacity: isCurrent ? 0.6 : 0,
                    shadowRadius: 6,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: '#051424' }]}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: currentStep === 'READY' ? 24 : 96,
            paddingBottom: currentStep === 'READY' ? 32 : 100,
            maxWidth: isDesktop ? 540 : '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* STEP 1: CREATE IDENTITY */}
        {/* ========================================================= */}
        {currentStep === 'IDENTITY' && (
          <View style={styles.stepContainer}>
            {/* Identity Form Card */}
            <View style={[styles.obsidianCard, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
              {/* Field 1: Display Name */}
              <View style={styles.formGroup}>
                <View style={styles.fieldHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>DISPLAY NAME</Text>
                  <Text style={[styles.fieldHint, { color: '#64748B' }]}>Visible to contacts</Text>
                </View>
                <View style={[styles.inputBox, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.textInput, { color: '#D4E4FA' }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Alex Morgan"
                    placeholderTextColor="#64748B"
                  />
                  {displayName.length > 0 && (
                    <TouchableOpacity onPress={() => setDisplayName('')} style={styles.clearBtn}>
                      <Ionicons name="close" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Field 2: Username Handle */}
              <View style={styles.formGroup}>
                <View style={styles.fieldHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>USERNAME HANDLE</Text>
                  <View style={[styles.availableBadge, { backgroundColor: 'rgba(75, 226, 119, 0.1)', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                    <View style={[styles.smallGreenDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.availableText, { color: colors.primary }]}>Available</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: '#0D1C2D',
                      borderColor: usernameError ? '#EF4444' : '#1C2B3C',
                    },
                  ]}
                >
                  <Text style={[styles.atPrefix, { color: colors.primary }]}>@</Text>
                  <TextInput
                    style={[styles.textInput, { color: '#D4E4FA' }]}
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      validateUsernameInput(val);
                    }}
                    placeholder="username"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                </View>
                {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}

                {/* Validation Tags */}
                <View style={styles.tagChipsRow}>
                  <View style={[styles.ruleChip, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                    <Ionicons name="checkmark" size={12} color={colors.primary} />
                    <Text style={styles.ruleChipText}>lowercase</Text>
                  </View>
                  <View style={[styles.ruleChip, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                    <Ionicons name="checkmark" size={12} color={colors.primary} />
                    <Text style={styles.ruleChipText}>3–20 chars</Text>
                  </View>
                  <View style={[styles.ruleChip, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                    <Ionicons name="checkmark" size={12} color={colors.primary} />
                    <Text style={styles.ruleChipText}>no spaces</Text>
                  </View>
                </View>
              </View>

              {/* Field 3: Account Email */}
              <View style={[styles.formGroup, { borderTopWidth: 1, borderTopColor: '#1C2B3C', paddingTop: 14 }]}>
                <View style={styles.fieldHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>ACCOUNT EMAIL</Text>
                  {user?.email ? (
                    <View style={[styles.readonlyPill, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                      <Ionicons name="lock-closed" size={10} color="#94A3B8" />
                      <Text style={styles.readonlyText}>Verified Credential</Text>
                    </View>
                  ) : (
                    <View style={[styles.readonlyPill, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                      <Ionicons name="mail-outline" size={10} color={colors.primary} />
                      <Text style={[styles.readonlyText, { color: colors.primary }]}>Local Vault ID</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.inputBox, { backgroundColor: user?.email ? 'rgba(13, 28, 45, 0.7)' : '#0D1C2D', borderColor: '#1C2B3C' }]}>
                  <Ionicons name="mail-outline" size={16} color="#94A3B8" style={{ marginRight: 10 }} />
                  {user?.email ? (
                    <Text style={[styles.readOnlyEmailText, { color: '#94A3B8' }]}>{email}</Text>
                  ) : (
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA', flex: 1 }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="alex@example.com"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                </View>
              </View>

              {/* Field 4: Vault Avatar */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>VAULT AVATAR</Text>
                <View style={styles.avatarRow}>
                  {[
                    { id: 'Moon cat' as AvatarId, label: 'Moon Cat', icon: 'paw' },
                    { id: 'Forest rabbit' as AvatarId, label: 'Rabbit', icon: 'leaf' },
                    { id: 'Little ghost' as AvatarId, label: 'Ghost', icon: 'happy' },
                    { id: 'Star mage' as AvatarId, label: 'Star Mage', icon: 'sparkles' },
                  ].map((av) => {
                    const isSelected = avatar === av.id;
                    return (
                      <TouchableOpacity
                        key={av.id}
                        onPress={() => setAvatar(av.id)}
                        style={[
                          styles.avatarCard,
                          {
                            backgroundColor: isSelected ? 'rgba(75, 226, 119, 0.12)' : '#0D1C2D',
                            borderColor: isSelected ? colors.primary : '#1C2B3C',
                          },
                        ]}
                      >
                        <Ionicons
                          name={av.icon as any}
                          size={18}
                          color={isSelected ? colors.primary : '#94A3B8'}
                        />
                        <Text
                          style={[
                            styles.avatarCardText,
                            { color: isSelected ? colors.primary : '#94A3B8' },
                          ]}
                        >
                          {av.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Zero-Knowledge Security Banner Tile */}
            <View style={[styles.securityBannerCard, { backgroundColor: '#0D1C2D', borderColor: '#1B2F48' }]}>
              <View style={styles.securityBannerLeft}>
                <View style={[styles.securityIconBox, { backgroundColor: 'rgba(75, 226, 119, 0.1)', borderColor: 'rgba(75, 226, 119, 0.2)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.securityBannerTitle, { color: '#D4E4FA' }]}>
                    Zero-Knowledge Hardware Binding
                  </Text>
                  <Text style={[styles.securityBannerSub, { color: '#94A3B8' }]}>
                    All aliases are signed with local key storage.
                  </Text>
                </View>
              </View>
              <View style={[styles.bitBadge, { backgroundColor: '#122131', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                <Text style={[styles.bitBadgeText, { color: colors.primary }]}>256-Bit</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 2: BANK ACCOUNTS */}
        {/* ========================================================= */}
        {currentStep === 'BANKS' && (
          <View style={styles.stepContainer}>
            {banks.length === 0 ? (
              /* Empty State */
              <View style={[styles.emptyStateCard, { backgroundColor: '#0D1C2D' }]}>
                <View style={styles.pulseIconContainer}>
                  <Animated.View
                    style={[
                      styles.pulseCircleBack,
                      {
                        backgroundColor: 'rgba(75, 226, 119, 0.14)',
                        transform: [{ scale: pulseScaleAnim }],
                        opacity: pulseGlowOpacity,
                      },
                    ]}
                  />
                  <View style={[styles.pulseInnerBox, { backgroundColor: '#122131' }]}>
                    <Ionicons name="business" size={32} color={colors.primary} />
                  </View>
                  <View style={[styles.smallPlusBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={14} color="#003915" />
                  </View>
                </View>

                <Text style={[styles.emptyTitle, { color: '#D4E4FA' }]}>
                  No Bank Accounts Linked
                </Text>
                <Text style={[styles.emptySub, { color: '#94A3B8' }]}>
                  Add your primary salary or savings account to track liquid runway and avoid unexpected shortfalls.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenBankSheet}
                >
                  <Ionicons name="add-circle" size={20} color="#003915" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Add Bank Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Populated State */
              <View style={{ gap: 14 }}>
                {/* Liquidity Safety Hero Card */}
                <View style={[styles.heroStatCard, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                  <View style={styles.heroTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.smallPulseDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.heroStatusLabel, { color: colors.primary }]}>
                        LIQUIDITY SAFETY
                      </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: '#1C2B3C' }]}>
                      <Ionicons name="business" size={12} color={colors.primary} />
                      <Text style={[styles.countBadgeText, { color: '#D4E4FA' }]}>
                        {banks.length} Linked
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.heroMetricSub, { color: '#94A3B8' }]}>Total Liquid Cash</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.heroMetricValue, { color: colors.primary }]}>
                      {formatRupee(totalLiquidCash)}
                    </Text>
                    <Text style={[styles.heroMetricUnit, { color: colors.primary }]}>available</Text>
                  </View>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: '#D4E4FA' }]}>Active Accounts</Text>
                  <View style={[styles.countPill, { backgroundColor: '#122131' }]}>
                    <Text style={[styles.countPillText, { color: '#94A3B8' }]}>{banks.length}</Text>
                  </View>
                </View>

                {/* List of Banks */}
                {banks.map((b) => (
                  <View
                    key={b.id}
                    style={[styles.itemCardObsidian, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}
                  >
                    <View style={styles.itemCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.bankIconBox, { backgroundColor: '#1C2B3C' }]}>
                          <Ionicons name="business" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bankTitle, { color: '#D4E4FA' }]}>{b.name}</Text>
                          <View style={[styles.accountTag, { backgroundColor: '#0D1C2D' }]}>
                            <Text style={[styles.accountTagText, { color: '#94A3B8' }]}>{b.nickname}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.bankBalanceText, { color: '#D4E4FA' }]}>
                          {formatRupee(b.balance)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <TouchableOpacity
                            onPress={() => handleEditBank(b)}
                            style={[styles.cardActionIconBtn, { backgroundColor: '#1C2B3C' }]}
                            accessibilityLabel="Edit bank account"
                          >
                            <Ionicons name="pencil-outline" size={13} color="#94A3B8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRemoveBank(b.id)}
                            style={[styles.cardActionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                            accessibilityLabel="Delete bank account"
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* MAB Floor & Buffer Bar */}
                    <View style={[styles.floorBufferBox, { backgroundColor: 'rgba(13, 28, 45, 0.6)', borderColor: 'rgba(28, 43, 60, 0.6)' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          <Text style={[styles.floorText, { color: '#D4E4FA' }]}>
                            Floor: {formatRupee(b.minBalance)} MAB
                          </Text>
                        </View>
                        <Text style={[styles.floorText, { color: '#94A3B8' }]}>
                          {b.balance >= b.minBalance ? 'Healthy' : 'Below MAB'}
                        </Text>
                      </View>
                      <View style={[styles.progressBarTrack, { backgroundColor: '#1C2B3C' }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: colors.primary,
                              width: `${Math.min(100, Math.round((b.balance / Math.max(1, b.balance + b.minBalance)) * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add Another Bank Dashed Card */}
                <TouchableOpacity
                  style={[styles.dashedAddBtn, { borderColor: 'rgba(134, 149, 133, 0.3)', backgroundColor: 'rgba(18, 33, 49, 0.3)' }]}
                  onPress={handleOpenBankSheet}
                >
                  <View style={[styles.dashedAddIconBox, { backgroundColor: '#1C2B3C' }]}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.dashedAddText, { color: '#D4E4FA' }]}>Add Another Bank Account</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 3: CREDIT CARDS */}
        {/* ========================================================= */}
        {currentStep === 'CARDS' && (
          <View style={styles.stepContainer}>
            {cards.length === 0 ? (
              /* Empty State */
              <View style={[styles.emptyStateCard, { backgroundColor: '#0D1C2D' }]}>
                <View style={styles.pulseIconContainer}>
                  <Animated.View
                    style={[
                      styles.pulseCircleBack,
                      {
                        backgroundColor: 'rgba(255, 202, 69, 0.14)',
                        transform: [{ scale: pulseScaleAnim }],
                        opacity: pulseGlowOpacity,
                      },
                    ]}
                  />
                  <View style={[styles.pulseInnerBox, { backgroundColor: '#122131' }]}>
                    <Ionicons name="card" size={32} color="#FFCA45" />
                  </View>
                  <View style={[styles.smallPlusBadge, { backgroundColor: '#FFCA45' }]}>
                    <Ionicons name="add" size={14} color="#3F2E00" />
                  </View>
                </View>

                <Text style={[styles.emptyTitle, { color: '#D4E4FA' }]}>
                  No Credit Cards Added Yet
                </Text>
                <Text style={[styles.emptySub, { color: '#94A3B8' }]}>
                  Configure statement cut-off days, due dates, and track utilization ceilings to safeguard your credit score.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenCardSheet}
                >
                  <Ionicons name="add-circle" size={20} color="#003915" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Add Credit Card</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Populated State */
              <View style={{ gap: 14 }}>
                {/* Credit Utilization Hero Card */}
                <View style={[styles.heroStatCard, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                  <View style={styles.heroTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.smallPulseDot, { backgroundColor: cardUtilizationPct <= 30 ? colors.primary : '#EF4444' }]} />
                      <Text style={[styles.heroStatusLabel, { color: cardUtilizationPct <= 30 ? colors.primary : '#EF4444' }]}>
                        CREDIT UTILIZATION
                      </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: '#1C2B3C' }]}>
                      <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                      <Text style={[styles.countBadgeText, { color: '#D4E4FA' }]}>
                        {cardUtilizationPct <= 30 ? `Healthy (${cardUtilizationPct}%)` : `High (${cardUtilizationPct}%)`}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.heroMetricSub, { color: '#94A3B8' }]}>Total Outstanding vs Limit</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.heroMetricValue, { color: colors.primary }]}>
                      {formatRupee(totalCardSpent)}
                    </Text>
                    <Text style={[styles.heroMetricLimitText, { color: '#94A3B8' }]}>
                      / {formatRupee(totalCardLimit)}
                    </Text>
                  </View>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: '#D4E4FA' }]}>Active Cards ({cards.length})</Text>
                </View>

                {/* Card List Items */}
                {cards.map((c) => {
                  const cardSpentPct = c.limit > 0 ? Math.round((c.balance / c.limit) * 100) : 0;
                  return (
                    <View
                      key={c.id}
                      style={[styles.itemCardObsidian, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}
                    >
                      <View style={styles.itemCardTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View
                            style={[
                              styles.bankIconBox,
                              {
                                backgroundColor:
                                  c.color === 'PURPLE'
                                    ? 'rgba(139, 92, 246, 0.2)'
                                    : c.color === 'CARAMEL'
                                    ? 'rgba(234, 179, 8, 0.2)'
                                    : 'rgba(75, 226, 119, 0.2)',
                              },
                            ]}
                          >
                            <Ionicons
                              name="card"
                              size={20}
                              color={
                                c.color === 'PURPLE'
                                  ? '#A78BFA'
                                  : c.color === 'CARAMEL'
                                  ? '#FACC15'
                                  : colors.primary
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.bankTitle, { color: '#D4E4FA' }]}>{c.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <View style={[styles.accountTag, { backgroundColor: '#0D1C2D' }]}>
                                <Text style={[styles.accountTagText, { color: colors.primary }]}>{c.network}</Text>
                              </View>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }}>{c.provider}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.bankBalanceText, { color: '#D4E4FA' }]}>
                            {formatRupee(c.balance)}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                            Limit: {formatRupee(c.limit)}
                          </Text>
                        </View>
                      </View>

                      {/* Utilization Bar & Metrics */}
                      <View style={[styles.floorBufferBox, { backgroundColor: 'rgba(13, 28, 45, 0.6)', borderColor: 'rgba(28, 43, 60, 0.6)' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={[styles.floorText, { color: colors.primary }]}>
                            {cardSpentPct}% Spent ({formatRupee(c.balance)})
                          </Text>
                          <Text style={[styles.floorText, { color: '#FFCA45' }]}>
                            Cap: {c.keepTrackRatio}% Max
                          </Text>
                        </View>
                        <View style={[styles.progressBarTrack, { backgroundColor: '#1C2B3C' }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                backgroundColor: cardSpentPct <= c.keepTrackRatio ? colors.primary : '#EF4444',
                                width: `${Math.min(100, cardSpentPct)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Statement and Due Date Chips */}
                      <View style={styles.cardDatesRow}>
                        <View style={[styles.dateChip, { backgroundColor: 'rgba(13, 28, 45, 0.6)', borderColor: '#1C2B3C' }]}>
                          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                          <Text style={[styles.dateChipText, { color: '#D4E4FA' }]}>
                            Bill Cut: {formatOrdinalDay(c.cutDay)}
                          </Text>
                        </View>
                        <View style={[styles.dateChip, { backgroundColor: 'rgba(13, 28, 45, 0.6)', borderColor: '#1C2B3C' }]}>
                          <Ionicons name="time-outline" size={14} color="#FFCA45" />
                          <Text style={[styles.dateChipText, { color: '#FFCA45' }]}>
                            Due Day: {formatOrdinalDay(c.dueDay)}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleEditCard(c)}
                            style={[styles.cardActionIconBtn, { backgroundColor: '#1C2B3C' }]}
                            accessibilityLabel="Edit credit card"
                          >
                            <Ionicons name="pencil-outline" size={13} color="#94A3B8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRemoveCard(c.id)}
                            style={[styles.cardActionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                            accessibilityLabel="Delete credit card"
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Add Another Card Dashed Button */}
                <TouchableOpacity
                  style={[styles.dashedAddBtn, { borderColor: 'rgba(134, 149, 133, 0.3)', backgroundColor: 'rgba(18, 33, 49, 0.3)' }]}
                  onPress={handleOpenCardSheet}
                >
                  <View style={[styles.dashedAddIconBox, { backgroundColor: '#1C2B3C' }]}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.dashedAddText, { color: '#D4E4FA' }]}>Add Another Card</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 4: INCOME STREAMS */}
        {/* ========================================================= */}
        {currentStep === 'INCOME' && (
          <View style={styles.stepContainer}>
            {incomeStreams.length === 0 ? (
              /* Empty State */
              <View style={[styles.emptyStateCard, { backgroundColor: '#0D1C2D' }]}>
                <View style={styles.pulseIconContainer}>
                  <Animated.View
                    style={[
                      styles.pulseCircleBack,
                      {
                        backgroundColor: 'rgba(75, 226, 119, 0.14)',
                        transform: [{ scale: pulseScaleAnim }],
                        opacity: pulseGlowOpacity,
                      },
                    ]}
                  />
                  <View style={[styles.pulseInnerBox, { backgroundColor: '#122131' }]}>
                    <Ionicons name="cash-outline" size={32} color={colors.primary} />
                  </View>
                  <View style={[styles.smallPlusBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={14} color="#003915" />
                  </View>
                </View>

                <Text style={[styles.emptyTitle, { color: '#D4E4FA' }]}>
                  No Income Sources Added
                </Text>
                <Text style={[styles.emptySub, { color: '#94A3B8' }]}>
                  Add your primary salary or freelance streams to automate cash flow projections and runway calculations.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenIncomeSheet}
                >
                  <Ionicons name="add-circle" size={20} color="#003915" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Add Income Source</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Populated State */
              <View style={{ gap: 14 }}>
                {/* Cash Flow Projection Hero Card */}
                <View style={[styles.heroStatCard, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
                  <View style={styles.heroTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.smallPulseDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.heroStatusLabel, { color: colors.primary }]}>
                        CASH FLOW PROJECTION
                      </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: '#1C2B3C' }]}>
                      <Ionicons name="checkmark-done-circle" size={12} color={colors.primary} />
                      <Text style={[styles.countBadgeText, { color: '#D4E4FA' }]}>
                        {incomeStreams.length} Verified Stream{incomeStreams.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.heroMetricSub, { color: '#94A3B8' }]}>
                    Total Estimated Monthly Inflow
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.heroMetricValue, { color: colors.primary }]}>
                      {formatRupee(totalMonthlyInflow)}
                    </Text>
                    <Text style={[styles.heroMetricLimitText, { color: '#94A3B8' }]}>/ month</Text>
                  </View>
                </View>

                {/* Income Stream Cards List */}
                {incomeStreams.map((s, idx) => (
                  <View
                    key={s.id}
                    style={[styles.itemCardObsidian, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}
                  >
                    <View style={styles.itemCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.bankIconBox, { backgroundColor: '#1C2B3C' }]}>
                          <Ionicons name="business" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.bankTitle, { color: '#D4E4FA' }]}>{s.sourceName}</Text>
                            {idx === 0 && (
                              <View style={{ backgroundColor: 'rgba(75, 226, 119, 0.1)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>PRIMARY</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{s.category}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.bankBalanceText, { color: colors.primary }]}>
                          {formatRupee(s.amount)}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>/ month</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={[styles.dateChip, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                          <Text style={[styles.dateChipText, { color: '#D4E4FA' }]}>Day {s.dayOfMonth} of month</Text>
                        </View>
                        <View style={[styles.dateChip, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
                          <Ionicons name="business-outline" size={12} color="#94A3B8" />
                          <Text style={[styles.dateChipText, { color: '#94A3B8' }]}>{s.bankAccountId || 'Direct Credit'}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleEditIncomeStream(s)}
                          style={[styles.cardActionIconBtn, { backgroundColor: '#1C2B3C' }]}
                          accessibilityLabel="Edit income source"
                        >
                          <Ionicons name="pencil-outline" size={13} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveIncomeStream(s.id)}
                          style={[styles.cardActionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                          accessibilityLabel="Delete income source"
                        >
                          <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add Another Income Source Button */}
                <TouchableOpacity
                  style={[styles.dashedAddBtn, { borderColor: 'rgba(75, 226, 119, 0.3)', backgroundColor: '#0D1C2D' }]}
                  onPress={handleOpenIncomeSheet}
                >
                  <View style={[styles.dashedAddIconBox, { backgroundColor: 'rgba(75, 226, 119, 0.15)' }]}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.dashedAddText, { color: colors.primary }]}>Add Another Income Source</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 5: VAULT SECURITY */}
        {/* ========================================================= */}
        {currentStep === 'SECURITY' && (
          <View style={styles.stepContainer}>
            {/* AES-256 Enclave Banner */}
            <View style={[styles.securityBannerCard, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
              <View style={styles.securityBannerLeft}>
                <View style={[styles.securityIconBox, { backgroundColor: 'rgba(75, 226, 119, 0.1)', borderColor: 'rgba(75, 226, 119, 0.2)' }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.securityBannerTitle, { color: '#D4E4FA' }]}>
                    AES-256 Enclave
                  </Text>
                  <Text style={[styles.securityBannerSub, { color: '#94A3B8' }]}>
                    Zero-Knowledge • Device Isolated
                  </Text>
                </View>
              </View>
              <View style={[styles.bitBadge, { backgroundColor: '#122131', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                <Text style={[styles.bitBadgeText, { color: colors.primary }]}>Hardware Bound</Text>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { color: '#94A3B8', marginTop: 6 }]}>
              HEURISTIC GUARDRAILS
            </Text>

            {/* Guardrail 1: Auto Lock on Blur */}
            <View style={[styles.obsidianCard, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
              <TouchableOpacity
                style={styles.guardrailRow}
                onPress={() => setAutoLockOnBlur(!autoLockOnBlur)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.guardrailIconBox, { backgroundColor: 'rgba(75, 226, 119, 0.1)' }]}>
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.guardrailTitle, { color: '#D4E4FA' }]}>Auto Lock</Text>
                    <Text style={[styles.guardrailSub, { color: '#94A3B8' }]}>
                      Secure session when app loses focus
                    </Text>
                  </View>
                </View>
                {/* Switch Knob */}
                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: autoLockOnBlur ? colors.primary : '#1C2B3C' },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      { transform: [{ translateX: autoLockOnBlur ? 18 : 2 }] },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Inactivity Timeout Options (Conditionally expanded - DEF-030) */}
              {autoLockOnBlur && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1C2B3C' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>
                    Inactivity Timeout
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '1m', mins: 1, preset: 'HIGH' as AutoLockPreset },
                      { label: '5m', mins: 5, preset: 'BALANCED' as AutoLockPreset },
                      { label: '15m', mins: 15, preset: 'RELAXED' as AutoLockPreset },
                      { label: '30m', mins: 30, preset: 'EXTENDED' as AutoLockPreset },
                    ].map((t) => {
                      const isSel = inactivityMinutes === t.mins;
                      return (
                        <TouchableOpacity
                          key={t.mins}
                          onPress={() => {
                            setInactivityMinutes(t.mins);
                            setSelectedPreset(t.preset);
                          }}
                          style={[
                            styles.minuteChip,
                            {
                              backgroundColor: isSel ? colors.primary : '#122131',
                              borderColor: isSel ? colors.primary : '#1C2B3C',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.minuteChipText,
                              { color: isSel ? '#003915' : '#D4E4FA', fontWeight: isSel ? '700' : '500' },
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Guardrail 2: Tamper-Proof Auto-Wipe */}
            <View style={[styles.obsidianCard, { backgroundColor: '#0D1C2D', borderColor: '#1C2B3C' }]}>
              <TouchableOpacity
                style={styles.guardrailRow}
                onPress={() => setAutoDeleteOnFailedPin(!autoDeleteOnFailedPin)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.guardrailIconBox, { backgroundColor: 'rgba(255, 202, 69, 0.1)' }]}>
                    <Ionicons name="trash-bin-outline" size={20} color="#FFCA45" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.guardrailTitle, { color: '#D4E4FA' }]}>
                        Auto-Wipe on Failure
                      </Text>
                      <View style={[styles.tagPillSmall, { backgroundColor: 'rgba(75, 226, 119, 0.15)', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                        <Text style={[styles.tagPillSmallText, { color: colors.primary }]}>
                          {autoDeleteThreshold} Tries
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.guardrailSub, { color: '#94A3B8' }]}>
                      Wipe vault after {autoDeleteThreshold} failed PIN attempts
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: autoDeleteOnFailedPin ? colors.primary : '#1C2B3C' },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      { transform: [{ translateX: autoDeleteOnFailedPin ? 18 : 2 }] },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {autoDeleteOnFailedPin && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1C2B3C' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>
                    Maximum Failed Attempts (5–10)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[5, 6, 7, 8, 9, 10].map((num) => {
                      const isSel = autoDeleteThreshold === num;
                      return (
                        <TouchableOpacity
                          key={num}
                          onPress={() => setAutoDeleteThreshold(num)}
                          style={[
                            styles.minuteChip,
                            {
                              backgroundColor: isSel ? colors.primary : '#122131',
                              borderColor: isSel ? colors.primary : '#1C2B3C',
                              flex: 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.minuteChipText,
                              { color: isSel ? '#003915' : '#D4E4FA', fontWeight: isSel ? '700' : '500' },
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.tipBanner, { backgroundColor: 'rgba(28, 43, 60, 0.4)', borderColor: '#1C2B3C' }]}>
                    <Ionicons name="information-circle" size={16} color="#FFCA45" style={{ marginRight: 6 }} />
                    <Text style={[styles.tipBannerText, { color: '#94A3B8' }]}>
                      <Text style={{ color: '#FFCA45', fontWeight: '600' }}>Recommended: </Text>
                      5 attempts ensures rapid protection against brute-force attacks.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 6: PIN SETUP & KEYPAD */}
        {/* ========================================================= */}
        {currentStep === 'PIN' && (
          <View style={[styles.stepContainer, { alignItems: 'center' }]}>
            {/* Top Icon & Subtitle */}
            <View style={[styles.pinIconCircle, { backgroundColor: '#1C2B3C' }]}>
              <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            </View>

            <Text style={[styles.pinHeroTitle, { color: '#D4E4FA' }]}>
              {pinSubStep === 'CREATE' ? 'Create 4-Digit PIN' : 'Confirm 4-Digit PIN'}
            </Text>
            <Text style={[styles.pinHeroSub, { color: '#94A3B8' }]}>
              {pinSubStep === 'CREATE'
                ? 'Establish a local master passcode to encrypt your isolated SQLite biometric vault.'
                : 'Re-enter your 4-digit master passcode to verify encryption hash.'}
            </Text>

            {/* 4 PIN Dots */}
            <View style={[styles.pinDotsRow, { backgroundColor: '#0D1C2D' }]}>
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = idx < currentPinDigits.length;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.pinDot,
                      {
                        backgroundColor: isFilled ? colors.primary : '#1C2B3C',
                        shadowColor: isFilled ? colors.primary : 'transparent',
                        shadowOpacity: isFilled ? 0.7 : 0,
                        shadowRadius: 8,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Status Feedback */}
            {pinError ? (
              <Text style={[styles.pinFeedbackText, { color: '#EF4444' }]}>{pinError}</Text>
            ) : (
              <Text style={[styles.pinFeedbackText, { color: colors.primary }]}>
                {currentPinDigits.length === 4
                  ? 'Passcode Ready'
                  : `${currentPinDigits.length} of 4 Digits Staged`}
              </Text>
            )}

            {/* PBKDF2 Protocol Chip */}
            <View style={[styles.protocolChip, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.protocolTitle, { color: '#D4E4FA' }]}>
                  PBKDF2-SHA256 • Hardware Enclave
                </Text>
                <Text style={[styles.protocolSub, { color: '#64748B' }]}>
                  Zero-knowledge protocol • Stored 100% offline
                </Text>
              </View>
              <View style={[styles.localTag, { backgroundColor: 'rgba(75, 226, 119, 0.1)' }]}>
                <Text style={[styles.localTagText, { color: colors.primary }]}>LOCAL</Text>
              </View>
            </View>

            {/* Tactile Numeric Keypad */}
            <View style={styles.keypadGrid}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['bio', '0', 'backspace'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => handleKeypadPress(k)}
                      style={[
                        styles.keypadBtn,
                        {
                          backgroundColor: k === 'bio' || k === 'backspace' ? '#0D1C2D' : '#122131',
                        },
                      ]}
                    >
                      {k === 'backspace' ? (
                        <Ionicons name="backspace-outline" size={22} color="#94A3B8" />
                      ) : k === 'bio' ? (
                        <Ionicons name="finger-print" size={22} color={colors.primary} />
                      ) : (
                        <Text style={[styles.keypadNumText, { color: '#D4E4FA' }]}>{k}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            {pinSubStep === 'CREATE' ? (
              <TouchableOpacity
                disabled={createdPin.length !== 4}
                onPress={() => setPinSubStep('CONFIRM')}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor: createdPin.length === 4 ? colors.primary : '#1C2B3C',
                    marginTop: 16,
                    width: '100%',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.primaryActionBtnText,
                    { color: createdPin.length === 4 ? '#003915' : '#64748B' },
                  ]}
                >
                  Continue to Confirm PIN
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={createdPin.length === 4 ? '#003915' : '#64748B'}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled={confirmPin.length !== 4 || isEncryptingPin}
                onPress={handleConfirmPin}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor: confirmPin.length === 4 ? colors.primary : '#1C2B3C',
                    marginTop: 16,
                    width: '100%',
                  },
                ]}
              >
                {isEncryptingPin ? (
                  <ActivityIndicator size="small" color="#003915" />
                ) : (
                  <>
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color={confirmPin.length === 4 ? '#003915' : '#64748B'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.primaryActionBtnText,
                        { color: confirmPin.length === 4 ? '#003915' : '#64748B' },
                      ]}
                    >
                      Encrypt Vault with PIN
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 7: VAULT READY & ANIMATED SVG */}
        {/* ========================================================= */}
        {currentStep === 'READY' && (
          <View style={[styles.stepContainer, { alignItems: 'center' }]}>
            {/* Animated SVG Component */}
            <View style={{ marginVertical: 12 }}>
              <AnimatedVault size={isDesktop ? 280 : 230} />
            </View>

            {/* Status Pill */}
            <View style={[styles.vaultReadyBadge, { backgroundColor: '#122131', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
              <View style={[styles.smallPulseDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.vaultReadyBadgeText, { color: colors.primary }]}>
                Vault Encrypted & Locked
              </Text>
              <Ionicons name="lock-closed" size={12} color={colors.primary} />
            </View>

            <Text style={[styles.vaultReadyTitle, { color: '#D4E4FA' }]}>
              Your Vault is Ready
            </Text>
            <Text style={[styles.vaultReadySub, { color: '#94A3B8' }]}>
              Local SQLite database sealed with AES-256 and your Master PIN. All financial intelligence remains 100% offline on this device.
            </Text>

            {/* Stacked Bento Specification Cards */}
            <View style={{ width: '100%', gap: 10, marginVertical: 20 }}>
              {/* Spec 1 */}
              <View style={[styles.bentoSpecCard, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: '#1C2B3C' }]}>
                  <Ionicons name="person-circle" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.bentoTitle, { color: '#D4E4FA' }]}>Identity Sealed</Text>
                    <View style={[styles.tagPillSmall, { backgroundColor: 'rgba(75, 226, 119, 0.15)', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                      <Text style={[styles.tagPillSmallText, { color: colors.primary }]}>Secure</Text>
                    </View>
                  </View>
                  <Text style={[styles.bentoDesc, { color: '#94A3B8' }]}>
                    Master profile, biometric keys & device seed
                  </Text>
                </View>
              </View>

              {/* Spec 2 */}
              <View style={[styles.bentoSpecCard, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: '#1C2B3C' }]}>
                  <Ionicons name="business" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.bentoTitle, { color: '#D4E4FA' }]}>Accounts Configured</Text>
                    <View style={[styles.tagPillSmall, { backgroundColor: 'rgba(75, 226, 119, 0.15)', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                      <Text style={[styles.tagPillSmallText, { color: colors.primary }]}>Ready</Text>
                    </View>
                  </View>
                  <Text style={[styles.bentoDesc, { color: '#94A3B8' }]}>
                    Liquid vaults, credit limits & recurring cashflow
                  </Text>
                </View>
              </View>

              {/* Spec 3 */}
              <View style={[styles.bentoSpecCard, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: '#1C2B3C' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.bentoTitle, { color: '#D4E4FA' }]}>Zero-Knowledge Core</Text>
                    <View style={[styles.tagPillSmall, { backgroundColor: 'rgba(75, 226, 119, 0.15)', borderColor: 'rgba(75, 226, 119, 0.3)' }]}>
                      <Text style={[styles.tagPillSmallText, { color: colors.primary }]}>AES-256</Text>
                    </View>
                  </View>
                  <Text style={[styles.bentoDesc, { color: '#94A3B8' }]}>
                    PBKDF2-SHA256 derived key tied to hardware enclave
                  </Text>
                </View>
              </View>
            </View>

            {/* Launch Dashboard CTA */}
            <TouchableOpacity
              onPress={handleFinishOnboarding}
              disabled={isFinishing}
              style={[
                styles.primaryActionBtn,
                { backgroundColor: colors.primary, width: '100%', height: 52, borderRadius: 14 },
              ]}
            >
              {isFinishing ? (
                <ActivityIndicator size="small" color="#003915" />
              ) : (
                <>
                  <Text style={[styles.primaryActionBtnText, { fontSize: 15 }]}>
                    Enter Your Vault Dashboard
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#003915" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <View style={[styles.smallGreenDot, { backgroundColor: colors.primary }]} />
              <Text style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                SQLite Local Database Initialized • Offline Mode Active
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* FIXED BOTTOM ACTION BAR (STEPS 1 TO 5) */}
      {/* ========================================================= */}
      {currentStep !== 'PIN' && currentStep !== 'READY' && (
        <View style={styles.fixedFooter}>
          <View style={[styles.footerContainer, { maxWidth: isDesktop ? 540 : '100%' }]}>
            <TouchableOpacity
              style={[styles.skipFooterBtn, { backgroundColor: '#122131', borderColor: '#1C2B3C' }]}
              onPress={() => {
                if (currentStep === 'IDENTITY') setCurrentStep('BANKS');
                else if (currentStep === 'BANKS') setCurrentStep('CARDS');
                else if (currentStep === 'CARDS') setCurrentStep('INCOME');
                else if (currentStep === 'INCOME') setCurrentStep('SECURITY');
                else if (currentStep === 'SECURITY') setCurrentStep('PIN');
              }}
            >
              <Text style={[styles.skipFooterText, { color: '#D4E4FA' }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueFooterBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (currentStep === 'IDENTITY') {
                  if (validateUsernameInput(username)) setCurrentStep('BANKS');
                } else if (currentStep === 'BANKS') {
                  setCurrentStep('CARDS');
                } else if (currentStep === 'CARDS') {
                  setCurrentStep('INCOME');
                } else if (currentStep === 'INCOME') {
                  setCurrentStep('SECURITY');
                } else if (currentStep === 'SECURITY') {
                  setCurrentStep('PIN');
                }
              }}
            >
              <Text style={styles.continueFooterText}>
                {currentStep === 'IDENTITY'
                  ? 'Continue to Bank Setup'
                  : currentStep === 'BANKS'
                  ? 'Continue to Credit Cards'
                  : currentStep === 'CARDS'
                  ? 'Continue to Income'
                  : currentStep === 'INCOME'
                  ? 'Continue to Security'
                  : 'Setup PIN'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#003915" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* BOTTOM SHEET MODAL: ADD BANK ACCOUNT */}
      {/* ========================================================= */}
      <Modal
        visible={isAddBankSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseBankSheet}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleCloseBankSheet}
          />
          <View style={[styles.sheetContent, { backgroundColor: '#0D1C2D' }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: '#D4E4FA' }]}>
                  {editingBankId ? 'Edit Bank Account' : 'Add Bank Account'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: '#94A3B8' }]}>
                  Store bank records securely in your on-device encrypted vault.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseBankSheet}
                style={[styles.sheetCloseBtn, { backgroundColor: '#1C2B3C' }]}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Account Type Toggle */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>ACCOUNT TYPE</Text>
                <View style={styles.toggleTwoRow}>
                  <TouchableOpacity
                    onPress={() => setDraftBankType('SAVINGS')}
                    style={[
                      styles.toggleTwoBtn,
                      {
                        backgroundColor: draftBankType === 'SAVINGS' ? '#273647' : '#010F1F',
                      },
                    ]}
                  >
                    <Ionicons
                      name="wallet"
                      size={16}
                      color={draftBankType === 'SAVINGS' ? colors.primary : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.toggleTwoText,
                        { color: draftBankType === 'SAVINGS' ? '#D4E4FA' : '#94A3B8' },
                      ]}
                    >
                      Savings Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDraftBankType('CURRENT')}
                    style={[
                      styles.toggleTwoBtn,
                      {
                        backgroundColor: draftBankType === 'CURRENT' ? '#273647' : '#010F1F',
                      },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={16}
                      color={draftBankType === 'CURRENT' ? colors.primary : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.toggleTwoText,
                        { color: draftBankType === 'CURRENT' ? '#D4E4FA' : '#94A3B8' },
                      ]}
                    >
                      Current / Salary
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bank Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>BANK NAME</Text>
                <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                  <Ionicons name="business-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { color: '#D4E4FA' }]}
                    value={draftBankName}
                    onChangeText={setDraftBankName}
                    placeholder="HDFC Bank, ICICI, SBI"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Account Nickname */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>ACCOUNT NICKNAME</Text>
                <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                  <TextInput
                    style={[styles.textInput, { color: '#D4E4FA' }]}
                    value={draftBankNickname}
                    onChangeText={setDraftBankNickname}
                    placeholder="Primary Savings, Emergency Fund"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Opening Balance & MAB */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>OPENING BALANCE (₹)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700', marginRight: 4 }}>₹</Text>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftBankBalance}
                      onChangeText={setDraftBankBalance}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>MIN. BALANCE / MAB (₹)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <Text style={{ color: '#94A3B8', fontWeight: '700', marginRight: 4 }}>₹</Text>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftBankMinBalance}
                      onChangeText={setDraftBankMinBalance}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={{ gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleSaveBankDraft}
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="lock-closed" size={16} color="#003915" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>
                  {editingBankId ? 'Save Changes' : 'Save Account to Local Vault'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCloseBankSheet}
                style={styles.cancelSheetBtn}
              >
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* BOTTOM SHEET MODAL: ADD CREDIT CARD */}
      {/* ========================================================= */}
      <Modal
        visible={isAddCardSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCardSheet}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleCloseCardSheet}
          />
          <View style={[styles.sheetContent, { backgroundColor: '#0D1C2D' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: '#D4E4FA' }]}>
                  {editingCardId ? 'Edit Credit Card' : 'Add Credit Card'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: '#94A3B8' }]}>
                  Setup zero-telemetry offline card ledger.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseCardSheet}
                style={[styles.sheetCloseBtn, { backgroundColor: '#1C2B3C' }]}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Card Provider & Nickname */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>PROVIDER / ISSUER</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardProvider}
                      onChangeText={setDraftCardProvider}
                      placeholder="HDFC Bank, ICICI"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>CARD TITLE</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardNickname}
                      onChangeText={setDraftCardNickname}
                      placeholder="Millennia, Regalia"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </View>

              {/* Card Network Chips (Horizontal Scroll - DEF-026) */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>CARD NETWORK</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                >
                  {(['Visa', 'Mastercard', 'RuPay', 'Amex'] as const).map((net) => {
                    const isSel = draftCardNetwork === net;
                    return (
                      <TouchableOpacity
                        key={net}
                        onPress={() => setDraftCardNetwork(net)}
                        style={[
                          styles.minuteChip,
                          {
                            backgroundColor: isSel ? colors.primary : '#010F1F',
                            borderColor: isSel ? colors.primary : '#1C2B3C',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.minuteChipText,
                            { color: isSel ? '#003915' : '#D4E4FA', fontWeight: isSel ? '700' : '500' },
                          ]}
                        >
                          {net}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Limit & Balance */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>CREDIT LIMIT (₹)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardLimit}
                      onChangeText={setDraftCardLimit}
                      keyboardType="numeric"
                      placeholder="100000"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>SPENT / OUTSTANDING (₹)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardBalance}
                      onChangeText={setDraftCardBalance}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </View>

              {/* Target Utilization Cap Presets */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>TARGET UTILIZATION CAP</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                    {draftCardCapRatio}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[30, 40, 50, 60, 100].map((pct) => {
                    const isSel = draftCardCapRatio === pct;
                    return (
                      <TouchableOpacity
                        key={pct}
                        onPress={() => setDraftCardCapRatio(pct)}
                        style={[
                          styles.minuteChip,
                          {
                            backgroundColor: isSel ? '#FFCA45' : '#010F1F',
                            borderColor: isSel ? '#FFCA45' : '#1C2B3C',
                            flex: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.minuteChipText,
                            { color: isSel ? '#3F2E00' : '#D4E4FA', fontWeight: isSel ? '700' : '500' },
                          ]}
                        >
                          {pct}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Statement Cut Day & Due Day */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>BILL CUT DAY (1–31)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: cardCutDayError ? '#EF4444' : '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardCutDay}
                      onChangeText={setDraftCardCutDay}
                      keyboardType="numeric"
                      placeholder=""
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  {cardCutDayError && <Text style={styles.errorText}>{cardCutDayError}</Text>}
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>DUE DAY (1–31)</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: cardDueDayError ? '#EF4444' : '#1C2B3C' }]}>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftCardDueDay}
                      onChangeText={setDraftCardDueDay}
                      keyboardType="numeric"
                      placeholder=""
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  {cardDueDayError && <Text style={styles.errorText}>{cardDueDayError}</Text>}
                </View>
              </View>
            </ScrollView>

            <View style={{ gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleSaveCardDraft}
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="lock-closed" size={16} color="#003915" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>
                  {editingCardId ? 'Save Changes' : 'Save Card to Local Vault'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCloseCardSheet}
                style={styles.cancelSheetBtn}
              >
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* BOTTOM SHEET MODAL: ADD INCOME STREAM (1:1 STITCH DESIGN) */}
      {/* ========================================================= */}
      <Modal
        visible={isAddIncomeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseIncomeSheet}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleCloseIncomeSheet}
          />
          <View style={[styles.sheetContent, { backgroundColor: '#0D1C2D' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                {incomeSheetTab === 'FREELANCE' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={[styles.smallPulseDot, { backgroundColor: colors.primary }]} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' }}>
                      Vault Inflow Layer
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.sheetTitle, { color: '#D4E4FA' }]}>
                  {editingIncomeId
                    ? 'Edit Income Source'
                    : incomeSheetTab === 'SALARY'
                    ? 'Add Salary Income'
                    : 'Add Other Income Source'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: '#94A3B8' }]}>
                  {incomeSheetTab === 'SALARY'
                    ? 'Automate payroll tracking and liquid reserves'
                    : 'Configure secondary or non-salaried earnings'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseIncomeSheet}
                style={[styles.sheetCloseBtn, { backgroundColor: '#1C2B3C' }]}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Category Toggle: Salary vs Freelance / Other */}
            <View style={styles.incomeToggleContainer}>
              <TouchableOpacity
                onPress={() => setIncomeSheetTab('SALARY')}
                style={[
                  styles.incomeToggleTab,
                  incomeSheetTab === 'SALARY'
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: 'transparent' },
                ]}
              >
                <Ionicons
                  name={incomeSheetTab === 'SALARY' ? 'checkmark-circle' : 'cash-outline'}
                  size={16}
                  color={incomeSheetTab === 'SALARY' ? '#003915' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.incomeToggleText,
                    { color: incomeSheetTab === 'SALARY' ? '#003915' : '#94A3B8' },
                  ]}
                >
                  Salary
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIncomeSheetTab('FREELANCE')}
                style={[
                  styles.incomeToggleTab,
                  incomeSheetTab === 'FREELANCE'
                    ? { backgroundColor: '#1C2B3C' }
                    : { backgroundColor: 'transparent' },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={16}
                  color={incomeSheetTab === 'FREELANCE' ? colors.primary : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.incomeToggleText,
                    { color: incomeSheetTab === 'FREELANCE' ? '#D4E4FA' : '#94A3B8' },
                  ]}
                >
                  Freelance / Other
                </Text>
              </TouchableOpacity>
            </View>

            {incomeSheetTab === 'SALARY' ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                {/* Field 1: Organisation Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>COMPANY OR ORGANISATION</Text>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C' }]}>
                    <Ionicons name="business-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA' }]}
                      value={draftIncomeSource}
                      onChangeText={setDraftIncomeSource}
                      placeholder="Acme Technologies Inc"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                {/* Field 2: Net Monthly Salary */}
                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.fieldLabel, { color: '#94A3B8', marginBottom: 0 }]}>NET MONTHLY SALARY</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Post-tax liquid</Text>
                  </View>
                  <View style={[styles.inputBox, { backgroundColor: '#010F1F', borderColor: '#1C2B3C', height: 52 }]}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, marginRight: 6 }}>₹</Text>
                    <TextInput
                      style={[styles.textInput, { color: '#D4E4FA', fontSize: 18, fontWeight: '700' }]}
                      value={draftIncomeAmount}
                      onChangeText={setDraftIncomeAmount}
                      keyboardType="numeric"
                      placeholder="85,000"
                      placeholderTextColor="#64748B"
                    />
                    <View style={{ backgroundColor: '#1C2B3C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>INR</Text>
                    </View>
                  </View>
                </View>

                {/* Field 3: Payday Selector */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>DAY OF SALARY / PAYDAY</Text>
                  <View style={styles.paydayGrid}>
                    {[
                      { day: 1, label: '1st', icon: 'calendar-outline' as const },
                      { day: 5, label: '5th', icon: 'calendar-outline' as const },
                      { day: 25, label: '25th', icon: 'calendar-outline' as const },
                      { day: 31, label: 'Last Day', icon: 'repeat-outline' as const },
                    ].map((p) => {
                      const isSelected = draftIncomeDay === p.day;
                      return (
                        <TouchableOpacity
                          key={p.day}
                          onPress={() => setDraftIncomeDay(p.day)}
                          style={[
                            styles.paydayPill,
                            isSelected
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: '#122131', borderColor: '#1C2B3C' },
                          ]}
                        >
                          <Ionicons
                            name={p.icon}
                            size={14}
                            color={isSelected ? '#003915' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.paydayPillText,
                              { color: isSelected ? '#003915' : '#94A3B8' },
                            ]}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Field 4: Linked accounts */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>LINKED ACCOUNTS</Text>
                  {banks.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      {banks.map((b) => {
                        const isSelected = (draftIncomeBank || banks[0]?.name) === b.name;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            onPress={() => setDraftIncomeBank(b.name)}
                            style={[
                              styles.incomeBankCard,
                              isSelected
                                ? { backgroundColor: '#122131', borderColor: colors.primary }
                                : { backgroundColor: '#091624', borderColor: '#1C2B3C' },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.bankIconBox, { backgroundColor: '#1C2B3C' }]}>
                                <Ionicons
                                  name="business-outline"
                                  size={18}
                                  color={isSelected ? colors.primary : '#94A3B8'}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#D4E4FA' }}>
                                    {b.nickname || b.name}
                                  </Text>
                                  <View style={{ backgroundColor: 'rgba(75, 226, 119, 0.1)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>Connected</Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                  {b.type === 'CURRENT' ? 'Current Account' : 'Primary Salary Account'}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.incomeBankRadio,
                                isSelected
                                  ? { backgroundColor: colors.primary }
                                  : { backgroundColor: '#1C2B3C' },
                              ]}
                            >
                              {isSelected && <Ionicons name="checkmark" size={13} color="#003915" />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity
                        style={styles.addLinkedBankBtn}
                        onPress={handleOpenBankFromIncome}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                          Link Another Bank Account
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <View
                        style={[
                          styles.incomeBankCard,
                          { backgroundColor: '#122131', borderColor: colors.primary },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.bankIconBox, { backgroundColor: '#1C2B3C' }]}>
                            <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#D4E4FA' }}>
                                Primary Cash Vault (Offline)
                              </Text>
                              <View style={{ backgroundColor: 'rgba(75, 226, 119, 0.1)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>Default</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                              Local offline reserve cash flow
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.incomeBankRadio, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={13} color="#003915" />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.addLinkedBankBtn}
                        onPress={handleOpenBankFromIncome}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                          Add Bank Account to Link
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={{ gap: 8, marginTop: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={handleSaveIncomeDraft}
                    style={[
                      styles.primaryActionBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: draftIncomeSource.trim() && draftIncomeAmount.trim() ? 1 : 0.6,
                      },
                    ]}
                    disabled={!draftIncomeSource.trim() || !draftIncomeAmount.trim()}
                  >
                    <Text style={styles.primaryActionBtnText}>
                      {editingIncomeId ? 'Save Changes' : 'Save Income to Vault'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#003915" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCloseIncomeSheet}
                    style={styles.cancelSheetBtn}
                  >
                    <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* FREELANCE / OTHER TAB */
              <View style={{ paddingVertical: 6 }}>
                <View style={styles.freelanceNoticeCard}>
                  <View style={styles.freelanceIconBox}>
                    <Ionicons name="information-circle-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.freelanceNoticeTitle}>
                    You can enter the details after setting up the app
                  </Text>
                  <Text style={styles.freelanceNoticeDesc}>
                    Custom freelance & business streams can be tracked directly from the Ledger once initial vault configuration is complete.
                  </Text>
                </View>

                <View style={{ gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={handleCloseIncomeSheet}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="arrow-back" size={16} color="#003915" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>Close and Return to Overview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIncomeSheetTab('SALARY')}
                    style={styles.cancelSheetBtn}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Switch to Salary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(5, 20, 36, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28, 43, 60, 0.6)',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 8,
  },
  headerTopRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepperBarRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  stepperSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: '100%',
    width: '100%',
    alignSelf: 'center',
  },
  stepContainer: {
    width: '100%',
    gap: 16,
  },
  obsidianCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldHint: {
    fontSize: 11,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C2B3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 4,
  },
  smallGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  availableText: {
    fontSize: 11,
    fontWeight: '700',
  },
  atPrefix: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  tagChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  ruleChipText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  readonlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 4,
  },
  readonlyText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  readOnlyEmailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  avatarCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  avatarCardText: {
    fontSize: 11,
    fontWeight: '600',
  },
  securityBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  securityBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityBannerSub: {
    fontSize: 12,
  },
  bitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  bitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyStateCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  pulseIconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseCircleBack: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  pulseInnerBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPlusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003915',
  },
  heroStatCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroMetricSub: {
    fontSize: 12,
  },
  heroMetricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroMetricLimitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  heroMetricUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemCardObsidian: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  accountTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bankBalanceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  floorBufferBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  floorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dashedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 8,
  },
  dashedAddIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedAddText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  incomeTypeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  incomeTypeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guardrailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guardrailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardrailTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  guardrailSub: {
    fontSize: 12,
    marginTop: 1,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  minuteChip: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  minuteChipText: {
    fontSize: 12,
  },
  tagPillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagPillSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  tipBannerText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  pinIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  pinHeroSub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
    marginBottom: 16,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pinFeedbackText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    height: 18,
  },
  protocolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    gap: 8,
    marginVertical: 14,
  },
  protocolTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  protocolSub: {
    fontSize: 10,
  },
  localTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  localTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  keypadGrid: {
    width: '100%',
    gap: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadNumText: {
    fontSize: 20,
    fontWeight: '700',
  },
  vaultReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
  },
  vaultReadyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vaultReadyTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  vaultReadySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },
  bentoSpecCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  bentoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bentoDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 20, 36, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(28, 43, 60, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    zIndex: 50,
  },
  footerContainer: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  skipFooterBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipFooterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueFooterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  continueFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003915',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(1, 15, 31, 0.8)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#273647',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTwoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleTwoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  toggleTwoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelSheetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  incomeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#010F1F',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  incomeToggleTab: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  incomeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paydayGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  paydayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
  },
  paydayPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  incomeBankCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incomeBankRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLinkedBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1C2B3C',
    marginTop: 4,
  },
  freelanceNoticeCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#010F1F',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.25)',
    alignItems: 'center',
    marginVertical: 12,
  },
  freelanceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(75, 226, 119, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  freelanceNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D4E4FA',
    textAlign: 'center',
    marginBottom: 6,
  },
  freelanceNoticeDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  cardActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});
