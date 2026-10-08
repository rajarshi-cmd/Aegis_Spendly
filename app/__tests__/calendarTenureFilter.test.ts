import { describe, it, expect } from '@jest/globals';
import {
  parseMonthYear,
  isDateInMonth,
  calculateTenureLeft,
  formatMonthShort,
  formatMonthYearLabel,
} from '../src/core/utils/date';

describe('Calendar Month & Tenure Filter Engine', () => {
  describe('parseMonthYear & formatters', () => {
    it('correctly parses month strings into year and 0-indexed month', () => {
      expect(parseMonthYear('October 2026')).toEqual({ year: 2026, month: 9 });
      expect(parseMonthYear('Sep 2026')).toEqual({ year: 2026, month: 8 });
      expect(parseMonthYear('January 2027')).toEqual({ year: 2027, month: 0 });
    });

    it('returns null for "All Months" or invalid input', () => {
      expect(parseMonthYear('All Months')).toBeNull();
      expect(parseMonthYear('')).toBeNull();
      expect(parseMonthYear('invalid')).toBeNull();
    });

    it('formats short and full month labels safely', () => {
      expect(formatMonthShort('October 2026')).toBe('Oct');
      expect(formatMonthShort('November 2026')).toBe('Nov');
      expect(formatMonthYearLabel('Sep 2026')).toBe('September 2026');
    });
  });

  describe('isDateInMonth', () => {
    it('returns true when a timestamp matches the target month', () => {
      expect(isDateInMonth('2026-10-07T14:30:00.000Z', 'October 2026')).toBe(true);
      expect(isDateInMonth('2026-10-01T09:00:00.000Z', 'October 2026')).toBe(true);
      expect(isDateInMonth('2026-09-22T16:30:00.000Z', 'September 2026')).toBe(true);
    });

    it('returns false when a timestamp does not match the target month', () => {
      expect(isDateInMonth('2026-09-22T16:30:00.000Z', 'October 2026')).toBe(false);
      expect(isDateInMonth('2026-10-07T14:30:00.000Z', 'September 2026')).toBe(false);
      expect(isDateInMonth('2026-11-01T00:00:00.000Z', 'October 2026')).toBe(false);
    });

    it('returns true for all dates when target is "All Months"', () => {
      expect(isDateInMonth('2026-10-07T14:30:00.000Z', 'All Months')).toBe(true);
      expect(isDateInMonth('2026-09-22T16:30:00.000Z', 'All Months')).toBe(true);
    });
  });

  describe('calculateTenureLeft', () => {
    const createdAt = '2026-10-01T00:00:00.000Z'; // Created in October 2026

    it('hides commitments in past months prior to creation', () => {
      // Prior to creation (September 2026)
      const res = calculateTenureLeft(createdAt, 'September 2026', 12, 12);
      expect(res.isActive).toBe(false);
      expect(res.monthsElapsed).toBe(-1);
    });

    it('calculates remaining tenure correctly for current and future months', () => {
      // Month of creation (October 2026)
      const octRes = calculateTenureLeft(createdAt, 'October 2026', 12, 12);
      expect(octRes.isActive).toBe(true);
      expect(octRes.tenureLeft).toBe(12);
      expect(octRes.monthsElapsed).toBe(0);

      // 1 month later (November 2026)
      const novRes = calculateTenureLeft(createdAt, 'November 2026', 12, 12);
      expect(novRes.isActive).toBe(true);
      expect(novRes.tenureLeft).toBe(11);
      expect(novRes.monthsElapsed).toBe(1);

      // 6 months later (April 2027)
      const aprRes = calculateTenureLeft(createdAt, 'April 2027', 12, 12);
      expect(aprRes.isActive).toBe(true);
      expect(aprRes.tenureLeft).toBe(6);
      expect(aprRes.monthsElapsed).toBe(6);
    });

    it('marks commitment inactive once tenure has completed', () => {
      // 12 months later (October 2027): 12 - 12 = 0
      const oct27Res = calculateTenureLeft(createdAt, 'October 2027', 12, 12);
      expect(oct27Res.isActive).toBe(false);
      expect(oct27Res.tenureLeft).toBe(0);

      // 13 months later (November 2027): 12 - 13 = -1
      const nov27Res = calculateTenureLeft(createdAt, 'November 2027', 12, 12);
      expect(nov27Res.isActive).toBe(false);
    });

    it('respects pre-existing remaining tenure when added mid-loan', () => {
      // 36-month loan added when only 4 months remain in October 2026
      const resOct = calculateTenureLeft(createdAt, 'October 2026', 36, 4);
      expect(resOct.isActive).toBe(true);
      expect(resOct.tenureLeft).toBe(4);

      // December 2026 (2 months elapsed)
      const resDec = calculateTenureLeft(createdAt, 'December 2026', 36, 4);
      expect(resDec.isActive).toBe(true);
      expect(resDec.tenureLeft).toBe(2);

      // February 2027 (4 months elapsed) -> expired
      const resFeb = calculateTenureLeft(createdAt, 'February 2027', 36, 4);
      expect(resFeb.isActive).toBe(false);
      expect(resFeb.tenureLeft).toBe(0);
    });

    it('handles perpetual subscriptions (null tenure) indefinitely from creation', () => {
      const netflix = calculateTenureLeft(createdAt, 'November 2026', null, null);
      expect(netflix.isActive).toBe(true);
      expect(netflix.tenureLeft).toBeNull();

      const future = calculateTenureLeft(createdAt, 'December 2028', null, null);
      expect(future.isActive).toBe(true);
      expect(future.tenureLeft).toBeNull();

      const past = calculateTenureLeft(createdAt, 'August 2026', null, null);
      expect(past.isActive).toBe(false); // didn't exist yet
    });

    it('shows all commitments when target is "All Months"', () => {
      const allRes = calculateTenureLeft(createdAt, 'All Months', 12, 8);
      expect(allRes.isActive).toBe(true);
      expect(allRes.tenureLeft).toBe(8);
    });
  });
});
