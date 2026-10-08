import { describe, test, expect } from '@jest/globals';
import { InvestmentEngine } from '../src/core/engines/investmentEngine';
import { UpcomingEngine } from '../src/core/engines/upcomingEngine';
import { AccountingEngine } from '../src/core/engines/accountingEngine';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import {
  createAccount,
  createInvestment,
  createObligation,
  updateObligation,
  updateInvestment,
  getAllTransactions,
} from '../src/core/database/queries';

describe('SIP Execution, Plan Ahead, and Account Reassignment Workflow', () => {
  test('SIP can be executed with custom debit account and records ledger outflow', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const primaryBank = await createAccount(memDb, {
      name: 'HDFC Salary Account',
      type: 'BANK_DEPOSIT',
      balance: 50000.0,
    });
    const secondaryBank = await createAccount(memDb, {
      name: 'ICICI Savings Account',
      type: 'BANK_DEPOSIT',
      balance: 20000.0,
    });

    const sip = await createInvestment(memDb, {
      name: 'Nifty 50 Index Fund',
      type: 'SIP',
      invested_amount: 10000.0,
      current_value: 12000.0,
      monthly_sip_amount: 5000.0,
      sip_due_day: 10,
      linked_account_id: primaryBank.id,
    });

    // Execute SIP explicitly selecting secondaryBank as payment mode
    const executionIso = '2026-10-10T10:00:00.000Z';
    const result = await InvestmentEngine.executeSip(memDb, sip.id, executionIso, secondaryBank.id);

    // Verify secondaryBank was debited
    const updatedSecondary = memDb.store.accounts.find((a) => a.id === secondaryBank.id);
    expect(updatedSecondary?.balance).toBe(15000.0);

    // Primary bank should remain untouched
    const updatedPrimary = memDb.store.accounts.find((a) => a.id === primaryBank.id);
    expect(updatedPrimary?.balance).toBe(50000.0);

    // Investment book value increased
    expect(result.investment.invested_amount).toBe(15000.0);
    expect(result.investment.current_value).toBe(17000.0);
    expect(result.investment.last_sip_date).toBe(executionIso);

    // Ledger transaction exists and is linked to secondary bank
    expect(result.transaction).not.toBeNull();
    expect(result.transaction?.account_id).toBe(secondaryBank.id);
    expect(result.transaction?.amount).toBe(5000.0);
    expect(result.transaction?.category).toBe('Investment (Asset)');
  });

  test('Transactions strictly maintain newest-first descending order', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Checking',
      type: 'BANK_DEPOSIT',
      balance: 10000.0,
    });

    await AccountingEngine.ingestTransaction(memDb, {
      account_id: bank.id,
      amount: 100,
      category: 'Food',
      description: 'Breakfast',
      type: 'OUTFLOW',
      timestamp: '2026-10-01T08:00:00.000Z',
    });

    await AccountingEngine.ingestTransaction(memDb, {
      account_id: bank.id,
      amount: 500,
      category: 'Groceries',
      description: 'Supermarket',
      type: 'OUTFLOW',
      timestamp: '2026-10-05T14:30:00.000Z',
    });

    await AccountingEngine.ingestTransaction(memDb, {
      account_id: bank.id,
      amount: 3000,
      category: 'Salary',
      description: 'Bonus',
      type: 'INFLOW',
      timestamp: '2026-10-07T12:00:00.000Z',
    });

    const txs = await getAllTransactions(memDb);
    const sorted = [...txs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Newest transaction must strictly be index 0
    expect(sorted[0].description).toBe('Bonus');
    expect(sorted[1].description).toBe('Supermarket');
    expect(sorted[2].description).toBe('Breakfast');
  });

  test('Reassigning linked commitments before closing account', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const oldBank = await createAccount(memDb, {
      name: 'Axis Bank (To Close)',
      type: 'BANK_DEPOSIT',
      balance: 5000.0,
    });
    const newBank = await createAccount(memDb, {
      name: 'Kotak Mahindra',
      type: 'BANK_DEPOSIT',
      balance: 35000.0,
    });

    const emi = await createObligation(memDb, {
      name: 'Car Loan EMI',
      type: 'EMI',
      amount: 8000.0,
      due_day: 15,
      linked_account_id: oldBank.id,
      total_tenure_months: 24,
      remaining_tenure_months: 18,
    });

    const sip = await createInvestment(memDb, {
      name: 'Tech Growth SIP',
      type: 'SIP',
      invested_amount: 25000.0,
      current_value: 30000.0,
      monthly_sip_amount: 3000.0,
      sip_due_day: 5,
      linked_account_id: oldBank.id,
    });

    // Reassign obligations to new bank
    await updateObligation(memDb, {
      ...emi,
      linked_account_id: newBank.id,
    });

    await updateInvestment(memDb, {
      ...sip,
      linked_account_id: newBank.id,
    });

    // Verify reassignment
    const updatedEmi = memDb.store.recurring_obligations.find((o: any) => o.id === emi.id);
    const updatedSip = memDb.store.investments.find((i: any) => i.id === sip.id);

    expect(updatedEmi?.linked_account_id).toBe(newBank.id);
    expect(updatedSip?.linked_account_id).toBe(newBank.id);

    // Execute reassigned EMI to verify it debits newBank
    const emiResult = await UpcomingEngine.payRecurringObligation(memDb, emi.id, '2026-10-15T09:00:00.000Z');
    expect(emiResult.transaction.account_id).toBe(newBank.id);

    const updatedNewBank = memDb.store.accounts.find((a) => a.id === newBank.id);
    expect(updatedNewBank?.balance).toBe(27000.0); // 35000 - 8000
  });
});
