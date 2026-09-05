import { useEffect, useState } from 'react';
import { cmoApi, type WalletStatus } from '../../services/cmoApi';

const statusStyle: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  low: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300',
  unconfigured: 'bg-gray-500/15 text-gray-600 dark:text-gray-300',
};

export function AgentCashWalletPanel() {
  const [wallet, setWallet] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setWallet(await cmoApi.getWalletStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const baseAccount = wallet?.accounts.find((a) => a.network === 'base');

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 px-3 py-2 shadow-sm">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
          $
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AgentCash</span>
            {wallet && (
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusStyle[wallet.status]}`}>
                {wallet.status}
              </span>
            )}
          </div>
          {loading ? (
            <span className="text-sm text-gray-400">Loading…</span>
          ) : error ? (
            <span className="text-xs text-red-500 truncate block">{error}</span>
          ) : wallet ? (
            <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              ${Number(wallet.totalBalanceUsd).toFixed(2)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {wallet && wallet.accounts.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {expanded ? 'Hide' : 'Chains'}
            </button>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            title="Refresh balance"
          >
            ↻
          </button>
        </div>
      </div>

      {wallet?.lowBalanceWarning && !error && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 px-1">
          {wallet.status === 'critical'
            ? 'Fund wallet before running paid research.'
            : 'Balance is low — consider topping up.'}
        </p>
      )}

      {expanded && wallet && (
        <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-2 space-y-1.5">
          {wallet.accounts.map((a) => (
            <div key={a.network} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">{a.chainLabel}</span>
              <span className="text-gray-600 dark:text-gray-400">${Number(a.balanceUsd).toFixed(2)}</span>
              {a.depositLink && (
                <a
                  href={a.depositLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  Fund
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {baseAccount?.depositLink && wallet?.status !== 'ok' && !expanded && (
        <a
          href={baseAccount.depositLink}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline px-1"
        >
          Add USDC on Base →
        </a>
      )}
    </div>
  );
}
