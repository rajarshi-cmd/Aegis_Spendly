export type AvatarId = 'Moon cat' | 'Forest rabbit' | 'Little ghost' | 'Star mage' | 'Custom Google';

export interface UserProfile {
  name: string;
  username: string;
  handle: string;
  email: string;
  avatar: AvatarId;
  photoUrl?: string;
  salary_amount: number;
  salary_day: number;
  salary_account_id: string;
  isOnboarded: boolean;
  driveFolderId?: string;
  driveFolderName: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  username: '',
  handle: '',
  email: '',
  avatar: 'Moon cat',
  salary_amount: 0,
  salary_day: 1,
  salary_account_id: '',
  isOnboarded: false,
  driveFolderId: 'aegis-spendly-folder',
  driveFolderName: 'Aegis Spendly',
};

import { kvStorage } from '../storage/kvStorage';

const PROFILE_STORAGE_KEY = 'aegis_user_profile_data';

export function saveUserProfile(profile: UserProfile): void {
  try {
    const data = JSON.stringify(profile);
    kvStorage.setItem(PROFILE_STORAGE_KEY, data);
  } catch (e) {
    console.warn('[UserProfile] Failed to persist user profile', e);
  }
}

export function loadUserProfile(): UserProfile | null {
  try {
    const data = kvStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as UserProfile;
    }
  } catch (e) {
    console.warn('[UserProfile] Failed to load user profile', e);
  }
  return null;
}

export function clearUserProfile(): void {
  try {
    kvStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (e) {
    console.warn('[UserProfile] Failed to clear user profile', e);
  }
}
