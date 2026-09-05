import { useEffect, useMemo, useState } from 'react'
import type { ContentItem } from '../../../services/cmoApi'
import { btnPrimary, btnSecondary, inputCls } from './ResearchStep'
import { MemeCaptionPreview } from './MemeCaptionPreview'

export type CaptionOption = {
  id?: string
  top_text?: string
  bottom_text?: string
  humor_tag?: string
  humor_pattern_used?: string
  intensity?: string
  ranking_score?: number
  why_funny?: string
  rank?: number
}

function optionKey(opt: CaptionOption, index: number) {
  return String(opt.id || `${opt.top_text || ''}|${opt.bottom_text || ''}|${index}`)
}

function scorePct(opt: CaptionOption) {
  const n = Number(opt.ranking_score)
  if (!Number.isFinite(n)) return null
  return Math.round((n <= 1 ? n * 100 : n))
}

export function CaptionCuratePanel({
  item,
  loading,
  captionPrice,
  topText,
  bottomText,
  onTopChange,
  onBottomChange,
  onRunCaption,
  onSaveSelection,
  onSaveToCalendar,
}: {
  item?: ContentItem | null
  loading: boolean
  captionPrice: number
  topText: string
  bottomText: string
  onTopChange: (v: string) => void
  onBottomChange: (v: string) => void
  onRunCaption: (opts?: { feedback?: string }) => void
  onSaveSelection: (patch: {
    top_text: string
    bottom_text: string
    caption_option?: CaptionOption | null
  }) => Promise<void> | void
  onSaveToCalendar?: (scheduledAt: string) => Promise<void> | void
}) {
  const meta = (item?.metadata || {}) as Record<string, unknown>
  const stage = ((meta.stages as Record<string, unknown> | undefined)?.caption || {}) as Record<string, unknown>
  const imageUrl = String(item?.media_url || (meta.stages as Record<string, Record<string, unknown>> | undefined)?.brandify?.media_url || '')
  const options = useMemo(() => {
    const fromMeta = Array.isArray(meta.caption_options) ? meta.caption_options : []
    const fromStage = Array.isArray(stage.all_options) ? stage.all_options : []
    const raw = (fromMeta.length ? fromMeta : fromStage) as CaptionOption[]
    return raw.filter((o) => o && (o.top_text || o.bottom_text))
  }, [meta.caption_options, stage.all_options])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [scheduleLocal, setScheduleLocal] = useState('')
  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (!options.length) {
      setSelectedKey(null)
      return
    }
    const match = options.findIndex(
      (o) => String(o.top_text || '') === topText && String(o.bottom_text || '') === bottomText,
    )
    if (match >= 0) setSelectedKey(optionKey(options[match], match))
    else if (!selectedKey) setSelectedKey(optionKey(options[0], 0))
  }, [options, topText, bottomText])

  useEffect(() => {
    if (scheduleLocal) return
    const d = new Date()
    d.setDate(d.getDate() + (Number(meta.suggested_day) || 1))
    d.setHours(15, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    setScheduleLocal(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    )
  }, [meta.suggested_day, scheduleLocal])

  const selectOption = (opt: CaptionOption, index: number) => {
    setSelectedKey(optionKey(opt, index))
    onTopChange(String(opt.top_text || ''))
    onBottomChange(String(opt.bottom_text || ''))
  }

  const busy = loading || saving || scheduling

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-800/40 bg-violet-950/20 p-3 space-y-1">
        <p className="text-xs text-violet-100 font-medium">
          Caption like Meme Lab — pick an option, preview overlay on the branded image, then save to calendar
        </p>
        <p className="text-[11px] text-gray-400">
          Generate ranked caption options (~${captionPrice.toFixed(2)}), then choose the one that fits.
        </p>
      </div>

      {!imageUrl && (
        <p className="text-xs text-amber-200">Brandify first — caption overlays need the branded image.</p>
      )}

      {imageUrl && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Live preview</p>
          <MemeCaptionPreview
            imageUrl={imageUrl}
            topText={topText}
            bottomText={bottomText}
            maxHeightClass="max-h-72"
          />
        </div>
      )}

      <label className="block text-xs text-gray-300">
        Re-run feedback
        <textarea
          className={`${inputCls} mt-1`}
          rows={2}
          value={feedback}
          disabled={busy}
          placeholder="e.g. Too soft / need CT slang / punchier bottom"
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>

      <button
        type="button"
        className={btnPrimary}
        disabled={busy || !imageUrl}
        onClick={() => onRunCaption({ feedback: feedback.trim() || undefined })}
      >
        {loading ? 'Generating captions…' : `${options.length ? 'Re-generate' : 'Generate'} captions ($${captionPrice.toFixed(2)})`}
      </button>

      {options.length > 0 && imageUrl && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Pick a caption ({options.length} options)
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {options.map((opt, i) => {
              const key = optionKey(opt, i)
              const pct = scorePct(opt)
              return (
                <div key={key} className="space-y-1.5">
                  <MemeCaptionPreview
                    imageUrl={imageUrl}
                    topText={String(opt.top_text || '')}
                    bottomText={String(opt.bottom_text || '')}
                    compact
                    maxHeightClass="max-h-40"
                    selected={selectedKey === key}
                    onClick={() => selectOption(opt, i)}
                    badge={
                      <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        #{opt.rank || i + 1}
                        {pct != null ? ` · ${pct}%` : ''}
                      </span>
                    }
                  />
                  <p className="text-[10px] text-gray-400 line-clamp-2">
                    {opt.humor_tag || opt.humor_pattern_used || opt.intensity || 'meme'}
                    {opt.why_funny ? ` — ${opt.why_funny}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block text-xs text-gray-300">
          Top text
          <input
            className={`${inputCls} mt-1`}
            value={topText}
            disabled={busy}
            onChange={(e) => {
              setSelectedKey(null)
              onTopChange(e.target.value)
            }}
          />
        </label>
        <label className="block text-xs text-gray-300">
          Bottom text
          <input
            className={`${inputCls} mt-1`}
            value={bottomText}
            disabled={busy}
            onChange={(e) => {
              setSelectedKey(null)
              onBottomChange(e.target.value)
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={busy || !item || (!topText && !bottomText)}
          onClick={() => {
            const idx = options.findIndex((o, i) => optionKey(o, i) === selectedKey)
            const opt = idx >= 0 ? options[idx] : { top_text: topText, bottom_text: bottomText }
            setSaving(true)
            void Promise.resolve(
              onSaveSelection({
                top_text: topText,
                bottom_text: bottomText,
                caption_option: opt,
              }),
            ).finally(() => setSaving(false))
          }}
        >
          {saving ? 'Saving…' : 'Save selected caption'}
        </button>
      </div>

      {onSaveToCalendar && item && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 space-y-2">
          <p className="text-xs font-medium text-emerald-100">Save to calendar</p>
          <p className="text-[11px] text-gray-400">
            Locks this day’s branded image + selected caption onto the schedule (manual publish only).
          </p>
          <label className="block text-xs text-gray-300">
            Schedule time
            <input
              type="datetime-local"
              className={`${inputCls} mt-1`}
              value={scheduleLocal}
              disabled={busy}
              onChange={(e) => setScheduleLocal(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || !scheduleLocal || (!topText && !bottomText && !imageUrl)}
            onClick={() => {
              const iso = new Date(scheduleLocal).toISOString()
              setScheduling(true)
              void Promise.resolve(
                onSaveSelection({
                  top_text: topText,
                  bottom_text: bottomText,
                  caption_option: { top_text: topText, bottom_text: bottomText },
                }),
              )
                .then(() => onSaveToCalendar(iso))
                .finally(() => setScheduling(false))
            }}
          >
            {scheduling ? 'Scheduling…' : 'Save selection to calendar'}
          </button>
        </div>
      )}
    </div>
  )
}
