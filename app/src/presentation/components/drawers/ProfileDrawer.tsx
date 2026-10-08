import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { UserProfile, AvatarId } from '../../../core/types/profile';
import { Account } from '../../../core/types/accounts';
import { formatRupee } from '../../../core/utils/currency';
import { PinVerificationModal } from '../modals/PinVerificationModal';

interface ProfileDrawerProps {
  visible: boolean;
  profile: UserProfile;
  accounts: Account[];
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenAddCard: () => void;
  onOpenAddBank: () => void;
  onEditAccount: (acc: Account) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  visible,
  profile,
  accounts,
  onClose,
  onUpdateProfile,
  onOpenAddCard,
  onOpenAddBank,
  onEditAccount,
}) => {
  const { colors } = useTheme();

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || 'rajarshi');
  const [driveFolder, setDriveFolder] = useState(profile.driveFolderName || 'Aegis Spendly');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(profile.avatar);
  const [salaryAmount, setSalaryAmount] = useState(profile.salary_amount.toString());
  const [salaryDay, setSalaryDay] = useState(profile.salary_day.toString().padStart(2, '0'));
  const [salaryAcc, setSalaryAcc] = useState(profile.salary_account_id);
  const [salarySavedToast, setSalarySavedToast] = useState(false);
  const [showPinForDriveFolder, setShowPinForDriveFolder] = useState(false);
  const [showPinForGoogleAccount, setShowPinForGoogleAccount] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [newGoogleEmail, setNewGoogleEmail] = useState(profile.email || '');
  const [newGoogleName, setNewGoogleName] = useState(profile.name || '');

  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const avatarOptions: { id: AvatarId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'Moon cat', label: 'Moon cat', icon: 'paw' },
    { id: 'Forest rabbit', label: 'Forest rabbit', icon: 'leaf' },
    { id: 'Little ghost', label: 'Little ghost', icon: 'happy' },
    { id: 'Star mage', label: 'Star mage', icon: 'sparkles' },
    { id: 'Custom Google', label: 'Custom Google', icon: 'logo-google' },
  ];

  const handleSaveSalary = () => {
    const num = parseFloat(salaryAmount) || 148000;
    const day = parseInt(salaryDay, 10) || 1;
    onUpdateProfile({
      salary_amount: num,
      salary_day: day,
      salary_account_id: salaryAcc,
    });
    setSalarySavedToast(true);
    setTimeout(() => setSalarySavedToast(false), 2000);
  };

  const commitProfileChanges = (overrideDriveFolder?: string) => {
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    onUpdateProfile({
      name: name.trim() || profile.name,
      username: cleanUser || profile.username,
      handle: `@${cleanUser || profile.username}`,
      driveFolderName: (overrideDriveFolder ?? driveFolder).trim() || 'Aegis Spendly',
      avatar: selectedAvatar,
    });
    onClose();
  };

  const handleDone = () => {
    const isDriveChanged = driveFolder.trim() !== (profile.driveFolderName || 'Aegis Spendly');
    if (isDriveChanged) {
      setShowPinForDriveFolder(true);
      return;
    }
    commitProfileChanges();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
                <View>
                  <Text style={[styles.microHeader, { color: colors.textMuted }]}>YOUR ACCOUNT</Text>
                  <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Profile</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Banner Card */}
                <View style={[styles.profileBanner, { backgroundColor: colors.primaryLight }]}>
                  <View style={[styles.bannerAvatar, { backgroundColor: colors.surface }]}>
                    <Ionicons
                      name={
                        selectedAvatar === 'Forest rabbit'
                          ? 'leaf'
                          : selectedAvatar === 'Little ghost'
                          ? 'happy'
                          : selectedAvatar === 'Star mage'
                          ? 'sparkles'
                          : selectedAvatar === 'Custom Google'
                          ? 'logo-google'
                          : 'paw'
                      }
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={[styles.bannerName, { color: colors.textPrimary }]}>{profile.name}</Text>
                    <Text style={[styles.bannerEmail, { color: colors.textMuted }]}>{profile.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.switchAccountBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
                    onPress={() => {
                      setNewGoogleEmail(profile.email || '');
                      setNewGoogleName(profile.name || '');
                      setShowPinForGoogleAccount(true);
                    }}
                  >
                    <Ionicons name="logo-google" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.switchAccountBtnText, { color: colors.primary }]}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Personal Details */}
                <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>PERSONAL DETAILS</Text>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display name</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vault Username</Text>
                    <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', borderColor: colors.border }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700', marginRight: 4 }}>@</Text>
                      <TextInput
                        style={{ flex: 1, color: colors.textPrimary }}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Google Drive Storage Folder</Text>
                    <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', borderColor: colors.border }]}>
                      <Ionicons name="folder-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                      <TextInput
                        style={{ flex: 1, color: colors.textPrimary }}
                        value={driveFolder}
                        onChangeText={setDriveFolder}
                        placeholder="Aegis Spendly"
                      />
                    </View>
                  </View>
                </View>

                {/* Choose an Avatar */}
                <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 20 }]}>
                  CHOOSE AN AVATAR
                </Text>
                <View style={styles.avatarGrid}>
                  {avatarOptions.map((opt) => {
                    const isSelected = selectedAvatar === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.avatarCard,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                          },
                        ]}
                        onPress={() => setSelectedAvatar(opt.id)}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.avatarLabel,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.primary}
                            style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Recurring Salary */}
                <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 20 }]}>
                  RECURRING SALARY
                </Text>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly amount</Text>
                    <View style={[styles.currencyInputWrap, { borderColor: colors.border }]}>
                      <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
                      <TextInput
                        style={[styles.currencyInput, { color: colors.textPrimary }]}
                        value={salaryAmount}
                        onChangeText={setSalaryAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credit date</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                      value={salaryDay}
                      onChangeText={setSalaryDay}
                      keyboardType="numeric"
                      placeholder="01"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credited to bank</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {bankAccounts.map((b) => {
                      const isSelected = salaryAcc === b.id || salaryAcc === b.name;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.smallChip,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                            },
                          ]}
                          onPress={() => setSalaryAcc(b.id)}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? colors.primary : colors.textPrimary,
                            }}
                          >
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveSalaryBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleSaveSalary}
                >
                  <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.saveSalaryText, { color: colors.primary }]}>
                    {salarySavedToast ? 'Saved!' : 'Save recurring salary'}
                  </Text>
                </TouchableOpacity>

                {/* Credit Cards Section */}
                <View style={[styles.subHeaderRow, { marginTop: 22 }]}>
                  <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CREDIT CARDS</Text>
                  <TouchableOpacity onPress={onOpenAddCard}>
                    <Text style={[styles.actionLink, { color: colors.primary }]}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardsList}>
                  {creditCards.map((c) => (
                    <View key={c.id} style={[styles.listItem, { borderBottomColor: colors.borderSubtle }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="card-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.listItemTitle, { color: colors.textPrimary }]}>{c.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => onEditAccount(c)}>
                        <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Bank Balances Section */}
                <View style={[styles.subHeaderRow, { marginTop: 22 }]}>
                  <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>BANK BALANCES</Text>
                  <TouchableOpacity onPress={onOpenAddBank}>
                    <Text style={[styles.actionLink, { color: colors.primary }]}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardsList}>
                  {bankAccounts.map((b) => (
                    <View key={b.id} style={[styles.listItem, { borderBottomColor: colors.borderSubtle }]}>
                      <View>
                        <Text style={[styles.listItemTitle, { color: colors.textPrimary }]}>{b.name}</Text>
                        <Text style={[styles.listItemSub, { color: colors.textMuted }]}>
                          Balance: {formatRupee(b.balance)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => onEditAccount(b)}>
                        <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Bottom Actions */}
              <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={handleDone}>
                  <Text style={styles.doneBtnText}>Done ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      {/* PIN Verification before saving Google Drive Folder update */}
      <PinVerificationModal
        visible={showPinForDriveFolder}
        title="Security Verification"
        subtitle="Enter your 4-digit Master PIN to update the Google Drive backup folder path."
        iconName="folder"
        onSuccess={() => {
          setShowPinForDriveFolder(false);
          commitProfileChanges();
        }}
        onCancel={() => setShowPinForDriveFolder(false)}
      />

      {/* PIN Verification before changing linked Google Account */}
      <PinVerificationModal
        visible={showPinForGoogleAccount}
        title="Security Verification"
        subtitle="Enter your 4-digit Master PIN to change your linked Google account."
        iconName="logo-google"
        onSuccess={() => {
          setShowPinForGoogleAccount(false);
          setShowEditAccountModal(true);
        }}
        onCancel={() => setShowPinForGoogleAccount(false)}
      />

      {/* Modal to update linked Google Account details */}
      <Modal
        visible={showEditAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditAccountModal(false)}
      >
        <View style={styles.centerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowEditAccountModal(false)}
          />
          <View style={[styles.editAccountCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} pointerEvents="auto">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.googleIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="logo-google" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.editAccountTitle, { color: colors.textPrimary }]}>Linked Google Account</Text>
                  <Text style={[styles.editAccountSub, { color: colors.textMuted }]}>Update associated Drive identity</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowEditAccountModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account Full Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={newGoogleName}
                onChangeText={setNewGoogleName}
                placeholder="Rajarshi Giri"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Google Account Email</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={newGoogleEmail}
                onChangeText={setNewGoogleEmail}
                placeholder="example@gmail.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtnOutline, { borderColor: colors.borderSubtle }]}
                onPress={() => setShowEditAccountModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveAccountBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onUpdateProfile({
                    name: newGoogleName.trim() || profile.name,
                    email: newGoogleEmail.trim() || profile.email,
                  });
                  setName(newGoogleName.trim() || profile.name);
                  setShowEditAccountModal(false);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Save Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 24,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  bannerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveSalaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  saveSalaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardsList: {
    gap: 2,
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  listItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  drawerFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  doneBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchAccountBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
  },
  editAccountCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAccountTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editAccountSub: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAccountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
