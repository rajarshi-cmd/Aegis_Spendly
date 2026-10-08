import { DatabaseExecutor } from './types';
import {
  getAllAccounts,
  createAccount,
  createTransactionRow,
  createDebtRow,
  createSettlementRow,
  createObligation,
  createInvestment,
  generateUUID,
} from './queries';
import { Transaction } from '../types/transactions';
import { Debt, SettlementRecord } from '../types/debts';

import { kvStorage } from '../storage/kvStorage';
import { loadUserProfile } from '../types/profile';

export async function seedIfEmpty(db: DatabaseExecutor): Promise<boolean> {
  if (kvStorage.getItem('aegis_vault_initialized') === 'true') {
    return false;
  }
  const profile = loadUserProfile();
  if (profile && profile.isOnboarded) {
    return false;
  }

  const existingAccounts = await getAllAccounts(db);
  if (existingAccounts.length > 0) {
    return false; // Database already seeded or populated
  }

  await db.withTransaction(async () => {
    // 1. Bank Accounts (ICICI, Axis, HDFC)
    const iciciBank = await createAccount(db, {
      name: 'ICICI Bank',
      type: 'BANK_DEPOSIT',
      balance: 82500.0,
      credit_limit: null,
      billing_cycle_cut_day: null,
      payment_due_day: null,
      minimum_balance: 10000.0,
    });

    const axisBank = await createAccount(db, {
      name: 'Axis Bank',
      type: 'BANK_DEPOSIT',
      balance: 42600.0,
      credit_limit: null,
      billing_cycle_cut_day: null,
      payment_due_day: null,
      minimum_balance: 5000.0,
    });

    const hdfcBank = await createAccount(db, {
      name: 'HDFC Bank',
      type: 'BANK_DEPOSIT',
      balance: 18300.0,
      credit_limit: null,
      billing_cycle_cut_day: null,
      payment_due_day: null,
      minimum_balance: 10000.0,
    });

    // 2. Credit Cards (HDFC Regalia, Axis Ace, ICICI Coral)
    // HDFC Regalia: 8,420 of 52,000 (16.2% - Watch)
    const regaliaCard = await createAccount(db, {
      name: 'HDFC Regalia',
      type: 'CREDIT_CARD',
      balance: 8420.0,
      credit_limit: 52000.0,
      billing_cycle_cut_day: 10,
      payment_due_day: 25,
      minimum_balance: null,
      card_color: 'EMERALD',
      last4: '4812',
    });

    // Axis Ace: 4,680 of 35,000 (13.4% - Healthy)
    const aceCard = await createAccount(db, {
      name: 'Axis Ace',
      type: 'CREDIT_CARD',
      balance: 4680.0,
      credit_limit: 35000.0,
      billing_cycle_cut_day: 12,
      payment_due_day: 28,
      minimum_balance: null,
      card_color: 'PURPLE',
      last4: '0624',
    });

    // ICICI Coral: 24,500 of 75,000 (32.7% - Attention)
    const coralCard = await createAccount(db, {
      name: 'ICICI Coral',
      type: 'CREDIT_CARD',
      balance: 24500.0,
      credit_limit: 75000.0,
      billing_cycle_cut_day: 22,
      payment_due_day: 9,
      minimum_balance: null,
      card_color: 'CARAMEL',
      last4: '7291',
    });

    // 3. Transactions matching Spendly ledger (October 2026)
    const sampleTxs: Transaction[] = [
      {
        id: generateUUID(),
        account_id: iciciBank.id,
        type: 'INFLOW',
        amount: 148000.0,
        category: 'Salary',
        description: 'Monthly salary (Salary credited)',
        timestamp: '2026-10-01T09:00:00.000Z',
        is_reconciled: true,
        reference_number: 'SAL-OCT26-01',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
      {
        id: generateUUID(),
        account_id: regaliaCard.id,
        type: 'OUTFLOW',
        amount: 480.0,
        category: 'Food & drinks',
        description: 'Blue Tokai Coffee',
        timestamp: '2026-10-07T14:30:00.000Z',
        is_reconciled: true,
        reference_number: 'BT-9821',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
      {
        id: generateUUID(),
        account_id: iciciBank.id,
        type: 'OUTFLOW',
        amount: 3260.0,
        category: 'Bills & utilities',
        description: 'Electricity bill',
        timestamp: '2026-10-06T11:20:00.000Z',
        is_reconciled: true,
        reference_number: 'EB-2026-10',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
      {
        id: generateUUID(),
        account_id: axisBank.id,
        type: 'OUTFLOW',
        amount: 720.0,
        category: 'Transport',
        description: 'Uber trip to office',
        timestamp: '2026-10-05T08:45:00.000Z',
        is_reconciled: true,
        reference_number: 'UB-44910',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
      {
        id: generateUUID(),
        account_id: coralCard.id,
        type: 'OUTFLOW',
        amount: 2140.0,
        category: 'Shopping',
        description: 'Household supplies',
        timestamp: '2026-10-04T17:15:00.000Z',
        is_reconciled: true,
        reference_number: 'DM-11204',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
      {
        id: generateUUID(),
        account_id: iciciBank.id,
        type: 'OUTFLOW',
        amount: 12000.0,
        category: 'Home',
        description: 'Rent transfer',
        timestamp: '2026-10-02T10:00:00.000Z',
        is_reconciled: true,
        reference_number: 'UPI-RENT-102',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      },
    ];

    for (const tx of sampleTxs) {
      await createTransactionRow(db, tx);
    }

    // 4. Recurring Commitments (Subscriptions, EMIs & Loans)
    await createObligation(db, {
      name: 'Netflix Premium',
      type: 'SUBSCRIPTION',
      amount: 649.0,
      due_day: 2,
      linked_account_id: regaliaCard.id,
      category: 'Entertainment',
      notes: 'Monthly subscription • HDFC Regalia',
    });

    await createObligation(db, {
      name: 'Home loan EMI',
      type: 'EMI',
      amount: 28500.0,
      due_day: 5,
      linked_account_id: iciciBank.id,
      category: 'Home',
      total_tenure_months: 74,
      remaining_tenure_months: 74,
      principal_amount: 3500000.0,
      interest_rate: 8.4,
      notes: '74 months EMI • ICICI Bank',
    });

    await createObligation(db, {
      name: 'iCloud+',
      type: 'SUBSCRIPTION',
      amount: 75.0,
      due_day: 11,
      linked_account_id: hdfcBank.id,
      category: 'Digital services',
      notes: 'Monthly subscription • HDFC Bank',
    });

    await createObligation(db, {
      name: 'Phone installment',
      type: 'EMI',
      amount: 4200.0,
      due_day: 18,
      linked_account_id: aceCard.id,
      category: 'Shopping',
      total_tenure_months: 8,
      remaining_tenure_months: 8,
      principal_amount: 33600.0,
      interest_rate: 0.0,
      notes: '8 months EMI • Axis Ace',
    });

    // 5. Investments & SIPs
    await createInvestment(db, {
      name: 'Nifty 50 Index Fund SIP',
      type: 'SIP',
      monthly_sip_amount: 15000.0,
      sip_due_day: 5,
      linked_account_id: iciciBank.id,
      invested_amount: 90000.0,
      current_value: 102400.0,
      notes: 'Large Cap Equity Index Fund',
    });

    await createInvestment(db, {
      name: 'Sovereign Gold Bonds',
      type: 'GOLD',
      invested_amount: 50000.0,
      current_value: 58500.0,
      notes: 'RBI SGB Series',
    });

    // 6. Bilateral P2P Debt (Aegis core engine feature)
    const activeDebt: Debt = {
      id: generateUUID(),
      counterparty: 'Marcus Vance',
      direction: 'LENT',
      principal_amount: 1000.0,
      outstanding_balance: 750.0,
      settlement_account_id: iciciBank.id,
      origination_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PARTIALLY_SETTLED',
      notes: 'Hardware engineering project advance',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await createDebtRow(db, activeDebt);

    const settlement: SettlementRecord = {
      id: generateUUID(),
      debt_id: activeDebt.id,
      amount: 250.0,
      settlement_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      settlement_account_id: iciciBank.id,
      notes: 'Initial partial installment returned via UPI',
    };
    await createSettlementRow(db, settlement);
  });

  return true;
}
