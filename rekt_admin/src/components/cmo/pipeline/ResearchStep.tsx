import type { ResearchConfig } from '../../../services/cmoApi'
import { ArtifactSection } from '../ArtifactView'

export const inputCls =
  'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/40'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-500 text-white hover:bg-gray-700 disabled:opacity-50'

export function ResearchStep({
  config,
  onChange,
  onRun,
  onApprove,
  loading,
  researchDone,
  researchOutput,
  estimatedCost,
  mode,
}: {
  config: ResearchConfig
  onChange: (c: Partial<ResearchConfig>) => void
  onRun: () => void
  onApprove: () => void
  loading: boolean
  researchDone: boolean
  researchOutput: Record<string, unknown> | undefined
  estimatedCost: number
  mode: string
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-4 text-white">
        <div>
          <h3 className="text-sm font-semibold text-white">Research inputs</h3>
          <p className="text-xs text-gray-300 mt-0.5">
            Outputs feed Strategy. Est. pipeline cost ~${estimatedCost.toFixed(2)} USDC.
          </p>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-white">Handles</span>
          <input
            className={`${inputCls} mt-1`}
            value={(config.handles || []).join(', ')}
            onChange={(e) =>
              onChange({
                handles: e.target.value.split(',').map((h) => h.trim()).filter(Boolean),
              })
            }
            placeholder="rekt_ceo, competitor"
            disabled={loading}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-white">Topic</span>
          <input
            className={`${inputCls} mt-1`}
            value={config.topic || ''}
            onChange={(e) => onChange({ topic: e.target.value })}
            disabled={loading}
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-white">
          {([
            ['includeCompetition', 'Competition'],
            ['includeTrends', 'Trends'],
            ['includeKol', 'KOL'],
            ['includeTopics', 'Topics / SEO-GEO'],
            ['includeSocialPulse', 'Social pulse'],
            ['includeNewsEvents', 'News / events'],
            ['includeIntelPack', 'Intel pack (all-in-one)'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(config[key])}
                onChange={(e) => onChange({ [key]: e.target.checked })}
                disabled={loading}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={loading} onClick={onRun}>
            {researchDone ? 'Re-run research' : 'Run research'}
          </button>
          {researchDone && mode === 'manual' && (
            <button type="button" className={btnSecondary} disabled={loading} onClick={onApprove}>
              Approve & continue →
            </button>
          )}
        </div>
      </div>

      {researchOutput && (
        <div className="space-y-3">
          <ArtifactSection title="Intel pack" data={researchOutput.intel} />
          <ArtifactSection title="Topics / keywords" data={researchOutput.topics || {
            seo_keywords: researchOutput.seo_keywords,
            geo_keywords: researchOutput.geo_keywords,
          }} />
          <ArtifactSection title="News / events" data={researchOutput.news} />
          <ArtifactSection title="Social pulse" data={researchOutput.social} />
          <ArtifactSection title="Competition" data={researchOutput.competition} />
          <ArtifactSection title="Trends" data={researchOutput.trends} />
          <ArtifactSection title="KOL" data={researchOutput.kol} />
          {!researchOutput.competition && !researchOutput.trends && !researchOutput.kol
            && !researchOutput.intel && !researchOutput.topics && !researchOutput.news && !researchOutput.social && (
            <ArtifactSection title="Research artifact" data={researchOutput} />
          )}
        </div>
      )}
    </div>
  )
}
