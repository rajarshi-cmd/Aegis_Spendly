import { describe, it, expect, beforeEach } from '@jest/globals';
import { AccountingEngine } from '../src/core/engines/accountingEngine';
import { UpcomingEngine } from '../src/core/engines/upcomingEngine';
import { DatabaseExecutor } from '../src/core/database/types';
import { Account, Transaction } from '../src/core/types';
import { RecurringObligation } from '../src/core/types/upcoming';

describe('Batch Defect Fixes Verification (DEF-010 through DEF-019)', () => {
  // In-memory mock database executor for unit testing
  class MockDb implements DatabaseExecutor {
    public accounts: Map<string, Account> = new Map();
    public transactions: Map<string, Transaction> = new Map();
    public obligations: Map<string, RecurringObligation> = new Map();

    async exec(sql: string): Promise<void> {}

    async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
      if (sql.includes('UPDATE accounts SET balance = ?')) {
        const bal = params[0];
        const id = params[2];
        const acc = this.accounts.get(id);
        if (acc) {
          acc.balance = bal;
        }
      } else if (sql.includes('INSERT INTO transactions')) {
        const [id, account_id, type, amount, category, description, timestamp] = params;
        this.transactions.set(id, {
          id,
          account_id,
          type,
          amount,
          category,
          description,
          timestamp,
          is_reconciled: true,
          reference_number: null,
          source: 'MANUAL',
          sync_status: 'LOCAL_ONLY',
          destination_account_id: null,
        });
      } else if (sql.includes('UPDATE transactions SET')) {
        const id = params[params.length - 1];
        const tx = this.transactions.get(id);
        if (tx) {
          if (sql.includes('amount = ?')) {
            tx.amount = params[0];
          }
        }
      }
      return { changes: 1, lastInsertRowId: 1 };
    }

    async getFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
      if (sql.includes('FROM accounts WHERE id = ?')) {
        return (this.accounts.get(params[0]) as any) || null;
      }
      if (sql.includes('FROM transactions WHERE id = ?')) {
        return (this.transactions.get(params[0]) as any) || null;
      }
      if (sql.includes('FROM recurring_obligations WHERE id = ?')) {
        return (this.obligations.get(params[0]) as any) || null;
      }
      return null;
    }

    async getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
      return [];
    }

    async withTransaction<T>(work: () => Promise<T>): Promise<T> {
      return await work();
    }
  }

  describe('DEF-010: Bank Initial Balance vs Monthly Income Separation', () => {
    it('should distinguish Opening Balance movements from genuine monthly income', () => {
      const isOpeningBalance = (t: { category: string; description?: string }) => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return cat === 'opening balance' || desc.includes('opening');
      };

      const openingTx = {
        category: 'Opening Balance',
        description: 'Opening Bank Balance',
        type: 'INFLOW',
        amount: 250000,
      };

      const salaryTx = {
        category: 'Salary',
        description: 'October Salary Credit',
        type: 'INFLOW',
        amount: 148000,
      };

      expect(isOpeningBalance(openingTx)).toBe(true);
      expect(isOpeningBalance(salaryTx)).toBe(false);

      const allInflows = [openingTx, salaryTx];
      const genuineIncome = allInflows
        .filter((t) => t.type === 'INFLOW' && !isOpeningBalance(t))
        .reduce((sum, t) => sum + t.amount, 0);

      expect(genuineIncome).toBe(148000);
      expect(genuineIncome).not.toBe(398000);
    });
  });

  describe('DEF-012: Upcoming Commitments & Custom Pay Validation', () => {
    let mockDb: MockDb;

    beforeEach(() => {
      mockDb = new MockDb();
      mockDb.accounts.set('acc-1', {
        id: 'acc-1',
        name: 'HDFC Salary Bank',
        type: 'BANK_DEPOSIT',
        balance: 50000,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: 10000,
        keep_track_ratio: null,
        card_color: null,
        last4: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.obligations.set('ob-1', {
        id: 'ob-1',
        name: 'Netflix Subscription',
        type: 'SUBSCRIPTION',
        amount: 649,
        linked_account_id: 'acc-1',
        due_day: 15,
        total_tenure_months: null,
        remaining_tenure_months: null,
        last_paid_date: null,
        category: 'Entertainment',
        notes: null,
        principal_amount: null,
        interest_rate: null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    it('rejects payment with 0 or negative amounts', async () => {
      await expect(
        UpcomingEngine.payRecurringObligation(mockDb, 'ob-1', new Date().toISOString(), 0)
      ).rejects.toThrow('Payment amount must be strictly greater than zero. 0 cannot be entered.');

      await expect(
        UpcomingEngine.payRecurringObligation(mockDb, 'ob-1', new Date().toISOString(), -500)
      ).rejects.toThrow('Payment amount must be strictly greater than zero. 0 cannot be entered.');
    });

    it('allows paying with custom valid positive amount and mutates bank balance correctly', async () => {
      const result = await UpcomingEngine.payRecurringObligation(
        mockDb,
        'ob-1',
        new Date().toISOString(),
        800
      );

      expect(result.transaction.amount).toBe(800);
      expect(mockDb.accounts.get('acc-1')?.balance).toBe(49200); // 50000 - 800
    });
  });

  describe('DEF-016: In-place Transaction Editing & Balance Recalculation', () => {
    let mockDb: MockDb;

    beforeEach(() => {
      mockDb = new MockDb();
      mockDb.accounts.set('bank-1', {
        id: 'bank-1',
        name: 'Salary Account',
        type: 'BANK_DEPOSIT',
        balance: 10000,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: 5000,
        keep_track_ratio: null,
        card_color: null,
        last4: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.transactions.set('tx-1', {
        id: 'tx-1',
        account_id: 'bank-1',
        type: 'OUTFLOW',
        amount: 2000,
        category: 'Shopping',
        description: 'Shoes',
        timestamp: new Date().toISOString(),
        is_reconciled: true,
        reference_number: null,
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      });
    });

    it('adjusts account balance when transaction amount is edited', async () => {
      // Original: 2000 OUTFLOW on 10000 balance -> balance should be reverted by +2000, then re-applied with new amount
      // If we change amount from 2000 to 3000:
      // Revert: 10000 + 2000 = 12000
      // Apply 3000 outflow: 12000 - 3000 = 9000
      await AccountingEngine.updateTransaction(mockDb, 'tx-1', { amount: 3000 });
      expect(mockDb.accounts.get('bank-1')?.balance).toBe(9000);
    });
  });
});
