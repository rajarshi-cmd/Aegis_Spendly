import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getDatabase } from '../../core/database/db';
import { runMigrations } from '../../core/database/migrations/runner';
import { seedIfEmpty } from '../../core/database/seeder';
import {
  getAllAccounts,
  getAllTransactions,
  getAllDebts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountBalance,
  getAllObligations,
  createObligation,
  updateObligation,
  deleteObligation,
  getAllInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  deleteTransactionRow,
  reassignAccountObligations,
  reassignAccountInvestments,
  purgeSeedDataAndInitializeUserVault,
  generateUUID,
} from '../../core/database/queries';
import { CreateAccountInput, UpdateAccountInput } from '../../core/types/accounts';
import { AccountingEngine } from '../../core/engines/accountingEngine';
import { CreditMonitor } from '../../core/engines/creditMonitor';
import { DebtEngine } from '../../core/engines/debtEngine';
import { DocumentGenerator } from '../../core/documents/pdfGenerator';
import { AnalyticsEngine } from '../../core/engines/analyticsEngine';
import { UpcomingEngine } from '../../core/engines/upcomingEngine';
import { InvestmentEngine } from '../../core/engines/investmentEngine';
import { GoogleSheetsSyncEngine } from '../../core/engines/googleSheetsEngine';
import {
  UserProfile,
  DEFAULT_PROFILE,
  loadUserProfile,
  saveUserProfile,
} from '../../core/types/profile';
import {
  SyncScheduleConfig,
  DEFAULT_SYNC_CONFIG,
  SyncResult,
  RateLimitCheckResult,
  loadSyncConfig,
  saveSyncConfig,
} from '../../core/types/sync';
import {
  Account,
  Transaction,
  Debt,
  CreateTransactionInput,
  CreateDebtInput,
  CreateSettlementInput,
  CreditHealth,
  DateRange,
  AnalyticsMetrics,
  RecurringObligation,
  CreateObligationInput,
  InvestmentAsset,
  CreateInvestmentInput,
} from '../../core/types';
import { PlannedBudget } from '../../core/types/upcoming';
import { kvStorage } from '../../core/storage/kvStorage';

interface PortfolioMetrics {
  totalInvested: number;
  totalCurrentValue: number;
  totalMonthlyCommitment: number;
  absoluteReturn: number;
  returnPercentage: number;
}

export interface DeletedAccount extends Account {
  deleted_at: string;
  transactionCount: number;
}

const DEFAULT_BUDGETS: PlannedBudget[] = [
  { id: 'b-1', category: 'Food & drinks', planned_amount: 7000 },
  { id: 'b-2', category: 'Home', planned_amount: 15000 },
  { id: 'b-3', category: 'Transport', planned_amount: 5000 },
  { id: 'b-4', category: 'Shopping', planned_amount: 6000 },
  { id: 'b-5', category: 'Entertainment', planned_amount: 2500 },
];

const PLANNED_BUDGETS_STORAGE_KEY = 'aegis_planned_budgets';

function loadStoredBudgets(): PlannedBudget[] {
  try {
    const raw = kvStorage.getItem(PLANNED_BUDGETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_BUDGETS;
}

export interface FinanceDataContextType {
  accounts: Account[];
  bankAccounts: Account[];
  creditCards: Account[];
  deletedAccounts: DeletedAccount[];
  transactions: Transaction[];
  deletedTransactions: Transaction[];
  debts: Debt[];
  obligations: RecurringObligation[];
  pastCommitments: RecurringObligation[];
  investments: InvestmentAsset[];
  creditHealthList: CreditHealth[];
  plannedBudgets: PlannedBudget[];
  userProfile: UserProfile;
  activeMonth: string;
  totalBankCash: number;
  totalCreditDebt: number;
  totalReceivables: number;
  totalPayables: number;
  portfolioMetrics: PortfolioMetrics;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  setActiveMonth: (month: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  editTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (id: string) => Promise<void>;
  permanentDeleteTransaction: (id: string) => Promise<void>;
  addAccount: (input: CreateAccountInput) => Promise<Account>;
  editAccount: (input: UpdateAccountInput) => Promise<Account | null>;
  removeAccount: (id: string) => Promise<void>;
  restoreAccount: (id: string) => Promise<void>;
  permanentDeleteAccount: (id: string) => Promise<void>;
  reassignAndCloseAccount: (accountId: string, reassignments: Record<string, string>) => Promise<void>;
  addDebt: (input: CreateDebtInput) => Promise<Debt>;
  recordRepayment: (input: CreateSettlementInput) => Promise<void>;
  addObligation: (input: CreateObligationInput) => Promise<RecurringObligation>;
  removeObligation: (id: string) => Promise<void>;
  restoreCommitment: (id: string) => void;
  permanentDeleteCommitment: (id: string) => void;
  payObligation: (id: string, customAmount?: number) => Promise<void>;
  undoPayObligation: (id: string) => Promise<void>;
  skipObligation: (id: string) => void;
  undoSkipObligation: (id: string) => void;
  snoozedObligationIds: Record<string, boolean>;
  paidObligationIds: Record<string, boolean>;
  skippedObligationIds: Record<string, boolean>;
  snoozeObligation: (id: string) => void;
  addInvestment: (input: CreateInvestmentInput) => Promise<InvestmentAsset>;
  removeInvestment: (id: string) => Promise<void>;
  executeSip: (id: string, debitAccountId?: string) => Promise<void>;
  undoExecuteSip: (id: string) => Promise<void>;
  skipSip: (id: string) => void;
  undoSkipSip: (id: string) => void;
  executedSipIds: Record<string, boolean>;
  skippedSipIds: Record<string, boolean>;
  isMonthSealed: boolean;
  sealMonth: () => void;
  unsealMonth: () => void;
  addPlannedBudget: (budget: Omit<PlannedBudget, 'id'>) => void;
  updatePlannedBudget: (id: string, planned_amount: number) => void;
  generatePdfReport: (period: DateRange) => Promise<string>;
  syncConfig: SyncScheduleConfig;
  updateSyncConfig: (partial: Partial<SyncScheduleConfig>) => void;
  triggerGoogleSheetsSync: () => Promise<SyncResult>;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  pendingChangesCount: number;
  rateLimitStatus: RateLimitCheckResult;
  refreshRateLimitStatus: () => RateLimitCheckResult;
  initializeUserVault: (
    userBanks: Array<{ name: string; balance: number; minimum_balance?: number | null }>,
    userCards: Array<{
      name: string;
      limit: number;
      balance: number;
      cutDay: number;
      dueDay: number;
      color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
      keepTrackRatio?: number;
    }>
  ) => Promise<void>;
}

const FinanceDataContext = createContext<FinanceDataContextType | null>(null);

export const FinanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<DeletedAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [pastCommitments, setPastCommitments] = useState<RecurringObligation[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [plannedBudgets, setPlannedBudgets] = useState<PlannedBudget[]>(loadStoredBudgets);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return loadUserProfile() || DEFAULT_PROFILE;
  });
  const [activeMonth, setActiveMonth] = useState<string>('October 2026');

  // Google Sheets Cloud Sync & Schedule state
  const [syncConfig, setSyncConfig] = useState<SyncScheduleConfig>(() => {
    return loadSyncConfig() || DEFAULT_SYNC_CONFIG;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitCheckResult>(() =>
    GoogleSheetsSyncEngine.getRateLimitStatus()
  );

  const refreshRateLimitStatus = useCallback((): RateLimitCheckResult => {
    const status = GoogleSheetsSyncEngine.getRateLimitStatus();
    setRateLimitStatus(status);
    return status;
  }, []);

  // Tracking state for obligations & SIPs
  const [snoozedObligationIds, setSnoozedObligationIds] = useState<Record<string, boolean>>({});
  const [paidObligationIds, setPaidObligationIds] = useState<Record<string, boolean>>({});
  const [skippedObligationIds, setSkippedObligationIds] = useState<Record<string, boolean>>({});
  const [obligationTxMap, setObligationTxMap] = useState<Record<string, string>>({});

  const [executedSipIds, setExecutedSipIds] = useState<Record<string, boolean>>({});
  const [skippedSipIds, setSkippedSipIds] = useState<Record<string, boolean>>({});
  const [sipTxMap, setSipTxMap] = useState<Record<string, string>>({});

  const [isMonthSealed, setIsMonthSealed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      await runMigrations(db);
      await seedIfEmpty(db);

      const [accs, txs, dbs, obs, invs] = await Promise.all([
        getAllAccounts(db),
        getAllTransactions(db),
        getAllDebts(db),
        getAllObligations(db),
        getAllInvestments(db),
      ]);

      // Strict descending sort: newest transaction is ALWAYS top row!
      const sortedTxs = [...txs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAccounts(accs);
      setTransactions(sortedTxs);
      setDebts(dbs);
      setObligations(obs.filter((o) => o.status === 'ACTIVE'));
      setPastCommitments(obs.filter((o) => o.status === 'COMPLETED' || o.status === 'PAUSED'));
      setInvestments(invs);
    } catch (err: any) {
      console.error('[FinanceDataProvider] Error loading data:', err);
      setError(err?.message || 'Failed to initialize database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateProfile = (partial: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...partial };
      saveUserProfile(updated);
      return updated;
    });
  };

  const addTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
    const db = await getDatabase();
    const newTx = await AccountingEngine.ingestTransaction(db, input);
    await loadData();
    return newTx;
  };

  const editTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
    const db = await getDatabase();
    const updated = await AccountingEngine.updateTransaction(db, id, updates);
    await loadData();
    return updated;
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const deletedTx: Transaction = {
      ...tx,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    };
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeletedTransactions((prev) => [deletedTx, ...prev]);
  };

  const restoreTransaction = async (id: string): Promise<void> => {
    const tx = deletedTransactions.find((t) => t.id === id);
    if (!tx) return;
    const restoredTx: Transaction = {
      ...tx,
      is_deleted: false,
      deleted_at: null,
    };
    setDeletedTransactions((prev) => prev.filter((t) => t.id !== id));
    setTransactions((prev) => [restoredTx, ...prev].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  };

  const permanentDeleteTransaction = async (id: string): Promise<void> => {
    setDeletedTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      const db = await getDatabase();
      await deleteTransactionRow(db, id);
    } catch (e) {}
  };

  const addAccount = async (input: CreateAccountInput): Promise<Account> => {
    const db = await getDatabase();
    const newAcc = await createAccount(db, input);
    await loadData();
    return newAcc;
  };

  const editAccount = async (input: UpdateAccountInput): Promise<Account | null> => {
    const db = await getDatabase();
    const updated = await updateAccount(db, input);
    await loadData();
    return updated;
  };

  // Safe soft-delete / archiving of account into recovery shelf
  const removeAccount = async (id: string): Promise<void> => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    const txCount = transactions.filter((t) => t.account_id === id).length;
    const deletedAcc: DeletedAccount = {
      ...acc,
      deleted_at: new Date().toISOString(),
      transactionCount: txCount,
    };
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setDeletedAccounts((prev) => [deletedAcc, ...prev]);
  };

  const restoreAccount = async (id: string): Promise<void> => {
    const deletedAcc = deletedAccounts.find((a) => a.id === id);
    if (!deletedAcc) return;
    setDeletedAccounts((prev) => prev.filter((a) => a.id !== id));
    setAccounts((prev) => [deletedAcc, ...prev]);
  };

  const permanentDeleteAccount = async (id: string): Promise<void> => {
    setDeletedAccounts((prev) => prev.filter((a) => a.id !== id));
    try {
      const db = await getDatabase();
      await deleteAccount(db, id);
      await loadData();
    } catch (e) {}
  };

  const reassignAndCloseAccount = async (
    accountId: string,
    reassignments: Record<string, string>
  ): Promise<void> => {
    const db = await getDatabase();
    for (const [commitmentId, newAccountId] of Object.entries(reassignments)) {
      const ob = obligations.find((o) => o.id === commitmentId);
      if (ob) {
        await updateObligation(db, { ...ob, linked_account_id: newAccountId });
      }
      const sip = investments.find((i) => i.id === commitmentId);
      if (sip) {
        await updateInvestment(db, { ...sip, linked_account_id: newAccountId });
      }
    }
    await removeAccount(accountId);
    await loadData();
  };

  const addDebt = async (input: CreateDebtInput): Promise<Debt> => {
    const db = await getDatabase();
    const newDebt = await DebtEngine.createDebt(db, input);
    await loadData();
    return newDebt;
  };

  const recordRepayment = async (input: CreateSettlementInput): Promise<void> => {
    const db = await getDatabase();
    await DebtEngine.processRepayment(db, input);
    await loadData();
  };

  const addObligation = async (input: CreateObligationInput): Promise<RecurringObligation> => {
    const db = await getDatabase();
    const newOb = await createObligation(db, input);
    await loadData();
    return newOb;
  };

  const removeObligation = async (id: string): Promise<void> => {
    const ob = obligations.find((o) => o.id === id);
    if (ob) {
      setObligations((prev) => prev.filter((o) => o.id !== id));
      setPastCommitments((prev) => [{ ...ob, status: 'PAUSED' }, ...prev]);
    }
  };

  const restoreCommitment = (id: string) => {
    const item = pastCommitments.find((c) => c.id === id);
    if (item) {
      setPastCommitments((prev) => prev.filter((c) => c.id !== id));
      setObligations((prev) => [{ ...item, status: 'ACTIVE' }, ...prev]);
    }
  };

  const permanentDeleteCommitment = async (id: string) => {
    setPastCommitments((prev) => prev.filter((c) => c.id !== id));
    try {
      const db = await getDatabase();
      await deleteObligation(db, id);
    } catch (e) {}
  };

  const snoozeObligation = (id: string) => {
    setSnoozedObligationIds((prev) => ({ ...prev, [id]: true }));
  };

  const payObligation = async (id: string, customAmount?: number): Promise<void> => {
    setPaidObligationIds((prev) => ({ ...prev, [id]: true }));
    setSkippedObligationIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setSnoozedObligationIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const db = await getDatabase();
    const result = await UpcomingEngine.payRecurringObligation(db, id, new Date().toISOString(), customAmount);
    if (result.transaction) {
      setObligationTxMap((prev) => ({ ...prev, [id]: result.transaction.id }));
    }
    await loadData();
  };

  const undoPayObligation = async (id: string): Promise<void> => {
    setPaidObligationIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const txId = obligationTxMap[id];
    const db = await getDatabase();
    const ob = obligations.find((o) => o.id === id);

    if (ob) {
      let restoredTenure = ob.remaining_tenure_months;
      if (restoredTenure !== null) {
        restoredTenure = restoredTenure + 1;
      }
      await updateObligation(db, {
        ...ob,
        remaining_tenure_months: restoredTenure,
        last_paid_date: null,
        status: 'ACTIVE',
      });

      const acc = accounts.find((a) => a.id === ob.linked_account_id);
      if (acc) {
        const newBal = acc.type === 'CREDIT_CARD' ? Math.max(0, acc.balance - ob.amount) : acc.balance + ob.amount;
        await updateAccountBalance(db, acc.id, newBal);
      }
    }

    if (txId) {
      try {
        await deleteTransactionRow(db, txId);
      } catch (e) {}
    } else {
      const match = transactions.find((t) => t.description?.includes(ob?.name || ''));
      if (match) {
        try {
          await deleteTransactionRow(db, match.id);
        } catch (e) {}
      }
    }

    await loadData();
  };

  const skipObligation = (id: string) => {
    setSkippedObligationIds((prev) => ({ ...prev, [id]: true }));
    setPaidObligationIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const undoSkipObligation = (id: string) => {
    setSkippedObligationIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const addInvestment = async (input: CreateInvestmentInput): Promise<InvestmentAsset> => {
    const db = await getDatabase();
    const newInv = await createInvestment(db, input);
    await loadData();
    return newInv;
  };

  const removeInvestment = async (id: string): Promise<void> => {
    const db = await getDatabase();
    await deleteInvestment(db, id);
    await loadData();
  };

  const executeSip = async (id: string, debitAccountId?: string): Promise<void> => {
    if (executedSipIds[id]) return; // Prevent duplicate rapid clicks for the month!
    setExecutedSipIds((prev) => ({ ...prev, [id]: true }));
    setSkippedSipIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const db = await getDatabase();
    const result = await InvestmentEngine.executeSip(db, id, new Date().toISOString(), debitAccountId);
    if (result.transaction) {
      setSipTxMap((prev) => ({ ...prev, [id]: result.transaction!.id }));
    }
    await loadData();
  };

  const undoExecuteSip = async (id: string): Promise<void> => {
    setExecutedSipIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const txId = sipTxMap[id];
    const db = await getDatabase();
    const sip = investments.find((i) => i.id === id);

    if (sip) {
      const amt = sip.monthly_sip_amount || 0;
      await updateInvestment(db, {
        ...sip,
        invested_amount: Math.max(0, sip.invested_amount - amt),
        current_value: Math.max(0, sip.current_value - amt),
        last_sip_date: null,
      });

      const effectiveAccId = sip.linked_account_id;
      if (effectiveAccId) {
        const acc = accounts.find((a) => a.id === effectiveAccId);
        if (acc) {
          await updateAccountBalance(db, acc.id, acc.balance + amt);
        }
      }
    }

    if (txId) {
      try {
        await deleteTransactionRow(db, txId);
      } catch (e) {}
    } else {
      const match = transactions.find((t) => t.description?.includes(sip?.name || ''));
      if (match) {
        try {
          await deleteTransactionRow(db, match.id);
        } catch (e) {}
      }
    }

    await loadData();
  };

  const skipSip = (id: string) => {
    setSkippedSipIds((prev) => ({ ...prev, [id]: true }));
    setExecutedSipIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const undoSkipSip = (id: string) => {
    setSkippedSipIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const sealMonth = () => {
    setIsMonthSealed(true);
    const newSkippedObs = { ...skippedObligationIds };
    obligations.forEach((o) => {
      if (!paidObligationIds[o.id]) {
        newSkippedObs[o.id] = true;
      }
    });
    setSkippedObligationIds(newSkippedObs);

    const newSkippedSips = { ...skippedSipIds };
    investments
      .filter((i) => i.type === 'SIP')
      .forEach((s) => {
        if (!executedSipIds[s.id]) {
          newSkippedSips[s.id] = true;
        }
      });
    setSkippedSipIds(newSkippedSips);
  };

  const unsealMonth = () => {
    setIsMonthSealed(false);
  };

  const addPlannedBudget = (b: Omit<PlannedBudget, 'id'>) => {
    setPlannedBudgets((prev) => {
      const next = [...prev, { ...b, id: generateUUID() }];
      try {
        kvStorage.setItem(PLANNED_BUDGETS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const updatePlannedBudget = (id: string, planned_amount: number) => {
    setPlannedBudgets((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, planned_amount } : b));
      try {
        kvStorage.setItem(PLANNED_BUDGETS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const generatePdfReport = async (period: DateRange): Promise<string> => {
    const metrics: AnalyticsMetrics = AnalyticsEngine.computeMetrics(transactions, period);
    return await DocumentGenerator.exportAndShareReport({
      metrics,
      transactions,
      accounts,
    });
  };

  const pendingChangesCount = useMemo(() => {
    if (!syncConfig.lastSyncTimestamp) {
      return transactions.length;
    }
    const lastTime = new Date(syncConfig.lastSyncTimestamp).getTime();
    if (isNaN(lastTime)) return transactions.length;
    return transactions.filter((t) => new Date(t.timestamp).getTime() > lastTime).length;
  }, [transactions, syncConfig.lastSyncTimestamp]);

  const updateSyncConfig = (partial: Partial<SyncScheduleConfig>) => {
    setSyncConfig((prev) => {
      const updated = { ...prev, ...partial };
      saveSyncConfig(updated);
      return updated;
    });
  };

  const triggerGoogleSheetsSync = async (): Promise<SyncResult> => {
    const currentStatus = GoogleSheetsSyncEngine.getRateLimitStatus();
    if (!currentStatus.allowed) {
      const waitSec = currentStatus.retryAfterSeconds || Math.ceil(currentStatus.remainingCooldownMs / 1000);
      throw new Error(currentStatus.reason || `Rate limit active: Please wait ${waitSec}s before syncing again.`);
    }

    try {
      setIsSyncing(true);
      const payload = GoogleSheetsSyncEngine.buildBatchPayload(
        accounts,
        transactions,
        investments,
        obligations,
        syncConfig.spreadsheetTitle
      );
      const result = await GoogleSheetsSyncEngine.executeBatchSync(payload, syncConfig);
      setSyncConfig((prev) => ({
        ...prev,
        lastSyncTimestamp: result.timestamp,
      }));
      setLastSyncResult(result);
      setRateLimitStatus(GoogleSheetsSyncEngine.getRateLimitStatus());
      return result;
    } finally {
      setIsSyncing(false);
      setRateLimitStatus(GoogleSheetsSyncEngine.getRateLimitStatus());
    }
  };

  const initializeUserVault = async (
    userBanks: Array<{ name: string; balance: number; minimum_balance?: number | null }>,
    userCards: Array<{
      name: string;
      limit: number;
      balance: number;
      cutDay: number;
      dueDay: number;
      color: 'EMERALD' | 'PURPLE' | 'CARAMEL';
      keepTrackRatio?: number;
    }>
  ): Promise<void> => {
    const db = await getDatabase();
    await purgeSeedDataAndInitializeUserVault(db, userBanks, userCards);
    await loadData();
  };

  // Computations
  const bankAccounts = accounts.filter((a) => a.type === 'BANK_DEPOSIT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');

  const totalBankCash = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalCreditDebt = creditCards.reduce((sum, a) => sum + a.balance, 0);

  const totalReceivables = debts
    .filter((d) => d.direction === 'LENT' && d.status !== 'SETTLED')
    .reduce((sum, d) => sum + d.outstanding_balance, 0);

  const totalPayables = debts
    .filter((d) => d.direction === 'BORROWED' && d.status !== 'SETTLED')
    .reduce((sum, d) => sum + d.outstanding_balance, 0);

  const creditHealthList: CreditHealth[] = creditCards
    .map((card) => CreditMonitor.assessCreditHealth(card))
    .filter((h): h is CreditHealth => h !== null);

  const portfolioMetrics = useMemo(() => {
    return InvestmentEngine.calculatePortfolioMetrics(investments);
  }, [investments]);

  return (
    <FinanceDataContext.Provider
      value={{
        accounts,
        bankAccounts,
        creditCards,
        deletedAccounts,
        transactions,
        deletedTransactions,
        debts,
        obligations,
        pastCommitments,
        investments,
        creditHealthList,
        plannedBudgets,
        userProfile,
        activeMonth,
        totalBankCash,
        totalCreditDebt,
        totalReceivables,
        totalPayables,
        portfolioMetrics,
        loading,
        error,
        refreshData: loadData,
        setActiveMonth,
        updateProfile,
        addTransaction,
        editTransaction,
        deleteTransaction,
        restoreTransaction,
        permanentDeleteTransaction,
        addAccount,
        editAccount,
        removeAccount,
        restoreAccount,
        permanentDeleteAccount,
        reassignAndCloseAccount,
        addDebt,
        recordRepayment,
        addObligation,
        removeObligation,
        restoreCommitment,
        permanentDeleteCommitment,
        payObligation,
        undoPayObligation,
        skipObligation,
        undoSkipObligation,
        snoozedObligationIds,
        paidObligationIds,
        skippedObligationIds,
        snoozeObligation,
        addInvestment,
        removeInvestment,
        executeSip,
        undoExecuteSip,
        skipSip,
        undoSkipSip,
        executedSipIds,
        skippedSipIds,
        isMonthSealed,
        sealMonth,
        unsealMonth,
        addPlannedBudget,
        updatePlannedBudget,
        generatePdfReport,
        syncConfig,
        updateSyncConfig,
        triggerGoogleSheetsSync,
        isSyncing,
        lastSyncResult,
        pendingChangesCount,
        rateLimitStatus,
        refreshRateLimitStatus,
        initializeUserVault,
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  );
};

export function useFinanceData(): FinanceDataContextType {
  const context = useContext(FinanceDataContext);
  if (!context) {
    throw new Error('useFinanceData must be used within a FinanceDataProvider');
  }
  return context;
}
