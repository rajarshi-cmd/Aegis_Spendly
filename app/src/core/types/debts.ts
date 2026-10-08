export type DebtDirection = 'LENT' | 'BORROWED';
export type DebtStatus = 'ACTIVE' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'OVERDUE';
export type DebtUrgency = 'SAFE' | 'APPROACHING' | 'OVERDUE';

export interface Debt {
  id: string;
  counterparty: string;
  direction: DebtDirection;
  principal_amount: number; // Initial amount > 0
  outstanding_balance: number; // Remaining balance >= 0
  settlement_account_id: string; // Foreign reference to settling bank account
  origination_date: string; // ISO-8601 date string
  due_date: string; // ISO-8601 date string
  status: DebtStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDebtInput {
  counterparty: string;
  direction: DebtDirection;
  principal_amount: number;
  settlement_account_id: string;
  due_date: string;
  origination_date?: string;
  notes?: string | null;
}

export interface SettlementRecord {
  id: string;
  debt_id: string;
  amount: number;
  settlement_date: string;
  settlement_account_id: string;
  notes: string | null;
}

export interface CreateSettlementInput {
  debt_id: string;
  amount: number;
  settlement_account_id?: string;
  settlement_date?: string;
  notes?: string | null;
}
