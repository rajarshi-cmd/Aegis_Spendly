import { describe, test, expect } from '@jest/globals';
import { AccountingEngine } from '../src/core/engines/accountingEngine';
import { Account } from '../src/core/types/accounts';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { createAccount } from '../src/core/database/queries';

describe('AccountingEngine & Double-Entry Ingestion Rules', () => {
  const bankAccount: Account = {
    id: 'bank-1',
    name: 'Checking',
    type: 'BANK_DEPOSIT',
    balance: 1000.0,
    credit_limit: null,
    billing_cycle_cut_day: null,
    payment_due_day: null,
    minimum_balance: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const creditCard: Account = {
    id: 'card-1',
    name: 'Sapphire',
    type: 'CREDIT_CARD',
    balance: 400.0, // Existing debt
    credit_limit: 5000.0,
    billing_cycle_cut_day: 15,
    payment_due_day: 5,
    minimum_balance: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test('Bank deposit: Inflows increment available balance', () => {
    const result = AccountingEngine.calculateNewBalance(bankAccount, 'INFLOW', 250.0);
    expect(result).toBe(1250.0);
  });

  test('Bank deposit: Outflows decrement available balance', () => {
    const result = AccountingEngine.calculateNewBalance(bankAccount, 'OUTFLOW', 150.0);
    expect(result).toBe(850.0);
  });

  test('Credit card: Outflows increment total debt balance', () => {
    const result = AccountingEngine.calculateNewBalance(creditCard, 'OUTFLOW', 100.0);
    expect(result).toBe(500.0);
  });

  test('Credit card: Inflows (repayments) decrement total debt balance', () => {
    const result = AccountingEngine.calculateNewBalance(creditCard, 'INFLOW', 150.0);
    expect(result).toBe(250.0);
  });

  test('Credit card: Overpayment does not yield negative debt', () => {
    const result = AccountingEngine.calculateNewBalance(creditCard, 'INFLOW', 600.0);
    expect(result).toBe(0.0);
  });

  test('Atomic transaction: Ingesting movement updates database and account balance', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const createdBank = await createAccount(memDb, {
      name: 'Chase Checking',
      type: 'BANK_DEPOSIT',
      balance: 2000.0,
    });

    const tx = await AccountingEngine.ingestTransaction(memDb, {
      account_id: createdBank.id,
      type: 'OUTFLOW',
      amount: 150.0,
      category: 'Groceries',
      description: 'Supermarket shopping',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(150.0);

    const updatedBank = memDb.store.accounts.find((a) => a.id === createdBank.id);
    expect(updatedBank?.balance).toBe(1850.0);
  });

  test('Atomic transfer between accounts updates both balances', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const sourceAcc = await createAccount(memDb, {
      name: 'Source Bank',
      type: 'BANK_DEPOSIT',
      balance: 1000.0,
    });
    const destCard = await createAccount(memDb, {
      name: 'Credit Card',
      type: 'CREDIT_CARD',
      balance: 500.0, // Debt
      credit_limit: 2000.0,
    });

    const tx = await AccountingEngine.ingestTransaction(memDb, {
      account_id: sourceAcc.id,
      type: 'TRANSFER',
      amount: 200.0,
      category: 'Card Payment',
      destination_account_id: destCard.id,
    });

    expect(tx.type).toBe('TRANSFER');
    const updatedSource = memDb.store.accounts.find((a) => a.id === sourceAcc.id);
    const updatedCard = memDb.store.accounts.find((a) => a.id === destCard.id);

    expect(updatedSource?.balance).toBe(800.0); // 1000 - 200
    expect(updatedCard?.balance).toBe(300.0); // 500 debt - 200 repayment
  });

  test('Physical wallet: Inflows increment cash and Outflows decrement cash', () => {
    const cashWallet: Account = {
      id: 'wallet-1',
      name: 'Cash in Pocket',
      type: 'PHYSICAL_WALLET',
      balance: 500.0,
      credit_limit: null,
      billing_cycle_cut_day: null,
      payment_due_day: null,
      minimum_balance: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(AccountingEngine.calculateNewBalance(cashWallet, 'INFLOW', 200.0)).toBe(700.0);
    expect(AccountingEngine.calculateNewBalance(cashWallet, 'OUTFLOW', 150.0)).toBe(350.0);
  });

  test('ATM Cash Withdrawal: Transfer from Bank to Physical Wallet increments wallet and decrements bank', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'HDFC Savings',
      type: 'BANK_DEPOSIT',
      balance: 10000.0,
    });
    const wallet = await createAccount(memDb, {
      name: 'Physical Wallet',
      type: 'PHYSICAL_WALLET',
      balance: 500.0,
    });

    const tx = await AccountingEngine.ingestTransaction(memDb, {
      account_id: bank.id,
      destination_account_id: wallet.id,
      type: 'TRANSFER',
      amount: 2000.0,
      category: 'ATM Cash Withdrawal',
    });

    expect(tx.type).toBe('TRANSFER');
    const updatedBank = memDb.store.accounts.find((a) => a.id === bank.id);
    const updatedWallet = memDb.store.accounts.find((a) => a.id === wallet.id);

    expect(updatedBank?.balance).toBe(8000.0);
    expect(updatedWallet?.balance).toBe(2500.0);
  });
});
