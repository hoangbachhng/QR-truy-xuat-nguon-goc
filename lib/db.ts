import { migrations } from "./migrations";
import { hashPassword } from "./password";

// Lớp CSDL trung lập: DATABASE_URL có giá trị -> PostgreSQL thật (pg); để trống -> PGlite nhúng (chạy thử trên máy).
// Mọi truy vấn đi qua hàm query() với SQL chuẩn, nên đổi nơi chạy không phải sửa mã.

type Row = Record<string, any>;
export interface Tx {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  // Chạy nhiều câu lệnh SQL một lần (dùng cho migration), không có tham số
  exec(sql: string): Promise<void>;
}
export interface Db extends Tx {
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

// Trả DATE dạng chuỗi 'YYYY-MM-DD' (tránh lệch múi giờ) và số NUMERIC/BIGINT dạng number.
const DATE_OID = 1082;
const NUMERIC_OID = 1700;
const INT8_OID = 20;
const toNum = (v: string) => (v === null ? null : Number(v));

async function createPg(url: string): Promise<Db> {
  const pg = await import("pg");
  const Pool = pg.default?.Pool ?? (pg as any).Pool;
  const types = pg.default?.types ?? (pg as any).types;
  types.setTypeParser(DATE_OID, (v: string) => v);
  types.setTypeParser(NUMERIC_OID, toNum);
  types.setTypeParser(INT8_OID, toNum);
  const needsSsl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === "true";
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  return {
    async query(sql, params) {
      const r = await pool.query(sql, params as any[]);
      return r.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn({
          query: async (sql: string, params?: unknown[]) => (await client.query(sql, params as any[])).rows,
          exec: async (sql: string) => {
            await client.query(sql);
          },
        });
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const dir = path.resolve(process.env.PGLITE_DIR || "./data/pglite");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const db = await PGlite.create(dir, {
    parsers: {
      [DATE_OID]: (v: string) => v,
      [NUMERIC_OID]: toNum,
      [INT8_OID]: toNum,
    },
  });
  // PGlite chỉ xử lý 1 truy vấn tại một thời điểm -> xếp hàng.
  let chain: Promise<unknown> = Promise.resolve();
  const run = <T>(fn: () => Promise<T>) => {
    const p = chain.then(fn, fn);
    chain = p.catch(() => undefined);
    return p;
  };
  return {
    query: (sql, params) => run(async () => (await db.query(sql, params as any[])).rows as any[]),
    exec: (sql) => run(async () => void (await db.exec(sql))),
    transaction: (fn) =>
      run(() =>
        db.transaction(async (tx) =>
          fn({
            query: async (s, p) => (await tx.query(s, p as any[])).rows as any[],
            exec: async (s) => void (await tx.exec(s)),
          }),
        ),
      ),
  };
}

async function migrate(db: Db) {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (id INT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  );
  const done = new Set((await db.query<{ id: number }>(`SELECT id FROM schema_migrations`)).map((r) => r.id));
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query(`INSERT INTO schema_migrations (id, name) VALUES ($1, $2)`, [m.id, m.name]);
    });
  }
  // Tạo tài khoản quản trị đầu tiên nếu CSDL chưa có người dùng.
  const [{ n }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM users`);
  if (n === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await db.query(`INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`, [
      process.env.ADMIN_EMAIL.toLowerCase(),
      "Quản trị hệ thống",
      await hashPassword(process.env.ADMIN_PASSWORD),
    ]);
  }
}

const g = globalThis as unknown as { __vsDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__vsDb) {
    g.__vsDb = (async () => {
      const url = process.env.DATABASE_URL;
      const db = url ? await createPg(url) : await createPglite();
      await migrate(db);
      return db;
    })();
    g.__vsDb.catch(() => {
      g.__vsDb = undefined;
    });
  }
  return g.__vsDb;
}

export async function q<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}

export async function one<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T | undefined> {
  return (await q<T>(sql, params))[0];
}
