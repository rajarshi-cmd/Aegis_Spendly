import { Transaction } from '../types/transactions';
import { AnalyticsMetrics, CategorySpend, DateRange } from '../types/analytics';

export class AnalyticsEngine {
  /**
   * Generates date boundary for the current monthly cycle.
   */
  public static getCurrentMonthRange(refDate: Date = new Date()): DateRange {
    const year = refDate.getFullYear();
    const month = refDate.getMonth(); // 0-indexed
    const startDate = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    
    const monthName = refDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      startDate,
      endDate,
      label: monthName,
    };
  }

  /**
   * Generates date boundary for full calendar annual cycle.
   */
  public static getCurrentYearRange(refDate: Date = new Date()): DateRange {
    const year = refDate.getFullYear();
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0).toISOString();
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

    return {
      startDate,
      endDate,
      label: `FY ${year}`,
    };
  }

  /**
   * Generates custom date range boundary.
   */
  public static getCustomRange(startIso: string, endIso: string): DateRange {
    const startFormatted = new Date(startIso).toLocaleDateString();
    const endFormatted = new Date(endIso).toLocaleDateString();
    return {
      startDate: startIso,
      endDate: endIso,
      label: `${startFormatted} - ${endFormatted}`,
    };
  }

  /**
   * Aggregates transactions into financial analytics metrics:
   * - Total Inflows
   * - Total Outflows
   * - Net Savings (Inflows - Outflows)
   * - Category Spend Distribution (% share of total outflow)
   */
  public static computeMetrics(
    transactions: Transaction[],
    period: DateRange
  ): AnalyticsMetrics {
    const startTime = new Date(period.startDate).getTime();
    const endTime = new Date(period.endDate).getTime();

    // Filter within boundaries
    const filtered = transactions.filter((tx) => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime >= startTime && txTime <= endTime;
    });

    let totalInflows = 0;
    let totalOutflows = 0;
    const categoryTotals: Record<string, number> = {};

    for (const tx of filtered) {
      if (tx.type === 'INFLOW') {
        totalInflows += tx.amount;
      } else if (tx.type === 'OUTFLOW') {
        totalOutflows += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
      // Note: Transfers are balance migrations between owned nodes, so they don't count towards net savings
    }

    totalInflows = Number(totalInflows.toFixed(2));
    totalOutflows = Number(totalOutflows.toFixed(2));
    const netSavings = Number((totalInflows - totalOutflows).toFixed(2));

    const categorySpend: CategorySpend[] = Object.entries(categoryTotals)
      .map(([category, amount]) => {
        const roundedAmount = Number(amount.toFixed(2));
        const percentage = totalOutflows > 0 ? Number(((roundedAmount / totalOutflows) * 100).toFixed(1)) : 0;
        return {
          category,
          amount: roundedAmount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      totalInflows,
      totalOutflows,
      netSavings,
      categorySpend,
      period,
    };
  }
}
