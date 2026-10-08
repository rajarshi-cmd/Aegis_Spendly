import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AuthStatus, AuthUser, AuthSecurityConfig, DEFAULT_AUTH_CONFIG } from '../../core/types/auth';
import {
  generateSalt,
  hashPin,
  verifyPin,
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
} from '../../core/security/cryptoVault';

interface AuthSecurityContextType {
  authStatus: AuthStatus;
  user: AuthUser | null;
  config: AuthSecurityConfig;
  updateConfig: (partial: Partial<AuthSecurityConfig>) => void;
  signInWithGoogle: (customDetails?: Partial<AuthUser>) => Promise<void>;
  setupPin: (pin: string) => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockSession: () => void;
  signOut: () => void;
}

const AuthSecurityContext = createContext<AuthSecurityContextType | null>(null);

export const AuthSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('UNAUTHENTICATED');
  const [config, setConfig] = useState<AuthSecurityConfig>(DEFAULT_AUTH_CONFIG);

  const idleTimerRef = useRef<any>(null);

  // Initialize from storage on mount
  useEffect(() => {
    const saved = loadAuthSession();
    if (saved) {
      setUser(saved);
      if (saved.pinHash && saved.pinSalt) {
        setAuthStatus('LOCKED'); // Require PIN on app open
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

  // Reset and restart the 5-minute inactivity timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (authStatus === 'UNLOCKED') {
      const timeoutMs = (config.inactivityTimeoutMinutes || 5) * 60 * 1000;
      idleTimerRef.current = setTimeout(() => {
        lockSession();
      }, timeoutMs);
    }
  }, [authStatus, config.inactivityTimeoutMinutes, lockSession]);

  // Tab switch & window visibility change listener (Web + Mobile AppState)
  useEffect(() => {
    // 1. Mobile AppState listener
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if ((nextState === 'background' || nextState === 'inactive') && config.autoLockOnBlur) {
        lockSession();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // 2. Web browser tab visibility / blur listener
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.hidden && config.autoLockOnBlur) {
          lockSession();
        }
      };

      const handleWindowBlur = () => {
        if (config.autoLockOnBlur) {
          lockSession();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        appStateSub.remove();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }

    return () => {
      appStateSub.remove();
    };
  }, [config.autoLockOnBlur, lockSession]);

  // Inactivity / idle interaction listeners on Web
  useEffect(() => {
    if (authStatus !== 'UNLOCKED') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    resetIdleTimer();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      const onUserActivity = () => {
        resetIdleTimer();
      };

      activityEvents.forEach((ev) => window.addEventListener(ev, onUserActivity, { passive: true }));

      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        activityEvents.forEach((ev) => window.removeEventListener(ev, onUserActivity));
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
      email: customDetails?.email || existing?.email || 'rajarshi250500@gmail.com',
      name: customDetails?.name || existing?.name || 'Rajarshi Giri',
      photoUrl: customDetails?.photoUrl || existing?.photoUrl,
      pinSalt: existing?.pinSalt,
      pinHash: existing?.pinHash,
    };

    setUser(newUser);
    saveAuthSession(newUser);

    if (newUser.pinHash && newUser.pinSalt) {
      setAuthStatus('LOCKED');
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
      setAuthStatus('UNLOCKED');
      return true;
    },
    [user]
  );

  const unlockWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!user || !user.pinHash || !user.pinSalt) return false;
      const isValid = await verifyPin(pin, user.pinSalt, user.pinHash);
      if (isValid) {
        setAuthStatus('UNLOCKED');
        return true;
      }
      return false;
    },
    [user]
  );

  const signOut = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setAuthStatus('UNAUTHENTICATED');
  }, []);

  const updateConfig = useCallback((partial: Partial<AuthSecurityConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <AuthSecurityContext.Provider
      value={{
        authStatus,
        user,
        config,
        updateConfig,
        signInWithGoogle,
        setupPin,
        unlockWithPin,
        lockSession,
        signOut,
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
