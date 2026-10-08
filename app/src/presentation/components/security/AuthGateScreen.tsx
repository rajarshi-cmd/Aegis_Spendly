import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthSecurity } from '../../hooks/useAuthSecurity';
import { loadAuthSession } from '../../../core/security/cryptoVault';
import { loadUserProfile } from '../../../core/types/profile';

export const AuthGateScreen: React.FC = () => {
  const { colors, themeName } = useTheme();
  const { signInWithGoogle } = useAuthSecurity();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [existingSession, setExistingSession] = useState(() => loadAuthSession());
  const [existingProfile, setExistingProfile] = useState(() => loadUserProfile());
  const hasExistingVault = !!(
    (existingSession && (existingSession.pinHash || existingSession.email)) ||
    (existingProfile && existingProfile.isOnboarded)
  );

  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>(
    hasExistingVault ? 'LOGIN' : 'SIGNUP'
  );
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setExistingSession(loadAuthSession());
    setExistingProfile(loadUserProfile());
  }, []);

  const handleSignIn = async () => {
    if (authMode === 'SIGNUP') {
      if (!emailInput.trim()) {
        Alert.alert('Email Required', 'Please enter your Google account email address.');
        return;
      }
      setIsLoading(true);
      try {
        await signInWithGoogle({
          email: emailInput.trim(),
          name: nameInput.trim() || 'Spendly User',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login existing vault
      setIsLoading(true);
      try {
        await signInWithGoogle({
          email: existingSession?.email || existingProfile?.email || emailInput.trim(),
          name: existingSession?.name || existingProfile?.name || nameInput.trim(),
          username: existingSession?.username || existingProfile?.username,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
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

        {/* Data Loss & Uninstall Warning Banner */}
        <View style={[styles.warningBanner, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.28)' }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.warningTitle}>CRITICAL DATA RETENTION NOTICE</Text>
          </View>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            All financial data is stored <Text style={{ fontWeight: '700', color: colors.textPrimary }}>locally on this device</Text>. If you uninstall this app or clear its storage without linking your Google Drive account, <Text style={{ fontWeight: '700', color: '#EF4444' }}>ALL YOUR ACCOUNTS & BALANCES WILL BE PERMANENTLY LOST</Text>! Link Google Drive in Settings to ensure automated cloud backups.
          </Text>
        </View>

        {/* Mode Selector: Login vs Sign Up */}
        <View style={[styles.modeToggleWrap, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity
            style={[
              styles.modeToggleBtn,
              authMode === 'LOGIN' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setAuthMode('LOGIN')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-in-outline"
              size={16}
              color={authMode === 'LOGIN' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeToggleText,
                { color: authMode === 'LOGIN' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Login (Existing Vault)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleBtn,
              authMode === 'SIGNUP' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setAuthMode('SIGNUP')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-add-outline"
              size={16}
              color={authMode === 'SIGNUP' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeToggleText,
                { color: authMode === 'SIGNUP' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Sign Up (New Vault)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Auth Box */}
        <View style={[styles.authBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {authMode === 'LOGIN' ? (
            <>
              <Text style={[styles.authBoxTitle, { color: colors.textPrimary }]}>Access Existing Vault</Text>
              <Text style={[styles.authBoxSub, { color: colors.textMuted }]}>
                Unlock your local encrypted ledger on this device.
              </Text>

              {hasExistingVault ? (
                <View style={[styles.existingVaultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.vaultHeaderRow}>
                    <Ionicons name="folder-open" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.vaultName, { color: colors.textPrimary }]}>
                        {existingSession?.name || existingProfile?.name || 'Local Vault User'}
                      </Text>
                      <Text style={[styles.vaultEmail, { color: colors.textMuted }]}>
                        {existingSession?.email || existingProfile?.email || 'Local Offline Vault'}
                      </Text>
                      {existingProfile?.username ? (
                        <Text style={[styles.vaultHandle, { color: colors.primary }]}>
                          @{existingProfile.username}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.vaultStatusPill, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>SAVED ON DEVICE</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.noVaultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="alert-circle-outline" size={22} color={colors.warningText || '#F59E0B'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.noVaultTitle, { color: colors.textPrimary }]}>
                      No Local Vault Found
                    </Text>
                    <Text style={[styles.noVaultSub, { color: colors.textMuted }]}>
                      No pre-existing ledger database was found on this device. If this is a fresh install, please create a new vault.
                    </Text>
                  </View>
                </View>
              )}

              {/* Login Action Button */}
              {hasExistingVault ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="key-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.btnText}>Unlock Existing Vault</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setAuthMode('SIGNUP')}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnContent}>
                    <Ionicons name="person-add-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Create New Vault Instead</Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.authBoxTitle, { color: colors.textPrimary }]}>Create New Vault</Text>
              <Text style={[styles.authBoxSub, { color: colors.textMuted }]}>
                Initialize a clean, encrypted database on this device.
              </Text>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>GOOGLE ACCOUNT EMAIL *</Text>
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

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>YOUR FULL NAME</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Create Vault & Setup PIN</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Features card */}
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
              <Ionicons name="cloud-upload" size={15} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Google Drive Safe Sync</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Only syncs to your personal Google Drive in your dedicated folder.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Security Note */}
        <View style={styles.footerRow}>
          <Ionicons name="finger-print-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Protected by PBKDF2 & SHA-256 Vault Architecture
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 36,
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
    marginBottom: 16,
    maxWidth: 420,
  },
  warningBanner: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  authBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
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
  existingVaultCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultName: {
    fontSize: 14,
    fontWeight: '700',
  },
  vaultEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  vaultHandle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  vaultStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noVaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  noVaultTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  noVaultSub: {
    fontSize: 11,
    lineHeight: 15,
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
  actionBtn: {
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
  featuresCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
