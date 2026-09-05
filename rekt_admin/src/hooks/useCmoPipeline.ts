import { useCallback, useEffect, useState } from 'react'
import {
  cmoApi,
  type ContentItem,
  type ContentPrompt,
  type PaidFetch,
  type PipelineRun,
  type PipelineStep,
  type PostIdea,
  type ResearchConfig,
} from '../services/cmoApi'
import { CMO_PRICES } from './useCmoPayment'
import type { StageKey } from '../components/cmo/pipeline/DayStagePipeline'

const STORAGE_KEY = 'cmo_pipeline_id'

const NEXT_STAGE: Record<StageKey, StageKey | null> = {
  curate: 'select',
  select: 'brandify',
  brandify: 'caption',
  caption: 'compose',
  compose: null,
}

export type PipelineMode = 'manual' | 'auto'
export type ActiveStepId = 'brand' | 'research' | 'strategy' | 'content' | 'schedule' | 'history'

function stepById(run: PipelineRun | null, id: string): PipelineStep | undefined {
  return run?.steps?.find((s) => s.id === id)
}

export function estimatePipelineCostUsd(cfg: ResearchConfig, ideaCount = 7) {
  let total = 0
  if (cfg.includeIntelPack) {
    total += CMO_PRICES.intelPack
  } else {
    if (cfg.includeCompetition) total += CMO_PRICES.competition
    if (cfg.includeTrends) total += CMO_PRICES.trends
    if (cfg.includeKol) total += CMO_PRICES.kol
    if (cfg.includeTopics) total += CMO_PRICES.topics
    if (cfg.includeSocialPulse) total += CMO_PRICES.socialPulse
    if (cfg.includeNewsEvents) total += CMO_PRICES.newsEvents
  }
  total += CMO_PRICES.campaignBrief
  total += CMO_PRICES.dayPackage * Math.max(ideaCount, 1)
  return total
}

function mergeItems(prev: ContentItem[], incoming: ContentItem[]) {
  const map = new Map<string, ContentItem>()
  for (const item of prev) map.set(item.id, item)
  for (const item of incoming) {
    // Prefer replace by suggested_day when upserting
    const day = Number(item.metadata?.suggested_day)
    if (Number.isFinite(day)) {
      for (const [id, existing] of map) {
        if (Number(existing.metadata?.suggested_day) === day && existing.id !== item.id) {
          map.delete(id)
        }
      }
    }
    map.set(item.id, item)
  }
  return Array.from(map.values()).sort(
    (a, b) => Number(a.metadata?.suggested_day || 0) - Number(b.metadata?.suggested_day || 0),
  )
}

export function useCmoPipeline(getPaidFetch: () => Promise<PaidFetch>) {
  const [pipeline, setPipeline] = useState<PipelineRun | null>(null)
  const [mode, setMode] = useState<PipelineMode>('manual')
  const [activeStep, setActiveStep] = useState<ActiveStepId>('brand')
  const [loading, setLoading] = useState(false)
  const [stepLoading, setStepLoading] = useState<string | null>(null)
  const [runningIdeaIndex, setRunningIdeaIndex] = useState<number | null>(null)
  const [activeStageByDay, setActiveStageByDay] = useState<Record<number, StageKey | null>>({})
  const [error, setError] = useState('')
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [resuming, setResuming] = useState(true)

  const researchConfig = (stepById(pipeline, 'research')?.config || {
    handles: ['rekt_ceo'],
    topic: 'Rekt CEO meme season',
    includeCompetition: true,
    includeTrends: true,
    includeKol: false,
    includeTopics: true,
    includeSocialPulse: false,
    includeNewsEvents: true,
    includeIntelPack: false,
    days: 7,
  }) as ResearchConfig

  const strategyDays = Number(
    stepById(pipeline, 'strategy')?.config?.days
    || researchConfig.days
    || 7,
  )

  const refresh = useCallback(async (id: string) => {
    const data = await cmoApi.getPipeline(id)
    setPipeline(data)
    return data
  }, [])

  const applyPipeline = useCallback(async (data: PipelineRun) => {
    sessionStorage.setItem(STORAGE_KEY, data.id)
    setPipeline(data)
    setMode(data.mode === 'auto' ? 'auto' : 'manual')
    const cur = data.steps?.[data.current_step]?.id as ActiveStepId | undefined
    if (cur && cur !== 'history') setActiveStep(cur)
    else if (data.outputs?.research) setActiveStep('research')
    else setActiveStep('research')

    // Prefer live content from enriched session / DB over snapshot
    if (Array.isArray(data.contentItems) && data.contentItems.length) {
      setContentItems(data.contentItems)
      return data
    }
    try {
      const fromDb = await cmoApi.listContent({ pipelineId: data.id, limit: 100 })
      if (fromDb.length) {
        setContentItems(fromDb)
      } else if (Array.isArray(data.outputs?.contentItems)) {
        setContentItems(data.outputs.contentItems as ContentItem[])
      } else {
        setContentItems([])
      }
    } catch {
      if (Array.isArray(data.outputs?.contentItems)) {
        setContentItems(data.outputs.contentItems as ContentItem[])
      }
    }
    return data
  }, [])

  const loadPipeline = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await cmoApi.getPipeline(id)
      await applyPipeline(data)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pipeline')
      throw e
    } finally {
      setLoading(false)
    }
  }, [applyPipeline])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const storedId = sessionStorage.getItem(STORAGE_KEY)
        if (storedId) {
          try {
            const data = await cmoApi.getPipeline(storedId)
            if (!cancelled) await applyPipeline(data)
            return
          } catch {
            sessionStorage.removeItem(STORAGE_KEY)
          }
        }
        // No session — resume most recent pipeline from DB (enriched)
        const recent = await cmoApi.listPipelines({ limit: 1 })
        if (!cancelled && recent[0]) {
          const data = await cmoApi.getPipeline(recent[0].id)
          await applyPipeline(data)
        }
      } catch {
        // empty workshop is fine if list fails (no admin key yet)
      } finally {
        if (!cancelled) setResuming(false)
      }
    })()
    return () => { cancelled = true }
  }, [applyPipeline])

  const create = async (nextMode: PipelineMode, research?: Partial<ResearchConfig>) => {
    setLoading(true)
    setError('')
    try {
      const data = await cmoApi.createPipeline({
        mode: nextMode,
        research: {
          handles: research?.handles || researchConfig.handles,
          topic: research?.topic || researchConfig.topic,
          includeCompetition: research?.includeCompetition ?? true,
          includeTrends: research?.includeTrends ?? true,
          includeKol: research?.includeKol ?? false,
          includeTopics: research?.includeTopics ?? true,
          includeSocialPulse: research?.includeSocialPulse ?? false,
          includeNewsEvents: research?.includeNewsEvents ?? true,
          includeIntelPack: research?.includeIntelPack ?? false,
          days: research?.days ?? researchConfig.days ?? 7,
        },
      })
      await applyPipeline(data)
      setActiveStep('research')
      setContentItems([])
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create pipeline')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const updateResearchConfig = async (cfg: Partial<ResearchConfig>) => {
    if (!pipeline) return
    const data = await cmoApi.updatePipeline(pipeline.id, { researchConfig: cfg })
    setPipeline(data)
  }

  const setDays = async (days: number) => {
    if (!pipeline) return
    const data = await cmoApi.updatePipeline(pipeline.id, { days })
    setPipeline(data)
  }

  const runResearch = async (configOverride?: Partial<ResearchConfig>) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('research')
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const cfg = { ...researchConfig, ...configOverride } as ResearchConfig
      const handles = (cfg.handles || []).map((h) => String(h).replace(/^@/, '').trim()).filter(Boolean)
      const research: Record<string, unknown> = {}
      const runIds: string[] = []

      const pushPartial = (patch: Record<string, unknown>) => {
        Object.assign(research, patch)
        setPipeline((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            outputs: {
              ...(prev.outputs || {}),
              research: { ...(prev.outputs?.research || {}), ...research },
            },
          }
        })
      }

      if (cfg.includeIntelPack) {
        setStepLoading('research-intel')
        const intel = await cmoApi.runIntelPack({
          topic: cfg.topic,
          handles,
          pipelineId: pipeline.id,
        }, { paidFetch })
        const patch: Record<string, unknown> = { intel }
        if (intel.run_id) runIds.push(String(intel.run_id))
        if (Array.isArray(intel.seo_keywords)) patch.seo_keywords = intel.seo_keywords
        if (Array.isArray(intel.geo_keywords)) patch.geo_keywords = intel.geo_keywords
        if (intel.news) patch.news = intel.news
        if (intel.social) patch.social = intel.social
        if (intel.topics) patch.topics = intel.topics
        pushPartial(patch)
      } else {
        if (cfg.includeCompetition) {
          setStepLoading('research-competition')
          if (!handles.length) throw new Error('Add at least one handle for competition research')
          const competition = await cmoApi.runCompetition(handles, { paidFetch }, true, {
            pipelineId: pipeline.id,
          })
          if (competition.run_id) runIds.push(String(competition.run_id))
          pushPartial({ competition })
        }
        if (cfg.includeTrends) {
          setStepLoading('research-trends')
          const trends = await cmoApi.runTrends(cfg.topic, { paidFetch }, { pipelineId: pipeline.id })
          pushPartial({ trends })
        }
        if (cfg.includeKol) {
          setStepLoading('research-kol')
          if (!handles.length) throw new Error('Add handles for KOL research')
          const kol = await cmoApi.runKolResearch(handles, { paidFetch }, undefined, {
            pipelineId: pipeline.id,
          })
          if (kol.run_id) runIds.push(String(kol.run_id))
          pushPartial({ kol })
        }
        if (cfg.includeTopics) {
          setStepLoading('research-topics')
          const topics = await cmoApi.runTopics(cfg.topic, { paidFetch }, undefined, {
            pipelineId: pipeline.id,
          })
          if (topics.run_id) runIds.push(String(topics.run_id))
          pushPartial({
            topics,
            seo_keywords: topics.seo_keywords,
            geo_keywords: topics.geo_keywords,
          })
        }
        if (cfg.includeSocialPulse) {
          setStepLoading('research-social')
          const social = await cmoApi.runSocialPulse({
            handles,
            topic: cfg.topic,
            pipelineId: pipeline.id,
          }, { paidFetch })
          if (social.run_id) runIds.push(String(social.run_id))
          pushPartial({ social })
        }
        if (cfg.includeNewsEvents) {
          setStepLoading('research-news')
          const news = await cmoApi.runNewsEvents(cfg.topic, { paidFetch }, {
            pipelineId: pipeline.id,
          })
          if (news.run_id) runIds.push(String(news.run_id))
          pushPartial({ news })
        }
      }
      if (!Object.keys(research).length) {
        throw new Error('Enable at least one research source')
      }

      setStepLoading('research-finalize')
      const data = await cmoApi.completeResearchStep(pipeline.id, {
        research,
        runIds,
        days: strategyDays,
      })
      setPipeline(data)
      if (mode === 'manual') setActiveStep('strategy')
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Research failed'
      setError(msg)
      try {
        if (pipeline) setPipeline(await cmoApi.failPipelineStep(pipeline.id, 'research', msg))
      } catch { /* ignore */ }
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const saveStrategyPrompt = async (prompt: string) => {
    if (!pipeline) return
    const data = await cmoApi.updatePipeline(pipeline.id, { strategyPrompt: prompt })
    setPipeline(data)
  }

  const runStrategy = async () => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('strategy')
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const strategyStep = stepById(pipeline, 'strategy')
      const prompt = strategyStep?.promptEditable || strategyStep?.autoPrompt || undefined
      const days = Number(strategyStep?.config?.days || researchConfig.days || 7)
      const brief = await cmoApi.getCampaignBrief(days, 'meme_ugc', { paidFetch }, {
        research_context: pipeline.outputs?.research,
        research_run_ids: strategyStep?.runIds,
        prompt,
        pipelineId: pipeline.id,
      })
      if (!Array.isArray(brief.post_ideas) || !brief.post_ideas.length) {
        throw new Error('Strategy returned no post_ideas')
      }
      const data = await cmoApi.completeStrategyStep(pipeline.id, {
        strategy: brief,
        runIds: brief.run_id ? [brief.run_id] : [],
        strategyPrompt: prompt,
      })
      setPipeline(data)
      if (mode === 'manual') setActiveStep('content')
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Strategy failed'
      setError(msg)
      try {
        if (pipeline) setPipeline(await cmoApi.failPipelineStep(pipeline.id, 'strategy', msg))
      } catch { /* ignore */ }
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const savePostIdeas = async (ideas: PostIdea[]) => {
    if (!pipeline) return
    const data = await cmoApi.updatePipeline(pipeline.id, { post_ideas: ideas })
    setPipeline(data)
  }

  const saveContentPrompts = async (prompts: ContentPrompt[]) => {
    if (!pipeline) return
    const data = await cmoApi.updatePipeline(pipeline.id, { contentPrompts: prompts })
    setPipeline(data)
  }

  const finalizeContentStep = async (items: ContentItem[], failedIdeas: number[] = []) => {
    if (!pipeline) return null
    const partial = failedIdeas.length > 0 && items.length > 0
    if (!items.length) throw new Error('No content drafts produced')
    setContentItems(items)
    const data = await cmoApi.completeContentStep(pipeline.id, {
      contentIds: items.map((i) => i.id),
      contentItems: items,
      partial,
      failedIdeas,
      error: partial ? `Failed ideas: ${failedIdeas.join(', ')}` : undefined,
    })
    setPipeline(data)
    return data
  }

  const runContentDay = async (ideaIndex: number) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('content')
    setRunningIdeaIndex(ideaIndex)
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      if (!p) throw new Error('Content prompt not found for this day')

      const result = await cmoApi.runDayPackage({
        pipelineId: pipeline.id,
        ideaIndex,
        prompt: p.promptEditable || p.autoPrompt,
        intensity: p.intensity || 'savage',
        audience: p.audience || 'ct',
        templateId: p.templateId || null,
        featureIds: p.featureIds || [],
      }, { paidFetch })

      if (!result?.item) {
        throw new Error('Day package returned no content item')
      }

      let items: ContentItem[] = []
      setContentItems((prev) => {
        items = mergeItems(prev, [result.item])
        return items
      })
      setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'compose' }))
      await finalizeContentStep(items)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Day package failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runContent = async () => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('content')
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      if (!prompts.length) throw new Error('No content prompts — complete strategy first')

      const promptsMap: Record<number, {
        promptEditable?: string
        intensity?: string
        audience?: string
        featureIds?: string[]
      }> = {}
      const templateOverrides: Record<number, string> = {}
      const intensities: Record<number, string> = {}
      const audiences: Record<number, string> = {}
      for (const p of prompts) {
        promptsMap[p.ideaIndex] = {
          promptEditable: p.promptEditable,
          intensity: p.intensity || 'savage',
          audience: p.audience || 'ct',
          featureIds: p.featureIds || [],
        }
        intensities[p.ideaIndex] = p.intensity || 'savage'
        audiences[p.ideaIndex] = p.audience || 'ct'
        if (p.templateId) templateOverrides[p.ideaIndex] = p.templateId
      }

      const batch = await cmoApi.runBatchPackage(
        {
          pipelineId: pipeline.id,
          ideaIndexes: prompts.map((p) => p.ideaIndex),
          prompts: promptsMap,
          templateOverrides,
          intensities,
          audiences,
        },
        prompts.length,
        { paidFetch },
      )

      const items = mergeItems([], batch.items || [])
      const failedIdeas = (batch.failed || []).map((f) => f.ideaIndex)
      if (!items.length) throw new Error('All day packages failed')
      await finalizeContentStep(items, failedIdeas)
      setActiveStep('schedule')
      return batch
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Content failed'
      setError(msg)
      try {
        if (pipeline) setPipeline(await cmoApi.failPipelineStep(pipeline.id, 'content', msg))
      } catch { /* ignore */ }
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const patchDraft = async (id: string, body_text: string) => {
    const item = await cmoApi.patchContent(id, { body_text })
    setContentItems((prev) => prev.map((c) => (c.id === id ? item : c)))
    return item
  }

  const scheduleAll = async (items: { id: string; scheduled_at: string }[]) => {
    if (!pipeline) throw new Error('No pipeline')
    setStepLoading('schedule')
    setError('')
    try {
      const data = await cmoApi.schedulePipeline(pipeline.id, items)
      setPipeline(data)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed')
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const runAuto = async () => {
    setError('')
    let data = pipeline
    if (!data) {
      data = await create('auto')
    } else if (data.mode !== 'auto') {
      data = await cmoApi.updatePipeline(data.id, { mode: 'auto' })
      setPipeline(data)
      setMode('auto')
    }
    await runResearch()
    await runStrategy()
    await runContent()
  }

  const mergeStageItem = (item?: ContentItem | null) => {
    if (!item) return
    setContentItems((prev) => mergeItems(prev, [item]))
  }

  const refreshSessionArtifacts = async (pipelineId: string) => {
    try {
      const data = await cmoApi.getPipeline(pipelineId)
      setPipeline(data)
      if (Array.isArray(data.contentItems) && data.contentItems.length) {
        setContentItems(data.contentItems)
      } else if (Array.isArray(data.outputs?.contentItems)) {
        setContentItems(data.outputs.contentItems as ContentItem[])
      }
    } catch {
      // keep local state
    }
  }

  const focusNextStage = (ideaIndex: number, completed: StageKey) => {
    const next = NEXT_STAGE[completed]
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: next || completed }))
  }

  const runStageCurate = async (ideaIndex: number, opts?: { feedback?: string }) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('curate')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'curate' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const result = await cmoApi.curateContent({
        pipelineId: pipeline.id,
        ideaIndex,
        prompt: p?.promptEditable || p?.autoPrompt,
        featureIds: p?.featureIds || [],
        feedback: opts?.feedback,
      }, { paidFetch })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'curate')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Curate failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runStageSelect = async (ideaIndex: number) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('select')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'select' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const result = await cmoApi.selectTemplate({
        pipelineId: pipeline.id,
        ideaIndex,
        templateId: p?.templateId || null,
      }, { paidFetch })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'select')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Select template failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runBrandifyVision = async (
    ideaIndex: number,
    opts?: { customTarget?: string; feedback?: string; templateId?: string | null },
  ) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('brandify-vision')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'brandify' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const dayItem = contentItems.find(
        (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
      )
      const templateId = opts?.templateId !== undefined
        ? opts.templateId
        : (p?.templateId || dayItem?.meme_template_id || null)
      const result = await cmoApi.brandifyVision({
        pipelineId: pipeline.id,
        ideaIndex,
        templateId,
        customTarget: opts?.customTarget,
        feedback: opts?.feedback,
      }, { paidFetch })
      mergeStageItem(result.item)
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Brandify analyze failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runBrandifyGenerate = async (
    ideaIndex: number,
    userCuratedChoices: Array<{ element: string; idea: string; isCustom?: boolean }>,
    opts?: { feedback?: string; outputId?: string },
  ) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('brandify-generate')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'brandify' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const dayItem = contentItems.find(
        (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
      )
      const sessionId = String(
        dayItem?.brandify_session_id
        || (dayItem?.metadata?.stages as Record<string, { sessionId?: string }> | undefined)?.brandify?.sessionId
        || '',
      )
      const originalImageUrl = String(
        dayItem?.metadata?.brandify_original_url
        || (dayItem?.metadata?.stages as Record<string, { originalImageUrl?: string }> | undefined)?.brandify?.originalImageUrl
        || '',
      ) || undefined
      const result = await cmoApi.brandifyGenerate({
        pipelineId: pipeline.id,
        ideaIndex,
        sessionId: sessionId || undefined,
        originalImageUrl,
        userCuratedChoices,
        feedback: opts?.feedback,
        outputId: opts?.outputId,
      }, { paidFetch })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'brandify')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Brandify generate failed'
      setError(msg)
      // Refresh so failed/processing rows from the server are visible
      try { await refreshSessionArtifacts(pipeline.id) } catch { /* ignore */ }
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const setBrandifyOutputCurrent = async (ideaIndex: number, outputId: string) => {
    const contentStep = stepById(pipeline, 'content')
    const prompts = contentStep?.contentPrompts || []
    const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
    const dayItem = contentItems.find(
      (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
    )
    if (!dayItem) throw new Error('No draft yet — analyze a template first')
    setStepLoading('brandify-current')
    setError('')
    try {
      const result = await cmoApi.setBrandifyOutputCurrent({
        contentItemId: dayItem.id,
        outputId,
      })
      mergeStageItem(result.item)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to set current output'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const saveBrandifyDraft = async (
    ideaIndex: number,
    draft: {
      selections?: Record<string, string>
      customs?: Record<string, string>
      customTarget?: string | null
      feedback?: string | null
      outputId?: string
      templates?: Array<{ id: string; name?: string; category?: string; addedAt?: string }>
      activeTemplateId?: string | null
    },
  ) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    const contentStep = stepById(pipeline, 'content')
    const prompts = contentStep?.contentPrompts || []
    const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
    const dayItem = contentItems.find(
      (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
    )
    try {
      const result = await cmoApi.saveBrandifyDraft({
        contentItemId: dayItem?.id,
        pipelineId: pipeline.id,
        ideaIndex,
        outputId: draft.outputId,
        draftSelections: {
          selections: draft.selections || {},
          customs: draft.customs || {},
        },
        customTarget: draft.customTarget,
        feedback: draft.feedback,
        templates: draft.templates,
        activeTemplateId: draft.activeTemplateId,
      })
      if (result.item) mergeStageItem(result.item)
      if (draft.activeTemplateId !== undefined && pipeline) {
        const nextPrompts = (prompts || []).map((x) =>
          x.ideaIndex === ideaIndex
            ? { ...x, templateId: draft.activeTemplateId || null }
            : x,
        )
        await cmoApi.updatePipeline(pipeline.id, { contentPrompts: nextPrompts })
      }
      return result
    } catch (e) {
      // Non-fatal for mid-edit persistence — surface quietly
      console.warn('saveBrandifyDraft failed', e)
      return null
    }
  }

  const refreshBrandifyOutputs = async (ideaIndex: number) => {
    const contentStep = stepById(pipeline, 'content')
    const prompts = contentStep?.contentPrompts || []
    const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
    const dayItem = contentItems.find(
      (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
    )
    if (!dayItem) return []
    const result = await cmoApi.syncBrandifyOutputs(dayItem.id)
    if (result.item) mergeStageItem(result.item)
    return result.outputs || []
  }

  const runStageBrandify = async (
    ideaIndex: number,
    opts?: { feedback?: string; templateId?: string | null },
  ) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('brandify')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'brandify' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const dayItem = contentItems.find(
        (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
      )
      const result = await cmoApi.brandifyContent({
        pipelineId: pipeline.id,
        ideaIndex,
        templateId: opts?.templateId !== undefined
          ? opts.templateId
          : (p?.templateId || dayItem?.meme_template_id || null),
        feedback: opts?.feedback,
      }, { paidFetch })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'brandify')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Brandify failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runStageCaption = async (ideaIndex: number, opts?: { feedback?: string }) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('caption')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'caption' }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const result = await cmoApi.captionContent({
        pipelineId: pipeline.id,
        ideaIndex,
        intensity: p?.intensity || 'savage',
        audience: p?.audience || 'ct',
        feedback: opts?.feedback,
      }, { paidFetch })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'caption')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Caption failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runStageCompose = async (ideaIndex: number, extras?: { top_text?: string; bottom_text?: string }) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('content')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'compose' }))
    setError('')
    try {
      const dayItem = contentItems.find((c) => Number(c.metadata?.ideaIndex) === ideaIndex)
        || contentItems.find((c) => {
          const prompts = stepById(pipeline, 'content')?.contentPrompts || []
          const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
          return Number(c.metadata?.suggested_day) === Number(p?.suggested_day)
        })
      const result = await cmoApi.composeContent({
        pipelineId: pipeline.id,
        ideaIndex,
        top_text: extras?.top_text ?? (dayItem?.metadata?.top_text as string | undefined),
        bottom_text: extras?.bottom_text ?? (dayItem?.metadata?.bottom_text as string | undefined),
      })
      mergeStageItem(result.item)
      focusNextStage(ideaIndex, 'compose')
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Compose failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const runFromStage = async (ideaIndex: number, fromStage: StageKey) => {
    if (!pipeline) throw new Error('Create a pipeline first')
    setStepLoading('content')
    setRunningIdeaIndex(ideaIndex)
    setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: fromStage }))
    setError('')
    try {
      const paidFetch = await getPaidFetch()
      const contentStep = stepById(pipeline, 'content')
      const prompts = contentStep?.contentPrompts || []
      const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
      const dayItem = contentItems.find(
        (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
      )
      const result = await cmoApi.runFromStage({
        pipelineId: pipeline.id,
        ideaIndex,
        fromStage,
        prompt: p?.promptEditable || p?.autoPrompt,
        templateId: p?.templateId || (dayItem?.meme_template_id as string | null) || null,
        intensity: p?.intensity || 'savage',
        audience: p?.audience || 'ct',
        featureIds: p?.featureIds || [],
        ideate: (dayItem?.metadata?.ideate as Record<string, unknown>) || undefined,
        top_text: dayItem?.metadata?.top_text as string | undefined,
        bottom_text: dayItem?.metadata?.bottom_text as string | undefined,
      }, { paidFetch })
      mergeStageItem(result.item)
      setActiveStageByDay((prev) => ({ ...prev, [ideaIndex]: 'compose' }))
      await refreshSessionArtifacts(pipeline.id)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Run-from-stage failed'
      setError(msg)
      throw e
    } finally {
      setStepLoading(null)
      setRunningIdeaIndex(null)
    }
  }

  const saveStageEdits = async (
    ideaIndex: number,
    patch: {
      ideate?: Record<string, unknown>
      templateId?: string | null
      top_text?: string
      bottom_text?: string
      body_text?: string
      caption_option?: Record<string, unknown> | null
    },
  ) => {
    const contentStep = stepById(pipeline, 'content')
    const prompts = contentStep?.contentPrompts || []
    const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
    const dayItem = contentItems.find(
      (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
    )
    if (!dayItem) throw new Error('No draft yet — run curate first')

    const prevStages = (dayItem.metadata?.stages || {}) as Record<string, Record<string, unknown>>
    const captionStage = { ...(prevStages.caption || {}) }
    if (patch.top_text !== undefined) captionStage.top_text = patch.top_text
    if (patch.bottom_text !== undefined) captionStage.bottom_text = patch.bottom_text
    if (patch.caption_option !== undefined) captionStage.option = patch.caption_option

    const metadata = {
      ...(dayItem.metadata || {}),
      ...(patch.ideate ? { ideate: { ...(dayItem.metadata?.ideate as object || {}), ...patch.ideate } } : {}),
      ...(patch.templateId !== undefined ? { templateId: patch.templateId } : {}),
      ...(patch.top_text !== undefined ? { top_text: patch.top_text } : {}),
      ...(patch.bottom_text !== undefined ? { bottom_text: patch.bottom_text } : {}),
      ...(patch.caption_option !== undefined ? { caption_option: patch.caption_option } : {}),
      ...(patch.ideate
        ? {
          stages: {
            ...prevStages,
            curate: {
              ...(prevStages.curate || {}),
              status: (prevStages.curate?.status as string) || 'done',
              at: new Date().toISOString(),
              ideate: { ...(dayItem.metadata?.ideate as object || {}), ...patch.ideate },
            },
            ...(patch.top_text !== undefined || patch.bottom_text !== undefined || patch.caption_option !== undefined
              ? {
                caption: {
                  ...captionStage,
                  status: captionStage.status || 'done',
                  at: new Date().toISOString(),
                },
              }
              : {}),
          },
        }
        : (patch.top_text !== undefined || patch.bottom_text !== undefined || patch.caption_option !== undefined
          ? {
            stages: {
              ...prevStages,
              caption: {
                ...captionStage,
                status: captionStage.status || 'done',
                at: new Date().toISOString(),
              },
            },
          }
          : {})),
    }

    const item = await cmoApi.patchContent(dayItem.id, {
      metadata,
      ...(patch.body_text !== undefined ? { body_text: patch.body_text } : {}),
      ...(patch.templateId !== undefined ? { meme_template_id: patch.templateId || undefined } : {}),
    })
    mergeStageItem(item)

    if (patch.templateId !== undefined && pipeline) {
      const nextPrompts = (prompts || []).map((x) =>
        x.ideaIndex === ideaIndex ? { ...x, templateId: patch.templateId || null } : x,
      )
      await cmoApi.updatePipeline(pipeline.id, { contentPrompts: nextPrompts })
    }
    return item
  }

  const scheduleDay = async (ideaIndex: number, scheduled_at: string) => {
    if (!pipeline) throw new Error('No pipeline')
    const contentStep = stepById(pipeline, 'content')
    const prompts = contentStep?.contentPrompts || []
    const p = prompts.find((x) => x.ideaIndex === ideaIndex) || prompts[ideaIndex]
    const dayItem = contentItems.find(
      (c) => Number(c.metadata?.suggested_day) === Number(p?.suggested_day),
    )
    if (!dayItem) throw new Error('No draft yet — finish brandify + caption first')
    setStepLoading('schedule')
    setError('')
    try {
      const data = await cmoApi.schedulePipeline(pipeline.id, [{ id: dayItem.id, scheduled_at }])
      setPipeline(data)
      const scheduledRows = (data.outputs?.scheduled || []) as ContentItem[]
      if (scheduledRows.length) {
        setContentItems((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]))
          for (const row of scheduledRows) byId.set(row.id, { ...byId.get(row.id), ...row })
          return [...byId.values()]
        })
      } else {
        mergeStageItem({ ...dayItem, status: 'scheduled', scheduled_at })
      }
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed')
      throw e
    } finally {
      setStepLoading(null)
    }
  }

  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setPipeline(null)
    setContentItems([])
    setActiveStageByDay({})
    setActiveStep('research')
    setError('')
  }

  return {
    pipeline,
    mode,
    setMode,
    activeStep,
    setActiveStep,
    loading,
    stepLoading,
    runningIdeaIndex,
    activeStageByDay,
    error,
    setError,
    contentItems,
    setContentItems,
    researchConfig,
    strategyDays,
    resuming,
    create,
    loadPipeline,
    applyPipeline,
    updateResearchConfig,
    setDays,
    runResearch,
    saveStrategyPrompt,
    runStrategy,
    savePostIdeas,
    saveContentPrompts,
    runContent,
    runContentDay,
    runStageCurate,
    runStageSelect,
    runStageBrandify,
    runBrandifyVision,
    runBrandifyGenerate,
    setBrandifyOutputCurrent,
    saveBrandifyDraft,
    refreshBrandifyOutputs,
    runStageCaption,
    runStageCompose,
    runFromStage,
    saveStageEdits,
    patchDraft,
    scheduleAll,
    scheduleDay,
    runAuto,
    reset,
    refresh,
    estimateCost: () => estimatePipelineCostUsd(
      researchConfig,
      stepById(pipeline, 'content')?.contentPrompts?.length
        || pipeline?.outputs?.strategy?.post_ideas?.length
        || strategyDays
        || 7,
    ),
  }
}
