import { describe, test, expect } from '@jest/globals';
import { AnalyticsEngine } from '../src/core/engines/analyticsEngine';
import { Transaction } from '../src/core/types/transactions';

describe('AnalyticsEngine: Metrics Aggregation & Spend Distribution', () => {
  const period = {
    startDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-31T23:59:59Z',
    label: 'October 2026',
  };

  const sampleTxs: Transaction[] = [
    {
      id: 'tx1',
      account_id: 'acc1',
      type: 'INFLOW',
      amount: 5000.0,
      category: 'Salary',
      description: 'Monthly payroll',
      timestamp: '2026-10-05T10:00:00Z',
      is_reconciled: true,
      reference_number: null,
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    {
      id: 'tx2',
      account_id: 'acc1',
      type: 'OUTFLOW',
      amount: 1200.0,
      category: 'Rent',
      description: 'Apartment rent',
      timestamp: '2026-10-02T10:00:00Z',
      is_reconciled: true,
      reference_number: null,
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    {
      id: 'tx3',
      account_id: 'acc1',
      type: 'OUTFLOW',
      amount: 400.0,
      category: 'Groceries',
      description: 'Grocery stores',
      timestamp: '2026-10-10T10:00:00Z',
      is_reconciled: true,
      reference_number: null,
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    {
      id: 'tx4',
      account_id: 'acc1',
      type: 'OUTFLOW',
      amount: 400.0,
      category: 'Dining',
      description: 'Restaurants',
      timestamp: '2026-10-15T10:00:00Z',
      is_reconciled: true,
      reference_number: null,
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
    // Out of range transaction (November)
    {
      id: 'tx5',
      account_id: 'acc1',
      type: 'OUTFLOW',
      amount: 999.0,
      category: 'Electronics',
      description: 'New gadget',
      timestamp: '2026-11-05T10:00:00Z',
      is_reconciled: true,
      reference_number: null,
      source: 'MANUAL',
      sync_status: 'LOCAL_ONLY',
      destination_account_id: null,
    },
  ];

  test('Computes aggregate inflows, outflows, and net savings accurately', () => {
    const metrics = AnalyticsEngine.computeMetrics(sampleTxs, period);

    expect(metrics.totalInflows).toBe(5000.0);
    expect(metrics.totalOutflows).toBe(2000.0); // 1200 + 400 + 400
    expect(metrics.netSavings).toBe(3000.0); // 5000 - 2000
  });

  test('Computes category spend breakdown and percentage shares', () => {
    const metrics = AnalyticsEngine.computeMetrics(sampleTxs, period);

    // Total outflow = 2000.0
    // Rent: 1200 / 2000 = 60.0%
    // Groceries: 400 / 2000 = 20.0%
    // Dining: 400 / 2000 = 20.0%
    expect(metrics.categorySpend.length).toBe(3);
    expect(metrics.categorySpend[0]).toEqual({
      category: 'Rent',
      amount: 1200.0,
      percentage: 60.0,
    });
    expect(metrics.categorySpend[1].percentage).toBe(20.0);
    expect(metrics.categorySpend[2].percentage).toBe(20.0);
  });
});
