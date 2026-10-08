import { DatabaseExecutor } from './types';

interface TableStore {
  accounts: any[];
  transactions: any[];
  debts: any[];
  settlements: any[];
  recurring_obligations: any[];
  investments: any[];
  schema_migrations: any[];
}

export class MemoryDatabaseAdapter implements DatabaseExecutor {
  public store: TableStore = {
    accounts: [],
    transactions: [],
    debts: [],
    settlements: [],
    recurring_obligations: [],
    investments: [],
    schema_migrations: [],
  };

  async exec(sql: string): Promise<void> {
    return;
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('INSERT INTO ACCOUNTS')) {
      let id: any, name: any, type: any, balance: any, credit_limit: any, billing_cycle_cut_day: any, payment_due_day: any, minimum_balance: any, keep_track_ratio: any = null, card_color: any = null, last4: any = null, created_at: any, updated_at: any;

      if (params.length === 13) {
        [id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, minimum_balance, keep_track_ratio, card_color, last4, created_at, updated_at] = params;
      } else if (params.length === 12) {
        [id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, minimum_balance, card_color, last4, created_at, updated_at] = params;
      } else {
        [id, name, type, balance, credit_limit, billing_cycle_cut_day, payment_due_day, minimum_balance, created_at, updated_at] = params;
      }

      this.store.accounts.push({
        id,
        name,
        type,
        balance,
        credit_limit,
        billing_cycle_cut_day,
        payment_due_day,
        minimum_balance: minimum_balance ?? null,
        keep_track_ratio: keep_track_ratio ?? null,
        card_color: card_color ?? null,
        last4: last4 ?? null,
        created_at,
        updated_at,
      });
      return { changes: 1, lastInsertRowId: this.store.accounts.length };
    }

    if (trimmed.startsWith('INSERT INTO TRANSACTIONS')) {
      const [id, account_id, type, amount, category, description, timestamp, is_reconciled, reference_number, source, sync_status, destination_account_id] = params;
      this.store.transactions.push({ id, account_id, type, amount, category, description, timestamp, is_reconciled, reference_number, source, sync_status, destination_account_id });
      return { changes: 1, lastInsertRowId: this.store.transactions.length };
    }

    if (trimmed.startsWith('INSERT INTO DEBTS')) {
      const [id, counterparty, direction, principal_amount, outstanding_balance, settlement_account_id, origination_date, due_date, status, notes, created_at, updated_at] = params;
      this.store.debts.push({ id, counterparty, direction, principal_amount, outstanding_balance, settlement_account_id, origination_date, due_date, status, notes, created_at, updated_at });
      return { changes: 1, lastInsertRowId: this.store.debts.length };
    }

    if (trimmed.startsWith('INSERT INTO SETTLEMENTS')) {
      const [id, debt_id, amount, settlement_date, settlement_account_id, notes] = params;
      this.store.settlements.push({ id, debt_id, amount, settlement_date, settlement_account_id, notes });
      return { changes: 1, lastInsertRowId: this.store.settlements.length };
    }

    if (trimmed.startsWith('INSERT INTO RECURRING_OBLIGATIONS')) {
      let id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, remaining_tenure_months, principal_amount, interest_rate, notes, created_at, updated_at;
      if (params.length >= 14) {
        [id, name, type, amount, due_day, linked_account_id, category, total_tenure_months, remaining_tenure_months, principal_amount, interest_rate, notes, created_at, updated_at] = params;
      } else {
        [id, name, type, amount, due_day, linked_account_id, total_tenure_months, remaining_tenure_months, principal_amount, interest_rate, notes, created_at, updated_at] = params;
        category = null;
      }
      this.store.recurring_obligations.push({
        id,
        name,
        type,
        amount,
        due_day,
        linked_account_id,
        category: category ?? null,
        total_tenure_months,
        remaining_tenure_months,
        principal_amount,
        interest_rate,
        last_paid_date: null,
        status: 'ACTIVE',
        notes,
        created_at,
        updated_at,
      });
      return { changes: 1, lastInsertRowId: this.store.recurring_obligations.length };
    }

    if (trimmed.startsWith('INSERT INTO INVESTMENTS')) {
      const [id, name, type, monthly_sip_amount, sip_due_day, linked_account_id, invested_amount, current_value, notes, created_at, updated_at] = params;
      this.store.investments.push({
        id,
        name,
        type,
        monthly_sip_amount,
        sip_due_day,
        linked_account_id,
        invested_amount,
        current_value,
        last_sip_date: null,
        notes,
        created_at,
        updated_at,
      });
      return { changes: 1, lastInsertRowId: this.store.investments.length };
    }

    if (trimmed.startsWith('INSERT INTO SCHEMA_MIGRATIONS')) {
      const [version, name, applied_at] = params;
      this.store.schema_migrations.push({ version, name, applied_at });
      return { changes: 1, lastInsertRowId: this.store.schema_migrations.length };
    }

    if (trimmed.startsWith('UPDATE ACCOUNTS') && trimmed.includes('SET BALANCE = ?')) {
      const [balance, updated_at, id] = params;
      const acc = this.store.accounts.find((a) => a.id === id);
      if (acc) {
        acc.balance = balance;
        acc.updated_at = updated_at;
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    if (trimmed.startsWith('UPDATE ACCOUNTS') && trimmed.includes('SET NAME = ?')) {
      const id = params[params.length - 1];
      const acc = this.store.accounts.find((a) => a.id === id);
      if (acc) {
        acc.name = params[0];
        acc.credit_limit = params[1];
        acc.billing_cycle_cut_day = params[2];
        acc.payment_due_day = params[3];
        acc.minimum_balance = params[4];
        if (params.length === 10) {
          acc.keep_track_ratio = params[5];
          acc.card_color = params[6];
          acc.last4 = params[7];
          acc.updated_at = params[8];
        } else if (params.length === 9) {
          acc.card_color = params[5];
          acc.last4 = params[6];
          acc.updated_at = params[7];
        } else {
          acc.updated_at = params[5];
        }
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    if (trimmed.startsWith('UPDATE RECURRING_OBLIGATIONS')) {
      if (trimmed.includes('SET LINKED_ACCOUNT_ID = ?') && trimmed.includes('WHERE LINKED_ACCOUNT_ID = ?')) {
        const [newAccId, updated_at, oldAccId] = params;
        this.store.recurring_obligations.forEach((o) => {
          if (o.linked_account_id === oldAccId) {
            o.linked_account_id = newAccId;
            o.updated_at = updated_at;
          }
        });
        return { changes: 1, lastInsertRowId: 0 };
      }
      const id = params[params.length - 1];
      const ob = this.store.recurring_obligations.find((o) => o.id === id);
      if (ob) {
        if (params.length === 11 && trimmed.includes('LINKED_ACCOUNT_ID = ?')) {
          const [name, amount, due_day, linked_account_id, category, remaining_tenure_months, last_paid_date, status, notes, updated_at] = params;
          ob.name = name;
          ob.amount = amount;
          ob.due_day = due_day;
          ob.linked_account_id = linked_account_id;
          ob.category = category;
          ob.remaining_tenure_months = remaining_tenure_months;
          ob.last_paid_date = last_paid_date;
          ob.status = status;
          ob.notes = notes;
          ob.updated_at = updated_at;
        } else if (params.length >= 10) {
          const [name, amount, due_day, category, remaining_tenure_months, last_paid_date, status, notes, updated_at] = params;
          ob.name = name;
          ob.amount = amount;
          ob.due_day = due_day;
          ob.category = category;
          ob.remaining_tenure_months = remaining_tenure_months;
          ob.last_paid_date = last_paid_date;
          ob.status = status;
          ob.notes = notes;
          ob.updated_at = updated_at;
        } else {
          const [name, amount, due_day, remaining_tenure_months, last_paid_date, status, notes, updated_at] = params;
          ob.name = name;
          ob.amount = amount;
          ob.due_day = due_day;
          ob.remaining_tenure_months = remaining_tenure_months;
          ob.last_paid_date = last_paid_date;
          ob.status = status;
          ob.notes = notes;
          ob.updated_at = updated_at;
        }
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    if (trimmed.startsWith('UPDATE INVESTMENTS')) {
      if (trimmed.includes('SET LINKED_ACCOUNT_ID = ?') && trimmed.includes('WHERE LINKED_ACCOUNT_ID = ?')) {
        const [newAccId, updated_at, oldAccId] = params;
        this.store.investments.forEach((i) => {
          if (i.linked_account_id === oldAccId) {
            i.linked_account_id = newAccId;
            i.updated_at = updated_at;
          }
        });
        return { changes: 1, lastInsertRowId: 0 };
      }
      const id = params[params.length - 1];
      const inv = this.store.investments.find((i) => i.id === id);
      if (inv) {
        if (params.length === 10 && trimmed.includes('LINKED_ACCOUNT_ID = ?')) {
          const [name, monthly_sip_amount, sip_due_day, linked_account_id, invested_amount, current_value, last_sip_date, notes, updated_at] = params;
          inv.name = name;
          inv.monthly_sip_amount = monthly_sip_amount;
          inv.sip_due_day = sip_due_day;
          inv.linked_account_id = linked_account_id;
          inv.invested_amount = invested_amount;
          inv.current_value = current_value;
          inv.last_sip_date = last_sip_date;
          inv.notes = notes;
          inv.updated_at = updated_at;
        } else {
          const [name, monthly_sip_amount, sip_due_day, invested_amount, current_value, last_sip_date, notes, updated_at] = params;
          inv.name = name;
          inv.monthly_sip_amount = monthly_sip_amount;
          inv.sip_due_day = sip_due_day;
          inv.invested_amount = invested_amount;
          inv.current_value = current_value;
          inv.last_sip_date = last_sip_date;
          inv.notes = notes;
          inv.updated_at = updated_at;
        }
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    if (trimmed.startsWith('DELETE FROM ACCOUNTS')) {
      const [id] = params;
      this.store.accounts = this.store.accounts.filter((a) => a.id !== id);
      this.store.transactions = this.store.transactions.filter((t) => t.account_id !== id && t.destination_account_id !== id);
      this.store.debts = this.store.debts.filter((d) => d.settlement_account_id !== id);
      this.store.settlements = this.store.settlements.filter((s) => s.settlement_account_id !== id);
      this.store.recurring_obligations = this.store.recurring_obligations.filter((o) => o.linked_account_id !== id);
      this.store.investments.forEach((i) => {
        if (i.linked_account_id === id) i.linked_account_id = null;
      });
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (trimmed.startsWith('DELETE FROM TRANSACTIONS')) {
      const [id] = params;
      this.store.transactions = this.store.transactions.filter((t) => t.id !== id);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (trimmed.startsWith('DELETE FROM RECURRING_OBLIGATIONS')) {
      const [id] = params;
      this.store.recurring_obligations = this.store.recurring_obligations.filter((o) => o.id !== id);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (trimmed.startsWith('DELETE FROM INVESTMENTS')) {
      const [id] = params;
      this.store.investments = this.store.investments.filter((i) => i.id !== id);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (trimmed.startsWith('DELETE FROM DEBTS')) {
      const [id] = params;
      this.store.debts = this.store.debts.filter((d) => d.id !== id);
      this.store.settlements = this.store.settlements.filter((s) => s.debt_id !== id);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (trimmed.startsWith('DELETE FROM SETTLEMENTS')) {
      if (trimmed.includes('WHERE DEBT_ID = ?')) {
        const [debtId] = params;
        this.store.settlements = this.store.settlements.filter((s) => s.debt_id !== debtId);
        return { changes: 1, lastInsertRowId: 0 };
      }
      if (trimmed.includes('WHERE ID = ?')) {
        const [id] = params;
        this.store.settlements = this.store.settlements.filter((s) => s.id !== id);
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    if (trimmed.startsWith('UPDATE DEBTS SET OUTSTANDING_BALANCE = ?')) {
      const [outstanding, status, updated_at, id] = params;
      const debt = this.store.debts.find((d) => d.id === id);
      if (debt) {
        debt.outstanding_balance = outstanding;
        debt.status = status;
        debt.updated_at = updated_at;
        return { changes: 1, lastInsertRowId: 0 };
      }
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  async getFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const list = await this.getAll<T>(sql, params);
    return list[0] ?? null;
  }

  async getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.includes('FROM SCHEMA_MIGRATIONS')) {
      return [...this.store.schema_migrations] as T[];
    }
    if (trimmed.includes('FROM ACCOUNTS')) {
      if (trimmed.includes('WHERE ID = ?')) {
        return this.store.accounts.filter((a) => a.id === params[0]) as T[];
      }
      return [...this.store.accounts] as T[];
    }
    if (trimmed.includes('FROM TRANSACTIONS')) {
      let result = [...this.store.transactions];
      if (trimmed.includes('WHERE ACCOUNT_ID = ?')) {
        result = result.filter((t) => t.account_id === params[0]);
      } else if (trimmed.includes('(ACCOUNT_ID = ? OR DESTINATION_ACCOUNT_ID = ?)')) {
        result = result.filter((t) => t.account_id === params[0] || t.destination_account_id === params[0]);
      }
      return result as T[];
    }
    if (trimmed.includes('FROM DEBTS')) {
      if (trimmed.includes('WHERE ID = ?')) {
        return this.store.debts.filter((d) => d.id === params[0]) as T[];
      }
      return [...this.store.debts] as T[];
    }
    if (trimmed.includes('FROM SETTLEMENTS')) {
      if (trimmed.includes('WHERE DEBT_ID = ?')) {
        return this.store.settlements.filter((s) => s.debt_id === params[0]) as T[];
      }
      return [...this.store.settlements] as T[];
    }
    if (trimmed.includes('FROM RECURRING_OBLIGATIONS')) {
      if (trimmed.includes('WHERE ID = ?')) {
        return this.store.recurring_obligations.filter((o) => o.id === params[0]) as T[];
      }
      if (trimmed.includes('WHERE LINKED_ACCOUNT_ID = ?')) {
        return this.store.recurring_obligations.filter((o) => o.linked_account_id === params[0]) as T[];
      }
      return [...this.store.recurring_obligations] as T[];
    }
    if (trimmed.includes('FROM INVESTMENTS')) {
      if (trimmed.includes('WHERE ID = ?')) {
        return this.store.investments.filter((i) => i.id === params[0]) as T[];
      }
      return [...this.store.investments] as T[];
    }
    return [] as T[];
  }

  async withTransaction<T>(action: () => Promise<T>): Promise<T> {
    const backup: TableStore = {
      accounts: this.store.accounts.map((a) => ({ ...a })),
      transactions: this.store.transactions.map((t) => ({ ...t })),
      debts: this.store.debts.map((d) => ({ ...d })),
      settlements: this.store.settlements.map((s) => ({ ...s })),
      recurring_obligations: this.store.recurring_obligations.map((o) => ({ ...o })),
      investments: this.store.investments.map((i) => ({ ...i })),
      schema_migrations: [...this.store.schema_migrations],
    };
    try {
      return await action();
    } catch (err) {
      this.store = backup;
      throw err;
    }
  }

}

export function createMemoryDatabase(): MemoryDatabaseAdapter {
  return new MemoryDatabaseAdapter();
}

