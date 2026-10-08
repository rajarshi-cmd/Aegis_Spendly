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
}

export const DEFAULT_AUTH_CONFIG: AuthSecurityConfig = {
  autoLockOnBlur: true,
  inactivityTimeoutMinutes: 5,
  requirePinOnOpen: true,
  lockPreset: 'BALANCED',
};

const SECURITY_CONFIG_STORAGE_KEY = 'aegis_security_config_data';
let memorySecurityConfigStorage: string | null = null;

export function saveSecurityConfig(config: AuthSecurityConfig): void {
  try {
    const data = JSON.stringify(config);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SECURITY_CONFIG_STORAGE_KEY, data);
    } else {
      memorySecurityConfigStorage = data;
    }
  } catch (e) {
    console.warn('[AuthSecurity] Failed to save security config', e);
  }
}

export function loadSecurityConfig(): AuthSecurityConfig | null {
  try {
    let data: string | null = null;
    if (typeof localStorage !== 'undefined') {
      data = localStorage.getItem(SECURITY_CONFIG_STORAGE_KEY);
    } else {
      data = memorySecurityConfigStorage;
    }
    if (data) {
      return JSON.parse(data) as AuthSecurityConfig;
    }
  } catch (e) {
    console.warn('[AuthSecurity] Failed to load security config', e);
  }
  return null;
}
