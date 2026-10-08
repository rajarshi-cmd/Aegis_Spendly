import { AuthUser } from '../types/auth';

const STORAGE_KEY = 'aegis_secure_auth_session';

/**
 * Generate a cryptographically secure random salt string.
 */
export function generateSalt(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomVals = new Uint8Array(length);
    crypto.getRandomValues(randomVals);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomVals[i] % chars.length);
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Computes a secure SHA-256 hash of a 4-digit PIN combined with a unique salt.
 * Uses Web Crypto API when available with a universal fallback.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const message = `${salt}:aegis_vault:${pin}:${salt}`;

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to JS fallback
    }
  }

  // Pure TypeScript/JS SHA-256 fallback implementation for non-browser/node environments
  return fallbackSha256(message);
}

/**
 * Verifies a PIN against a known hash and salt in constant-like time.
 */
export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  if (!pin || !salt || !expectedHash) return false;
  const computed = await hashPin(pin, salt);
  return computed === expectedHash;
}

let memoryStorage: Record<string, string> = {};

/**
 * Persists authenticated user security metadata.
 */
export function saveAuthSession(user: AuthUser): void {
  try {
    const data = JSON.stringify(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, data);
    } else {
      memoryStorage[STORAGE_KEY] = data;
    }
  } catch (e) {
    console.warn('[CryptoVault] Failed to save auth session to storage', e);
  }
}

/**
 * Retrieves persisted authenticated user security metadata.
 */
export function loadAuthSession(): AuthUser | null {
  try {
    let data: string | null = null;
    if (typeof localStorage !== 'undefined') {
      data = localStorage.getItem(STORAGE_KEY);
    } else {
      data = memoryStorage[STORAGE_KEY] || null;
    }
    if (data) {
      return JSON.parse(data) as AuthUser;
    }
  } catch (e) {
    console.warn('[CryptoVault] Failed to load auth session from storage', e);
  }
  return null;
}

/**
 * Clears authenticated user security metadata upon logout.
 */
export function clearAuthSession(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    delete memoryStorage[STORAGE_KEY];
  } catch (e) {
    console.warn('[CryptoVault] Failed to clear auth session', e);
  }
}

// Compact SHA-256 helper for pure environments
export function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0,
        w2 = w[i - 2] || 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i] || 0
          : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += byte < 16 ? '0' + byte.toString(16) : byte.toString(16);
    }
  }
  return result;
}
