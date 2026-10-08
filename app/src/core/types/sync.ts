export type SyncCadence = 'MANUAL' | 'DAILY' | 'WEEKLY';

export type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

export interface SyncScheduleConfig {
  cadence: SyncCadence;
  dailyTime: string; // "HH:mm" in 24hr format, e.g. "22:00" (10:00 PM)
  weeklyDay: DayOfWeek; // e.g. "SUNDAY"
  weeklyTime: string; // "HH:mm" in 24hr format, e.g. "23:00" (11:00 PM)
  lastSyncTimestamp: string | null;
  spreadsheetId: string | null;
  spreadsheetTitle: string;
  spreadsheetUrl: string | null;
  googleEmail: string | null;
  isConnected: boolean;
  autoSyncEnabled: boolean;
}

export interface SyncBatchPayload {
  spreadsheetTitle: string;
  masterOverview: {
    totalCash: number;
    totalCreditDebt: number;
    netLiquid: number;
    totalInvestments: number;
    netWorth: number;
  };
  accounts: Array<{
    name: string;
    type: string;
    balance: number;
    creditLimit: number | null;
    billingCutDay: number | null;
    dueDay: number | null;
    minBalance: number | null;
  }>;
  investments: Array<{
    name: string;
    type: string;
    monthlySip: number | null;
    dueDay: number | null;
    investedAmount: number;
    currentValue: number;
    returnsPct: number;
  }>;
  obligations: Array<{
    name: string;
    type: string;
    amount: number;
    dueDay: number;
    tenureRemaining: number | null;
    status: string;
  }>;
  // Year & Month-wise grouped sheets: key is e.g. "Oct 2026", "Nov 2026"
  monthlySheets: Record<
    string,
    {
      monthLabel: string;
      year: number;
      monthNumber: number;
      totalInflow: number;
      totalOutflow: number;
      totalSip: number;
      netFlow: number;
      transactions: Array<{
        timestamp: string;
        refNumber: string;
        accountName: string;
        type: string;
        category: string;
        description: string;
        amount: number;
        status: string;
      }>;
      categoryBreakdown: Record<string, number>;
    }
  >;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  syncedRows: number;
  createdTabs: string[];
  updatedTabs: string[];
  spreadsheetUrl: string;
  error?: string;
}

export const DEFAULT_SYNC_CONFIG: SyncScheduleConfig = {
  cadence: 'DAILY',
  dailyTime: '22:00', // 10:00 PM
  weeklyDay: 'SUNDAY',
  weeklyTime: '23:00', // 11:00 PM
  lastSyncTimestamp: null,
  spreadsheetId: 'aegis-finance-ledger-live',
  spreadsheetTitle: 'Aegis Finance - Personal Ledger',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1AegisFinancePersonalLedgerTemplate',
  googleEmail: 'aarav.mehta@gmail.com',
  isConnected: true,
  autoSyncEnabled: true,
};
