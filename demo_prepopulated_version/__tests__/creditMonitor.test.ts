import { describe, test, expect } from '@jest/globals';
import { CreditMonitor } from '../src/core/engines/creditMonitor';
import { Account } from '../src/core/types/accounts';

describe('CreditMonitor & Credit Card Health Formulas', () => {
  test('Calculates utilization formula correctly', () => {
    expect(CreditMonitor.calculateUtilization(1200, 10000)).toBe(12);
    expect(CreditMonitor.calculateUtilization(1500, 5000)).toBe(30);
    expect(CreditMonitor.calculateUtilization(2000, 5000)).toBe(40);
  });

  test('Dynamic status tiers classification', () => {
    // Under 15%: Optimal
    expect(CreditMonitor.evaluateStatusTier(0)).toBe('OPTIMAL');
    expect(CreditMonitor.evaluateStatusTier(14.99)).toBe('OPTIMAL');

    // 15% to 30%: Caution
    expect(CreditMonitor.evaluateStatusTier(15.0)).toBe('CAUTION');
    expect(CreditMonitor.evaluateStatusTier(25.0)).toBe('CAUTION');
    expect(CreditMonitor.evaluateStatusTier(30.0)).toBe('CAUTION');

    // Above 30%: Hazard Alert
    expect(CreditMonitor.evaluateStatusTier(30.01)).toBe('ALERT');
    expect(CreditMonitor.evaluateStatusTier(65.0)).toBe('ALERT');
  });

  test('Produces full credit health metadata with color themes', () => {
    const optimalCard: Account = {
      id: 'c1',
      name: 'Safe Card',
      type: 'CREDIT_CARD',
      balance: 1000,
      credit_limit: 10000,
      billing_cycle_cut_day: 1,
      payment_due_day: 20,
      minimum_balance: null,
      created_at: '',
      updated_at: '',
    };

    const health = CreditMonitor.assessCreditHealth(optimalCard);
    expect(health).not.toBeNull();
    expect(health?.statusTier).toBe('OPTIMAL');
    expect(health?.themeColor).toBe('#10B981');
    expect(health?.badgeLabel).toBe('Optimal');

    const hazardCard: Account = {
      id: 'c2',
      name: 'Maxed Card',
      type: 'CREDIT_CARD',
      balance: 4000,
      credit_limit: 10000,
      billing_cycle_cut_day: 1,
      payment_due_day: 20,
      minimum_balance: null,
      created_at: '',
      updated_at: '',
    };

    const hazardHealth = CreditMonitor.assessCreditHealth(hazardCard);
    expect(hazardHealth?.statusTier).toBe('ALERT');
    expect(hazardHealth?.themeColor).toBe('#EF4444');
    expect(hazardHealth?.badgeLabel).toBe('High Hazard');
  });
});
