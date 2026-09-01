#!/usr/bin/env node
/**
 * Quick connectivity test using the same pg helper as the server.
 * Usage: node scripts/test-db-connection.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { getPool, isPgEnabled, query } = await import('../server/db/pg.js');

async function main() {
  console.log('DATABASE_URL set:', isPgEnabled());

  if (!isPgEnabled()) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const pool = getPool();
  if (!pool) {
    console.error('Could not create pool');
    process.exit(1);
  }

  const result = await query(
    `SELECT COUNT(*)::int AS runs FROM brandify_caption_runs`
  );

  if (!result) {
    console.error('Query failed — check SSL/connection string');
    process.exit(1);
  }

  console.log('brandify_caption_runs count:', result.rows[0].runs);
  console.log('Server pg helper OK');
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
