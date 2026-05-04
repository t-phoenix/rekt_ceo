import { Pool, QueryResult } from 'pg';
import { logger } from './logger';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 8, idleTimeoutMillis: 30_000 });
    pool.on('error', (err) => logger.error('Postgres pool error', { err: err.message }));
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<QueryResult | null> {
  const p = getPool();
  if (!p) return null;
  try {
    return await p.query(text, params);
  } catch (error) {
    logger.error('Postgres query error', { error: (error as Error).message, query: text });
    return null;
  }
}
