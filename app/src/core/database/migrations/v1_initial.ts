import { DatabaseExecutor, Migration } from '../types';

export const migrationV1: Migration = {
  version: 1,
  name: 'v1_initial_phase1_models',
  up: async (db: DatabaseExecutor): Promise<void> => {
    // 1. Financial Nodes (Accounts & Cards)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('BANK_DEPOSIT', 'CREDIT_CARD', 'PHYSICAL_WALLET')),
        balance REAL NOT NULL DEFAULT 0.0,
        credit_limit REAL,
        billing_cycle_cut_day INTEGER CHECK (billing_cycle_cut_day BETWEEN 1 AND 31),
        payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Financial Movements (Ledger Transactions)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INFLOW', 'OUTFLOW', 'TRANSFER')),
        amount REAL NOT NULL CHECK (amount > 0),
        category TEXT NOT NULL,
        description TEXT,
        timestamp TEXT NOT NULL,
        is_reconciled INTEGER NOT NULL DEFAULT 0 CHECK (is_reconciled IN (0, 1)),
        reference_number TEXT,
        source TEXT NOT NULL DEFAULT 'MANUAL',
        sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
        destination_account_id TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE RESTRICT,
        FOREIGN KEY (destination_account_id) REFERENCES accounts (id) ON DELETE RESTRICT
      );
    `);

    // 3. Peer-to-Peer Loans & Bilateral Obligations
    await db.exec(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        counterparty TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('LENT', 'BORROWED')),
        principal_amount REAL NOT NULL CHECK (principal_amount > 0),
        outstanding_balance REAL NOT NULL CHECK (outstanding_balance >= 0),
        settlement_account_id TEXT NOT NULL,
        origination_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PARTIALLY_SETTLED', 'SETTLED', 'OVERDUE')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (settlement_account_id) REFERENCES accounts (id) ON DELETE RESTRICT
      );
    `);

    // 4. Settlement Audit Ledger
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        settlement_date TEXT NOT NULL,
        settlement_account_id TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE,
        FOREIGN KEY (settlement_account_id) REFERENCES accounts (id) ON DELETE RESTRICT
      );
    `);

    // 5. Query Optimization (Indexes)
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp);
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions (account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
      CREATE INDEX IF NOT EXISTS idx_debts_status ON debts (status);
      CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts (due_date);
      CREATE INDEX IF NOT EXISTS idx_debts_counterparty ON debts (counterparty);
      CREATE INDEX IF NOT EXISTS idx_settlements_debt_id ON settlements (debt_id);
    `);
  },
};
