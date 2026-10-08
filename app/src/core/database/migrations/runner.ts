import { DatabaseExecutor, Migration, MigrationRecord } from '../types';
import { migrationV1 } from './v1_initial';
import { migrationV2 } from './v2_upcoming_and_investments';

export const ALL_MIGRATIONS: Migration[] = [
  migrationV1,
  migrationV2,
];

export async function runMigrations(db: DatabaseExecutor): Promise<number> {
  // Ensure schema_migrations table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Query already applied versions
  const appliedRows = await db.getAll<MigrationRecord>(
    `SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;`
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  let newlyAppliedCount = 0;

  for (const migration of ALL_MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      // Execute migration in an atomic transaction
      await db.withTransaction(async () => {
        await migration.up(db);
        const now = new Date().toISOString();
        await db.run(
          `INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
          [migration.version, migration.name, now]
        );
        await db.exec(`PRAGMA user_version = ${migration.version};`);
      });
      newlyAppliedCount++;
    }
  }

  return newlyAppliedCount;
}
