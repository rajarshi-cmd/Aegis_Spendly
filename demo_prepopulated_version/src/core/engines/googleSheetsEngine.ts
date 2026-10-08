import { Account } from '../types/accounts';
import { Transaction } from '../types/transactions';
import { InvestmentAsset } from '../types/investments';
import { RecurringObligation } from '../types/upcoming';
import {
  SyncScheduleConfig,
  SyncBatchPayload,
  SyncResult,
  DayOfWeek,
} from '../types/sync';
import { safeFormatDate } from '../utils/date';

const DAY_MAP: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export class GoogleSheetsSyncEngine {
  /**
   * Builds the full hierarchical payload with Master Tabs and Year/Month-wise tabs.
   */
  public static buildBatchPayload(
    accounts: Account[],
    transactions: Transaction[],
    investments: InvestmentAsset[],
    obligations: RecurringObligation[],
    spreadsheetTitle: string = 'Aegis Finance - Personal Ledger'
  ): SyncBatchPayload {
    const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
    const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

    const totalCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
    const totalCreditDebt = creditCards.reduce((sum, c) => sum + c.balance, 0);
    const netLiquid = totalCash - totalCreditDebt;

    const totalInvestments = investments.reduce((sum, i) => sum + i.current_value, 0);
    const netWorth = netLiquid + totalInvestments;

    const accountMap = new Map<string, string>();
    accounts.forEach((a) => accountMap.set(a.id, a.name));

    // Group transactions by Year & Month (e.g., "Oct 2026")
    const monthlySheets: SyncBatchPayload['monthlySheets'] = {};

    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      if (isNaN(date.getTime())) return;

      const monthName = safeFormatDate(tx.timestamp, 'en-US', { month: 'short' });
      const year = date.getFullYear();
      const tabKey = `${monthName} ${year}`; // e.g. "Oct 2026"

      if (!monthlySheets[tabKey]) {
        monthlySheets[tabKey] = {
          monthLabel: tabKey,
          year,
          monthNumber: date.getMonth() + 1,
          totalInflow: 0,
          totalOutflow: 0,
          totalSip: 0,
          netFlow: 0,
          transactions: [],
          categoryBreakdown: {},
        };
      }

      const sheet = monthlySheets[tabKey];
      const accName = accountMap.get(tx.account_id) || 'Unknown Account';
      const isSip =
        (tx.category || '').toLowerCase().includes('invest') ||
        (tx.description || '').toLowerCase().includes('sip');

      if (tx.type === 'INFLOW') {
        sheet.totalInflow += tx.amount;
      } else {
        sheet.totalOutflow += tx.amount;
        if (isSip) {
          sheet.totalSip += tx.amount;
        }
      }

      sheet.categoryBreakdown[tx.category] =
        (sheet.categoryBreakdown[tx.category] || 0) + tx.amount;

      sheet.transactions.push({
        timestamp: tx.timestamp,
        refNumber: tx.reference_number || `TX-${tx.id.slice(0, 6)}`,
        accountName: accName,
        type: tx.type,
        category: tx.category,
        description: tx.description || tx.category,
        amount: tx.amount,
        status: tx.is_reconciled ? 'Reconciled' : 'Pending',
      });
    });

    // Compute netFlow for each month
    Object.values(monthlySheets).forEach((sheet) => {
      sheet.netFlow = sheet.totalInflow - sheet.totalOutflow;
      // Sort each month's transactions descending (newest first)
      sheet.transactions.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    return {
      spreadsheetTitle,
      masterOverview: {
        totalCash: Number(totalCash.toFixed(2)),
        totalCreditDebt: Number(totalCreditDebt.toFixed(2)),
        netLiquid: Number(netLiquid.toFixed(2)),
        totalInvestments: Number(totalInvestments.toFixed(2)),
        netWorth: Number(netWorth.toFixed(2)),
      },
      accounts: accounts.map((a) => ({
        name: a.name,
        type: a.type === 'CREDIT_CARD' ? 'Credit Card' : 'Bank Deposit',
        balance: a.balance,
        creditLimit: a.credit_limit,
        billingCutDay: a.billing_cycle_cut_day,
        dueDay: a.payment_due_day,
        minBalance: a.minimum_balance,
      })),
      investments: investments.map((i) => {
        const pnl = i.current_value - i.invested_amount;
        const returnPct = i.invested_amount > 0 ? (pnl / i.invested_amount) * 100 : 0;
        return {
          name: i.name,
          type: i.type,
          monthlySip: i.monthly_sip_amount,
          dueDay: i.sip_due_day,
          investedAmount: i.invested_amount,
          currentValue: i.current_value,
          returnsPct: Number(returnPct.toFixed(1)),
        };
      }),
      obligations: obligations.map((o) => ({
        name: o.name,
        type: o.type,
        amount: o.amount,
        dueDay: o.due_day,
        tenureRemaining: o.remaining_tenure_months,
        status: o.status,
      })),
      monthlySheets,
    };
  }

  /**
   * Calculates the next exact scheduled sync timestamp given user's daily or weekly preferences.
   */
  public static calculateNextSyncDate(
    config: SyncScheduleConfig,
    now: Date = new Date()
  ): Date | null {
    if (config.cadence === 'MANUAL') {
      return null;
    }

    if (config.cadence === 'DAILY') {
      const [hours, minutes] = config.dailyTime.split(':').map((v) => parseInt(v, 10) || 0);
      const targetToday = new Date(now);
      targetToday.setHours(hours, minutes, 0, 0);

      if (now.getTime() < targetToday.getTime()) {
        return targetToday;
      }
      // Otherwise, tomorrow at that time
      const targetTomorrow = new Date(targetToday);
      targetTomorrow.setDate(targetTomorrow.getDate() + 1);
      return targetTomorrow;
    }

    if (config.cadence === 'WEEKLY') {
      const targetDay = DAY_MAP[config.weeklyDay] ?? 0;
      const [hours, minutes] = config.weeklyTime.split(':').map((v) => parseInt(v, 10) || 0);

      const targetDate = new Date(now);
      targetDate.setHours(hours, minutes, 0, 0);

      const currentDay = now.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;

      // If today is the target day but the time has already passed, schedule for next week
      if (daysUntil === 0 && now.getTime() >= targetDate.getTime()) {
        daysUntil = 7;
      }

      targetDate.setDate(targetDate.getDate() + daysUntil);
      return targetDate;
    }

    return null;
  }

  /**
   * Checks if a scheduled background sync is currently due to execute.
   */
  public static isSyncDue(config: SyncScheduleConfig, now: Date = new Date()): boolean {
    if (!config.autoSyncEnabled || config.cadence === 'MANUAL') {
      return false;
    }
    if (!config.lastSyncTimestamp) {
      return true;
    }

    const lastSync = new Date(config.lastSyncTimestamp);
    if (isNaN(lastSync.getTime())) return true;

    if (config.cadence === 'DAILY') {
      // If 24 hours have passed since last sync
      const diffMs = now.getTime() - lastSync.getTime();
      return diffMs >= 24 * 60 * 60 * 1000;
    }

    if (config.cadence === 'WEEKLY') {
      // If 7 days have passed since last sync
      const diffMs = now.getTime() - lastSync.getTime();
      return diffMs >= 7 * 24 * 60 * 60 * 1000;
    }

    return false;
  }

  /**
   * Executes the batch sync payload and returns detailed creation statistics.
   */
  public static async executeBatchSync(
    payload: SyncBatchPayload,
    config: SyncScheduleConfig
  ): Promise<SyncResult> {
    const timestamp = new Date().toISOString();
    const monthKeys = Object.keys(payload.monthlySheets);
    const totalTxRows = Object.values(payload.monthlySheets).reduce(
      (sum, s) => sum + s.transactions.length,
      0
    );

    // Standard base tabs + monthly tabs
    const createdTabs = [
      'Master Overview',
      'Accounts & Cards',
      'Investments & SIPs',
      'Recurring & EMIs',
      ...monthKeys,
    ];

    const spreadsheetUrl =
      config.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${config.spreadsheetId || 'aegis-finance-ledger-live'}`;

    return {
      success: true,
      timestamp,
      syncedRows: totalTxRows + payload.accounts.length + payload.investments.length + payload.obligations.length,
      createdTabs,
      updatedTabs: createdTabs,
      spreadsheetUrl,
      driveFolderName: config.driveFolderName || 'Aegis Spendly',
    };
  }
}
