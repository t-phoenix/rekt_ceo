import { useEffect, useMemo, useState } from 'react'
import {
  api,
  setAdminKey,
  type CampaignDef,
  type GateConfig,
  type GateKey,
  type LaunchAnalyticsSummary,
  type LaunchHubLayout,
  type OnchainRule,
  type VerificationMode,
  type XMissionTaskConfig,
  type XMissionTaskKind,
  type XpRewardsConfig,
  type XRulePreset,
} from '../services/api'

const MISSION_KINDS: XMissionTaskKind[] = ['mention', 'meme_image', 'friend_tags', 'hashtags']

function defaultTasksForRules(rules: XRulePreset['rules']): XMissionTaskConfig[] {
  const out: XMissionTaskConfig[] = [
    {
      id: 'mention',
      label: 'Mention @rekt_ceo',
      kind: 'mention',
      required: true,
      xp: 60,
      mention: rules.mention,
    },
    {
      id: 'meme_image',
      label: 'Attach a meme image',
      kind: 'meme_image',
      required: true,
      xp: 40,
    },
  ]
  if (rules.minFriendTags > 0) {
    out.push({
      id: 'friend_tags',
      label: `Tag ${rules.minFriendTags} friends`,
      kind: 'friend_tags',
      required: false,
      xp: 30,
      minFriendTags: rules.minFriendTags,
    })
  }
  if (rules.hashtags?.length) {
    out.push({
      id: 'hashtags',
      label: 'Campaign hashtags',
      kind: 'hashtags',
      required: false,
      xp: 30,
      hashtags: [...rules.hashtags],
    })
  }
  return out
}

const DEFAULT_BLOCK_TYPES = [
  'SeasonStripBlock',
  'EligibilityBannerBlock',
  'IdentityChecklistBlock',
  'XPSummaryBlock',
  'DailyCheckinBlock',
  'DailySpinBlock',
  'XShareTaskBlock',
  'CampaignListBlock',
  'LeaderboardBlock',
  'ConnectGuideBlock',
  'InviteCodeBlock',
  'GapCreativeBlock',
]

const ID_RE = /^[a-z0-9-_.]+$/i
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/

function defaultRule(kind: OnchainRule['kind']): OnchainRule {
  if (kind === 'erc721_min_balance') {
    return { kind: 'erc721_min_balance', contract: '0x0000000000000000000000000000000000000000', minCount: 1 }
  }
  if (kind === 'erc721_owner_of') {
    return { kind: 'erc721_owner_of', contract: '0x0000000000000000000000000000000000000000', tokenId: '0' }
  }
  return {
    kind: 'erc20_min_balance',
    token: '0x0000000000000000000000000000000000000000',
    thresholdHuman: '1',
  }
}

function normalizeCampaignForEditor(c: CampaignDef): CampaignDef {
  if (c.schemaVersion === 2) {
    const label = (c.ctaLabel || c.cta || 'OPEN').trim()
    return {
      ...c,
      chainId: c.chainId ?? 8453,
      xpReward: c.xpReward ?? 0,
      verificationMode: c.verificationMode ?? 'none',
      ctaLabel: label,
      cta: label,
      minHoldSeconds: c.minHoldSeconds ?? 86_400,
    }
  }
  const label = (c.cta || 'OPEN').trim()
  return {
    schemaVersion: 2,
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    status: c.status,
    rewardText: c.rewardText,
    cta: label,
    ctaLabel: label,
    actionUrl: c.actionUrl,
    color: c.color ?? 'yellow',
    iconKey: c.iconKey ?? 'meme',
    xpReward: 0,
    chainId: 8453,
    verificationMode: 'none',
    minHoldSeconds: 86_400,
  }
}

function validateCampaignRows(rows: CampaignDef[]): string | null {
  for (const row of rows) {
    if (!row.id?.trim() || !ID_RE.test(row.id.trim())) {
      return `Invalid campaign id "${row.id}" (use letters, numbers, -, _).`
    }
    const mode = row.verificationMode ?? 'none'
    if (mode === 'snapshot' || mode === 'held_window') {
      if ((row.xpReward ?? 0) <= 0) {
        return `${row.id}: XP reward must be positive for on-chain verification.`
      }
      const r = row.rule
      if (!r) {
        return `${row.id}: On-chain rule is required.`
      }
      if (r.kind === 'erc20_min_balance') {
        if (!ADDR_RE.test(r.token)) return `${row.id}: ERC20 token must be a checksummed 0x address.`
        if (!r.thresholdHuman?.trim()) return `${row.id}: ERC20 threshold (human decimal) required.`
        if (
          r.decimalsOverride != null &&
          (r.decimalsOverride < 0 || r.decimalsOverride > 77)
        )
          return `${row.id}: decimalsOverride must be 0–77.`
      } else if (r.kind === 'erc721_min_balance') {
        if (!ADDR_RE.test(r.contract)) return `${row.id}: ERC721 contract must be a valid 0x address.`
        if (!Number.isFinite(r.minCount) || r.minCount < 1) return `${row.id}: minCount must be ≥ 1.`
      } else if (r.kind === 'erc721_owner_of') {
        if (!ADDR_RE.test(r.contract)) return `${row.id}: ERC721 contract must be a valid 0x address.`
        if (!/^\d+$/.test(String(r.tokenId ?? ''))) return `${row.id}: tokenId must be a decimal string.`
      }
      if (mode === 'held_window') {
        const s = Number(row.minHoldSeconds)
        if (!Number.isFinite(s) || s < 60) return `${row.id}: minHoldSeconds must be at least 60.`
      }
      const au = row.actionUrl?.trim()
      if (au && !(row.ctaLabel || row.cta)?.trim()) {
        return `${row.id}: Button label required when Action URL is set.`
      }
    }
    const au = row.actionUrl?.trim()
    if (au && !row.ctaLabel?.trim() && !row.cta?.trim()) {
      return `${row.id}: CTA label required when Action URL is set.`
    }
  }
  return null
}

function buildCampaignPutRow(row: CampaignDef): Record<string, unknown> {
  const mode = row.verificationMode ?? 'none'
  const label = (row.ctaLabel || row.cta || 'OPEN').trim()
  const out: Record<string, unknown> = {
    schemaVersion: 2,
    id: row.id.trim(),
    title: row.title.trim(),
    status: row.status,
    rewardText: row.rewardText.trim(),
    cta: label,
    ctaLabel: label,
    color: row.color,
    iconKey: row.iconKey,
    xpReward: Math.max(0, Number(row.xpReward) || 0),
    chainId: Math.max(1, Number(row.chainId) || 8453),
    verificationMode: mode,
  }
  const st = row.subtitle?.trim()
  if (st) out.subtitle = st
  const au = row.actionUrl?.trim()
  if (au) out.actionUrl = au
  if (mode === 'held_window') out.minHoldSeconds = Math.max(60, Number(row.minHoldSeconds) || 86_400)
  if (mode === 'snapshot' || mode === 'held_window') {
    out.rule = row.rule
  }
  return out
}

function AdminKeyBar({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const [value, setValue] = useState('')

  const save = () => {
    if (!value.trim()) return
    setAdminKey(value.trim())
    onReady()
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div>
        <div className="font-semibold text-yellow-900 dark:text-yellow-200">Admin API Key</div>
        <div className="text-xs text-yellow-800 dark:text-yellow-300">
          Required to call protected admin endpoints. Set ADMIN_API_KEY in your backend env.
        </div>
      </div>
      <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
        <input
          type="password"
          placeholder={ready ? 'Stored locally' : 'Enter admin key'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 sm:w-72 px-3 py-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-900 text-sm"
        />
        <button
          onClick={save}
          className="px-3 py-2 rounded-md bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600"
        >
          {ready ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function LayoutEditor({ initial, onSave }: { initial: LaunchHubLayout; onSave: (l: LaunchHubLayout) => Promise<void> }) {
  const [draft, setDraft] = useState<LaunchHubLayout>(initial)
  const [busy, setBusy] = useState(false)

  useEffect(() => setDraft(initial), [initial])

  const patchBlockProps = (index: number, patch: Record<string, unknown>) => {
    const next = [...draft.blocks]
    const cur = next[index]
    next[index] = {
      ...cur,
      props: { ...(cur.props || {}), ...patch },
    }
    setDraft({ ...draft, blocks: next })
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...draft.blocks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setDraft({ ...draft, blocks: next })
  }

  const remove = (index: number) => {
    const next = draft.blocks.filter((_, i) => i !== index)
    setDraft({ ...draft, blocks: next })
  }

  const add = (type: string) => {
    if (!type) return
    const props =
      type === 'GapCreativeBlock'
        ? {
            enabled: true,
            src: '',
            alt: '',
            minHeightPx: 280,
            maxHeightPx: 0,
            objectFit: 'cover',
            href: '',
          }
        : {}
    setDraft({
      ...draft,
      blocks: [...draft.blocks, { type, props, colSpan: 1 }],
    })
  }

  const setBlockColSpan = (index: number, colSpan: 1 | 2) => {
    const next = [...draft.blocks]
    next[index] = { ...next[index], colSpan }
    setDraft({ ...draft, blocks: next })
  }

  const save = async () => {
    setBusy(true)
    const inviteEntry = draft.blocks.find((b) => b.type === 'InviteCodeBlock')
    const inviteColSpan: 1 | 2 =
      inviteEntry?.colSpan === 1
        ? 1
        : inviteEntry?.colSpan === 2
          ? 2
          : draft.inviteColSpan === 1
            ? 1
            : 2
    const normalized: LaunchHubLayout = {
      ...draft,
      page: draft.page || 'launch_hub',
      inviteColSpan,
      blocks: draft.blocks.map((b) => {
        const colSpan = b.colSpan === 2 ? 2 : 1
        if (b.type !== 'GapCreativeBlock') {
          return { ...b, colSpan }
        }
        const p = (b.props || {}) as Record<string, unknown>
        const maxRaw = Number(p.maxHeightPx) || 0
        const minH = Math.min(2000, Math.max(48, Number(p.minHeightPx) || 280))
        return {
          ...b,
          colSpan,
          props: {
            enabled: p.enabled !== false,
            src: typeof p.src === 'string' ? p.src.trim() : '',
            alt: typeof p.alt === 'string' ? p.alt.trim() : '',
            minHeightPx: minH,
            maxHeightPx:
              maxRaw > 0 ? Math.min(2400, Math.max(minH, maxRaw)) : 0,
            objectFit: p.objectFit === 'contain' ? 'contain' : 'cover',
            href: typeof p.href === 'string' ? p.href.trim() : '',
          },
        }
      }),
    }
    await onSave(normalized)
    setBusy(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Launch Hub Layout</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Drag-free reorder. Column span controls the 2-column hub grid. Add{' '}
            <code className="text-[11px]">GapCreativeBlock</code> (multiple allowed) for manual image fillers — set URL
            and min height to match gaps.
          </p>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {busy ? 'Saving…' : 'Save Layout'}
        </button>
      </div>

      <div className="space-y-2">
        {draft.blocks.map((block, index) => (
          <div
            key={`${block.type}-${index}`}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{index + 1}</span>
              <span className="flex-1 min-w-[140px] font-medium text-gray-800 dark:text-gray-100">{block.type}</span>
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <span className="whitespace-nowrap">Width</span>
                <select
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                  value={block.colSpan ?? 1}
                  onChange={(e) => setBlockColSpan(index, Number(e.target.value) === 2 ? 2 : 1)}
                >
                  <option value={1}>1 col</option>
                  <option value={2}>Full width</option>
                </select>
              </label>
              <button type="button" onClick={() => move(index, -1)} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">↑</button>
              <button type="button" onClick={() => move(index, 1)} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">↓</button>
              <button type="button" onClick={() => remove(index)} className="text-xs px-2 py-1 rounded bg-red-500 text-white">Remove</button>
            </div>
            {block.type === 'GapCreativeBlock' ? (
              <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-950/30 space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={block.props?.enabled !== false}
                    onChange={(e) => patchBlockProps(index, { enabled: e.target.checked })}
                  />
                  Visible on Launch Hub (uncheck to hide without removing)
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                  Image URL
                  <input
                    className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono"
                    placeholder="https://…"
                    value={typeof block.props?.src === 'string' ? block.props.src : ''}
                    onChange={(e) => patchBlockProps(index, { src: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                    Min height (px)
                    <input
                      type="number"
                      min={48}
                      max={2000}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                      value={Number(block.props?.minHeightPx) || 280}
                      onChange={(e) => patchBlockProps(index, { minHeightPx: Number(e.target.value) || 280 })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                    Max height (px, 0 = none)
                    <input
                      type="number"
                      min={0}
                      max={2400}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                      value={Number(block.props?.maxHeightPx) || 0}
                      onChange={(e) => patchBlockProps(index, { maxHeightPx: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                  Object fit
                  <select
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm max-w-xs"
                    value={block.props?.objectFit === 'contain' ? 'contain' : 'cover'}
                    onChange={(e) => patchBlockProps(index, { objectFit: e.target.value })}
                  >
                    <option value="cover">cover</option>
                    <option value="contain">contain</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                  Alt text (optional)
                  <input
                    className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                    value={typeof block.props?.alt === 'string' ? block.props.alt : ''}
                    onChange={(e) => patchBlockProps(index, { alt: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
                  Link URL (optional — wraps creative)
                  <input
                    className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono"
                    placeholder="https://…"
                    value={typeof block.props?.href === 'string' ? block.props.href : ''}
                    onChange={(e) => patchBlockProps(index, { href: e.target.value })}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs uppercase text-gray-500 dark:text-gray-400 self-center">Add block:</span>
        {DEFAULT_BLOCK_TYPES.filter((t) =>
          t === 'GapCreativeBlock' ? true : !draft.blocks.some((b) => b.type === t),
        ).map((type) => (
          <button
            key={type}
            onClick={() => add(type)}
            className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  )
}

function CampaignsEditor({ initial, onSave }: { initial: CampaignDef[]; onSave: (c: CampaignDef[]) => Promise<void> }) {
  const [rows, setRows] = useState<CampaignDef[]>(() => initial.map(normalizeCampaignForEditor))
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => setRows(initial.map(normalizeCampaignForEditor)), [initial])

  const update = (index: number, patch: Partial<CampaignDef>) => {
    const next = [...rows]
    next[index] = { ...next[index], ...patch, schemaVersion: 2 }
    setRows(next)
  }

  const remove = (index: number) => setRows(rows.filter((_, i) => i !== index))

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[index], next[j]] = [next[j], next[index]]
    setRows(next)
  }

  const setMode = (index: number, mode: VerificationMode) => {
    const cur = rows[index]
    const patch: Partial<CampaignDef> = {
      verificationMode: mode,
      schemaVersion: 2,
    }
    if (mode === 'none') {
      patch.rule = undefined
      patch.minHoldSeconds = undefined
      patch.xpReward = Math.max(0, cur.xpReward ?? 0)
    } else {
      patch.rule = cur.rule ?? defaultRule('erc20_min_balance')
      patch.xpReward = Math.max(1, cur.xpReward ?? 100)
      patch.chainId = cur.chainId ?? 8453
      if (mode === 'held_window') {
        patch.minHoldSeconds = Math.max(60, cur.minHoldSeconds ?? 86_400)
      }
    }
    update(index, patch)
  }

  const setRuleKind = (index: number, kind: OnchainRule['kind']) => {
    update(index, { rule: defaultRule(kind), schemaVersion: 2 })
  }

  const patchRule = (index: number, patch: Partial<OnchainRule>) => {
    const r = rows[index].rule
    if (!r) return
    update(index, {
      rule: { ...r, ...patch } as OnchainRule,
      schemaVersion: 2,
    })
  }

  const add = () => {
    const id = `campaign-${Date.now()}`
    setRows([
      ...rows,
      normalizeCampaignForEditor({
        id,
        title: 'New Campaign',
        status: 'DRAFT',
        rewardText: 'Up to 100 XP',
        cta: 'JOIN',
        color: 'yellow',
        iconKey: 'meme',
      }),
    ])
  }

  const save = async () => {
    setLocalErr(null)
    const err = validateCampaignRows(rows)
    if (err) {
      setLocalErr(err)
      return
    }
    setBusy(true)
    try {
      const payload = rows.map((r) => buildCampaignPutRow(r)) as unknown as CampaignDef[]
      await onSave(payload)
    } catch (e) {
      setLocalErr((e as Error).message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Campaigns Catalog</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hub cards and optional on-chain checks (snapshot or minimum hold window). All rows save as catalog v2.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={add} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">
            + Add Campaign
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {busy ? 'Saving…' : 'Save Catalog'}
          </button>
        </div>
      </div>

      {localErr ? (
        <div className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
          {localErr}
        </div>
      ) : null}

      <div className="space-y-4">
        {rows.map((row, index) => {
          const mode = row.verificationMode ?? 'none'
          const r = row.rule
          const onchain = mode === 'snapshot' || mode === 'held_window'

          return (
            <div
              key={`${row.id}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 space-y-3"
            >
              <div className="flex flex-wrap gap-2 items-start justify-between">
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                  <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                    Id
                    <input
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm md:w-40"
                      value={row.id}
                      onChange={(e) => update(index, { id: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500 flex-1 min-w-[140px]">
                    Title
                    <input
                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      value={row.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                    />
                  </label>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => remove(index)} className="px-2 py-1 rounded bg-red-500 text-white text-xs">
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Status
                  <select
                    value={row.status}
                    onChange={(e) => update(index, { status: e.target.value })}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option>LIVE</option>
                    <option>DRAFT</option>
                    <option>PAUSED</option>
                    <option>SOON</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Color / icon
                  <div className="flex gap-1">
                    <input
                      className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      placeholder="yellow"
                      value={row.color || ''}
                      onChange={(e) => update(index, { color: e.target.value || undefined })}
                    />
                    <input
                      className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      placeholder="meme"
                      value={row.iconKey || ''}
                      onChange={(e) => update(index, { iconKey: e.target.value || undefined })}
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500 sm:col-span-2">
                  Subtitle <span className="normal-case text-[10px] text-gray-400">optional</span>
                  <input
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={row.subtitle || ''}
                    onChange={(e) => update(index, { subtitle: e.target.value || undefined })}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                Reward copy
                <input
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  value={row.rewardText}
                  onChange={(e) => update(index, { rewardText: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Primary button label (CTA)
                  <input
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={row.ctaLabel || row.cta}
                    onChange={(e) => {
                      const v = e.target.value
                      update(index, { ctaLabel: v, cta: v })
                    }}
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Action URL <span className="normal-case text-[10px] text-gray-400">https — external link shown on hub</span>
                  <input
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="https://…"
                    value={row.actionUrl || ''}
                    onChange={(e) => update(index, { actionUrl: e.target.value || undefined })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Verification mode
                  <select
                    value={mode}
                    onChange={(e) => setMode(index, e.target.value as VerificationMode)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="none">None (display only)</option>
                    <option value="snapshot">On-chain snapshot (verify once)</option>
                    <option value="held_window">Held window (min. time eligible)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Chain ID
                  <input
                    type="number"
                    min={1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    disabled={!onchain}
                    value={row.chainId ?? 8453}
                    onChange={(e) =>
                      update(index, { chainId: Math.max(1, Number(e.target.value) || 8453), schemaVersion: 2 })
                    }
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  XP on success
                  <input
                    type="number"
                    min={0}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    disabled={!onchain}
                    value={row.xpReward ?? 0}
                    onChange={(e) =>
                      update(index, { xpReward: Math.max(0, Number(e.target.value) || 0), schemaVersion: 2 })
                    }
                  />
                </label>
              </div>

              {mode === 'held_window' ? (
                <label className="flex flex-col gap-0.5 text-xs uppercase text-gray-500">
                  Min hold (seconds)
                  <input
                    type="number"
                    min={60}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm max-w-xs"
                    value={row.minHoldSeconds ?? 86_400}
                    onChange={(e) =>
                      update(index, { minHoldSeconds: Math.max(60, Number(e.target.value) || 86_400) })
                    }
                  />
                  <span className="normal-case text-[10px] text-gray-400">86400 ≈ one day · wall-clock from first eligibility</span>
                </label>
              ) : null}

              {onchain && r ? (
                <div className="rounded-md border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">On-chain rule</span>
                    <select
                      value={r.kind}
                      onChange={(e) => setRuleKind(index, e.target.value as OnchainRule['kind'])}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="erc20_min_balance">ERC-20 minimum balance</option>
                      <option value="erc721_min_balance">ERC-721 min NFT count</option>
                      <option value="erc721_owner_of">ERC-721 owns tokenId</option>
                    </select>
                  </div>

                  {r.kind === 'erc20_min_balance' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        Token contract
                        <input
                          className="font-mono text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.token}
                          onChange={(e) => patchRule(index, { token: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        Min amount (human)
                        <input
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.thresholdHuman}
                          onChange={(e) => patchRule(index, { thresholdHuman: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        Decimals override <span className="italic">optional</span>
                        <input
                          type="number"
                          min={0}
                          max={77}
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.decimalsOverride ?? ''}
                          placeholder="auto from chain"
                          onChange={(e) =>
                            patchRule(index, {
                              decimalsOverride:
                                e.target.value === '' ? undefined : Math.min(77, Math.max(0, Number(e.target.value))),
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {r.kind === 'erc721_min_balance' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        NFT contract
                        <input
                          className="font-mono text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.contract}
                          onChange={(e) => patchRule(index, { contract: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        Min balance
                        <input
                          type="number"
                          min={1}
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.minCount}
                          onChange={(e) =>
                            patchRule(index, { minCount: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {r.kind === 'erc721_owner_of' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        NFT contract
                        <input
                          className="font-mono text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.contract}
                          onChange={(e) => patchRule(index, { contract: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                        Token ID (decimal string)
                        <input
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          value={r.tokenId}
                          onChange={(e) =>
                            patchRule(index, { tokenId: e.target.value.replace(/\D/g, '') || '0' })
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function XPresetsEditor({ initial, onSave }: { initial: XRulePreset[]; onSave: (p: XRulePreset[]) => Promise<void> }) {
  const [rows, setRows] = useState<XRulePreset[]>(initial)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setRows(initial.map((p) => ({ ...p, tasks: p.tasks ?? [] })))
  }, [initial])

  const updateRule = (index: number, patch: Partial<XRulePreset['rules']>) => {
    const next = [...rows]
    next[index] = { ...next[index], rules: { ...next[index].rules, ...patch } }
    setRows(next)
  }

  const updateMeta = (index: number, patch: Partial<XRulePreset>) => {
    const next = [...rows]
    next[index] = { ...next[index], ...patch }
    setRows(next)
  }

  const remove = (index: number) => setRows(rows.filter((_, i) => i !== index))

  const missionTasks = (preset: XRulePreset) => preset.tasks ?? []

  const setMissionTasks = (index: number, tasks: XMissionTaskConfig[]) => {
    const next = [...rows]
    next[index] = { ...next[index], tasks }
    setRows(next)
  }

  const updateMissionTask = (pidx: number, tidx: number, patch: Partial<XMissionTaskConfig>) => {
    const tasks = [...missionTasks(rows[pidx])]
    tasks[tidx] = { ...tasks[tidx], ...patch }
    setMissionTasks(pidx, tasks)
  }

  const addMissionTask = (pidx: number) => {
    const tasks = [...missionTasks(rows[pidx])]
    tasks.push({
      id: `task_${Date.now()}`,
      label: 'New task',
      kind: 'mention',
      required: false,
      xp: 10,
      mention: rows[pidx].rules.mention,
    })
    setMissionTasks(pidx, tasks)
  }

  const removeMissionTask = (pidx: number, tidx: number) => {
    const tasks = missionTasks(rows[pidx]).filter((_, i) => i !== tidx)
    setMissionTasks(pidx, tasks)
  }

  const seedTasksFromRules = (pidx: number) => {
    setMissionTasks(pidx, defaultTasksForRules(rows[pidx].rules))
  }

  const add = () => {
    const id = `preset-${Date.now()}`
    const rules = {
      mention: '@rekt_ceo',
      mustHaveMemeImage: true,
      minFriendTags: 2,
      hashtags: ['#RektCEO'],
      minAccountAgeDays: 30,
      minLikesAfter24h: 1,
      delayBeforeCreditMinutes: 30,
      maxPerDay: 1,
      decayCurveEnabled: true,
    }
    setRows([
      ...rows,
      {
        id,
        label: 'New Preset',
        rules,
        tasks: defaultTasksForRules(rules),
      },
    ])
  }

  const save = async () => {
    setBusy(true)
    await onSave(rows)
    setBusy(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Organic-X Rule Presets</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Global rules (account age, delay, likes) apply to every task. Mission tasks set XP, required vs optional,
            and what we check in each post. Optional tasks only credit if every required task passes on the same
            post.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={add} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">
            + Add Preset
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {busy ? 'Saving…' : 'Save Presets'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((preset, index) => (
          <div key={preset.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={preset.id}
                onChange={(e) => updateMeta(index, { id: e.target.value })}
              />
              <input
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                value={preset.label}
                onChange={(e) => updateMeta(index, { label: e.target.value })}
              />
              <button onClick={() => remove(index)} className="ml-auto px-2 py-1 rounded bg-red-500 text-white text-xs">
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Field label="Mention">
                <input
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.mention}
                  onChange={(e) => updateRule(index, { mention: e.target.value })}
                />
              </Field>
              <Field label="Min Friend Tags">
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.minFriendTags}
                  onChange={(e) => updateRule(index, { minFriendTags: Number(e.target.value) })}
                />
              </Field>
              <Field label="Min Acct Age (days)">
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.minAccountAgeDays}
                  onChange={(e) => updateRule(index, { minAccountAgeDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="Min Likes (24h)">
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.minLikesAfter24h}
                  onChange={(e) => updateRule(index, { minLikesAfter24h: Number(e.target.value) })}
                />
              </Field>
              <Field label="Credit Delay (min)">
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.delayBeforeCreditMinutes}
                  onChange={(e) => updateRule(index, { delayBeforeCreditMinutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Max / Day">
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.maxPerDay}
                  onChange={(e) => updateRule(index, { maxPerDay: Number(e.target.value) })}
                />
              </Field>
              <Field label="Hashtags (comma)">
                <input
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={preset.rules.hashtags.join(',')}
                  onChange={(e) =>
                    updateRule(index, {
                      hashtags: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Meme Image Required">
                <select
                  value={String(preset.rules.mustHaveMemeImage)}
                  onChange={(e) => updateRule(index, { mustHaveMemeImage: e.target.value === 'true' })}
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </Field>
              <Field label="Decay Curve">
                <select
                  value={String(preset.rules.decayCurveEnabled)}
                  onChange={(e) => updateRule(index, { decayCurveEnabled: e.target.value === 'true' })}
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </Field>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Mission tasks (XP)</h4>
                <button
                  type="button"
                  onClick={() => addMissionTask(index)}
                  className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 text-xs"
                >
                  + Add task
                </button>
                <button
                  type="button"
                  onClick={() => seedTasksFromRules(index)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300"
                >
                  Reset from rules template
                </button>
              </div>
              <div className="space-y-2">
                {missionTasks(preset).map((task, tidx) => (
                  <div
                    key={`${preset.id}-${task.id}-${tidx}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-md border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                  >
                    <Field label="Id">
                      <input
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                        value={task.id}
                        onChange={(e) => updateMissionTask(index, tidx, { id: e.target.value })}
                      />
                    </Field>
                    <Field label="Label">
                      <input
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        value={task.label}
                        onChange={(e) => updateMissionTask(index, tidx, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="Kind">
                      <select
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        value={task.kind}
                        onChange={(e) =>
                          updateMissionTask(index, tidx, { kind: e.target.value as XMissionTaskKind })
                        }
                      >
                        {MISSION_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="XP">
                      <input
                        type="number"
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        value={task.xp}
                        onChange={(e) => updateMissionTask(index, tidx, { xp: Number(e.target.value) })}
                      />
                    </Field>
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-xs uppercase text-gray-500 dark:text-gray-400">Required</span>
                      <select
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        value={task.required ? 'yes' : 'no'}
                        onChange={(e) => updateMissionTask(index, tidx, { required: e.target.value === 'yes' })}
                      >
                        <option value="yes">Required (own post)</option>
                        <option value="no">Optional (+ same post as all required)</option>
                      </select>
                    </label>
                    {task.kind === 'mention' ? (
                      <Field label="@Mention">
                        <input
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={task.mention ?? ''}
                          onChange={(e) => updateMissionTask(index, tidx, { mention: e.target.value })}
                        />
                      </Field>
                    ) : null}
                    {task.kind === 'friend_tags' ? (
                      <Field label="Min friend tags">
                        <input
                          type="number"
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={task.minFriendTags ?? 0}
                          onChange={(e) =>
                            updateMissionTask(index, tidx, { minFriendTags: Number(e.target.value) })
                          }
                        />
                      </Field>
                    ) : null}
                    {task.kind === 'hashtags' ? (
                      <Field label="Hashtags (comma)">
                        <input
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={(task.hashtags ?? []).join(',')}
                          onChange={(e) =>
                            updateMissionTask(index, tidx, {
                              hashtags: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                    ) : null}
                    <div className="md:col-span-12 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeMissionTask(index, tidx)}
                        className="px-2 py-1 rounded bg-red-500 text-white text-xs"
                      >
                        Remove task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const GATE_ROW_ORDER: GateKey[] = [
  'baseBalanceEligible',
  'xLinked',
  'xFollowsRektCeo',
  'discordLinked',
  'discordInGuild',
  'telegramLinked',
  'telegramInGroup',
]

const GATE_GROUP: Record<GateKey, string> = {
  baseBalanceEligible: 'Wallet',
  xLinked: 'X (Twitter)',
  xFollowsRektCeo: 'X (Twitter)',
  discordLinked: 'Discord',
  discordInGuild: 'Discord',
  telegramLinked: 'Telegram',
  telegramInGroup: 'Telegram',
}

function GateConfigEditor({
  initial,
  onSave,
}: {
  initial: GateConfig
  onSave: (g: GateConfig) => Promise<void>
}) {
  const [draft, setDraft] = useState<GateConfig>(initial)
  const [busy, setBusy] = useState(false)

  useEffect(() => setDraft(initial), [initial])

  const update = (key: GateKey, patch: Partial<GateConfig[GateKey]>) => {
    setDraft({ ...draft, [key]: { ...draft[key], ...patch } })
  }

  const save = async () => {
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Eligibility Gate Config</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-prose">
            Decide which identity checks are required to access campaign tasks. Toggle <strong>Required</strong> on
            to block the gate, or <strong>Enabled</strong> off to hide the row entirely. EVM wallet is always
            required and is not listed here.
          </p>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {busy ? 'Saving…' : 'Save Gate Config'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-3">Check</th>
              <th className="py-2 pr-3">Group</th>
              <th className="py-2 pr-3">Label</th>
              <th className="py-2 pr-3">Required</th>
              <th className="py-2 pr-3">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {GATE_ROW_ORDER.map((key) => {
              const row = draft[key]
              if (!row) return null
              return (
                <tr key={key} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="py-3 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300">{key}</td>
                  <td className="py-3 pr-3 text-gray-600 dark:text-gray-400">{GATE_GROUP[key]}</td>
                  <td className="py-3 pr-3">
                    <input
                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      value={row.label}
                      onChange={(e) => update(key, { label: e.target.value })}
                    />
                    <input
                      className="mt-1 w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400"
                      placeholder="Description (shown in tooltip / docs)"
                      value={row.description || ''}
                      onChange={(e) => update(key, { description: e.target.value })}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      onClick={() => update(key, { required: !row.required })}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        row.required
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                      disabled={!row.enabled}
                      title={row.enabled ? '' : 'Enable the row first'}
                    >
                      {row.required ? 'REQUIRED' : 'OPTIONAL'}
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      onClick={() =>
                        update(key, {
                          enabled: !row.enabled,
                          required: !row.enabled ? row.required : false,
                        })
                      }
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        row.enabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                      }`}
                    >
                      {row.enabled ? 'ENABLED' : 'HIDDEN'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Tip: dependent checks (e.g. <code>xFollowsRektCeo</code>) only pass once their parent (<code>xLinked</code>)
        passes. Marking a parent optional but a child required will leave the gate unreachable until the user links
        the parent anyway.
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</span>
      {children}
    </label>
  )
}

function XpRewardsEditor({
  initial,
  onSave,
}: {
  initial: XpRewardsConfig
  onSave: (x: XpRewardsConfig) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    setText(JSON.stringify(initial, null, 2))
  }, [initial])

  const save = async () => {
    setLocalErr(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setLocalErr('Invalid JSON.')
      return
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setLocalErr('Root must be a JSON object.')
      return
    }
    setBusy(true)
    try {
      await onSave(parsed as XpRewardsConfig)
    } catch (e) {
      setLocalErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Launch Hub XP rewards</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check-in, streak cap, spin slices, account-link XP, invite amounts, and per–X-mission preset payouts
            (<code className="text-[11px]">xMissionRewards</code> keys match X rule preset ids).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {busy ? 'Saving…' : 'Save XP config'}
        </button>
      </div>
      {localErr ? (
        <div className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded p-2 mb-2">
          {localErr}
        </div>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full min-h-[280px] font-mono text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3"
        spellCheck={false}
      />
    </div>
  )
}

function LaunchAnalyticsSection() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 6)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [slowScan, setSlowScan] = useState(false)
  const [summary, setSummary] = useState<LaunchAnalyticsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryErr, setSummaryErr] = useState<string | null>(null)

  const [addrInput, setAddrInput] = useState('')
  const [userLoading, setUserLoading] = useState(false)
  const [userErr, setUserErr] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null)

  const [lbScope, setLbScope] = useState<'season' | 'lifetime'>('season')
  const [lbRows, setLbRows] = useState<unknown[]>([])
  const [lbLoading, setLbLoading] = useState(false)

  const refreshSummary = async () => {
    setSummaryLoading(true)
    setSummaryErr(null)
    try {
      const data = await api.getAdminAnalyticsSummary({ from, to, slowDailyScan: slowScan })
      setSummary(data)
    } catch (e) {
      setSummaryErr((e as Error).message)
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    void refreshSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only snapshot
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLbLoading(true)
      try {
        const rows = await api.getAdminLeaderboard(lbScope, 40)
        if (!cancelled) setLbRows(rows)
      } catch {
        if (!cancelled) setLbRows([])
      } finally {
        if (!cancelled) setLbLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lbScope])

  const lookupUser = async () => {
    const a = addrInput.trim()
    if (!/^0x[a-fA-F0-9]{40}$/i.test(a)) {
      setUserErr('Enter a valid 0x-prefixed 40-hex wallet.')
      setUserProfile(null)
      return
    }
    setUserLoading(true)
    setUserErr(null)
    try {
      const data = await api.getAdminLaunchUser(a)
      setUserProfile(data)
    } catch (e) {
      setUserErr((e as Error).message)
      setUserProfile(null)
    } finally {
      setUserLoading(false)
    }
  }

  const de = summary?.dailyEngagement

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Launch Hub analytics</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Aggregate Redis metrics, Postgres invite totals (when enabled), and per-wallet drill-down.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshSummary()}
          disabled={summaryLoading}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 shrink-0"
        >
          {summaryLoading ? 'Loading…' : 'Refresh summary'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
          From (UTC)
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-300">
          To (UTC)
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={slowScan} onChange={(e) => setSlowScan(e.target.checked)} />
          Slow daily SCAN (legacy keys)
        </label>
      </div>

      {summaryErr ? (
        <div className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded p-2">
          {summaryErr}
        </div>
      ) : null}

      {summary?.warnings?.length ? (
        <div className="text-xs text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded p-2 bg-amber-50 dark:bg-amber-950/40">
          {summary.warnings.join(' · ')}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Redis: {summary.redisAvailable ? 'connected' : 'unavailable'}
            {summary.partial ? ' · partial data' : ''}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Season LB wallets" value={summary.leaderboards.season.wallets} />
            <StatCard label="Lifetime LB wallets" value={summary.leaderboards.lifetime.wallets} />
            <StatCard label="Σ Season XP (scores)" value={summary.leaderboards.season.sumScores} />
            <StatCard label="Σ Lifetime XP (scores)" value={summary.leaderboards.lifetime.sumScores} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Identity blobs" value={summary.identity.walletsWithIdentityBlob} />
            <StatCard label="Invite codes issued (PG)" value={summary.invites.codesIssued} />
            <StatCard label="Invite redemptions (PG)" value={summary.invites.redemptions} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Ledger PG</div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {summary.invites.ledgerEnabled ? 'On' : 'Off'}
              </div>
            </div>
          </div>
          {de ? (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Daily engagement ({de.from} → {de.to})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  Check-ins (counters): <strong>{de.checkinsFromCounters.toLocaleString()}</strong>
                </div>
                <div>
                  Spins (counters): <strong>{de.spinsFromCounters.toLocaleString()}</strong>
                </div>
                {de.checkinsFromScan != null ? (
                  <div>
                    Check-ins (SCAN): <strong>{de.checkinsFromScan.toLocaleString()}</strong>
                  </div>
                ) : null}
                {de.spinsFromScan != null ? (
                  <div>
                    Spins (SCAN): <strong>{de.spinsFromScan.toLocaleString()}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Admin leaderboard preview</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          <select
            value={lbScope}
            onChange={(e) => setLbScope(e.target.value === 'lifetime' ? 'lifetime' : 'season')}
            className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
          >
            <option value="season">Season</option>
            <option value="lifetime">Lifetime</option>
          </select>
          {lbLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Address</th>
                <th className="text-left p-2">XP</th>
                <th className="text-left p-2">Handles</th>
              </tr>
            </thead>
            <tbody>
              {(lbRows as Record<string, unknown>[]).map((row, i) => (
                <tr key={`${String(row.address)}-${i}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-2">{String(row.rank ?? '')}</td>
                  <td className="p-2 font-mono">{String(row.address ?? '').slice(0, 14)}…</td>
                  <td className="p-2">{Number(row.points ?? 0).toLocaleString()}</td>
                  <td className="p-2 max-w-[220px] truncate">
                    {row.handles && typeof row.handles === 'object'
                      ? JSON.stringify(row.handles)
                      : String(row.handle ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">User lookup</h4>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="0x… wallet"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => void lookupUser()}
            disabled={userLoading}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:bg-emerald-400"
          >
            {userLoading ? 'Loading…' : 'Load profile'}
          </button>
        </div>
        {userErr ? (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">{userErr}</div>
        ) : null}
        {userProfile ? (
          <div className="mt-4 space-y-4">
            <pre className="text-[11px] overflow-x-auto rounded bg-gray-50 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
              {JSON.stringify(
                {
                  address: userProfile.address,
                  xp: userProfile.xp,
                  daily: userProfile.daily,
                  eligibility: userProfile.eligibility,
                  invite: userProfile.invite,
                },
                null,
                2,
              )}
            </pre>
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Connections (identity)</div>
              <pre className="text-[11px] overflow-x-auto rounded bg-gray-50 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-700">
                {JSON.stringify(userProfile.identity, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Campaigns</div>
              <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-900">
                    <tr>
                      <th className="text-left p-2">Id</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(userProfile.campaigns)
                      ? (userProfile.campaigns as Record<string, unknown>[]).map((c) => (
                          <tr key={String(c.id)} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="p-2 font-mono">{String(c.id)}</td>
                            <td className="p-2">{String(c.title ?? '')}</td>
                            <td className="p-2 font-mono">
                              {JSON.stringify(c.viewerProgress ?? {}).slice(0, 120)}
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">XP ledger (recent)</div>
              <pre className="text-[11px] overflow-x-auto rounded bg-gray-50 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                {JSON.stringify(userProfile.xpLedger, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Invite history (PG)</div>
              <pre className="text-[11px] overflow-x-auto rounded bg-gray-50 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                {JSON.stringify(userProfile.inviteHistory, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CampaignsPage() {
  const [layout, setLayout] = useState<LaunchHubLayout | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignDef[] | null>(null)
  const [presets, setPresets] = useState<XRulePreset[] | null>(null)
  const [gateConfig, setGateConfig] = useState<GateConfig | null>(null)
  const [xpRewards, setXpRewards] = useState<XpRewardsConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [keyReady, setKeyReady] = useState(() => Boolean(localStorage.getItem('rekt_admin_key')))

  const loadAll = async () => {
    setError(null)
    try {
      const [l, c, p, g, x] = await Promise.all([
        api.getAdminLayout(),
        api.getAdminCampaigns(),
        api.getAdminXRulePresets(),
        api.getAdminGateConfig(),
        api.getAdminXpRewards(),
      ])
      setLayout(l)
      setCampaigns(c)
      setPresets(p)
      setGateConfig(g)
      setXpRewards(x)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    if (keyReady) loadAll()
  }, [keyReady])

  const stats = useMemo(() => {
    const requiredCount = gateConfig
      ? Object.values(gateConfig).filter((r) => r.enabled && r.required).length
      : 0
    return {
      blocks: layout?.blocks?.length ?? 0,
      campaigns: campaigns?.length ?? 0,
      presets: presets?.length ?? 0,
      gateRequired: requiredCount,
    }
  }, [layout, campaigns, presets, gateConfig])

  return (
    <div className="space-y-6">
      <AdminKeyBar
        ready={keyReady}
        onReady={() => {
          setKeyReady(true)
          loadAll()
        }}
      />

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Layout Blocks" value={stats.blocks} />
        <StatCard label="Campaigns" value={stats.campaigns} />
        <StatCard label="X Rule Presets" value={stats.presets} />
        <StatCard label="Required Gate Checks" value={stats.gateRequired} />
      </div>

      {keyReady ? <LaunchAnalyticsSection /> : null}

      {gateConfig ? (
        <GateConfigEditor
          initial={gateConfig}
          onSave={async (g) => {
            const next = await api.setAdminGateConfig(g)
            setGateConfig(next)
          }}
        />
      ) : null}

      {layout ? (
        <LayoutEditor
          initial={layout}
          onSave={async (l) => {
            const next = await api.setAdminLayout(l)
            setLayout(next)
          }}
        />
      ) : null}

      {campaigns ? (
        <CampaignsEditor
          initial={campaigns}
          onSave={async (c) => {
            const next = await api.setAdminCampaigns(c)
            setCampaigns(next)
          }}
        />
      ) : null}

      {presets ? (
        <XPresetsEditor
          initial={presets}
          onSave={async (p) => {
            const next = await api.setAdminXRulePresets(p)
            setPresets(next)
          }}
        />
      ) : null}

      {xpRewards ? (
        <XpRewardsEditor
          initial={xpRewards}
          onSave={async (cfg) => {
            const next = await api.setAdminXpRewards(cfg)
            setXpRewards(next)
          }}
        />
      ) : null}

      {keyReady ? <InviteFlywheelAdmin /> : null}
    </div>
  )
}

function InviteFlywheelAdmin() {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [ledger, setLedger] = useState<{
    issued: any[]
    redemptions: any[]
    rotations: any[]
    ledgerEnabled: boolean
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadLedger = async () => {
    setErr(null)
    try {
      const data = await api.adminGetInviteLedger(120)
      setLedger(data)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    void loadLedger()
  }, [])

  const mint = async () => {
    setBusy(true)
    setErr(null)
    try {
      const { code } = await api.adminMintInviteCode(label.trim() || undefined)
      setLabel('')
      await loadLedger()
      window.alert(`Minted: ${code}`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite flywheel (ledger)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Mint on-demand codes (stored in Redis + append-only Postgres). Rotation never deletes history
          rows — only Redis active lookups roll forward.
        </p>
      </div>

      {err ? (
        <div className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded p-2">
          {err}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-xs uppercase text-gray-500">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            placeholder="e.g. partner_drop_feb"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void mint()}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Minting…' : 'Mint invite code'}
        </button>
        <button
          type="button"
          onClick={() => void loadLedger()}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm"
        >
          Refresh ledger
        </button>
      </div>

      {ledger && !ledger.ledgerEnabled ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Postgres not configured (<code className="text-xs">DATABASE_URL</code>) — ledger writes are
          skipped. Run <code className="text-xs">migrations/001_invite_history.sql</code> and set{' '}
          <code className="text-xs">DATABASE_URL</code>.
        </p>
      ) : null}

      {ledger ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Issued codes (recent)</h3>
            <ul className="space-y-1 max-h-64 overflow-auto text-xs font-mono text-gray-700 dark:text-gray-300">
              {ledger.issued.length === 0 ? <li className="text-gray-500">—</li> : null}
              {ledger.issued.map((r) => (
                <li key={r.id}>
                  {r.code}{' '}
                  <span className="text-gray-500">
                    ({r.source}
                    {r.ownerWallet ? ` · ${r.ownerWallet.slice(0, 8)}…` : ''})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Redemptions (recent)</h3>
            <ul className="space-y-1 max-h-64 overflow-auto text-xs font-mono text-gray-700 dark:text-gray-300">
              {ledger.redemptions.length === 0 ? <li className="text-gray-500">—</li> : null}
              {ledger.redemptions.map((r) => (
                <li key={r.id}>
                  {r.code} → {r.inviteeWallet?.slice(0, 10)}…
                  {r.wasBootstrap ? ' · boot' : ''}
                  {r.wasAdminMint ? ' · admin' : ''}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rotations (recent)</h3>
            <ul className="space-y-1 max-h-64 overflow-auto text-xs font-mono text-gray-700 dark:text-gray-300">
              {ledger.rotations.length === 0 ? <li className="text-gray-500">—</li> : null}
              {ledger.rotations.map((r) => (
                <li key={r.id}>
                  {r.ownerWallet?.slice(0, 10)}… {r.previousBatchId?.slice(0, 8)} →{' '}
                  {r.newBatchId?.slice(0, 8)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

export default CampaignsPage
