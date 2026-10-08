import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceDataProvider, useFinanceData } from './src/presentation/hooks/useFinanceData';
import { ThemeProvider, useTheme } from './src/presentation/theme';
import { usePrivacyShield } from './src/core/security/privacyShield';
import { PrivacyOverlay } from './src/presentation/components/PrivacyOverlay';
import { SpendlySidebar, ActiveTabKey } from './src/presentation/components/SpendlySidebar';
import { SpendlyHeader } from './src/presentation/components/SpendlyHeader';
import { TabBar } from './src/presentation/components/TabBar';
import { OverviewScreen } from './src/features/overview/OverviewScreen';
import { TransactionsScreen } from './src/features/transactions/TransactionsScreen';
import { CreditCardsScreen } from './src/features/cards/CreditCardsScreen';
import { BanksScreen } from './src/features/banks/BanksScreen';
import { PlanAheadScreen } from './src/features/upcoming/PlanAheadScreen';
import { InvestmentsScreen } from './src/features/investments/InvestmentsScreen';
import { HistoryScreen } from './src/features/history/HistoryScreen';
import { AddEntryDrawer } from './src/presentation/components/drawers/AddEntryDrawer';
import { AddCardDrawer } from './src/presentation/components/drawers/AddCardDrawer';
import { AddBankDrawer } from './src/presentation/components/drawers/AddBankDrawer';
import { PlanAheadDrawer, PlanAheadTab } from './src/presentation/components/drawers/PlanAheadDrawer';
import { ProfileDrawer } from './src/presentation/components/drawers/ProfileDrawer';
import { SettingsDrawer } from './src/presentation/components/drawers/SettingsDrawer';
import { GoogleSyncModal } from './src/presentation/components/drawers/GoogleSyncModal';
import { EditAccountModal } from './src/features/accounts/forms/EditAccountModal';
import { Account } from './src/core/types/accounts';
import { AuthSecurityProvider, useAuthSecurity } from './src/presentation/hooks/useAuthSecurity';
import { AuthGateScreen } from './src/presentation/components/security/AuthGateScreen';
import { PinSetupScreen } from './src/presentation/components/security/PinSetupScreen';
import { LockScreen } from './src/presentation/components/security/LockScreen';
import { OnboardingScreen } from './src/presentation/components/onboarding/OnboardingScreen';

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTabKey>('OVERVIEW');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [isPlanAheadOpen, setIsPlanAheadOpen] = useState(false);
  const [planAheadTab, setPlanAheadTab] = useState<PlanAheadTab>('SUBSCRIPTION');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecurityUnlockedForSettings, setIsSecurityUnlockedForSettings] = useState(false);
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { themeName, colors } = useTheme();
  const {
    loading,
    error,
    accounts,
    transactions,
    deletedTransactions,
    userProfile,
    activeMonth,
    setActiveMonth,
    addTransaction,
    addAccount,
    editAccount,
    removeAccount,
    addObligation,
    addInvestment,
    addPlannedBudget,
    updateProfile,
  } = useFinanceData();

  const { isShieldActive } = usePrivacyShield();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading Spendly...</Text>
        <Text style={[styles.loadingSub, { color: colors.textMuted }]}>Initializing offline vault</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Database Initialization Failed</Text>
        <Text style={[styles.loadingSub, { color: colors.textMuted }]}>{error}</Text>
      </View>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return (
          <OverviewScreen
            onNavigateToTransactions={() => setActiveTab('TRANSACTIONS')}
            onNavigateToCards={() => setActiveTab('CREDIT_CARDS')}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
          />
        );
      case 'TRANSACTIONS':
        return <TransactionsScreen onOpenAddEntry={() => setIsAddEntryOpen(true)} />;
      case 'CREDIT_CARDS':
        return (
          <CreditCardsScreen
            onOpenAddCard={() => setIsAddCardOpen(true)}
            onEditCard={(card) => setEditingAccount(card)}
          />
        );
      case 'BANKS':
        return (
          <BanksScreen
            onOpenAddBank={() => setIsAddBankOpen(true)}
            onEditBank={(bank) => setEditingAccount(bank)}
          />
        );
      case 'PLAN_AHEAD':
        return (
          <PlanAheadScreen
            onOpenAddPlan={() => {
              setPlanAheadTab('SUBSCRIPTION');
              setIsPlanAheadOpen(true);
            }}
            onOpenAddBudget={() => {
              setPlanAheadTab('BUDGET');
              setIsPlanAheadOpen(true);
            }}
          />
        );
      case 'INVESTMENTS':
        return (
          <InvestmentsScreen
            onOpenPlanSip={() => {
              setPlanAheadTab('SIP');
              setIsPlanAheadOpen(true);
            }}
            onOpenRecordContribution={() => setIsAddEntryOpen(true)}
          />
        );
      case 'HISTORY':
        return <HistoryScreen />;
      default:
        return (
          <OverviewScreen
            onNavigateToTransactions={() => setActiveTab('TRANSACTIONS')}
            onNavigateToCards={() => setActiveTab('CREDIT_CARDS')}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
          />
        );
    }
  };

  return (
    <View style={[styles.appRoot, { backgroundColor: colors.background, paddingTop: isDesktop ? 0 : insets.top }]}>
      <StatusBar style={themeName === 'Night Ledger' ? 'light' : 'dark'} />

      {isDesktop ? (
        /* Desktop / Tablet Layout: Sidebar + Canvas */
        <View style={styles.desktopLayout}>
          <SpendlySidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            transactionCount={transactions.length}
            deletedCount={deletedTransactions.length}
          />

          <View style={styles.mainCanvas}>
            <SpendlyHeader
              activeTab={activeTab}
              profile={userProfile}
              activeMonth={activeMonth}
              onSelectMonth={setActiveMonth}
              onOpenAddEntry={() => setIsAddEntryOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenSettings={(unlocked) => {
                setIsSecurityUnlockedForSettings(!!unlocked);
                setIsSettingsOpen(true);
              }}
              onOpenSync={() => setIsGoogleSyncOpen(true)}
            />

            <View style={styles.screenArea}>{renderActiveScreen()}</View>
          </View>
        </View>
      ) : (
        /* Mobile Layout: Header + Screen + Bottom TabBar */
        <View style={styles.mobileLayout}>
          <SpendlyHeader
            activeTab={activeTab}
            profile={userProfile}
            activeMonth={activeMonth}
            onSelectMonth={setActiveMonth}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenSettings={(unlocked) => {
              setIsSecurityUnlockedForSettings(!!unlocked);
              setIsSettingsOpen(true);
            }}
            onOpenSync={() => setIsGoogleSyncOpen(true)}
          />

          <View style={styles.screenArea}>{renderActiveScreen()}</View>

          <TabBar
            currentTab={activeTab}
            onSelectTab={setActiveTab}
            deletedCount={deletedTransactions.length}
          />
        </View>
      )}

      {/* Slide-Over Drawers & Modals */}
      <AddEntryDrawer
        visible={isAddEntryOpen}
        accounts={accounts}
        onClose={() => setIsAddEntryOpen(false)}
        onSubmit={async (input) => {
          await addTransaction(input);
        }}
      />

      <AddCardDrawer
        visible={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onSubmit={async (input) => {
          await addAccount(input);
        }}
      />

      <AddBankDrawer
        visible={isAddBankOpen}
        onClose={() => setIsAddBankOpen(false)}
        onSubmit={async (input) => {
          await addAccount(input);
        }}
      />

      <PlanAheadDrawer
        visible={isPlanAheadOpen}
        defaultTab={planAheadTab}
        accounts={accounts}
        onClose={() => setIsPlanAheadOpen(false)}
        onSubmitObligation={async (input) => {
          await addObligation(input);
        }}
        onSubmitInvestment={async (input) => {
          await addInvestment(input);
        }}
        onSubmitBudget={(b) => {
          addPlannedBudget(b);
        }}
      />

      <ProfileDrawer
        visible={isProfileOpen}
        profile={userProfile}
        accounts={accounts}
        onClose={() => setIsProfileOpen(false)}
        onUpdateProfile={updateProfile}
        onOpenAddCard={() => {
          setIsProfileOpen(false);
          setIsAddCardOpen(true);
        }}
        onOpenAddBank={() => {
          setIsProfileOpen(false);
          setIsAddBankOpen(true);
        }}
        onEditAccount={(acc) => {
          setIsProfileOpen(false);
          setEditingAccount(acc);
        }}
      />

      <SettingsDrawer
        visible={isSettingsOpen}
        initialSecurityUnlocked={isSecurityUnlockedForSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
      <GoogleSyncModal visible={isGoogleSyncOpen} onClose={() => setIsGoogleSyncOpen(false)} />

      {editingAccount && (
        <EditAccountModal
          visible={true}
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={async (input) => {
            await editAccount(input);
            setEditingAccount(null);
          }}
          onDelete={async (id) => {
            await removeAccount(id);
            setEditingAccount(null);
          }}
          onOpenAddCard={() => {
            setIsAddCardOpen(true);
          }}
          onOpenAddBank={() => {
            setIsAddBankOpen(true);
          }}
        />
      )}

      {/* Multitasking Shield Curtain */}
      <PrivacyOverlay visible={isShieldActive} />
    </View>
  );
};

const SecurityGateNavigator: React.FC = () => {
  const { authStatus } = useAuthSecurity();

  if (authStatus === 'UNAUTHENTICATED') {
    return <AuthGateScreen />;
  }

  if (authStatus === 'PIN_SETUP') {
    return <PinSetupScreen />;
  }

  if (authStatus === 'ONBOARDING') {
    return <OnboardingScreen />;
  }

  if (authStatus === 'LOCKED') {
    return <LockScreen />;
  }

  return <MainNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthSecurityProvider>
          <FinanceDataProvider>
            <SecurityGateNavigator />
          </FinanceDataProvider>
        </AuthSecurityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainCanvas: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  mobileLayout: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  screenArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSub: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
