import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/createApp.js';

let mongoServer = null;
let httpServer = null;

/**
 * Start in-memory Mongo + Express on a random port for integration tests.
 * Clears X402_RECEIVER_ADDRESS unless enablePayment is true.
 */
export async function startTestServer({ enablePayment = false } = {}) {
  if (!enablePayment) {
    delete process.env.X402_RECEIVER_ADDRESS;
  }

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

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
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
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
