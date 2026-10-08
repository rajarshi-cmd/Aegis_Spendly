import { DatabaseExecutor } from '../database/types';
import {
  getInvestmentById,
  updateInvestment,
  getAccountById,
  updateAccountBalance,
  createTransactionRow,
  generateUUID,
} from '../database/queries';
import { InvestmentAsset } from '../types/investments';
import { Transaction } from '../types/transactions';
import { AccountingEngine } from './accountingEngine';

export class InvestmentEngine {
  /**
   * Executes a systematic investment plan (SIP) installment:
   * Deducts cash from bank account, increments invested amount and current valuation,
   * records capital creation movement in the ledger.
   */
  public static async executeSip(
    db: DatabaseExecutor,
    investmentId: string,
    executionDateIso: string = new Date().toISOString(),
    debitAccountId?: string
  ): Promise<{ investment: InvestmentAsset; transaction: Transaction | null }> {
    return await db.withTransaction(async () => {
      const inv = await getInvestmentById(db, investmentId);
      if (!inv) {
        throw new Error(`Investment asset not found: ${investmentId}`);
      }

      const sipAmount = inv.monthly_sip_amount || 0;
      if (typeof sipAmount !== 'number' || !Number.isFinite(sipAmount) || sipAmount <= 0) {
        throw new Error(`No recurring SIP amount specified for ${inv.name}`);
      }

      let tx: Transaction | null = null;
      const effectiveAccountId = debitAccountId || inv.linked_account_id;

      // Adjust linked bank account if configured or selected
      if (effectiveAccountId) {
        const bank = await getAccountById(db, effectiveAccountId);
        if (!bank) {
          throw new Error(`Linked account not found: ${effectiveAccountId}`);
        }
        const newBal = AccountingEngine.calculateNewBalance(bank, 'OUTFLOW', sipAmount);
        await updateAccountBalance(db, bank.id, newBal);

        const txId = generateUUID();
        tx = {
          id: txId,
          account_id: bank.id,
          type: 'OUTFLOW',
          amount: sipAmount,
          category: 'Investment (Asset)',
          description: `SIP Contribution: ${inv.name}`,
          timestamp: executionDateIso,
          is_reconciled: true,
          reference_number: `SIP-${Date.now().toString().slice(-6)}`,
          source: 'SYSTEM',
          sync_status: 'LOCAL_ONLY',
          destination_account_id: null,
        };
        await createTransactionRow(db, tx);
      }

      // Increment asset book value
      const updatedInvested = Number((inv.invested_amount + sipAmount).toFixed(2));
      const updatedValue = Number((inv.current_value + sipAmount).toFixed(2));

      const updatedAsset: InvestmentAsset = {
        ...inv,
        invested_amount: updatedInvested,
        current_value: updatedValue,
        last_sip_date: executionDateIso,
        updated_at: new Date().toISOString(),
      };

      await updateInvestment(db, updatedAsset);

      return {
        investment: updatedAsset,
        transaction: tx,
      };
    });
  }

  /**
   * Calculates total investment portfolio metrics:
   * Total invested, current valuation, and absolute/percentage returns.
   */
  public static calculatePortfolioMetrics(assets: InvestmentAsset[]) {
    const totalInvested = assets.reduce((sum, a) => sum + a.invested_amount, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + a.current_value, 0);
    const totalMonthlyCommitment = assets.reduce((sum, a) => sum + (a.monthly_sip_amount || 0), 0);
    const absoluteReturn = totalCurrentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    return {
      totalInvested: Number(totalInvested.toFixed(2)),
      totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
      totalMonthlyCommitment: Number(totalMonthlyCommitment.toFixed(2)),
      absoluteReturn: Number(absoluteReturn.toFixed(2)),
      returnPercentage: Number(returnPercentage.toFixed(2)),
    };
  }
}
