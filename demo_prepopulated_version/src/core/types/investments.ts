export type InvestmentType = 'SIP' | 'MUTUAL_FUND' | 'STOCKS' | 'GOLD' | 'FIXED_DEPOSIT';

export interface InvestmentAsset {
  id: string;
  name: string;
  type: InvestmentType;
  monthly_sip_amount: number | null;
  sip_due_day: number | null; // Day of month 1-31
  linked_account_id: string | null;
  invested_amount: number;
  current_value: number;
  last_sip_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestmentInput {
  name: string;
  type: InvestmentType;
  monthly_sip_amount?: number | null;
  sip_due_day?: number | null;
  linked_account_id?: string | null;
  invested_amount?: number;
  current_value?: number;
  notes?: string | null;
}
