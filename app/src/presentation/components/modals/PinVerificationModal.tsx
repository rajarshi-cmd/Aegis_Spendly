import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

interface PinVerificationModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  visible,
  title = 'Security Verification',
  subtitle = 'Enter your 4-digit Master PIN to continue.',
  iconName = 'shield-checkmark',
  onSuccess,
  onCancel,
}) => {
  const { colors } = useTheme();
  const { user, verifyCurrentPin } = useAuthSecurity();

  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMessage(null);
      setIsVerifying(false);
    }
  }, [visible]);

  const handleDigit = async (digit: string) => {
    if (isVerifying || pin.length >= 4) return;
    setErrorMessage(null);
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setIsVerifying(true);
      const isValid = await verifyCurrentPin(nextPin);
      if (isValid) {
        setIsVerifying(false);
        setPin('');
        onSuccess();
      } else {
        setErrorMessage('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setPin('');
          setIsVerifying(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    setErrorMessage(null);
    setPin('');
  };

  // Listen to physical keyboard on Web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, pin, isVerifying]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} pointerEvents="auto">
          {/* Top Bar with Close */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Shield Icon Box */}
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name={iconName} size={28} color={colors.primary} />
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

          {/* PIN Dots Row */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      borderColor: errorMessage
                        ? '#EF4444'
                        : isFilled
                        ? colors.primary
                        : colors.borderSubtle,
                      backgroundColor: isFilled
                        ? errorMessage
                          ? '#EF4444'
                          : colors.primary
                        : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Keypad Grid */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', 'DEL'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((val) => {
                  if (val === 'C') {
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[styles.keyBtn, styles.specialKey]}
                        onPress={handleClear}
                        disabled={isVerifying}
                      >
                        <Text style={[styles.specialKeyText, { color: colors.textMuted }]}>Clear</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (val === 'DEL') {
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[styles.keyBtn, styles.specialKey]}
                        onPress={handleBackspace}
                        disabled={isVerifying}
                      >
                        <Ionicons name="backspace-outline" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.keyBtn, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
                      onPress={() => handleDigit(val)}
                      disabled={isVerifying}
                    >
                      <Text style={[styles.keyText, { color: colors.textPrimary }]}>{val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 24,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 22,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    marginTop: 8,
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
  },
  specialKey: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  specialKeyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
