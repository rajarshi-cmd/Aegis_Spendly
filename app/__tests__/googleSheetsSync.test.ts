import { describe, test, expect } from '@jest/globals';
import { GoogleSheetsSyncEngine } from '../src/core/engines/googleSheetsEngine';
import { Account } from '../src/core/types/accounts';
import { Transaction } from '../src/core/types/transactions';
import { InvestmentAsset } from '../src/core/types/investments';
import { RecurringObligation } from '../src/core/types/upcoming';
import { DEFAULT_SYNC_CONFIG, SyncScheduleConfig } from '../src/core/types/sync';

describe('GoogleSheetsSyncEngine: Schedule Calculation, Year-Month Tabs, and Batching', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'HDFC Checking',
      type: 'BANK_DEPOSIT',
      balance: 45000,
      credit_limit: null,
      billing_cycle_cut_day: null,
      payment_due_day: null,
      minimum_balance: 10000,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'acc-2',
      name: 'Axis Coral',
      type: 'CREDIT_CARD',
      balance: 12000,
      credit_limit: 100000,
      billing_cycle_cut_day: 15,
      payment_due_day: 5,
      minimum_balance: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const mockInvestments: InvestmentAsset[] = [
    {
      id: 'inv-1',
      name: 'Parag Parikh Flexi Cap',
      type: 'SIP',
      invested_amount: 50000,
      current_value: 62000,
      monthly_sip_amount: 5000,
      sip_due_day: 10,
      linked_account_id: 'acc-1',
      last_sip_date: '2026-10-10T00:00:00Z',
      notes: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const mockObligations: RecurringObligation[] = [
    {
      id: 'ob-1',
      name: 'Home WiFi',
      type: 'SUBSCRIPTION',
      amount: 1199,
      due_day: 12,
      linked_account_id: 'acc-1',
      category: 'Utilities',
      total_tenure_months: null,
      remaining_tenure_months: null,
      principal_amount: null,
      interest_rate: null,
      last_paid_date: null,
      status: 'ACTIVE',
      notes: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      account_id: 'acc-1',
      type: 'INFLOW',
      amount: 80000,
      category: 'Salary',
      description: 'Monthly Salary Credit',
      timestamp: '2026-10-01T09:00:00.000Z',
      is_reconciled: true,
      reference_number: 'SAL-1026',
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    {
      id: 'tx-2',
      account_id: 'acc-2',
      type: 'OUTFLOW',
      amount: 4500,
      category: 'Food & drinks',
      description: 'Dinner with Team',
      timestamp: '2026-10-05T20:30:00.000Z',
      is_reconciled: true,
      reference_number: 'DIN-5541',
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    {
      id: 'tx-3',
      account_id: 'acc-1',
      type: 'OUTFLOW',
      amount: 3200,
      category: 'Shopping',
      description: 'Shoes',
      timestamp: '2026-09-20T14:15:00.000Z', // Different month (Sep 2026)
      is_reconciled: true,
      reference_number: 'SHP-8891',
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
  ];

  test('buildBatchPayload creates master overview and partitions transactions into Year-Month tabs', () => {
    const payload = GoogleSheetsSyncEngine.buildBatchPayload(
      mockAccounts,
      mockTransactions,
      mockInvestments,
      mockObligations
    );

    // Master Overview Checks
    expect(payload.masterOverview.totalCash).toBe(45000);
    expect(payload.masterOverview.totalCreditDebt).toBe(12000);
    expect(payload.masterOverview.netLiquid).toBe(33000);
    expect(payload.masterOverview.totalInvestments).toBe(62000);
    expect(payload.masterOverview.netWorth).toBe(95000);

    // Monthly tabs checks: should have both "Oct 2026" and "Sep 2026"
    const monthKeys = Object.keys(payload.monthlySheets);
    expect(monthKeys).toContain('Oct 2026');
    expect(monthKeys).toContain('Sep 2026');

    // October 2026 tab calculations
    const octSheet = payload.monthlySheets['Oct 2026'];
    expect(octSheet.totalInflow).toBe(80000);
    expect(octSheet.totalOutflow).toBe(4500);
    expect(octSheet.netFlow).toBe(75500);
    expect(octSheet.transactions.length).toBe(2);
    expect(octSheet.transactions[0].description).toBe('Dinner with Team'); // Newer first (Oct 5 > Oct 1)

    // September 2026 tab
    const sepSheet = payload.monthlySheets['Sep 2026'];
    expect(sepSheet.totalOutflow).toBe(3200);
    expect(sepSheet.transactions.length).toBe(1);
    expect(sepSheet.transactions[0].description).toBe('Shoes');
  });

  test('Calculates next daily sync date correctly', () => {
    // Current time: 14:00 (2:00 PM) on Oct 8, 2026
    const mockNow = new Date('2026-10-08T14:00:00.000Z');

    const config: SyncScheduleConfig = {
      ...DEFAULT_SYNC_CONFIG,
      cadence: 'DAILY',
      dailyTime: '22:00', // 10:00 PM (later today)
    };

    const nextSync = GoogleSheetsSyncEngine.calculateNextSyncDate(config, mockNow);
    expect(nextSync).not.toBeNull();
    expect(nextSync?.getHours()).toBe(22);
    expect(nextSync?.getMinutes()).toBe(0);
    expect(nextSync?.getDate()).toBe(8); // Today

    // If target time has already passed today (e.g. 10:00 AM)
    const configPast: SyncScheduleConfig = {
      ...DEFAULT_SYNC_CONFIG,
      cadence: 'DAILY',
      dailyTime: '10:00', // 10:00 AM (already passed)
    };

    const nextSyncTomorrow = GoogleSheetsSyncEngine.calculateNextSyncDate(configPast, mockNow);
    expect(nextSyncTomorrow).not.toBeNull();
    expect(nextSyncTomorrow?.getDate()).toBe(9); // Tomorrow
  });

  test('Calculates next weekly sync day and time correctly', () => {
    // Oct 8, 2026 is a Thursday (Day 4)
    const mockNow = new Date('2026-10-08T12:00:00.000Z');

    const config: SyncScheduleConfig = {
      ...DEFAULT_SYNC_CONFIG,
      cadence: 'WEEKLY',
      weeklyDay: 'SUNDAY', // Next Sunday is Oct 11, 2026
      weeklyTime: '23:00',
    };

    const nextSync = GoogleSheetsSyncEngine.calculateNextSyncDate(config, mockNow);
    expect(nextSync).not.toBeNull();
    expect(nextSync?.getDay()).toBe(0); // Sunday
    expect(nextSync?.getDate()).toBe(11); // Oct 11
    expect(nextSync?.getHours()).toBe(23);
  });

  test('Manual cadence returns null for next scheduled sync', () => {
    const config: SyncScheduleConfig = {
      ...DEFAULT_SYNC_CONFIG,
      cadence: 'MANUAL',
    };
    const nextSync = GoogleSheetsSyncEngine.calculateNextSyncDate(config);
    expect(nextSync).toBeNull();
  });

  test('executeBatchSync returns valid result with all tabs and rows count', async () => {
    const payload = GoogleSheetsSyncEngine.buildBatchPayload(
      mockAccounts,
      mockTransactions,
      mockInvestments,
      mockObligations
    );

    const result = await GoogleSheetsSyncEngine.executeBatchSync(payload, DEFAULT_SYNC_CONFIG);

    expect(result.success).toBe(true);
    expect(result.createdTabs).toContain('Master Overview');
    expect(result.createdTabs).toContain('Accounts & Cards');
    expect(result.createdTabs).toContain('Investments & SIPs');
    expect(result.createdTabs).toContain('Recurring & EMIs');
    expect(result.createdTabs).toContain('Oct 2026');
    expect(result.createdTabs).toContain('Sep 2026');
    expect(result.syncedRows).toBeGreaterThan(0);
    expect(result.spreadsheetUrl).toContain('docs.google.com/spreadsheets');
  });
});
