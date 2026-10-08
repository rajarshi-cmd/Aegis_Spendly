import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  saveUserProfile,
  loadUserProfile,
  clearUserProfile,
  UserProfile,
  DEFAULT_PROFILE,
} from '../src/core/types/profile';
import {
  saveSyncConfig,
  loadSyncConfig,
  SyncScheduleConfig,
  DEFAULT_SYNC_CONFIG,
} from '../src/core/types/sync';
import {
  saveSecurityConfig,
  loadSecurityConfig,
  AuthSecurityConfig,
  DEFAULT_AUTH_CONFIG,
} from '../src/core/types/auth';
import { GoogleSheetsSyncEngine } from '../src/core/engines/googleSheetsEngine';
import { RateLimiter } from '../src/core/security/rateLimiter';

describe('Onboarding, Drive Storage & Auto-Lock Security Tests', () => {
  beforeEach(() => {
    clearUserProfile();
    RateLimiter.resetForTesting();
  });

  describe('User Profile & Identity Persistence', () => {
    it('should correctly save and load user profile with custom username', () => {
      const customProfile: UserProfile = {
        name: 'Rajarshi Giri',
        username: 'rajarshi_cmd',
        handle: '@rajarshi_cmd',
        email: 'rajarshi250500@gmail.com',
        avatar: 'Star mage',
        salary_amount: 175000,
        salary_day: 1,
        salary_account_id: 'acc-hdfc',
        isOnboarded: true,
        driveFolderName: 'My Financial Ledgers',
      };

      saveUserProfile(customProfile);
      const loaded = loadUserProfile();

      expect(loaded).not.toBeNull();
      expect(loaded?.username).toBe('rajarshi_cmd');
      expect(loaded?.handle).toBe('@rajarshi_cmd');
      expect(loaded?.name).toBe('Rajarshi Giri');
      expect(loaded?.email).toBe('rajarshi250500@gmail.com');
      expect(loaded?.isOnboarded).toBe(true);
      expect(loaded?.driveFolderName).toBe('My Financial Ledgers');
    });

    it('should clear user profile on clearUserProfile', () => {
      saveUserProfile({ ...DEFAULT_PROFILE, username: 'testuser' });
      clearUserProfile();
      expect(loadUserProfile()).toBeNull();
    });
  });

  describe('Google Drive Folder & Sync Config Persistence', () => {
    it('should persist target Drive folder name', () => {
      const config: SyncScheduleConfig = {
        ...DEFAULT_SYNC_CONFIG,
        driveFolderName: 'Aegis Spendly 2026',
        cadence: 'WEEKLY',
      };

      saveSyncConfig(config);
      const loaded = loadSyncConfig();

      expect(loaded).not.toBeNull();
      expect(loaded?.driveFolderName).toBe('Aegis Spendly 2026');
      expect(loaded?.cadence).toBe('WEEKLY');
    });

    it('should include target driveFolderName in sync execution output', async () => {
      const payload = GoogleSheetsSyncEngine.buildBatchPayload(
        [],
        [],
        [],
        [],
        'Test Ledger'
      );

      const customConfig: SyncScheduleConfig = {
        ...DEFAULT_SYNC_CONFIG,
        driveFolderName: 'Private Accounts Vault',
      };

      const result = await GoogleSheetsSyncEngine.executeBatchSync(payload, customConfig);
      expect(result.success).toBe(true);
      expect(result.driveFolderName).toBe('Private Accounts Vault');
    });
  });

  describe('Auto-Lock Security Configuration & Presets', () => {
    it('should save and load customized auto-lock policies', () => {
      const relaxedConfig: AuthSecurityConfig = {
        autoLockOnBlur: false,
        inactivityTimeoutMinutes: 15,
        requirePinOnOpen: true,
        lockPreset: 'RELAXED',
      };

      saveSecurityConfig(relaxedConfig);
      const loaded = loadSecurityConfig();

      expect(loaded).not.toBeNull();
      expect(loaded?.autoLockOnBlur).toBe(false);
      expect(loaded?.inactivityTimeoutMinutes).toBe(15);
      expect(loaded?.lockPreset).toBe('RELAXED');
    });

    it('should support paranoid 1-minute auto-lock preset', () => {
      const paranoidConfig: AuthSecurityConfig = {
        autoLockOnBlur: true,
        inactivityTimeoutMinutes: 1,
        requirePinOnOpen: true,
        lockPreset: 'HIGH',
      };

      saveSecurityConfig(paranoidConfig);
      const loaded = loadSecurityConfig();

      expect(loaded?.autoLockOnBlur).toBe(true);
      expect(loaded?.inactivityTimeoutMinutes).toBe(1);
      expect(loaded?.lockPreset).toBe('HIGH');
    });
  });

  describe('Clean Vault Initialization & Demo Backup Isolation', () => {
    it('should completely wipe placeholders when purgeSeedDataAndInitializeUserVault runs', async () => {
      const { MemoryDatabaseAdapter } = await import('../src/core/database/memoryDb');
      const { seedIfEmpty } = await import('../src/core/database/seeder');
      const { purgeSeedDataAndInitializeUserVault, getAllAccounts, getAllTransactions } = await import(
        '../src/core/database/queries'
      );

      const db = new MemoryDatabaseAdapter();
      // First seed demo placeholder data
      await seedIfEmpty(db);

      const accountsBefore = await getAllAccounts(db);
      const txsBefore = await getAllTransactions(db);
      expect(accountsBefore.length).toBeGreaterThan(0);
      expect(txsBefore.length).toBeGreaterThan(0);

      // Now simulate user onboarding finishing with 1 bank and 1 card
      await purgeSeedDataAndInitializeUserVault(
        db,
        [{ name: 'My Private Salary Account', balance: 50000, minimum_balance: 10000 }],
        [
          {
            name: 'Primary Travel Card',
            balance: 0,
            limit: 200000,
            cutDay: 15,
            dueDay: 5,
            color: 'EMERALD',
            keepTrackRatio: 40,
          },
        ]
      );

      const accountsAfter = await getAllAccounts(db);
      const txsAfter = await getAllTransactions(db);

      expect(accountsAfter.length).toBe(2);
      expect(accountsAfter.find((a) => a.name === 'My Private Salary Account')).toBeDefined();
      expect(accountsAfter.find((a) => a.name === 'Primary Travel Card')).toBeDefined();
      // Only the initial opening balance for the bank account should exist, zero placeholder txs
      expect(txsAfter.length).toBe(1);
      expect(txsAfter[0].description).toBe('Initial Account Balance');
    });

    it('should verify demo backup dataset is safely preserved in demo_seed_backup folder', async () => {
      const { seedDemoDataset } = await import('../demo_seed_backup/seeder.backup');
      const { MemoryDatabaseAdapter } = await import('../src/core/database/memoryDb');
      const { getAllAccounts } = await import('../src/core/database/queries');

      const testDb = new MemoryDatabaseAdapter();
      const seeded = await seedDemoDataset(testDb);
      expect(seeded).toBe(true);

      const accounts = await getAllAccounts(testDb);
      expect(accounts.length).toBe(6);
    });
  });

  describe('Multi-Account Onboarding & Account Visibility Workflows', () => {
    it('initializes multiple banks and credit cards with correct types, balances, and visibility in getAllAccounts, bankAccounts, and creditCards', async () => {
      const { MemoryDatabaseAdapter } = await import('../src/core/database/memoryDb');
      const { seedIfEmpty } = await import('../src/core/database/seeder');
      const { purgeSeedDataAndInitializeUserVault, getAllAccounts, getAllTransactions } = await import(
        '../src/core/database/queries'
      );

      const db = new MemoryDatabaseAdapter();
      await seedIfEmpty(db);

      // Onboarding with multiple banks and multiple cards
      const userBanks = [
        { name: 'HDFC Salary Bank', balance: 75000, minimum_balance: 10000 },
        { name: 'SBI Emergency Savings', balance: 35000, minimum_balance: 5000 },
      ];
      const userCards = [
        {
          name: 'Amazon ICICI Card',
          balance: 14000,
          limit: 150000,
          cutDay: 15,
          dueDay: 5,
          color: 'EMERALD' as const,
          keepTrackRatio: 40,
        },
        {
          name: 'Axis Bank Coral',
          balance: 0,
          limit: 80000,
          cutDay: 20,
          dueDay: 10,
          color: 'PURPLE' as const,
          keepTrackRatio: 30,
        },
      ];

      await purgeSeedDataAndInitializeUserVault(db, userBanks, userCards);

      // 1. Verify getAllAccounts returns all 4 accounts
      const allAccounts = await getAllAccounts(db);
      expect(allAccounts.length).toBe(4);

      // 2. Verify account types and separation into bankAccounts and creditCards
      const bankAccounts = allAccounts.filter((a) => a.type === 'BANK_DEPOSIT');
      const creditCards = allAccounts.filter((a) => a.type === 'CREDIT_CARD');

      expect(bankAccounts.length).toBe(2);
      expect(creditCards.length).toBe(2);

      // Verify BANK_DEPOSIT properties
      const hdfc = bankAccounts.find((b) => b.name === 'HDFC Salary Bank');
      expect(hdfc).toBeDefined();
      expect(hdfc?.type).toBe('BANK_DEPOSIT');
      expect(hdfc?.balance).toBe(75000);
      expect(hdfc?.minimum_balance).toBe(10000);

      const sbi = bankAccounts.find((b) => b.name === 'SBI Emergency Savings');
      expect(sbi).toBeDefined();
      expect(sbi?.type).toBe('BANK_DEPOSIT');
      expect(sbi?.balance).toBe(35000);
      expect(sbi?.minimum_balance).toBe(5000);

      // Verify CREDIT_CARD properties
      const amazonCard = creditCards.find((c) => c.name === 'Amazon ICICI Card');
      expect(amazonCard).toBeDefined();
      expect(amazonCard?.type).toBe('CREDIT_CARD');
      expect(amazonCard?.balance).toBe(14000);
      expect(amazonCard?.credit_limit).toBe(150000);
      expect(amazonCard?.billing_cycle_cut_day).toBe(15);
      expect(amazonCard?.payment_due_day).toBe(5);
      expect(amazonCard?.card_color).toBe('EMERALD');
      expect(amazonCard?.keep_track_ratio).toBe(40);
      expect(amazonCard?.last4).toBeDefined();

      const axisCard = creditCards.find((c) => c.name === 'Axis Bank Coral');
      expect(axisCard).toBeDefined();
      expect(axisCard?.type).toBe('CREDIT_CARD');
      expect(axisCard?.balance).toBe(0);
      expect(axisCard?.credit_limit).toBe(80000);
      expect(axisCard?.billing_cycle_cut_day).toBe(20);
      expect(axisCard?.payment_due_day).toBe(10);
      expect(axisCard?.card_color).toBe('PURPLE');
      expect(axisCard?.keep_track_ratio).toBe(30);

      // 3. Verify opening balance transactions
      const txs = await getAllTransactions(db);
      // 2 banks with balance > 0 (INFLOW) + 1 card with balance > 0 (OUTFLOW) = 3 opening balance txs
      // Card with 0 balance must NOT generate a redundant transaction
      expect(txs.length).toBe(3);

      const hdfcTx = txs.find((t) => t.account_id === hdfc?.id);
      expect(hdfcTx).toBeDefined();
      expect(hdfcTx?.type).toBe('INFLOW');
      expect(hdfcTx?.amount).toBe(75000);
      expect(hdfcTx?.category).toBe('Opening Balance');
      expect(hdfcTx?.description).toBe('Initial Account Balance');
      expect(hdfcTx?.is_reconciled).toBe(true);

      const sbiTx = txs.find((t) => t.account_id === sbi?.id);
      expect(sbiTx).toBeDefined();
      expect(sbiTx?.type).toBe('INFLOW');
      expect(sbiTx?.amount).toBe(35000);
      expect(sbiTx?.category).toBe('Opening Balance');
      expect(sbiTx?.description).toBe('Initial Account Balance');
      expect(sbiTx?.is_reconciled).toBe(true);

      const cardTx = txs.find((t) => t.account_id === amazonCard?.id);
      expect(cardTx).toBeDefined();
      expect(cardTx?.type).toBe('OUTFLOW');
      expect(cardTx?.amount).toBe(14000);
      expect(cardTx?.category).toBe('Opening Balance');
      expect(cardTx?.description).toBe('Opening Card Balance');
      expect(cardTx?.is_reconciled).toBe(true);

      const zeroCardTx = txs.find((t) => t.account_id === axisCard?.id);
      expect(zeroCardTx).toBeUndefined();
    });

    it('executes full post-onboarding lifecycle: adding transactions, updating balances, debt settlement, and SIP execution', async () => {
      const { MemoryDatabaseAdapter } = await import('../src/core/database/memoryDb');
      const { purgeSeedDataAndInitializeUserVault, getAllAccounts, getAccountById } = await import(
        '../src/core/database/queries'
      );
      const { AccountingEngine } = await import('../src/core/engines/accountingEngine');
      const { DebtEngine } = await import('../src/core/engines/debtEngine');
      const { InvestmentEngine } = await import('../src/core/engines/investmentEngine');
      const { createInvestment } = await import('../src/core/database/queries');

      const db = new MemoryDatabaseAdapter();
      await purgeSeedDataAndInitializeUserVault(
        db,
        [
          { name: 'Primary Salary Bank', balance: 100000, minimum_balance: 10000 },
          { name: 'Secondary Savings', balance: 50000, minimum_balance: 5000 },
        ],
        [
          {
            name: 'Shopping Credit Card',
            balance: 5000,
            limit: 100000,
            cutDay: 15,
            dueDay: 5,
            color: 'EMERALD' as const,
            keepTrackRatio: 40,
          },
        ]
      );

      const accounts = await getAllAccounts(db);
      const primaryBank = accounts.find((a) => a.name === 'Primary Salary Bank')!;
      const secondaryBank = accounts.find((a) => a.name === 'Secondary Savings')!;
      const creditCard = accounts.find((a) => a.name === 'Shopping Credit Card')!;

      // 1. Add Outflow Expense to Primary Bank & verify balance decrement
      const expenseTx = await AccountingEngine.ingestTransaction(db, {
        account_id: primaryBank.id,
        type: 'OUTFLOW',
        amount: 2500,
        category: 'Groceries',
        description: 'Supermarket purchase',
      });
      expect(expenseTx.id).toBeDefined();
      const updatedPrimary = await getAccountById(db, primaryBank.id);
      expect(updatedPrimary?.balance).toBe(97500); // 100000 - 2500

      // 2. Add Transfer from Primary Bank to Credit Card (Repayment)
      const transferTx = await AccountingEngine.ingestTransaction(db, {
        account_id: primaryBank.id,
        type: 'TRANSFER',
        amount: 3000,
        category: 'Card Payment',
        destination_account_id: creditCard.id,
      });
      expect(transferTx.type).toBe('TRANSFER');
      const bankAfterTransfer = await getAccountById(db, primaryBank.id);
      const cardAfterTransfer = await getAccountById(db, creditCard.id);
      expect(bankAfterTransfer?.balance).toBe(94500); // 97500 - 3000
      expect(cardAfterTransfer?.balance).toBe(2000); // 5000 debt - 3000 repayment

      // 3. Bilateral Debt: Lend money from Primary Bank, then process repayment
      const dueDate = new Date('2026-11-01T00:00:00Z').toISOString();
      const debt = await DebtEngine.createDebt(db, {
        counterparty: 'David Miller',
        direction: 'LENT',
        principal_amount: 4500,
        settlement_account_id: primaryBank.id,
        due_date: dueDate,
        notes: 'Personal bridge loan',
      });
      expect(debt.outstanding_balance).toBe(4500);
      const bankAfterLoan = await getAccountById(db, primaryBank.id);
      expect(bankAfterLoan?.balance).toBe(90000); // 94500 - 4500

      // Full debt repayment settlement
      const settlementResult = await DebtEngine.processRepayment(db, {
        debt_id: debt.id,
        amount: 4500,
        notes: 'Full recovery',
      });
      expect(settlementResult.debt.status).toBe('SETTLED');
      expect(settlementResult.debt.outstanding_balance).toBe(0);
      const bankAfterSettlement = await getAccountById(db, primaryBank.id);
      expect(bankAfterSettlement?.balance).toBe(94500); // 90000 + 4500 restored

      // 4. SIP Setup and Execution from Secondary Savings
      const sip = await createInvestment(db, {
        name: 'Nifty 50 Index Fund',
        type: 'SIP',
        monthly_sip_amount: 10000,
        sip_due_day: 10,
        linked_account_id: secondaryBank.id,
        invested_amount: 50000,
        current_value: 55000,
      });
      expect(sip.id).toBeDefined();

      const sipExecution = await InvestmentEngine.executeSip(db, sip.id);
      expect(sipExecution.investment.invested_amount).toBe(60000); // 50000 + 10000
      expect(sipExecution.investment.current_value).toBe(65000); // 55000 + 10000
      expect(sipExecution.investment.last_sip_date).toBeDefined();

      const secondaryBankAfterSip = await getAccountById(db, secondaryBank.id);
      expect(secondaryBankAfterSip?.balance).toBe(40000); // 50000 - 10000
      expect(sipExecution.transaction?.amount).toBe(10000);
      expect(sipExecution.transaction?.category).toBe('Investment (Asset)');
    });
  });

  describe('Profile Sign Out & Security Session Purge', () => {
    it('purges auth session and transitions user identity state on sign out', async () => {
      const {
        saveAuthSession,
        loadAuthSession,
        clearAuthSession,
        generateSalt,
        hashPin,
      } = await import('../src/core/security/cryptoVault');

      const salt = generateSalt();
      const hash = await hashPin('9876', salt);
      const activeUser = {
        id: 'usr-vault-rajarshi',
        name: 'Rajarshi Giri',
        email: 'rajarshi250500@gmail.com',
        username: 'rajarshi_cmd',
        isOnboarded: true,
        pinSalt: salt,
        pinHash: hash,
      };

      // 1. Establish session
      saveAuthSession(activeUser);
      expect(loadAuthSession()).toEqual(activeUser);

      // 2. Perform sign out
      clearAuthSession();
      expect(loadAuthSession()).toBeNull();

      // 3. User profile data can also be cleared or reloaded cleanly
      clearUserProfile();
      expect(loadUserProfile()).toBeNull();
    });
  });
});

