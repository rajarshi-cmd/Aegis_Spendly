import { DatabaseExecutor } from '../database/types';
import {
  getAccountById,
  updateAccountBalance,
  createTransactionRow,
  getTransactionById,
  updateTransactionRow,
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

    if (account.type === 'BANK_DEPOSIT' || account.type === 'PHYSICAL_WALLET') {
      // Liquid Deposit & Physical Cash: Inflows increment available balance; outflows decrement available balance.
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

  /**
   * Updates an existing transaction and safely mutates affected account balances.
   */
  public static async updateTransaction(
    db: DatabaseExecutor,
    id: string,
    updates: Partial<Transaction>
  ): Promise<Transaction> {
    return await db.withTransaction(async () => {
      const existing = await getTransactionById(db, id);
      if (!existing) {
        throw new Error(`Transaction not found: ${id}`);
      }

      const isAccountChanged = updates.account_id && updates.account_id !== existing.account_id;
      const isAmountChanged = updates.amount !== undefined && updates.amount !== existing.amount;
      const isTypeChanged = updates.type && updates.type !== existing.type;

      if (isAccountChanged || isAmountChanged || isTypeChanged) {
        const oldAccount = await getAccountById(db, existing.account_id);
        if (oldAccount) {
          // Revert old transaction on old account
          let revertedBalance = oldAccount.balance;
          if (oldAccount.type === 'BANK_DEPOSIT' || oldAccount.type === 'PHYSICAL_WALLET') {
            revertedBalance = existing.type === 'INFLOW'
              ? Number((oldAccount.balance - existing.amount).toFixed(2))
              : Number((oldAccount.balance + existing.amount).toFixed(2));
          } else if (oldAccount.type === 'CREDIT_CARD') {
            revertedBalance = existing.type === 'INFLOW'
              ? Number((oldAccount.balance + existing.amount).toFixed(2))
              : Number((Math.max(0, oldAccount.balance - existing.amount)).toFixed(2));
          }
          await updateAccountBalance(db, oldAccount.id, revertedBalance);
          oldAccount.balance = revertedBalance;
        }

        // Apply new transaction on target account
        const targetAccountId = updates.account_id || existing.account_id;
        const targetAccount = (oldAccount && targetAccountId === oldAccount.id)
          ? oldAccount
          : await getAccountById(db, targetAccountId);

        if (targetAccount) {
          const newType = updates.type || existing.type;
          const newAmount = updates.amount !== undefined ? updates.amount : existing.amount;
          if (newAmount <= 0) {
            throw new Error('Transaction amount must be strictly greater than zero.');
          }
          const finalBalance = this.calculateNewBalance(targetAccount, newType as 'INFLOW' | 'OUTFLOW', newAmount);
          await updateAccountBalance(db, targetAccount.id, finalBalance);
        }
      }

      await updateTransactionRow(db, id, updates);
      const updated = await getTransactionById(db, id);
      return updated!;
    });
  }
}

