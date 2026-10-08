import { DatabaseExecutor } from '../database/types';
import {
  getAccountById,
  updateAccountBalance,
  getDebtById,
  updateDebtBalance,
  createDebtRow,
  createSettlementRow,
  generateUUID,
} from '../database/queries';
import {
  CreateDebtInput,
  CreateSettlementInput,
  Debt,
  DebtStatus,
  DebtUrgency,
  SettlementRecord,
} from '../types/debts';
import { AccountingEngine } from './accountingEngine';

export class DebtEngine {
  /**
   * Classifies debt urgency relative to device clock:
   * - Safe: More than 3 days remaining (> 3 days)
   * - Approaching (warning): Between 0 and 3 days remaining
   * - Overdue (critical alert): Past due (< 0 days)
   */
  public static classifyUrgency(dueDateIso: string, referenceDate: Date = new Date()): DebtUrgency {
    const dueTime = new Date(dueDateIso).getTime();
    if (isNaN(dueTime)) {
      return 'SAFE';
    }
    const refTime = referenceDate.getTime();
    const diffDays = (dueTime - refTime) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return 'OVERDUE';
    } else if (diffDays <= 3) {
      return 'APPROACHING';

    } else {
      return 'SAFE';
    }
  }

  /**
   * Evaluates current dynamic status of a debt based on remaining balance and due date.
   */
  public static evaluateDynamicStatus(
    outstandingBalance: number,
    principalAmount: number,
    dueDateIso: string,
    referenceDate: Date = new Date()
  ): DebtStatus {
    if (outstandingBalance <= 0) {
      return 'SETTLED';
    }

    const urgency = this.classifyUrgency(dueDateIso, referenceDate);
    if (urgency === 'OVERDUE') {
      return 'OVERDUE';
    }

    if (outstandingBalance < principalAmount) {
      return 'PARTIALLY_SETTLED';
    }

    return 'ACTIVE';
  }

  /**
   * Creates a peer-to-peer loan or obligation:
   * - Lending money decreases liquid cash reserves but creates an asset receivable.
   * - Borrowing money increases liquid cash reserves but creates a liability payable.
   * Executed within an atomic transaction.
   */
  public static async createDebt(
    db: DatabaseExecutor,
    input: CreateDebtInput
  ): Promise<Debt> {
    if (typeof input.principal_amount !== 'number' || !Number.isFinite(input.principal_amount) || input.principal_amount <= 0) {
      throw new Error('Principal debt amount must be strictly positive.');
    }

    return await db.withTransaction(async () => {
      const bankAccount = await getAccountById(db, input.settlement_account_id);
      if (!bankAccount) {
        throw new Error(`Settlement account not found: ${input.settlement_account_id}`);
      }

      // Balance adjustment in liquid cash reserves
      let newBalance: number;
      if (input.direction === 'LENT') {
        // Cash leaves our bank reserves to the counterparty (creates receivable)
        newBalance = AccountingEngine.calculateNewBalance(bankAccount, 'OUTFLOW', input.principal_amount);
      } else {
        // Cash enters our bank reserves from the counterparty (creates payable)
        newBalance = AccountingEngine.calculateNewBalance(bankAccount, 'INFLOW', input.principal_amount);
      }
      await updateAccountBalance(db, bankAccount.id, newBalance);

      const id = generateUUID();
      const now = input.origination_date || new Date().toISOString();
      const initialStatus = this.evaluateDynamicStatus(
        input.principal_amount,
        input.principal_amount,
        input.due_date
      );

      const debt: Debt = {
        id,
        counterparty: input.counterparty.trim(),
        direction: input.direction,
        principal_amount: input.principal_amount,
        outstanding_balance: input.principal_amount,
        settlement_account_id: input.settlement_account_id,
        origination_date: now,
        due_date: input.due_date,
        status: initialStatus,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
      };

      await createDebtRow(db, debt);
      return debt;
    });
  }

  /**
   * Processes incremental or full repayments.
   * Decrements remaining amounts, updates status flags accordingly, and reflects
   * matching balance adjustments in the linked bank account within an atomic transaction.
   */
  public static async processRepayment(
    db: DatabaseExecutor,
    input: CreateSettlementInput
  ): Promise<{ debt: Debt; settlement: SettlementRecord }> {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Repayment amount must be strictly greater than zero.');
    }

    return await db.withTransaction(async () => {
      const debt = await getDebtById(db, input.debt_id);
      if (!debt) {
        throw new Error(`Debt record not found: ${input.debt_id}`);
      }

      if (debt.outstanding_balance <= 0) {
        throw new Error('Debt obligation is already fully settled.');
      }

      if (input.amount > debt.outstanding_balance) {
        throw new Error(
          `Repayment amount (₹${input.amount}) exceeds remaining outstanding balance (₹${debt.outstanding_balance}).`
        );
      }

      const settlementAccountId = input.settlement_account_id || debt.settlement_account_id;
      const bankAccount = await getAccountById(db, settlementAccountId);
      if (!bankAccount) {
        throw new Error(`Settlement account not found: ${settlementAccountId}`);
      }

      // Calculate remaining debt
      const newOutstanding = Number((debt.outstanding_balance - input.amount).toFixed(2));
      const newStatus = this.evaluateDynamicStatus(
        newOutstanding,
        debt.principal_amount,
        debt.due_date
      );

      // Liquid balance adjustment:
      // If we LENT: counterparty returns cash to us -> Bank balance increases
      // If we BORROWED: we return cash to counterparty -> Bank balance decreases
      let newBankBalance: number;
      if (debt.direction === 'LENT') {
        newBankBalance = AccountingEngine.calculateNewBalance(bankAccount, 'INFLOW', input.amount);
      } else {
        newBankBalance = AccountingEngine.calculateNewBalance(bankAccount, 'OUTFLOW', input.amount);
      }

      await updateAccountBalance(db, bankAccount.id, newBankBalance);
      await updateDebtBalance(db, debt.id, newOutstanding, newStatus);


      const settlementId = generateUUID();
      const settlementDate = input.settlement_date || new Date().toISOString();

      const settlement: SettlementRecord = {
        id: settlementId,
        debt_id: debt.id,
        amount: input.amount,
        settlement_date: settlementDate,
        settlement_account_id: settlementAccountId,
        notes: input.notes ?? null,
      };

      await createSettlementRow(db, settlement);

      const updatedDebt: Debt = {
        ...debt,
        outstanding_balance: newOutstanding,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      return { debt: updatedDebt, settlement };
    });
  }
}
