import { useCallback, useEffect, useMemo, useState } from 'react'
import { useArbBot } from '../hooks/useArbBot'
import { formatCurrency, formatNumber } from '../utils/formatNumber'
import type { ArbConfigUpdate } from '../services/rebalancerApi'
import { VolumeBotsPanel } from './VolumeBotsPanel'

function msToLabel(ms: number): string {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)} min`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${ms} ms`
}

function shortAddr(s: string | undefined, n = 6): string {
  if (!s || s.length < n * 2) return s || '—'
  return `${s.slice(0, n)}…${s.slice(-n)}`
}

function numericInputValue(v: unknown): number | '' {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  return ''
}

const CONFIG_FIELDS: {
  key: keyof ArbConfigUpdate
  label: string
  hint: string
  type: 'number' | 'boolean'
  step?: string
}[] = [
  {
    key: 'MIN_PROFIT_THRESHOLD',
    label: 'Min profit threshold',
    hint: 'Decimal fraction of profit required (e.g. 0.02 = 2%)',
    type: 'number',
    step: '0.001',
  },
  {
    key: 'TRADE_SIZE_USD',
    label: 'Trade size (USD)',
    hint: 'Approximate notional per arb leg',
    type: 'number',
    step: '1',
  },
  {
    key: 'PRICE_MOVEMENT_THRESHOLD',
    label: 'Price move to wake analysis (%)',
    hint: 'Percent move on either chain to trigger analysis',
    type: 'number',
    step: '0.1',
  },
  {
    key: 'ANALYSIS_COOLDOWN_MS',
    label: 'Analysis cooldown (ms)',
    hint: 'Minimum time between automatic analysis cycles',
    type: 'number',
    step: '1000',
  },
  {
    key: 'EVENT_POLL_INTERVAL_MS',
    label: 'Event poll interval (ms)',
    hint: 'How often the coordinator polls; may require restart to take full effect',
    type: 'number',
    step: '500',
  },
]

export const ArbitrageBotPage = () => {
  const {
    baseUrl,
    health,
    healthError,
    arbConfig,
    arbStats,
    loading,
    actionError,
    setActionError,
    sseConnected,
    lastSseEventAt,
    opportunities,
    trades,
    analysisNote,
    loadAll,
    updateConfig,
    startBot,
    stopBot,
    triggerAnalysis,
    resetBaseline,
    clearArbFeeds,
    solVolumeStatus,
    baseVolumeStatus,
    solVolumeStats,
    baseVolumeStats,
    solVolumeTrades,
    baseVolumeTrades,
    volumeError,
    setVolumeError,
    pricingData,
    balancesData,
    poolsData,
    marketError,
    pricingError,
    balancesError,
    poolsError,
    loadMarketSnapshot,
    startSolanaVolume,
    stopSolanaVolume,
    startBaseVolume,
    stopBaseVolume,
  } = useArbBot()

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(id)
  }, [toast])

  const [form, setForm] = useState<ArbConfigUpdate>({})
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showStartOverrides, setShowStartOverrides] = useState(false)
  const [startOverrides, setStartOverrides] = useState<ArbConfigUpdate>({})
  const [confirmAuto, setConfirmAuto] = useState<'save' | 'start' | null>(null)

  const running = arbStats?.status === 'running'

  useEffect(() => {
    if (!arbConfig) return
    setForm({
      MIN_PROFIT_THRESHOLD: arbConfig.MIN_PROFIT_THRESHOLD,
      TRADE_SIZE_USD: arbConfig.TRADE_SIZE_USD,
      AUTO_EXECUTE_TRADES: arbConfig.AUTO_EXECUTE_TRADES,
      PRICE_MOVEMENT_THRESHOLD: arbConfig.PRICE_MOVEMENT_THRESHOLD,
      ANALYSIS_COOLDOWN_MS: arbConfig.ANALYSIS_COOLDOWN_MS,
      EVENT_POLL_INTERVAL_MS: arbConfig.EVENT_POLL_INTERVAL_MS,
      LOG_ALL_EVENTS: arbConfig.LOG_ALL_EVENTS,
    })
  }, [arbConfig])

  const syncFormFromServer = useCallback(() => {
    if (!arbConfig) return
    setForm({
      MIN_PROFIT_THRESHOLD: arbConfig.MIN_PROFIT_THRESHOLD,
      TRADE_SIZE_USD: arbConfig.TRADE_SIZE_USD,
      AUTO_EXECUTE_TRADES: arbConfig.AUTO_EXECUTE_TRADES,
      PRICE_MOVEMENT_THRESHOLD: arbConfig.PRICE_MOVEMENT_THRESHOLD,
      ANALYSIS_COOLDOWN_MS: arbConfig.ANALYSIS_COOLDOWN_MS,
      EVENT_POLL_INTERVAL_MS: arbConfig.EVENT_POLL_INTERVAL_MS,
      LOG_ALL_EVENTS: arbConfig.LOG_ALL_EVENTS,
    })
  }, [arbConfig])

  const applySave = useCallback(async () => {
    setSaving(true)
    setActionError(null)
    const body: ArbConfigUpdate = {}
    if (form.MIN_PROFIT_THRESHOLD !== undefined) body.MIN_PROFIT_THRESHOLD = form.MIN_PROFIT_THRESHOLD
    if (form.TRADE_SIZE_USD !== undefined) body.TRADE_SIZE_USD = form.TRADE_SIZE_USD
    if (form.AUTO_EXECUTE_TRADES !== undefined) body.AUTO_EXECUTE_TRADES = form.AUTO_EXECUTE_TRADES
    if (form.PRICE_MOVEMENT_THRESHOLD !== undefined) body.PRICE_MOVEMENT_THRESHOLD = form.PRICE_MOVEMENT_THRESHOLD
    if (form.ANALYSIS_COOLDOWN_MS !== undefined) body.ANALYSIS_COOLDOWN_MS = form.ANALYSIS_COOLDOWN_MS
    if (form.EVENT_POLL_INTERVAL_MS !== undefined) body.EVENT_POLL_INTERVAL_MS = form.EVENT_POLL_INTERVAL_MS
    if (form.LOG_ALL_EVENTS !== undefined) body.LOG_ALL_EVENTS = form.LOG_ALL_EVENTS
    await updateConfig(body)
    setSaving(false)
  }, [form, updateConfig, setActionError])

  const onToggleAutoExecute = useCallback((next: boolean) => {
    if (next) {
      setConfirmAuto('save')
      return
    }
    setForm((f) => ({ ...f, AUTO_EXECUTE_TRADES: false }))
  }, [])

  const confirmAutoExecute = useCallback(
    async (mode: 'save' | 'start') => {
      setConfirmAuto(null)
      if (mode === 'save') {
        setForm((f) => ({ ...f, AUTO_EXECUTE_TRADES: true }))
        setSaving(true)
        const r = await updateConfig({ AUTO_EXECUTE_TRADES: true })
        setSaving(false)
        if (r?.ok) setToast('Auto-execute enabled (saved to server).')
      } else {
        setStarting(true)
        const r = await startBot({ ...startOverrides, AUTO_EXECUTE_TRADES: true })
        setStarting(false)
        setShowStartOverrides(false)
        setStartOverrides({})
        if (r?.ok) setToast('Arbitrage bot started with auto-execute.')
      }
    },
    [startOverrides, startBot, updateConfig]
  )

  const handleStart = useCallback(async () => {
    if (startOverrides.AUTO_EXECUTE_TRADES === true) {
      setConfirmAuto('start')
      return
    }
    setStarting(true)
    const r = await startBot(startOverrides)
    setStarting(false)
    setShowStartOverrides(false)
    setStartOverrides({})
    if (r?.ok) setToast('Arbitrage bot started.')
  }, [startOverrides, startBot])

  const coords = arbStats?.eventCoordinatorStats
  const current = coords?.currentPrices
  const baseline = coords?.baselinePrices
  const counts = coords?.eventCounts
  const changes = coords?.currentChanges

  const readOnlyTokens = useMemo(
    () => [
      { label: 'Solana token (mint)', value: arbConfig?.SOLANA_TOKEN_MINT, href: (m: string) => `https://pump.fun/${m}` },
      { label: 'Base token', value: arbConfig?.BASE_TOKEN_ADDRESS, href: (a: string) => `https://basescan.org/address/${a}` },
      { label: 'Base USDC', value: arbConfig?.BASE_USDC_ADDRESS, href: (a: string) => `https://basescan.org/address/${a}` },
      { label: 'Uniswap V2 Router', value: arbConfig?.UNISWAP_V2_ROUTER02_ADDRESS, href: (a: string) => `https://basescan.org/address/${a}` },
    ],
    [arbConfig]
  )

  if (loading && !arbConfig) {
    return (
      <div className="text-center py-16 text-gray-600 dark:text-gray-400">Loading arbitrage bot…</div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sol ↔ Base arbitrage</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor Pump.fun vs Base Uniswap V2, tune strategy, and review opportunities in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={baseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all max-w-xs"
          >
            {baseUrl}
          </a>
          <button
            type="button"
            onClick={() => loadAll()}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            health?.status === 'ok'
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
          }`}
        >
          API {health?.status === 'ok' ? 'healthy' : 'check failed'}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            sseConnected
              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          SSE {sseConnected ? 'live' : 'reconnecting…'}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            running
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
              : arbStats?.status === 'error'
                ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Bot: {arbStats?.status ?? '—'}
        </span>
        {health && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            SSE clients (server): {health.sseClients}
          </span>
        )}
        {health?.arb != null && (
          <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Health arb: {String(health.arb)}
          </span>
        )}
        {health?.volumeSolana != null && (
          <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Vol Sol: {health.volumeSolana}
          </span>
        )}
        {health?.volumeBase != null && (
          <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Vol Base: {health.volumeBase}
          </span>
        )}
        {lastSseEventAt != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400" title="Last SSE message received locally">
            Last SSE: {new Date(lastSseEventAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {toast && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-300">
          {toast}
        </div>
      )}

      {healthError && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Health check: {healthError}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}
      {marketError && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Market snapshot warning: {marketError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Strategy settings</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Updates apply via <code className="text-indigo-600 dark:text-indigo-400">PUT /arb/config</code> without restart.
            Enabling auto-execute spends real funds on both chains.
          </p>

          <div className="space-y-4">
            {CONFIG_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</span>
                <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">{f.hint}</span>
                <input
                  type="number"
                  step={f.step}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  value={numericInputValue(form[f.key])}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      [f.key]: v === '' ? undefined : Number(v),
                    }))
                  }}
                />
                {f.key === 'ANALYSIS_COOLDOWN_MS' && typeof form.ANALYSIS_COOLDOWN_MS === 'number' && (
                  <span className="text-[11px] text-gray-500">≈ {msToLabel(form.ANALYSIS_COOLDOWN_MS)}</span>
                )}
                {f.key === 'EVENT_POLL_INTERVAL_MS' && typeof form.EVENT_POLL_INTERVAL_MS === 'number' && (
                  <span className="text-[11px] text-gray-500">≈ {msToLabel(form.EVENT_POLL_INTERVAL_MS)}</span>
                )}
              </label>
            ))}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600"
                  checked={!!form.AUTO_EXECUTE_TRADES}
                  onChange={(e) => {
                    if (e.target.checked) onToggleAutoExecute(true)
                    else setForm((prev) => ({ ...prev, AUTO_EXECUTE_TRADES: false }))
                  }}
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Auto-execute trades</span>
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600"
                checked={!!form.LOG_ALL_EVENTS}
                onChange={(e) => setForm((prev) => ({ ...prev, LOG_ALL_EVENTS: e.target.checked }))}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Log all events (verbose)</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => applySave()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={syncFormFromServer}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset form from server
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">On-chain targets (read-only)</h4>
            <ul className="space-y-2 text-sm">
              {readOnlyTokens.map((row) => (
                <li key={row.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                  {row.value ? (
                    <a
                      href={row.href(row.value)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                    >
                      {shortAddr(row.value, 8)}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>RUN_MODE: <strong className="text-gray-900 dark:text-gray-200">{arbConfig?.RUN_MODE ?? '—'}</strong></span>
              <span>ENABLE_LIVE_TRADING:{' '}
                <strong className="text-gray-900 dark:text-gray-200">{String(arbConfig?.ENABLE_LIVE_TRADING ?? '—')}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Controls</h3>
            <div className="flex flex-wrap gap-2">
              {!running ? (
                <>
                  <button
                    type="button"
                    disabled={starting}
                    onClick={() => (showStartOverrides ? handleStart() : setShowStartOverrides(true))}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {showStartOverrides ? (starting ? 'Starting…' : 'Confirm start') : 'Start bot'}
                  </button>
                  {showStartOverrides && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowStartOverrides(false)
                        setStartOverrides({})
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const r = await stopBot()
                    if (r?.ok) setToast('Arbitrage bot stopped.')
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Stop bot
                </button>
              )}
              <button
                type="button"
                disabled={!running}
                onClick={async () => {
                  const r = await triggerAnalysis()
                  if (r?.ok && r.data) {
                    const msg = r.data.message ?? 'Analysis triggered'
                    const hasResult = r.data.result != null
                    setToast(hasResult ? `${msg} (opportunity details in response)` : `${msg}.`)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40"
              >
                Trigger analysis now
              </button>
              <button
                type="button"
                disabled={!running}
                onClick={async () => {
                  const r = await resetBaseline()
                  if (r?.ok) setToast('Price baseline reset.')
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Reset price baseline
              </button>
            </div>

            {showStartOverrides && !running && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Optional overrides applied only for this start (same fields as <code>POST /arb/start</code>). Leave blank to use saved config.
                </p>
                {CONFIG_FIELDS.map((f) => (
                  <label key={`start-${f.key}`} className="block text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{f.label}</span>
                    <input
                      type="number"
                      step={f.step}
                      className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
                      value={numericInputValue(startOverrides[f.key])}
                      onChange={(e) => {
                        const v = e.target.value
                        setStartOverrides((prev) => ({
                          ...prev,
                          [f.key]: v === '' ? undefined : Number(v),
                        }))
                      }}
                    />
                  </label>
                ))}
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!startOverrides.AUTO_EXECUTE_TRADES}
                    onChange={(e) =>
                      setStartOverrides((prev) => ({ ...prev, AUTO_EXECUTE_TRADES: e.target.checked }))
                    }
                  />
                  Auto-execute on start (will ask to confirm)
                </label>
              </div>
            )}

            {arbStats?.lastError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">Last error: {arbStats.lastError}</p>
            )}
            {analysisNote && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{analysisNote}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Live coordinator</h3>
            {!running && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Start the bot to populate live prices and event counts.</p>
            )}
            {running && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Solana price</p>
                  <p className="text-lg font-mono text-gray-900 dark:text-white">
                    {current?.solanaPrice != null ? formatNumber(current.solanaPrice, { maxDecimals: 10 }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Base price</p>
                  <p className="text-lg font-mono text-gray-900 dark:text-white">
                    {current?.basePrice != null ? formatNumber(current.basePrice, { maxDecimals: 10 }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Δ vs baseline (Sol / Base %)</p>
                  <p className="font-mono text-gray-800 dark:text-gray-200">
                    {changes?.solana != null ? formatNumber(changes.solana, { suffix: '%' }) : '—'} /{' '}
                    {changes?.base != null ? formatNumber(changes.base, { suffix: '%' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Events heard (Sol / Base)</p>
                  <p className="font-mono">
                    {counts?.solana ?? 0} / {counts?.base ?? 0}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Baseline snapshot</p>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                    Sol {baseline?.solanaPrice != null ? formatNumber(baseline.solanaPrice, { maxDecimals: 10 }) : '—'} · Base{' '}
                    {baseline?.basePrice != null ? formatNumber(baseline.basePrice, { maxDecimals: 10 }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Analysis running</p>
                  <p>{coords?.isAnalysisRunning ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last analysis</p>
                  <p>
                    {coords?.lastAnalysisTime
                      ? new Date(coords.lastAnalysisTime).toLocaleString()
                      : '—'}
                  </p>
                </div>
                {arbStats?.startedAt && (
                  <div className="sm:col-span-2 text-xs text-gray-500">
                    Session started: {new Date(arbStats.startedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Realtime price & balances</h3>
              <button
                type="button"
                onClick={() => void loadMarketSnapshot()}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Retry market fetch
              </button>
            </div>

            {(pricingError || balancesError || poolsError) && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300 space-y-1">
                {pricingError && <p>Pricing unavailable: {pricingError}</p>}
                {balancesError && <p>Balances unavailable: {balancesError}</p>}
                {poolsError && <p>Pools unavailable: {poolsError}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Solana token price</p>
                <p className="font-mono text-gray-900 dark:text-white">
                  {pricingData?.solana?.priceUsd != null ? formatCurrency(pricingData.solana.priceUsd) : '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Raw: {pricingData?.solana?.price != null ? formatNumber(pricingData.solana.price, { maxDecimals: 12 }) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Base token price</p>
                <p className="font-mono text-gray-900 dark:text-white">
                  {pricingData?.base?.priceUsd != null ? formatCurrency(pricingData.base.priceUsd) : '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Raw: {pricingData?.base?.price != null ? formatNumber(pricingData.base.price, { maxDecimals: 12 }) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Price diff</p>
                <p className={`font-medium ${
                  pricingData?.priceDifference?.percent != null && Math.abs(pricingData.priceDifference.percent) > 25
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {pricingData?.priceDifference?.percent != null
                    ? formatNumber(pricingData.priceDifference.percent, { suffix: '%' })
                    : '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  USD: {pricingData?.priceDifference?.absolute != null ? formatCurrency(pricingData.priceDifference.absolute) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Combined wallet value</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {balancesData?.combined?.totalUsd != null ? formatCurrency(balancesData.combined.totalUsd) : '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated: {pricingData?.timestamp != null ? new Date(pricingData.timestamp).toLocaleTimeString() : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Solana wallet</p>
                <div className="space-y-1 text-sm">
                  <p>SOL: <span className="font-mono">{balancesData?.solana?.sol != null ? formatNumber(balancesData.solana.sol, { maxDecimals: 6 }) : '—'}</span> ({balancesData?.solana?.solUsd != null ? formatCurrency(balancesData.solana.solUsd) : '—'})</p>
                  <p>Token: <span className="font-mono">{balancesData?.solana?.token != null ? formatNumber(balancesData.solana.token, { compact: true, maxDecimals: 4 }) : '—'}</span> ({balancesData?.solana?.tokenUsd != null ? formatCurrency(balancesData.solana.tokenUsd) : '—'})</p>
                  <p>Total: <span className="font-semibold">{balancesData?.solana?.totalUsd != null ? formatCurrency(balancesData.solana.totalUsd) : '—'}</span></p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Base wallet</p>
                <div className="space-y-1 text-sm">
                  <p>ETH: <span className="font-mono">{balancesData?.base?.eth != null ? formatNumber(balancesData.base.eth, { maxDecimals: 6 }) : '—'}</span> ({balancesData?.base?.ethUsd != null ? formatCurrency(balancesData.base.ethUsd) : '—'})</p>
                  <p>USDC: <span className="font-mono">{balancesData?.base?.usdc != null ? formatNumber(balancesData.base.usdc, { maxDecimals: 2 }) : '—'}</span></p>
                  <p>Token: <span className="font-mono">{balancesData?.base?.token != null ? formatNumber(balancesData.base.token, { compact: true, maxDecimals: 4 }) : '—'}</span></p>
                  <p>Total: <span className="font-semibold">{balancesData?.base?.totalUsd != null ? formatCurrency(balancesData.base.totalUsd) : '—'}</span></p>
                </div>
              </div>
            </div>

            {(!pricingData || !balancesData || !poolsData) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Some market sections are hidden because backend returns real-data errors (no mock fallback).
                Start/configure arb bot and use retry.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Solana pool (Pump.fun)</p>
                <div className="space-y-1 text-sm">
                  <p>Liquidity: {poolsData?.solana?.liquidityUsd != null ? formatCurrency(poolsData.solana.liquidityUsd) : '—'}</p>
                  <p>Virtual reserves: SOL {poolsData?.solana?.reserves?.virtual?.solFormatted != null ? formatNumber(poolsData.solana.reserves.virtual.solFormatted, { maxDecimals: 4 }) : '—'} / Token {poolsData?.solana?.reserves?.virtual?.tokensFormatted != null ? formatNumber(poolsData.solana.reserves.virtual.tokensFormatted, { compact: true, maxDecimals: 2 }) : '—'}</p>
                  <p>Real reserves: SOL {poolsData?.solana?.reserves?.real?.solFormatted != null ? formatNumber(poolsData.solana.reserves.real.solFormatted, { maxDecimals: 4 }) : '—'} / Token {poolsData?.solana?.reserves?.real?.tokensFormatted != null ? formatNumber(poolsData.solana.reserves.real.tokensFormatted, { compact: true, maxDecimals: 2 }) : '—'}</p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Base pool (Uniswap V2)</p>
                <div className="space-y-1 text-sm">
                  <p>Liquidity: {poolsData?.base?.liquidityUsd != null ? formatCurrency(poolsData.base.liquidityUsd) : '—'}</p>
                  <p>Reserves: USDC {poolsData?.base?.reserves?.usdcFormatted != null ? formatNumber(poolsData.base.reserves.usdcFormatted, { maxDecimals: 2 }) : '—'} / Token {poolsData?.base?.reserves?.tokensFormatted != null ? formatNumber(poolsData.base.reserves.tokensFormatted, { compact: true, maxDecimals: 2 }) : '—'}</p>
                  <p>Direction: <span className="font-medium">{poolsData?.comparison?.recommendedDirection ?? '—'}</span></p>
                  <p>Liquidity ratio: {poolsData?.comparison?.liquidityRatio != null ? formatNumber(poolsData.comparison.liquidityRatio, { maxDecimals: 2 }) : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Opportunity feed</h3>
            <button
              type="button"
              onClick={() => clearArbFeeds()}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Clear arb feeds
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">From SSE <code className="text-indigo-600 dark:text-indigo-400">arb:opportunity</code></p>
          <div className="max-h-80 overflow-y-auto space-y-2 text-sm">
            {opportunities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No opportunities in this session yet.</p>
            ) : (
              opportunities.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/80 dark:bg-gray-900/40"
                >
                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                    <span>{new Date(o.timestamp).toLocaleString()}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{o.direction ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {o.priceDifferencePercent != null && (
                      <span>Spread: {formatNumber(o.priceDifferencePercent, { suffix: '%' })}</span>
                    )}
                    {o.estimatedProfitUsd != null && (
                      <span>Est. profit: {formatCurrency(o.estimatedProfitUsd)}</span>
                    )}
                    {typeof o.raw.netProfitUsd === 'number' && (
                      <span>Net (sim): {formatCurrency(o.raw.netProfitUsd)}</span>
                    )}
                    <span className={o.executed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                      {o.executed ? 'Executed' : 'Not executed'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Executed arb trades</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">From SSE <code className="text-indigo-600 dark:text-indigo-400">arb:trade</code></p>
          <div className="max-h-80 overflow-y-auto space-y-2 text-sm">
            {trades.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No executed trades in this session yet.</p>
            ) : (
              trades.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/80 dark:bg-gray-900/40"
                >
                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                    <span>{new Date(t.timestamp).toLocaleString()}</span>
                    <span>{t.direction ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {t.netProfitUsd != null && <span>Net: {formatCurrency(t.netProfitUsd)}</span>}
                    {t.totalCostUsd != null && <span>Cost: {formatCurrency(t.totalCostUsd)}</span>}
                    {t.totalRevenueUsd != null && <span>Revenue: {formatCurrency(t.totalRevenueUsd)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <VolumeBotsPanel
        healthVolumeSol={health?.volumeSolana}
        healthVolumeBase={health?.volumeBase}
        solStatus={solVolumeStatus}
        baseStatus={baseVolumeStatus}
        solStats={solVolumeStats}
        baseStats={baseVolumeStats}
        solTrades={solVolumeTrades}
        baseTrades={baseVolumeTrades}
        volumeError={volumeError}
        onDismissVolumeError={() => setVolumeError(null)}
        startSolana={startSolanaVolume}
        stopSolana={stopSolanaVolume}
        startBase={startBaseVolume}
        stopBase={stopBaseVolume}
      />

      {confirmAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm live execution</h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Auto-execute will submit real trades using server-side wallets and funds. Only continue if you intend to run live
              execution.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                onClick={() => {
                  setConfirmAuto(null)
                  if (confirmAuto === 'start') {
                    setStartOverrides((o) => ({ ...o, AUTO_EXECUTE_TRADES: false }))
                  } else {
                    setForm((f) => ({ ...f, AUTO_EXECUTE_TRADES: false }))
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                onClick={() => {
                  if (confirmAuto) void confirmAutoExecute(confirmAuto)
                }}
              >
                I understand — enable auto-execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
