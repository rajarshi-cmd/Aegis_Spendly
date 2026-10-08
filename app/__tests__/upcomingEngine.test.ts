import { describe, test, expect } from '@jest/globals';
import { UpcomingEngine } from '../src/core/engines/upcomingEngine';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { createAccount, createObligation } from '../src/core/database/queries';

describe('UpcomingEngine: Subscriptions, EMIs, Loans and Click-Paid Execution', () => {
  test('Paying EMI decrements tenure months and deducts from credit card', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const card = await createAccount(memDb, {
      name: 'Sapphire Reserve',
      type: 'CREDIT_CARD',
      balance: 500.0, // Existing debt
      credit_limit: 10000.0,
    });

    const emi = await createObligation(memDb, {
      name: 'MacBook Pro EMI',
      type: 'EMI',
      amount: 150.0,
      due_day: 15,
      linked_account_id: card.id,
      total_tenure_months: 12,
      remaining_tenure_months: 6,
    });

    const result = await UpcomingEngine.payRecurringObligation(memDb, emi.id);

    // Remaining tenure should decrease by 1
    expect(result.obligation.remaining_tenure_months).toBe(5);
    expect(result.obligation.status).toBe('ACTIVE');

    // Credit card debt should increase by ₹150
    const updatedCard = memDb.store.accounts.find((a) => a.id === card.id);

    expect(updatedCard?.balance).toBe(650.0);

    // Transaction row should be created
    expect(result.transaction.amount).toBe(150.0);
    expect(result.transaction.category).toBe('EMI Payment');
  });

  test('Paying final tenure month marks obligation as COMPLETED', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Main Checking',
      type: 'BANK_DEPOSIT',
      balance: 3000.0,
    });

    const loan = await createObligation(memDb, {
      name: 'Small Personal Loan',
      type: 'LOAN',
      amount: 200.0,
      due_day: 5,
      linked_account_id: bank.id,
      total_tenure_months: 12,
      remaining_tenure_months: 1, // Only 1 month remaining
    });

    const result = await UpcomingEngine.payRecurringObligation(memDb, loan.id);

    expect(result.obligation.remaining_tenure_months).toBe(0);
    expect(result.obligation.status).toBe('COMPLETED');

    // Bank account should decrement by 200
    const updatedBank = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(updatedBank?.balance).toBe(2800.0);
  });
});
