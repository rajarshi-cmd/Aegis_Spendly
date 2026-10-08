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
   * Maps utilization percentage to dynamic status tiers based on user-provided keepTrackRatio.
   * - Under 50% of target ratio: Optimal green indicator (e.g. for 60% target, green is 0% - 30%)
   * - 50% to 100% of target ratio: Caution amber indicator (e.g. 30% - 60%)
   * - Above target ratio: Alert red indicator (e.g. > 60%)
   */
  public static evaluateStatusTier(utilizationPercentage: number, keepTrackRatio: number = 30): CreditStatusTier {
    const greenLimit = keepTrackRatio * 0.5;
    const yellowLimit = keepTrackRatio;

    if (utilizationPercentage < greenLimit) {
      return 'OPTIMAL';
    } else if (utilizationPercentage <= yellowLimit) {
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
    const targetRatio = typeof account.keep_track_ratio === 'number' && Number.isFinite(account.keep_track_ratio) && account.keep_track_ratio > 0
      ? account.keep_track_ratio
      : 30; // default 30% for standard banking metric
    const tier = this.evaluateStatusTier(utilization, targetRatio);

    const halfRatio = Math.round(targetRatio * 0.5);

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
          description: `Safe utilization profile under ${halfRatio}% (Target: ${targetRatio}%)`,
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
          description: `Approaching target threshold (${halfRatio}% - ${targetRatio}%)`,
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
          description: `Exceeded target threshold of ${targetRatio}%`,
        };
    }
  }
}
