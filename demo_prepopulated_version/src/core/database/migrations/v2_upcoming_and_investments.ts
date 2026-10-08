import { DatabaseExecutor, Migration } from '../types';

export const migrationV2: Migration = {
  version: 2,
  name: 'v2_upcoming_and_investments',
  up: async (db: DatabaseExecutor): Promise<void> => {
    // 1. Add minimum_balance, card_color, and last4 to accounts if not already present
    try {
      await db.exec(`
        ALTER TABLE accounts ADD COLUMN minimum_balance REAL DEFAULT 0.0;
      `);
    } catch {
      // Ignore if column already exists
    }
    try {
      await db.exec(`
        ALTER TABLE accounts ADD COLUMN card_color TEXT;
      `);
    } catch {}
    try {
      await db.exec(`
        ALTER TABLE accounts ADD COLUMN last4 TEXT;
      `);
    } catch {}
    try {
      await db.exec(`
        ALTER TABLE accounts ADD COLUMN keep_track_ratio REAL;
      `);
    } catch {}

    // 2. Upcoming Payments (Subscriptions, EMIs, and Loans)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_obligations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('SUBSCRIPTION', 'EMI', 'LOAN')),
        amount REAL NOT NULL CHECK (amount > 0),
        due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
        linked_account_id TEXT NOT NULL,
        category TEXT,
        total_tenure_months INTEGER,
        remaining_tenure_months INTEGER,
        principal_amount REAL,
        interest_rate REAL,
        last_paid_date TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (linked_account_id) REFERENCES accounts (id) ON DELETE RESTRICT
      );
    `);

    try {
      await db.exec(`
        ALTER TABLE recurring_obligations ADD COLUMN category TEXT;
      `);
    } catch {}


    // 3. Investments & Systematic Investment Plans (SIPs)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('SIP', 'MUTUAL_FUND', 'STOCKS', 'GOLD', 'FIXED_DEPOSIT')),
        monthly_sip_amount REAL,
        sip_due_day INTEGER CHECK (sip_due_day BETWEEN 1 AND 31),
        linked_account_id TEXT,
        invested_amount REAL NOT NULL DEFAULT 0.0,
        current_value REAL NOT NULL DEFAULT 0.0,
        last_sip_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (linked_account_id) REFERENCES accounts (id) ON DELETE RESTRICT
      );
    `);

    // 4. Query Optimization Indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_obligations_account ON recurring_obligations (linked_account_id);
      CREATE INDEX IF NOT EXISTS idx_obligations_status ON recurring_obligations (status);
      CREATE INDEX IF NOT EXISTS idx_investments_type ON investments (type);
    `);
  },
};
