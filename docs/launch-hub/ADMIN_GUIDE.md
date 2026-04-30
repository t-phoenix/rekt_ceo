# Admin Guide — Configuring the Launch Hub

The admin UI lives at `/campaigns` inside `rekt_admin`. It uses the
`x-admin-key` header on every call. There is no per-user RBAC yet — anyone
with the key can edit. Treat the key as a master credential.

## 1. First-time setup

1. Make sure the backend has `ADMIN_API_KEY` set in Render (see
   [`ENV_KEYS.md`](./ENV_KEYS.md)).
2. Open the admin app, click **Campaigns**, and paste the key into the yellow
   bar at the top. It is stored only in `localStorage` for that browser.
3. The page now loads four editors:
   - **Eligibility Gate Config** — which identity checks block the gate (see §3).
   - **Launch Hub Layout** — block order on the website.
   - **Campaigns Catalog** — what shows under "Live Campaigns".
   - **Organic-X Rule Presets** — the rules engine for X share verification.

## 2. Eligibility Gate Config

This editor controls which identity checks must pass before the user can
access campaign tasks, daily spin, daily check-in, etc.

Each row has two switches:

| Switch | Effect |
|---|---|
| **Enabled** | If `HIDDEN`, the row is removed from the Launch Hub checklist entirely (used to fully retire a check, e.g. when the X follow API is rate-limited). |
| **Required** | If `REQUIRED`, the check blocks the gate. If `OPTIONAL`, the row is shown with an `OPTIONAL` pill but is not gate-blocking. |

You can also edit the **Label** (shown to users in the checklist) and an
optional **Description** (used in tooltips and dev docs). They fall back to
the in-code defaults from `DEFAULT_GATE_CONFIG` in
`rekt_backend/src/services/campaign.service.ts` when blank.

| Key | Default | What it checks |
|---|---|---|
| `baseBalanceEligible` | OPTIONAL | Wallet holds ≥ `BASE_BALANCE_THRESHOLD_USD` (USDC + ETH on Base). |
| `xLinked` | REQUIRED | User completed the X OAuth 2.0 / PKCE flow. |
| `xFollowsRektCeo` | REQUIRED | Linked account follows `X_FOLLOW_TARGET` (default `@rekt_ceo`). |
| `discordLinked` | REQUIRED | User completed the Discord OAuth flow. |
| `discordInGuild` | REQUIRED | Linked account is a member of `DISCORD_GUILD_ID`. |
| `telegramLinked` | OPTIONAL | User completed the Telegram Login Widget flow. |
| `telegramInGroup` | OPTIONAL | Linked account is a member of `TELEGRAM_CHAT_ID`. |

`evmConnected` is **not** in this editor — it is foundational. Without an
SIWE'd wallet there is no identity blob, no JWT, and nothing to gate on.

Saves write to `campaign:gate-config:v1` in Redis (or in-memory cache when
Redis is unavailable). The change applies on the user's next bootstrap call;
no website redeploy needed.

> Tip: dependent rows behave naturally — e.g. if `xLinked` is OPTIONAL but
> `xFollowsRektCeo` is REQUIRED, the gate stays blocked until the user links
> X anyway, because following requires linking. The admin UI shows a hint
> reminding you of this.

### Examples

- **"Telegram is required tomorrow":** flip `telegramLinked` to REQUIRED. If
  you also want to enforce group membership, flip `telegramInGroup` too.
- **"Drop the $10 Base balance check entirely":** flip `baseBalanceEligible`
  to HIDDEN. The row disappears from the Launch Hub checklist.
- **"Loosen the gate for a marketing push":** flip `discordInGuild` to
  OPTIONAL — users still see the row, but they can join campaigns without
  being a server member.

## 3. Layout editor

Use **↑/↓** to reorder blocks, **Remove** to drop a block, and the bottom
chip row to add any block from the registry. Each block is a known React
component on the website (see `LaunchBlockRenderer.js`). Save propagates the
new layout to Redis (`campaign:layout:launch_hub`). The website reads it on
the next visit / refresh — no redeploy needed.

Available block types (today):

- `SeasonStripBlock`
- `EligibilityBannerBlock`
- `IdentityChecklistBlock`
- `XPSummaryBlock`
- `DailyCheckinBlock`
- `DailySpinBlock`
- `XShareTaskBlock`
- `CampaignListBlock`
- `LeaderboardBlock`
- `ConnectGuideBlock`

To add a new block type:

1. Build the React component in `rekt_website/src/pages/launch/LaunchBlockRenderer.js`.
2. Register it in the `blockMap` at the bottom of that file.
3. Add the type string to `DEFAULT_BLOCK_TYPES` in
   `rekt_admin/src/components/CampaignsPage.tsx` so admins see it as an option.

## 4. Campaigns catalog

Each campaign row maps to a card on the Live Campaigns block. Fields:

| Field | Notes |
|---|---|
| `id` | Stable string. Used as React key. Do not change after launch. |
| `title` | Displayed as the card heading. |
| `status` | `LIVE`, `DRAFT`, `PAUSED`, `SOON`. Anything renders, but the website renders `status` literally so use these. |
| `rewardText` | Subtitle line. Keep short; "Earn up to 150 XP/day". |
| `cta` | Button label. |
| `color` (advanced) | `yellow`, `red`, `blue`, `purple`, `green`. Drives the top accent stripe. Edit in JSON via API for now. |
| `iconKey` (advanced) | Picks the sticker (`meme`, `tag`, `discord`, `invite`, `pumpFun`, etc.). Same — JSON-editable today. |

Removing a campaign hides it immediately. Re-adding the same `id` is safe;
nothing is keyed off campaign IDs in storage yet.

## 5. Organic-X rule presets

Each preset defines one set of rules a campaign can require for an X post to
qualify for XP. The fields directly drive the verification engine:

| Field | What it does |
|---|---|
| `mention` | Must include this exact handle (case-insensitive). |
| `mustHaveMemeImage` | Reject posts without a media attachment. |
| `minFriendTags` | Number of `@handle` tags inside the post body. |
| `hashtags` | Required hashtags (case-insensitive contains). |
| `minAccountAgeDays` | Account must be at least this old. |
| `minLikesAfter24h` | Hold XP until the post passes this engagement bar. |
| `delayBeforeCreditMinutes` | XP only credited after this delay (anti-bot). |
| `maxPerDay` | Hard cap of qualifying posts per UTC day per address. |
| `decayCurveEnabled` | Diminishing returns across the day (e.g. 100% → 60% → 30%). |

Saved presets persist in `campaign:rules:x_presets`.

## 6. Operational tips

- After a save, click **Save Gate Config** / **Save Layout** / **Save Catalog** / **Save Presets**.
  The buttons block while writing; success is silent (no toast yet).
- If the page shows an "Admin request failed" red bar after save, the most
  likely causes are:
  - `ADMIN_API_KEY` mismatch — re-paste the key in the yellow bar.
  - Backend hot-reloaded and lost the env var — re-deploy.
  - CORS — confirm the admin's domain is in `CORS_ORIGIN`.
- To roll back a botched edit, you have two options:
  1. Re-edit and save with the previous values.
  2. `redis-cli DEL campaign:layout:launch_hub` (or the campaigns / presets /
     `campaign:gate-config:v1` key) to fall back to the in-code defaults baked
     into `campaign.service.ts`.

## 7. Future controls (not yet shipped)

- Per-user audit log of who saved what.
- Multi-environment "Promote to prod" workflow.
- Visual block preview inside the admin (today the website is the preview).
- Per-campaign rule-preset binding inside the editor (today: edit JSON directly).
