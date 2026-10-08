export type AuthStatus = 'UNAUTHENTICATED' | 'PIN_SETUP' | 'LOCKED' | 'UNLOCKED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  pinSalt?: string;
  pinHash?: string;
}

export interface AuthSecurityConfig {
  autoLockOnBlur: boolean;
  inactivityTimeoutMinutes: number; // default 5 minutes
  requirePinOnOpen: boolean;
}

export const DEFAULT_AUTH_CONFIG: AuthSecurityConfig = {
  autoLockOnBlur: true,
  inactivityTimeoutMinutes: 5,
  requirePinOnOpen: true,
};
