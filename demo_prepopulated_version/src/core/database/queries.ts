import { DatabaseExecutor } from './types';
import { Account, CreateAccountInput, UpdateAccountInput } from '../types/accounts';
import { Transaction, TransactionFilter } from '../types/transactions';
import { Debt, SettlementRecord } from '../types/debts';
import { RecurringObligation, CreateObligationInput } from '../types/upcoming';
import { InvestmentAsset, CreateInvestmentInput } from '../types/investments';
import { kvStorage } from '../storage/kvStorage';

function generateUUID(): string {
  // RFC4122 v4 UUID generator (zero external dependencies)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { generateUUID };

// --- ACCOUNTS ---

export async function getAllAccounts(db: DatabaseExecutor): Promise<Account[]> {
  const rows = await db.getAll<any>(
    `SELECT * FROM accounts ORDER BY created_at ASC;`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    credit_limit: r.credit_limit !== null && r.credit_limit !== undefined ? Number(r.credit_limit) : null,
    billing_cycle_cut_day: r.billing_cycle_cut_day !== null && r.billing_cycle_cut_day !== undefined ? Number(r.billing_cycle_cut_day) : null,
    payment_due_day: r.payment_due_day !== null && r.payment_due_day !== undefined ? Number(r.payment_due_day) : null,
    minimum_balance: r.minimum_balance !== null && r.minimum_balance !== undefined ? Number(r.minimum_balance) : null,
    keep_track_ratio: r.keep_track_ratio !== null && r.keep_track_ratio !== undefined ? Number(r.keep_track_ratio) : null,
    card_color: r.card_color ?? null,
    last4: r.last4 ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getAccountById(db: DatabaseExecutor, id: string): Promise<Account | null> {
  const r = await db.getFirst<any>(
    `SELECT * FROM accounts WHERE id = ?;`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    credit_limit: r.credit_limit !== null && r.credit_limit !== undefined ? Number(r.credit_limit) : null,
    billing_cycle_cut_day: r.billing_cycle_cut_day !== null && r.billing_cycle_cut_day !== undefined ? Number(r.billing_cycle_cut_day) : null,
    payment_due_day: r.payment_due_day !== null && r.payment_due_day !== undefined ? Number(r.payment_due_day) : null,
    minimum_balance: r.minimum_balance !== null && r.minimum_balance !== undefined ? Number(r.minimum_balance) : null,
    keep_track_ratio: r.keep_track_ratio !== null && r.keep_track_ratio !== undefined ? Number(r.keep_track_ratio) : null,
    card_color: r.card_color ?? null,
    last4: r.last4 ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createAccount(db: DatabaseExecutor, input: CreateAccountInput): Promise<Account> {
  const id = generateUUID();
  const now = new Date().toISOString();
  const balance = input.balance ?? 0.0;
  const creditLimit = input.credit_limit ?? null;
  const cutDay = input.billing_cycle_cut_day ?? null;
  const dueDay = input.payment_due_day ?? null;
  const minBalance = input.minimum_balance ?? null;
  const keepTrackRatio = input.keep_track_ratio !== undefined ? input.keep_track_ratio : null;
  const cardColor = input.card_color ?? null;
  const last4 = input.last4 ?? null;

  try {
    await db.run(
      `INSERT INTO accounts (id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, minimum_balance, keep_track_ratio, card_color, last4, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, input.name, input.type, balance, creditLimit, cutDay, dueDay, minBalance, keepTrackRatio, cardColor, last4, now, now]
    );
  } catch {
    await db.run(
      `INSERT INTO accounts (id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, minimum_balance, card_color, last4, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, input.name, input.type, balance, creditLimit, cutDay, dueDay, minBalance, cardColor, last4, now, now]
    );
  }

  return {
    id,
    name: input.name,
    type: input.type,
    balance,
    credit_limit: creditLimit,
    billing_cycle_cut_day: cutDay,
    payment_due_day: dueDay,
    minimum_balance: minBalance,
    keep_track_ratio: keepTrackRatio,
    card_color: cardColor,
    last4,
    created_at: now,
    updated_at: now,
  };
}

export async function updateAccount(
  db: DatabaseExecutor,
  input: UpdateAccountInput
): Promise<Account | null> {
  const current = await getAccountById(db, input.id);
  if (!current) return null;

  const now = new Date().toISOString();
  const name = input.name !== undefined ? input.name : current.name;
  const balance = input.balance !== undefined && input.balance !== null ? input.balance : current.balance;
  const creditLimit = input.credit_limit !== undefined ? input.credit_limit : current.credit_limit;
  const cutDay = input.billing_cycle_cut_day !== undefined ? input.billing_cycle_cut_day : current.billing_cycle_cut_day;
  const dueDay = input.payment_due_day !== undefined ? input.payment_due_day : current.payment_due_day;
  const minBalance = input.minimum_balance !== undefined ? input.minimum_balance : current.minimum_balance;
  const keepTrackRatio = input.keep_track_ratio !== undefined ? input.keep_track_ratio : current.keep_track_ratio;
  const cardColor = input.card_color !== undefined ? input.card_color : current.card_color;
  const last4 = input.last4 !== undefined ? input.last4 : current.last4;

  try {
    await db.run(
      `UPDATE accounts 
       SET name = ?, balance = ?, credit_limit = ?, billing_cycle_cut_day = ?, payment_due_day = ?, minimum_balance = ?, keep_track_ratio = ?, card_color = ?, last4 = ?, updated_at = ?
       WHERE id = ?;`,
      [name, balance, creditLimit, cutDay, dueDay, minBalance, keepTrackRatio, cardColor, last4, now, input.id]
    );
  } catch {
    await db.run(
      `UPDATE accounts 
       SET name = ?, balance = ?, credit_limit = ?, billing_cycle_cut_day = ?, payment_due_day = ?, minimum_balance = ?, card_color = ?, last4 = ?, updated_at = ?
       WHERE id = ?;`,
      [name, balance, creditLimit, cutDay, dueDay, minBalance, cardColor, last4, now, input.id]
    );
  }

  return {
    ...current,
    name,
    balance,
    credit_limit: creditLimit,
    billing_cycle_cut_day: cutDay,
    payment_due_day: dueDay,
    minimum_balance: minBalance,
    keep_track_ratio: keepTrackRatio,
    card_color: cardColor,
    last4,
    updated_at: now,
  };
}

export async function purgeSeedDataAndInitializeUserVault(
  db: DatabaseExecutor,
  userBanks: Array<{ name: string; balance: number; minimum_balance?: number | null }>,
  userCards: Array<{
    name: string;
    limit: number;
    balance: number;
    cutDay: number;
    dueDay: number;
    color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
    keepTrackRatio?: number;
  }>
): Promise<void> {
  kvStorage.setItem('aegis_vault_initialized', 'true');

  await db.withTransaction(async () => {
    // Delete all existing placeholder transactions, debts, settlements, obligations, investments and accounts
    await db.run(`DELETE FROM transactions;`);
    await db.run(`DELETE FROM recurring_obligations;`);
    await db.run(`DELETE FROM debts;`);
    await db.run(`DELETE FROM settlements;`);
    await db.run(`DELETE FROM investments;`);
    await db.run(`DELETE FROM accounts;`);

    const now = new Date().toISOString();

    // Insert user banks
    for (const b of userBanks) {
      const minBal = b.minimum_balance ?? 0.0;
      const bankAcc = await createAccount(db, {
        name: b.name,
        type: 'BANK_DEPOSIT',
        balance: b.balance,
        minimum_balance: minBal,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        card_color: null,
        last4: null,
      });

      // Record initial balance transaction if balance > 0
      if (b.balance > 0) {
        await createTransactionRow(db, {
          id: generateUUID(),
          account_id: bankAcc.id,
          type: 'INFLOW',
          amount: b.balance,
          category: 'Opening Balance',
          description: 'Initial Account Balance',
          timestamp: now,
          is_reconciled: true,
          reference_number: null,
          source: 'MANUAL',
          sync_status: 'LOCAL_ONLY',
          destination_account_id: null,
        });
      }
    }

    // Insert user credit cards
    for (const c of userCards) {
      const ratio = c.keepTrackRatio ?? 50.0;
      const last4 = Math.floor(1000 + Math.random() * 9000).toString();
      const cardAcc = await createAccount(db, {
        name: c.name,
        type: 'CREDIT_CARD',
        balance: c.balance,
        credit_limit: c.limit,
        billing_cycle_cut_day: c.cutDay,
        payment_due_day: c.dueDay,
        minimum_balance: null,
        keep_track_ratio: ratio,
        card_color: c.color,
        last4,
      });

      // Record initial card spend transaction if balance > 0
      if (c.balance > 0) {
        await createTransactionRow(db, {
          id: generateUUID(),
          account_id: cardAcc.id,
          type: 'OUTFLOW',
          amount: c.balance,
          category: 'Opening Balance',
          description: 'Opening Card Balance',
          timestamp: now,
          is_reconciled: true,
          reference_number: null,
          source: 'MANUAL',
          sync_status: 'LOCAL_ONLY',
          destination_account_id: null,
        });
      }
    }
  });
}

export async function updateAccountBalance(
  db: DatabaseExecutor,
  id: string,
  newBalance: number
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?;`,
    [newBalance, now, id]
  );
}

export async function deleteAccount(
  db: DatabaseExecutor,
  id: string
): Promise<void> {
  await db.withTransaction(async () => {
    await db.run(`DELETE FROM transactions WHERE account_id = ? OR destination_account_id = ?;`, [id, id]);
    await db.run(`DELETE FROM settlements WHERE settlement_account_id = ?;`, [id]);
    await db.run(`DELETE FROM debts WHERE settlement_account_id = ?;`, [id]);
    await db.run(`DELETE FROM recurring_obligations WHERE linked_account_id = ?;`, [id]);
    await db.run(`UPDATE investments SET linked_account_id = NULL WHERE linked_account_id = ?;`, [id]);
    await db.run(`DELETE FROM accounts WHERE id = ?;`, [id]);
  });
}


// --- TRANSACTIONS ---

export async function getAllTransactions(
  db: DatabaseExecutor,
  filter?: TransactionFilter
): Promise<Transaction[]> {
  let query = `
    SELECT id, account_id, type, amount, category, description, timestamp, 
           is_reconciled, reference_number, source, sync_status, destination_account_id 
    FROM transactions WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filter?.accountId) {
    query += ` AND (account_id = ? OR destination_account_id = ?)`;
    params.push(filter.accountId, filter.accountId);
  }

  if (filter?.type && filter.type !== 'ALL') {
    query += ` AND type = ?`;
    params.push(filter.type);
  }
  if (filter?.category) {
    query += ` AND category = ?`;
    params.push(filter.category);
  }
  if (filter?.startDate) {
    query += ` AND timestamp >= ?`;
    params.push(filter.startDate);
  }
  if (filter?.endDate) {
    query += ` AND timestamp <= ?`;
    params.push(filter.endDate);
  }
  if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
    const q = `%${filter.searchQuery.trim()}%`;
    query += ` AND (description LIKE ? OR category LIKE ? OR reference_number LIKE ?)`;
    params.push(q, q, q);
  }

  query += ` ORDER BY timestamp DESC, id DESC;`;

  const rows = await db.getAll<any>(query, params);
  return rows.map((r) => ({
    id: r.id,
    account_id: r.account_id,
    type: r.type,
    amount: Number(r.amount),
    category: r.category,
    description: r.description,
    timestamp: r.timestamp,
    is_reconciled: Boolean(r.is_reconciled),
    reference_number: r.reference_number,
    source: r.source,
    sync_status: r.sync_status,
    destination_account_id: r.destination_account_id,
  }));
}

export async function getTransactionById(db: DatabaseExecutor, id: string): Promise<Transaction | null> {
  const r = await db.getFirst<any>(
    `SELECT id, account_id, type, amount, category, description, timestamp, 
            is_reconciled, reference_number, source, sync_status, destination_account_id 
     FROM transactions WHERE id = ?;`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    account_id: r.account_id,
    type: r.type,
    amount: Number(r.amount),
    category: r.category,
    description: r.description,
    timestamp: r.timestamp,
    is_reconciled: Boolean(r.is_reconciled),
    reference_number: r.reference_number,
    source: r.source,
    sync_status: r.sync_status,
    destination_account_id: r.destination_account_id,
  };
}

export async function createTransactionRow(
  db: DatabaseExecutor,
  tx: Transaction
): Promise<void> {
  await db.run(
    `INSERT INTO transactions (id, account_id, type, amount, category, description, timestamp, is_reconciled, reference_number, source, sync_status, destination_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      tx.id,
      tx.account_id,
      tx.type,
      tx.amount,
      tx.category,
      tx.description ?? null,
      tx.timestamp,
      tx.is_reconciled ? 1 : 0,
      tx.reference_number ?? null,
      tx.source,
      tx.sync_status,
      tx.destination_account_id ?? null,
    ]
  );
}

export async function deleteTransactionRow(db: DatabaseExecutor, id: string): Promise<void> {
  await db.run(`DELETE FROM transactions WHERE id = ?;`, [id]);
}

export async function updateTransactionRow(
  db: DatabaseExecutor,
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(updates.account_id);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.timestamp !== undefined) {
    fields.push('timestamp = ?');
    values.push(updates.timestamp);
  }
  if (updates.reference_number !== undefined) {
    fields.push('reference_number = ?');
    values.push(updates.reference_number);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?;`, values);
}

// --- DEBTS & BILATERAL OBLIGATIONS ---

export async function getAllDebts(db: DatabaseExecutor): Promise<Debt[]> {
  const rows = await db.getAll<any>(
    `SELECT id, counterparty, direction, principal_amount, outstanding_balance, settlement_account_id, 
            origination_date, due_date, status, notes, created_at, updated_at 
     FROM debts ORDER BY due_date ASC, created_at DESC;`
  );
  return rows.map((r) => ({
    id: r.id,
    counterparty: r.counterparty,
    direction: r.direction,
    principal_amount: Number(r.principal_amount),
    outstanding_balance: Number(r.outstanding_balance),
    settlement_account_id: r.settlement_account_id,
    origination_date: r.origination_date,
    due_date: r.due_date,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getDebtById(db: DatabaseExecutor, id: string): Promise<Debt | null> {
  const r = await db.getFirst<any>(
    `SELECT id, counterparty, direction, principal_amount, outstanding_balance, settlement_account_id, 
            origination_date, due_date, status, notes, created_at, updated_at 
     FROM debts WHERE id = ?;`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    counterparty: r.counterparty,
    direction: r.direction,
    principal_amount: Number(r.principal_amount),
    outstanding_balance: Number(r.outstanding_balance),
    settlement_account_id: r.settlement_account_id,
    origination_date: r.origination_date,
    due_date: r.due_date,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createDebtRow(db: DatabaseExecutor, debt: Debt): Promise<void> {
  await db.run(
    `INSERT INTO debts (id, counterparty, direction, principal_amount, outstanding_balance, settlement_account_id, origination_date, due_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      debt.id,
      debt.counterparty,
      debt.direction,
      debt.principal_amount,
      debt.outstanding_balance,
      debt.settlement_account_id,
      debt.origination_date,
      debt.due_date,
      debt.status,
      debt.notes ?? null,
      debt.created_at,
      debt.updated_at,
    ]
  );
}

export async function updateDebtBalance(
  db: DatabaseExecutor,
  id: string,
  remainingBalance: number,
  status: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE debts SET outstanding_balance = ?, status = ?, updated_at = ? WHERE id = ?;`,
    [remainingBalance, status, now, id]
  );
}

export async function deleteDebt(db: DatabaseExecutor, id: string): Promise<void> {
  await db.withTransaction(async () => {
    await db.run(`DELETE FROM settlements WHERE debt_id = ?;`, [id]);
    await db.run(`DELETE FROM debts WHERE id = ?;`, [id]);
  });
}


// --- SETTLEMENT AUDIT LEDGER ---

export async function getSettlementsByDebtId(
  db: DatabaseExecutor,
  debtId: string
): Promise<SettlementRecord[]> {
  const rows = await db.getAll<any>(
    `SELECT id, debt_id, amount, settlement_date, settlement_account_id, notes 
     FROM settlements WHERE debt_id = ? ORDER BY settlement_date DESC;`,
    [debtId]
  );
  return rows.map((r) => ({
    id: r.id,
    debt_id: r.debt_id,
    amount: Number(r.amount),
    settlement_date: r.settlement_date,
    settlement_account_id: r.settlement_account_id,
    notes: r.notes,
  }));
}

export async function createSettlementRow(
  db: DatabaseExecutor,
  settlement: SettlementRecord
): Promise<void> {
  await db.run(
    `INSERT INTO settlements (id, debt_id, amount, settlement_date, settlement_account_id, notes)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      settlement.id,
      settlement.debt_id,
      settlement.amount,
      settlement.settlement_date,
      settlement.settlement_account_id,
      settlement.notes ?? null,
    ]
  );
}

// --- RECURRING OBLIGATIONS (UPCOMING: SUBSCRIPTIONS, EMIS, LOANS) ---

export async function getAllObligations(db: DatabaseExecutor): Promise<RecurringObligation[]> {
  const rows = await db.getAll<any>(
    `SELECT id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, 
            remaining_tenure_months, principal_amount, interest_rate, last_paid_date, status, notes, created_at, updated_at 
     FROM recurring_obligations ORDER BY due_day ASC;`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    amount: Number(r.amount),
    due_day: Number(r.due_day),
    linked_account_id: r.linked_account_id,
    category: r.category ?? null,
    total_tenure_months: r.total_tenure_months !== null ? Number(r.total_tenure_months) : null,
    remaining_tenure_months: r.remaining_tenure_months !== null ? Number(r.remaining_tenure_months) : null,
    principal_amount: r.principal_amount !== null ? Number(r.principal_amount) : null,
    interest_rate: r.interest_rate !== null ? Number(r.interest_rate) : null,
    last_paid_date: r.last_paid_date,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export { getAllObligations as getAllRecurringObligations };

export async function getObligationsByAccountId(
  db: DatabaseExecutor,
  accountId: string
): Promise<RecurringObligation[]> {
  const rows = await db.getAll<any>(
    `SELECT id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, 
            remaining_tenure_months, principal_amount, interest_rate, last_paid_date, status, notes, created_at, updated_at 
     FROM recurring_obligations WHERE linked_account_id = ? ORDER BY due_day ASC;`,
    [accountId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    amount: Number(r.amount),
    due_day: Number(r.due_day),
    linked_account_id: r.linked_account_id,
    category: r.category ?? null,
    total_tenure_months: r.total_tenure_months !== null ? Number(r.total_tenure_months) : null,
    remaining_tenure_months: r.remaining_tenure_months !== null ? Number(r.remaining_tenure_months) : null,
    principal_amount: r.principal_amount !== null ? Number(r.principal_amount) : null,
    interest_rate: r.interest_rate !== null ? Number(r.interest_rate) : null,
    last_paid_date: r.last_paid_date,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getObligationById(db: DatabaseExecutor, id: string): Promise<RecurringObligation | null> {
  const r = await db.getFirst<any>(
    `SELECT id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, 
            remaining_tenure_months, principal_amount, interest_rate, last_paid_date, status, notes, created_at, updated_at 
     FROM recurring_obligations WHERE id = ?;`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    amount: Number(r.amount),
    due_day: Number(r.due_day),
    linked_account_id: r.linked_account_id,
    category: r.category ?? null,
    total_tenure_months: r.total_tenure_months !== null ? Number(r.total_tenure_months) : null,
    remaining_tenure_months: r.remaining_tenure_months !== null ? Number(r.remaining_tenure_months) : null,
    principal_amount: r.principal_amount !== null ? Number(r.principal_amount) : null,
    interest_rate: r.interest_rate !== null ? Number(r.interest_rate) : null,
    last_paid_date: r.last_paid_date,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createObligation(
  db: DatabaseExecutor,
  input: CreateObligationInput
): Promise<RecurringObligation> {
  const id = generateUUID();
  const now = new Date().toISOString();
  const totalTenure = input.total_tenure_months ?? null;
  const remTenure = input.remaining_tenure_months !== undefined ? input.remaining_tenure_months : totalTenure;
  const principal = input.principal_amount ?? null;
  const interest = input.interest_rate ?? null;
  const category = input.category ?? null;

  await db.run(
    `INSERT INTO recurring_obligations (id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, remaining_tenure_months, principal_amount, interest_rate, last_paid_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?, ?, ?);`,
    [
      id,
      input.name,
      input.type,
      input.amount,
      input.due_day,
      input.linked_account_id,
      category,
      totalTenure,
      remTenure,
      principal,
      interest,
      input.notes ?? null,
      now,
      now,
    ]
  );

  return {
    id,
    name: input.name,
    type: input.type,
    amount: input.amount,
    due_day: input.due_day,
    linked_account_id: input.linked_account_id,
    category,
    total_tenure_months: totalTenure,
    remaining_tenure_months: remTenure,
    principal_amount: principal,
    interest_rate: interest,
    last_paid_date: null,
    status: 'ACTIVE',
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export async function updateObligation(
  db: DatabaseExecutor,
  ob: RecurringObligation
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE recurring_obligations 
     SET name = ?, amount = ?, due_day = ?, linked_account_id = ?, category = ?, remaining_tenure_months = ?, last_paid_date = ?, status = ?, notes = ?, updated_at = ?
     WHERE id = ?;`,
    [ob.name, ob.amount, ob.due_day, ob.linked_account_id, ob.category ?? null, ob.remaining_tenure_months, ob.last_paid_date, ob.status, ob.notes, now, ob.id]
  );
}


export async function deleteObligation(db: DatabaseExecutor, id: string): Promise<void> {
  await db.run(`DELETE FROM recurring_obligations WHERE id = ?;`, [id]);
}

// --- INVESTMENTS & SYSTEMATIC INVESTMENT PLANS (SIPs) ---

export async function getAllInvestments(db: DatabaseExecutor): Promise<InvestmentAsset[]> {
  const rows = await db.getAll<any>(
    `SELECT id, name, type, monthly_sip_amount, sip_due_day, linked_account_id, invested_amount, current_value, last_sip_date, notes, created_at, updated_at 
     FROM investments ORDER BY created_at ASC;`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    monthly_sip_amount: r.monthly_sip_amount !== null ? Number(r.monthly_sip_amount) : null,
    sip_due_day: r.sip_due_day !== null ? Number(r.sip_due_day) : null,
    linked_account_id: r.linked_account_id,
    invested_amount: Number(r.invested_amount),
    current_value: Number(r.current_value),
    last_sip_date: r.last_sip_date,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getInvestmentById(db: DatabaseExecutor, id: string): Promise<InvestmentAsset | null> {
  const r = await db.getFirst<any>(
    `SELECT id, name, type, monthly_sip_amount, sip_due_day, linked_account_id, invested_amount, current_value, last_sip_date, notes, created_at, updated_at 
     FROM investments WHERE id = ?;`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    monthly_sip_amount: r.monthly_sip_amount !== null ? Number(r.monthly_sip_amount) : null,
    sip_due_day: r.sip_due_day !== null ? Number(r.sip_due_day) : null,
    linked_account_id: r.linked_account_id,
    invested_amount: Number(r.invested_amount),
    current_value: Number(r.current_value),
    last_sip_date: r.last_sip_date,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createInvestment(
  db: DatabaseExecutor,
  input: CreateInvestmentInput
): Promise<InvestmentAsset> {
  const id = generateUUID();
  const now = new Date().toISOString();
  const monthlySip = input.monthly_sip_amount ?? null;
  const sipDay = input.sip_due_day ?? null;
  const invested = input.invested_amount ?? 0.0;
  const val = input.current_value ?? invested;

  await db.run(
    `INSERT INTO investments (id, name, type, monthly_sip_amount, sip_due_day, linked_account_id, invested_amount, current_value, last_sip_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
    [id, input.name, input.type, monthlySip, sipDay, input.linked_account_id ?? null, invested, val, input.notes ?? null, now, now]
  );

  return {
    id,
    name: input.name,
    type: input.type,
    monthly_sip_amount: monthlySip,
    sip_due_day: sipDay,
    linked_account_id: input.linked_account_id ?? null,
    invested_amount: invested,
    current_value: val,
    last_sip_date: null,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export async function updateInvestment(
  db: DatabaseExecutor,
  inv: InvestmentAsset
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE investments 
     SET name = ?, monthly_sip_amount = ?, sip_due_day = ?, linked_account_id = ?, invested_amount = ?, current_value = ?, last_sip_date = ?, notes = ?, updated_at = ?
     WHERE id = ?;`,
    [inv.name, inv.monthly_sip_amount, inv.sip_due_day, inv.linked_account_id ?? null, inv.invested_amount, inv.current_value, inv.last_sip_date, inv.notes, now, inv.id]
  );
}

export async function deleteInvestment(db: DatabaseExecutor, id: string): Promise<void> {
  await db.run(`DELETE FROM investments WHERE id = ?;`, [id]);
}

export async function reassignAccountObligations(
  db: DatabaseExecutor,
  oldAccountId: string,
  newAccountId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE recurring_obligations SET linked_account_id = ?, updated_at = ? WHERE linked_account_id = ?;`,
    [newAccountId, now, oldAccountId]
  );
}

export async function reassignAccountInvestments(
  db: DatabaseExecutor,
  oldAccountId: string,
  newAccountId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE investments SET linked_account_id = ?, updated_at = ? WHERE linked_account_id = ?;`,
    [newAccountId, now, oldAccountId]
  );
}
