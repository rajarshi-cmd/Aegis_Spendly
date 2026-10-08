import { describe, test, expect } from '@jest/globals';
import { DebtEngine } from '../src/core/engines/debtEngine';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { createAccount } from '../src/core/database/queries';

describe('DebtEngine: Bilateral Obligations, Urgency & Repayments', () => {
  const referenceDate = new Date('2026-10-10T12:00:00Z');

  test('Urgency classification rules', () => {
    // > 3 days: Safe
    const safeDate = new Date('2026-10-15T12:00:00Z').toISOString();
    expect(DebtEngine.classifyUrgency(safeDate, referenceDate)).toBe('SAFE');

    // 0 to 3 days: Approaching
    const approachingDate = new Date('2026-10-12T12:00:00Z').toISOString();
    expect(DebtEngine.classifyUrgency(approachingDate, referenceDate)).toBe('APPROACHING');

    // < 0 days (past due): Overdue
    const pastDueDate = new Date('2026-10-08T12:00:00Z').toISOString();
    expect(DebtEngine.classifyUrgency(pastDueDate, referenceDate)).toBe('OVERDUE');
  });

  test('Lending money decreases liquid cash reserves and records receivable', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Primary Checking',
      type: 'BANK_DEPOSIT',
      balance: 5000.0,
    });

    const dueDate = new Date('2026-10-20T12:00:00Z').toISOString();
    const debt = await DebtEngine.createDebt(memDb, {
      counterparty: 'John Doe',
      direction: 'LENT',
      principal_amount: 500.0,
      settlement_account_id: bank.id,
      due_date: dueDate,
      notes: 'Emergency loan',
    });

    expect(debt.outstanding_balance).toBe(500.0);
    expect(debt.direction).toBe('LENT');

    // Cash decreased in bank
    const updatedBank = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(updatedBank?.balance).toBe(4500.0);
  });

  test('Borrowing money increases liquid cash reserves and records liability', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Primary Checking',
      type: 'BANK_DEPOSIT',
      balance: 1000.0,
    });

    const dueDate = new Date('2026-10-20T12:00:00Z').toISOString();
    const debt = await DebtEngine.createDebt(memDb, {
      counterparty: 'Jane Smith',
      direction: 'BORROWED',
      principal_amount: 300.0,
      settlement_account_id: bank.id,
      due_date: dueDate,
    });

    expect(debt.outstanding_balance).toBe(300.0);
    expect(debt.direction).toBe('BORROWED');

    // Cash increased in bank
    const updatedBank = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(updatedBank?.balance).toBe(1300.0);
  });

  test('Partial and complete repayments update debt balance, audit ledger, and bank account', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Checking',
      type: 'BANK_DEPOSIT',
      balance: 2000.0,
    });

    const dueDate = new Date('2026-10-25T12:00:00Z').toISOString();
    const debt = await DebtEngine.createDebt(memDb, {
      counterparty: 'Alex',
      direction: 'LENT',
      principal_amount: 600.0,
      settlement_account_id: bank.id,
      due_date: dueDate,
    });
    // Bank is now 1400.0

    // Partial Repayment: Alex pays 200 back
    const step1 = await DebtEngine.processRepayment(memDb, {
      debt_id: debt.id,
      amount: 200.0,
      notes: 'Part 1',
    });

    expect(step1.debt.outstanding_balance).toBe(400.0);
    expect(step1.debt.status).toBe('PARTIALLY_SETTLED');
    expect(step1.settlement.amount).toBe(200.0);

    const bankAfterPart1 = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(bankAfterPart1?.balance).toBe(1600.0); // 1400 + 200

    // Final Repayment: Alex pays remaining 400
    const step2 = await DebtEngine.processRepayment(memDb, {
      debt_id: debt.id,
      amount: 400.0,
      notes: 'Final installment',
    });

    expect(step2.debt.outstanding_balance).toBe(0.0);
    expect(step2.debt.status).toBe('SETTLED');

    const bankAfterFinal = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(bankAfterFinal?.balance).toBe(2000.0); // Full recovery of liquid cash!
  });
});
