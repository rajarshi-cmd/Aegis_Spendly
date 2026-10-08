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
  driveFolderId: string | null;
  driveFolderName: string;
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

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingCooldownMs: number;
  executionsInLastHour: number;
  maxPerHour: number;
  executionsInLastDay: number;
  maxPerDay: number;
  penaltyActive: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  nextAllowedTimestamp?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  syncedRows: number;
  createdTabs: string[];
  updatedTabs: string[];
  spreadsheetUrl: string;
  driveFolderName?: string;
  rateLimitStatus?: RateLimitCheckResult;
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
  driveFolderId: 'aegis-spendly-folder',
  driveFolderName: 'Aegis Spendly',
  googleEmail: 'rajarshi250500@gmail.com',
  isConnected: true,
  autoSyncEnabled: true,
};

import { kvStorage } from '../storage/kvStorage';

const SYNC_CONFIG_STORAGE_KEY = 'aegis_sync_config_data';

export function saveSyncConfig(config: SyncScheduleConfig): void {
  try {
    const data = JSON.stringify(config);
    kvStorage.setItem(SYNC_CONFIG_STORAGE_KEY, data);
  } catch (e) {
    console.warn('[SyncConfig] Failed to save sync config', e);
  }
}

export function loadSyncConfig(): SyncScheduleConfig | null {
  try {
    const data = kvStorage.getItem(SYNC_CONFIG_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as SyncScheduleConfig;
    }
  } catch (e) {
    console.warn('[SyncConfig] Failed to load sync config', e);
  }
  return null;
}

