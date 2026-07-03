import { useCallback, useState } from 'react'
import { formatCurrency } from '../utils/formatNumber'
import type {
  BaseTradeRecord,
  SolanaTradeRecord,
  SolanaVolumeStartBody,
  BaseVolumeStartBody,
} from '../services/rebalancerApi'

type VolumeStatus = { status: string; config: Record<string, unknown> | null } | null

interface VolumeBotsPanelProps {
  healthVolumeSol?: string
  healthVolumeBase?: string
  solStatus: VolumeStatus
  baseStatus: VolumeStatus
  solStats: Record<string, unknown> | null
  baseStats: Record<string, unknown> | null
  solTrades: SolanaTradeRecord[]
  baseTrades: BaseTradeRecord[]
  volumeError: string | null
  onDismissVolumeError: () => void
  startSolana: (body: SolanaVolumeStartBody) => Promise<{ ok: boolean }>
  stopSolana: () => Promise<{ ok: boolean }>
  startBase: (body: BaseVolumeStartBody) => Promise<{ ok: boolean }>
  stopBase: () => Promise<{ ok: boolean }>
}

const DEFAULT_SOL: SolanaVolumeStartBody = {
  minTradeAmountSol: 0.01,
  maxTradeAmountSol: 0.05,
  tradingIntervalMs: 30000,
  slippagePercent: 5,
  buyProbability: 50,
  priorityFeeSol: 0.0001,
  randomizeTradeSize: true,
  maxTotalVolumeUsd: 0,
  runDurationMinutes: 0,
}

const DEFAULT_BASE: BaseVolumeStartBody = {
  minTradeAmountUsdc: 5,
  maxTradeAmountUsdc: 50,
  tradingIntervalMs: 30000,
  slippageBps: 50,
  buyProbability: 50,
  deadlineSeconds: 30,
  randomizeTradeSize: true,
  maxTotalVolumeUsd: 0,
  runDurationMinutes: 0,
}

function statusBadge(status: string | undefined) {
  const s = String(status ?? '').toLowerCase()
  if (s === 'running')
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
  if (s === 'error')
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
}

export const VolumeBotsPanel = ({
  healthVolumeSol,
  healthVolumeBase,
  solStatus,
  baseStatus,
  solStats,
  baseStats,
  solTrades,
  baseTrades,
  volumeError,
  onDismissVolumeError,
  startSolana,
  stopSolana,
  startBase,
  stopBase,
}: VolumeBotsPanelProps) => {
  const [solForm, setSolForm] = useState<SolanaVolumeStartBody>(DEFAULT_SOL)
  const [baseForm, setBaseForm] = useState<BaseVolumeStartBody>(DEFAULT_BASE)
  const [solBusy, setSolBusy] = useState(false)
  const [baseBusy, setBaseBusy] = useState(false)
  const [showSolForm, setShowSolForm] = useState(false)
  const [showBaseForm, setShowBaseForm] = useState(false)

  const solRunning = String(solStatus?.status ?? '').toLowerCase() === 'running'
  const baseRunning = String(baseStatus?.status ?? '').toLowerCase() === 'running'

  const onStartSol = useCallback(async () => {
    setSolBusy(true)
    await startSolana(solForm)
    setSolBusy(false)
    setShowSolForm(false)
  }, [solForm, startSolana])

  const onStopSol = useCallback(async () => {
    setSolBusy(true)
    await stopSolana()
    setSolBusy(false)
  }, [stopSolana])

  const onStartBase = useCallback(async () => {
    setBaseBusy(true)
    await startBase(baseForm)
    setBaseBusy(false)
    setShowBaseForm(false)
  }, [baseForm, startBase])

  const onStopBase = useCallback(async () => {
    setBaseBusy(true)
    await stopBase()
    setBaseBusy(false)
  }, [stopBase])

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Volume bots (Pump.fun & Base)</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Generate randomized buy/sell volume per{' '}
          <code className="text-indigo-600 dark:text-indigo-400 text-xs">AI_API_CONTEXT.md</code>. Start parameters apply for that run
          only; change by stopping and starting again.
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {healthVolumeSol != null && (
            <span className={`px-2 py-1 rounded-full border font-medium ${statusBadge(healthVolumeSol)}`}>
              Health: Solana volume — {healthVolumeSol}
            </span>
          )}
          {healthVolumeBase != null && (
            <span className={`px-2 py-1 rounded-full border font-medium ${statusBadge(healthVolumeBase)}`}>
              Health: Base volume — {healthVolumeBase}
            </span>
          )}
        </div>
      </div>

      {volumeError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300 flex justify-between gap-4">
          <span>{volumeError}</span>
          <button type="button" className="shrink-0 text-red-600 dark:text-red-400 underline" onClick={onDismissVolumeError}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Solana */}
        <div className="space-y-4 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Solana (Pump.fun)</h4>
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge(solStatus?.status)}`}>
              {solStatus?.status ?? '—'}
            </span>
          </div>
          {solStats && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <p>Volume USD: <strong className="text-gray-900 dark:text-gray-200">{formatCurrency(solStats.totalVolumeUsd as number | undefined)}</strong></p>
              <p>Trades: <strong className="text-gray-900 dark:text-gray-200">{String(solStats.tradeCount ?? '—')}</strong></p>
              <p>SOL/USD: <strong className="text-gray-900 dark:text-gray-200">{formatCurrency(solStats.solPriceUsd as number | undefined)}</strong></p>
              {solStats.lastError != null && String(solStats.lastError) && (
                <p className="col-span-2 text-red-600 dark:text-red-400">Error: {String(solStats.lastError)}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!solRunning ? (
              <button
                type="button"
                disabled={solBusy}
                onClick={() => (showSolForm ? onStartSol() : setShowSolForm(true))}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {showSolForm ? (solBusy ? 'Starting…' : 'Confirm start') : 'Start'}
              </button>
            ) : (
              <button
                type="button"
                disabled={solBusy}
                onClick={() => onStopSol()}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {solBusy ? 'Stopping…' : 'Stop'}
              </button>
            )}
            {showSolForm && !solRunning && (
              <button type="button" className="px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600" onClick={() => setShowSolForm(false)}>
                Cancel
              </button>
            )}
          </div>
          {showSolForm && !solRunning && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="col-span-1">
                Min SOL
                <input
                  type="number"
                  step="0.001"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={solForm.minTradeAmountSol}
                  onChange={(e) => setSolForm((f) => ({ ...f, minTradeAmountSol: Number(e.target.value) }))}
                />
              </label>
              <label className="col-span-1">
                Max SOL
                <input
                  type="number"
                  step="0.001"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={solForm.maxTradeAmountSol}
                  onChange={(e) => setSolForm((f) => ({ ...f, maxTradeAmountSol: Number(e.target.value) }))}
                />
              </label>
              <label className="col-span-2">
                Interval (ms)
                <input
                  type="number"
                  step="1000"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={solForm.tradingIntervalMs}
                  onChange={(e) => setSolForm((f) => ({ ...f, tradingIntervalMs: Number(e.target.value) }))}
                />
              </label>
              <label>
                Slippage %
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={solForm.slippagePercent}
                  onChange={(e) => setSolForm((f) => ({ ...f, slippagePercent: Number(e.target.value) }))}
                />
              </label>
              <label>
                Buy %
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={solForm.buyProbability ?? 50}
                  onChange={(e) => setSolForm((f) => ({ ...f, buyProbability: Number(e.target.value) }))}
                />
              </label>
              <label className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  checked={solForm.randomizeTradeSize !== false}
                  onChange={(e) => setSolForm((f) => ({ ...f, randomizeTradeSize: e.target.checked }))}
                />
                Randomize size
              </label>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">Recent trades</p>
            {solTrades.length === 0 ? (
              <p className="text-xs text-gray-500">No trades loaded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {solTrades.slice(0, 15).map((tr, i) => (
                  <li
                    key={`${tr.signature}-${i}`}
                    className={`flex flex-wrap justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1 ${tr.success ? '' : 'text-red-600 dark:text-red-400'}`}
                  >
                    <span>{tr.direction}</span>
                    <span>{formatCurrency(tr.usdValue)}</span>
                    {tr.signature ? (
                      <a
                        className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[140px]"
                        href={`https://solscan.io/tx/${tr.signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tr.signature.slice(0, 8)}…
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Base */}
        <div className="space-y-4 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Base (Uniswap V2)</h4>
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge(baseStatus?.status)}`}>
              {baseStatus?.status ?? '—'}
            </span>
          </div>
          {baseStats && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <p>Volume USD: <strong className="text-gray-900 dark:text-gray-200">{formatCurrency(baseStats.totalVolumeUsd as number | undefined)}</strong></p>
              <p>Trades: <strong className="text-gray-900 dark:text-gray-200">{String(baseStats.tradeCount ?? '—')}</strong></p>
              <p>ETH/USD: <strong className="text-gray-900 dark:text-gray-200">{formatCurrency(baseStats.ethPriceUsd as number | undefined)}</strong></p>
              {baseStats.lastError != null && String(baseStats.lastError) && (
                <p className="col-span-2 text-red-600 dark:text-red-400">Error: {String(baseStats.lastError)}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!baseRunning ? (
              <button
                type="button"
                disabled={baseBusy}
                onClick={() => (showBaseForm ? onStartBase() : setShowBaseForm(true))}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {showBaseForm ? (baseBusy ? 'Starting…' : 'Confirm start') : 'Start'}
              </button>
            ) : (
              <button
                type="button"
                disabled={baseBusy}
                onClick={() => onStopBase()}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {baseBusy ? 'Stopping…' : 'Stop'}
              </button>
            )}
            {showBaseForm && !baseRunning && (
              <button type="button" className="px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600" onClick={() => setShowBaseForm(false)}>
                Cancel
              </button>
            )}
          </div>
          {showBaseForm && !baseRunning && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label>
                Min USDC
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={baseForm.minTradeAmountUsdc}
                  onChange={(e) => setBaseForm((f) => ({ ...f, minTradeAmountUsdc: Number(e.target.value) }))}
                />
              </label>
              <label>
                Max USDC
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={baseForm.maxTradeAmountUsdc}
                  onChange={(e) => setBaseForm((f) => ({ ...f, maxTradeAmountUsdc: Number(e.target.value) }))}
                />
              </label>
              <label className="col-span-2">
                Interval (ms)
                <input
                  type="number"
                  step="1000"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={baseForm.tradingIntervalMs}
                  onChange={(e) => setBaseForm((f) => ({ ...f, tradingIntervalMs: Number(e.target.value) }))}
                />
              </label>
              <label>
                Slippage (bps)
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={baseForm.slippageBps}
                  onChange={(e) => setBaseForm((f) => ({ ...f, slippageBps: Number(e.target.value) }))}
                />
              </label>
              <label>
                Buy %
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                  value={baseForm.buyProbability ?? 50}
                  onChange={(e) => setBaseForm((f) => ({ ...f, buyProbability: Number(e.target.value) }))}
                />
              </label>
              <label className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  checked={baseForm.randomizeTradeSize !== false}
                  onChange={(e) => setBaseForm((f) => ({ ...f, randomizeTradeSize: e.target.checked }))}
                />
                Randomize size
              </label>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">Recent trades</p>
            {baseTrades.length === 0 ? (
              <p className="text-xs text-gray-500">No trades loaded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {baseTrades.slice(0, 15).map((tr, i) => (
                  <li
                    key={`${tr.transactionHash}-${i}`}
                    className={`flex flex-wrap justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1 ${tr.success ? '' : 'text-red-600 dark:text-red-400'}`}
                  >
                    <span>{tr.direction}</span>
                    <span>{formatCurrency(tr.usdValue)}</span>
                    {tr.transactionHash ? (
                      <a
                        className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[140px]"
                        href={`https://basescan.org/tx/${tr.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tr.transactionHash.slice(0, 10)}…
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
