import "server-only";
import pg from "pg";

// BIGINT va NUMERIC ustunlarni satr emas, son sifatida olamiz; DATE esa "YYYY-MM-DD" satri bo'lib qoladi
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));
pg.types.setTypeParser(1082, (v) => v);

const globalForDb = globalThis as unknown as { cinemindPool?: pg.Pool };

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL o'rnatilmagan. cinemind/.env.example faylini ko'ring.");
  }
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
}

export function db(): pg.Pool {
  // Ishlab chiqish rejimida qayta yuklanishlarda ulanishlar ko'payib ketmasligi uchun
  globalForDb.cinemindPool ??= createPool();
  return globalForDb.cinemindPool;
}

export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return db().query<T>(text, params);
}
