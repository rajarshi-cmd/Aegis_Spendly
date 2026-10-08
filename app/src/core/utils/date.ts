/**
 * Safe date and time formatting utilities.
 * Completely immune to RangeError: Invalid time value on Hermes, JSC, V8, and Android/iOS.
 */

export function safeFormatDate(
  dateInput: string | number | Date | null | undefined,
  locale: string = 'en-IN',
  options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' }
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(locale, options);
  } catch {
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '—';
      return d.toDateString();
    } catch {
      return '—';
    }
  }
}

export function safeFormatTime(
  dateInput: string | number | Date | null | undefined,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return 'Just now';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString(locale, options);
  } catch {
    return 'Just now';
  }
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];
const MONTH_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function parseMonthYear(monthStr: string): { year: number; month: number } | null {
  if (!monthStr || monthStr.toLowerCase() === 'all months') return null;
  const parts = monthStr.trim().toLowerCase().split(/[\s-]+/);
  let year: number | null = null;
  let month: number | null = null;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 2000 && num <= 2100) {
      year = num;
    } else if (MONTH_NAMES.includes(part)) {
      month = MONTH_NAMES.indexOf(part);
    } else if (MONTH_SHORT.includes(part)) {
      month = MONTH_SHORT.indexOf(part);
    } else if (!isNaN(num) && num >= 1 && num <= 12 && month === null) {
      month = num - 1;
    }
  }

  if (year !== null && month !== null) {
    return { year, month };
  }
  return null;
}

export function isDateInMonth(dateInput: string | Date | null | undefined, monthStr: string): boolean {
  if (!dateInput) return false;
  const target = parseMonthYear(monthStr);
  if (!target) return true; // If 'All Months' or unparseable, don't filter out
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === target.year && d.getMonth() === target.month;
}

export function calculateTenureLeft(
  createdAtIso: string | null | undefined,
  targetMonthStr: string,
  totalTenure: number | null | undefined,
  remainingTenure: number | null | undefined
): { isActive: boolean; tenureLeft: number | null; monthsElapsed: number } {
  const target = parseMonthYear(targetMonthStr);
  if (!target) {
    return { isActive: true, tenureLeft: remainingTenure ?? totalTenure ?? null, monthsElapsed: 0 };
  }

  const created = createdAtIso ? new Date(createdAtIso) : new Date();
  const createdYear = isNaN(created.getTime()) ? 2026 : created.getFullYear();
  const createdMonth = isNaN(created.getTime()) ? 9 : created.getMonth(); // 9 = October

  const monthsElapsed = (target.year - createdYear) * 12 + (target.month - createdMonth);

  // If target month is before creation month, the commitment didn't exist yet
  if (monthsElapsed < 0) {
    return { isActive: false, tenureLeft: null, monthsElapsed };
  }

  // If perpetual (subscription with no total tenure)
  if (totalTenure === null || totalTenure === undefined || totalTenure <= 0) {
    return { isActive: true, tenureLeft: null, monthsElapsed };
  }

  // If finite tenure (e.g. 12 month EMI)
  const startingTenure = (remainingTenure !== null && remainingTenure !== undefined)
    ? remainingTenure
    : totalTenure;
  const tenureLeft = startingTenure - monthsElapsed;

  if (tenureLeft <= 0) {
    return { isActive: false, tenureLeft: 0, monthsElapsed };
  }

  return { isActive: true, tenureLeft, monthsElapsed };
}

export function formatMonthShort(monthStr: string): string {
  const parsed = parseMonthYear(monthStr);
  if (!parsed) return 'Cycle';
  const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return shortNames[parsed.month] || 'Cycle';
}

export function formatMonthYearLabel(monthStr: string): string {
  const parsed = parseMonthYear(monthStr);
  if (!parsed) return monthStr;
  const fullNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${fullNames[parsed.month]} ${parsed.year}`;
}

