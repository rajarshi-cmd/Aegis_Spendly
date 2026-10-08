import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateUsername,
  validateBankName,
  parseBalanceInput,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validateCalendarDay,
  clampCalendarDay,
  validateKeepTrackRatio,
  validateRepaymentAmount,
  validatePin,
} from '../src/core/utils/validators';
import { formatRupee, formatCompactRupee } from '../src/core/utils/currency';
import {
  safeFormatDate,
  safeFormatTime,
  parseMonthYear,
  isDateInMonth,
  calculateTenureLeft,
} from '../src/core/utils/date';
import {
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
  hashPin,
  verifyPin,
  generateSalt,
} from '../src/core/security/cryptoVault';
import { AuthUser } from '../src/core/types/auth';
import { CreditMonitor } from '../src/core/engines/creditMonitor';

describe('UI/UX Data Validation & UI Boundary Test Suite', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  // =========================================================================
  // 1. Onboarding Form Inputs & Validators
  // =========================================================================
  describe('1. Onboarding Form Inputs & Validators', () => {
    describe('Username regex & length validation', () => {
      it('rejects empty or whitespace-only usernames', () => {
        expect(validateUsername('').isValid).toBe(false);
        expect(validateUsername('   ').isValid).toBe(false);
        expect(validateUsername('').error).toBe('Username cannot be empty.');
      });

      it('rejects usernames shorter than 3 characters', () => {
        const short1 = validateUsername('a');
        expect(short1.isValid).toBe(false);
        expect(short1.error).toContain('at least 3 characters');

        const short2 = validateUsername('rg');
        expect(short2.isValid).toBe(false);
        expect(short2.error).toContain('at least 3 characters');
      });

      it('rejects usernames longer than 30 characters', () => {
        const longName = 'a'.repeat(31);
        const res = validateUsername(longName);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('cannot exceed 30 characters');
      });

      it('automatically trims and strips leading @ character', () => {
        const res = validateUsername('  @rajarshi_giri  ');
        expect(res.isValid).toBe(true);
        expect(res.value).toBe('rajarshi_giri');
      });

      it('enforces regex: letters, numbers and underscores only (rejects spaces, hyphens, symbols)', () => {
        expect(validateUsername('john doe').isValid).toBe(false);
        expect(validateUsername('john doe').error).toContain('Letters, numbers and underscores only');

        expect(validateUsername('john-doe').isValid).toBe(false);
        expect(validateUsername('user!name').isValid).toBe(false);
        expect(validateUsername('user@domain').isValid).toBe(false);
        expect(validateUsername('user#123').isValid).toBe(false);
        expect(validateUsername('user$money').isValid).toBe(false);
      });

      it('accepts valid usernames with alphanumeric characters and underscores', () => {
        expect(validateUsername('rajarshi').isValid).toBe(true);
        expect(validateUsername('rajarshi_25').isValid).toBe(true);
        expect(validateUsername('vault_admin_2026').isValid).toBe(true);
        expect(validateUsername('abc').isValid).toBe(true);
      });
    });

    describe('Bank names validation', () => {
      it('rejects empty or whitespace bank names', () => {
        expect(validateBankName('').isValid).toBe(false);
        expect(validateBankName('   ').isValid).toBe(false);
        expect(validateBankName('').error).toContain('cannot be empty');
      });

      it('accepts valid bank and wallet names, trimming whitespace', () => {
        const res = validateBankName('  HDFC Salary Account  ');
        expect(res.isValid).toBe(true);
        expect(res.value).toBe('HDFC Salary Account');
      });

      it('rejects bank names exceeding maximum character length', () => {
        const overLimit = 'A'.repeat(65);
        expect(validateBankName(overLimit).isValid).toBe(false);
        expect(validateBankName(overLimit).error).toContain('cannot exceed 60 characters');
      });
    });

    describe('Non-numeric stripping for balance inputs', () => {
      it('strips currency symbols and comma separators from inputs', () => {
        expect(parseBalanceInput('₹50,000')).toBe(50000);
        expect(parseBalanceInput('₹1,48,000.50')).toBe(148000.5);
        expect(parseBalanceInput('$1,000.75')).toBe(1000.75);
      });

      it('handles empty strings and letters gracefully with fallback', () => {
        expect(parseBalanceInput('')).toBe(0);
        expect(parseBalanceInput('   ')).toBe(0);
        expect(parseBalanceInput('abc', 100)).toBe(100);
      });

      it('safely handles zero balances', () => {
        expect(parseBalanceInput('0')).toBe(0);
        expect(parseBalanceInput('0.00')).toBe(0);
        expect(parseBalanceInput(0)).toBe(0);
      });

      it('strips minus signs from deposit balance entry', () => {
        expect(parseBalanceInput('-5000')).toBe(5000);
      });

      it('handles malformed inputs with multiple decimal points', () => {
        expect(parseBalanceInput('100.50.25')).toBe(100.5025);
      });
    });

    describe('Keep-track slider (0% to 100%)', () => {
      it('preserves exact boundary values at 0% and 100%', () => {
        expect(validateKeepTrackRatio(0)).toBe(0);
        expect(validateKeepTrackRatio(100)).toBe(100);
      });

      it('clamps negative values to 0%', () => {
        expect(validateKeepTrackRatio(-15)).toBe(0);
        expect(validateKeepTrackRatio(-1)).toBe(0);
      });

      it('clamps values above 100% to 100%', () => {
        expect(validateKeepTrackRatio(105)).toBe(100);
        expect(validateKeepTrackRatio(200)).toBe(100);
      });

      it('rounds intermediate decimal percentages properly', () => {
        expect(validateKeepTrackRatio(49.6)).toBe(50);
        expect(validateKeepTrackRatio(30.2)).toBe(30);
      });

      it('falls back safely to 50% on NaN or invalid strings', () => {
        expect(validateKeepTrackRatio('invalid' as any)).toBe(50);
        expect(validateKeepTrackRatio(NaN)).toBe(50);
      });

      it('works with CreditMonitor status tiers across full 0% to 100% spectrum', () => {
        // At 0% target ratio
        expect(CreditMonitor.evaluateStatusTier(0, 0)).toBe('CAUTION');
        expect(CreditMonitor.evaluateStatusTier(5, 0)).toBe('ALERT');

        // At 60% target ratio (half=30%)
        expect(CreditMonitor.evaluateStatusTier(25, 60)).toBe('OPTIMAL');
        expect(CreditMonitor.evaluateStatusTier(30, 60)).toBe('CAUTION');
        expect(CreditMonitor.evaluateStatusTier(59, 60)).toBe('CAUTION');
        expect(CreditMonitor.evaluateStatusTier(61, 60)).toBe('ALERT');

        // At 100% target ratio (half=50%)
        expect(CreditMonitor.evaluateStatusTier(45, 100)).toBe('OPTIMAL');
        expect(CreditMonitor.evaluateStatusTier(75, 100)).toBe('CAUTION');
        expect(CreditMonitor.evaluateStatusTier(101, 100)).toBe('ALERT');
      });
    });

    describe('Cutoff and due day calendar validation (1 - 31)', () => {
      it('accepts boundary calendar days 1 and 31', () => {
        const day1 = validateCalendarDay(1);
        expect(day1.isValid).toBe(true);
        expect(day1.value).toBe(1);

        const day31 = validateCalendarDay(31);
        expect(day31.isValid).toBe(true);
        expect(day31.value).toBe(31);

        const str15 = validateCalendarDay('15');
        expect(str15.isValid).toBe(true);
        expect(str15.value).toBe(15);
      });

      it('rejects days below 1 (0 and negative numbers)', () => {
        const day0 = validateCalendarDay(0);
        expect(day0.isValid).toBe(false);
        expect(day0.error).toContain('between 1 and 31');

        const dayNeg = validateCalendarDay(-5);
        expect(dayNeg.isValid).toBe(false);
        expect(dayNeg.error).toContain('between 1 and 31');
      });

      it('rejects days above 31', () => {
        const day32 = validateCalendarDay(32);
        expect(day32.isValid).toBe(false);
        expect(day32.error).toContain('between 1 and 31');

        const day99 = validateCalendarDay('99');
        expect(day99.isValid).toBe(false);
        expect(day99.error).toContain('between 1 and 31');
      });

      it('rejects non-numeric inputs', () => {
        const invalidStr = validateCalendarDay('twenty');
        expect(invalidStr.isValid).toBe(false);
        expect(invalidStr.error).toBeDefined();
      });

      it('clamps calendar days strictly within [1, 31]', () => {
        expect(clampCalendarDay(0, 15)).toBe(1);
        expect(clampCalendarDay(-10, 15)).toBe(1);
        expect(clampCalendarDay(32, 15)).toBe(31);
        expect(clampCalendarDay(100, 15)).toBe(31);
        expect(clampCalendarDay(18, 15)).toBe(18);
        expect(clampCalendarDay('bad', 15)).toBe(15);
      });
    });
  });

  // =========================================================================
  // 2. Sign Out button in ProfileDrawer & Session Cleanup
  // =========================================================================
  describe('2. Sign Out button & Session Cleanup', () => {
    it('clears persistent auth session on sign out', () => {
      const activeUser: AuthUser = {
        id: 'usr_active_99',
        name: 'Rajarshi Giri',
        email: 'rajarshi250500@gmail.com',
        username: 'rajarshi',
        pinHash: 'test_hash',
        pinSalt: 'test_salt',
        isOnboarded: true,
      };

      saveAuthSession(activeUser);
      expect(loadAuthSession()).not.toBeNull();
      expect(loadAuthSession()?.id).toBe('usr_active_99');

      // Execute sign out / session wipe
      clearAuthSession();

      expect(loadAuthSession()).toBeNull();
    });

    it('cleans up user identity completely so new session cannot access previous data', () => {
      saveAuthSession({
        id: 'user_1',
        name: 'User One',
        email: 'one@example.com',
      });
      clearAuthSession();

      const freshLoaded = loadAuthSession();
      expect(freshLoaded).toBeNull();
    });
  });

  // =========================================================================
  // 3. PIN Verification Modal
  // =========================================================================
  describe('3. PIN Verification Modal Logic & Boundary Testing', () => {
    it('validates 4-digit input limit and rejects pins not exactly 4 digits', () => {
      expect(validatePin('1234').isValid).toBe(true);
      expect(validatePin('0000').isValid).toBe(true);
      expect(validatePin('9999').isValid).toBe(true);

      // Sub-4 digits
      expect(validatePin('123').isValid).toBe(false);
      expect(validatePin('1').isValid).toBe(false);
      expect(validatePin('').isValid).toBe(false);

      // Over-4 digits
      expect(validatePin('12345').isValid).toBe(false);

      // Non-numeric
      expect(validatePin('12ab').isValid).toBe(false);
      expect(validatePin('abcd').isValid).toBe(false);
      expect(validatePin('12 4').isValid).toBe(false);
    });

    it('rejects incorrect PIN and verifies correct PIN with salt and hash', async () => {
      const salt = generateSalt(16);
      const correctPin = '4321';
      const expectedHash = await hashPin(correctPin, salt);

      // Correct PIN verification succeeds
      const isCorrect = await verifyPin('4321', salt, expectedHash);
      expect(isCorrect).toBe(true);

      // Incorrect PIN verification fails
      const isWrong = await verifyPin('1111', salt, expectedHash);
      expect(isWrong).toBe(false);

      // Partial or blank input fails
      expect(await verifyPin('', salt, expectedHash)).toBe(false);
      expect(await verifyPin('432', salt, expectedHash)).toBe(false);
    });

    it('simulates 4-digit accumulation, clear, and backspace transitions', () => {
      let pin = '';
      const handleDigit = (d: string) => {
        if (pin.length < 4) pin += d;
      };
      const handleBackspace = () => {
        pin = pin.slice(0, -1);
      };
      const handleClear = () => {
        pin = '';
      };

      handleDigit('1');
      handleDigit('2');
      expect(pin).toBe('12');

      handleDigit('3');
      handleDigit('4');
      expect(pin).toBe('1234');

      // 5th digit rejected by length boundary
      handleDigit('5');
      expect(pin).toBe('1234');

      handleBackspace();
      expect(pin).toBe('123');

      handleClear();
      expect(pin).toBe('');
    });
  });

  // =========================================================================
  // 4. Currency and Date Formatting Helpers
  // =========================================================================
  describe('4. Currency & Date Formatting Helpers', () => {
    describe('formatRupee', () => {
      it('formats standard positive numbers with Indian grouping', () => {
        expect(formatRupee(129400)).toBe('₹1,29,400');
        expect(formatRupee(50000)).toBe('₹50,000');
        expect(formatRupee(10000000)).toBe('₹1,00,00,000');
      });

      it('handles zero balances properly', () => {
        expect(formatRupee(0)).toBe('₹0');
        expect(formatRupee(-0)).toBe('₹0');
      });

      it('formats negative amounts with minus sign before rupee symbol', () => {
        expect(formatRupee(-480)).toBe('-₹480');
        expect(formatRupee(-148000)).toBe('-₹1,48,000');
      });

      it('supports decimal amounts', () => {
        expect(formatRupee(1234.56)).toBe('₹1,234.56');
        expect(formatRupee(100, { decimals: 2 })).toBe('₹100.00');
        expect(formatRupee(50.5, { decimals: 2 })).toBe('₹50.50');
      });

      it('supports showSign option for positive numbers without prefixing zero', () => {
        expect(formatRupee(500, { showSign: true })).toBe('+₹500');
        expect(formatRupee(0, { showSign: true })).toBe('₹0');
        expect(formatRupee(-500, { showSign: true })).toBe('-₹500');
      });

      it('safely handles non-finite numbers (NaN, Infinity, null, undefined)', () => {
        expect(formatRupee(NaN)).toBe('₹0');
        expect(formatRupee(Infinity)).toBe('₹0');
        expect(formatRupee(-Infinity)).toBe('₹0');
        expect(formatRupee(null as any)).toBe('₹0');
        expect(formatRupee(undefined as any)).toBe('₹0');
      });
    });

    describe('formatCompactRupee', () => {
      it('formats Crores, Lakhs, Thousands, and sub-thousand amounts', () => {
        expect(formatCompactRupee(10000000)).toBe('₹1.00Cr');
        expect(formatCompactRupee(25000000)).toBe('₹2.50Cr');
        expect(formatCompactRupee(148000)).toBe('₹1.5L');
        expect(formatCompactRupee(18600)).toBe('₹18.6k');
        expect(formatCompactRupee(500)).toBe('₹500');
        expect(formatCompactRupee(0)).toBe('₹0');
      });

      it('formats negative compact amounts correctly', () => {
        expect(formatCompactRupee(-148000)).toBe('-₹1.5L');
        expect(formatCompactRupee(-18600)).toBe('-₹18.6k');
      });

      it('handles NaN and non-finite numbers safely', () => {
        expect(formatCompactRupee(NaN)).toBe('₹0');
        expect(formatCompactRupee(Infinity)).toBe('₹0');
        expect(formatCompactRupee(null as any)).toBe('₹0');
      });
    });

    describe('safeFormatDate & safeFormatTime', () => {
      it('formats ISO dates correctly', () => {
        const formatted = safeFormatDate('2026-10-08T10:00:00.000Z', 'en-IN');
        expect(formatted).toContain('2026');
        expect(formatted).toContain('Oct');
      });

      it('formats Date objects and numerical timestamps', () => {
        const d = new Date(2026, 9, 8);
        expect(safeFormatDate(d)).toContain('2026');

        const epochZero = safeFormatDate(0);
        expect(epochZero).not.toBe('—');
        expect(epochZero).toContain('1970');
      });

      it('handles leap years and boundary calendar dates without throwing', () => {
        expect(() => safeFormatDate('2024-02-29')).not.toThrow();
        expect(safeFormatDate('2024-02-29')).toContain('2024');

        expect(() => safeFormatDate('2026-01-01')).not.toThrow();
        expect(() => safeFormatDate('2026-12-31')).not.toThrow();
      });

      it('never throws on invalid or corrupted dates, returning fallback', () => {
        expect(safeFormatDate('invalid-date')).toBe('—');
        expect(safeFormatDate(null)).toBe('—');
        expect(safeFormatDate(undefined)).toBe('—');
        expect(safeFormatDate('')).toBe('—');
      });

      it('safeFormatTime formats valid times and returns fallback on invalid dates', () => {
        const timeStr = safeFormatTime('2026-10-08T15:30:00.000Z');
        expect(typeof timeStr).toBe('string');
        expect(timeStr).not.toBe('Just now');

        expect(safeFormatTime('invalid-time')).toBe('Just now');
        expect(safeFormatTime(null)).toBe('Just now');
        expect(safeFormatTime('')).toBe('Just now');
      });
    });

    describe('parseMonthYear & isDateInMonth', () => {
      it('parses diverse month-year strings correctly', () => {
        expect(parseMonthYear('October 2026')).toEqual({ year: 2026, month: 9 });
        expect(parseMonthYear('Oct 2026')).toEqual({ year: 2026, month: 9 });
        expect(parseMonthYear('2026-10')).toEqual({ year: 2026, month: 9 });
        expect(parseMonthYear('10 2026')).toEqual({ year: 2026, month: 9 });
      });

      it('returns null for "All Months" or invalid strings', () => {
        expect(parseMonthYear('All Months')).toBeNull();
        expect(parseMonthYear('')).toBeNull();
        expect(parseMonthYear('invalid')).toBeNull();
      });

      it('accurately tests if date falls within target month', () => {
        const inOct = isDateInMonth('2026-10-15T10:00:00.000Z', 'October 2026');
        expect(inOct).toBe(true);

        const notInOct = isDateInMonth('2026-11-01T10:00:00.000Z', 'October 2026');
        expect(notInOct).toBe(false);

        // 'All Months' accepts any date
        expect(isDateInMonth('2026-11-01T10:00:00.000Z', 'All Months')).toBe(true);
      });
    });

    describe('calculateTenureLeft for recurring commitments', () => {
      it('calculates remaining tenure for active loans/EMIs', () => {
        // Created in Oct 2026 with 12 months tenure, checked in Dec 2026 (2 months elapsed)
        const res = calculateTenureLeft(
          '2026-10-01T00:00:00.000Z',
          'December 2026',
          12,
          12
        );
        expect(res.isActive).toBe(true);
        expect(res.monthsElapsed).toBe(2);
        expect(res.tenureLeft).toBe(10);
      });

      it('marks commitment as inactive when tenure is fully elapsed', () => {
        const res = calculateTenureLeft(
          '2026-01-01T00:00:00.000Z',
          'December 2026',
          6,
          6
        );
        expect(res.isActive).toBe(false);
        expect(res.tenureLeft).toBe(0);
      });

      it('handles perpetual commitments (subscriptions) without tenure', () => {
        const res = calculateTenureLeft(
          '2026-01-01T00:00:00.000Z',
          'October 2026',
          null,
          null
        );
        expect(res.isActive).toBe(true);
        expect(res.tenureLeft).toBeNull();
      });

      it('handles target month prior to creation date', () => {
        const res = calculateTenureLeft(
          '2026-10-01T00:00:00.000Z',
          'August 2026',
          12,
          12
        );
        expect(res.isActive).toBe(false);
        expect(res.tenureLeft).toBeNull();
        expect(res.monthsElapsed).toBeLessThan(0);
      });
    });
  });

  // =========================================================================
  // 5. Cross-Screen Modal Input Boundary Validation
  // =========================================================================
  describe('5. Modal & Form Boundary Validation', () => {
    describe('Positive transaction amounts', () => {
      it('rejects 0, negative amounts, and non-numeric strings', () => {
        expect(validatePositiveAmount(0).isValid).toBe(false);
        expect(validatePositiveAmount(-50).isValid).toBe(false);
        expect(validatePositiveAmount('abc').isValid).toBe(false);
        expect(validatePositiveAmount('').isValid).toBe(false);
      });

      it('accepts positive transaction amounts', () => {
        const res = validatePositiveAmount('1500.50');
        expect(res.isValid).toBe(true);
        expect(res.value).toBe(1500.5);
      });
    });

    describe('Non-negative balance validation', () => {
      it('accepts zero as a valid minimum balance', () => {
        const res = validateNonNegativeAmount(0);
        expect(res.isValid).toBe(true);
        expect(res.value).toBe(0);
      });

      it('rejects negative balances', () => {
        expect(validateNonNegativeAmount(-100).isValid).toBe(false);
      });
    });

    describe('Debt repayment overpayment prevention', () => {
      it('rejects repayments greater than outstanding balance', () => {
        const res = validateRepaymentAmount(15000, 10000);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('cannot exceed outstanding balance');
      });

      it('accepts exact or partial repayments', () => {
        expect(validateRepaymentAmount(10000, 10000).isValid).toBe(true);
        expect(validateRepaymentAmount(5000, 10000).isValid).toBe(true);
      });

      it('rejects zero or negative repayments', () => {
        expect(validateRepaymentAmount(0, 10000).isValid).toBe(false);
        expect(validateRepaymentAmount(-500, 10000).isValid).toBe(false);
      });
    });
  });
});
