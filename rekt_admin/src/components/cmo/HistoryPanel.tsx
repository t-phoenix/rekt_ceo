import { useState } from 'react'
import type { ContentItem, PipelineRun, StrategyRun } from '../../services/cmoApi'
import { ArtifactView } from './ArtifactView'

type Tab = 'pipelines' | 'runs' | 'drafts'

const btn =
  'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border border-gray-500 text-white hover:bg-gray-700 disabled:opacity-50'
const btnPrimary =
  'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'

function stepSummary(p: PipelineRun) {
  const parts = (p.steps || []).map((s) => `${s.id}:${s.status}`)
  return parts.join(' · ')
}

export function HistoryPanel({
  pipelines,
  runs,
  drafts,
  loading,
  activePipelineId,
  onOpenPipeline,
  onRerunResearch,
  onGoToStep,
}: {
  pipelines: PipelineRun[]
  runs: StrategyRun[]
  drafts: ContentItem[]
  loading: boolean
  activePipelineId?: string | null
  onOpenPipeline: (id: string) => void
  onRerunResearch: (run: StrategyRun) => void
  onGoToStep: (step: 'research' | 'strategy' | 'content' | 'schedule', pipelineId?: string) => void
}) {
  const [tab, setTab] = useState<Tab>('pipelines')
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 text-white space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Saved workshop history</h3>
        <p className="text-xs text-gray-300">
          Pipelines, paid runs, and drafts stay in the database. Open a pipeline to continue, or re-run a research hop.
        </p>
      </div>

      <div className="inline-flex rounded-lg bg-gray-900 p-1 gap-1">
        {([
          ['pipelines', `Pipelines (${pipelines.length})`],
          ['runs', `Runs (${runs.length})`],
          ['drafts', `Drafts (${drafts.length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${
              tab === id ? 'bg-gray-700 text-indigo-300' : 'text-gray-300'
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-300">Loading…</p>}

      {!loading && tab === 'pipelines' && (
        <div className="space-y-2 max-h-[32rem] overflow-auto">
          {pipelines.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-600 bg-gray-900/50 px-3 py-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-indigo-300">{p.id.slice(0, 8)}</span>
                <span className="text-xs text-gray-300">{p.status}</span>
                <span className="text-xs text-gray-400 capitalize">{p.mode}</span>
                {activePipelineId === p.id && (
                  <span className="text-[10px] uppercase font-bold text-emerald-300">active</span>
                )}
                {p.updated_at && (
                  <span className="text-xs text-gray-500 ml-auto">{new Date(p.updated_at).toLocaleString()}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate">{stepSummary(p)}</p>
              <p className="text-[11px] text-gray-500">
                research: {p.outputs?.research ? 'yes' : '—'}
                {' · '}
                ideas: {Array.isArray(p.outputs?.strategy?.post_ideas) ? p.outputs.strategy.post_ideas.length : 0}
                {' · '}
                drafts: {p.outputs?.contentIds?.length || p.outputs?.contentItems?.length || 0}
                {p.metadata && Object.keys(p.metadata).length > 0 ? ' · has metadata' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={() => onOpenPipeline(p.id)}>
                  Open pipeline
                </button>
                <button type="button" className={btn} onClick={() => onGoToStep('research', p.id)}>Research</button>
                <button type="button" className={btn} onClick={() => onGoToStep('strategy', p.id)}>Strategy</button>
                <button type="button" className={btn} onClick={() => onGoToStep('content', p.id)}>Content</button>
                <button type="button" className={btn} onClick={() => onGoToStep('schedule', p.id)}>Schedule</button>
              </div>
            </div>
          ))}
          {!pipelines.length && (
            <p className="text-sm text-gray-300 text-center py-8">No pipelines stored yet.</p>
          )}
        </div>
      )}

      {!loading && tab === 'runs' && (
        <div className="space-y-2 max-h-[32rem] overflow-auto">
          {runs.map((r) => {
            const open = openId === r.id
            return (
              <div key={r.id} className="rounded-lg border border-gray-600 bg-gray-900/50 overflow-hidden">
                <div className="px-3 py-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="text-left flex flex-wrap items-center gap-2 flex-1 min-w-0"
                    onClick={() => setOpenId(open ? null : r.id)}
                  >
                    <span className="font-semibold text-white text-sm">{r.type}</span>
                    <span className="text-xs text-gray-300">{r.status || 'success'}</span>
                    {r.pipeline_run_id && (
                      <span className="font-mono text-[10px] text-indigo-300" title={r.pipeline_run_id}>
                        pipe:{r.pipeline_run_id.slice(0, 8)}
                      </span>
                    )}
                    {r.created_at && (
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                    )}
                    {r.x402_price_usd != null && (
                      <span className="text-xs text-emerald-300">${Number(r.x402_price_usd).toFixed(2)}</span>
                    )}
                  </button>
                  {r.pipeline_run_id && (
                    <button
                      type="button"
                      className={btn}
                      onClick={() => onOpenPipeline(r.pipeline_run_id!)}
                    >
                      Open pipe
                    </button>
                  )}
                  <button type="button" className={btn} onClick={() => onRerunResearch(r)}>
                    Re-run
                  </button>
                </div>
                {open && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-700 pt-3">
                    {r.error_message && <p className="text-sm text-red-300">{r.error_message}</p>}
                    {r.metadata && Object.keys(r.metadata).length > 0 && (
                      <ArtifactView title="Metadata" data={r.metadata} />
                    )}
                    {r.input != null && <ArtifactView title="Input" data={r.input} />}
                    {r.output != null && <ArtifactView title="Output" data={r.output} />}
                  </div>
                )}
              </div>
            )
          })}
          {!runs.length && (
            <p className="text-sm text-gray-300 text-center py-8">No research/strategy runs yet.</p>
          )}
        </div>
      )}

      {!loading && tab === 'drafts' && (
        <div className="space-y-2 max-h-[32rem] overflow-auto">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-lg border border-gray-600 bg-gray-900/50 px-3 py-2 space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                <span className="text-white font-medium">
                  Day {String(d.metadata?.suggested_day ?? '—')}
                </span>
                <span>{d.status}</span>
                {d.pipeline_run_id && (
                  <span className="font-mono text-indigo-300">{d.pipeline_run_id.slice(0, 8)}</span>
                )}
                {d.updated_at && (
                  <span className="ml-auto text-gray-500">{new Date(d.updated_at).toLocaleString()}</span>
                )}
              </div>
              {d.media_url && (
                <img src={d.media_url} alt="" className="max-h-24 rounded border border-gray-600" />
              )}
              <p className="text-sm text-white line-clamp-3">{d.body_text || 'No body yet'}</p>
              {d.pipeline_run_id && (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => onGoToStep('content', d.pipeline_run_id!)}
                >
                  Open in Content
                </button>
              )}
            </div>
          ))}
          {!drafts.length && (
            <p className="text-sm text-gray-300 text-center py-8">No content drafts stored yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
