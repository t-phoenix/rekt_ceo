import { useEffect, useMemo, useState } from 'react'
import type { ContentItem, ContentPrompt, PostIdea, ProductFeature } from '../../../services/cmoApi'
import { cmoApi } from '../../../services/cmoApi'
import { PromptEditor } from './PipelineChrome'
import { ArtifactView } from '../ArtifactView'
import { btnPrimary, btnSecondary, inputCls } from './ResearchStep'
import { DayStagePipeline, type StageKey } from './DayStagePipeline'
import { TemplateLibraryPicker } from './TemplateLibraryPicker'
import { MemeCaptionPreview } from './MemeCaptionPreview'

export function StrategyStep({
  prompt,
  onPromptChange,
  ideas,
  onIdeasChange,
  strategyBrief,
  days,
  onDaysChange,
  onRun,
  onApprove,
  loading,
  strategyDone,
  mode,
}: {
  prompt: string
  onPromptChange: (v: string) => void
  ideas: PostIdea[]
  onIdeasChange: (ideas: PostIdea[]) => void
  strategyBrief?: Record<string, unknown> | null
  days: number
  onDaysChange: (n: number) => void
  onRun: () => void
  onApprove: () => void
  loading: boolean
  strategyDone: boolean
  mode: string
}) {
  const updateIdea = (idx: number, patch: Partial<PostIdea>) => {
    onIdeasChange(ideas.map((idea, i) => (i === idx ? { ...idea, ...patch } : idea)))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-4 text-white">
        <label className="block text-sm">
          <span className="font-medium text-white">Calendar length (days)</span>
          <input
            type="number"
            min={1}
            max={60}
            className={`${inputCls} mt-1 w-28`}
            value={days}
            disabled={loading}
            onChange={(e) => onDaysChange(Math.max(1, Number(e.target.value) || 1))}
          />
          <span className="block text-xs text-gray-300 mt-1">
            Strategy generates this many day-tagged post ideas (not hardcoded to 7).
          </span>
        </label>
        <PromptEditor
          label="Strategy auto-prompt"
          value={prompt}
          onChange={onPromptChange}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={loading || !prompt.trim()} onClick={onRun}>
            {strategyDone ? 'Re-run strategy' : 'Run strategy'} ($0.10)
          </button>
          {strategyDone && mode === 'manual' && (
            <button type="button" className={btnSecondary} disabled={loading || !ideas.length} onClick={onApprove}>
              Approve & continue →
            </button>
          )}
        </div>
      </div>

      {strategyBrief && (
        <ArtifactView
          title="Strategy brief"
          data={{
            season: strategyBrief.season,
            hashtags: strategyBrief.hashtags,
            mention: strategyBrief.mention,
            launch_url: strategyBrief.launch_url,
            meme_gen_url: strategyBrief.meme_gen_url,
            days: strategyBrief.days,
            focus: strategyBrief.focus,
          }}
        />
      )}

      {ideas.length > 0 && (
        <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-3 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Day calendar ({ideas.length})</h3>
            <button
              type="button"
              className={btnSecondary}
              disabled={loading}
              onClick={() =>
                onIdeasChange([
                  ...ideas,
                  {
                    title: `New idea ${ideas.length + 1}`,
                    angle: '',
                    cta: 'https://rektceo.com/memes',
                    platform: 'twitter',
                    suggested_day: ideas.length + 1,
                  },
                ])
              }
            >
              Add day
            </button>
          </div>
          {ideas.map((idea, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-gray-600 bg-gray-900/40 space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-xs font-bold text-indigo-300 mt-2">D{idea.suggested_day || idx + 1}</span>
                <div className="flex-1 space-y-2">
                  <input
                    className={inputCls}
                    value={idea.title}
                    onChange={(e) => updateIdea(idx, { title: e.target.value })}
                    disabled={loading}
                  />
                  <input
                    className={inputCls}
                    value={idea.angle || ''}
                    onChange={(e) => updateIdea(idx, { angle: e.target.value })}
                    placeholder="Angle"
                    disabled={loading}
                  />
                  <input
                    className={inputCls}
                    value={idea.cta || ''}
                    onChange={(e) => updateIdea(idx, { cta: e.target.value })}
                    placeholder="CTA URL"
                    disabled={loading}
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline mt-2"
                  disabled={loading || ideas.length <= 1}
                  onClick={() => onIdeasChange(ideas.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function dayStatus(
  prompt: ContentPrompt,
  items: ContentItem[],
  runningIndex: number | null,
  failedIdeas: number[] = [],
): 'idle' | 'running' | 'drafted' | 'failed' {
  if (runningIndex === prompt.ideaIndex) return 'running'
  if (failedIdeas.includes(prompt.ideaIndex)) {
    const match = items.find(
      (it) => Number(it.metadata?.suggested_day) === Number(prompt.suggested_day),
    )
    if (!(match?.media_url || match?.body_text)) return 'failed'
  }
  const match = items.find(
    (it) => Number(it.metadata?.suggested_day) === Number(prompt.suggested_day),
  )
  if (match?.media_url || match?.body_text) return 'drafted'
  return 'idle'
}

const STATUS_CHIP: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-200',
  running: 'bg-amber-900/50 text-amber-200',
  drafted: 'bg-emerald-900/50 text-emerald-200',
  failed: 'bg-red-900/50 text-red-200',
}

export function ContentStep({
  prompts,
  onPromptsChange,
  items,
  onPatchBody,
  onRunDay,
  onRunAll,
  onStage,
  onRunFromStage,
  onBrandifyAnalyze,
  onBrandifyGenerate,
  onBrandifyAuto,
  onBrandifySetCurrent,
  onBrandifySaveDraft,
  onBrandifyRefresh,
  onSaveStageEdits,
  onScheduleDay,
  activeStageByDay,
  stageRuns,
  onApprove,
  loading,
  contentDone,
  mode,
  dayPackagePrice,
  stagePrices,
  runningIndex,
  failedIdeas = [],
  pipelineId,
}: {
  prompts: ContentPrompt[]
  onPromptsChange: (p: ContentPrompt[]) => void
  items: ContentItem[]
  onPatchBody: (id: string, body: string) => void
  onRunDay: (ideaIndex: number) => void
  onRunAll: () => void
  onStage?: (stage: StageKey, ideaIndex: number, opts?: { feedback?: string }) => void
  onRunFromStage?: (from: StageKey, ideaIndex: number) => void
  onBrandifyAnalyze?: (
    ideaIndex: number,
    opts?: { customTarget?: string; feedback?: string; templateId?: string | null },
  ) => Promise<void>
  onBrandifyGenerate?: (
    ideaIndex: number,
    choices: { element: string; idea: string; isCustom?: boolean }[],
    opts?: { feedback?: string; outputId?: string },
  ) => Promise<void>
  onBrandifyAuto?: (ideaIndex: number, opts?: { feedback?: string; templateId?: string | null }) => Promise<void>
  onBrandifySetCurrent?: (ideaIndex: number, outputId: string) => Promise<void>
  onBrandifySaveDraft?: (
    ideaIndex: number,
    draft: {
      selections: Record<string, string>
      customs: Record<string, string>
      customTarget?: string
      feedback?: string
      outputId?: string
      templates?: Array<{ id: string; name?: string; category?: string; addedAt?: string }>
      activeTemplateId?: string | null
    },
  ) => Promise<unknown> | void
  onBrandifyRefresh?: (ideaIndex: number) => Promise<unknown>
  onSaveStageEdits?: (
    ideaIndex: number,
    patch: {
      ideate?: Record<string, unknown>
      templateId?: string | null
      top_text?: string
      bottom_text?: string
      body_text?: string
      intensity?: string
      audience?: string
      caption_option?: Record<string, unknown> | null
    },
  ) => Promise<void> | void
  onScheduleDay?: (ideaIndex: number, scheduledAt: string) => Promise<void> | void
  activeStageByDay?: Record<number, StageKey | null>
  stageRuns?: import('../../../services/cmoApi').StrategyRun[]
  onApprove: () => void
  loading: boolean
  contentDone: boolean
  mode: string
  dayPackagePrice: number
  stagePrices?: {
    curate: number
    selectTemplate: number
    brandify: number
    brandifyVision: number
    brandifyGenerate: number
    caption: number
  }
  runningIndex: number | null
  failedIdeas?: number[]
  pipelineId?: string | null
}) {
  const idleCount = prompts.filter((p) => dayStatus(p, items, null, failedIdeas) === 'idle').length
  const draftedCount = prompts.filter((p) => dayStatus(p, items, null, failedIdeas) === 'drafted').length
  const batchCost = dayPackagePrice * Math.max(prompts.length, 1)
  const sp = stagePrices || {
    curate: 0.18,
    selectTemplate: 0.03,
    brandify: 0.48,
    brandifyVision: 0.19,
    brandifyGenerate: 0.29,
    caption: 0.24,
  }
  const [catalog, setCatalog] = useState<ProductFeature[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    cmoApi.listFeatures({ activeOnly: true }).then(setCatalog).catch(() => setCatalog([]))
  }, [])

  // Keep selection valid when prompt list changes
  useEffect(() => {
    if (!prompts.length) {
      setSelectedIdx(0)
      return
    }
    if (selectedIdx >= prompts.length) setSelectedIdx(prompts.length - 1)
  }, [prompts.length, selectedIdx])

  // Follow the day that's currently running
  useEffect(() => {
    if (runningIndex == null) return
    const i = prompts.findIndex((p) => p.ideaIndex === runningIndex)
    if (i >= 0) setSelectedIdx(i)
  }, [runningIndex, prompts])

  const statuses = useMemo(
    () => prompts.map((day) => dayStatus(day, items, runningIndex, failedIdeas)),
    [prompts, items, runningIndex, failedIdeas],
  )

  const idx = Math.min(Math.max(selectedIdx, 0), Math.max(prompts.length - 1, 0))
  const p = prompts[idx]
  const status = p ? statuses[idx] : 'idle'
  const item = p
    ? items.find((it) => Number(it.metadata?.suggested_day) === Number(p.suggested_day))
    : undefined

  const goPrev = () => setSelectedIdx((i) => Math.max(0, i - 1))
  const goNext = () => setSelectedIdx((i) => Math.min(prompts.length - 1, i + 1))

  const toggleFeature = (featureId: string) => {
    if (!p) return
    const next = prompts.map((x, i) => {
      if (i !== idx) return x
      const ids = new Set(x.featureIds || [])
      if (ids.has(featureId)) ids.delete(featureId)
      else ids.add(featureId)
      return { ...x, featureIds: [...ids] }
    })
    onPromptsChange(next)
  }

  const patchSelected = (patch: Partial<ContentPrompt>) => {
    const next = prompts.map((x, i) => (i === idx ? { ...x, ...patch } : x))
    onPromptsChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-3 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-200">
              Pick a day on the timeline, then edit stages. Process one day (~${dayPackagePrice.toFixed(2)})
              or batch all (~${batchCost.toFixed(2)}).
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {draftedCount}/{prompts.length} drafted
              {idleCount > 0 ? ` · ${idleCount} idle` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              className={btnPrimary}
              disabled={loading || !prompts.length}
              onClick={onRunAll}
            >
              {contentDone ? 'Re-run all' : `Process all ${prompts.length}`} ({formatUsd(batchCost)})
            </button>
            {contentDone && mode === 'manual' && items.length > 0 && (
              <button type="button" className={btnSecondary} disabled={loading} onClick={onApprove}>
                Approve →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Day timeline rail */}
      {prompts.length > 0 && (
        <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Calendar</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={btnSecondary}
                disabled={loading || idx <= 0}
                onClick={goPrev}
                aria-label="Previous day"
              >
                ←
              </button>
              <span className="text-xs text-gray-300 px-2 tabular-nums">
                Day {p?.suggested_day ?? idx + 1} of {prompts.length}
              </span>
              <button
                type="button"
                className={btnSecondary}
                disabled={loading || idx >= prompts.length - 1}
                onClick={goNext}
                aria-label="Next day"
              >
                →
              </button>
            </div>
          </div>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth"
            role="tablist"
            aria-label="Content days"
          >
            {prompts.map((day, i) => {
              const s = statuses[i]
              const active = i === idx
              const dayItem = items.find(
                (it) => Number(it.metadata?.suggested_day) === Number(day.suggested_day),
              )
              return (
                <button
                  key={day.ideaIndex}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedIdx(i)}
                  className={`shrink-0 w-[88px] rounded-lg border px-2 py-2 text-left transition-colors ${
                    active
                      ? 'border-indigo-400 bg-indigo-950/50 ring-1 ring-indigo-400/40'
                      : s === 'drafted'
                        ? 'border-emerald-700/50 bg-emerald-950/20 hover:border-emerald-600'
                        : s === 'failed'
                          ? 'border-red-700/50 bg-red-950/20 hover:border-red-600'
                          : s === 'running'
                            ? 'border-amber-500/60 bg-amber-950/30'
                            : 'border-gray-600 bg-gray-900/40 hover:border-gray-500'
                  }`}
                  title={day.title}
                >
                  <span className="block text-[10px] font-bold text-indigo-300">D{day.suggested_day}</span>
                  <span className="block text-[11px] font-medium text-white truncate leading-tight mt-0.5">
                    {day.title}
                  </span>
                  <span className={`inline-block mt-1 text-[9px] uppercase font-bold px-1 py-0.5 rounded ${STATUS_CHIP[s]}`}>
                    {s}
                  </span>
                  {dayItem?.media_url ? (
                    <span className="block text-[9px] text-emerald-300 mt-0.5">media</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day workspace */}
      {!p ? (
        <div className="rounded-xl border border-dashed border-gray-600 p-8 text-center text-sm text-gray-400">
          No content days yet — finish Strategy first.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-600 bg-gray-800/80 text-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex flex-wrap items-center gap-2 bg-gray-900/40">
            <h3 className="text-sm font-semibold text-white">
              Day {p.suggested_day}: {p.title}
            </h3>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${STATUS_CHIP[status]}`}>
              {status}
            </span>
            {item?.media_url && (
              <img
                src={item.media_url}
                alt=""
                className="h-8 w-8 rounded object-cover border border-gray-600 ml-auto"
              />
            )}
          </div>

          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-gray-300">{p.idea?.angle || 'No angle'}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <label className="text-xs text-gray-300">
                Intensity
                <select
                  className={`${inputCls} mt-1`}
                  value={p.intensity || 'savage'}
                  disabled={loading}
                  onChange={(e) => patchSelected({ intensity: e.target.value })}
                >
                  <option value="mild">mild</option>
                  <option value="medium">medium</option>
                  <option value="savage">savage</option>
                </select>
              </label>
              <label className="text-xs text-gray-300">
                Audience
                <select
                  className={`${inputCls} mt-1`}
                  value={p.audience || 'ct'}
                  disabled={loading}
                  onChange={(e) => patchSelected({ audience: e.target.value })}
                >
                  <option value="ct">ct</option>
                  <option value="normie">normie</option>
                  <option value="mixed">mixed</option>
                </select>
              </label>
                <label className="text-xs text-gray-300 sm:col-span-3">
                  Meme template
                  <div className="mt-1">
                    <TemplateLibraryPicker
                      value={
                        p.templateId !== undefined && p.templateId !== null
                          ? p.templateId
                          : (item?.meme_template_id || null)
                      }
                      disabled={loading}
                      compact
                      onChange={(id) => patchSelected({ templateId: id })}
                    />
                  </div>
                </label>
              </div>

            {catalog.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-200">Feature CTAs for this day</p>
                <div className="flex flex-wrap gap-1.5">
                  {catalog.map((f) => {
                    const on = (p.featureIds || []).includes(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={loading}
                        onClick={() => toggleFeature(f.id)}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                          on
                            ? 'border-indigo-400 bg-indigo-900/40 text-indigo-100'
                            : 'border-gray-600 bg-gray-900/40 text-gray-300 hover:border-gray-500'
                        }`}
                        title={f.short_description || f.title}
                      >
                        {f.title}
                        {f.status === 'soon' ? ' · soon' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={5}
              value={p.promptEditable}
              disabled={loading}
              onChange={(e) => patchSelected({ promptEditable: e.target.value })}
            />
            <button
              type="button"
              className={btnPrimary}
              disabled={loading}
              onClick={() => onRunDay(p.ideaIndex)}
            >
              {status === 'drafted' ? 'Re-process this day' : 'Process this day'} ({formatUsd(dayPackagePrice)})
            </button>

              {onStage && onRunFromStage && onSaveStageEdits && (
                <DayStagePipeline
                  prompt={p}
                  item={item}
                  loading={loading}
                  activeStage={activeStageByDay?.[p.ideaIndex] || null}
                  stagePrices={sp}
                  stageRuns={stageRuns || []}
                  onRunStage={(stage, opts) => onStage(stage, p.ideaIndex, opts)}
                  onRunFromStage={(from) => onRunFromStage(from, p.ideaIndex)}
                  onSaveEdits={(patch) => onSaveStageEdits(p.ideaIndex, patch)}
                  onPromptChange={(patch) => patchSelected(patch)}
                  pipelineId={pipelineId || item?.pipeline_run_id || undefined}
                  onBrandifyAnalyze={
                    onBrandifyAnalyze
                      ? (opts) => onBrandifyAnalyze(p.ideaIndex, opts)
                      : undefined
                  }
                  onBrandifyGenerate={
                    onBrandifyGenerate
                      ? (choices, opts) => onBrandifyGenerate(p.ideaIndex, choices, opts)
                      : undefined
                  }
                  onBrandifyAuto={
                    onBrandifyAuto ? (opts) => onBrandifyAuto(p.ideaIndex, opts) : undefined
                  }
                  onBrandifySetCurrent={
                    onBrandifySetCurrent
                      ? (outputId) => onBrandifySetCurrent(p.ideaIndex, outputId)
                      : undefined
                  }
                  onBrandifySaveDraft={
                    onBrandifySaveDraft
                      ? (draft) => onBrandifySaveDraft(p.ideaIndex, draft)
                      : undefined
                  }
                  onBrandifyRefresh={
                    onBrandifyRefresh
                      ? () => onBrandifyRefresh(p.ideaIndex)
                      : undefined
                  }
                  onScheduleDay={
                    onScheduleDay
                      ? (scheduledAt) => onScheduleDay(p.ideaIndex, scheduledAt)
                      : undefined
                  }
                />
              )}

            {item && (
              <div className="space-y-2 rounded-lg border border-gray-600 bg-gray-900/50 p-3">
                <p className="text-xs text-gray-400">
                  Final draft ({item.status}
                  {item.meme_template_id ? ` · ${item.meme_template_id}` : ''})
                </p>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={item.body_text || ''}
                  disabled={loading}
                  onChange={(e) => onPatchBody(item.id, e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-gray-700">
              <button type="button" className={btnSecondary} disabled={loading || idx <= 0} onClick={goPrev}>
                ← Previous day
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={loading || idx >= prompts.length - 1}
                onClick={goNext}
              >
                Next day →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatUsd(n: number) {
  return `$${n.toFixed(2)}`
}

export function ScheduleStep({
  items,
  schedules,
  onScheduleChange,
  onConfirm,
  loading,
  completed,
}: {
  items: ContentItem[]
  schedules: Record<string, string>
  onScheduleChange: (id: string, iso: string) => void
  onConfirm: () => void
  loading: boolean
  completed: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 text-white">
        <h3 className="text-sm font-semibold text-white mb-1">Schedule drafts</h3>
        <p className="text-xs text-gray-300 mb-4">
          Manual publish only — set times, then confirm. Nothing auto-posts.
        </p>
        {!items.length && (
          <p className="text-sm text-gray-300 py-6 text-center">No drafts yet — finish Content first.</p>
        )}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const day = Number(item.metadata?.suggested_day) || idx + 1
            return (
              <div key={item.id} className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-gray-600 bg-gray-900/40">
                {item.media_url && (
                  <div className="w-28 shrink-0">
                    <MemeCaptionPreview
                      imageUrl={item.media_url}
                      topText={String(item.metadata?.top_text || '')}
                      bottomText={String(item.metadata?.bottom_text || '')}
                      compact
                      maxHeightClass="max-h-28"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-indigo-300">Day {day}</p>
                  <p className="text-sm text-white line-clamp-3">{item.body_text}</p>
                  {item.status === 'scheduled' && item.scheduled_at && (
                    <p className="text-[11px] text-emerald-300">Scheduled · {new Date(item.scheduled_at).toLocaleString()}</p>
                  )}
                </div>
                <label className="text-xs text-gray-300 shrink-0">
                  Schedule
                  <input
                    type="datetime-local"
                    className={`${inputCls} mt-1`}
                    value={toLocalInput(schedules[item.id])}
                    disabled={loading || completed}
                    onChange={(e) => onScheduleChange(item.id, fromLocalInput(e.target.value))}
                  />
                </label>
              </div>
            )
          })}
        </div>
        {items.length > 0 && !completed && (
          <button type="button" className={`${btnPrimary} mt-4`} disabled={loading} onClick={onConfirm}>
            Confirm schedule
          </button>
        )}
        {completed && (
          <p className="mt-4 text-sm text-emerald-300">Pipeline completed — drafts are scheduled.</p>
        )}
      </div>
    </div>
  )
}

function toLocalInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(local: string) {
  if (!local) return ''
  return new Date(local).toISOString()
}

export function defaultSchedules(items: { id: string; metadata?: { suggested_day?: number } }[]) {
  const out: Record<string, string> = {}
  const base = new Date()
  base.setHours(15, 0, 0, 0)
  items.forEach((item, idx) => {
    const day = Number(item.metadata?.suggested_day) || idx + 1
    const d = new Date(base)
    d.setDate(d.getDate() + day)
    out[item.id] = d.toISOString()
  })
  return out
}
