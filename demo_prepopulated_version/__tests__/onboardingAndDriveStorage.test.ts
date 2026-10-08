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

describe('Onboarding, Drive Storage & Auto-Lock Security Tests', () => {
  beforeEach(() => {
    clearUserProfile();
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
});

