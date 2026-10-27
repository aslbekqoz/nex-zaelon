import "server-only";
import pg from "pg";

// Read BIGINT and NUMERIC columns as numbers rather than strings; DATE stays a "YYYY-MM-DD" string
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));
pg.types.setTypeParser(1082, (v) => v);

const globalForDb = globalThis as unknown as { cinemindPool?: pg.Pool };

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. See cinemind/.env.example.");
  }
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
}

export function db(): pg.Pool {
  // Reuse the pool across hot reloads in development so connections don't pile up
  globalForDb.cinemindPool ??= createPool();
  return globalForDb.cinemindPool;
}

export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return db().query<T>(text, params);
}
