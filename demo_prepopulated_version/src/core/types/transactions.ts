export type TransactionType = 'INFLOW' | 'OUTFLOW' | 'TRANSFER';
export type TransactionSource = 'MANUAL' | 'SYSTEM' | 'IMPORT';
export type SyncStatus = 'LOCAL_ONLY' | 'SYNCED';

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number; // Strictly positive amount
  category: string;
  description: string | null;
  timestamp: string; // ISO-8601 string
  is_reconciled: boolean;
  reference_number: string | null;
  source: TransactionSource;
  sync_status: SyncStatus;
  destination_account_id: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface CreateTransactionInput {
  account_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  timestamp?: string;
  is_reconciled?: boolean;
  reference_number?: string | null;
  source?: TransactionSource;
  destination_account_id?: string | null;
}

export interface TransactionFilter {
  accountId?: string;
  type?: TransactionType | 'ALL';
  category?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}
