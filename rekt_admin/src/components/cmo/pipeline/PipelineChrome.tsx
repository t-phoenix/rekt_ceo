import type { ReactNode } from 'react'
import type { PipelineStep } from '../../../services/cmoApi'
import type { ActiveStepId } from '../../../hooks/useCmoPipeline'

const STATUS_STYLES: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-200',
  ready: 'bg-blue-900/40 text-blue-200',
  running: 'bg-amber-900/40 text-amber-200',
  needs_review: 'bg-indigo-900/40 text-indigo-200',
  done: 'bg-emerald-900/40 text-emerald-200',
  partial: 'bg-amber-900/40 text-amber-200',
  failed: 'bg-red-900/40 text-red-200',
}

const STEPS: { id: ActiveStepId; label: string }[] = [
  { id: 'brand', label: 'Brand' },
  { id: 'research', label: 'Research' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'content', label: 'Content' },
  { id: 'schedule', label: 'Schedule' },
]

export function StepRail({
  steps,
  activeStep,
  onSelect,
  stepLoading,
}: {
  steps: PipelineStep[]
  activeStep: ActiveStepId
  onSelect: (id: ActiveStepId) => void
  stepLoading: string | null
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map((s, i) => {
        const meta = steps.find((x) => x.id === s.id)
        const status = stepLoading === s.id ? 'running' : meta?.status || 'idle'
        const active = activeStep === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all min-w-[120px] ${
              active
                ? 'border-indigo-400 bg-gray-800 shadow-sm'
                : 'border-transparent bg-gray-800/50 hover:bg-gray-800'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
              {i + 1}
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-white">{s.label}</span>
              <span className={`inline-block mt-0.5 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[status] || STATUS_STYLES.idle}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => onSelect('history')}
        className={`px-3 py-2 rounded-xl text-sm font-medium ${
          activeStep === 'history'
            ? 'bg-gray-800 border border-indigo-400 text-indigo-300'
            : 'text-gray-300 hover:bg-gray-800'
        }`}
      >
        History
      </button>
    </div>
  )
}

export function PromptEditor({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="block text-xs text-gray-300 mt-0.5 mb-1.5">Edit before running — this feeds the next AI step</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={8}
        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm font-mono text-white disabled:opacity-50"
      />
    </label>
  )
}

export function ArtifactCard({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 text-white">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  )
}

export function PipelineProgress({
  stepLoading,
  mode,
}: {
  stepLoading: string | null
  mode: string
}) {
  if (!stepLoading) return null
  const labels: Record<string, string> = {
    wallet: 'Checking wallet / USDC on Base…',
    research: 'Running research (x402)…',
    'research-intel': 'Research: intel pack…',
    'research-competition': 'Research: competition…',
    'research-trends': 'Research: trends…',
    'research-kol': 'Research: KOL…',
    'research-topics': 'Research: topics / SEO…',
    'research-social': 'Research: social pulse…',
    'research-news': 'Research: news & events…',
    'research-finalize': 'Saving research into pipeline…',
    strategy: 'Generating strategy (x402)…',
    content: 'Building day content packages…',
    curate: 'Curating day angle…',
    select: 'Selecting meme template…',
    brandify: 'Auto-brandifying meme…',
    'brandify-vision': 'Analyzing meme for branding options…',
    'brandify-generate': 'Generating branded meme from your choices…',
    caption: 'Writing captions…',
    compose: 'Composing draft…',
    schedule: 'Scheduling…',
  }
  return (
    <div className="flex items-center gap-3 text-sm text-white bg-indigo-900/30 border border-indigo-800/40 rounded-lg px-4 py-3">
      <span className="inline-block h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <span>{labels[stepLoading] || `Working: ${stepLoading}…`}{mode === 'auto' ? ' (auto pipeline)' : ''}</span>
    </div>
  )
}
