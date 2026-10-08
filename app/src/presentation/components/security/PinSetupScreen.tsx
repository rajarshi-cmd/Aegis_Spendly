import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

export const PinSetupScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, setupPin, signOut } = useAuthSecurity();
  const { width } = useWindowDimensions();

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
        setTimeout(() => {
          setStep('CONFIRM');
        }, 200);
      }
    } else {
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          setupPin(next);
        } else {
          setErrorMessage('PINs did not match. Please try again.');
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
            {user?.name || 'Google User'} ({user?.email})
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
            ? 'Set a 4-digit code to lock and quickly unlock your ledger on this browser.'
            : 'Re-enter your 4-digit code to confirm and encrypt your vault.'}
        </Text>

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
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
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
    marginTop: 20,
    padding: 8,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
