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
});
