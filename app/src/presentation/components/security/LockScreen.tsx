import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

export const LockScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    user,
    unlockWithPin,
    signOut,
    failedPinAttempts,
    lockoutRemainingSeconds,
    remainingAttemptsBeforeWipe,
    config,
  } = useAuthSecurity();

  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isLockedOut = lockoutRemainingSeconds > 0;

  const handleDigit = async (digit: string) => {
    if (isVerifying || isLockedOut || pin.length >= 4) return;
    setErrorMessage(null);
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setIsVerifying(true);
      const success = await unlockWithPin(nextPin);
      if (!success) {
        if (config.autoDeleteOnFailedPin && config.autoDeleteThreshold) {
          const rem = Math.max(0, config.autoDeleteThreshold - (failedPinAttempts + 1));
          if (rem <= 0) {
            setErrorMessage('Vault deleted due to maximum wrong PIN attempts.');
          } else {
            setErrorMessage(`Incorrect PIN. Vault will be deleted after ${rem} more wrong input${rem === 1 ? '' : 's'}!`);
          }
        } else {
          setErrorMessage('Incorrect PIN. Please try again.');
        }
        setTimeout(() => {
          setPin('');
          setIsVerifying(false);
        }, 500);
      } else {
        setIsVerifying(false);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying || isLockedOut) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying || isLockedOut) return;
    setErrorMessage(null);
    setPin('');
  };

  // Listen to physical keyboard on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, isVerifying]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        {/* User Profile Badge */}
        <View style={[styles.userChip, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
          <View style={[styles.userAvatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
          </View>
          <Text style={[styles.userChipText, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name || 'Rajarshi Giri'}
          </Text>
        </View>

        {/* Lock Icon Box */}
        <View style={[styles.lockIconBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <Ionicons name="lock-closed" size={24} color="#B45309" />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Vault Locked</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Enter your 4-digit Master PIN to unlock your personal ledger.
        </Text>

        {/* 4 Pin Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pin.length;
            const hasError = errorMessage !== null;

            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled
                      ? hasError
                        ? '#DC2626'
                        : colors.primary
                      : 'transparent',
                    borderColor: hasError
                      ? '#DC2626'
                      : isFilled
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Lockout or Error message */}
        {isLockedOut ? (
          <View style={[styles.lockoutBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="timer-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.lockoutText}>
              Vault locked. Try again in {lockoutRemainingSeconds}s
            </Text>
          </View>
        ) : errorMessage ? (
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{errorMessage}</Text>
        ) : config.autoDeleteOnFailedPin && remainingAttemptsBeforeWipe !== null && failedPinAttempts > 0 ? (
          <Text style={[styles.errorText, { color: '#DC2626', fontWeight: '700' }]}>
            ⚠️ Vault will be deleted after {remainingAttemptsBeforeWipe} more wrong input{remainingAttemptsBeforeWipe === 1 ? '' : 's'}
          </Text>
        ) : failedPinAttempts >= 3 ? (
          <Text style={[styles.errorText, { color: '#D97706' }]}>
            ⚠️ {Math.max(1, 5 - failedPinAttempts)} attempt(s) left before lockout
          </Text>
        ) : (
          <View style={{ height: 18 }} />
        )}

        {/* Numeric Keypad */}
        <View style={[styles.keypad, isLockedOut && { opacity: 0.35 }]}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['C', '0', '⌫'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((key) => {
                const isSpecial = key === 'C' || key === '⌫';
                return (
                  <TouchableOpacity
                    key={key}
                    disabled={isLockedOut || isVerifying}
                    style={[
                      styles.keyBtn,
                      {
                        backgroundColor: isSpecial ? 'transparent' : colors.background,
                        borderColor: isSpecial ? 'transparent' : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      if (key === 'C') handleClear();
                      else if (key === '⌫') handleBackspace();
                      else handleDigit(key);
                    }}
                    activeOpacity={0.7}
                  >
                    {key === '⌫' ? (
                      <Ionicons name="backspace-outline" size={20} color={colors.textSecondary} />
                    ) : (
                      <Text
                        style={[
                          styles.keyText,
                          {
                            color: isSpecial ? colors.textMuted : colors.textPrimary,
                            fontWeight: isSpecial ? '600' : '700',
                          },
                        ]}
                      >
                        {key}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom Switch Account / Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={[styles.signOutText, { color: colors.textMuted }]}>Switch account or sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    maxWidth: '100%',
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  userChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 280,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  lockoutText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  keypad: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  keyBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 20,
  },
  signOutBtn: {
    marginTop: 24,
    padding: 8,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
