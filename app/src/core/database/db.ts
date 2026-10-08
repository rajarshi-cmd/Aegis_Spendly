import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DatabaseExecutor } from './types';
import { MemoryDatabaseAdapter } from './memoryDb';

let cachedDb: SQLite.SQLiteDatabase | null = null;
let dbExecutorInstance: DatabaseExecutor | null = null;
let inMemoryFallback: DatabaseExecutor | null = null;

export const DB_NAME = 'aegis_finance.db';

export async function getNativeDb(): Promise<SQLite.SQLiteDatabase> {
  if (cachedDb) {
    return cachedDb;
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Configure Write-Ahead Logging (WAL) and foreign keys
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
  `);

  cachedDb = db;
  return db;
}

export function createDatabaseExecutor(sqliteDb: SQLite.SQLiteDatabase): DatabaseExecutor {
  return {
    async exec(sql: string): Promise<void> {
      await sqliteDb.execAsync(sql);
    },

    async run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
      const res = await (sqliteDb.runAsync as any)(sql, ...(params as any[]));
      return {
        changes: res.changes,
        lastInsertRowId: res.lastInsertRowId,
      };
    },

    async getFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const res = await (sqliteDb.getFirstAsync as any)(sql, ...(params as any[]));
      return (res as T) ?? null;
    },

    async getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const res = await (sqliteDb.getAllAsync as any)(sql, ...(params as any[]));
      return (res as T[]) ?? [];
    },

    async withTransaction<T>(action: () => Promise<T>): Promise<T> {
      let result: T;
      await sqliteDb.withTransactionAsync(async () => {
        result = await action();
      });
      return result!;
    },
  };
}

export async function getDatabase(): Promise<DatabaseExecutor> {
  if (dbExecutorInstance) {
    return dbExecutorInstance;
  }

  if (Platform.OS === 'web') {
    if (!inMemoryFallback) {
      inMemoryFallback = new MemoryDatabaseAdapter();
    }
    return inMemoryFallback;
  }

  try {
    const nativeDb = await getNativeDb();
    dbExecutorInstance = createDatabaseExecutor(nativeDb);
    return dbExecutorInstance;
  } catch (err) {
    console.warn('[Database] Native SQLite open unavailable, using fallback adapter:', err);
    if (!inMemoryFallback) {
      inMemoryFallback = new MemoryDatabaseAdapter();
    }
    return inMemoryFallback;
  }
}
