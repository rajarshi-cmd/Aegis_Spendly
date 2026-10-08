import { Account } from '../types/accounts';
import { CreditHealth, CreditStatusTier } from '../types/analytics';

export class CreditMonitor {
  /**
   * Calculates utilization percentage: (Current Card Debt / Credit Limit) * 100
   */
  public static calculateUtilization(currentDebt: number, creditLimit: number | null): number {
    if (typeof creditLimit !== 'number' || !Number.isFinite(creditLimit) || creditLimit <= 0) {
      return 0;
    }
    if (typeof currentDebt !== 'number' || !Number.isFinite(currentDebt) || currentDebt <= 0) {
      return 0;
    }
    const ratio = (currentDebt / creditLimit) * 100;
    return Number(Math.max(0, ratio).toFixed(2));
  }

  /**
   * Maps utilization percentage to dynamic status tiers.
   * Under 15%: Optimal credit profile (calm green theme and safe indicator)
   * 15% to 30%: Standard operational threshold (amber warning theme and caution indicator)
   * Above 30%: High credit exposure hazard (red alert theme and debt warning indicator)
   */
  public static evaluateStatusTier(utilizationPercentage: number): CreditStatusTier {
    if (utilizationPercentage < 15) {
      return 'OPTIMAL';
    } else if (utilizationPercentage <= 30) {
      return 'CAUTION';
    } else {
      return 'ALERT';
    }
  }

  /**
   * Generates complete credit card health diagnostic metadata.
   */
  public static assessCreditHealth(account: Account): CreditHealth | null {
    if (account.type !== 'CREDIT_CARD') {
      return null;
    }

    const creditLimit = typeof account.credit_limit === 'number' && Number.isFinite(account.credit_limit) ? account.credit_limit : 0;
    const currentDebt = Math.max(0, typeof account.balance === 'number' && Number.isFinite(account.balance) ? account.balance : 0);
    const utilization = this.calculateUtilization(currentDebt, creditLimit);
    const tier = this.evaluateStatusTier(utilization);


    switch (tier) {
      case 'OPTIMAL':
        return {
          accountId: account.id,
          accountName: account.name,
          creditDebt: currentDebt,
          creditLimit,
          utilizationPercentage: utilization,
          statusTier: 'OPTIMAL',
          themeColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          badgeLabel: 'Optimal',
          description: 'Safe utilization profile under 15%',
        };
      case 'CAUTION':
        return {
          accountId: account.id,
          accountName: account.name,
          creditDebt: currentDebt,
          creditLimit,
          utilizationPercentage: utilization,
          statusTier: 'CAUTION',
          themeColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          badgeLabel: 'Caution',
          description: 'Standard threshold (15% - 30%)',
        };
      case 'ALERT':
      default:
        return {
          accountId: account.id,
          accountName: account.name,
          creditDebt: currentDebt,
          creditLimit,
          utilizationPercentage: utilization,
          statusTier: 'ALERT',
          themeColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          badgeLabel: 'High Hazard',
          description: 'High credit exposure exceeding 30%',
        };
    }
  }
}
