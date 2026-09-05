import { useEffect, useMemo, useState } from 'react'
import { cmoApi, type MemeTemplate } from '../../../services/cmoApi'
import { btnSecondary, inputCls } from './ResearchStep'

function adminKey() {
  return localStorage.getItem('rekt_admin_key') || import.meta.env.VITE_ADMIN_API_KEY || ''
}

export function templateImageUrl(id: string) {
  const base = (import.meta.env.VITE_BRANDIFY_API_URL || 'http://localhost:3001').replace(/\/$/, '')
  const key = adminKey()
  const qs = key ? `?admin_key=${encodeURIComponent(key)}` : ''
  return `${base}/api/cmo/templates/${encodeURIComponent(id)}/image${qs}`
}

export function TemplateLibraryPicker({
  value,
  onChange,
  disabled,
  compact = false,
  mode = 'single',
  selectedIds,
}: {
  value?: string | null
  onChange: (templateId: string | null, meta?: { name?: string; category?: string }) => void
  disabled?: boolean
  compact?: boolean
  /** single = replace selection; add = keep library open and call onChange for each pick */
  mode?: 'single' | 'add'
  /** Highlight already-queued templates in add mode */
  selectedIds?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [items, setItems] = useState<MemeTemplate[]>([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')

  const selectedSet = useMemo(() => new Set(selectedIds || (value ? [value] : [])), [selectedIds, value])

  const load = async (opts?: { category?: string; q?: string }) => {
    setLoading(true)
    setError('')
    try {
      const data = await cmoApi.listTemplates({
        category: opts?.category || undefined,
        q: opts?.q || undefined,
        limit: 160,
      })
      setItems(data.items || [])
      setCategories(data.categories || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void load({ category, q })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedLabel = useMemo(() => {
    const hit = items.find((t) => t.id === value)
    return hit?.name || value || ''
  }, [items, value])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? 'Hide library'
            : mode === 'add'
              ? 'Add templates from library'
              : 'Browse template library'}
        </button>
        {mode === 'single' && value && (
          <>
            <span className="text-xs text-indigo-300 truncate max-w-[200px]" title={value}>
              {selectedLabel}
            </span>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-white"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Clear (auto)
            </button>
          </>
        )}
      </div>

      {mode === 'single' && value && !compact && (
        <img
          src={templateImageUrl(value)}
          alt={selectedLabel}
          className="max-h-28 rounded border border-gray-600"
        />
      )}

      {open && (
        <div className="rounded-lg border border-gray-600 bg-gray-950/60 p-3 space-y-2">
          {mode === 'add' && (
            <p className="text-[11px] text-gray-400">
              Click templates to add them to the brandify queue. Already queued items stay highlighted.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <select
              className={`${inputCls} w-auto min-w-[140px]`}
              value={category}
              disabled={loading || disabled}
              onChange={(e) => {
                setCategory(e.target.value)
                void load({ category: e.target.value, q })
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              className={`${inputCls} flex-1 min-w-[140px]`}
              placeholder="Search templates…"
              value={q}
              disabled={loading || disabled}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load({ category, q })
              }}
            />
            <button
              type="button"
              className={btnSecondary}
              disabled={loading || disabled}
              onClick={() => void load({ category, q })}
            >
              Search
            </button>
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
          {loading && (
            <p className="text-xs text-gray-400 inline-flex items-center gap-2">
              <span className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading library…
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-auto">
            {items.map((t, i) => {
              const queued = selectedSet.has(t.id)
              const active = mode === 'single' ? t.id === value : queued
              return (
                <button
                  key={`${t.id}-${t.relativePath || t.filename || i}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(t.id, { name: t.name, category: t.category })
                    if (mode === 'single') setOpen(false)
                  }}
                  className={`text-left rounded-lg border p-1.5 transition-colors ${
                    active
                      ? 'border-indigo-400 bg-indigo-950/40 ring-1 ring-indigo-500/40'
                      : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                  }`}
                  title={t.name}
                >
                  <img
                    src={templateImageUrl(t.id)}
                    alt=""
                    className="w-full h-16 object-cover rounded bg-gray-800"
                    loading="lazy"
                  />
                  <span className="block text-[10px] text-white truncate mt-1">{t.name}</span>
                  <span className="block text-[9px] text-gray-500 truncate">{t.category}</span>
                  {mode === 'add' && queued && (
                    <span className="mt-0.5 inline-block text-[9px] uppercase font-bold text-indigo-300">
                      In queue
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {!loading && !items.length && (
            <p className="text-xs text-gray-500">No templates match.</p>
          )}
        </div>
      )}
    </div>
  )
}
