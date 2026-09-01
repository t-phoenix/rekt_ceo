#!/usr/bin/env node
/**
 * Round-trip test for brandify_sessions table.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  createSession,
  findSession,
  updateSessionVision,
  rateSession,
  isPgEnabled,
} = await import('../server/db/brandifySessions.js');
const { query } = await import('../server/db/pg.js');

async function main() {
  if (!isPgEnabled()) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sessionId = uuidv4();

  await createSession({
    sessionId,
    originalImageUrl: 'https://example.com/original.jpg',
    templateId: 'drake-test',
    category: 'Drake',
  });

  await updateSessionVision(sessionId, { elements: [{ name: 'shirt', type: 'existing' }] });

  const found = await findSession(sessionId);
  if (!found?.aiVisionRaw?.elements) {
    console.error('Vision update failed');
    process.exit(1);
  }

  const rated = await rateSession(sessionId, 'Like');
  if (rated?.userRating !== 'Like') {
    console.error('Rate failed');
    process.exit(1);
  }

  console.log('brandify_sessions round-trip OK:', sessionId);

  await query('DELETE FROM brandify_sessions WHERE session_id = $1', [sessionId]);
  console.log('Cleanup OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
