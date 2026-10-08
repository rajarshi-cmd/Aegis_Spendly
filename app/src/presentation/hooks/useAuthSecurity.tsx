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
import { clearUserProfile } from '../../core/types/profile';
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
  setupPin: (pin: string) => Promise<boolean>;
  updatePin: (newPin: string) => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  verifyCurrentPin: (pin: string) => Promise<boolean>;
  completeOnboarding: (details?: { username?: string; name?: string; email?: string; photoUrl?: string }) => void;
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
    if (savedConfig) {
      setConfig(savedConfig);
    }
    if (saved) {
      setUser(saved);
      if (saved.pinHash && saved.pinSalt) {
        if (saved.isOnboarded === false) {
          setAuthStatus('ONBOARDING');
        } else {
          setAuthStatus('LOCKED'); // Require PIN on app open
        }
      } else {
        setAuthStatus('PIN_SETUP');
      }
    } else {
      setAuthStatus('UNAUTHENTICATED');
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

  // Reset and restart the inactivity timer based on user config
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (authStatus === 'UNLOCKED' && config.inactivityTimeoutMinutes > 0) {
      const timeoutMs = config.inactivityTimeoutMinutes * 60 * 1000;
      idleTimerRef.current = setTimeout(() => {
        lockSession();
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

    resetIdleTimer();

    const handleUserActivity = () => {
      resetIdleTimer();
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
  }, [authStatus, resetIdleTimer]);

  const signInWithGoogle = useCallback(async (customDetails?: Partial<AuthUser>) => {
    const existing = loadAuthSession();
    const newUser: AuthUser = {
      id: customDetails?.id || existing?.id || 'usr_google_' + Date.now().toString(36),
      email: customDetails?.email || existing?.email || '',
      name: customDetails?.name || existing?.name || '',
      username: customDetails?.username || existing?.username || '',
      photoUrl: customDetails?.photoUrl || existing?.photoUrl,
      pinSalt: existing?.pinSalt,
      pinHash: existing?.pinHash,
      isOnboarded: existing?.isOnboarded ?? false,
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

  const setupPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!pin || pin.length !== 4 || !user) return false;
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);

      const updatedUser: AuthUser = {
        ...user,
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
      if (!user) return;
      const updatedUser: AuthUser = {
        ...user,
        isOnboarded: true,
        username: details?.username || user.username || 'user',
        name: details?.name || user.name || '',
        email: details?.email || user.email || '',
        photoUrl: details?.photoUrl || user.photoUrl,
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
        setupPin,
        updatePin,
        unlockWithPin,
        verifyCurrentPin,
        completeOnboarding,
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
