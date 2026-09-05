import { createRequire } from 'module';
import path from 'path';
import { getCmoConfig } from './config.js';

const require = createRequire(import.meta.url);
const agentcashRoot = path.dirname(require.resolve('agentcash/package.json'));

const { getWallet } = await import(
  path.join(agentcashRoot, 'dist/esm/chunk-F3KGAMIA.js')
);
const { getBalances, listAccountsWithBalances } = await import(
  path.join(agentcashRoot, 'dist/esm/chunk-4MCPQDKM.js')
);

const SURFACE = 'cmo:wallet';

const CHAIN_LABELS = {
  base: { chainId: 8453, chainLabel: 'Base' },
  solana: { chainId: null, chainLabel: 'Solana' },
};

async function loadWallets() {
  const result = await getWallet();
  if (result.isErr()) {
    throw new Error(result.error?.message || 'AgentCash wallet not configured');
  }
  return result.value;
}

export async function getWalletStatus() {
  const cfg = getCmoConfig();
  const lastCheckedAt = new Date().toISOString();

  try {
    const wallets = await loadWallets();
    const flags = {};
    const balanceResult = await getBalances(SURFACE, wallets, flags);
    const accountsResult = await listAccountsWithBalances(SURFACE, wallets, flags);

    const total = Number(balanceResult.totalBalance ?? 0);
    let status = 'ok';
    if (total <= cfg.walletCriticalUsd) status = 'critical';
    else if (total < cfg.walletLowUsd) status = 'low';

    const accounts = (accountsResult.accounts || []).map((a) => {
      const meta = CHAIN_LABELS[a.network] || { chainId: null, chainLabel: a.network };
      return {
        network: a.network,
        chainId: meta.chainId,
        chainLabel: meta.chainLabel,
        address: a.address,
        balanceUsd: String(a.balance ?? 0),
        token: 'USDC',
        depositLink: a.depositLink || null,
      };
    });

    return {
      totalBalanceUsd: String(total),
      status,
      lowBalanceWarning: status === 'low' || status === 'critical',
      thresholdUsd: String(cfg.walletLowUsd),
      criticalThresholdUsd: String(cfg.walletCriticalUsd),
      accounts,
      onboardingCta: balanceResult.onboardingCta || null,
      lastCheckedAt,
    };
  } catch (err) {
    return {
      totalBalanceUsd: '0',
      status: 'unconfigured',
      lowBalanceWarning: true,
      thresholdUsd: String(cfg.walletLowUsd),
      criticalThresholdUsd: String(cfg.walletCriticalUsd),
      accounts: [],
      error: err.message,
      lastCheckedAt,
    };
  }
}
