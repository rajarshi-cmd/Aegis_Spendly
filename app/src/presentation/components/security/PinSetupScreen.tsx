import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
];

export const PinSetupScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, setupPin, signOut } = useAuthSecurity();

  const [step, setStep] = useState<'ENTER' | 'CONFIRM'>('ENTER');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePin = step === 'ENTER' ? firstPin : confirmPin;

  const handleDigit = (digit: string) => {
    setErrorMessage(null);
    if (activePin.length >= 4) return;

    const next = activePin + digit;
    if (step === 'ENTER') {
      setFirstPin(next);
      if (next.length === 4) {
        setTimeout(() => setStep('CONFIRM'), 200);
      }
    } else {
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          setupPin(next);
        } else {
          setErrorMessage('PINs did not match. Please try again.');
          if (Platform.OS !== 'web') {
            Vibration.vibrate(200);
          }
          setTimeout(() => {
            setFirstPin('');
            setConfirmPin('');
            setStep('ENTER');
          }, 900);
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    if (step === 'ENTER') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMessage(null);
    if (step === 'ENTER') {
      setFirstPin('');
    } else {
      setConfirmPin('');
      setStep('ENTER');
    }
  };

  // Keyboard listener on web
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
  }, [step, firstPin, confirmPin]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        {/* User Info Pill */}
        <View style={[styles.userChip, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
          <Ionicons name="person-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.userChipText, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name || 'Spendly User'} ({user?.email})
          </Text>
        </View>

        {/* Shield Icon */}
        <View style={[styles.shieldIconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="keypad" size={26} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {step === 'ENTER' ? 'Create Master PIN' : 'Confirm Master PIN'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {step === 'ENTER'
            ? 'Set a 4-digit code to encrypt and unlock your financial vault.'
            : 'Re-enter your 4-digit code to confirm and encrypt your vault.'}
        </Text>

        {/* Security Importance Notice (DEF-005) */}
        <View style={[styles.vaultWarningBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Ionicons name="shield-checkmark" size={16} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={[styles.vaultWarningText, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: '#D97706' }}>Key Notice: </Text>
            This PIN is the master key for your vault on this device. Even if you sign out, your data remains safely stored and can only be opened with this PIN.
          </Text>
        </View>

        {/* 4 Pin Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < activePin.length;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled ? colors.primary : 'transparent',
                    borderColor: isFilled ? colors.primary : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Error message */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <View style={{ height: 18 }} />
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((key) => {
                const isSpecial = key === 'C' || key === '⌫';
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.keypadKey,
                      {
                        backgroundColor: isSpecial ? colors.background : colors.surface,
                        borderColor: colors.borderSubtle,
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
                      <Ionicons name="backspace-outline" size={20} color={colors.textPrimary} />
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

        {/* Cancel / Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={[styles.signOutText, { color: colors.textMuted }]}>Cancel & Sign out</Text>
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
  userChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  shieldIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  vaultWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  vaultWarningText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    height: 18,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    maxWidth: 260,
    marginTop: 8,
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  keypadKey: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 19,
  },
  signOutBtn: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
