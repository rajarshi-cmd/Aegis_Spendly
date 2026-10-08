export interface DatabaseExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  withTransaction<T>(action: () => Promise<T>): Promise<T>;
}

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseExecutor) => Promise<void>;
}

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}
