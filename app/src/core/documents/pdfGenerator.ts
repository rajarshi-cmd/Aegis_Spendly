import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AnalyticsMetrics } from '../types/analytics';
import { Transaction } from '../types/transactions';
import { Account } from '../types/accounts';
import { safeFormatDate } from '../utils/date';

export interface ReportData {
  metrics: AnalyticsMetrics;
  transactions: Transaction[];
  accounts: Account[];
}

/**
 * Sanitizes user-provided strings against HTML / Stored XSS injection (CWE-79).
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class DocumentGenerator {
  /**
   * Builds clean invoice-style HTML for vector-based PDF rendering.
   */
  public static buildInvoiceHtml(data: ReportData): string {
    const { metrics, transactions, accounts } = data;

    const formattedInflows = `₹${metrics.totalInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formattedOutflows = `₹${metrics.totalOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formattedSavings = `${metrics.netSavings >= 0 ? '+' : ''}₹${metrics.netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const savingsColor = metrics.netSavings >= 0 ? '#10B981' : '#EF4444';

    const accountMap = new Map<string, string>();
    accounts.forEach((acc) => accountMap.set(acc.id, acc.name));

    const categoryRows = metrics.categorySpend
      .map(
        (c) => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 500;">${escapeHtml(c.category)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-family: monospace;">₹${c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600;">${c.percentage.toFixed(1)}%</td>
        </tr>
      `
      )
      .join('');

    const transactionRows = transactions
      .slice(0, 30) // Render recent movements
      .map((tx, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        const dateStr = safeFormatDate(tx.timestamp, 'en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const isPositive = tx.type === 'INFLOW';
        const amtColor = isPositive ? '#10B981' : '#1E293B';
        const prefix = isPositive ? '+' : '-';
        const accountName = accountMap.get(tx.account_id) || 'Account';

        const safeDesc = escapeHtml(tx.description || tx.category);
        const safeAccountName = escapeHtml(accountName);
        const safeRef = tx.reference_number ? `• Ref: ${escapeHtml(tx.reference_number)}` : '';
        const safeCategory = escapeHtml(tx.category);

        return `
        <tr style="background-color: ${bg};">
          <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">${dateStr}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 500;">
            ${safeDesc}
            <div style="font-size: 10px; color: #94A3B8;">${safeAccountName} ${safeRef}</div>
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <span style="background-color: #E2E8F0; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${safeCategory}</span>
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 13px; font-family: monospace; font-weight: 600; color: ${amtColor};">
            ${prefix}₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Financial Report</title>
        <style>
          @page {
            margin: 24mm 18mm;
            size: A4 portrait;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 0;
            background-color: #FFFFFF;
            -webkit-print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0F172A;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0F172A;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #64748B;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge {
            display: inline-block;
            background: #EFF6FF;
            color: #2563EB;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid #BFDBFE;
          }
          .kpi-grid {
            display: flex;
            gap: 16px;
            margin-bottom: 28px;
          }
          .kpi-card {
            flex: 1;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px;
          }
          .kpi-label {
            font-size: 11px;
            color: #64748B;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-val {
            font-size: 22px;
            font-weight: 800;
            margin-top: 6px;
            font-family: monospace;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
            margin-bottom: 10px;
            margin-top: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background-color: #F1F5F9;
            color: #475569;
            text-align: left;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 2px solid #CBD5E1;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
            font-size: 10px;
            color: #94A3B8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AEGIS LEDGER STATEMENT</h1>
            <div class="subtitle">AIR-GAPPED OFFLINE-FIRST FINANCIAL REPORT</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">Period: ${metrics.period.label}</span>
            <div style="font-size: 11px; color: #64748B; margin-top: 6px;">
              Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Inflows</div>
            <div class="kpi-val" style="color: #10B981;">${formattedInflows}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Outflows</div>
            <div class="kpi-val" style="color: #0F172A;">${formattedOutflows}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Savings</div>
            <div class="kpi-val" style="color: ${savingsColor};">${formattedSavings}</div>
          </div>
        </div>

        <div class="section-title">Expense Category Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Expenditure</th>
              <th style="text-align: right;">Share of Outflow</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="3" style="text-align:center; padding: 12px; color: #94A3B8;">No expenses recorded for this interval</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Ledger Transaction Journal</div>
        <table>
          <thead>
            <tr>
              <th style="width: 85px;">Date</th>
              <th>Description</th>
              <th style="width: 110px;">Category</th>
              <th style="text-align: right; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows || '<tr><td colspan="4" style="text-align:center; padding: 12px; color: #94A3B8;">No transactions found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>Local Device Sandbox • Air-Gapped Zero-Cloud Storage</div>
          <div>Cryptographically Untracked • Aegis Mobile Engine</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Compiles data into vector-based PDF directly on physical device and presents OS share sheet.
   */
  public static async exportAndShareReport(data: ReportData): Promise<string> {
    const html = this.buildInvoiceHtml(data);
    
    // Render clean PDF in application sandbox
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Hand off directly to native OS share sheet or web browser
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Financial Statement (${data.metrics.period.label})`,
      });
    } else if (typeof window !== 'undefined' && window.open) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    }

    return uri;
  }
}
