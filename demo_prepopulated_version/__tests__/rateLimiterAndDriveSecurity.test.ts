import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  RateLimiter,
  RATE_LIMIT_CONSTANTS,
  RateLimitViolationError,
} from '../src/core/security/rateLimiter';
import { GoogleSheetsSyncEngine } from '../src/core/engines/googleSheetsEngine';
import { DEFAULT_SYNC_CONFIG } from '../src/core/types/sync';

describe('RateLimiter & Zero-Cost Security Engine Tests', () => {
  beforeEach(() => {
    RateLimiter.resetForTesting();
  });

  describe('Architectural Invariance & Immutability', () => {
    it('should freeze rate limit constants so they cannot be tampered at runtime', () => {
      expect(Object.isFrozen(RATE_LIMIT_CONSTANTS)).toBe(true);

      expect(() => {
        // @ts-expect-error Attempting mutation on readonly property
        RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR = 99999;
      }).toThrow();

      expect(RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR).toBe(6);
      expect(RATE_LIMIT_CONSTANTS.MIN_COOLDOWN_MS).toBe(60000);
      expect(RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY).toBe(24);
      expect(RATE_LIMIT_CONSTANTS.MAX_PAYLOAD_SIZE_BYTES).toBe(5 * 1024 * 1024);
      expect(RATE_LIMIT_CONSTANTS.MAX_TRANSACTIONS_PER_BATCH).toBe(10000);
    });

    it('should provide read-only copy via getConstants()', () => {
      const constants = RateLimiter.getConstants();
      expect(constants.MIN_COOLDOWN_MS).toBe(60000);
      expect(Object.isFrozen(constants)).toBe(true);
    });
  });

  describe('Cooldown & Sliding Window Enforcement', () => {
    it('should allow initial sync execution when idle', () => {
      const status = RateLimiter.checkRateLimit();
      expect(status.allowed).toBe(true);
      expect(status.remainingCooldownMs).toBe(0);
      expect(status.executionsInLastHour).toBe(0);
      expect(status.penaltyActive).toBe(false);
    });

    it('should strictly block immediate second sync within 60s cooldown window', () => {
      const baseTime = new Date('2026-10-08T12:00:00.000Z');

      // 1. Initial sync at 12:00:00
      RateLimiter.recordExecution(1024, 10, baseTime);

      // 2. Immediate check at 12:00:20 (20s later)
      const testTime20s = new Date('2026-10-08T12:00:20.000Z');
      const checkBlocked = RateLimiter.checkRateLimit(testTime20s);

      expect(checkBlocked.allowed).toBe(false);
      expect(checkBlocked.remainingCooldownMs).toBe(40000);
      expect(checkBlocked.retryAfterSeconds).toBe(40);
      expect(checkBlocked.reason).toContain('Sync cooldown in effect');

      // 3. assertAllowed should throw RateLimitViolationError
      expect(() => {
        RateLimiter.assertAllowed(1024, 10, testTime20s);
      }).toThrow(RateLimitViolationError);

      try {
        RateLimiter.assertAllowed(1024, 10, testTime20s);
      } catch (e: any) {
        expect(e).toBeInstanceOf(RateLimitViolationError);
        expect(e.code).toBe('RATE_LIMITED');
        expect(e.remainingSeconds).toBe(40);
      }
    });

    it('should permit sync once 60s cooldown expires', () => {
      const t0 = new Date('2026-10-08T12:00:00.000Z');
      RateLimiter.recordExecution(1024, 10, t0);

      // Check at 12:01:01 (61s later)
      const t61s = new Date('2026-10-08T12:01:01.000Z');
      const checkAllowed = RateLimiter.checkRateLimit(t61s);

      expect(checkAllowed.allowed).toBe(true);
      expect(checkAllowed.remainingCooldownMs).toBe(0);

      // Second sync should succeed
      expect(() => {
        RateLimiter.recordExecution(1024, 10, t61s);
      }).not.toThrow();

      const afterSecond = RateLimiter.checkRateLimit(t61s);
      expect(afterSecond.executionsInLastHour).toBe(2);
    });

    it('should strictly enforce hourly cap (max 6 syncs/hour)', () => {
      const baseEpoch = new Date('2026-10-08T10:00:00.000Z').getTime();

      // Perform 6 syncs spaced 70 seconds apart
      for (let i = 0; i < 6; i++) {
        const time = new Date(baseEpoch + i * 70000);
        RateLimiter.recordExecution(1024, 5, time);
      }

      // Check 7th attempt at minute 8 (within the 1-hour window)
      const attempt7Time = new Date(baseEpoch + 8 * 60000);
      const check7 = RateLimiter.checkRateLimit(attempt7Time);

      expect(check7.allowed).toBe(false);
      expect(check7.executionsInLastHour).toBe(6);
      expect(check7.reason).toContain('Hourly sync limit reached');

      expect(() => {
        RateLimiter.assertAllowed(1024, 5, attempt7Time);
      }).toThrow(/Hourly sync limit reached/);
    });

    it('should strictly enforce daily ceiling (max 24 syncs/day)', () => {
      const baseEpoch = new Date('2026-10-08T00:00:00.000Z').getTime();

      // Perform 24 syncs spaced 40 minutes apart across the day
      for (let i = 0; i < 24; i++) {
        const time = new Date(baseEpoch + i * 40 * 60000);
        RateLimiter.recordExecution(1024, 5, time);
      }

      // Check 25th attempt
      const attempt25Time = new Date(baseEpoch + 23 * 60 * 60000 + 50 * 60000);
      const check25 = RateLimiter.checkRateLimit(attempt25Time);

      expect(check25.allowed).toBe(false);
      expect(check25.executionsInLastDay).toBe(24);
      expect(check25.reason).toContain('Daily sync quota ceiling reached');
    });
  });

  describe('Payload & Batch Boundary Guards', () => {
    it('should reject payloads exceeding 5 MB limit', () => {
      const oversizedBytes = 6 * 1024 * 1024; // 6 MB
      expect(() => {
        RateLimiter.assertAllowed(oversizedBytes, 100);
      }).toThrow(/exceeds immutable ceiling of 5 MB/);

      try {
        RateLimiter.assertAllowed(oversizedBytes, 100);
      } catch (e: any) {
        expect(e.code).toBe('PAYLOAD_OVERSIZED');
      }
    });

    it('should reject transaction batches exceeding 10,000 items', () => {
      const oversizedBatch = 10001;
      expect(() => {
        RateLimiter.assertAllowed(1024, oversizedBatch);
      }).toThrow(/exceeds maximum batch limit of 10000/);

      try {
        RateLimiter.assertAllowed(1024, oversizedBatch);
      } catch (e: any) {
        expect(e.code).toBe('BATCH_OVERSIZED');
      }
    });
  });

  describe('Anti-Tamper & Defensive Security Locks', () => {
    it('should detect monotonic clock rollback and apply defensive penalty lockout', () => {
      const t1 = new Date('2026-10-08T15:00:00.000Z');
      RateLimiter.recordExecution(500, 2, t1);

      // Malicious user rolls back system clock by 1 hour to bypass cooldown
      const rolledBackTime = new Date('2026-10-08T14:00:00.000Z');
      const rollbackCheck = RateLimiter.checkRateLimit(rolledBackTime);

      expect(rollbackCheck.allowed).toBe(false);
      expect(rollbackCheck.penaltyActive).toBe(true);
      expect(rollbackCheck.reason).toContain('Storage tampering or clock rollback detected');

      // Assert throws with PENALTY_ACTIVE code
      expect(() => {
        RateLimiter.assertAllowed(500, 2, rolledBackTime);
      }).toThrow(/Storage tampering or clock rollback detected/);
    });

    it('should detect storage signature tampering and apply lockout penalty', () => {
      const t1 = new Date('2026-10-08T15:00:00.000Z');
      RateLimiter.recordExecution(500, 2, t1);

      // Attacker manually edits localStorage / stored JSON to erase timestamps
      const fakeTamperedState = JSON.stringify({
        executionTimestamps: [],
        lastExecutionMs: 0,
        penaltyUntilMs: null,
        tamperCount: 0,
        stateHash: 'attacker_forged_hash_12345',
      });

      RateLimiter.injectRawStateForTesting(fakeTamperedState);

      const check = RateLimiter.checkRateLimit(new Date('2026-10-08T15:01:00.000Z'));
      expect(check.allowed).toBe(false);
      expect(check.penaltyActive).toBe(true);
      expect(check.reason).toContain('Storage tampering or clock rollback detected');
    });
  });

  describe('GoogleSheetsSyncEngine Integration', () => {
    it('should enforce rate limits in GoogleSheetsSyncEngine.executeBatchSync', async () => {
      const payload = GoogleSheetsSyncEngine.buildBatchPayload([], [], [], [], 'Ledger');

      // First sync succeeds
      const result1 = await GoogleSheetsSyncEngine.executeBatchSync(payload, DEFAULT_SYNC_CONFIG);
      expect(result1.success).toBe(true);
      expect(result1.rateLimitStatus).toBeDefined();

      // Immediate second sync throws RateLimitViolationError
      await expect(
        GoogleSheetsSyncEngine.executeBatchSync(payload, DEFAULT_SYNC_CONFIG)
      ).rejects.toThrow(RateLimitViolationError);
    });

    it('should provide getRateLimitStatus query method on GoogleSheetsSyncEngine', () => {
      const status = GoogleSheetsSyncEngine.getRateLimitStatus();
      expect(status).toHaveProperty('allowed');
      expect(status).toHaveProperty('remainingCooldownMs');
      expect(status).toHaveProperty('maxPerHour', 6);
      expect(status).toHaveProperty('maxPerDay', 24);
    });
  });
});
