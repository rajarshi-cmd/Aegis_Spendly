import { DatabaseExecutor } from '../database/types';
import {
  getObligationById,
  updateObligation,
  getAccountById,
  updateAccountBalance,
  createTransactionRow,
  generateUUID,
} from '../database/queries';
import { RecurringObligation, ObligationStatus } from '../types/upcoming';
import { Transaction } from '../types/transactions';
import { AccountingEngine } from './accountingEngine';

export class UpcomingEngine {
  /**
   * Processes the monthly payment for a subscription, EMI, or loan.
   * Atomically decrements bank balance (or increments card debt), records the ledger transaction,
   * decrements remaining tenure for loans/EMIs, and marks the obligation as paid for the cycle.
   */
  public static async payRecurringObligation(
    db: DatabaseExecutor,
    obligationId: string,
    paymentDateIso: string = new Date().toISOString(),
    customAmount?: number
  ): Promise<{ obligation: RecurringObligation; transaction: Transaction }> {
    return await db.withTransaction(async () => {
      const obligation = await getObligationById(db, obligationId);
      if (!obligation) {
        throw new Error(`Recurring obligation not found: ${obligationId}`);
      }

      if (obligation.status === 'COMPLETED') {
        throw new Error(`Obligation ${obligation.name} is already fully completed.`);
      }

      if (obligation.remaining_tenure_months !== null && obligation.remaining_tenure_months <= 0) {
        throw new Error(`Obligation ${obligation.name} has no remaining installments.`);
      }

      const effectiveAmount = customAmount !== undefined ? customAmount : obligation.amount;
      if (typeof effectiveAmount !== 'number' || !Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
        throw new Error('Payment amount must be strictly greater than zero. 0 cannot be entered.');
      }

      const linkedAccount = await getAccountById(db, obligation.linked_account_id);
      if (!linkedAccount) {
        throw new Error(`Linked account not found: ${obligation.linked_account_id}`);
      }

      // 1. Calculate mutated balance on linked account
      const newBalance = AccountingEngine.calculateNewBalance(
        linkedAccount,
        'OUTFLOW',
        effectiveAmount
      );
      await updateAccountBalance(db, linkedAccount.id, newBalance);

      // 2. Insert ledger movement
      const txId = generateUUID();
      const txCategory =
        obligation.type === 'SUBSCRIPTION'
          ? 'Subscription'
          : obligation.type === 'EMI'
          ? 'EMI Payment'
          : 'Loan Repayment';

      const tx: Transaction = {
        id: txId,
        account_id: linkedAccount.id,
        type: 'OUTFLOW',
        amount: effectiveAmount,
        category: txCategory,
        description: `${obligation.name} (${obligation.type})`,
        timestamp: paymentDateIso,
        is_reconciled: true,
        reference_number: `AUTO-${Date.now().toString().slice(-6)}`,
        source: 'SYSTEM',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      };
      await createTransactionRow(db, tx);

      // 3. Decrement tenure if applicable
      let newRemainingTenure = obligation.remaining_tenure_months;
      let newStatus: ObligationStatus = obligation.status;

      if (newRemainingTenure !== null && newRemainingTenure > 0) {
        newRemainingTenure = newRemainingTenure - 1;
        if (newRemainingTenure === 0) {
          newStatus = 'COMPLETED';
        }
      }

      const updatedObligation: RecurringObligation = {
        ...obligation,
        remaining_tenure_months: newRemainingTenure,
        last_paid_date: paymentDateIso,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      await updateObligation(db, updatedObligation);

      return {
        obligation: updatedObligation,
        transaction: tx,
      };
    });
  }

  /**
   * Determines if a payment is due or already paid for the current monthly cycle.
   */
  public static isPaidThisMonth(lastPaidDateIso: string | null, referenceDate: Date = new Date()): boolean {
    if (!lastPaidDateIso) return false;
    const lastDate = new Date(lastPaidDateIso);
    if (isNaN(lastDate.getTime())) return false;
    return (
      lastDate.getFullYear() === referenceDate.getFullYear() &&
      lastDate.getMonth() === referenceDate.getMonth()
    );
  }
}

