import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    max: 2,
    connectionTimeoutMillis: 15_000,
  });

  try {
    const ping = await pool.query('SELECT NOW() AS now, current_database() AS db');
    console.log('Connected:', ping.rows[0].db, 'at', ping.rows[0].now);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log('Applied:', file);
    }

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE 'brandify_%')
      ORDER BY table_name
    `);

    console.log('\nBrandify tables:');
    for (const row of tables.rows) {
      console.log('  -', row.table_name);
    }

    console.log(`\n${tables.rows.length} tables ready.`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
