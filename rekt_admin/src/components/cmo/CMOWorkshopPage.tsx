import { useCallback, useEffect, useState } from 'react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { AgentCashWalletPanel } from './AgentCashWalletPanel'
import { HistoryPanel } from './HistoryPanel'
import { useCmoPayment, formatUsd } from '../../hooks/useCmoPayment'
import { useCmoPipeline } from '../../hooks/useCmoPipeline'
import { cmoApi, type ContentItem, type ContentPrompt, type PipelineRun, type PostIdea, type StrategyRun } from '../../services/cmoApi'
import { PipelineProgress, StepRail } from './pipeline/PipelineChrome'
import { ResearchStep } from './pipeline/ResearchStep'
import { ContentStep, ScheduleStep, StrategyStep, defaultSchedules } from './pipeline/OtherSteps'
import { BrandStudioStep } from './pipeline/BrandStudioStep'
import { chainPriceFrom, type StageKey } from './pipeline/DayStagePipeline'

export function CMOWorkshopPage() {
  const { open } = useWeb3Modal()
  const payment = useCmoPayment()

  const getPaidFetch = useCallback(async () => {
    if (!payment.isConnected) {
      open()
      throw new Error('Connect your wallet, then retry. Paid steps use USDC on Base.')
    }
    await payment.ensurePaymentReady(payment.prices.dayPackage)
    if (!payment.paidFetch) {
      throw new Error('Wallet not ready for x402. Reconnect and switch to Base.')
    }
    return payment.paidFetch
  }, [payment, open])

  const pipe = useCmoPipeline(getPaidFetch)
  const [strategyPrompt, setStrategyPrompt] = useState('')
  const [ideas, setIdeas] = useState<PostIdea[]>([])
  const [contentPrompts, setContentPrompts] = useState<ContentPrompt[]>([])
  const [schedules, setSchedules] = useState<Record<string, string>>({})
  const [historyRuns, setHistoryRuns] = useState<StrategyRun[]>([])
  const [historyPipelines, setHistoryPipelines] = useState<PipelineRun[]>([])
  const [historyDrafts, setHistoryDrafts] = useState<ContentItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [uiBusy, setUiBusy] = useState(false)
  const stepBusy = uiBusy || !!pipe.stepLoading

  useEffect(() => {
    const strat = pipe.pipeline?.steps?.find((s) => s.id === 'strategy')
    if (strat?.promptEditable != null) setStrategyPrompt(strat.promptEditable)
    else if (strat?.autoPrompt) setStrategyPrompt(strat.autoPrompt)

    const postIdeas = pipe.pipeline?.outputs?.strategy?.post_ideas
    if (Array.isArray(postIdeas)) setIdeas(postIdeas)

    const cp = pipe.pipeline?.steps?.find((s) => s.id === 'content')?.contentPrompts
    if (Array.isArray(cp)) setContentPrompts(cp)
  }, [pipe.pipeline])

  useEffect(() => {
    if (pipe.contentItems.length) {
      setSchedules((prev) => {
        if (Object.keys(prev).length) return prev
        return defaultSchedules(pipe.contentItems as { id: string; metadata?: { suggested_day?: number } }[])
      })
    }
  }, [pipe.contentItems])

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const [pipelines, runs, drafts] = await Promise.all([
        cmoApi.listPipelines({ limit: 40 }),
        cmoApi.listResearchRuns({ limit: 80 }),
        cmoApi.listContent({ limit: 80 }),
      ])
      setHistoryPipelines(pipelines)
      setHistoryRuns(runs)
      setHistoryDrafts(drafts)
    } catch {
      setHistoryPipelines([])
      setHistoryRuns([])
      setHistoryDrafts([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (pipe.activeStep !== 'history') return
    void refreshHistory()
  }, [pipe.activeStep, refreshHistory])

  // Prefetch pipeline list for empty state
  useEffect(() => {
    if (pipe.pipeline || pipe.resuming) return
    cmoApi.listPipelines({ limit: 8 }).then(setHistoryPipelines).catch(() => {})
  }, [pipe.pipeline, pipe.resuming])

  const runUi = async (fn: () => Promise<void>) => {
    setUiBusy(true)
    pipe.setError('')
    try {
      await fn()
    } catch (e) {
      pipe.setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUiBusy(false)
    }
  }

  const ensureWalletPaid = async (requiredUsd: number) => {
    if (!payment.isConnected) {
      open()
      throw new Error('Connect your wallet on Base with USDC, then click again.')
    }
    await payment.ensurePaymentReady(requiredUsd)
    if (!payment.paidFetch) {
      throw new Error('Wallet not ready for x402. Reconnect and switch to Base.')
    }
  }

  const researchDone = pipe.pipeline?.steps?.find((s) => s.id === 'research')?.status === 'done'
  const strategyDone = ['done'].includes(pipe.pipeline?.steps?.find((s) => s.id === 'strategy')?.status || '')
  const contentDone = ['done', 'partial'].includes(pipe.pipeline?.steps?.find((s) => s.id === 'content')?.status || '')
  const scheduleDone = pipe.pipeline?.status === 'completed'

  const onRunResearch = async () => {
    const cfg = pipe.researchConfig
    let need = 0
    if (cfg.includeIntelPack) {
      need = payment.prices.intelPack
    } else {
      need =
        (cfg.includeCompetition ? payment.prices.competition : 0)
        + (cfg.includeTrends ? payment.prices.trends : 0)
        + (cfg.includeKol ? payment.prices.kol : 0)
        + (cfg.includeTopics ? payment.prices.topics : 0)
        + (cfg.includeSocialPulse ? payment.prices.socialPulse : 0)
        + (cfg.includeNewsEvents ? payment.prices.newsEvents : 0)
    }
    if (!need) need = payment.prices.trends
    await ensureWalletPaid(need)
    await pipe.runResearch()
    void payment.refetchUsdcBalance()
  }

  const onRunStrategy = async () => {
    if (strategyPrompt) await pipe.saveStrategyPrompt(strategyPrompt)
    await ensureWalletPaid(payment.prices.campaignBrief)
    await pipe.runStrategy()
    void payment.refetchUsdcBalance()
  }

  const onRunContentAll = async () => {
    if (contentPrompts.length) await pipe.saveContentPrompts(contentPrompts)
    await ensureWalletPaid(payment.prices.dayPackage * Math.max(contentPrompts.length, 1))
    await pipe.runContent()
    void payment.refetchUsdcBalance()
  }

  const onRunContentDay = async (ideaIndex: number) => {
    if (contentPrompts.length) await pipe.saveContentPrompts(contentPrompts)
    await ensureWalletPaid(payment.prices.dayPackage)
    await pipe.runContentDay(ideaIndex)
    void payment.refetchUsdcBalance()
  }

  const onRunStage = async (
    stage: StageKey,
    ideaIndex: number,
    opts?: { feedback?: string },
  ) => {
    if (contentPrompts.length) await pipe.saveContentPrompts(contentPrompts)
    const priceMap: Record<StageKey, number> = {
      curate: payment.prices.curate,
      select: payment.prices.selectTemplate,
      brandify: payment.prices.brandify,
      caption: payment.prices.caption,
      compose: 0,
    }
    if (priceMap[stage] > 0) await ensureWalletPaid(priceMap[stage])
    if (stage === 'curate') await pipe.runStageCurate(ideaIndex, opts)
    else if (stage === 'select') await pipe.runStageSelect(ideaIndex)
    else if (stage === 'brandify') await pipe.runStageBrandify(ideaIndex, opts)
    else if (stage === 'caption') await pipe.runStageCaption(ideaIndex, opts)
    else await pipe.runStageCompose(ideaIndex)
    void payment.refetchUsdcBalance()
  }

  const onRunFromStage = async (from: StageKey, ideaIndex: number) => {
    if (contentPrompts.length) await pipe.saveContentPrompts(contentPrompts)
    const cost = chainPriceFrom(from, {
      curate: payment.prices.curate,
      selectTemplate: payment.prices.selectTemplate,
      brandify: payment.prices.brandify,
      brandifyVision: payment.prices.brandifyVision,
      brandifyGenerate: payment.prices.brandifyGenerate,
      caption: payment.prices.caption,
    })
    if (cost > 0) await ensureWalletPaid(cost)
    await pipe.runFromStage(ideaIndex, from)
    void payment.refetchUsdcBalance()
  }

  const onSaveStageEdits = async (
    ideaIndex: number,
    patch: {
      ideate?: Record<string, unknown>
      templateId?: string | null
      top_text?: string
      bottom_text?: string
      body_text?: string
    },
  ) => {
    await pipe.saveStageEdits(ideaIndex, patch)
  }

  const onAuto = async () => {
    await ensureWalletPaid(pipe.estimateCost())
    await pipe.runAuto()
    void payment.refetchUsdcBalance()
  }

  const onOpenPipeline = async (id: string) => {
    await pipe.loadPipeline(id)
    setSchedules({})
    void refreshHistory()
  }

  const onGoToStep = async (
    step: 'research' | 'strategy' | 'content' | 'schedule',
    pipelineId?: string,
  ) => {
    if (pipelineId && pipelineId !== pipe.pipeline?.id) {
      await pipe.loadPipeline(pipelineId)
      setSchedules({})
    }
    pipe.setActiveStep(step)
  }

  const onRerunFromHistory = async (run: StrategyRun) => {
    if (!pipe.pipeline) {
      const latest = historyPipelines[0]
      if (latest) await pipe.loadPipeline(latest.id)
      else await pipe.create(pipe.mode)
    }
    const t = run.type || ''
    if (t.includes('campaign') || t.includes('brief')) {
      pipe.setActiveStep('strategy')
      await onRunStrategy()
      return
    }
    if (
      t.includes('content_')
      || t.includes('day_')
      || t.includes('caption')
      || t.includes('brandify')
      || t.includes('curate')
    ) {
      pipe.setActiveStep('content')
      return
    }

    const patch = {
      includeCompetition: t.includes('competition'),
      includeTrends: t.includes('trend'),
      includeKol: t.includes('kol') && !t.includes('opportunities'),
      includeTopics: t.includes('topic'),
      includeSocialPulse: t.includes('social'),
      includeNewsEvents: t.includes('news'),
      includeIntelPack: t.includes('intel'),
    }
    // If nothing matched, default to trends
    if (!Object.values(patch).some(Boolean)) {
      patch.includeTrends = true
    }
    await pipe.updateResearchConfig(patch)
    pipe.setActiveStep('research')
    const need =
      (patch.includeIntelPack ? payment.prices.intelPack : 0)
      || (
        (patch.includeCompetition ? payment.prices.competition : 0)
        + (patch.includeTrends ? payment.prices.trends : 0)
        + (patch.includeKol ? payment.prices.kol : 0)
        + (patch.includeTopics ? payment.prices.topics : 0)
        + (patch.includeSocialPulse ? payment.prices.socialPulse : 0)
        + (patch.includeNewsEvents ? payment.prices.newsEvents : 0)
      )
      || payment.prices.trends
    await ensureWalletPaid(need)
    await pipe.runResearch(patch)
    void payment.refetchUsdcBalance()
  }

  if (pipe.resuming) {
    return <div className="text-sm text-gray-300 py-12 text-center">Resuming pipeline…</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 text-white">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">CMO Pipeline</h2>
          <p className="text-sm text-gray-300 mt-0.5">
            Research → Strategy → Content (meme packages) → Schedule. Pay per hop with USDC on Base.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {payment.isConnected ? (
              <>
                <span className="font-medium text-white">{payment.shortAddress}</span>
                {payment.isOnBase ? (
                  <span className="text-emerald-300">Base</span>
                ) : (
                  <button type="button" className="text-amber-300 hover:underline" onClick={() => payment.ensureBaseChain().catch((e) => pipe.setError(e.message))}>
                    Switch to Base
                  </button>
                )}
                {payment.usdcBalance != null && <span>{payment.usdcBalance.toFixed(2)} USDC</span>}
                <span className="text-gray-400">· est. {formatUsd(pipe.estimateCost())}</span>
              </>
            ) : (
              <button type="button" onClick={() => open()} className="text-indigo-300 hover:underline font-medium">
                Connect wallet for paid steps
              </button>
            )}
          </div>
        </div>
        <div className="sm:w-72 shrink-0">
          <AgentCashWalletPanel />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-gray-800 p-1">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pipe.setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${
                pipe.mode === m
                  ? 'bg-gray-700 shadow text-indigo-300'
                  : 'text-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={pipe.loading || stepBusy}
          onClick={() => pipe.create(pipe.mode)}
        >
          New pipeline
        </button>
        {pipe.mode === 'auto' && (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg border border-indigo-400 text-indigo-300 hover:bg-indigo-900/20 disabled:opacity-50"
            disabled={pipe.loading || stepBusy}
            onClick={() => void runUi(onAuto)}
          >
            Start auto-run
          </button>
        )}
        {pipe.pipeline && (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-500 text-white hover:bg-gray-700 disabled:opacity-50"
            disabled={pipe.loading || stepBusy}
            onClick={() => void runUi(async () => {
              if (!pipe.pipeline?.id) return
              await pipe.loadPipeline(pipe.pipeline.id)
            })}
          >
            Refresh
          </button>
        )}
        {pipe.pipeline && (
          <button type="button" className="text-xs text-gray-300 hover:underline" onClick={pipe.reset}>
            Clear session
          </button>
        )}
        {pipe.pipeline && (
          <span className="text-[10px] font-mono text-gray-400">{pipe.pipeline.id.slice(0, 8)} · {pipe.pipeline.status}</span>
        )}
      </div>

      {pipe.pipeline && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-xs text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Session stored in Supabase
          </span>
          <span>
            research: {pipe.pipeline.outputs?.research ? 'saved' : '—'}
          </span>
          <span>
            ideas: {Array.isArray(pipe.pipeline.outputs?.strategy?.post_ideas)
              ? pipe.pipeline.outputs.strategy.post_ideas.length
              : 0}
          </span>
          <span>
            drafts: {pipe.contentItems.length
              || pipe.pipeline.session?.content_count
              || pipe.pipeline.outputs?.contentItems?.length
              || 0}
          </span>
          <span>
            linked runs: {pipe.pipeline.strategyRuns?.length
              || pipe.pipeline.session?.run_count
              || 0}
          </span>
          {pipe.pipeline.metadata?.last_content_sync_at != null && (
            <span className="text-gray-500">
              synced {new Date(String(pipe.pipeline.metadata.last_content_sync_at)).toLocaleString()}
            </span>
          )}
        </div>
      )}

      <StepRail
        steps={pipe.pipeline?.steps || []}
        activeStep={pipe.activeStep}
        onSelect={pipe.setActiveStep}
        stepLoading={stepBusy ? (pipe.stepLoading || pipe.activeStep) : null}
      />

      <PipelineProgress stepLoading={stepBusy ? (pipe.stepLoading || 'wallet') : null} mode={pipe.mode} />

      {pipe.error && (
        <div className="flex gap-2 text-sm text-red-200 bg-red-900/30 border border-red-800/50 p-3 rounded-lg">
          <span>⚠</span>
          <span className="flex-1">{pipe.error}</span>
          <button type="button" className="text-xs underline text-white" onClick={() => pipe.setError('')}>Dismiss</button>
        </div>
      )}

      {!pipe.pipeline && pipe.activeStep !== 'history' && pipe.activeStep !== 'brand' && (
        <div className="rounded-xl border border-dashed border-gray-600 p-8 space-y-4 text-center">
          <p className="text-sm text-gray-300">
            Create a pipeline or open a saved one from History. Past research, strategy, and drafts stay in the database.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white"
              onClick={() => pipe.create(pipe.mode)}
            >
              Create {pipe.mode} pipeline
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-lg border border-gray-500 text-white"
              onClick={() => pipe.setActiveStep('history')}
            >
              Browse history
            </button>
          </div>
          {historyPipelines.length > 0 && (
            <div className="text-left max-w-lg mx-auto space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-300">Recent pipelines</p>
              {historyPipelines.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-600 bg-gray-900/50 hover:bg-gray-800 text-sm"
                  onClick={() => void runUi(() => onOpenPipeline(p.id))}
                >
                  <span className="font-mono text-indigo-300">{p.id.slice(0, 8)}</span>
                  <span className="text-gray-400 ml-2">{p.status}</span>
                  {p.updated_at && (
                    <span className="text-gray-500 text-xs ml-2">{new Date(p.updated_at).toLocaleString()}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pipe.activeStep === 'brand' && (
        <BrandStudioStep
          loading={stepBusy}
          analyzePrice={payment.prices.brandAnalyze}
          enrichPrice={payment.prices.featureEnrich}
          error={pipe.error || undefined}
          onAnalyze={async (websiteUrl, extraUrls) => {
            await ensureWalletPaid(payment.prices.brandAnalyze)
            const paidFetch = await getPaidFetch()
            await cmoApi.analyzeBrand({ websiteUrl, extraUrls, persistFeatures: true }, { paidFetch })
            void payment.refetchUsdcBalance()
          }}
          onEnrich={async (url, title) => {
            await ensureWalletPaid(payment.prices.featureEnrich)
            const paidFetch = await getPaidFetch()
            const data = await cmoApi.enrichFeature({ url, title }, { paidFetch })
            void payment.refetchUsdcBalance()
            return data
          }}
        />
      )}

      {pipe.pipeline && pipe.activeStep === 'research' && (
        <ResearchStep
          config={pipe.researchConfig}
          onChange={(c) => pipe.updateResearchConfig(c)}
          onRun={() => void runUi(onRunResearch)}
          onApprove={() => pipe.setActiveStep('strategy')}
          loading={stepBusy}
          researchDone={!!researchDone}
          researchOutput={pipe.pipeline.outputs?.research}
          estimatedCost={pipe.estimateCost()}
          mode={pipe.mode}
        />
      )}

      {pipe.pipeline && pipe.activeStep === 'strategy' && (
        <StrategyStep
          prompt={strategyPrompt}
          onPromptChange={(v) => {
            setStrategyPrompt(v)
            void pipe.saveStrategyPrompt(v)
          }}
          ideas={ideas}
          onIdeasChange={(next) => {
            setIdeas(next)
            void pipe.savePostIdeas(next)
          }}
          strategyBrief={pipe.pipeline.outputs?.strategy || null}
          days={pipe.strategyDays}
          onDaysChange={(n) => void pipe.setDays(n)}
          onRun={() => void runUi(onRunStrategy)}
          onApprove={() => pipe.setActiveStep('content')}
          loading={stepBusy}
          strategyDone={!!strategyDone}
          mode={pipe.mode}
        />
      )}

      {pipe.pipeline && pipe.activeStep === 'content' && (
        <ContentStep
          prompts={contentPrompts}
          onPromptsChange={(p) => {
            setContentPrompts(p)
            void pipe.saveContentPrompts(p)
          }}
          items={pipe.contentItems}
          onPatchBody={(id, body) => {
            void pipe.patchDraft(id, body).catch((e) => pipe.setError(e.message))
          }}
          onRunDay={(i) => void runUi(() => onRunContentDay(i))}
          onRunAll={() => void runUi(onRunContentAll)}
          onStage={(stage, i, opts) => void runUi(() => onRunStage(stage, i, opts))}
          onRunFromStage={(from, i) => void runUi(() => onRunFromStage(from, i))}
          onBrandifyAnalyze={(i, opts) =>
            runUi(async () => {
              await ensureWalletPaid(payment.prices.brandifyVision)
              await pipe.runBrandifyVision(i, opts)
              void payment.refetchUsdcBalance()
            })
          }
          onBrandifyGenerate={(i, choices, opts) =>
            runUi(async () => {
              await ensureWalletPaid(payment.prices.brandifyGenerate)
              await pipe.runBrandifyGenerate(i, choices, opts)
              void payment.refetchUsdcBalance()
            })
          }
          onBrandifyAuto={(i, opts) =>
            runUi(async () => {
              await ensureWalletPaid(payment.prices.brandify)
              await pipe.runStageBrandify(i, opts)
              void payment.refetchUsdcBalance()
            })
          }
          onBrandifySetCurrent={(i, outputId) =>
            runUi(async () => {
              await pipe.setBrandifyOutputCurrent(i, outputId)
            })
          }
          onBrandifySaveDraft={(i, draft) => pipe.saveBrandifyDraft(i, draft)}
          onBrandifyRefresh={(i) => pipe.refreshBrandifyOutputs(i)}
          onSaveStageEdits={(i, patch) => runUi(() => onSaveStageEdits(i, patch))}
          onScheduleDay={(i, scheduledAt) =>
            runUi(async () => {
              await pipe.scheduleDay(i, scheduledAt)
              setSchedules((s) => {
                const dayItem = pipe.contentItems.find((c) => {
                  const prompts = pipe.pipeline?.steps?.find((st) => st.id === 'content')?.contentPrompts || []
                  const p = prompts.find((x) => x.ideaIndex === i) || prompts[i]
                  return Number(c.metadata?.suggested_day) === Number(p?.suggested_day)
                })
                if (!dayItem) return s
                return { ...s, [dayItem.id]: scheduledAt }
              })
            })
          }
          activeStageByDay={pipe.activeStageByDay}
          stageRuns={pipe.pipeline.strategyRuns || []}
          onApprove={() => pipe.setActiveStep('schedule')}
          loading={stepBusy}
          contentDone={!!contentDone}
          mode={pipe.mode}
          dayPackagePrice={payment.prices.dayPackage}
          stagePrices={{
            curate: payment.prices.curate,
            selectTemplate: payment.prices.selectTemplate,
            brandify: payment.prices.brandify,
            brandifyVision: payment.prices.brandifyVision,
            brandifyGenerate: payment.prices.brandifyGenerate,
            caption: payment.prices.caption,
          }}
          runningIndex={pipe.runningIdeaIndex}
          failedIdeas={pipe.pipeline.steps?.find((s) => s.id === 'content')?.failedIdeas || []}
          pipelineId={pipe.pipeline.id}
        />
      )}

      {pipe.pipeline && pipe.activeStep === 'schedule' && (
        <ScheduleStep
          items={pipe.contentItems}
          schedules={schedules}
          onScheduleChange={(id, iso) => setSchedules((s) => ({ ...s, [id]: iso }))}
          onConfirm={() => {
            const items = pipe.contentItems
              .filter((c) => schedules[c.id])
              .map((c) => ({ id: c.id, scheduled_at: schedules[c.id] }))
            void runUi(async () => {
              await pipe.scheduleAll(items)
            })
          }}
          loading={stepBusy}
          completed={!!scheduleDone}
        />
      )}

      {pipe.activeStep === 'history' && (
        <HistoryPanel
          pipelines={historyPipelines}
          runs={historyRuns}
          drafts={historyDrafts}
          loading={historyLoading}
          activePipelineId={pipe.pipeline?.id}
          onOpenPipeline={(id) => void runUi(() => onOpenPipeline(id))}
          onRerunResearch={(run) => void runUi(() => onRerunFromHistory(run))}
          onGoToStep={(step, id) => void runUi(() => onGoToStep(step, id))}
        />
      )}
    </div>
  )
}

export default CMOWorkshopPage
