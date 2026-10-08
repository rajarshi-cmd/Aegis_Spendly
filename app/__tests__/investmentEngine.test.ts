import { describe, test, expect } from '@jest/globals';
import { InvestmentEngine } from '../src/core/engines/investmentEngine';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { createAccount, createInvestment } from '../src/core/database/queries';
import { InvestmentAsset } from '../src/core/types/investments';

describe('InvestmentEngine: SIP Execution and Portfolio Valuation', () => {
  test('Executing monthly SIP deducts bank cash and increments asset value', async () => {
    const memDb = new MemoryDatabaseAdapter();
    const bank = await createAccount(memDb, {
      name: 'Primary Checking',
      type: 'BANK_DEPOSIT',
      balance: 10000.0,
    });

    const fund = await createInvestment(memDb, {
      name: 'Vanguard S&P 500 Index SIP',
      type: 'SIP',
      monthly_sip_amount: 500.0,
      sip_due_day: 1,
      linked_account_id: bank.id,
      invested_amount: 5000.0,
      current_value: 5500.0,
    });

    const result = await InvestmentEngine.executeSip(memDb, fund.id);

    // Asset book value increased
    expect(result.investment.invested_amount).toBe(5500.0);
    expect(result.investment.current_value).toBe(6000.0);
    expect(result.investment.last_sip_date).toBeDefined();

    // Bank account debited
    const updatedBank = memDb.store.accounts.find((a) => a.id === bank.id);
    expect(updatedBank?.balance).toBe(9500.0);

    // Ledger movement recorded
    expect(result.transaction?.amount).toBe(500.0);
    expect(result.transaction?.category).toBe('Investment (Asset)');
  });

  test('Calculates portfolio valuation and returns correctly', () => {
    const assets: InvestmentAsset[] = [
      {
        id: '1',
        name: 'Fund A',
        type: 'MUTUAL_FUND',
        monthly_sip_amount: 200,
        sip_due_day: 5,
        linked_account_id: null,
        invested_amount: 10000,
        current_value: 12500,
        last_sip_date: null,
        notes: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        name: 'Gold ETF',
        type: 'GOLD',
        monthly_sip_amount: 100,
        sip_due_day: 10,
        linked_account_id: null,
        invested_amount: 5000,
        current_value: 5500,
        last_sip_date: null,
        notes: null,
        created_at: '',
        updated_at: '',
      },
    ];

    const metrics = InvestmentEngine.calculatePortfolioMetrics(assets);
    expect(metrics.totalInvested).toBe(15000);
    expect(metrics.totalCurrentValue).toBe(18000);
    expect(metrics.totalMonthlyCommitment).toBe(300);
    expect(metrics.absoluteReturn).toBe(3000);
    expect(metrics.returnPercentage).toBe(20.0);
  });
});
