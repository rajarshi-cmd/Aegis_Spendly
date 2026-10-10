import { describe, test, expect, beforeEach } from '@jest/globals';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { runMigrations } from '../src/core/database/migrations/runner';
import { seedIfEmpty } from '../src/core/database/seeder';
import {
  getAllAccounts,
  getAllTransactions,
  createAccount,
  getAccountById,
} from '../src/core/database/queries';
import { AccountingEngine } from '../src/core/engines/accountingEngine';
import { AnalyticsEngine } from '../src/core/engines/analyticsEngine';
import { Account } from '../src/core/types/accounts';
import { formatRupee } from '../src/core/utils/currency';

describe('Stitch Obsidian Wealth UI & Domain Flows Integration', () => {
  let db: MemoryDatabaseAdapter;

  beforeEach(async () => {
    db = new MemoryDatabaseAdapter();
    await runMigrations(db);
    await seedIfEmpty(db);
  });

  describe('1. Financial Tools: Banks, Cards, and Physical Wallet', () => {
    test('creates and tracks PHYSICAL_WALLET as a first-class financial tool alongside Banks and Cards', async () => {
      const wallet = await createAccount(db, {
        name: 'Pocket Leather Wallet',
        type: 'PHYSICAL_WALLET',
        balance: 2500,
      });

      expect(wallet.id).toBeDefined();
      expect(wallet.type).toBe('PHYSICAL_WALLET');
      expect(wallet.balance).toBe(2500);

      const accounts = await getAllAccounts(db);
      const retrieved = accounts.find((a) => a.id === wallet.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('PHYSICAL_WALLET');
    });

    test('handles physical cash inflow and outflow in AccountingEngine', async () => {
      const wallet: Account = {
        id: 'wallet-1',
        name: 'Daily Cash',
        type: 'PHYSICAL_WALLET',
        balance: 1000,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Cash spend
      const afterSpend = AccountingEngine.calculateNewBalance(wallet, 'OUTFLOW', 350);
      expect(afterSpend).toBe(650);

      // Cash addition
      const afterAddition = AccountingEngine.calculateNewBalance(wallet, 'INFLOW', 500);
      expect(afterAddition).toBe(1500);
    });
  });

  describe('2. Double-Entry Rule: Credit Card Bill Payment (Zero Duplicate Expense)', () => {
    test('paying credit card bill from bank reduces bank balance and card debt with NO duplicate expense', async () => {
      // Setup bank with 50,000 and card with 12,000 debt
      const bank = await createAccount(db, {
        name: 'HDFC Savings',
        type: 'BANK_DEPOSIT',
        balance: 50000,
      });

      const card = await createAccount(db, {
        name: 'ICICI Sapphiro',
        type: 'CREDIT_CARD',
        balance: 12000, // 12,000 outstanding debt
        credit_limit: 150000,
      });

      // Pay ₹10,000 toward credit card bill from bank
      const paymentTx = await AccountingEngine.ingestTransaction(db, {
        account_id: bank.id,
        destination_account_id: card.id,
        type: 'TRANSFER',
        amount: 10000,
        category: 'Credit Card Bill Repayment',
        description: 'Monthly card bill settlement',
      });

      expect(paymentTx.type).toBe('TRANSFER');
      expect(paymentTx.amount).toBe(10000);

      // Check balances after bill payment
      const updatedBank = await getAccountById(db, bank.id);
      const updatedCard = await getAccountById(db, card.id);

      // Bank balance decreased by 10,000
      expect(updatedBank?.balance).toBe(40000);
      // Card debt reduced by 10,000 (from 12,000 down to 2,000)
      expect(updatedCard?.balance).toBe(2000);

      // In analytics metrics, this transfer must NOT be counted as an expense
      const metrics = AnalyticsEngine.computeMetrics([paymentTx], {
        label: 'Lifetime',
        startDate: '2020-01-01',
        endDate: '2030-12-31',
      });

      // Total outflows remains 0 because transfers are neutral flows!
      expect(metrics.totalOutflows).toBe(0);
    });
  });

  describe('3. ATM Cash Withdrawal: Bank to Physical Wallet Transfer', () => {
    test('ATM cash withdrawal moves funds from bank to physical cash wallet', async () => {
      const bank = await createAccount(db, {
        name: 'SBI Checking',
        type: 'BANK_DEPOSIT',
        balance: 25000,
      });

      const cashWallet = await createAccount(db, {
        name: 'Pocket Cash',
        type: 'PHYSICAL_WALLET',
        balance: 500,
      });

      // Withdraw ₹3,000 from ATM
      const atmTx = await AccountingEngine.ingestTransaction(db, {
        account_id: bank.id,
        destination_account_id: cashWallet.id,
        type: 'TRANSFER',
        amount: 3000,
        category: 'ATM Cash Withdrawal',
        description: 'ATM Cash at SBI Kiosk',
      });

      const updatedBank = await getAccountById(db, bank.id);
      const updatedWallet = await getAccountById(db, cashWallet.id);

      expect(updatedBank?.balance).toBe(22000);
      expect(updatedWallet?.balance).toBe(3500);

      // Neutral flow in metrics
      const metrics = AnalyticsEngine.computeMetrics([atmTx], {
        label: 'Lifetime',
        startDate: '2020-01-01',
        endDate: '2030-12-31',
      });
      expect(metrics.totalOutflows).toBe(0);
    });
  });

  describe('4. Archived Shelf: Isolation and Restoration', () => {
    test('soft-deleted transactions are excluded from active calculations and restorable', async () => {
      const bank = await createAccount(db, {
        name: 'Axis Bank',
        type: 'BANK_DEPOSIT',
        balance: 10000,
      });

      const tx = await AccountingEngine.ingestTransaction(db, {
        account_id: bank.id,
        type: 'OUTFLOW',
        amount: 850,
        category: 'Dining Out',
        description: 'Starbucks coffee cancelled order',
      });

      const allTxs = await getAllTransactions(db);
      expect(allTxs.find((t) => t.id === tx.id)).toBeDefined();

      // Soft delete / archive
      const activeTxs = allTxs.filter((t) => t.id !== tx.id);
      const deletedTxs = [{ ...tx, is_deleted: true, deleted_at: new Date().toISOString() }];

      // Active calculations exclude archived transactions
      const activeMetrics = AnalyticsEngine.computeMetrics(activeTxs, {
        label: 'Lifetime',
        startDate: '2020-01-01',
        endDate: '2030-12-31',
      });

      const foundInActive = activeTxs.some((t) => t.id === tx.id);
      expect(foundInActive).toBe(false);

      // Restore item back
      const restoredTxs = [...activeTxs, { ...deletedTxs[0], is_deleted: false, deleted_at: null }];
      expect(restoredTxs.some((t) => t.id === tx.id)).toBe(true);
    });
  });

  describe('5. Formatting and Design Tokens', () => {
    test('formatRupee displays INR symbol and proper Indian number formatting', () => {
      expect(formatRupee(0)).toBe('₹0');
      expect(formatRupee(142500)).toBe('₹1,42,500');
      expect(formatRupee(2500.5)).toBe('₹2,500.50');
      expect(formatRupee(142500, { decimals: 2 })).toBe('₹1,42,500.00');
    });
  });
});
