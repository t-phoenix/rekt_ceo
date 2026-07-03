# Architecture Overview

## Repos

| Path | Stack | Role |
|---|---|---|
| `rekt_website/` | React 18 (CRA + craco), wagmi, AppKit | User-facing site & Launch Hub |
| `rekt_backend/` | Node 20 + Express + ioredis | API, identity, XP, leaderboards |
| `rekt_admin/` | React + Vite + Tailwind | Admin UI for campaigns/layout/presets |
| `rekt_contracts/` (separate repo) | Foundry/Hardhat | Token, NFT, future XP-claim contracts |

The Launch Hub feature lives across the first three. Smart contracts are
referenced via env (addresses + ABIs) but never built or deployed by this repo.

## High-level data flow

```
                    ┌────────────────────┐
        wallet ──── │  rekt_website      │ ──── SIWE → JWT
                    │  (/launch)         │
                    └────────┬───────────┘
                             │ HTTPS /api/*
                             ▼
                    ┌────────────────────┐
                    │  rekt_backend      │
                    │  (Express)         │
                    └────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
        ┌──────────┐                ┌──────────────┐
        │  Redis   │                │  Base RPC    │  (USDC + ETH balances)
        └──────────┘                └──────────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  │ twitterapi.io     │ (X reads, future)
                                  │ Discord Bot       │
                                  │ Telegram Bot      │
                                  └───────────────────┘

                ┌────────────────────┐
                │  rekt_admin        │ ──── x-admin-key → /api/admin/*
                └────────────────────┘
```

## Backend modules

- `src/services/campaign.service.ts` — Single source of truth for layout,
  campaigns, X rule presets, identity, XP, daily state, invites, leaderboard.
  Reads/writes Redis through `redisManager`. Falls back to an in-process
  cache when Redis is unavailable so the API stays responsive during outages.
- `src/services/identity.service.ts` — Façade over identity link state and the
  Base USDC/ETH balance gate. Calls `campaignService.setBaseBalanceState`.
- `src/controllers/{campaign,daily,identity,admin}.controller.ts` — HTTP layer.
- `src/routes/{campaign,daily,identity,admin}.routes.ts` — Express routers.
- `src/middleware/auth.ts` — Existing JWT (SIWE) auth.
- `src/middleware/admin-auth.ts` — Shared-secret `x-admin-key` gate.

### Redis key map

```
campaign:layout:launch_hub                    JSON
campaign:list                                 JSON[]
campaign:rules:x_presets                      JSON[]
campaign:identity:<addr>                      JSON
campaign:xp:<addr>                            JSON
campaign:ledger:<addr>                        list of JSON entries (capped 50)
campaign:invite:<addr>                        JSON {code}
campaign:invite:code:<CODE>                   string -> address
campaign:daily:<addr>:<YYYY-MM-DD>:checkin    "1" with 30h TTL
campaign:daily:<addr>:<YYYY-MM-DD>:spin       "1" with 30h TTL
campaign:streak:<addr>                        JSON {count, lastDate}
campaign:base_balance:<addr>                  JSON {usd, eligible, ts}  (TTL 30m)
campaign:leaderboard:season                   ZSET (score=XP)
campaign:leaderboard:lifetime                 ZSET (score=XP)
```

## Frontend modules (rekt_website)

- `src/pages/launch/LaunchHub.js` — Page shell (hero + asset strip + block stack).
- `src/pages/launch/LaunchBlockRenderer.js` — Block components + renderer.
  All block types are mapped here; backend layout dictates render order.
- `src/pages/launch/launchAssets.js` — Brand asset map (stickers, network logos,
  provider colors).
- `src/pages/launch/launchHub.css` — Glass-on-magenta cards, accent stripes,
  spin wheel, podium, calendar streak.
- `src/services/campaign_api.js` — Fetch client. Reads JWT from
  `localStorage[authToken_<address>]` for protected calls.

## Admin modules

- `src/components/CampaignsPage.tsx` — Layout, Campaigns, X-presets editors.
- `src/services/api.ts` — Public + admin endpoints (`x-admin-key` header).

## Block contract

Every block component receives:

```ts
{
  data: BootstrapPayload     // identity, xp, daily, campaigns, leaderboard, invite, season, xTaskRules
  onRefresh: () => Promise   // re-fetches bootstrap to update UI
  walletAddress?: string     // primary EVM address
  ...block.props             // optional admin-driven overrides
}
```

To add a new block:

1. Implement a React component in `LaunchBlockRenderer.js` (or a sibling file).
2. Add it to `blockMap` in the same file.
3. (Optional) Add the type to `DEFAULT_BLOCK_TYPES` in
   `rekt_admin/src/components/CampaignsPage.tsx` so admins can add it via UI.
