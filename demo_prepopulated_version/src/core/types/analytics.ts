export type CreditStatusTier = 'OPTIMAL' | 'CAUTION' | 'ALERT';

export interface CreditHealth {
  accountId: string;
  accountName: string;
  creditDebt: number;
  creditLimit: number;
  utilizationPercentage: number;
  statusTier: CreditStatusTier;
  themeColor: string;
  backgroundColor: string;
  badgeLabel: string;
  description: string;
}

export type DatePeriodType = 'MONTH' | 'YEAR' | 'CUSTOM';

export interface DateRange {
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string; // ISO format YYYY-MM-DD
  label: string;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number; // Share of total outflow (0 - 100)
}

export interface AnalyticsMetrics {
  totalInflows: number;
  totalOutflows: number;
  netSavings: number; // Inflows - Outflows
  categorySpend: CategorySpend[];
  period: DateRange;
}
