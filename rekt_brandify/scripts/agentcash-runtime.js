/**
 * Programmatic AgentCash fetch — avoids `npx agentcash@latest` on every request,
 * which is slow on Render and causes shell timeouts / JSON escaping failures.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const agentcashRoot = path.dirname(require.resolve('agentcash/package.json'));

const { executeFetch } = await import(
  path.join(agentcashRoot, 'dist/esm/chunk-YIECO2O4.js')
);
const { getWallet } = await import(
  path.join(agentcashRoot, 'dist/esm/chunk-F3KGAMIA.js')
);
const { safeParseResponse } = await import(
  path.join(agentcashRoot, 'dist/esm/chunk-RAS5DZPQ.js')
);

const SURFACE = 'brandify:agentcash';
const DEFAULT_TIMEOUT_MS = 120_000;

let walletsPromise = null;

async function loadWallets() {
  if (!walletsPromise) {
    walletsPromise = getWallet().then((result) => {
      if (result.isErr()) {
        const message =
          result.error?.message ||
          result.error?.invalidMessage ||
          'AgentCash wallet is not configured. Set AGENTCASH_WALLET_BASE64 on Render.';
        throw new Error(message);
      }
      return result.value;
    });
  }
  return walletsPromise;
}

function formatAgentCashError(error, url) {
  if (!error) return `AgentCash fetch failed for ${url}`;
  if (typeof error === 'string') return `AgentCash fetch failed for ${url}: ${error}`;
  const message = error.message || error.invalidMessage || error.errorMessage;
  if (message) return `AgentCash fetch failed for ${url}: ${message}`;
  return `AgentCash fetch failed for ${url}: ${JSON.stringify(error).slice(0, 400)}`;
}

async function readResponseBody(parsed) {
  if (parsed.type === 'json' || parsed.type === 'text') {
    return parsed.data;
  }
  return parsed;
}

/**
 * Paid/SIWX fetch via AgentCash wallet.
 * @param {string} url
 * @param {{ method?: string, body?: unknown, timeout?: number }} [options]
 */
export async function agentCashFetch(url, { method = 'POST', body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const wallets = await loadWallets();
  const input = {
    url,
    method,
    timeout,
    paymentNetwork: 'base',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const result = await executeFetch(input, {
    surface: SURFACE,
    wallets,
    flags: {},
    params: input,
  });

  if (result.isErr()) {
    throw new Error(formatAgentCashError(result.error, url));
  }

  const { response } = result.value;
  const parsed = await safeParseResponse(SURFACE, response);
  if (parsed.isErr()) {
    throw new Error(formatAgentCashError(parsed.error, url));
  }

  const data = await readResponseBody(parsed.value);

  if (!response.ok) {
    const detail =
      typeof data === 'string'
        ? data.slice(0, 500)
        : JSON.stringify(data).slice(0, 500);
    throw new Error(`AgentCash HTTP ${response.status} for ${url}: ${detail}`);
  }

  return data;
}
