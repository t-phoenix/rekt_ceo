import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    const config = {
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    };
    if (url.includes('supabase.co')) {
      config.ssl = { rejectUnauthorized: false };
    }
    pool = new Pool(config);
    pool.on('error', (err) => console.error('Postgres pool error:', err.message));
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) return null;
  try {
    return await p.query(text, params);
  } catch (err) {
    console.error('Postgres query error:', err.message);
    return null;
  }
}

export function isPgEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim());
}
