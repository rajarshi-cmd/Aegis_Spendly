// Safe dynamic imports for cross-platform and Jest node environment compatibility
let SQLite: any = null;
try {
  SQLite = require('expo-sqlite');
} catch {}

let Platform: any = null;
try {
  Platform = require('react-native').Platform;
} catch {}

const DB_NAME = 'aegis_finance.db';
const KV_TABLE_NAME = 'app_kv_store';

class KeyValueStorage {
  private cache: Map<string, string> = new Map();
  private isInitialized = false;
  private db: any = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;

    // 1. Web or environments with window.localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            const val = window.localStorage.getItem(key);
            if (val !== null) {
              this.cache.set(key, val);
            }
          }
        }
      } catch (err) {
        console.warn('[kvStorage] Failed to preload from localStorage:', err);
      }
    }

    // 2. Native SQLite storage (Android & iOS)
    if (Platform?.OS !== 'web' && SQLite && typeof SQLite.openDatabaseSync === 'function') {
      try {
        const nativeDb = SQLite.openDatabaseSync(DB_NAME);
        this.db = nativeDb;
        nativeDb.execSync(`
          CREATE TABLE IF NOT EXISTS ${KV_TABLE_NAME} (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);

        const rows = (nativeDb.getAllSync(
          `SELECT key, value FROM ${KV_TABLE_NAME}`
        ) || []) as Array<{ key: string; value: string }>;
        for (const row of rows) {
          this.cache.set(row.key, row.value);
        }
      } catch (err) {
        // Fallback gracefully (e.g., in unit test mocks or web preview)
        console.warn('[kvStorage] Native SQLite KV store unavailable, falling back to in-memory/localStorage:', err);
      }
    }

    this.isInitialized = true;
  }

  public getItem(key: string): string | null {
    if (!this.isInitialized) {
      this.init();
    }
    return this.cache.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    if (!this.isInitialized) {
      this.init();
    }
    this.cache.set(key, value);

    // Persist to web localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }

    // Persist to Native SQLite
    if (this.db) {
      try {
        this.db.runSync(
          `INSERT OR REPLACE INTO ${KV_TABLE_NAME} (key, value) VALUES (?, ?)`,
          key,
          value
        );
      } catch (err) {
        console.warn('[kvStorage] Failed to persist key to SQLite:', key, err);
      }
    }
  }

  public removeItem(key: string): void {
    if (!this.isInitialized) {
      this.init();
    }
    this.cache.delete(key);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }

    if (this.db) {
      try {
        this.db.runSync(`DELETE FROM ${KV_TABLE_NAME} WHERE key = ?`, key);
      } catch (err) {
        console.warn('[kvStorage] Failed to delete key from SQLite:', key, err);
      }
    }
  }

  public clear(): void {
    if (!this.isInitialized) {
      this.init();
    }
    this.cache.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch {}
    }

    if (this.db) {
      try {
        this.db.execSync(`DELETE FROM ${KV_TABLE_NAME}`);
      } catch (err) {
        console.warn('[kvStorage] Failed to clear SQLite KV store:', err);
      }
    }
  }
}

export const kvStorage = new KeyValueStorage();
