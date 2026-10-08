export type AvatarId = 'Moon cat' | 'Forest rabbit' | 'Little ghost' | 'Star mage';

export interface UserProfile {
  name: string;
  handle: string;
  email: string;
  avatar: AvatarId;
  salary_amount: number;
  salary_day: number;
  salary_account_id: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Aarav Mehta',
  handle: '@_aarav',
  email: 'aarav@spendly.app',
  avatar: 'Moon cat',
  salary_amount: 148000,
  salary_day: 1,
  salary_account_id: 'bank-icici',
};
