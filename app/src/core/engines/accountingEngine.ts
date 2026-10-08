import { DatabaseExecutor } from '../database/types';
import {
  getAccountById,
  updateAccountBalance,
  createTransactionRow,
  generateUUID,
} from '../database/queries';
import {
  CreateTransactionInput,
  Transaction,
  Account,
} from '../types';

export class AccountingEngine {
  /**
   * Calculates the resulting account balance following double-entry ingestion rules.
   *
   * @param account The account being mutated
   * @param type 'INFLOW' or 'OUTFLOW'
   * @param amount Positive numerical value
   */
  public static calculateNewBalance(
    account: Account,
    type: 'INFLOW' | 'OUTFLOW',
    amount: number
  ): number {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Transaction amount must be strictly greater than zero.');
    }

    if (account.type === 'BANK_DEPOSIT') {
      // Liquid Deposit Accounts: Inflows increment available balance; outflows decrement available balance.
      if (type === 'INFLOW') {
        return Number((account.balance + amount).toFixed(2));
      } else {
        return Number((account.balance - amount).toFixed(2));
      }
    } else if (account.type === 'CREDIT_CARD') {
      // Credit Cards: Outflows increment total debt balance; inflows (repayments or refunds) decrement total debt balance.
      if (type === 'OUTFLOW') {
        return Number((account.balance + amount).toFixed(2));
      } else {
        return Number((Math.max(0, account.balance - amount)).toFixed(2));
      }
    }

    throw new Error(`Unsupported account type: ${(account as any).type}`);
  }

  /**
   * Ingests a new movement atomically in a database transaction.
   */
  public static async ingestTransaction(
    db: DatabaseExecutor,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Transaction amount must be positive.');
    }

    if (input.type !== 'INFLOW' && input.type !== 'OUTFLOW' && input.type !== 'TRANSFER') {
      throw new Error(`Unsupported transaction type: ${(input as any).type}`);
    }


    return await db.withTransaction(async () => {
      const sourceAccount = await getAccountById(db, input.account_id);
      if (!sourceAccount) {
        throw new Error(`Source account not found: ${input.account_id}`);
      }

      const txId = generateUUID();
      const now = input.timestamp || new Date().toISOString();

      if (input.type === 'TRANSFER') {
        if (!input.destination_account_id) {
          throw new Error('Destination account required for transfer movements.');
        }
        if (input.account_id === input.destination_account_id) {
          throw new Error('Source and destination accounts cannot be identical.');
        }

        const destAccount = await getAccountById(db, input.destination_account_id);
        if (!destAccount) {
          throw new Error(`Destination account not found: ${input.destination_account_id}`);
        }

        // Calculate mutated balances
        const newSourceBalance = this.calculateNewBalance(sourceAccount, 'OUTFLOW', input.amount);
        const newDestBalance = this.calculateNewBalance(destAccount, 'INFLOW', input.amount);

        // Update balances in atomic transaction
        await updateAccountBalance(db, sourceAccount.id, newSourceBalance);
        await updateAccountBalance(db, destAccount.id, newDestBalance);

        const tx: Transaction = {
          id: txId,
          account_id: input.account_id,
          type: 'TRANSFER',
          amount: input.amount,
          category: input.category || 'Transfer',
          description: input.description ?? null,
          timestamp: now,
          is_reconciled: Boolean(input.is_reconciled),
          reference_number: input.reference_number ?? null,
          source: input.source || 'MANUAL',
          sync_status: 'LOCAL_ONLY',
          destination_account_id: input.destination_account_id,
        };

        await createTransactionRow(db, tx);
        return tx;
      }

      // Standard Inflow / Outflow
      const newBalance = this.calculateNewBalance(sourceAccount, input.type, input.amount);
      await updateAccountBalance(db, sourceAccount.id, newBalance);

      const tx: Transaction = {
        id: txId,
        account_id: input.account_id,
        type: input.type,
        amount: input.amount,
        category: input.category,
        description: input.description ?? null,
        timestamp: now,
        is_reconciled: Boolean(input.is_reconciled),
        reference_number: input.reference_number ?? null,
        source: input.source || 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      };

      await createTransactionRow(db, tx);
      return tx;
    });
  }
}
