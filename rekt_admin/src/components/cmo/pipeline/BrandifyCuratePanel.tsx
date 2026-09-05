import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandifyOutputSummary, ContentItem } from '../../../services/cmoApi'
import { btnPrimary, btnSecondary, inputCls } from './ResearchStep'
import { TemplateLibraryPicker, templateImageUrl } from './TemplateLibraryPicker'

const CUSTOM = '__custom__'
const SKIP = '__skip__'

type StrategyElement = {
  name?: string
  element?: string
  type?: string
  reasoning?: string
  ideas?: string[]
}

type CaptionOption = {
  id?: string
  top_text?: string
  bottom_text?: string
  humor_tag?: string
  ranking_score?: number
  rank?: number
}

export type BrandifyTemplatePick = {
  id: string
  name?: string
  category?: string
  addedAt?: string
}

function elementName(el: StrategyElement) {
  return String(el.name || el.element || 'element')
}

function statusTone(status: string) {
  switch (status) {
    case 'done':
      return 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50'
    case 'processing':
    case 'analyzing':
      return 'bg-indigo-900/60 text-indigo-200 border-indigo-700/50'
    case 'awaiting_choices':
    case 'needs_curation':
      return 'bg-amber-900/60 text-amber-200 border-amber-700/50'
    case 'failed':
      return 'bg-red-900/60 text-red-200 border-red-700/50'
    case 'incomplete':
      return 'bg-orange-900/50 text-orange-200 border-orange-700/40'
    default:
      return 'bg-gray-800 text-gray-300 border-gray-600'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'analyzing':
      return 'Analyzing'
    case 'awaiting_choices':
    case 'needs_curation':
      return 'Awaiting choices'
    case 'processing':
      return 'Generating'
    case 'done':
      return 'Complete'
    case 'failed':
      return 'Failed'
    case 'incomplete':
      return 'Incomplete'
    default:
      return status || 'Idle'
  }
}

function hydrateSelections(
  elements: StrategyElement[],
  draft: { selections?: Record<string, string>; customs?: Record<string, string> } | null | undefined,
  choices: Array<{ element: string; idea: string; isCustom?: boolean }> | null | undefined,
) {
  const selections: Record<string, string> = {}
  const customs: Record<string, string> = {}

  for (const el of elements) {
    const name = elementName(el)
    selections[name] = SKIP
  }

  if (draft?.selections) {
    for (const [k, v] of Object.entries(draft.selections)) {
      selections[k] = v
    }
  }
  if (draft?.customs) {
    for (const [k, v] of Object.entries(draft.customs)) {
      customs[k] = v
    }
  }

  if (choices?.length) {
    for (const c of choices) {
      if (!c?.element) continue
      if (c.isCustom) {
        selections[c.element] = CUSTOM
        customs[c.element] = c.idea
      } else {
        selections[c.element] = c.idea
      }
    }
  }

  return { selections, customs }
}

function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <span
      className={`${className} border-2 border-current border-t-transparent rounded-full animate-spin inline-block`}
    />
  )
}

function templateRunState(
  templateId: string,
  outputs: BrandifyOutputSummary[],
  activeId: string | null,
  phaseBusy: string | null,
) {
  const forTpl = outputs.filter((o) => String(o.templateId || '') === templateId)
  if (forTpl.some((o) => o.status === 'analyzing')) return 'analyzing'
  if (forTpl.some((o) => o.status === 'processing')) return 'processing'
  if (forTpl.some((o) => o.status === 'awaiting_choices')) return 'awaiting_choices'
  if (forTpl.some((o) => o.status === 'failed' && !forTpl.some((x) => x.status === 'done'))) return 'failed'
  if (forTpl.some((o) => o.isCurrent && o.status === 'done')) return 'current'
  if (forTpl.some((o) => o.status === 'done')) return 'done'
  if (activeId === templateId && (phaseBusy === 'analyze' || phaseBusy === 'auto' || phaseBusy === 'generate')) {
    return phaseBusy === 'generate' ? 'processing' : 'analyzing'
  }
  if (activeId === templateId) return 'selected'
  return 'idle'
}

export function BrandifyCuratePanel({
  item,
  loading,
  visionPrice,
  generatePrice,
  autoPrice,
  onAnalyze,
  onGenerate,
  onAutoBrandify,
  onSetCurrent,
  onSaveDraft,
  onRefreshOutputs,
  templatePreviewUrl,
  onActiveTemplateChange,
  initialTemplateId,
}: {
  item?: ContentItem | null
  loading: boolean
  visionPrice: number
  generatePrice: number
  autoPrice: number
  onAnalyze: (opts?: {
    customTarget?: string
    feedback?: string
    templateId?: string | null
  }) => Promise<void>
  onGenerate: (
    choices: { element: string; idea: string; isCustom?: boolean }[],
    opts?: { feedback?: string; outputId?: string },
  ) => Promise<void>
  onAutoBrandify: (opts?: { feedback?: string; templateId?: string | null }) => Promise<void>
  onSetCurrent?: (outputId: string) => Promise<void>
  onSaveDraft?: (draft: {
    selections: Record<string, string>
    customs: Record<string, string>
    customTarget?: string
    feedback?: string
    outputId?: string
    templates?: BrandifyTemplatePick[]
    activeTemplateId?: string | null
  }) => Promise<unknown> | void
  onRefreshOutputs?: () => Promise<unknown>
  templatePreviewUrl?: string | null
  onActiveTemplateChange?: (templateId: string | null, meta?: { name?: string; category?: string }) => void
  /** Day-prompt / picker override not yet saved onto the item */
  initialTemplateId?: string | null
}) {
  const meta = (item?.metadata || {}) as Record<string, unknown>
  const stage = ((meta.stages as Record<string, unknown> | undefined)?.brandify || {}) as Record<string, unknown>
  const strategy = (stage.strategy || meta.brandify_strategy || null) as { elements?: StrategyElement[] } | null
  const sessionId = String(stage.sessionId || item?.brandify_session_id || '')
  const originalUrl = String(stage.originalImageUrl || meta.brandify_original_url || '')
  const generatedUrl = String(stage.media_url || item?.media_url || '')
  const engine = String(stage.engineUsed || meta.brandify_engine || '')
  const stageStatus = String(stage.status || '')
  const brandifyError = String(stage.brandifyError || meta.brandifyError || '')

  const outputs = useMemo(() => {
    const raw = (meta.brandify_outputs || []) as BrandifyOutputSummary[]
    return [...raw].sort((a, b) => {
      const ta = Date.parse(String(a.updatedAt || a.createdAt || 0))
      const tb = Date.parse(String(b.updatedAt || b.createdAt || 0))
      return tb - ta
    })
  }, [meta.brandify_outputs])

  const seedTemplates = useMemo(() => {
    const map = new Map<string, BrandifyTemplatePick>()
    const push = (t: BrandifyTemplatePick | null | undefined) => {
      if (!t?.id) return
      const id = String(t.id)
      const prev = map.get(id)
      map.set(id, {
        id,
        name: t.name || prev?.name,
        category: t.category || prev?.category,
        addedAt: t.addedAt || prev?.addedAt || new Date().toISOString(),
      })
    }
    for (const t of (Array.isArray(meta.brandify_templates) ? meta.brandify_templates : []) as BrandifyTemplatePick[]) {
      push(t)
    }
    if (item?.meme_template_id) {
      push({
        id: String(item.meme_template_id),
        name: String((meta.stages as Record<string, { template?: { name?: string } }> | undefined)?.select_template?.template?.name || ''),
        category: String(meta.templateCategory || ''),
      })
    }
    if (meta.templateId) push({ id: String(meta.templateId) })
    if (initialTemplateId) push({ id: String(initialTemplateId) })
    for (const o of outputs) {
      if (o.templateId) push({ id: String(o.templateId) })
    }
    return [...map.values()]
  }, [meta.brandify_templates, meta.templateId, meta.templateCategory, meta.stages, item?.meme_template_id, outputs, initialTemplateId])

  const [templates, setTemplates] = useState<BrandifyTemplatePick[]>(seedTemplates)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    String(meta.brandify_active_template_id || item?.meme_template_id || meta.templateId || seedTemplates[0]?.id || '') || null,
  )
  const [outputFilter, setOutputFilter] = useState<'all' | string>('all')

  // Rehydrate queue when server metadata changes
  useEffect(() => {
    setTemplates(seedTemplates)
    const nextActive = String(
      meta.brandify_active_template_id || item?.meme_template_id || meta.templateId || seedTemplates[0]?.id || '',
    ) || null
    if (nextActive) setActiveTemplateId(nextActive)
  }, [seedTemplates, meta.brandify_active_template_id, item?.meme_template_id, meta.templateId])

  const currentOutput = outputs.find((o) => o.isCurrent)
    || outputs.find((o) => o.id === meta.selected_output_id)
    || null

  const activeAnalysis = outputs.find((o) =>
    o.status === 'awaiting_choices'
    && (!activeTemplateId || String(o.templateId || '') === activeTemplateId),
  )
    || outputs.find((o) => o.status === 'awaiting_choices')
    || outputs.find((o) => o.status === 'analyzing')
    || null

  const elements = strategy?.elements || []

  const captionOptions = useMemo(() => {
    const fromMeta = Array.isArray(meta.caption_options) ? meta.caption_options : []
    const fromStage = Array.isArray(
      ((meta.stages as Record<string, { all_options?: unknown }> | undefined)?.caption)?.all_options,
    )
      ? ((meta.stages as Record<string, { all_options?: CaptionOption[] }>).caption.all_options || [])
      : []
    return (fromMeta.length ? fromMeta : fromStage) as CaptionOption[]
  }, [meta.caption_options, meta.stages])

  const [customTarget, setCustomTarget] = useState('')
  const [feedback, setFeedback] = useState('')
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [customs, setCustoms] = useState<Record<string, string>>({})
  const [phaseBusy, setPhaseBusy] = useState<'analyze' | 'generate' | 'auto' | 'current' | 'refresh' | null>(null)
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)
  const [localError, setLocalError] = useState('')
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedKey = useRef('')

  const isProcessing = stageStatus === 'processing'
    || outputs.some((o) => o.status === 'processing' || o.status === 'analyzing')
  const awaiting = Boolean(meta.brandify_awaiting_choices)
    || stageStatus === 'needs_curation'
    || outputs.some((o) => o.status === 'awaiting_choices')

  // Hydrate selections from persisted draft / choices when session or outputs change
  useEffect(() => {
    const key = `${sessionId}|${String(meta.selected_output_id || '')}|${elements.length}|${outputs.length}`
    if (!elements.length) return
    if (hydratedKey.current === key && Object.keys(selections).length) return
    hydratedKey.current = key

    const draft = (meta.brandify_draft_selections || {}) as {
      selections?: Record<string, string>
      customs?: Record<string, string>
    }
    const choices = (meta.brandify_choices
      || stage.userCuratedChoices
      || activeAnalysis?.choices
      || currentOutput?.choices
      || []) as Array<{ element: string; idea: string; isCustom?: boolean }>

    const hydrated = hydrateSelections(elements, draft, choices)
    setSelections(hydrated.selections)
    setCustoms(hydrated.customs)
  }, [sessionId, elements.length, outputs.length, meta.selected_output_id])

  useEffect(() => {
    if (currentOutput?.id) setSelectedOutputId(currentOutput.id)
    else if (activeAnalysis?.id) setSelectedOutputId(activeAnalysis.id)
  }, [currentOutput?.id, activeAnalysis?.id])

  // Poll outputs while a long job is in flight so status chips stay live
  useEffect(() => {
    if (!onRefreshOutputs || !item?.id) return
    if (phaseBusy !== 'generate' && phaseBusy !== 'analyze' && phaseBusy !== 'auto' && !isProcessing) {
      return
    }
    const id = setInterval(() => {
      void onRefreshOutputs()
    }, 4000)
    return () => clearInterval(id)
  }, [phaseBusy, isProcessing, item?.id, onRefreshOutputs])

  // Persist draft selections + template queue (debounced)
  useEffect(() => {
    if (!onSaveDraft || !item?.id) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      void onSaveDraft({
        selections,
        customs,
        customTarget: customTarget || undefined,
        feedback: feedback || undefined,
        outputId: activeAnalysis?.id || selectedOutputId || undefined,
        templates,
        activeTemplateId,
      })
    }, 700)
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [selections, customs, customTarget, feedback, templates, activeTemplateId])

  const filteredOutputs = useMemo(() => {
    if (outputFilter === 'all') return outputs
    return outputs.filter((o) => String(o.templateId || '') === outputFilter)
  }, [outputs, outputFilter])

  const selectActiveTemplate = (id: string, metaInfo?: { name?: string; category?: string }) => {
    setActiveTemplateId(id)
    setOutputFilter(id)
    setTemplates((prev) => {
      if (prev.some((t) => t.id === id)) {
        return prev.map((t) => (t.id === id
          ? { ...t, name: metaInfo?.name || t.name, category: metaInfo?.category || t.category }
          : t))
      }
      return [...prev, {
        id,
        name: metaInfo?.name,
        category: metaInfo?.category,
        addedAt: new Date().toISOString(),
      }]
    })
    onActiveTemplateChange?.(id, metaInfo)
  }

  const addTemplate = (id: string | null, metaInfo?: { name?: string; category?: string }) => {
    if (!id) return
    setTemplates((prev) => {
      if (prev.some((t) => t.id === id)) return prev
      return [...prev, {
        id,
        name: metaInfo?.name,
        category: metaInfo?.category,
        addedAt: new Date().toISOString(),
      }]
    })
    if (!activeTemplateId) selectActiveTemplate(id, metaInfo)
  }

  const removeTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (activeTemplateId === id) {
      const next = templates.find((t) => t.id !== id)?.id || null
      setActiveTemplateId(next)
      onActiveTemplateChange?.(next || null)
    }
    if (outputFilter === id) setOutputFilter('all')
  }

  const includedCount = useMemo(() => {
    return elements.filter((el) => {
      const name = elementName(el)
      const choice = selections[name]
      if (!choice || choice === SKIP) return false
      if (choice === CUSTOM) return Boolean(customs[name]?.trim())
      return true
    }).length
  }, [elements, selections, customs])

  const buildChoices = () => {
    const choices: { element: string; idea: string; isCustom?: boolean }[] = []
    for (const el of elements) {
      const name = elementName(el)
      const choice = selections[name]
      if (!choice || choice === SKIP) continue
      if (choice === CUSTOM) {
        const idea = (customs[name] || '').trim()
        if (!idea) continue
        choices.push({ element: name, idea, isCustom: true })
      } else {
        choices.push({ element: name, idea: choice })
      }
    }
    return choices
  }

  const busy = loading || phaseBusy != null
  const workflowStep = isProcessing
    ? 'processing'
    : generatedUrl && stageStatus === 'done'
      ? 'result'
      : elements.length || awaiting
        ? 'customize'
        : 'analyze'

  const counts = useMemo(() => {
    const c = { done: 0, failed: 0, processing: 0, awaiting: 0, incomplete: 0 }
    for (const o of outputs) {
      if (o.status === 'done') c.done += 1
      else if (o.status === 'failed') c.failed += 1
      else if (o.status === 'processing' || o.status === 'analyzing') c.processing += 1
      else if (o.status === 'awaiting_choices') c.awaiting += 1
      else c.incomplete += 1
    }
    return c
  }, [outputs])

  const previewOriginal = originalUrl
    || (activeTemplateId ? templateImageUrl(activeTemplateId) : null)
    || templatePreviewUrl
    || (item?.meme_template_id ? templateImageUrl(item.meme_template_id) : null)
  const previewGenerated = currentOutput?.mediaUrl || generatedUrl

  const fixHints = useMemo(() => {
    const hints: string[] = []
    if (stageStatus === 'failed' || brandifyError) {
      hints.push('Re-analyze the template, or generate again with different element choices.')
    }
    if (engine === 'original' || engine === 'original-fallback' || stageStatus === 'incomplete') {
      hints.push('Engine returned an unbranded image — include more elements or tighten the brief, then generate a new output.')
    }
    if (awaiting && includedCount === 0) {
      hints.push('Opt in to at least one element (Skip is the default), then Generate.')
    }
    if (!templates.length) {
      hints.push('Add one or more meme templates to the queue, select one, then Analyze.')
    } else if (!activeTemplateId) {
      hints.push('Select a template in the queue to brandify.')
    }
    return hints
  }, [stageStatus, brandifyError, engine, awaiting, includedCount, templates.length, activeTemplateId])

  return (
    <div className="space-y-4">
      {/* Workflow chrome */}
      <div className="rounded-lg border border-indigo-800/40 bg-gradient-to-br from-indigo-950/40 via-gray-950/40 to-gray-900/60 p-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs text-indigo-100 font-semibold">Brandify workflow</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Analyze → curate elements → generate. Multiple outputs are saved; set one as current.
            </p>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy || !item}
            onClick={() => {
              if (!onRefreshOutputs) return
              setPhaseBusy('refresh')
              void Promise.resolve(onRefreshOutputs())
                .catch((e) => setLocalError(e instanceof Error ? e.message : 'Refresh failed'))
                .finally(() => setPhaseBusy(null))
            }}
          >
            {phaseBusy === 'refresh' ? <Spinner /> : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['analyze', 'customize', 'processing', 'result'] as const).map((s) => (
            <span
              key={s}
              className={[
                'rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold border',
                workflowStep === s
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-gray-900/80 text-gray-400 border-gray-700',
              ].join(' ')}
            >
              {s === 'processing' && isProcessing ? (
                <span className="inline-flex items-center gap-1">
                  <Spinner className="h-2.5 w-2.5" />
                  {s}
                </span>
              ) : (
                s
              )}
              {s === 'analyze' ? ` · $${visionPrice.toFixed(2)}` : ''}
              {s === 'result' ? ` · $${generatePrice.toFixed(2)}` : ''}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded border border-gray-700 px-1.5 py-0.5 text-gray-300">
            {outputs.length} output{outputs.length === 1 ? '' : 's'}
          </span>
          {counts.done > 0 && (
            <span className={`rounded border px-1.5 py-0.5 ${statusTone('done')}`}>{counts.done} done</span>
          )}
          {counts.processing > 0 && (
            <span className={`rounded border px-1.5 py-0.5 ${statusTone('processing')}`}>
              {counts.processing} in flight
            </span>
          )}
          {counts.awaiting > 0 && (
            <span className={`rounded border px-1.5 py-0.5 ${statusTone('awaiting_choices')}`}>
              {counts.awaiting} awaiting
            </span>
          )}
          {counts.failed > 0 && (
            <span className={`rounded border px-1.5 py-0.5 ${statusTone('failed')}`}>{counts.failed} failed</span>
          )}
          {counts.incomplete > 0 && (
            <span className={`rounded border px-1.5 py-0.5 ${statusTone('incomplete')}`}>
              {counts.incomplete} incomplete
            </span>
          )}
          {item?.meme_template_id && (
            <span className="rounded border border-gray-700 px-1.5 py-0.5 font-mono text-indigo-300">
              {item.meme_template_id}
            </span>
          )}
        </div>
      </div>

      {/* Preview strip */}
      {(previewOriginal || previewGenerated) && (
        <div className="grid sm:grid-cols-2 gap-3 items-start">
          {previewOriginal && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-gray-500">Template / original</p>
              <img
                src={previewOriginal}
                alt="Original template"
                className="max-h-44 w-full object-contain rounded-md border border-gray-600 bg-black"
              />
            </div>
          )}
          {previewGenerated && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-emerald-400">
                Current branded{engine ? ` · ${engine}` : ''}
                {currentOutput?.isCurrent ? ' · live' : ''}
              </p>
              <img
                src={previewGenerated}
                alt="Brandify result"
                className="max-h-44 w-full object-contain rounded-md border border-emerald-700/50 bg-black"
              />
            </div>
          )}
        </div>
      )}

      {(localError || brandifyError) && (
        <div className="rounded-md border border-red-800/50 bg-red-950/30 p-2 space-y-1">
          <p className="text-xs text-red-200 font-medium">Issue</p>
          <p className="text-xs text-red-300">{localError || brandifyError}</p>
        </div>
      )}

      {fixHints.length > 0 && (
        <div className="rounded-md border border-amber-800/40 bg-amber-950/20 p-2 space-y-1">
          <p className="text-[11px] text-amber-100 font-medium">Suggested fixes</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {fixHints.map((h) => (
              <li key={h} className="text-[11px] text-amber-200/90">{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dynamic inputs (templates) + outputs */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-950/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Inputs · templates ({templates.length})
            </p>
            {activeTemplateId && (
              <span className="text-[10px] text-indigo-300 truncate max-w-[140px]" title={activeTemplateId}>
                Active: {templates.find((t) => t.id === activeTemplateId)?.name || activeTemplateId}
              </span>
            )}
          </div>

          <TemplateLibraryPicker
            mode="add"
            selectedIds={templates.map((t) => t.id)}
            disabled={busy}
            compact
            onChange={addTemplate}
          />

          {templates.length === 0 ? (
            <p className="text-xs text-gray-500">
              No templates queued — add from the library or pick one on the Template stage.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {templates.map((t) => {
                const run = templateRunState(t.id, outputs, activeTemplateId, phaseBusy)
                const isActive = activeTemplateId === t.id
                const isRunning = run === 'analyzing' || run === 'processing'
                const outCount = outputs.filter((o) => String(o.templateId || '') === t.id).length
                return (
                  <div
                    key={t.id}
                    className={`flex gap-2 rounded-lg border p-2 transition-colors ${
                      isRunning
                        ? 'border-indigo-400 bg-indigo-950/40 ring-1 ring-indigo-400/50'
                        : isActive
                          ? 'border-indigo-500/70 bg-indigo-950/25'
                          : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex flex-1 gap-2 text-left min-w-0"
                      disabled={busy && !isRunning}
                      onClick={() => selectActiveTemplate(t.id, { name: t.name, category: t.category })}
                    >
                      <img
                        src={templateImageUrl(t.id)}
                        alt=""
                        className="h-14 w-14 shrink-0 object-cover rounded border border-gray-700 bg-black"
                      />
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block text-xs font-semibold text-white truncate">
                          {t.name || t.id}
                        </span>
                        {t.category && (
                          <span className="block text-[10px] text-gray-500 truncate">{t.category}</span>
                        )}
                        <span className="flex flex-wrap gap-1 pt-0.5">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusTone(
                            run === 'selected' || run === 'idle' || run === 'current'
                              ? (run === 'current' ? 'done' : 'incomplete')
                              : run,
                          )}`}>
                            {isRunning && <Spinner className="h-2 w-2 mr-1 align-middle" />}
                            {run === 'selected' ? 'Selected' : run === 'current' ? 'Current live' : run === 'idle' ? 'Queued' : statusLabel(run)}
                          </span>
                          {outCount > 0 && (
                            <span className="text-[9px] text-gray-400 px-1 py-0.5">
                              {outCount} output{outCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        className={`${btnSecondary} !text-[10px] !py-0.5 !px-1.5`}
                        disabled={busy || !isActive}
                        title="Analyze this template"
                        onClick={() => {
                          selectActiveTemplate(t.id, { name: t.name, category: t.category })
                          setLocalError('')
                          setPhaseBusy('analyze')
                          void onAnalyze({
                            customTarget: customTarget || undefined,
                            feedback: feedback.trim() || undefined,
                            templateId: t.id,
                          })
                            .catch((e) => setLocalError(e instanceof Error ? e.message : 'Analyze failed'))
                            .finally(() => setPhaseBusy(null))
                        }}
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-gray-500 hover:text-red-300"
                        disabled={busy}
                        onClick={() => removeTemplate(t.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-950/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Outputs ({filteredOutputs.length}{outputFilter !== 'all' ? ` / ${outputs.length}` : ''})
            </p>
            <select
              className={`${inputCls} !w-auto !py-1 text-[11px]`}
              value={outputFilter}
              disabled={busy}
              onChange={(e) => setOutputFilter(e.target.value)}
            >
              <option value="all">All templates</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.id}
                </option>
              ))}
            </select>
          </div>

          {filteredOutputs.length === 0 ? (
            <p className="text-xs text-gray-500">
              No outputs yet for this filter — analyze &amp; generate to populate the list.
            </p>
          ) : (
            <div className="grid sm:grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredOutputs.map((o) => {
                const active = selectedOutputId === o.id
                const canCurrent = Boolean(o.mediaUrl) && (o.status === 'done' || o.status === 'incomplete')
                const tpl = templates.find((t) => t.id === o.templateId)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOutputId(o.id)
                      if (o.templateId) {
                        setActiveTemplateId(String(o.templateId))
                        setOutputFilter(String(o.templateId))
                      }
                    }}
                    className={`text-left rounded-lg border p-2 space-y-1.5 transition-colors ${
                      active
                        ? 'border-indigo-400 bg-indigo-950/30'
                        : o.isCurrent
                          ? 'border-emerald-700/60 bg-emerald-950/20'
                          : 'border-gray-700 bg-gray-950/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusTone(o.status)}`}>
                        {(o.status === 'processing' || o.status === 'analyzing') && (
                          <Spinner className="h-2 w-2 mr-1 align-middle" />
                        )}
                        {statusLabel(o.status)}
                      </span>
                      {o.isCurrent && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                          Current
                        </span>
                      )}
                      {o.templateId && (
                        <span className="text-[10px] text-indigo-300 truncate max-w-[120px]">
                          {tpl?.name || o.templateId}
                        </span>
                      )}
                      {o.engineUsed && (
                        <span className="text-[10px] text-gray-500">{o.engineUsed}</span>
                      )}
                    </div>
                    {o.mediaUrl ? (
                      <img
                        src={o.mediaUrl}
                        alt={o.label || 'Output'}
                        className="h-24 w-full object-contain rounded border border-gray-700 bg-black"
                      />
                    ) : o.originalImageUrl ? (
                      <img
                        src={o.originalImageUrl}
                        alt="Awaiting generate"
                        className="h-24 w-full object-contain rounded border border-dashed border-amber-700/40 bg-black opacity-70"
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center rounded border border-dashed border-gray-700 text-[11px] text-gray-500">
                        No image yet
                      </div>
                    )}
                    <p className="text-[11px] text-gray-200 truncate">{o.label || o.id.slice(0, 8)}</p>
                    {Array.isArray(o.choices) && o.choices.length > 0 && (
                      <p className="text-[10px] text-gray-500 line-clamp-2">
                        {o.choices.map((c) => `${c.element}: ${c.idea}`).join(' · ')}
                      </p>
                    )}
                    {o.error && (
                      <p className="text-[10px] text-red-300 line-clamp-2">{o.error}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {canCurrent && !o.isCurrent && onSetCurrent && (
                        <span
                          role="button"
                          tabIndex={0}
                          className={`${btnSecondary} !text-[10px] !py-0.5`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPhaseBusy('current')
                            setLocalError('')
                            void onSetCurrent(o.id)
                              .catch((err) => setLocalError(err instanceof Error ? err.message : 'Set current failed'))
                              .finally(() => setPhaseBusy(null))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              setPhaseBusy('current')
                              void onSetCurrent(o.id).finally(() => setPhaseBusy(null))
                            }
                          }}
                        >
                          {phaseBusy === 'current' ? 'Setting…' : 'Use as current'}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <label className="block text-xs text-gray-300">
        Branding brief (optional)
        <input
          className={`${inputCls} mt-1`}
          value={customTarget}
          disabled={busy}
          placeholder="e.g. Subtle $CEO watermark on shirt + hat"
          onChange={(e) => setCustomTarget(e.target.value)}
        />
      </label>

      <label className="block text-xs text-gray-300">
        Re-run feedback (makes the next result different)
        <textarea
          className={`${inputCls} mt-1`}
          rows={2}
          value={feedback}
          disabled={busy}
          placeholder="e.g. Logo too big / wrong placement / looks unbranded / try hat only"
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !activeTemplateId}
          onClick={() => {
            setLocalError('')
            setPhaseBusy('analyze')
            void onAnalyze({
              customTarget: customTarget || undefined,
              feedback: feedback.trim() || undefined,
              templateId: activeTemplateId,
            })
              .catch((e) => setLocalError(e instanceof Error ? e.message : 'Analyze failed'))
              .finally(() => setPhaseBusy(null))
          }}
        >
          {phaseBusy === 'analyze' || stageStatus === 'analyzing' ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Analyzing…
            </span>
          ) : (
            `${sessionId || outputs.length ? 'Re-analyze' : 'Analyze'} selected${feedback.trim() ? ' w/ feedback' : ''} ($${visionPrice.toFixed(2)})`
          )}
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy || !activeTemplateId}
          title="Unattended: rotates ideas when feedback is set"
          onClick={() => {
            setLocalError('')
            setPhaseBusy('auto')
            void onAutoBrandify({
              feedback: feedback.trim() || undefined,
              templateId: activeTemplateId,
            })
              .catch((e) => setLocalError(e instanceof Error ? e.message : 'Auto brandify failed'))
              .finally(() => setPhaseBusy(null))
          }}
        >
          {phaseBusy === 'auto' ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Auto branding…
            </span>
          ) : (
            `Auto brandify selected${feedback.trim() ? ' w/ feedback' : ''} ($${autoPrice.toFixed(2)})`
          )}
        </button>
      </div>

      {/* Element curation */}
      {elements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Curate elements ({includedCount}/{elements.length} included)
            </p>
            {isProcessing ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-indigo-900/50 text-indigo-200 border-indigo-700/50">
                <Spinner className="h-2.5 w-2.5" />
                generating…
              </span>
            ) : awaiting ? (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-amber-900/50 text-amber-200 border-amber-700/50">
                awaiting choices
              </span>
            ) : null}
          </div>
          {isProcessing && (
            <p className="text-[11px] text-indigo-200">
              Brandify generate can take 1–2 minutes. A new output row is saved even if this request fails — refresh to recover state.
            </p>
          )}

          {elements.map((el) => {
            const name = elementName(el)
            const ideas = Array.isArray(el.ideas) ? el.ideas : []
            const selected = selections[name] || SKIP
            return (
              <div key={name} className="rounded-lg border border-gray-600 bg-gray-950/50 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{name}</span>
                  {el.type && <span className="text-[10px] text-gray-500">{el.type}</span>}
                </div>
                {el.reasoning && (
                  <p className="text-[11px] text-gray-400 italic">{el.reasoning}</p>
                )}
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-0.5"
                      name={`brandify-${sessionId || 'draft'}-${name}`}
                      checked={selected === SKIP}
                      disabled={busy}
                      onChange={() => setSelections((s) => ({ ...s, [name]: SKIP }))}
                    />
                    <span>Leave unchanged (skip)</span>
                  </label>
                  {ideas.map((idea) => (
                    <label key={idea} className="flex items-start gap-2 text-xs text-gray-200 cursor-pointer">
                      <input
                        type="radio"
                        className="mt-0.5"
                        name={`brandify-${sessionId || 'draft'}-${name}`}
                        checked={selected === idea}
                        disabled={busy}
                        onChange={() => setSelections((s) => ({ ...s, [name]: idea }))}
                      />
                      <span>{idea}</span>
                    </label>
                  ))}
                  <label className="flex items-start gap-2 text-xs text-gray-200 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-0.5"
                      name={`brandify-${sessionId || 'draft'}-${name}`}
                      checked={selected === CUSTOM}
                      disabled={busy}
                      onChange={() => setSelections((s) => ({ ...s, [name]: CUSTOM }))}
                    />
                    <span className="flex-1 space-y-1">
                      <span className="block">Write your own</span>
                      {selected === CUSTOM && (
                        <input
                          className={inputCls}
                          value={customs[name] || ''}
                          disabled={busy}
                          placeholder="Describe the branding change…"
                          onChange={(e) => setCustoms((c) => ({ ...c, [name]: e.target.value }))}
                        />
                      )}
                    </span>
                  </label>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            className={btnPrimary}
            disabled={busy || includedCount === 0 || !sessionId}
            onClick={() => {
              const choices = buildChoices()
              if (!choices.length) return
              setLocalError('')
              setPhaseBusy('generate')
              void onGenerate(choices, {
                feedback: feedback.trim() || undefined,
                outputId: activeAnalysis?.id || selectedOutputId || undefined,
              })
                .catch((e) => setLocalError(e instanceof Error ? e.message : 'Generate failed'))
                .finally(() => setPhaseBusy(null))
            }}
          >
            {phaseBusy === 'generate' || isProcessing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                Generating branded meme…
              </span>
            ) : (
              `Generate new output${feedback.trim() ? ' w/ feedback' : ''} ($${generatePrice.toFixed(2)})`
            )}
          </button>
        </div>
      )}

      {!elements.length && sessionId && (
        <p className="text-xs text-amber-200">
          Vision returned no brandable elements. Try re-analyze with a clearer brief, or use Auto.
        </p>
      )}

      {/* Caption options snapshot (read-only bridge into caption stage) */}
      {captionOptions.length > 0 && (
        <div className="space-y-2 rounded-lg border border-violet-800/30 bg-violet-950/15 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
            Caption options ({captionOptions.length}) — edit on Caption stage
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {captionOptions.map((opt, i) => (
              <div
                key={String(opt.id || `${opt.top_text}|${opt.bottom_text}|${i}`)}
                className="rounded border border-gray-700 bg-gray-950/60 px-2 py-1.5 text-[11px] text-gray-200"
              >
                <span className="text-gray-500 mr-1">#{opt.rank || i + 1}</span>
                <span className="text-white">{opt.top_text || '—'}</span>
                <span className="text-gray-500"> / </span>
                <span className="text-white">{opt.bottom_text || '—'}</span>
                {opt.humor_tag && (
                  <span className="ml-2 text-gray-500">{opt.humor_tag}</span>
                )}
              </div>
            ))}
          </div>
          {(meta.top_text != null || meta.bottom_text != null) && (
            <p className="text-[11px] text-emerald-300">
              Selected: {String(meta.top_text || '—')} / {String(meta.bottom_text || '—')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
