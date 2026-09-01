import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../server/createApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let httpServer = null;

/**
 * Start Express on a random port for integration tests.
 * Uses DATABASE_URL from env when set; otherwise read endpoints return empty.
 */
export async function startTestServer({ enablePayment = false } = {}) {
  if (!enablePayment) {
    delete process.env.X402_RECEIVER_ADDRESS;
  }

  const { app, paymentMiddlewareEnabled, x402NetworkId } = createApp();
  await new Promise((resolve) => {
    httpServer = app.listen(0, resolve);
  });

  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return { baseUrl, paymentMiddlewareEnabled, x402NetworkId, app };
}

export async function stopTestServer() {
  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    httpServer = null;
  }
}

export async function jsonFetch(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}
