export type AccountType = 'BANK_DEPOSIT' | 'CREDIT_CARD';

export interface Account {
  id: string;
  name: string; // Nickname / user-defined label
  type: AccountType;
  balance: number; // Liquid cash for bank accounts; current unpaid debt for credit cards
  credit_limit: number | null;
  billing_cycle_cut_day: number | null; // Bill generate / cut day (1-31)
  payment_due_day: number | null; // Bill due date (1-31)
  minimum_balance: number | null; // Minimum balance required for bank accounts
  keep_track_ratio?: number | null; // User custom utilization threshold (e.g. 50 or 60), default 50
  card_color?: 'EMERALD' | 'PURPLE' | 'CARAMEL' | null;
  last4?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  credit_limit?: number | null;
  billing_cycle_cut_day?: number | null;
  payment_due_day?: number | null;
  minimum_balance?: number | null;
  keep_track_ratio?: number | null;
  card_color?: 'EMERALD' | 'PURPLE' | 'CARAMEL' | null;
  last4?: string | null;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  credit_limit?: number | null;
  billing_cycle_cut_day?: number | null;
  payment_due_day?: number | null;
  minimum_balance?: number | null;
  keep_track_ratio?: number | null;
  card_color?: 'EMERALD' | 'PURPLE' | 'CARAMEL' | null;
  last4?: string | null;
}
