import { DatabaseExecutor } from './types';
import { MemoryDatabaseAdapter } from './memoryDb';

let inMemoryFallback: DatabaseExecutor | null = null;

export const DB_NAME = 'aegis_finance.db';

export async function getNativeDb(): Promise<never> {
  throw new Error('Native SQLite is not supported on Web. Using MemoryDatabaseAdapter.');
}

export function createDatabaseExecutor(_sqliteDb: unknown): DatabaseExecutor {
  if (!inMemoryFallback) {
    inMemoryFallback = new MemoryDatabaseAdapter();
  }
  return inMemoryFallback;
}

export async function getDatabase(): Promise<DatabaseExecutor> {
  if (!inMemoryFallback) {
    inMemoryFallback = new MemoryDatabaseAdapter();
  }
  return inMemoryFallback;
}
