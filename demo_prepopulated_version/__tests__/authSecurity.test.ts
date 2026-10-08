import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateSalt,
  hashPin,
  verifyPin,
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
} from '../src/core/security/cryptoVault';
import { DEFAULT_AUTH_CONFIG, AuthUser } from '../src/core/types/auth';

describe('Aegis Spendly Security & Cryptographic Vault', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  describe('Default Security Guardrails', () => {
    it('enforces 5-minute inactivity timeout and tab-blur auto-lock', () => {
      expect(DEFAULT_AUTH_CONFIG.inactivityTimeoutMinutes).toBe(5);
      expect(DEFAULT_AUTH_CONFIG.autoLockOnBlur).toBe(true);
      expect(DEFAULT_AUTH_CONFIG.requirePinOnOpen).toBe(true);
    });
  });

  describe('Salt Generation & PIN Cryptography', () => {
    it('generates random cryptographic salts', () => {
      const salt1 = generateSalt(16);
      const salt2 = generateSalt(16);
      expect(salt1.length).toBe(16);
      expect(salt2.length).toBe(16);
      expect(salt1).not.toBe(salt2);
    });

    it('hashes 4-digit PIN deterministically with given salt', async () => {
      const salt = 'random_salt_1234';
      const hash1 = await hashPin('4812', salt);
      const hash2 = await hashPin('4812', salt);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it('produces distinct hashes for different salts even with identical PIN', async () => {
      const hashA = await hashPin('1234', 'salt_alpha');
      const hashB = await hashPin('1234', 'salt_beta');
      expect(hashA).not.toBe(hashB);
    });

    it('correctly verifies valid PIN and rejects incorrect PINs', async () => {
      const salt = generateSalt();
      const realPin = '7890';
      const expectedHash = await hashPin(realPin, salt);

      const isValid = await verifyPin('7890', salt, expectedHash);
      expect(isValid).toBe(true);

      const isWrongPin = await verifyPin('0000', salt, expectedHash);
      expect(isWrongPin).toBe(false);

      const isBlank = await verifyPin('', salt, expectedHash);
      expect(isBlank).toBe(false);
    });
  });

  describe('Session Metadata Storage', () => {
    it('persists and clears auth session metadata safely', () => {
      const mockUser: AuthUser = {
        id: 'usr_test_1',
        name: 'Rajarshi Giri',
        email: 'rajarshi250500@gmail.com',
        pinSalt: 'mock_salt',
        pinHash: 'mock_hash_xyz',
      };

      saveAuthSession(mockUser);
      const loaded = loadAuthSession();
      expect(loaded).toEqual(mockUser);

      clearAuthSession();
      const afterClear = loadAuthSession();
      expect(afterClear).toBeNull();
    });
  });
});
