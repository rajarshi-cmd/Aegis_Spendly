export type ObligationType = 'SUBSCRIPTION' | 'EMI' | 'LOAN';
export type ObligationStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';

export interface RecurringObligation {
  id: string;
  name: string;
  type: ObligationType;
  amount: number; // Monthly installment or subscription fee
  due_day: number; // Day of month 1-31
  linked_account_id: string;
  total_tenure_months: number | null;
  remaining_tenure_months: number | null;
  principal_amount: number | null;
  interest_rate: number | null; // e.g. 8.5 for 8.5%
  last_paid_date: string | null;
  status: ObligationStatus;
  category?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateObligationInput {
  name: string;
  type: ObligationType;
  amount: number;
  due_day: number;
  linked_account_id: string;
  category?: string | null;
  total_tenure_months?: number | null;
  remaining_tenure_months?: number | null;
  principal_amount?: number | null;
  interest_rate?: number | null;
  notes?: string | null;
}

export interface PlannedBudget {
  id: string;
  category: string;
  planned_amount: number;
  month?: string; // e.g. "2026-10"
}
