# API Surface — Launch Hub

All routes are JSON. Authenticated routes need
`Authorization: Bearer <jwt>` (issued by the existing SIWE flow under
`/api/auth`). Admin routes need `x-admin-key: <ADMIN_API_KEY>`.

Successful responses always look like:

```json
{ "success": true, "data": <payload> }
```

Errors:

```json
{ "success": false, "error": "<message>" }
```

## Public

### `GET /api/campaigns/launch-hub-layout`

Returns the current layout (blocks list + page id). Used by the website to
render in the configured order.

```json
{
  "success": true,
  "data": {
    "page": "launch_hub",
    "blocks": [
      { "type": "SeasonStripBlock", "props": {} },
      { "type": "EligibilityBannerBlock", "props": {} }
    ]
  }
}
```

### `GET /api/campaigns/launch-hub-bootstrap?address=0x…`

The single fetch the website uses to populate every block.

```json
{
  "identity": {
    "evmConnected": true,
    "solanaLinked": false,
    "xLinked": false,
    "xId": null,
    "xEmail": null,
    "xFollowsRektCeo": null,
    "discordLinked": false,
    "discordId": null,
    "discordEmail": null,
    "discordEmailVerified": null,
    "discordInGuild": null,
    "telegramLinked": false,
    "telegramInGroup": null,
    "baseBalanceEligible": false,
    "baseBalanceUsd": 0,
    "handles": { "x": null, "discord": null, "telegram": null, "solana": null }
  },
  "eligibility": {
    "eligible": false,
    "checks": { "evmConnected": true, "baseBalanceEligible": false, "xLinked": false, "xFollowsRektCeo": false, "discordLinked": false, "discordInGuild": false, "telegramLinked": false, "telegramInGroup": false },
    "missing": [ { "key": "xLinked", "label": "Connect X (Twitter)", "group": "x" } ],
    "requirements": [
      { "key": "evmConnected", "label": "Connect EVM wallet", "group": "wallet", "optional": false, "passed": true, "description": null },
      { "key": "baseBalanceEligible", "label": "Hold $10 USD on Base", "group": "wallet", "optional": true, "passed": false, "description": "Wallet must hold ≥ $10 USD equivalent (ETH + USDC) on Base." },
      { "key": "telegramLinked", "label": "Connect Telegram", "group": "telegram", "optional": true, "passed": false, "description": "Login with Telegram (optional unless admin makes it required)." }
    ],
    "gateConfig": {
      "baseBalanceEligible": { "required": false, "enabled": true, "label": "Hold $10 USD on Base" },
      "xLinked": { "required": true, "enabled": true, "label": "Connect X (Twitter)" }
      /* … the full admin-managed gate config … */
    }
  },
  "gateConfig": { /* mirrored from eligibility.gateConfig for convenience */ },
  "xp": { "lifetime": 320, "season": 320, "level": 1, "nextLevelAt": 500 },
  "daily": {
    "today": "2026-04-25",
    "checkinClaimed": true,
    "spinClaimed": false,
    "streak": { "count": 4, "lastDate": "2026-04-25" }
  },
  "invite": { "code": "REKT-A1B2C3" },
  "xTaskRules": {
    "mention": "@rekt_ceo",
    "mustHaveMemeImage": true,
    "minFriendTags": 2,
    "hashtags": ["#RektCEO", "#RektMeme", "#GMRekt"],
    "noncePhrase": "REKT-A1B2C3-20260425"
  },
  "season": {
    "id": "season-1",
    "title": "Season 1: Pre-Launch Hype",
    "endsInDays": 30,
    "focus": "Daily memes, social rituals, invite the crew."
  },
  "campaigns": [ /* CampaignDef[] */ ],
  "leaderboard": [ /* { rank, address, handle, points } */ ]
}
```

`address` is optional. Without it, identity/daily/invite are anonymous.

### `GET /api/campaigns/list`

Read-only catalog of campaigns. Same shape as `bootstrap.campaigns`.

### `GET /api/campaigns/leaderboard?scope=season|lifetime&limit=25`

Top-N leaderboard from Redis ZSETs. `limit` is capped at 100.

## Authenticated (SIWE JWT)

### `GET /api/identity/me`

Returns the current user's identity blob.

### `POST /api/identity/link`

```json
{ "provider": "x" | "discord" | "telegram" | "solana", "handle": "@user" }
```

Manual fallback. Used for Solana addresses (until we add a Solana sign-in)
and as an admin-only escape hatch. The real X / Discord / Telegram flows
go through the dedicated endpoints below — those provide cryptographic
proof of ownership.

### `POST /api/identity/unlink`

```json
{ "provider": "x" | "discord" | "telegram" | "solana" }
```

### `POST /api/identity/invite`

Issues (or returns) the user's invite code.

### `GET /api/identity/x/oauth-url`

Returns the X authorize URL with a signed `state` JWT plus an embedded
PKCE `code_challenge`. Frontend redirects the browser to `data.url`. The
matching `code_verifier` is stashed server-side keyed by an opaque `vid`
embedded in `state` (10-minute TTL).

```json
{ "success": true, "data": { "url": "https://twitter.com/i/oauth2/authorize?…" } }
```

Errors:

- `503` — `X_CLIENT_ID` not set.

### `GET /api/identity/x/callback?code=…&state=…`

Public (X redirects the **browser** here, no auth header). Decodes `state`,
consumes the PKCE verifier, exchanges `code` at `POST /2/oauth2/token`,
fetches `/2/users/me`, optionally probes the follow graph for
`X_FOLLOW_TARGET`, marks `xLinked = true`, persists `xId`, `xEmail`
(best-effort, populated when `users.email` scope is granted), and
`xFollowsRektCeo`, then redirects to
`${FRONTEND_URL}/launch?x=ok&handle=@username` (or `?x=fail&reason=…`).

Failure `reason`s: `bad_state`, `expired_state`, `missing_params`,
`exchange_failed`, `not_following`, `access_denied` (X-side).

### `GET /api/identity/discord/oauth-url`

Returns the Discord authorize URL with a signed `state` JWT. Frontend
redirects the browser to `data.url`.

### `GET /api/identity/discord/callback?code=…&state=…`

Public (Discord redirects the **browser** here, no auth header). Decodes
`state`, exchanges `code`, fetches `/users/@me`, optionally probes guild
membership, persists `discordId`, `discordEmail` and
`discordEmailVerified` (when granted), marks `discordLinked = true`,
then redirects to `${FRONTEND_URL}/launch?discord=ok&handle=…` (or
`?discord=fail&reason=…`).

### `GET /api/identity/telegram/config`

Public. Returns `{ configured, botUsername }` so the frontend knows whether
to render the Telegram Login Widget and which bot to point it at.

### `POST /api/identity/telegram/verify`

Body: the full Telegram Login Widget payload, e.g.

```json
{
  "id": 123456789,
  "first_name": "Anon",
  "username": "anonymous",
  "auth_date": 1745611200,
  "hash": "abcdef0123…"
}
```

Backend HMAC-verifies against `SHA-256(BOT_TOKEN)` and (when
`TELEGRAM_CHAT_ID` is set) calls `getChatMember`. On success:

```json
{ "success": true, "data": { "identity": { /* … */ }, "handle": "@anonymous", "member": true } }
```

Errors: `400 bad_signature`, `400 expired_payload`, `409 NOT_IN_GROUP`.

### `POST /api/campaigns/refresh-base-balance`

Forces a Base RPC lookup (USDC + ETH→USD), updates the eligibility flag, and
caches the result for 30 minutes.

### `GET /api/daily/state`

Returns today's `{ checkinClaimed, spinClaimed, streak }`.

### `POST /api/daily/checkin`

Idempotent per UTC day. On first claim:

```json
{ "awarded": 11, "claimed": true, "streak": 4, "xp": { ... } }
```

On repeat call:

```json
{ "awarded": 0, "claimed": false, "reason": "Check-in already claimed today" }
```

### `POST /api/daily/spin`

Idempotent per UTC day. Returns `{ awarded, claimed, xp }` on first call,
`{ awarded: 0, claimed: false, reason }` on repeat.

## Admin (`x-admin-key`)

### `GET /api/admin/launch-hub-layout`
### `PUT /api/admin/launch-hub-layout`

Body matches the public layout shape:

```json
{ "page": "launch_hub", "blocks": [{ "type": "DailyCheckinBlock", "props": {} }] }
```

### `GET /api/admin/campaigns`
### `PUT /api/admin/campaigns`

Body:

```json
{ "campaigns": [ /* CampaignDef[] */ ] }
```

### `GET /api/admin/x-rule-presets`
### `PUT /api/admin/x-rule-presets`

Body:

```json
{ "presets": [ /* XRulePreset[] */ ] }
```

### `GET /api/admin/gate-config`
### `PUT /api/admin/gate-config`

Controls which identity checks block the eligibility gate. PUT body accepts
either a bare config object or `{ "gateConfig": <config> }`. The backend
merges the patch over the current config and re-normalizes (defaults are
preserved for missing keys). Returns the new full config.

```json
{
  "gateConfig": {
    "baseBalanceEligible": { "required": false, "enabled": true, "label": "Hold $10 USD on Base", "description": "…" },
    "xLinked":              { "required": true,  "enabled": true, "label": "Connect X (Twitter)" },
    "xFollowsRektCeo":      { "required": true,  "enabled": true, "label": "Follow @rekt_ceo on X" },
    "discordLinked":        { "required": true,  "enabled": true, "label": "Connect Discord" },
    "discordInGuild":       { "required": true,  "enabled": true, "label": "Join Rekt CEO Discord" },
    "telegramLinked":       { "required": false, "enabled": true, "label": "Connect Telegram" },
    "telegramInGroup":      { "required": false, "enabled": true, "label": "Join Rekt CEO Telegram" }
  }
}
```

Semantics:

- `enabled=false` removes the row from the Launch Hub checklist entirely
  (and excludes it from the `missing[]`/`requirements[]` arrays in the
  bootstrap response).
- `required=true` makes the row block the gate. `required=false` shows
  the row with an `OPTIONAL` pill but does not block.
- `evmConnected` is **not** in this map. It is foundational and always
  required.

`XRulePreset.rules` shape:

```ts
{
  mention: string                   // "@rekt_ceo"
  mustHaveMemeImage: boolean
  minFriendTags: number
  hashtags: string[]                // ["#RektCEO", ...]
  minAccountAgeDays: number
  minLikesAfter24h: number
  delayBeforeCreditMinutes: number  // hold XP until this delay passes
  maxPerDay: number                 // cap per address
  decayCurveEnabled: boolean        // diminishing rewards across the day
}
```

## Status codes

| Code | When |
|---|---|
| 200 | Success. |
| 400 | Invalid body / provider / payload shape. |
| 401 | Missing or invalid JWT (user routes) or admin key (admin routes). |
| 503 | Admin route called but `ADMIN_API_KEY` is not configured on the backend. |

## Idempotency contract

- All daily endpoints are **idempotent per UTC day per address**. The Redis
  TTL of 30h is the source of truth.
- All XP credits are **append-only** to `campaign:ledger:<addr>`. We
  intentionally cap the list at 50 entries for the UI; the long ledger will
  move to Postgres later.
- Identity link/unlink calls are **last-writer-wins**. There is no version
  vector; the admin and the user share a single key per address.

## Versioning

The Launch Hub does not yet ship API versions in the path. When breaking
changes are needed we will introduce `/api/v2/...` rather than mutating these
shapes. Old shapes remain backward-compatible for a release at minimum.
