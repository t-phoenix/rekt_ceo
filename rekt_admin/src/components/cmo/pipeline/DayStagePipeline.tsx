import { useEffect, useMemo, useState } from 'react'
import { cmoApi, type ContentItem, type ContentPrompt, type StrategyRun } from '../../../services/cmoApi'
import { ArtifactView } from '../ArtifactView'
import { btnPrimary, btnSecondary, inputCls } from './ResearchStep'
import { BrandifyCuratePanel } from './BrandifyCuratePanel'
import { CaptionCuratePanel } from './CaptionCuratePanel'
import { MemeCaptionPreview } from './MemeCaptionPreview'
import { TemplateLibraryPicker, templateImageUrl } from './TemplateLibraryPicker'

export type StageKey = 'curate' | 'select' | 'brandify' | 'caption' | 'compose'

type StageMeta = {
  status?: string
  at?: string
  ideate?: Record<string, unknown>
  template?: Record<string, unknown>
  top_text?: string
  bottom_text?: string
  run_id?: string
  sessionId?: string
  engineUsed?: string
  media_url?: string
  body_preview?: string
  [key: string]: unknown
}

const STAGE_DEFS: {
  key: StageKey
  metaKey: string
  runTypes: string[]
  n: number
  label: string
  hint: string
}[] = [
  {
    key: 'curate',
    metaKey: 'curate',
    runTypes: ['content_stage_curate', 'content_day_ideate'],
    n: 1,
    label: 'Curate',
    hint: 'Bold hook → story/news → product CTA (schedule-ready)',
  },
  {
    key: 'select',
    metaKey: 'select_template',
    runTypes: ['content_stage_select_template'],
    n: 2,
    label: 'Template',
    hint: 'Pick / override meme template',
  },
  {
    key: 'brandify',
    metaKey: 'brandify',
    runTypes: ['content_stage_brandify'],
    n: 3,
    label: 'Brandify',
    hint: 'Generate branded meme image',
  },
  {
    key: 'caption',
    metaKey: 'caption',
    runTypes: ['content_stage_caption'],
    n: 4,
    label: 'Caption',
    hint: 'Top / bottom meme text',
  },
  {
    key: 'compose',
    metaKey: 'compose',
    runTypes: ['content_day_package'],
    n: 5,
    label: 'Compose',
    hint: 'Assemble tweet body + save draft',
  },
]

function RerunFeedbackField({
  label,
  disabled,
  onRerun,
}: {
  label: string
  disabled?: boolean
  onRerun: (feedback: string) => void
}) {
  const [text, setText] = useState('')
  return (
    <div className="rounded-md border border-amber-800/40 bg-amber-950/20 p-2 space-y-2">
      <p className="text-[11px] text-amber-100 font-medium">{label}</p>
      <textarea
        className={`${inputCls} text-xs`}
        rows={2}
        value={text}
        disabled={disabled}
        placeholder="What was wrong? e.g. too corporate / wrong CTA / angle already used"
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className={btnSecondary}
        disabled={disabled || !text.trim()}
        onClick={() => onRerun(text.trim())}
      >
        Re-run with this feedback
      </button>
    </div>
  )
}

function formatUsd(n: number) {
  return n <= 0 ? 'free' : `$${n.toFixed(2)}`
}

function stageDone(stages: Record<string, StageMeta>, metaKey: string) {
  return stages[metaKey]?.status === 'done'
}

/** Prefer day-prompt override; fall back to saved item only when prompt has no templateId yet. */
function resolveDraftTemplateId(
  promptTemplateId: string | null | undefined,
  item?: ContentItem | null,
): string {
  if (promptTemplateId === null) return ''
  if (typeof promptTemplateId === 'string') return promptTemplateId
  return String(item?.meme_template_id || item?.metadata?.templateId || '')
}

export function chainPriceFrom(
  from: StageKey,
  prices: {
    curate: number
    selectTemplate: number
    brandify: number
    brandifyVision?: number
    brandifyGenerate?: number
    caption: number
  },
) {
  const order: StageKey[] = ['curate', 'select', 'brandify', 'caption', 'compose']
  const start = order.indexOf(from)
  const brandifyCost = (prices.brandifyVision ?? 0.19) + (prices.brandifyGenerate ?? 0.29)
  const map: Record<StageKey, number> = {
    curate: prices.curate,
    select: prices.selectTemplate,
    brandify: brandifyCost || prices.brandify,
    caption: prices.caption,
    compose: 0,
  }
  return order.slice(Math.max(0, start)).reduce((sum, k) => sum + map[k], 0)
}

function StageOutputPreview({
  stageKey,
  meta,
  ideate,
  item,
}: {
  stageKey: StageKey
  meta?: StageMeta
  ideate: Record<string, unknown>
  item?: ContentItem | null
}) {
  if (stageKey === 'curate') {
    const data = (meta?.ideate || ideate || {}) as Record<string, unknown>
    if (!Object.keys(data).length) {
      return <p className="text-xs text-gray-500">No curate output yet.</p>
    }
    const scheduleBody = String(data.schedule_body || '')
    return (
      <div className="rounded-md border border-gray-700 bg-gray-950/60 p-2 space-y-2 text-xs text-gray-200">
        {data.hook != null && (
          <p className="text-sm font-bold text-white tracking-tight">{String(data.hook)}</p>
        )}
        {data.story_body != null && (
          <p className="whitespace-pre-wrap text-gray-300">{String(data.story_body)}</p>
        )}
        {(data.cta_line != null || data.cta_label != null) && (
          <p className="text-indigo-300">
            <span className="text-gray-500">CTA:</span>{' '}
            {String(data.cta_line || `${String(data.cta_label || '')} → ${String(data.cta_url || '')}`)}
          </p>
        )}
        {data.news_anchor != null && (
          <p><span className="text-gray-500">News/trend:</span> {String(data.news_anchor)}</p>
        )}
        {data.value_point != null && (
          <p><span className="text-gray-500">Value:</span> {String(data.value_point)}</p>
        )}
        {data.product != null && (
          <p><span className="text-gray-500">Product:</span> {String(data.product)}</p>
        )}
        {data.visual_concept != null && (
          <p><span className="text-gray-500">Visual:</span> {String(data.visual_concept)}</p>
        )}
        {data.template_category != null && (
          <p><span className="text-gray-500">Category hint:</span> {String(data.template_category)}</p>
        )}
        {Array.isArray(data.hashtags) && data.hashtags.length > 0 && (
          <p><span className="text-gray-500">Tags:</span> {(data.hashtags as string[]).join(' ')}</p>
        )}
        {scheduleBody && (
          <div className="mt-1 rounded border border-emerald-800/40 bg-emerald-950/20 p-2">
            <p className="text-[10px] uppercase font-semibold text-emerald-300 mb-1">Schedule-ready</p>
            <pre className="whitespace-pre-wrap text-[11px] text-gray-200 font-sans">{scheduleBody}</pre>
          </div>
        )}
      </div>
    )
  }

  if (stageKey === 'select') {
    const tpl = (meta?.template || {}) as Record<string, unknown>
    const id = String(tpl.id || item?.meme_template_id || item?.metadata?.templateId || '—')
    const name = String(tpl.name || '')
    const cat = String(tpl.category || item?.metadata?.templateCategory || '—')
    return (
      <div className="rounded-md border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-200 space-y-1">
        <p><span className="text-gray-400">Template:</span> <span className="font-mono text-indigo-300">{id}</span></p>
        {name && <p><span className="text-gray-400">Name:</span> {name}</p>}
        <p><span className="text-gray-400">Category:</span> {cat}</p>
      </div>
    )
  }

  if (stageKey === 'brandify') {
    const url = String(meta?.media_url || item?.media_url || '')
    const outputs = Array.isArray(item?.metadata?.brandify_outputs)
      ? (item?.metadata?.brandify_outputs as Array<{ id?: string; status?: string; isCurrent?: boolean; mediaUrl?: string }>)
      : []
    const status = String(meta?.status || '')
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded border border-gray-700 px-1.5 py-0.5 text-gray-300">
            status: {status || '—'}
          </span>
          <span className="rounded border border-gray-700 px-1.5 py-0.5 text-gray-300">
            {outputs.length} saved output{outputs.length === 1 ? '' : 's'}
          </span>
          {meta?.outputId != null && (
            <span className="rounded border border-gray-700 px-1.5 py-0.5 font-mono text-indigo-300">
              {String(meta.outputId).slice(0, 8)}
            </span>
          )}
        </div>
        {url ? (
          <img src={url} alt="Brandify output" className="max-h-40 rounded-md border border-gray-600" />
        ) : (
          <p className="text-xs text-gray-500">No current image yet.</p>
        )}
        <p className="text-[10px] text-gray-400">
          engine: {String(meta?.engineUsed || item?.metadata?.brandify_engine || '—')}
        </p>
        {outputs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {outputs.slice(0, 8).map((o, idx) => (
              <span
                key={o.id || `out-${idx}`}
                className={`text-[9px] uppercase font-bold px-1 py-0.5 rounded border ${
                  o.isCurrent
                    ? 'border-emerald-600 text-emerald-200'
                    : 'border-gray-700 text-gray-400'
                }`}
              >
                {o.status || '?'}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (stageKey === 'caption') {
    const top = String(meta?.top_text ?? item?.metadata?.top_text ?? '')
    const bottom = String(meta?.bottom_text ?? item?.metadata?.bottom_text ?? '')
    const url = String(item?.media_url || '')
    if (!top && !bottom && !url) return <p className="text-xs text-gray-500">No caption yet.</p>
    if (url) {
      return (
        <MemeCaptionPreview
          imageUrl={url}
          topText={top}
          bottomText={bottom}
          maxHeightClass="max-h-48"
        />
      )
    }
    return (
      <div className="rounded-md border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-200 space-y-1">
        <p><span className="text-gray-400">Top:</span> {top || '—'}</p>
        <p><span className="text-gray-400">Bottom:</span> {bottom || '—'}</p>
      </div>
    )
  }

  if (stageKey === 'compose') {
    const url = String(item?.media_url || '')
    const top = String(item?.metadata?.top_text || meta?.top_text || '')
    const bottom = String(item?.metadata?.bottom_text || meta?.bottom_text || '')
    const body = String(item?.body_text || meta?.body_preview || '')
    return (
      <div className="space-y-2">
        {url && (
          <MemeCaptionPreview
            imageUrl={url}
            topText={top}
            bottomText={bottom}
            maxHeightClass="max-h-48"
          />
        )}
        {body ? (
          <div className="rounded-md border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-200 whitespace-pre-wrap line-clamp-6">
            {body}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No draft body yet.</p>
        )}
      </div>
    )
  }

  const body = String(item?.body_text || meta?.body_preview || '')
  if (!body) return <p className="text-xs text-gray-500">No draft body yet.</p>
  return (
    <div className="rounded-md border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-200 whitespace-pre-wrap line-clamp-6">
      {body}
    </div>
  )
}

function StageHistoryList({
  entries,
  linkedRuns,
}: {
  entries: StageMeta[]
  linkedRuns: StrategyRun[]
}) {
  const [show, setShow] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)
  if (!entries.length && !linkedRuns.length) return null

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="text-[11px] text-indigo-300 hover:underline"
        onClick={() => setShow((v) => !v)}
      >
        {show ? 'Hide' : 'Show'} run history ({Math.max(entries.length, linkedRuns.length)})
      </button>
      {show && (
        <ul className="space-y-2 max-h-64 overflow-auto">
          {entries.map((entry, i) => {
            const runId = String(entry.strategy_run_id || entry.run_id || '')
            const linked = linkedRuns.find((r) => r.id === runId)
            const key = runId || `hist-${i}`
            const open = openRun === key
            return (
              <li key={key} className="rounded border border-gray-700 bg-black/30 p-2 text-[11px] text-gray-300">
                <button
                  type="button"
                  className="w-full text-left flex flex-wrap gap-2"
                  onClick={() => setOpenRun(open ? null : key)}
                >
                  <span className="text-white font-medium">#{entries.length - i}</span>
                  {entry.at && <span>{new Date(String(entry.at)).toLocaleString()}</span>}
                  {entry.media_url != null && <span className="text-emerald-300">has image</span>}
                  {runId && <span className="font-mono text-indigo-300">{runId.slice(0, 8)}</span>}
                </button>
                {open && (
                  <div className="mt-2 space-y-2">
                    {entry.media_url != null && (
                      <img src={String(entry.media_url)} alt="" className="max-h-28 rounded border border-gray-600" />
                    )}
                    <ArtifactView title="Stored output" data={entry} />
                    {linked?.input != null && <ArtifactView title="Run input" data={linked.input} />}
                    {linked?.output != null && <ArtifactView title="Run output" data={linked.output} />}
                  </div>
                )}
              </li>
            )
          })}
          {!entries.length && linkedRuns.map((r) => (
            <li key={r.id} className="rounded border border-gray-700 bg-black/30 p-2 text-[11px]">
              <p className="text-gray-300">{r.type} · {r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
              {r.output != null && <ArtifactView title="Output" data={r.output} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LearnFromEditButton({
  stage,
  original,
  edited,
  pipelineRunId,
  featureId,
  disabled,
}: {
  stage: StageKey
  original: string
  edited: string
  pipelineRunId?: string | null
  featureId?: string | null
  disabled?: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle')
  const dirty = edited.trim() && edited.trim() !== (original || '').trim()

  if (!dirty) return null

  return (
    <button
      type="button"
      className={btnSecondary}
      disabled={disabled || status === 'saving'}
      onClick={() => {
        setStatus('saving')
        void cmoApi
          .createPromptMemory({
            stage,
            original_prompt: original || undefined,
            edited_prompt: edited,
            accepted: true,
            pipeline_run_id: pipelineRunId || undefined,
            feature_id: featureId || undefined,
            diff_notes: 'Operator learned edit from day stage UI',
          })
          .then(() => setStatus('saved'))
          .catch(() => setStatus('err'))
      }}
    >
      {status === 'saved' ? 'Learned ✓' : status === 'err' ? 'Learn failed' : 'Learn from this edit'}
    </button>
  )
}

export function DayStagePipeline({
  prompt,
  item,
  loading,
  activeStage,
  stagePrices,
  stageRuns = [],
  pipelineId,
  onRunStage,
  onRunFromStage,
  onSaveEdits,
  onPromptChange,
  onBrandifyAnalyze,
  onBrandifyGenerate,
  onBrandifyAuto,
  onBrandifySetCurrent,
  onBrandifySaveDraft,
  onBrandifyRefresh,
  onScheduleDay,
}: {
  prompt: ContentPrompt
  item?: ContentItem | null
  loading: boolean
  activeStage?: StageKey | null
  stagePrices: {
    curate: number
    selectTemplate: number
    brandify: number
    brandifyVision: number
    brandifyGenerate: number
    caption: number
  }
  stageRuns?: StrategyRun[]
  pipelineId?: string | null
  onRunStage: (stage: StageKey, opts?: { feedback?: string }) => void
  onRunFromStage: (from: StageKey) => void
  onSaveEdits: (patch: {
    ideate?: Record<string, unknown>
    templateId?: string | null
    top_text?: string
    bottom_text?: string
    body_text?: string
    intensity?: string
    audience?: string
    caption_option?: Record<string, unknown> | null
  }) => Promise<void> | void
  onPromptChange?: (patch: Partial<ContentPrompt>) => void
  onBrandifyAnalyze?: (opts?: {
    customTarget?: string
    feedback?: string
    templateId?: string | null
  }) => Promise<void>
  onBrandifyGenerate?: (
    choices: { element: string; idea: string; isCustom?: boolean }[],
    opts?: { feedback?: string; outputId?: string },
  ) => Promise<void>
  onBrandifyAuto?: (opts?: { feedback?: string; templateId?: string | null }) => Promise<void>
  onBrandifySetCurrent?: (outputId: string) => Promise<void>
  onBrandifySaveDraft?: (draft: {
    selections: Record<string, string>
    customs: Record<string, string>
    customTarget?: string
    feedback?: string
    outputId?: string
    templates?: Array<{ id: string; name?: string; category?: string; addedAt?: string }>
    activeTemplateId?: string | null
  }) => Promise<unknown> | void
  onBrandifyRefresh?: () => Promise<unknown>
  onScheduleDay?: (scheduledAt: string) => Promise<void> | void
}) {
  const stages = (item?.metadata?.stages || {}) as Record<string, StageMeta>
  const stageHistory = (item?.metadata?.stage_history || {}) as Record<string, StageMeta[]>
  const ideate = (item?.metadata?.ideate || stages.curate?.ideate || {}) as Record<string, unknown>
  const [open, setOpen] = useState<StageKey>(activeStage || 'curate')
  const [visualConcept, setVisualConcept] = useState(String(ideate.visual_concept || ''))
  const [tweetAngle, setTweetAngle] = useState(String(ideate.tweet_angle || ideate.caption_context || ''))
  const [hook, setHook] = useState(String(ideate.hook || ''))
  const [storyBody, setStoryBody] = useState(String(ideate.story_body || ''))
  const [ctaLabel, setCtaLabel] = useState(String(ideate.cta_label || ''))
  const [ctaUrl, setCtaUrl] = useState(String(ideate.cta_url || ''))
  const [ctaTemplateId, setCtaTemplateId] = useState(String(ideate.cta_template_id || 'direct'))
  const [hashtagsEdit, setHashtagsEdit] = useState(
    Array.isArray(ideate.hashtags) ? (ideate.hashtags as string[]).join(' ') : '',
  )
  const [templateId, setTemplateId] = useState(() =>
    resolveDraftTemplateId(prompt.templateId, item),
  )
  const [topText, setTopText] = useState(String(item?.metadata?.top_text || stages.caption?.top_text || ''))
  const [bottomText, setBottomText] = useState(String(item?.metadata?.bottom_text || stages.caption?.bottom_text || ''))
  const [bodyText, setBodyText] = useState(String(item?.body_text || ''))
  const [stagePromptDrafts, setStagePromptDrafts] = useState<Record<StageKey, string>>({
    curate: prompt.stagePrompts?.curate || prompt.promptEditable || prompt.autoPrompt || '',
    select: prompt.stagePrompts?.select || 'Prefer templates that match the visual concept and intensity.',
    brandify: prompt.stagePrompts?.brandify || 'Keep brand marks subtle; prioritize meme readability.',
    caption: prompt.stagePrompts?.caption || 'Punchy top/bottom; no like/share bait.',
    compose: prompt.stagePrompts?.compose || 'Weave CTA naturally; CT-native voice.',
  })

  useEffect(() => {
    if (activeStage) setOpen(activeStage)
  }, [activeStage])

  useEffect(() => {
    const nextIdeate = (item?.metadata?.ideate || stages.curate?.ideate || {}) as Record<string, unknown>
    setVisualConcept(String(nextIdeate.visual_concept || ''))
    setTweetAngle(String(nextIdeate.tweet_angle || nextIdeate.caption_context || ''))
    setHook(String(nextIdeate.hook || ''))
    setStoryBody(String(nextIdeate.story_body || ''))
    setCtaLabel(String(nextIdeate.cta_label || ''))
    setCtaUrl(String(nextIdeate.cta_url || ''))
    setCtaTemplateId(String(nextIdeate.cta_template_id || 'direct'))
    setHashtagsEdit(
      Array.isArray(nextIdeate.hashtags) ? (nextIdeate.hashtags as string[]).join(' ') : '',
    )
    // Prompt override must win — otherwise saved meme_template_id reverts every picker change.
    setTemplateId(resolveDraftTemplateId(prompt.templateId, item))
    setTopText(String(item?.metadata?.top_text || stages.caption?.top_text || ''))
    setBottomText(String(item?.metadata?.bottom_text || stages.caption?.bottom_text || ''))
    setBodyText(String(item?.body_text || ''))
    setStagePromptDrafts((prev) => ({
      ...prev,
      curate: prompt.stagePrompts?.curate || prompt.promptEditable || prompt.autoPrompt || prev.curate,
      select: prompt.stagePrompts?.select || prev.select,
      brandify: prompt.stagePrompts?.brandify || prev.brandify,
      caption: prompt.stagePrompts?.caption || prev.caption,
      compose: prompt.stagePrompts?.compose || prev.compose,
    }))
  }, [
    item?.id,
    item?.updated_at,
    item?.body_text,
    item?.media_url,
    item?.meme_template_id,
    item?.metadata?.templateId,
    item?.metadata?.top_text,
    item?.metadata?.bottom_text,
    item?.metadata?.ideate,
    prompt.templateId,
    prompt.promptEditable,
    prompt.autoPrompt,
    prompt.stagePrompts,
    stages.curate,
    stages.caption,
  ])

  const nextIncomplete = useMemo(() => {
    for (const s of STAGE_DEFS) {
      if (!stageDone(stages, s.metaKey)) return s.key
    }
    return null
  }, [stages])

  const priceOf = (key: StageKey) => {
    if (key === 'curate') return stagePrices.curate
    if (key === 'select') return stagePrices.selectTemplate
    if (key === 'brandify') {
      return (stagePrices.brandifyVision || 0) + (stagePrices.brandifyGenerate || 0) || stagePrices.brandify
    }
    if (key === 'caption') return stagePrices.caption
    return 0
  }

  const brandifyDone = stageDone(stages, 'brandify')
    && String(stages.brandify?.status || '') === 'done'
    && Boolean(item?.media_url || stages.brandify?.media_url)
  const brandifyProcessing = String(stages.brandify?.status || '') === 'processing'
  const brandifyFailed = String(stages.brandify?.status || '') === 'failed'
  const brandifyIncomplete = String(stages.brandify?.status || '') === 'incomplete'

  const templatePreviewUrl = (() => {
    const id = templateId || resolveDraftTemplateId(prompt.templateId, item)
    if (!id) return null
    return templateImageUrl(id)
  })()

  const runsFor = (def: (typeof STAGE_DEFS)[number]) =>
    stageRuns.filter((r) => {
      const types = def.key === 'brandify'
        ? [...def.runTypes, 'content_stage_brandify_vision', 'content_stage_brandify_generate']
        : def.runTypes
      if (!types.includes(r.type)) return false
      const input = (r.input || {}) as Record<string, unknown>
      if (input.ideaIndex == null) return true
      return Number(input.ideaIndex) === Number(prompt.ideaIndex)
    })

  const updateStagePrompt = (key: StageKey, value: string) => {
    setStagePromptDrafts((prev) => ({ ...prev, [key]: value }))
    const stagePrompts = { ...(prompt.stagePrompts || {}), [key]: value }
    if (key === 'curate') {
      onPromptChange?.({ promptEditable: value, stagePrompts })
    } else {
      onPromptChange?.({ stagePrompts })
    }
  }

  const originalFor = (key: StageKey) => {
    if (key === 'curate') return prompt.autoPrompt || ''
    return prompt.stagePrompts?.[key] || stagePromptDrafts[key] || ''
  }

  const activeDef = STAGE_DEFS.find((s) => s.key === open) || STAGE_DEFS[0]
  const meta = stages[activeDef.metaKey]
  const hist = stageHistory[activeDef.metaKey] || []
  const linked = runsFor(activeDef)
  const done = activeDef.key === 'brandify' ? brandifyDone : stageDone(stages, activeDef.metaKey)
  const featureId = prompt.featureIds?.[0] || null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-gray-300 flex-1">
          Stage rail · one panel at a time · prompt editable on every step
        </p>
        {nextIncomplete && (
          <button
            type="button"
            className={btnPrimary}
            disabled={loading}
            onClick={() => onRunFromStage(nextIncomplete)}
          >
            Continue from {nextIncomplete} ({formatUsd(chainPriceFrom(nextIncomplete, stagePrices))})
          </button>
        )}
      </div>

      {/* Horizontal progress rail */}
      <div className="flex flex-wrap gap-1.5">
        {STAGE_DEFS.map((s) => {
          const sDone = s.key === 'brandify'
            ? brandifyDone
            : stageDone(stages, s.metaKey)
          const needsCurate = s.key === 'brandify'
            && String(stages.brandify?.status || '') === 'needs_curation'
          const processing = s.key === 'brandify' && brandifyProcessing
          const failed = s.key === 'brandify' && brandifyFailed
          const incomplete = s.key === 'brandify' && brandifyIncomplete
          const active = open === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setOpen(s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors min-w-[88px] ${
                active
                  ? 'border-indigo-400 bg-indigo-950/40'
                  : sDone
                    ? 'border-emerald-700/50 bg-emerald-950/20'
                    : failed
                      ? 'border-red-700/50 bg-red-950/20'
                      : processing
                        ? 'border-indigo-600/50 bg-indigo-950/20'
                        : incomplete
                          ? 'border-orange-600/50 bg-orange-950/20'
                          : needsCurate
                            ? 'border-amber-600/50 bg-amber-950/20'
                            : 'border-gray-600 bg-gray-900/40'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                sDone
                  ? 'bg-emerald-600 text-white'
                  : failed
                    ? 'bg-red-600 text-white'
                    : processing
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : incomplete
                        ? 'bg-orange-600 text-white'
                        : needsCurate
                          ? 'bg-amber-600 text-white'
                          : active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-700 text-gray-200'
              }`}>
                {s.n}
              </span>
              <span className="text-xs font-semibold text-white">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Single expanded stage panel */}
      <div className={`rounded-lg border ${done ? 'border-emerald-700/60' : 'border-gray-600'} bg-gray-900/50 overflow-hidden`}>
        <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">
            {activeDef.n}. {activeDef.label}{done ? ' ✓' : ''}
          </span>
          <span className="text-[10px] text-gray-400">{formatUsd(priceOf(activeDef.key))}</span>
          <span className="text-[10px] text-gray-500 flex-1">{activeDef.hint}</span>
          {activeDef.key === 'brandify' && onBrandifyAnalyze ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={loading}
              onClick={() => void onBrandifyAnalyze({ templateId: templateId || null })}
            >
              {done || item?.brandify_session_id ? 'Re-analyze' : 'Analyze'} (${stagePrices.brandifyVision.toFixed(2)})
            </button>
          ) : activeDef.key !== 'caption' ? (
            <button type="button" className={btnSecondary} disabled={loading} onClick={() => onRunStage(activeDef.key)}>
              {done ? 'Re-run' : 'Run'}
            </button>
          ) : null}
          <button
            type="button"
            className={btnSecondary}
            disabled={loading}
            onClick={() => onRunFromStage(activeDef.key)}
            title={activeDef.key === 'brandify' ? 'Auto brandify then continue (no option picker)' : undefined}
          >
            From here ({formatUsd(chainPriceFrom(activeDef.key, stagePrices))})
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-3 p-3">
          {/* Inputs */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Inputs</p>
            <label className="block text-xs text-gray-300">
              Stage prompt
              <textarea
                className={`${inputCls} mt-1 font-mono text-xs`}
                rows={4}
                value={stagePromptDrafts[activeDef.key]}
                disabled={loading}
                onChange={(e) => updateStagePrompt(activeDef.key, e.target.value)}
              />
            </label>
            <LearnFromEditButton
              stage={activeDef.key}
              original={originalFor(activeDef.key)}
              edited={stagePromptDrafts[activeDef.key]}
              pipelineRunId={pipelineId || item?.pipeline_run_id}
              featureId={featureId}
              disabled={loading}
            />

            {activeDef.key === 'curate' && (
              <div className="space-y-2 pt-1">
                <div className="rounded-lg border border-cyan-800/40 bg-cyan-950/15 p-2 space-y-1">
                  <p className="text-[11px] font-semibold text-cyan-100">Professional curator output</p>
                  <p className="text-[11px] text-gray-400">
                    Bold hook → story / rekt news → product CTA. Select features above so the CTA matches the product.
                    Compose/schedule use this body as-is.
                  </p>
                  {ideate.news_anchor != null && (
                    <p className="text-[11px] text-amber-200/90">
                      Anchored on: {String(ideate.news_anchor)}
                    </p>
                  )}
                  {ideate.product != null && (
                    <p className="text-[11px] text-indigo-300">
                      Product CTA: {String(ideate.product)}
                    </p>
                  )}
                </div>

                <label className="block text-xs text-gray-300">
                  Hook (catchy &amp; bold)
                  <input
                    className={`${inputCls} mt-1 font-semibold tracking-tight`}
                    value={hook}
                    disabled={loading}
                    placeholder="SCROLL-STOP LINE"
                    onChange={(e) => setHook(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-300">
                  Story / news body
                  <textarea
                    className={`${inputCls} mt-1`}
                    rows={4}
                    value={storyBody}
                    disabled={loading}
                    placeholder="Mini-story or rekt news take with real value…"
                    onChange={(e) => setStoryBody(e.target.value)}
                  />
                </label>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block text-xs text-gray-300">
                    CTA label
                    <input
                      className={`${inputCls} mt-1`}
                      value={ctaLabel}
                      disabled={loading}
                      placeholder="Make a meme"
                      onChange={(e) => setCtaLabel(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-gray-300">
                    CTA URL
                    <input
                      className={`${inputCls} mt-1`}
                      value={ctaUrl}
                      disabled={loading}
                      placeholder="https://rektceo.com/memes"
                      onChange={(e) => setCtaUrl(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-xs text-gray-300">
                  CTA template
                  <select
                    className={`${inputCls} mt-1`}
                    value={ctaTemplateId}
                    disabled={loading}
                    onChange={(e) => setCtaTemplateId(e.target.value)}
                  >
                    <option value="direct">Direct — {'{label} → {url}'}</option>
                    <option value="soft_scroll">Soft scroll stop</option>
                    <option value="challenge">Challenge / prove it</option>
                    <option value="ugc_make">UGC make yours</option>
                    <option value="tribe">Tribe join</option>
                    <option value="fomo">FOMO nudge</option>
                    <option value="mission">Mission / XP</option>
                    <option value="quote_energy">Quote / reply energy</option>
                  </select>
                </label>
                <label className="block text-xs text-gray-300">
                  Hashtags
                  <input
                    className={`${inputCls} mt-1`}
                    value={hashtagsEdit}
                    disabled={loading}
                    placeholder="#RektCEO #RektMeme"
                    onChange={(e) => setHashtagsEdit(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-300">
                  Visual concept (for brandify)
                  <input
                    className={`${inputCls} mt-1`}
                    value={visualConcept}
                    disabled={loading}
                    onChange={(e) => setVisualConcept(e.target.value)}
                  />
                </label>

                {(() => {
                  const patterns: Record<string, string> = {
                    direct: '{cta_label} → {cta_url}',
                    soft_scroll: 'Still scrolling? {cta_label} → {cta_url}',
                    challenge: 'Prove it — {cta_label} → {cta_url}',
                    ugc_make: 'Make yours → {cta_url}',
                    tribe: 'Join the rekt ones — {cta_label}: {cta_url}',
                    fomo: "Don't get left holding the bag. {cta_label} → {cta_url}",
                    mission: 'Complete the mission — {cta_label} → {cta_url}',
                    quote_energy: 'Quote this with your take, then {cta_label} → {cta_url}',
                  }
                  const ctaLine = (patterns[ctaTemplateId] || patterns.direct)
                    .replace(/\{cta_label\}/g, ctaLabel || 'Learn more')
                    .replace(/\{cta_url\}/g, ctaUrl || 'https://rektceo.com')
                  const tags = hashtagsEdit.trim() || '#RektCEO #RektMeme'
                  const preview = [hook, '', storyBody, '', ctaLine, tags]
                    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
                    .join('\n')
                    .trim()
                  return (
                    <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 p-2 space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-emerald-300">
                        Schedule preview (compose uses this)
                      </p>
                      <pre className="whitespace-pre-wrap text-[11px] text-gray-200 font-sans">{preview || '—'}</pre>
                    </div>
                  )
                })()}

                <button
                  type="button"
                  className={btnSecondary}
                  disabled={loading || !item}
                  onClick={() => {
                    const patterns: Record<string, string> = {
                      direct: '{cta_label} → {cta_url}',
                      soft_scroll: 'Still scrolling? {cta_label} → {cta_url}',
                      challenge: 'Prove it — {cta_label} → {cta_url}',
                      ugc_make: 'Make yours → {cta_url}',
                      tribe: 'Join the rekt ones — {cta_label}: {cta_url}',
                      fomo: "Don't get left holding the bag. {cta_label} → {cta_url}",
                      mission: 'Complete the mission — {cta_label} → {cta_url}',
                      quote_energy: 'Quote this with your take, then {cta_label} → {cta_url}',
                    }
                    const cta_line = (patterns[ctaTemplateId] || patterns.direct)
                      .replace(/\{cta_label\}/g, ctaLabel || 'Learn more')
                      .replace(/\{cta_url\}/g, ctaUrl || 'https://rektceo.com')
                    const tags = hashtagsEdit
                      .split(/[\s,]+/)
                      .map((t) => t.trim())
                      .filter(Boolean)
                    const tweet_angle = [hook, storyBody].filter(Boolean).join('\n\n') || tweetAngle
                    const schedule_body = [hook, '', storyBody, '', cta_line, tags.join(' ')]
                      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
                      .join('\n')
                      .trim()
                    void onSaveEdits({
                      ideate: {
                        ...ideate,
                        hook,
                        story_body: storyBody,
                        tweet_angle,
                        caption_context: [hook, storyBody, visualConcept].filter(Boolean).join('\n'),
                        visual_concept: visualConcept,
                        cta_label: ctaLabel,
                        cta_url: ctaUrl,
                        cta_template_id: ctaTemplateId,
                        cta_line,
                        hashtags: tags.length ? tags : ideate.hashtags,
                        schedule_body,
                        curator_version: 2,
                      },
                      body_text: schedule_body,
                    })
                  }}
                >
                  Save curate edits
                </button>
                <RerunFeedbackField
                  label="Re-run curate with feedback"
                  disabled={loading}
                  onRerun={(feedback) => onRunStage('curate', { feedback })}
                />
              </div>
            )}

            {activeDef.key === 'select' && (
              <div className="space-y-2 pt-1">
                <TemplateLibraryPicker
                  value={templateId || null}
                  disabled={loading}
                  onChange={(id) => {
                    setTemplateId(id || '')
                    onPromptChange?.({ templateId: id })
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={loading || !item}
                    title={!item ? 'Run Curate first so a draft exists to save onto' : undefined}
                    onClick={() => onSaveEdits({ templateId: templateId || null })}
                  >
                    Save template selection
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={loading || !templateId}
                    onClick={() => {
                      void Promise.resolve(onSaveEdits({ templateId: templateId || null }))
                        .then(() => {
                          setOpen('brandify')
                          if (onBrandifyAnalyze) {
                            return onBrandifyAnalyze({ templateId: templateId || null })
                          }
                          return undefined
                        })
                    }}
                  >
                    Brandify this template (Analyze)
                  </button>
                </div>
                {item?.meme_template_id && item.meme_template_id !== templateId && (
                  <p className="text-[11px] text-amber-200">
                    Draft differs from last saved template — save or brandify to apply.
                  </p>
                )}
                <p className="text-[11px] text-gray-400">
                  After picking a new meme, use <span className="text-gray-200">Brandify this template</span> (or open Brandify → Analyze). Header &quot;From here&quot; auto-brands without option picking.
                </p>
              </div>
            )}

            {activeDef.key === 'brandify' && onBrandifyAnalyze && onBrandifyGenerate && onBrandifyAuto && (
              <BrandifyCuratePanel
                item={item}
                loading={loading}
                visionPrice={stagePrices.brandifyVision}
                generatePrice={stagePrices.brandifyGenerate}
                autoPrice={stagePrices.brandify}
                templatePreviewUrl={templatePreviewUrl}
                onAnalyze={(opts) => {
                  const tid = opts?.templateId ?? templateId ?? null
                  if (tid) {
                    setTemplateId(tid)
                    onPromptChange?.({ templateId: tid })
                  }
                  return onBrandifyAnalyze({
                    ...opts,
                    templateId: tid,
                  })
                }}
                onGenerate={onBrandifyGenerate}
                onAutoBrandify={(opts) => {
                  const tid = opts?.templateId ?? templateId ?? null
                  if (tid) {
                    setTemplateId(tid)
                    onPromptChange?.({ templateId: tid })
                  }
                  return onBrandifyAuto({ ...opts, templateId: tid })
                }}
                onSetCurrent={onBrandifySetCurrent}
                onSaveDraft={onBrandifySaveDraft}
                onRefreshOutputs={onBrandifyRefresh}
                initialTemplateId={templateId || null}
                onActiveTemplateChange={(id, metaInfo) => {
                  setTemplateId(id || '')
                  onPromptChange?.({ templateId: id })
                  if (id && metaInfo?.category) {
                    void metaInfo
                  }
                }}
              />
            )}

            {activeDef.key === 'brandify' && !(onBrandifyAnalyze && onBrandifyGenerate && onBrandifyAuto) && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs text-gray-300">
                  Template ID (used on re-run)
                  <input className={`${inputCls} mt-1`} value={templateId} disabled={loading}
                    onChange={(e) => {
                      setTemplateId(e.target.value)
                      onPromptChange?.({ templateId: e.target.value || null })
                    }} />
                </label>
                <p className="text-[11px] text-gray-400">
                  Visual concept:{' '}
                  <span className="text-gray-200">{visualConcept || String(ideate.visual_concept || '—')}</span>
                </p>
              </div>
            )}

            {activeDef.key === 'caption' && (
              <CaptionCuratePanel
                item={item}
                loading={loading}
                captionPrice={stagePrices.caption}
                topText={topText}
                bottomText={bottomText}
                onTopChange={setTopText}
                onBottomChange={setBottomText}
                onRunCaption={(opts) => onRunStage('caption', opts)}
                onSaveSelection={(patch) => onSaveEdits(patch)}
                onSaveToCalendar={onScheduleDay}
              />
            )}

            {activeDef.key === 'compose' && (
              <div className="space-y-2 pt-1">
                {item?.media_url && (
                  <MemeCaptionPreview
                    imageUrl={String(item.media_url)}
                    topText={topText}
                    bottomText={bottomText}
                    maxHeightClass="max-h-56"
                  />
                )}
                <label className="block text-xs text-gray-300">
                  Draft body
                  <textarea className={`${inputCls} mt-1`} rows={6} value={bodyText} disabled={loading}
                    onChange={(e) => setBodyText(e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={loading || !item}
                    onClick={() => onSaveEdits({
                      body_text: bodyText,
                      top_text: topText,
                      bottom_text: bottomText,
                    })}
                  >
                    Save draft body
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={loading}
                    onClick={() => onRunStage('compose')}
                  >
                    Re-compose (free)
                  </button>
                </div>
                {onScheduleDay && item && (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={loading}
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + (Number(item.metadata?.suggested_day) || 1))
                      d.setHours(15, 0, 0, 0)
                      void onScheduleDay(d.toISOString())
                    }}
                  >
                    Save deliverable to calendar (default day time)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Output + History */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Output</p>
              <StageOutputPreview stageKey={activeDef.key} meta={meta} ideate={ideate} item={item} />
              {activeDef.key === 'curate' && Object.keys(ideate).length > 0 && (
                <div className="mt-2">
                  <ArtifactView title="Full curate JSON" data={ideate} />
                </div>
              )}
              {meta && activeDef.key !== 'curate' && activeDef.key !== 'compose' && (
                <div className="mt-2">
                  <ArtifactView title={`${activeDef.label} metadata`} data={meta} />
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">History</p>
              <StageHistoryList entries={hist} linkedRuns={linked} />
              {!hist.length && !linked.length && (
                <p className="text-xs text-gray-500">No prior runs for this stage.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
