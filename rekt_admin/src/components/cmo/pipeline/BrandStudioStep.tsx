import { useCallback, useEffect, useState } from 'react'
import {
  cmoApi,
  type BrandProfile,
  type ProductFeature,
} from '../../../services/cmoApi'
import { btnPrimary, btnSecondary, inputCls } from './ResearchStep'

function listToText(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join('\n')
  if (typeof v === 'string') return v
  return ''
}

function textToList(s: string): string[] {
  return s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

const STATUS_CHIP: Record<string, string> = {
  live: 'bg-emerald-900/50 text-emerald-200',
  soon: 'bg-amber-900/50 text-amber-200',
  planned: 'bg-gray-700 text-gray-300',
}

export function BrandStudioStep({
  loading,
  analyzePrice,
  enrichPrice,
  onAnalyze,
  onEnrich,
  error,
}: {
  loading: boolean
  analyzePrice: number
  enrichPrice: number
  onAnalyze: (websiteUrl: string, extraUrls: string[]) => Promise<void>
  onEnrich: (url: string, title?: string) => Promise<Record<string, unknown>>
  error?: string
}) {
  const [brand, setBrand] = useState<BrandProfile | null>(null)
  const [features, setFeatures] = useState<ProductFeature[]>([])
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('https://rektceo.com')
  const [extraUrls, setExtraUrls] = useState('')
  const [doText, setDoText] = useState('')
  const [dontText, setDontText] = useState('')
  const [assetsNotes, setAssetsNotes] = useState('')
  const [editingFeature, setEditingFeature] = useState<Partial<ProductFeature> | null>(null)

  const refresh = useCallback(async () => {
    setBusy(true)
    setLocalError('')
    try {
      const [b, f] = await Promise.all([
        cmoApi.getBrand(),
        cmoApi.listFeatures(),
      ])
      setBrand(b)
      setFeatures(f)
      if (b?.website_url) setWebsiteUrl(b.website_url)
      setDoText(listToText(b?.do_list))
      setDontText(listToText(b?.dont_list))
      const assets = b?.assets || {}
      setAssetsNotes(String(assets.notes || ''))
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveBrand = async () => {
    if (!brand) return
    setBusy(true)
    setLocalError('')
    try {
      const next = await cmoApi.updateBrand({
        name: brand.name,
        tagline: brand.tagline,
        voice: brand.voice,
        tone: brand.tone,
        slogans: brand.slogans,
        website_url: websiteUrl || brand.website_url,
        launch_url: brand.launch_url,
        meme_gen_url: brand.meme_gen_url,
        do_list: textToList(doText),
        dont_list: textToList(dontText),
        assets: {
          ...(brand.assets || {}),
          notes: assetsNotes,
        },
        guidelines: brand.guidelines || {},
      })
      setBrand(next)
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const runAnalyze = async () => {
    setLocalError('')
    try {
      await onAnalyze(
        websiteUrl,
        extraUrls.split('\n').map((u) => u.trim()).filter(Boolean),
      )
      await refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    }
  }

  const saveFeature = async () => {
    if (!editingFeature?.title) return
    setBusy(true)
    setLocalError('')
    try {
      if (editingFeature.id) {
        await cmoApi.updateFeature(editingFeature.id, editingFeature)
      } else {
        await cmoApi.createFeature({
          title: editingFeature.title,
          status: editingFeature.status || 'planned',
          category: editingFeature.category || 'product',
          url: editingFeature.url || null,
          short_description: editingFeature.short_description || null,
          cta_label: editingFeature.cta_label || null,
          cta_url: editingFeature.cta_url || editingFeature.url || null,
          do_follow: editingFeature.do_follow || [],
          dont_follow: editingFeature.dont_follow || [],
          active: editingFeature.active !== false,
          priority: editingFeature.priority ?? 100,
        })
      }
      setEditingFeature(null)
      await refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (f: ProductFeature) => {
    try {
      await cmoApi.updateFeature(f.id, { active: !f.active })
      await refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    }
  }

  const removeFeature = async (id: string) => {
    if (!confirm('Delete this feature?')) return
    try {
      await cmoApi.deleteFeature(id)
      await refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    }
  }

  const enrichOne = async (f: ProductFeature) => {
    if (!f.url) {
      setLocalError('Feature needs a URL to enrich')
      return
    }
    setLocalError('')
    try {
      await onEnrich(f.url, f.title)
      await refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e))
    }
  }

  const disabled = loading || busy

  return (
    <div className="space-y-4">
      {(error || localError) && (
        <p className="text-sm text-red-300 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2">
          {error || localError}
        </p>
      )}

      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-3 text-white">
        <div>
          <h3 className="text-sm font-semibold">Analyze website</h3>
          <p className="text-xs text-gray-300 mt-0.5">
            AgentCash scrapes/search → brand voice, do/don&apos;t, suggested features (~${analyzePrice.toFixed(2)}).
          </p>
        </div>
        <label className="block text-xs text-gray-300">
          Website URL
          <input
            className={`${inputCls} mt-1`}
            value={websiteUrl}
            disabled={disabled}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://rektceo.com"
          />
        </label>
        <label className="block text-xs text-gray-300">
          Extra page URLs (one per line)
          <textarea
            className={`${inputCls} mt-1 font-mono text-xs`}
            rows={2}
            value={extraUrls}
            disabled={disabled}
            onChange={(e) => setExtraUrls(e.target.value)}
          />
        </label>
        <button type="button" className={btnPrimary} disabled={disabled || !websiteUrl.trim()} onClick={() => void runAnalyze()}>
          Analyze brand (${analyzePrice.toFixed(2)})
        </button>
        {brand?.analyzed_at && (
          <p className="text-[11px] text-gray-400">Last analyzed {new Date(brand.analyzed_at).toLocaleString()}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-3 text-white">
        <h3 className="text-sm font-semibold">Brand guidelines</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-xs text-gray-300">
            Name
            <input
              className={`${inputCls} mt-1`}
              value={brand?.name || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), name: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-300">
            Tagline
            <input
              className={`${inputCls} mt-1`}
              value={brand?.tagline || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), tagline: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-300">
            Voice
            <input
              className={`${inputCls} mt-1`}
              value={brand?.voice || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), voice: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-300">
            Tone
            <input
              className={`${inputCls} mt-1`}
              value={brand?.tone || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), tone: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-300">
            Launch URL
            <input
              className={`${inputCls} mt-1`}
              value={brand?.launch_url || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), launch_url: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-300">
            Meme gen URL
            <input
              className={`${inputCls} mt-1`}
              value={brand?.meme_gen_url || ''}
              disabled={disabled}
              onChange={(e) => setBrand((b) => ({ ...(b || {}), meme_gen_url: e.target.value }))}
            />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-xs text-gray-300">
            Do (one per line)
            <textarea className={`${inputCls} mt-1`} rows={5} value={doText} disabled={disabled} onChange={(e) => setDoText(e.target.value)} />
          </label>
          <label className="text-xs text-gray-300">
            Don&apos;t (one per line)
            <textarea className={`${inputCls} mt-1`} rows={5} value={dontText} disabled={disabled} onChange={(e) => setDontText(e.target.value)} />
          </label>
        </div>
        <label className="text-xs text-gray-300">
          Assets notes / URLs
          <textarea className={`${inputCls} mt-1`} rows={3} value={assetsNotes} disabled={disabled} onChange={(e) => setAssetsNotes(e.target.value)} />
        </label>
        <button type="button" className={btnPrimary} disabled={disabled} onClick={() => void saveBrand()}>
          Save guidelines
        </button>
      </div>

      <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 space-y-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Product features</h3>
            <p className="text-xs text-gray-300">Catalog for curation CTAs. Enrich fills do/don&apos;t from URL (~${enrichPrice.toFixed(2)}).</p>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={disabled}
            onClick={() =>
              setEditingFeature({
                title: '',
                status: 'planned',
                category: 'topic',
                active: true,
                priority: 50,
              })
            }
          >
            Add feature
          </button>
        </div>

        {editingFeature && (
          <div className="rounded-lg border border-indigo-700/50 bg-gray-900/60 p-3 space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Title"
                value={editingFeature.title || ''}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, title: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="URL"
                value={editingFeature.url || ''}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, url: e.target.value }))}
              />
              <select
                className={inputCls}
                value={editingFeature.status || 'planned'}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="live">live</option>
                <option value="soon">soon</option>
                <option value="planned">planned</option>
              </select>
              <select
                className={inputCls}
                value={editingFeature.category || 'product'}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="product">product</option>
                <option value="campaign">campaign</option>
                <option value="token">token</option>
                <option value="topic">topic</option>
              </select>
              <input
                className={inputCls}
                placeholder="Short description"
                value={editingFeature.short_description || ''}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, short_description: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="CTA label"
                value={editingFeature.cta_label || ''}
                disabled={disabled}
                onChange={(e) => setEditingFeature((f) => ({ ...f, cta_label: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} disabled={disabled || !editingFeature.title} onClick={() => void saveFeature()}>
                {editingFeature.id ? 'Update' : 'Create'}
              </button>
              <button type="button" className={btnSecondary} disabled={disabled} onClick={() => setEditingFeature(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f.id} className="rounded-lg border border-gray-600 bg-gray-900/40 p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{f.title}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${STATUS_CHIP[f.status] || STATUS_CHIP.planned}`}>
                  {f.status}
                </span>
                <span className="text-[10px] text-gray-400">{f.category}</span>
                {!f.active && <span className="text-[10px] text-red-300">inactive</span>}
              </div>
              {f.short_description && <p className="text-xs text-gray-300">{f.short_description}</p>}
              {f.url && (
                <a href={f.url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-300 hover:underline break-all">
                  {f.url}
                </a>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className={btnSecondary} disabled={disabled} onClick={() => setEditingFeature(f)}>
                  Edit
                </button>
                <button type="button" className={btnSecondary} disabled={disabled} onClick={() => void toggleActive(f)}>
                  {f.active ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className={btnSecondary} disabled={disabled || !f.url} onClick={() => void enrichOne(f)}>
                  Enrich (${enrichPrice.toFixed(2)})
                </button>
                <button type="button" className="text-xs text-red-300 hover:underline" disabled={disabled} onClick={() => void removeFeature(f.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!features.length && <p className="text-sm text-gray-400">No features yet — analyze or add manually.</p>}
        </ul>
      </div>
    </div>
  )
}
