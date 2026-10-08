import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';

export const AuthGateScreen: React.FC = () => {
  const { colors, themeName } = useTheme();
  const { signInWithGoogle } = useAuthSecurity();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [emailInput, setEmailInput] = useState('rajarshi250500@gmail.com');
  const [nameInput, setNameInput] = useState('Rajarshi Giri');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle({
        email: emailInput.trim(),
        name: nameInput.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background radial glow effect */}
      <View style={styles.cardContainer}>
        {/* Security Shield Badge */}
        <View style={[styles.badgePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
          <Text style={styles.badgePillText}>AIR-GAPPED ENCRYPTED VAULT</Text>
        </View>

        <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>Aegis Spendly</Text>
        <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
          Private financial ledger protected by Google OAuth and client-side 4-digit Master PIN encryption.
        </Text>

        {/* Security Features Card */}
        <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="lock-closed" size={15} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Client-Side Encryption</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Data is locked with your private PIN before writing to local vault storage.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="eye-off" size={15} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Tab-Blur & Inactivity Lock</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                The vault locks instantly when switching browser tabs or after 5 minutes of idle time.
              </Text>
            </View>
          </View>
        </View>

        {/* Google Authentication Box */}
        <View style={[styles.authBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.authBoxTitle, { color: colors.textPrimary }]}>Sign in with Google</Text>
          <Text style={[styles.authBoxSub, { color: colors.textMuted }]}>
            Verify your account identity to access your personal ledger.
          </Text>

          {/* Account inputs */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>GOOGLE ACCOUNT EMAIL</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="you@gmail.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>ACCOUNT HOLDER NAME</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your Full Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.googleSignInBtn, { backgroundColor: colors.primary }]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="logo-google" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Security Note */}
        <View style={styles.footerRow}>
          <Ionicons name="finger-print-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Protected by PBKDF2 & SHA-256 Vault Architecture
          </Text>
        </View>
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
  cardContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 420,
  },
  featuresCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  authBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  authBoxTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  authBoxSub: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  googleSignInBtn: {
    marginTop: 6,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
