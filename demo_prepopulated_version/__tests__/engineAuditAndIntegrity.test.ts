import { describe, test, expect } from '@jest/globals';
import { AccountingEngine } from '../src/core/engines/accountingEngine';
import { UpcomingEngine } from '../src/core/engines/upcomingEngine';
import { DebtEngine } from '../src/core/engines/debtEngine';
import { InvestmentEngine } from '../src/core/engines/investmentEngine';
import { CreditMonitor } from '../src/core/engines/creditMonitor';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import {
  createAccount,
  getAccountById,
  deleteAccount,
  getAllAccounts,
  createObligation,
  getObligationById,
  getAllObligations,
  createInvestment,
  getInvestmentById,
  getAllTransactions,
  createDebtRow,
  deleteDebt,
  getAllDebts,
  generateUUID,
} from '../src/core/database/queries';
import { formatRupee, formatCompactRupee } from '../src/core/utils/currency';
import { Account } from '../src/core/types/accounts';

describe('Backend & Core Engine Audit: Currency Formatting & INR Compliance', () => {
  test('formatRupee formats whole and fractional amounts in Indian numbering system', () => {
    expect(formatRupee(129400)).toBe('₹1,29,400');
    expect(formatRupee(1000000)).toBe('₹10,00,000'); // 10 Lakhs
    expect(formatRupee(10000000)).toBe('₹1,00,00,000'); // 1 Crore
    expect(formatRupee(480.5)).toBe('₹480.50');
    expect(formatRupee(-480)).toBe('-₹480');
    expect(formatRupee(-1250.75)).toBe('-₹1,250.75');
    expect(formatRupee(500, true)).toBe('+₹500');
    expect(formatRupee(0)).toBe('₹0');
  });

  test('formatRupee respects explicit decimals configuration', () => {
    expect(formatRupee(1500, { decimals: 2 })).toBe('₹1,500.00');
    expect(formatRupee(1500.85, { decimals: 0 })).toBe('₹1,501');
    expect(formatRupee(1500, { decimals: 0 })).toBe('₹1,500');
    expect(formatRupee(500, { showSign: true, decimals: 2 })).toBe('+₹500.00');
    expect(formatRupee(NaN as any)).toBe('₹0');
  });

  test('formatCompactRupee formats thousands, lakhs, and crores', () => {
    expect(formatCompactRupee(500)).toBe('₹500');
    expect(formatCompactRupee(18600)).toBe('₹18.6k');
    expect(formatCompactRupee(148000)).toBe('₹1.5L');
    expect(formatCompactRupee(2500000)).toBe('₹25.0L');
    expect(formatCompactRupee(15000000)).toBe('₹1.50Cr');
    expect(formatCompactRupee(-250000)).toBe('-₹2.5L');
  });
});

describe('Backend & Core Engine Audit: AccountingEngine & Edge Cases', () => {
  const sampleBank: Account = {
    id: 'bank-node',
    name: 'Savings',
    type: 'BANK_DEPOSIT',
    balance: 5000,
    credit_limit: null,
    billing_cycle_cut_day: null,
    payment_due_day: null,
    minimum_balance: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleCard: Account = {
    id: 'card-node',
    name: 'Platinum Card',
    type: 'CREDIT_CARD',
    balance: 1200,
    credit_limit: 50000,
    billing_cycle_cut_day: 15,
    payment_due_day: 5,
    minimum_balance: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test('Rejects non-positive or NaN amounts in calculateNewBalance', () => {
    expect(() => AccountingEngine.calculateNewBalance(sampleBank, 'INFLOW', 0)).toThrow();
    expect(() => AccountingEngine.calculateNewBalance(sampleBank, 'OUTFLOW', -100)).toThrow();
    expect(() => AccountingEngine.calculateNewBalance(sampleBank, 'INFLOW', NaN)).toThrow();
    expect(() => AccountingEngine.calculateNewBalance(sampleBank, 'INFLOW', Infinity)).toThrow();
  });

  test('Rejects invalid input amounts in ingestTransaction', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Bank A', type: 'BANK_DEPOSIT', balance: 1000 });

    await expect(
      AccountingEngine.ingestTransaction(memDb, {
        account_id: bank.id,
        type: 'INFLOW',
        amount: -50,
        category: 'Income',
      })
    ).rejects.toThrow('Transaction amount must be positive.');

    await expect(
      AccountingEngine.ingestTransaction(memDb, {
        account_id: bank.id,
        type: 'INFLOW',
        amount: NaN,
        category: 'Income',
      })
    ).rejects.toThrow('Transaction amount must be positive.');
  });

  test('Rejects identical source and destination on transfer', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Bank A', type: 'BANK_DEPOSIT', balance: 1000 });

    await expect(
      AccountingEngine.ingestTransaction(memDb, {
        account_id: bank.id,
        destination_account_id: bank.id,
        type: 'TRANSFER',
        amount: 200,
        category: 'Transfer',
      })
    ).rejects.toThrow('Source and destination accounts cannot be identical.');
  });

  test('Atomic rollback: transaction failure preserves existing balance', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Vault', type: 'BANK_DEPOSIT', balance: 10000 });

    try {
      await memDb.withTransaction(async () => {
        // Mutate balance
        bank.balance = 5000;
        memDb.store.accounts[0].balance = 5000;
        // Then simulate unexpected error
        throw new Error('Database disk error simulation');
      });
    } catch {
      // Caught
    }

    const accountAfter = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(accountAfter?.balance).toBe(10000); // Rolled back cleanly!
  });
});

describe('Backend & Core Engine Audit: UpcomingEngine & Atomic Execution', () => {
  test('Rejects paying obligation when already completed or zero tenure remaining', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Main', type: 'BANK_DEPOSIT', balance: 5000 });

    const loan = await createObligation(memDb, {
      name: 'Car Loan',
      type: 'LOAN',
      amount: 500,
      due_day: 10,
      linked_account_id: bank.id,
      total_tenure_months: 12,
      remaining_tenure_months: 0,
    });

    await expect(UpcomingEngine.payRecurringObligation(memDb, loan.id)).rejects.toThrow(
      'has no remaining installments'
    );
  });

  test('Rejects paying obligation if linked account is missing', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const orphanOb = await createObligation(memDb, {
      name: 'Gym',
      type: 'SUBSCRIPTION',
      amount: 1500,
      due_day: 1,
      linked_account_id: 'non-existent-account-id',
    });

    await expect(UpcomingEngine.payRecurringObligation(memDb, orphanOb.id)).rejects.toThrow(
      'Linked account not found'
    );
  });

  test('isPaidThisMonth handles edge cases safely', () => {
    expect(UpcomingEngine.isPaidThisMonth(null)).toBe(false);
    expect(UpcomingEngine.isPaidThisMonth('')).toBe(false);
    expect(UpcomingEngine.isPaidThisMonth('invalid-date')).toBe(false);

    const now = new Date('2026-10-15T10:00:00Z');
    const thisMonthPaid = new Date('2026-10-02T08:00:00Z').toISOString();
    const lastMonthPaid = new Date('2026-09-28T08:00:00Z').toISOString();

    expect(UpcomingEngine.isPaidThisMonth(thisMonthPaid, now)).toBe(true);
    expect(UpcomingEngine.isPaidThisMonth(lastMonthPaid, now)).toBe(false);
  });
});

describe('Backend & Core Engine Audit: InvestmentEngine & SIP Integrity', () => {
  test('Executing SIP fails if linked bank account does not exist in DB', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const inv = await createInvestment(memDb, {
      name: 'Gold Fund',
      type: 'SIP',
      monthly_sip_amount: 5000,
      sip_due_day: 5,
      linked_account_id: 'non-existent-bank-id',
      invested_amount: 10000,
      current_value: 12000,
    });

    await expect(InvestmentEngine.executeSip(memDb, inv.id)).rejects.toThrow(
      'Linked account not found: non-existent-bank-id'
    );

    // Verify unbacked asset inflation did not occur
    const invAfter = await getInvestmentById(memDb, inv.id);
    expect(invAfter?.invested_amount).toBe(10000);
    expect(invAfter?.current_value).toBe(12000);
  });

  test('Executing SIP without linked account increments portfolio value only', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const inv = await createInvestment(memDb, {
      name: 'Direct Mutual Fund',
      type: 'MUTUAL_FUND',
      monthly_sip_amount: 2500,
      sip_due_day: 1,
      linked_account_id: null,
      invested_amount: 5000,
      current_value: 5200,
    });

    const res = await InvestmentEngine.executeSip(memDb, inv.id);
    expect(res.transaction).toBeNull();
    expect(res.investment.invested_amount).toBe(7500);
    expect(res.investment.current_value).toBe(7700);
  });
});

describe('Backend & Core Engine Audit: DebtEngine & Bilateral Settlement', () => {
  test('DebtEngine rejects negative principal or repayment amounts', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Axis Bank', type: 'BANK_DEPOSIT', balance: 5000 });

    await expect(
      DebtEngine.createDebt(memDb, {
        counterparty: 'Priya',
        direction: 'LENT',
        principal_amount: -500,
        settlement_account_id: bank.id,
        due_date: new Date().toISOString(),
      })
    ).rejects.toThrow('Principal debt amount must be strictly positive.');

    const validDebt = await DebtEngine.createDebt(memDb, {
      counterparty: 'Priya',
      direction: 'LENT',
      principal_amount: 1000,
      settlement_account_id: bank.id,
      due_date: new Date().toISOString(),
    });

    await expect(
      DebtEngine.processRepayment(memDb, {
        debt_id: validDebt.id,
        amount: -100,
      })
    ).rejects.toThrow('Repayment amount must be strictly greater than zero.');

    await expect(
      DebtEngine.processRepayment(memDb, {
        debt_id: validDebt.id,
        amount: 1500, // Exceeds balance
      })
    ).rejects.toThrow('exceeds remaining outstanding balance');
  });

  test('deleteDebt cleanly removes debt and associated settlements', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Bank', type: 'BANK_DEPOSIT', balance: 5000 });

    const debt = await DebtEngine.createDebt(memDb, {
      counterparty: 'Rahul',
      direction: 'BORROWED',
      principal_amount: 1000,
      settlement_account_id: bank.id,
      due_date: new Date().toISOString(),
    });

    await DebtEngine.processRepayment(memDb, {
      debt_id: debt.id,
      amount: 400,
    });

    expect(memDb.store.debts.length).toBe(1);
    expect(memDb.store.settlements.length).toBe(1);

    await deleteDebt(memDb, debt.id);

    expect(memDb.store.debts.length).toBe(0);
    expect(memDb.store.settlements.length).toBe(0);
  });
});

describe('Backend & Core Engine Audit: Schema Metadata & Cascade Deletion', () => {
  test('Accounts persist card_color and last4 fields', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const card = await createAccount(memDb, {
      name: 'Regalia Gold',
      type: 'CREDIT_CARD',
      balance: 15000,
      credit_limit: 100000,
      card_color: 'EMERALD',
      last4: '9921',
    });

    const fetched = await getAccountById(memDb, card.id);
    expect(fetched?.card_color).toBe('EMERALD');
    expect(fetched?.last4).toBe('9921');
  });

  test('Obligations persist category field', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'Bank', type: 'BANK_DEPOSIT', balance: 5000 });
    const ob = await createObligation(memDb, {
      name: 'Spotify Family',
      type: 'SUBSCRIPTION',
      amount: 199,
      due_day: 15,
      linked_account_id: bank.id,
      category: 'Entertainment',
    });

    const fetched = await getObligationById(memDb, ob.id);
    expect(fetched?.category).toBe('Entertainment');
  });

  test('getAllTransactions with account filter includes transfer destination', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const source = await createAccount(memDb, { name: 'Checking', type: 'BANK_DEPOSIT', balance: 10000 });
    const dest = await createAccount(memDb, { name: 'Credit Card', type: 'CREDIT_CARD', balance: 2000 });

    await AccountingEngine.ingestTransaction(memDb, {
      account_id: source.id,
      destination_account_id: dest.id,
      type: 'TRANSFER',
      amount: 1500,
      category: 'Credit Card Bill Payment',
    });

    // Query transactions for destination card
    const destTxs = await getAllTransactions(memDb, { accountId: dest.id });
    expect(destTxs.length).toBe(1);
    expect(destTxs[0].type).toBe('TRANSFER');
    expect(destTxs[0].amount).toBe(1500);
  });

  test('deleteAccount cascades dependent records cleanly', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, { name: 'HDFC Checking', type: 'BANK_DEPOSIT', balance: 50000 });

    // Link transaction, debt, obligation, investment
    await AccountingEngine.ingestTransaction(memDb, {
      account_id: bank.id,
      type: 'OUTFLOW',
      amount: 500,
      category: 'Groceries',
    });

    await DebtEngine.createDebt(memDb, {
      counterparty: 'Friend',
      direction: 'LENT',
      principal_amount: 1000,
      settlement_account_id: bank.id,
      due_date: new Date().toISOString(),
    });

    await createObligation(memDb, {
      name: 'Netflix',
      type: 'SUBSCRIPTION',
      amount: 649,
      due_day: 10,
      linked_account_id: bank.id,
    });

    const inv = await createInvestment(memDb, {
      name: 'Index Fund',
      type: 'SIP',
      monthly_sip_amount: 5000,
      sip_due_day: 5,
      linked_account_id: bank.id,
    });

    // Delete account
    await deleteAccount(memDb, bank.id);

    expect((await getAllAccounts(memDb)).length).toBe(0);
    expect((await getAllTransactions(memDb)).length).toBe(0);
    expect((await getAllDebts(memDb)).length).toBe(0);
    expect((await getAllObligations(memDb)).length).toBe(0);

    // Investment is preserved but unlinked
    const invAfter = await getInvestmentById(memDb, inv.id);
    expect(invAfter).toBeDefined();
    expect(invAfter?.linked_account_id).toBeNull();
  });
});
