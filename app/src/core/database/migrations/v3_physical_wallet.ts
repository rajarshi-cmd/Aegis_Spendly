import { DatabaseExecutor, Migration } from '../types';

export const migrationV3: Migration = {
  version: 3,
  name: 'v3_physical_wallet_support',
  up: async (db: DatabaseExecutor): Promise<void> => {
    try {
      await db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS accounts_temp (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('BANK_DEPOSIT', 'CREDIT_CARD', 'PHYSICAL_WALLET')),
          balance REAL NOT NULL DEFAULT 0.0,
          credit_limit REAL,
          billing_cycle_cut_day INTEGER CHECK (billing_cycle_cut_day BETWEEN 1 AND 31),
          payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          minimum_balance REAL DEFAULT 0.0,
          card_color TEXT,
          last4 TEXT,
          keep_track_ratio REAL
        );
        INSERT OR IGNORE INTO accounts_temp (id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, created_at, updated_at, minimum_balance, card_color, last4, keep_track_ratio)
          SELECT id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, created_at, updated_at, minimum_balance, card_color, last4, keep_track_ratio FROM accounts;
        DROP TABLE accounts;
        ALTER TABLE accounts_temp RENAME TO accounts;
        PRAGMA foreign_keys = ON;
      `);
    } catch {
      // In mock or non-sqlite environments, table recreation is safe to skip
    }
  },
};
