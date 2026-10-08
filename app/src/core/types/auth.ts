import { kvStorage } from '../storage/kvStorage';

export type AuthStatus = 'UNAUTHENTICATED' | 'PIN_SETUP' | 'ONBOARDING' | 'LOCKED' | 'UNLOCKED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  photoUrl?: string;
  pinSalt?: string;
  pinHash?: string;
  isOnboarded?: boolean;
}

export type AutoLockPreset = 'HIGH' | 'BALANCED' | 'RELAXED' | 'EXTENDED' | 'CUSTOM';

export interface AuthSecurityConfig {
  autoLockOnBlur: boolean;
  inactivityTimeoutMinutes: number; // 1, 5, 15, 30, or 0 (never)
  requirePinOnOpen: boolean;
  lockPreset: AutoLockPreset;
  autoDeleteOnFailedPin?: boolean;
  autoDeleteThreshold?: number; // 3 to 10
}

export const DEFAULT_AUTH_CONFIG: AuthSecurityConfig = {
  autoLockOnBlur: true,
  inactivityTimeoutMinutes: 5,
  requirePinOnOpen: true,
  lockPreset: 'BALANCED',
  autoDeleteOnFailedPin: false,
  autoDeleteThreshold: 5,
};

const SECURITY_CONFIG_STORAGE_KEY = 'aegis_security_config_data';

export function saveSecurityConfig(config: AuthSecurityConfig): void {
  try {
    const data = JSON.stringify(config);
    kvStorage.setItem(SECURITY_CONFIG_STORAGE_KEY, data);
  } catch (e) {
    console.warn('[AuthSecurity] Failed to save security config', e);
  }
}

export function loadSecurityConfig(): AuthSecurityConfig | null {
  try {
    const data = kvStorage.getItem(SECURITY_CONFIG_STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_AUTH_CONFIG, ...JSON.parse(data) };
    }
  } catch (e) {
    console.warn('[AuthSecurity] Failed to load security config', e);
  }
  return null;
}
