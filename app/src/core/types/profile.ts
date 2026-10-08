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

const PROFILE_STORAGE_KEY = 'aegis_user_profile_data';
let memoryProfileStorage: string | null = null;

export function saveUserProfile(profile: UserProfile): void {
  try {
    const data = JSON.stringify(profile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, data);
    } else {
      memoryProfileStorage = data;
    }
  } catch (e) {
    console.warn('[UserProfile] Failed to persist user profile', e);
  }
}

export function loadUserProfile(): UserProfile | null {
  try {
    let data: string | null = null;
    if (typeof localStorage !== 'undefined') {
      data = localStorage.getItem(PROFILE_STORAGE_KEY);
    } else {
      data = memoryProfileStorage;
    }
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
    memoryProfileStorage = null;
  } catch (e) {
    console.warn('[UserProfile] Failed to clear user profile', e);
  }
}
