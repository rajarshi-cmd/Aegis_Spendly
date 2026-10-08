import { fallbackSha256 } from './cryptoVault';
import { RateLimitCheckResult } from '../types/sync';
import { kvStorage } from '../storage/kvStorage';

/**
 * IMMUTABLE RATE LIMITING ARCHITECTURAL CONSTANTS
 * 
 * These constants are architecturally frozen and cannot be modified by user settings,
 * client configs, or runtime overrides. They ensure zero-cost operation and protect
 * both developer and user Google Cloud quotas against runaway sync loops or malicious abuse.
 */
export const RATE_LIMIT_CONSTANTS = Object.freeze({
  /** Minimum interval required between consecutive sync operations (60 seconds) */
  MIN_COOLDOWN_MS: 60 * 1000,
  /** Maximum number of sync operations permitted within any rolling 60-minute window */
  MAX_SYNCS_PER_HOUR: 6,
  /** Maximum number of sync operations permitted within any rolling 24-hour window */
  MAX_SYNCS_PER_DAY: 24,
  /** Maximum transaction items permissible in a single sync batch */
  MAX_TRANSACTIONS_PER_BATCH: 10000,
  /** Maximum serialized JSON payload size (5 MB ceiling) */
  MAX_PAYLOAD_SIZE_BYTES: 5 * 1024 * 1024,
  /** Penalty cooldown enforced when clock rollback or storage tampering is detected (5 minutes) */
  PENALTY_COOLDOWN_MS: 5 * 60 * 1000,
  /** Isolated storage key */
  STORAGE_KEY: 'aegis_sync_rate_limiter_vault_v1',
  /** Internal cryptographic integrity salt */
  INTEGRITY_SALT: 'aegis_immutable_rate_limiter_salt_9921',
});

export class RateLimitViolationError extends Error {
  public readonly remainingSeconds: number;
  public readonly code: 'RATE_LIMITED' | 'PENALTY_ACTIVE' | 'PAYLOAD_OVERSIZED' | 'BATCH_OVERSIZED';

  constructor(
    message: string,
    remainingSeconds: number,
    code: 'RATE_LIMITED' | 'PENALTY_ACTIVE' | 'PAYLOAD_OVERSIZED' | 'BATCH_OVERSIZED' = 'RATE_LIMITED'
  ) {
    super(message);
    this.name = 'RateLimitViolationError';
    this.remainingSeconds = remainingSeconds;
    this.code = code;
  }
}

interface StoredRateLimiterState {
  executionTimestamps: number[];
  lastExecutionMs: number;
  penaltyUntilMs: number | null;
  tamperCount: number;
  stateHash: string;
}

let memoryStateStorage: string | null = null;

function computeSignature(
  timestamps: number[],
  lastMs: number,
  penaltyUntilMs: number | null,
  tamperCount: number
): string {
  const serialized = `${RATE_LIMIT_CONSTANTS.INTEGRITY_SALT}:${timestamps.join(',')}:${lastMs}:${penaltyUntilMs || 0}:${tamperCount}:${RATE_LIMIT_CONSTANTS.INTEGRITY_SALT}`;
  return fallbackSha256(serialized);
}

export class RateLimiter {
  /**
   * Returns immutable copy of the active rate limit constants.
   */
  public static getConstants(): Readonly<typeof RATE_LIMIT_CONSTANTS> {
    return RATE_LIMIT_CONSTANTS;
  }

  /**
   * Loads state, verifies cryptographic integrity, and checks for clock rollback attacks.
   */
  private static loadState(nowMs: number): StoredRateLimiterState {
    let raw: string | null = null;
    try {
      raw = kvStorage.getItem(RATE_LIMIT_CONSTANTS.STORAGE_KEY) || memoryStateStorage;
    } catch {
      raw = memoryStateStorage;
    }

    if (!raw) {
      const defaultState: StoredRateLimiterState = {
        executionTimestamps: [],
        lastExecutionMs: 0,
        penaltyUntilMs: null,
        tamperCount: 0,
        stateHash: '',
      };
      defaultState.stateHash = computeSignature([], 0, null, 0);
      return defaultState;
    }

    try {
      const parsed = JSON.parse(raw) as StoredRateLimiterState;
      const expectedHash = computeSignature(
        parsed.executionTimestamps || [],
        parsed.lastExecutionMs || 0,
        parsed.penaltyUntilMs,
        parsed.tamperCount || 0
      );

      // 1. Cryptographic Tamper Verification
      if (parsed.stateHash !== expectedHash) {
        console.warn('[RateLimiter] Cryptographic integrity signature mismatch. Storage tampering detected!');
        const penalized: StoredRateLimiterState = {
          executionTimestamps: [],
          lastExecutionMs: nowMs,
          penaltyUntilMs: nowMs + RATE_LIMIT_CONSTANTS.PENALTY_COOLDOWN_MS,
          tamperCount: (parsed.tamperCount || 0) + 1,
          stateHash: '',
        };
        penalized.stateHash = computeSignature(
          penalized.executionTimestamps,
          penalized.lastExecutionMs,
          penalized.penaltyUntilMs,
          penalized.tamperCount
        );
        this.saveState(penalized);
        return penalized;
      }

      // 2. Monotonic Clock Rollback Detection (Clock rewound > 5 seconds into past)
      if (parsed.lastExecutionMs > 0 && nowMs < parsed.lastExecutionMs - 5000) {
        console.warn('[RateLimiter] Monotonic clock regression detected (clock rollback attack). Applying lockout penalty.');
        const penalized: StoredRateLimiterState = {
          ...parsed,
          penaltyUntilMs: nowMs + RATE_LIMIT_CONSTANTS.PENALTY_COOLDOWN_MS,
          tamperCount: parsed.tamperCount + 1,
          lastExecutionMs: nowMs,
        };
        penalized.stateHash = computeSignature(
          penalized.executionTimestamps,
          penalized.lastExecutionMs,
          penalized.penaltyUntilMs,
          penalized.tamperCount
        );
        this.saveState(penalized);
        return penalized;
      }

      // Filter out executions older than 24 hours
      const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
      const validTimestamps = (parsed.executionTimestamps || []).filter((ts) => ts > oneDayAgo);

      return {
        ...parsed,
        executionTimestamps: validTimestamps,
      };
    } catch {
      // Malformed JSON tampering
      const penalized: StoredRateLimiterState = {
        executionTimestamps: [],
        lastExecutionMs: nowMs,
        penaltyUntilMs: nowMs + RATE_LIMIT_CONSTANTS.PENALTY_COOLDOWN_MS,
        tamperCount: 1,
        stateHash: '',
      };
      penalized.stateHash = computeSignature([], nowMs, penalized.penaltyUntilMs, 1);
      this.saveState(penalized);
      return penalized;
    }
  }

  private static saveState(state: StoredRateLimiterState): void {
    state.stateHash = computeSignature(
      state.executionTimestamps,
      state.lastExecutionMs,
      state.penaltyUntilMs,
      state.tamperCount
    );
    const serialized = JSON.stringify(state);
    try {
      kvStorage.setItem(RATE_LIMIT_CONSTANTS.STORAGE_KEY, serialized);
    } catch {
      memoryStateStorage = serialized;
    }
  }

  /**
   * Assesses current rate limiting status against immutable policies without mutating state.
   */
  public static checkRateLimit(now: Date = new Date()): RateLimitCheckResult {
    const nowMs = now.getTime();
    const state = this.loadState(nowMs);

    // Check penalty lock
    if (state.penaltyUntilMs && nowMs < state.penaltyUntilMs) {
      const remainingMs = state.penaltyUntilMs - nowMs;
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        allowed: false,
        remainingCooldownMs: remainingMs,
        executionsInLastHour: state.executionTimestamps.filter((ts) => ts > nowMs - 3600000).length,
        maxPerHour: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR,
        executionsInLastDay: state.executionTimestamps.length,
        maxPerDay: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY,
        penaltyActive: true,
        reason: `Security defense active: Storage tampering or clock rollback detected. Lockout active for ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
        nextAllowedTimestamp: new Date(state.penaltyUntilMs).toISOString(),
      };
    }

    // Check cooldown since last execution
    if (state.lastExecutionMs > 0) {
      const elapsedSinceLast = nowMs - state.lastExecutionMs;
      if (elapsedSinceLast < RATE_LIMIT_CONSTANTS.MIN_COOLDOWN_MS) {
        const remainingMs = RATE_LIMIT_CONSTANTS.MIN_COOLDOWN_MS - elapsedSinceLast;
        const remainingSec = Math.ceil(remainingMs / 1000);
        return {
          allowed: false,
          remainingCooldownMs: remainingMs,
          executionsInLastHour: state.executionTimestamps.filter((ts) => ts > nowMs - 3600000).length,
          maxPerHour: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR,
          executionsInLastDay: state.executionTimestamps.length,
          maxPerDay: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY,
          penaltyActive: false,
          reason: `Sync cooldown in effect. Please wait ${remainingSec}s between requests to protect quotas.`,
          retryAfterSeconds: remainingSec,
          nextAllowedTimestamp: new Date(state.lastExecutionMs + RATE_LIMIT_CONSTANTS.MIN_COOLDOWN_MS).toISOString(),
        };
      }
    }

    // Check 1-hour rolling window
    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const hourTimestamps = state.executionTimestamps.filter((ts) => ts > oneHourAgo);
    if (hourTimestamps.length >= RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR) {
      const oldestInHour = Math.min(...hourTimestamps);
      const remainingMs = oldestInHour + 60 * 60 * 1000 - nowMs;
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        allowed: false,
        remainingCooldownMs: Math.max(0, remainingMs),
        executionsInLastHour: hourTimestamps.length,
        maxPerHour: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR,
        executionsInLastDay: state.executionTimestamps.length,
        maxPerDay: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY,
        penaltyActive: false,
        reason: `Hourly sync limit reached (${RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR}/hr). Next sync available in ${Math.ceil(remainingSec / 60)} min.`,
        retryAfterSeconds: remainingSec,
        nextAllowedTimestamp: new Date(oldestInHour + 60 * 60 * 1000).toISOString(),
      };
    }

    // Check 24-hour rolling window
    if (state.executionTimestamps.length >= RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY) {
      const oldestInDay = Math.min(...state.executionTimestamps);
      const remainingMs = oldestInDay + 24 * 60 * 60 * 1000 - nowMs;
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        allowed: false,
        remainingCooldownMs: Math.max(0, remainingMs),
        executionsInLastHour: hourTimestamps.length,
        maxPerHour: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR,
        executionsInLastDay: state.executionTimestamps.length,
        maxPerDay: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY,
        penaltyActive: false,
        reason: `Daily sync quota ceiling reached (${RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY}/day). Next slot opens in ${Math.ceil(remainingSec / 3600)}h.`,
        retryAfterSeconds: remainingSec,
        nextAllowedTimestamp: new Date(oldestInDay + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    return {
      allowed: true,
      remainingCooldownMs: 0,
      executionsInLastHour: hourTimestamps.length,
      maxPerHour: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_HOUR,
      executionsInLastDay: state.executionTimestamps.length,
      maxPerDay: RATE_LIMIT_CONSTANTS.MAX_SYNCS_PER_DAY,
      penaltyActive: false,
    };
  }

  /**
   * Asserts whether a sync operation is allowed. Throws RateLimitViolationError if blocked.
   */
  public static assertAllowed(
    payloadSizeBytes?: number,
    transactionCount?: number,
    now: Date = new Date()
  ): void {
    // 1. Boundary Size Check
    if (payloadSizeBytes !== undefined && payloadSizeBytes > RATE_LIMIT_CONSTANTS.MAX_PAYLOAD_SIZE_BYTES) {
      throw new RateLimitViolationError(
        `Payload size (${(payloadSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds immutable ceiling of 5 MB.`,
        0,
        'PAYLOAD_OVERSIZED'
      );
    }

    // 2. Transaction Count Check
    if (transactionCount !== undefined && transactionCount > RATE_LIMIT_CONSTANTS.MAX_TRANSACTIONS_PER_BATCH) {
      throw new RateLimitViolationError(
        `Transaction count (${transactionCount}) exceeds maximum batch limit of ${RATE_LIMIT_CONSTANTS.MAX_TRANSACTIONS_PER_BATCH}.`,
        0,
        'BATCH_OVERSIZED'
      );
    }

    // 3. Temporal Rate Limits
    const check = this.checkRateLimit(now);
    if (!check.allowed) {
      throw new RateLimitViolationError(
        check.reason || 'Sync rate limit exceeded.',
        check.retryAfterSeconds || Math.ceil(check.remainingCooldownMs / 1000),
        check.penaltyActive ? 'PENALTY_ACTIVE' : 'RATE_LIMITED'
      );
    }
  }

  /**
   * Records a successfully executed sync operation and updates cryptographic rolling logs.
   */
  public static recordExecution(
    payloadSizeBytes?: number,
    transactionCount?: number,
    now: Date = new Date()
  ): void {
    this.assertAllowed(payloadSizeBytes, transactionCount, now);

    const nowMs = now.getTime();
    const state = this.loadState(nowMs);

    const updatedTimestamps = [...state.executionTimestamps, nowMs];
    const updatedState: StoredRateLimiterState = {
      executionTimestamps: updatedTimestamps,
      lastExecutionMs: nowMs,
      penaltyUntilMs: null,
      tamperCount: state.tamperCount,
      stateHash: '',
    };

    this.saveState(updatedState);
  }

  /**
   * Test-only utility to reset rate limiter storage.
   */
  public static resetForTesting(): void {
    try {
      kvStorage.removeItem(RATE_LIMIT_CONSTANTS.STORAGE_KEY);
    } catch {}
    memoryStateStorage = null;
  }

  /**
   * Test-only utility to inject corrupted or manipulated state to verify tamper detection.
   */
  public static injectRawStateForTesting(raw: string): void {
    try {
      kvStorage.setItem(RATE_LIMIT_CONSTANTS.STORAGE_KEY, raw);
    } catch {}
    memoryStateStorage = raw;
  }
}
