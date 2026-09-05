import { useState, type ReactNode } from 'react'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function labelize(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">—</span>
  }
  if (typeof value === 'boolean') {
    return <span className="text-emerald-300">{value ? 'yes' : 'no'}</span>
  }
  if (typeof value === 'number') {
    return <span className="text-sky-300 font-mono">{value}</span>
  }
  const s = String(value)
  if (/^https?:\/\//i.test(s)) {
    return (
      <a href={s} target="_blank" rel="noreferrer" className="text-indigo-300 hover:underline break-all">
        {s}
      </a>
    )
  }
  return <span className="text-white break-words whitespace-pre-wrap">{s}</span>
}

function ArrayTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  ).slice(0, 8)

  if (!keys.length) {
    return <p className="text-sm text-gray-300">Empty list</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-600">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-900/80 text-gray-200">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-2 py-1.5 font-semibold whitespace-nowrap">
                {labelize(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-700 odd:bg-gray-900/40">
              {keys.map((k) => (
                <td key={k} className="px-2 py-1.5 align-top max-w-[220px]">
                  {isPlainObject(row[k]) || Array.isArray(row[k]) ? (
                    <details>
                      <summary className="cursor-pointer text-indigo-300">View</summary>
                      <div className="mt-1">
                        <ArtifactNode value={row[k]} depth={1} />
                      </div>
                    </details>
                  ) : (
                    <Primitive value={row[k]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArtifactNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-sm text-gray-400">Empty list</p>
    if (value.every(isPlainObject)) {
      return <ArrayTable rows={value as Record<string, unknown>[]} />
    }
    return (
      <ul className="space-y-1 list-disc list-inside text-sm text-white">
        {value.map((item, i) => (
          <li key={i}>
            {isPlainObject(item) || Array.isArray(item) ? (
              <ArtifactNode value={item} depth={depth + 1} />
            ) : (
              <Primitive value={item} />
            )}
          </li>
        ))}
      </ul>
    )
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (!entries.length) return <p className="text-sm text-gray-400">Empty object</p>
    return (
      <div className={`space-y-2 ${depth > 0 ? 'pl-2 border-l border-gray-600' : ''}`}>
        {entries.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-gray-900/50 border border-gray-700/80 p-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-300 mb-1">
              {labelize(k)}
            </div>
            <ArtifactNode value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <p className="text-sm">
      <Primitive value={value} />
    </p>
  )
}

export function ArtifactView({
  data,
  title,
  actions,
  defaultRawOpen = false,
}: {
  data: unknown
  title?: string
  actions?: ReactNode
  defaultRawOpen?: boolean
}) {
  const [rawOpen, setRawOpen] = useState(defaultRawOpen)

  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800/80 p-4 text-white">
      <div className="flex items-center justify-between gap-2 mb-3">
        {title ? <h3 className="text-sm font-semibold text-white">{title}</h3> : <span />}
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            className="text-[11px] text-gray-300 hover:text-white underline"
            onClick={() => setRawOpen((v) => !v)}
          >
            {rawOpen ? 'Hide raw JSON' : 'View raw JSON'}
          </button>
        </div>
      </div>
      <ArtifactNode value={data} />
      {rawOpen && (
        <pre className="mt-3 text-xs text-gray-100 bg-black/40 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap border border-gray-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function ArtifactSection({
  title,
  data,
}: {
  title: string
  data: unknown
}) {
  if (data == null) return null
  return <ArtifactView title={title} data={data} />
}
