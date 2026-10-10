import { describe, test, expect } from '@jest/globals';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { runMigrations } from '../src/core/database/migrations/runner';
import { seedIfEmpty } from '../src/core/database/seeder';
import { getAllAccounts, getAllTransactions, getAllDebts, getAllRecurringObligations, getAllInvestments } from '../src/core/database/queries';
import { RecurringObligation } from '../src/core/types/upcoming';
import { CreditMonitor } from '../src/core/engines/creditMonitor';

describe('Database Migrations and First-Launch Seeder', () => {
  test('Versioned migration runner executes pending migrations idempotently', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const appliedFirst = await runMigrations(memDb);
    expect(appliedFirst).toBe(3);
    expect(memDb.store.schema_migrations.length).toBe(3);
    expect(memDb.store.schema_migrations[0].version).toBe(1);
    expect(memDb.store.schema_migrations[1].version).toBe(2);
    expect(memDb.store.schema_migrations[2].version).toBe(3);

    // Running again should apply 0 migrations
    const appliedSecond = await runMigrations(memDb);
    expect(appliedSecond).toBe(0);
    expect(memDb.store.schema_migrations.length).toBe(3);
  });

  test('Seeder populates 1 bank, 2 credit cards (varying utilization), transactions, active debt, obligations, and investments', async () => {
    const memDb = new MemoryDatabaseAdapter();
    await runMigrations(memDb);

    const didSeed = await seedIfEmpty(memDb);
    expect(didSeed).toBe(true);

    const accounts = await getAllAccounts(memDb);
    const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
    const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

    // 3 Bank accounts with minimum balance
    expect(bankAccounts.length).toBe(3);
    const icici = bankAccounts.find((b) => b.name === 'ICICI Bank');
    expect(icici).toBeDefined();
    expect(icici?.balance).toBe(82500.0);
    expect(icici?.minimum_balance).toBe(10000.0);

    // 3 Credit cards
    expect(creditCards.length).toBe(3);

    // Check utilization tiers
    const cardHealths = creditCards.map((c) => CreditMonitor.assessCreditHealth(c)?.statusTier);
    expect(cardHealths).toContain('OPTIMAL');
    expect(cardHealths).toContain('CAUTION');
    expect(cardHealths).toContain('ALERT');

    // Sample transactions
    const txs = await getAllTransactions(memDb);
    expect(txs.length).toBeGreaterThanOrEqual(6);

    // Active debt
    const debts = await getAllDebts(memDb);
    expect(debts.length).toBe(1);
    expect(debts[0].counterparty).toBe('Marcus Vance');
    expect(debts[0].outstanding_balance).toBe(750.0);

    // Audit settlement ledger
    expect(memDb.store.settlements.length).toBe(1);

    // Recurring obligations (Subscriptions, EMIs)
    const obligations = await getAllRecurringObligations(memDb);
    expect(obligations.length).toBeGreaterThanOrEqual(3);
    const subscription = obligations.find((o: RecurringObligation) => o.type === 'SUBSCRIPTION');
    const emi = obligations.find((o: RecurringObligation) => o.type === 'EMI');
    expect(subscription).toBeDefined();
    expect(emi).toBeDefined();

    // Investments and SIPs
    const investments = await getAllInvestments(memDb);
    expect(investments.length).toBeGreaterThanOrEqual(2);
    const sipAsset = investments.find((i) => (i.monthly_sip_amount ?? 0) > 0);
    expect(sipAsset).toBeDefined();

    // Idempotent: Second call does not re-seed
    const didSeedAgain = await seedIfEmpty(memDb);
    expect(didSeedAgain).toBe(false);
    expect(accounts.length).toBe(6);
  });
});
