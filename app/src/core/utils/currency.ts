/**
 * Formats a number into Indian Rupee format with ₹ prefix.
 * e.g., 129400 -> ₹1,29,400
 * e.g., -480 -> -₹480
 */
export interface FormatRupeeOptions {
  showSign?: boolean;
  decimals?: number;
}

export function formatRupee(
  amount: number,
  options?: boolean | FormatRupeeOptions
): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '₹0';
  }

  const showSign = typeof options === 'boolean' ? options : (options?.showSign ?? false);
  const decimals = typeof options === 'object' && options?.decimals !== undefined ? options.decimals : undefined;

  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  
  // Format according to Indian numbering system (Lakhs / Crores)
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals !== undefined ? decimals : (abs % 1 !== 0 ? 2 : 0),
    maximumFractionDigits: decimals !== undefined ? decimals : (abs % 1 !== 0 ? 2 : 0),
  }).format(abs);

  if (isNegative) {
    return `-₹${formatted}`;
  }
  if (showSign && amount > 0) {
    return `+₹${formatted}`;
  }
  return `₹${formatted}`;
}


/**
 * Compact Indian currency representation:
 * e.g. 18600 -> ₹18.6k
 * e.g. 148000 -> ₹1.48L
 */
export function formatCompactRupee(amount: number): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '₹0';
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}₹${abs}`;
}
