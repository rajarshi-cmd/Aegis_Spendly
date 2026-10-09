import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  AuthStatus,
  AuthUser,
  AuthSecurityConfig,
  DEFAULT_AUTH_CONFIG,
  saveSecurityConfig,
  loadSecurityConfig,
} from '../../core/types/auth';
import {
  generateSalt,
  hashPin,
  verifyPin,
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
} from '../../core/security/cryptoVault';
import { clearUserProfile, loadUserProfile } from '../../core/types/profile';
import { kvStorage } from '../../core/storage/kvStorage';
import { getDatabase } from '../../core/database/db';

interface AuthSecurityContextType {
  authStatus: AuthStatus;
  user: AuthUser | null;
  config: AuthSecurityConfig;
  failedPinAttempts: number;
  lockoutRemainingSeconds: number;
  remainingAttemptsBeforeWipe: number | null;
  updateConfig: (partial: Partial<AuthSecurityConfig>) => void;
  signInWithGoogle: (customDetails?: Partial<AuthUser>) => Promise<void>;
  createNewVault: (details: { email: string; name?: string }) => Promise<void>;
  setupPin: (pin: string) => Promise<boolean>;
  updatePin: (newPin: string) => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  verifyCurrentPin: (pin: string) => Promise<boolean>;
  completeOnboarding: (details?: { username?: string; name?: string; email?: string; photoUrl?: string }) => void;
  recordUserActivity: () => void;
  lockSession: () => void;
  signOut: () => void;
  deleteVault: () => Promise<void>;
}

const AuthSecurityContext = createContext<AuthSecurityContextType | null>(null);

export const AuthSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('UNAUTHENTICATED');
  const [config, setConfig] = useState<AuthSecurityConfig>(DEFAULT_AUTH_CONFIG);
  const [failedPinAttempts, setFailedPinAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  const idleTimerRef = useRef<any>(null);

  // Timer countdown for active PIN lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((lockoutUntil - now) / 1000));
      if (diff <= 0) {
        setLockoutUntil(null);
        setLockoutRemainingSeconds(0);
      } else {
        setLockoutRemainingSeconds(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Initialize from storage on mount
  useEffect(() => {
    const saved = loadAuthSession();
    const savedConfig = loadSecurityConfig();
    const savedProfile = loadUserProfile();
    if (savedConfig) {
      setConfig(savedConfig);
    }
    if (saved) {
      setUser(saved);
      if (saved.pinHash && saved.pinSalt && (saved.isOnboarded || savedProfile?.isOnboarded)) {
        setAuthStatus('LOCKED'); // Require PIN on app open for existing configured vault
      } else {
        setAuthStatus('ONBOARDING');
      }
    } else {
      // First-time launch: go straight to Onboarding flow!
      setAuthStatus('ONBOARDING');
    }
  }, []);

  const lockSession = useCallback(() => {
    setAuthStatus((current) => {
      if (current === 'UNLOCKED') {
        return 'LOCKED';
      }
      return current;
    });
  }, []);

  const lastActivityTimeRef = useRef<number>(Date.now());

  // Record user interaction and reset inactivity timer
  const recordUserActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (authStatus === 'UNLOCKED' && config.inactivityTimeoutMinutes > 0) {
      const timeoutMs = config.inactivityTimeoutMinutes * 60 * 1000;
      idleTimerRef.current = setTimeout(() => {
        const elapsed = Date.now() - lastActivityTimeRef.current;
        if (elapsed >= timeoutMs) {
          lockSession();
        } else {
          const remainingMs = Math.max(1000, timeoutMs - elapsed);
          idleTimerRef.current = setTimeout(lockSession, remainingMs);
        }
      }, timeoutMs);
    }
  }, [authStatus, config.inactivityTimeoutMinutes, lockSession]);

  // Handle window focus/blur and tab switching auto-lock
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handleWindowBlur = () => {
      if (config.autoLockOnBlur) {
        lockSession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && config.autoLockOnBlur) {
        lockSession();
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.autoLockOnBlur, lockSession]);

  // Handle mobile AppState changes (backgrounding / multitasking minimization)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/) && config.autoLockOnBlur) {
        lockSession();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [config.autoLockOnBlur, lockSession]);

  // Inactivity tracking (resets idle timer on user touch/activity)
  useEffect(() => {
    if (authStatus !== 'UNLOCKED') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    recordUserActivity();

    const handleUserActivity = () => {
      recordUserActivity();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('touchstart', handleUserActivity);

      return () => {
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [authStatus, recordUserActivity]);

  const signInWithGoogle = useCallback(async (customDetails?: Partial<AuthUser>) => {
    const existing = loadAuthSession();
    // Only inherit existing credentials if this is genuinely the same existing user email
    const isSameUser = !!(
      existing &&
      existing.email &&
      customDetails?.email &&
      existing.email.toLowerCase() === customDetails.email.toLowerCase()
    );

    const newUser: AuthUser = {
      id: customDetails?.id || (isSameUser ? existing?.id : undefined) || 'usr_google_' + Date.now().toString(36),
      email: customDetails?.email || existing?.email || '',
      name: customDetails?.name || (isSameUser ? existing?.name : undefined) || 'Spendly User',
      username: customDetails?.username || (isSameUser ? existing?.username : undefined) || customDetails?.email?.split('@')[0] || 'user',
      photoUrl: customDetails?.photoUrl || (isSameUser ? existing?.photoUrl : undefined),
      pinSalt: isSameUser ? existing?.pinSalt : undefined,
      pinHash: isSameUser ? existing?.pinHash : undefined,
      isOnboarded: isSameUser ? (existing?.isOnboarded ?? false) : false,
    };

    setUser(newUser);
    saveAuthSession(newUser);

    if (newUser.pinHash && newUser.pinSalt) {
      if (newUser.isOnboarded === false) {
        setAuthStatus('ONBOARDING');
      } else {
        setAuthStatus('LOCKED');
      }
    } else {
      setAuthStatus('PIN_SETUP');
    }
  }, []);

  const createNewVault = useCallback(async (details: { email: string; name?: string }): Promise<void> => {
    // 1. Purge existing SQLite database tables to ensure clean slate
    try {
      const db = await getDatabase();
      await db.run('DELETE FROM transactions;');
      await db.run('DELETE FROM debts;');
      await db.run('DELETE FROM settlements;');
      await db.run('DELETE FROM recurring_obligations;');
      await db.run('DELETE FROM investments;');
      await db.run('DELETE FROM accounts;');
    } catch (e) {
      console.warn('[AuthSecurity] Failed to purge SQLite tables for new vault', e);
    }

    // 2. Clear stored user profile & budget/init keys
    clearUserProfile();
    kvStorage.removeItem('aegis_vault_initialized');
    kvStorage.removeItem('aegis_planned_budgets');

    // 3. Clear existing auth session
    clearAuthSession();

    // 4. Create fresh AuthUser without PIN, ready for PIN setup and onboarding
    const trimmedEmail = details.email.trim();
    const newUser: AuthUser = {
      id: 'usr_google_' + Date.now().toString(36),
      email: trimmedEmail,
      name: details.name?.trim() || 'Spendly User',
      username: trimmedEmail.split('@')[0] || 'user',
      pinSalt: undefined,
      pinHash: undefined,
      isOnboarded: false,
    };

    setUser(newUser);
    saveAuthSession(newUser);
    setFailedPinAttempts(0);
    setLockoutUntil(null);
    setLockoutRemainingSeconds(0);

    // 5. Explicitly transition to ONBOARDING for the new vault
    setAuthStatus('ONBOARDING');
  }, []);

  const setupPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!pin || pin.length !== 4) return false;
      const current = user || loadAuthSession() || {
        id: 'usr_onboard_' + Date.now().toString(36),
        email: '',
        name: 'Spendly User',
        username: 'user',
        isOnboarded: false,
      };
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);

      const updatedUser: AuthUser = {
        ...current,
        pinSalt: salt,
        pinHash: hash,
      };

      setUser(updatedUser);
      saveAuthSession(updatedUser);
      if (updatedUser.isOnboarded) {
        setAuthStatus('UNLOCKED');
      } else {
        setAuthStatus('ONBOARDING');
      }
      return true;
    },
    [user]
  );

  const updatePin = useCallback(
    async (newPin: string): Promise<boolean> => {
      if (!newPin || newPin.length !== 4) return false;
      const current = user || loadAuthSession();
      if (!current) return false;
      const salt = generateSalt();
      const hash = await hashPin(newPin, salt);
      const updated: AuthUser = {
        ...current,
        pinSalt: salt,
        pinHash: hash,
      };
      setUser(updated);
      saveAuthSession(updated);
      return true;
    },
    [user]
  );

  const deleteVault = useCallback(async (): Promise<void> => {
    clearAuthSession();
    clearUserProfile();
    kvStorage.clear();
    try {
      const db = await getDatabase();
      await db.run('DELETE FROM transactions;');
      await db.run('DELETE FROM debts;');
      await db.run('DELETE FROM settlements;');
      await db.run('DELETE FROM recurring_obligations;');
      await db.run('DELETE FROM investments;');
      await db.run('DELETE FROM accounts;');
    } catch (e) {
      console.warn('[AuthSecurity] Failed to purge SQLite tables on deleteVault', e);
    }
    setUser(null);
    setFailedPinAttempts(0);
    setLockoutUntil(null);
    setLockoutRemainingSeconds(0);
    setAuthStatus('UNAUTHENTICATED');
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!user || !user.pinHash || !user.pinSalt) return false;

      // Enforce active lockout
      if (lockoutUntil && Date.now() < lockoutUntil) {
        return false;
      }

      const isValid = await verifyPin(pin, user.pinSalt, user.pinHash);
      if (isValid) {
        // Reset attempts upon successful unlock
        setFailedPinAttempts(0);
        setLockoutUntil(null);
        setLockoutRemainingSeconds(0);
        if (user.isOnboarded === false) {
          setAuthStatus('ONBOARDING');
        } else {
          setAuthStatus('UNLOCKED');
        }
        return true;
      }

      // Track failed attempts and trigger lockouts or auto-wipe
      const nextFailed = failedPinAttempts + 1;
      setFailedPinAttempts(nextFailed);

      // Check auto-delete threshold (DEF-007)
      if (config.autoDeleteOnFailedPin && config.autoDeleteThreshold && nextFailed >= config.autoDeleteThreshold) {
        await deleteVault();
        return false;
      }

      if (nextFailed >= 8) {
        // 5 minute lockout after 8 failed attempts
        const lockDuration = 300_000;
        setLockoutUntil(Date.now() + lockDuration);
        setLockoutRemainingSeconds(300);
      } else if (nextFailed >= 5) {
        // 30 second lockout after 5 failed attempts
        const lockDuration = 30_000;
        setLockoutUntil(Date.now() + lockDuration);
        setLockoutRemainingSeconds(30);
      }

      return false;
    },
    [user, lockoutUntil, failedPinAttempts, config, deleteVault]
  );

  const verifyCurrentPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const activeUser = user || loadAuthSession();
      if (!activeUser || !activeUser.pinHash || !activeUser.pinSalt) return false;
      return await verifyPin(pin, activeUser.pinSalt, activeUser.pinHash);
    },
    [user]
  );

  const completeOnboarding = useCallback(
    (details?: { username?: string; name?: string; email?: string; photoUrl?: string }) => {
      const current = user || loadAuthSession() || {
        id: 'usr_onboard_' + Date.now().toString(36),
        email: details?.email || '',
        name: details?.name || 'Spendly User',
        username: details?.username || 'user',
        isOnboarded: false,
      };
      const updatedUser: AuthUser = {
        ...current,
        isOnboarded: true,
        username: details?.username || current.username || 'user',
        name: details?.name || current.name || '',
        email: details?.email || current.email || '',
        photoUrl: details?.photoUrl || current.photoUrl,
      };
      setUser(updatedUser);
      saveAuthSession(updatedUser);
      setAuthStatus('UNLOCKED');
    },
    [user]
  );

  // Sign out keeps the vault and credentials safe on-device (DEF-005)
  const signOut = useCallback(() => {
    setUser(null);
    setFailedPinAttempts(0);
    setLockoutUntil(null);
    setLockoutRemainingSeconds(0);
    setAuthStatus('UNAUTHENTICATED');
  }, []);

  const updateConfig = useCallback((partial: Partial<AuthSecurityConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...partial };
      saveSecurityConfig(updated);
      return updated;
    });
  }, []);

  const remainingAttemptsBeforeWipe =
    config.autoDeleteOnFailedPin && config.autoDeleteThreshold
      ? Math.max(0, config.autoDeleteThreshold - failedPinAttempts)
      : null;

  return (
    <AuthSecurityContext.Provider
      value={{
        authStatus,
        user,
        config,
        failedPinAttempts,
        lockoutRemainingSeconds,
        remainingAttemptsBeforeWipe,
        updateConfig,
        signInWithGoogle,
        createNewVault,
        setupPin,
        updatePin,
        unlockWithPin,
        verifyCurrentPin,
        completeOnboarding,
        recordUserActivity,
        lockSession,
        signOut,
        deleteVault,
      }}
    >
      {children}
    </AuthSecurityContext.Provider>
  );
};

export const useAuthSecurity = (): AuthSecurityContextType => {
  const context = useContext(AuthSecurityContext);
  if (!context) {
    throw new Error('useAuthSecurity must be used within an AuthSecurityProvider');
  }
  return context;
};
