/**
 * Input validation, sanitization, and UI boundary checking utilities.
 * Used across Onboarding, forms, drawers, and security gates.
 */

export interface ValidationResult<T = any> {
  isValid: boolean;
  value: T;
  error?: string;
}

/**
 * Validates and sanitizes vault username:
 * - Trims whitespace and strips leading '@'
 * - Lowercases for canonical storage
 * - Enforces minimum 3 characters
 * - Enforces maximum 30 characters
 * - Enforces regex: letters, numbers, and underscores only ([a-zA-Z0-9_]+)
 */
export function validateUsername(val: string): ValidationResult<string> {
  if (typeof val !== 'string') {
    return { isValid: false, value: '', error: 'Username must be a valid text string.' };
  }
  const cleaned = val.trim().toLowerCase().replace(/^@/, '');
  if (cleaned.length === 0) {
    return { isValid: false, value: '', error: 'Username cannot be empty.' };
  }
  if (cleaned.length < 3) {
    return { isValid: false, value: cleaned, error: 'Username must be at least 3 characters.' };
  }
  if (cleaned.length > 30) {
    return { isValid: false, value: cleaned, error: 'Username cannot exceed 30 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    return { isValid: false, value: cleaned, error: 'Letters, numbers and underscores only.' };
  }
  return { isValid: true, value: cleaned };
}

/**
 * Validates account or bank nicknames:
 * - Trims whitespace
 * - Disallows empty or whitespace-only labels
 * - Max length of 60 characters
 */
export function validateBankName(val: string): ValidationResult<string> {
  if (typeof val !== 'string') {
    return { isValid: false, value: '', error: 'Bank name must be a valid text string.' };
  }
  const cleaned = val.trim();
  if (cleaned.length === 0) {
    return { isValid: false, value: '', error: 'Bank or account name cannot be empty.' };
  }
  if (cleaned.length > 60) {
    return { isValid: false, value: cleaned, error: 'Account name cannot exceed 60 characters.' };
  }
  return { isValid: true, value: cleaned };
}

/**
 * Strips non-numeric characters from balance / monetary inputs:
 * Handles currency symbols ('₹', '$'), commas, spaces, letters, etc.
 * Keeps single decimal point.
 */
export function parseBalanceInput(val: string | number, fallback: number = 0): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val !== 'string') {
    return fallback;
  }
  const stripped = val.replace(/[^0-9.]/g, '');
  if (!stripped) return fallback;

  // Handle multiple dots by taking first occurrence
  const parts = stripped.split('.');
  const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];

  const parsed = parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const MAX_FINANCIAL_AMOUNT = 999_999_999.99;
export const MAX_DESCRIPTION_LENGTH = 255;

/**
 * Validates a positive numeric transaction amount with overflow protections (CWE-128):
 */
export function validatePositiveAmount(val: string | number): ValidationResult<number> {
  const num = typeof val === 'number' ? val : parseBalanceInput(val, NaN);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0) {
    return { isValid: false, value: 0, error: 'Please enter a positive numeric amount.' };
  }
  if (num > MAX_FINANCIAL_AMOUNT) {
    return {
      isValid: false,
      value: MAX_FINANCIAL_AMOUNT,
      error: `Amount exceeds maximum allowable limit of ₹${MAX_FINANCIAL_AMOUNT.toLocaleString('en-IN')}.`,
    };
  }
  return { isValid: true, value: num };
}

/**
 * Validates a non-negative balance (0 or greater) with overflow protections:
 */
export function validateNonNegativeAmount(val: string | number): ValidationResult<number> {
  const num = typeof val === 'number' ? val : parseBalanceInput(val, NaN);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) {
    return { isValid: false, value: 0, error: 'Amount cannot be negative.' };
  }
  if (num > MAX_FINANCIAL_AMOUNT) {
    return {
      isValid: false,
      value: MAX_FINANCIAL_AMOUNT,
      error: `Amount exceeds maximum allowable limit of ₹${MAX_FINANCIAL_AMOUNT.toLocaleString('en-IN')}.`,
    };
  }
  return { isValid: true, value: num };
}

/**
 * Sanitizes and validates transaction descriptions against control characters and buffer overflow:
 */
export function validateDescription(val: string | null | undefined): ValidationResult<string> {
  if (val == null) return { isValid: true, value: '' };
  const cleaned = String(val).trim().replace(/[\x00-\x1F\x7F]/g, '');
  if (cleaned.length > MAX_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      value: cleaned.slice(0, MAX_DESCRIPTION_LENGTH),
      error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }
  return { isValid: true, value: cleaned };
}

/**
 * Validates calendar day (1 - 31) for bill cut dates, due dates, and salary days:
 */
export function validateCalendarDay(val: string | number): ValidationResult<number> {
  const rawNum = typeof val === 'number' ? val : parseInt(val?.toString().replace(/[^0-9-]/g, '') || '', 10);
  if (!Number.isFinite(rawNum) || isNaN(rawNum)) {
    return { isValid: false, value: 1, error: 'Please enter a valid day between 1 and 31.' };
  }
  if (rawNum < 1 || rawNum > 31) {
    return { isValid: false, value: Math.min(31, Math.max(1, rawNum)), error: 'Day must be between 1 and 31.' };
  }
  return { isValid: true, value: rawNum };
}

/**
 * Clamps a calendar day strictly into [1, 31]:
 */
export function clampCalendarDay(val: string | number, fallback: number = 1): number {
  const parsed = typeof val === 'number' ? val : parseInt(val?.toString().replace(/[^0-9-]/g, '') || '', 10);
  if (!Number.isFinite(parsed) || isNaN(parsed)) return Math.min(31, Math.max(1, fallback));
  return Math.min(31, Math.max(1, parsed));
}

/**
 * Validates and clamps Keep-Track Target Max Utilization ratio between 0% and 100%:
 */
export function validateKeepTrackRatio(val: number | string): number {
  const num = typeof val === 'number' ? val : parseFloat(val?.toString() || '');
  if (!Number.isFinite(num) || isNaN(num)) return 50;
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Validates repayment against outstanding debt balance:
 */
export function validateRepaymentAmount(val: string | number, maxOutstanding: number): ValidationResult<number> {
  const amount = typeof val === 'number' ? val : parseFloat(val?.toString() || '');
  if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
    return { isValid: false, value: 0, error: 'Please specify a positive repayment amount.' };
  }
  if (amount > maxOutstanding) {
    return {
      isValid: false,
      value: amount,
      error: `Repayment cannot exceed outstanding balance of ₹${maxOutstanding.toFixed(2)}.`,
    };
  }
  return { isValid: true, value: amount };
}

/**
 * Validates 4-digit numeric Master PIN:
 */
export function validatePin(pin: string): ValidationResult<string> {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return { isValid: false, value: pin, error: 'PIN must be exactly 4 digits.' };
  }
  return { isValid: true, value: pin };
}
