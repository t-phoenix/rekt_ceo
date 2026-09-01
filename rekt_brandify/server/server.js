import dotenv from 'dotenv';
import { createApp } from './createApp.js';
import { isPgEnabled, getPool } from './db/pg.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function verifyDatabase() {
  if (!isPgEnabled()) {
    console.warn('⚠️  No DATABASE_URL — brandify sessions and caption analytics will not persist.');
    console.warn('   Set DATABASE_URL to your Supabase Postgres connection string.');
    return;
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('✅ Connected to Postgres (Supabase)');
  } catch (err) {
    console.error('❌ Postgres connection error:', err.message);
    console.warn('⚠️  API will return 503 for write operations until DATABASE_URL is fixed.');
  }
}

async function startServer() {
  await verifyDatabase();

  const { app } = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 Meme Lab Backend running on http://localhost:${PORT}`);
  });
}

startServer();
