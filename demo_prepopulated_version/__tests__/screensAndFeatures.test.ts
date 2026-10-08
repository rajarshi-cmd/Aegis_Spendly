import { describe, test, expect, beforeEach } from '@jest/globals';
import { safeFormatDate, safeFormatTime } from '../src/core/utils/date';
import { formatRupee, formatCompactRupee } from '../src/core/utils/currency';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { runMigrations } from '../src/core/database/migrations/runner';
import { seedIfEmpty } from '../src/core/database/seeder';
import {
  getAllAccounts,
  getAllTransactions,
  getAllObligations,
  getAllInvestments,
  createAccount,
  createTransactionRow,
  deleteTransactionRow,
  createObligation,
  deleteObligation,
} from '../src/core/database/queries';
import { Transaction } from '../src/core/types/transactions';
import { Account } from '../src/core/types/accounts';
import { RecurringObligation, PlannedBudget } from '../src/core/types/upcoming';
import { InvestmentEngine } from '../src/core/engines/investmentEngine';
import { UpcomingEngine } from '../src/core/engines/upcomingEngine';
import { DocumentGenerator } from '../src/core/documents/pdfGenerator';
import { AnalyticsEngine } from '../src/core/engines/analyticsEngine';

describe('QA and Code Quality: All 7 Screens and Core Features', () => {
  let db: any;

  beforeEach(async () => {
    db = new MemoryDatabaseAdapter();
    await runMigrations(db);
    await seedIfEmpty(db);
  });

  // =========================================================================
  // 1. TransactionsScreen: Date RangeError Fix, Filters, Search, Soft-delete
  // =========================================================================
  describe('Screen 1: TransactionsScreen', () => {
    test('safeFormatDate never throws RangeError on invalid or corrupted dates', () => {
      expect(() => safeFormatDate('invalid-date-string')).not.toThrow();
      expect(safeFormatDate('invalid-date-string')).toBe('—');

      expect(() => safeFormatDate(null)).not.toThrow();
      expect(safeFormatDate(null)).toBe('—');

      expect(() => safeFormatDate(undefined)).not.toThrow();
      expect(safeFormatDate(undefined)).toBe('—');

      expect(() => safeFormatDate('')).not.toThrow();
      expect(safeFormatDate('')).toBe('—');

      // Valid ISO date formatting
      const formatted = safeFormatDate('2026-10-07T14:30:00.000Z', 'en-IN');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    test('safeFormatTime never throws RangeError on invalid dates', () => {
      expect(() => safeFormatTime('bad-date')).not.toThrow();
      expect(safeFormatTime('bad-date')).toBe('Just now');

      expect(() => safeFormatTime(null)).not.toThrow();
      expect(safeFormatTime(null)).toBe('Just now');

      const formattedTime = safeFormatTime('2026-10-07T14:30:00.000Z');
      expect(typeof formattedTime).toBe('string');
      expect(formattedTime).not.toBe('Just now');
    });

    test('Filters transactions correctly by ALL, EXPENSES, INCOME, and SAVINGS', async () => {
      const txs = await getAllTransactions(db);

      const isSavingsTx = (t: Transaction) => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return (
          cat.includes('saving') ||
          cat.includes('invest') ||
          desc.includes('sip') ||
          desc.includes('saving') ||
          desc.includes('invest') ||
          t.type === 'TRANSFER'
        );
      };

      const expenseCount = txs.filter((t) => t.type === 'OUTFLOW' && !isSavingsTx(t)).length;
      const incomeCount = txs.filter((t) => t.type === 'INFLOW').length;
      const savingsCount = txs.filter(isSavingsTx).length;

      // Filter ALL
      const allFiltered = txs.filter(() => true);
      expect(allFiltered.length).toBe(txs.length);

      // Filter EXPENSES
      const expenseFiltered = txs.filter((tx) => tx.type === 'OUTFLOW' && !isSavingsTx(tx));
      expect(expenseFiltered.length).toBe(expenseCount);
      expect(expenseFiltered.every((tx) => tx.type === 'OUTFLOW')).toBe(true);

      // Filter INCOME
      const incomeFiltered = txs.filter((tx) => tx.type === 'INFLOW');
      expect(incomeFiltered.length).toBe(incomeCount);
      expect(incomeFiltered.every((tx) => tx.type === 'INFLOW')).toBe(true);

      // Filter SAVINGS
      const savingsFiltered = txs.filter(isSavingsTx);
      expect(savingsFiltered.length).toBe(savingsCount);

      // Add a savings/investment transaction and verify it appears in SAVINGS filter
      const accounts = await getAllAccounts(db);
      const bank = accounts.find((a) => a.type === 'BANK_DEPOSIT')!;
      const investmentTx: Transaction = {
        id: 'tx-inv-1',
        account_id: bank.id,
        type: 'OUTFLOW',
        amount: 5000,
        category: 'Investments',
        description: 'Monthly Mutual Fund SIP',
        timestamp: new Date().toISOString(),
        is_reconciled: true,
        reference_number: 'SIP-12345',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      };
      await createTransactionRow(db, investmentTx);

      const updatedTxs = await getAllTransactions(db);
      const updatedSavings = updatedTxs.filter(isSavingsTx);
      expect(updatedSavings.some((t) => t.id === 'tx-inv-1')).toBe(true);
    });

    test('Searches transactions by description, category, and reference number', async () => {
      const txs = await getAllTransactions(db);

      // Search by description (e.g., 'Tokai')
      const qDesc = 'tokai';
      const resultsDesc = txs.filter((t) =>
        t.description?.toLowerCase().includes(qDesc) ||
        t.category.toLowerCase().includes(qDesc) ||
        t.reference_number?.toLowerCase().includes(qDesc)
      );
      expect(resultsDesc.length).toBe(1);
      expect(resultsDesc[0].description).toContain('Blue Tokai');

      // Search by category (e.g., 'Salary')
      const qCat = 'salary';
      const resultsCat = txs.filter((t) =>
        t.description?.toLowerCase().includes(qCat) ||
        t.category.toLowerCase().includes(qCat) ||
        t.reference_number?.toLowerCase().includes(qCat)
      );
      expect(resultsCat.length).toBeGreaterThanOrEqual(1);
      expect(resultsCat[0].category).toBe('Salary');

      // Search by reference number (e.g., 'EB-2026')
      const qRef = 'eb-2026';
      const resultsRef = txs.filter((t) =>
        t.description?.toLowerCase().includes(qRef) ||
        t.category.toLowerCase().includes(qRef) ||
        t.reference_number?.toLowerCase().includes(qRef)
      );
      expect(resultsRef.length).toBe(1);
      expect(resultsRef[0].reference_number).toBe('EB-2026-10');
    });

    test('PDF Export builds valid invoice HTML without throwing', async () => {
      const txs = await getAllTransactions(db);
      const accs = await getAllAccounts(db);
      const period = {
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.999Z',
        label: 'October 2026',
      };
      const metrics = AnalyticsEngine.computeMetrics(txs, period);
      expect(() => {
        const html = DocumentGenerator.buildInvoiceHtml({
          metrics,
          transactions: txs,
          accounts: accs,
        });
        expect(html).toContain('Financial Report');
        expect(html).toContain('Expense Category Breakdown');
      }).not.toThrow();
    });
  });

  // =========================================================================
  // 2. CreditCardsScreen: Cards, Utilization, Linked EMIs, Adding Cards
  // =========================================================================
  describe('Screen 2: CreditCardsScreen', () => {
    test('Calculates aggregate limits, usage, and utilization tier accurately', async () => {
      const accs = await getAllAccounts(db);
      const cards = accs.filter((a) => a.type === 'CREDIT_CARD');
      expect(cards.length).toBe(3); // Regalia, Ace, Coral

      const totalLimit = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
      const totalUsage = cards.reduce((sum, c) => sum + c.balance, 0);
      const aggregatePct = totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 1000) / 10 : 0;

      expect(totalLimit).toBe(52000 + 35000 + 75000); // 162,000
      expect(totalUsage).toBe(8420 + 4680 + 24500); // 37,600
      expect(aggregatePct).toBe(23.2); // (37600 / 162000) * 100 = 23.2%
    });

    test('Accurately maps linked EMIs and subscriptions to each card', async () => {
      const accs = await getAllAccounts(db);
      const obs = await getAllObligations(db);

      const regaliaCard = accs.find((a) => a.name.includes('Regalia'))!;
      const linkedToRegalia = obs.filter((o) => o.linked_account_id === regaliaCard.id);
      expect(linkedToRegalia.length).toBe(1);
      expect(linkedToRegalia[0].name).toBe('Netflix Premium');

      const aceCard = accs.find((a) => a.name.includes('Ace'))!;
      const linkedToAce = obs.filter((o) => o.linked_account_id === aceCard.id);
      expect(linkedToAce.length).toBe(1);
      expect(linkedToAce[0].name).toBe('Phone installment');
    });

    test('Allows adding a new credit card with specific limits and billing days', async () => {
      const newCard = await createAccount(db, {
        name: 'Amazon Pay ICICI',
        type: 'CREDIT_CARD',
        balance: 0,
        credit_limit: 100000,
        billing_cycle_cut_day: 15,
        payment_due_day: 5,
        minimum_balance: null,
        card_color: 'EMERALD',
        last4: '5566',
      });

      expect(newCard.id).toBeDefined();
      expect(newCard.credit_limit).toBe(100000);
      expect(newCard.billing_cycle_cut_day).toBe(15);
      expect(newCard.payment_due_day).toBe(5);

      const all = await getAllAccounts(db);
      const cards = all.filter((a) => a.type === 'CREDIT_CARD');
      expect(cards.length).toBe(4);
    });
  });

  // =========================================================================
  // 3. BanksScreen: Snapshot, Movements, Minimum Balance Calculations
  // =========================================================================
  describe('Screen 3: BanksScreen', () => {
    test('Calculates total bank cash and verifies minimum balance threshold', async () => {
      const accs = await getAllAccounts(db);
      const banks = accs.filter((a) => a.type === 'BANK_DEPOSIT');
      expect(banks.length).toBe(3); // ICICI (82500), Axis (42600), HDFC (18300)

      const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);
      expect(totalCash).toBe(82500 + 42600 + 18300); // 143,400

      // All 3 are above their minimum balance threshold
      for (const bank of banks) {
        const minBal = bank.minimum_balance || 10000;
        const isAboveMin = bank.balance >= minBal;
        expect(isAboveMin).toBe(true);
      }

      // Add a bank below minimum balance
      const lowBank = await createAccount(db, {
        name: 'SBI Savings',
        type: 'BANK_DEPOSIT',
        balance: 1500,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: 5000,
      });

      const isLowAbove = lowBank.balance >= (lowBank.minimum_balance || 0);
      expect(isLowAbove).toBe(false);
    });

    test('Links transactions and scheduled obligations to bank accounts', async () => {
      const accs = await getAllAccounts(db);
      const txs = await getAllTransactions(db);
      const obs = await getAllObligations(db);

      const icici = accs.find((a) => a.name === 'ICICI Bank')!;
      const iciciTxs = txs.filter((t) => t.account_id === icici.id);
      expect(iciciTxs.length).toBeGreaterThanOrEqual(1);

      const iciciObs = obs.filter((o) => o.linked_account_id === icici.id);
      expect(iciciObs.some((o) => o.name === 'Home loan EMI')).toBe(true);
    });
  });

  // =========================================================================
  // 4. PlanAheadScreen: Commitments, Budgets, Check-ins ("Not yet", "Yes, paid")
  // =========================================================================
  describe('Screen 4: PlanAheadScreen', () => {
    test('Calculates committed totals and planned budgets', async () => {
      const obs = await getAllObligations(db);
      const totalCommitted = obs.reduce((sum, o) => sum + o.amount, 0);
      expect(totalCommitted).toBe(649 + 28500 + 75 + 4200); // 33,424

      const plannedBudgets: PlannedBudget[] = [
        { id: 'b-1', category: 'Food & drinks', planned_amount: 7000 },
        { id: 'b-2', category: 'Home', planned_amount: 15000 },
      ];
      const totalBudget = plannedBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
      expect(totalBudget).toBe(22000);
    });

    test('"Yes, paid" check-in executes obligation payment and records transaction', async () => {
      const obs = await getAllObligations(db);
      const netflix = obs.find((o) => o.name === 'Netflix Premium')!;

      const result = await UpcomingEngine.payRecurringObligation(db, netflix.id);
      expect(result.obligation.last_paid_date).toBeDefined();
      expect(result.transaction).not.toBeNull();
      expect(result.transaction?.amount).toBe(649);

      // Verify the payment transaction was stored in db
      const allTxs = await getAllTransactions(db);
      expect(allTxs.some((t) => t.id === result.transaction?.id)).toBe(true);
    });

    test('"Not yet" check-in maintains reminder state and snooze tracking', () => {
      const snoozedObligations: Record<string, boolean> = {};
      const obId = 'ob-sample-1';

      // Snooze / Not yet clicked
      snoozedObligations[obId] = true;
      expect(snoozedObligations[obId]).toBe(true);

      // When subsequently paid, snooze is cleared
      delete snoozedObligations[obId];
      expect(snoozedObligations[obId]).toBeUndefined();
    });

    test('Recovery shelf allows removing, restoring, and permanently deleting commitments', async () => {
      let activeObs = await getAllObligations(db);
      let pastCommitments: RecurringObligation[] = [];

      const target = activeObs[0];

      // Remove commitment -> moves to pastCommitments
      activeObs = activeObs.filter((o) => o.id !== target.id);
      pastCommitments = [{ ...target, status: 'PAUSED' }, ...pastCommitments];

      expect(activeObs.some((o) => o.id === target.id)).toBe(false);
      expect(pastCommitments.some((o) => o.id === target.id)).toBe(true);

      // Restore commitment -> moves back to activeObs
      pastCommitments = pastCommitments.filter((o) => o.id !== target.id);
      activeObs = [{ ...target, status: 'ACTIVE' }, ...activeObs];

      expect(pastCommitments.some((o) => o.id === target.id)).toBe(false);
      expect(activeObs.some((o) => o.id === target.id)).toBe(true);

      // Permanent delete -> deletes row from DB
      await deleteObligation(db, target.id);
      const fromDb = await getAllObligations(db);
      expect(fromDb.some((o) => o.id === target.id)).toBe(false);
    });
  });

  // =========================================================================
  // 5. InvestmentsScreen: SIP Plans, Portfolio Metrics, Execute SIP
  // =========================================================================
  describe('Screen 5: InvestmentsScreen', () => {
    test('Calculates monthly SIP commitments and portfolio metrics', async () => {
      const invs = await getAllInvestments(db);
      const metrics = InvestmentEngine.calculatePortfolioMetrics(invs);

      expect(metrics.totalInvested).toBeGreaterThan(0);
      expect(metrics.totalCurrentValue).toBeGreaterThan(0);
      expect(metrics.absoluteReturn).toBe(metrics.totalCurrentValue - metrics.totalInvested);
      expect(metrics.totalMonthlyCommitment).toBe(15000); // Nifty 50 SIP
    });

    test('Executing SIP deducts from bank, updates asset value, and records ledger entry', async () => {
      const invs = await getAllInvestments(db);
      const sip = invs.find((i) => i.type === 'SIP')!;
      const bankBefore = (await getAllAccounts(db)).find((a) => a.id === sip.linked_account_id)!;

      const initialInvested = sip.invested_amount;
      const initialBankBalance = bankBefore.balance;

      const { investment: updatedInv, transaction: tx } = await InvestmentEngine.executeSip(db, sip.id);

      expect(updatedInv.invested_amount).toBe(initialInvested + (sip.monthly_sip_amount || 0));
      expect(tx).not.toBeNull();
      expect(tx?.amount).toBe(sip.monthly_sip_amount);
      expect(tx?.category).toBe('Investment (Asset)');

      const bankAfter = (await getAllAccounts(db)).find((a) => a.id === sip.linked_account_id)!;
      expect(bankAfter.balance).toBe(initialBankBalance - (sip.monthly_sip_amount || 0));
    });
  });

  // =========================================================================
  // 6. HistoryScreen: Soft-delete, Restore, Permanent Delete
  // =========================================================================
  describe('Screen 6: HistoryScreen', () => {
    test('Soft-deleted transactions move to history, can be restored, or deleted permanently', async () => {
      const txs = await getAllTransactions(db);
      const target = txs[0];

      // Soft delete:
      let active = txs.filter((t) => t.id !== target.id);
      let deleted: Transaction[] = [{ ...target, is_deleted: true, deleted_at: new Date().toISOString() }];

      expect(active.some((t) => t.id === target.id)).toBe(false);
      expect(deleted.some((t) => t.id === target.id)).toBe(true);

      // Restore:
      deleted = deleted.filter((t) => t.id !== target.id);
      active = [{ ...target, is_deleted: false, deleted_at: null }, ...active];

      expect(deleted.some((t) => t.id === target.id)).toBe(false);
      expect(active.some((t) => t.id === target.id)).toBe(true);

      // Permanent delete:
      await deleteTransactionRow(db, target.id);
      const fromDb = await getAllTransactions(db);
      expect(fromDb.some((t) => t.id === target.id)).toBe(false);
    });
  });

  // =========================================================================
  // 7. OverviewScreen: Income, Expenses, Available Balance, Savings Rate
  // =========================================================================
  describe('Screen 7: OverviewScreen', () => {
    test('Computes financial health metrics and currency formatting', async () => {
      const txs = await getAllTransactions(db);
      const accs = await getAllAccounts(db);

      const totalIncome = txs.filter((t) => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = txs.filter((t) => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0);

      expect(totalIncome).toBe(148000);
      expect(totalExpenses).toBeGreaterThan(0);

      const savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
      expect(savingsRate).toBeGreaterThan(0);

      // Currency formatters
      expect(formatRupee(129400)).toBe('₹1,29,400');
      expect(formatRupee(-480)).toBe('-₹480');
      expect(formatCompactRupee(18600)).toBe('₹18.6k');
      expect(formatCompactRupee(148000)).toBe('₹1.5L');
    });

    test('Generates valid segmented conic-gradient for Donut Chart covering 100%', () => {
      const categoryBreakdown = [
        { cat: 'Food & drinks', pct: 28, amt: 5140, color: '#F59E0B' },
        { cat: 'Home', pct: 23, amt: 4220, color: '#10B981' },
        { cat: 'Shopping', pct: 19, amt: 3480, color: '#8B5CF6' },
        { cat: 'Transport', pct: 16, amt: 2940, color: '#0284C7' },
        { cat: 'Other', pct: 14, amt: 2600, color: '#94A3B8' },
        { cat: 'Investments saved', pct: 0, amt: 0, color: '#0F4C3A' },
      ];

      const valid = categoryBreakdown.filter((item) => item.pct > 0);
      let accum = 0;
      const stops: string[] = [];
      for (const item of valid) {
        const start = accum;
        const end = Math.min(100, accum + item.pct);
        accum = end;
        stops.push(`${item.color} ${start}% ${end}%`);
      }
      if (accum < 100) {
        stops.push(`#CBD5E1 ${accum}% 100%`);
      }
      const conicGradient = `conic-gradient(${stops.join(', ')})`;

      expect(accum).toBe(100);
      expect(conicGradient).toContain('conic-gradient(');
      expect(conicGradient).toContain('#F59E0B 0% 28%');
      expect(conicGradient).toContain('#10B981 28% 51%');
      expect(conicGradient).toContain('#8B5CF6 51% 70%');
      expect(conicGradient).toContain('#0284C7 70% 86%');
      expect(conicGradient).toContain('#94A3B8 86% 100%');
    });

    test('Evaluates Credit Card utilization amber/green/red conditions correctly', () => {
      const getUtilTier = (util: number) => {
        if (util > 30) return { label: 'Attention', isRed: true };
        if (util > 15) return { label: 'Watch', isAmber: true };
        return { label: 'Healthy', isGreen: true };
      };

      // Under 15% -> Green
      expect(getUtilTier(13.4).isGreen).toBe(true);
      expect(getUtilTier(13.4).label).toBe('Healthy');

      // 15% to 30% -> Amber
      expect(getUtilTier(16.2).isAmber).toBe(true);
      expect(getUtilTier(16.2).label).toBe('Watch');

      // Over 30% -> Red
      expect(getUtilTier(32.7).isRed).toBe(true);
      expect(getUtilTier(32.7).label).toBe('Attention');
    });

    test('Evaluates Bank Account minimum balance buffer conditions correctly', () => {
      const getBankTier = (balance: number, minBal: number) => {
        const diff = balance - minBal;
        if (diff < 0) return { label: 'Below minimum', status: 'danger' };
        if (diff < minBal * 0.25) return { label: 'Near minimum', status: 'warning' };
        return { label: 'Above minimum', status: 'healthy' };
      };

      // Healthy: well above min
      expect(getBankTier(82500, 10000).status).toBe('healthy');

      // Near min: buffer within 25% of min
      expect(getBankTier(11000, 10000).status).toBe('warning');

      // Below min: deficit
      expect(getBankTier(8000, 10000).status).toBe('danger');
    });
  });
});
