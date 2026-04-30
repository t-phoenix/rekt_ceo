# AI Agent Working Contract — Launch Hub

If you are an AI assistant editing this codebase, read this first.

## Mental model

- **Three apps, one feature**: `rekt_website` (UI), `rekt_backend` (API),
  `rekt_admin` (config). They share a single source of truth in Redis,
  brokered by `rekt_backend/src/services/campaign.service.ts`.
- **Smart contracts live elsewhere.** This repo only consumes addresses +
  ABIs via env. Do not add Foundry/Hardhat config here.
- **Everything is theme-aligned.** The website does not use generic
  "futuristic crypto" UI. Use brand assets in `rekt_website/src/creatives/`
  and the `launchAssets.js` map.

## Where to put things

| If you need to... | Edit |
|---|---|
| Add a backend route | `src/routes/<area>.routes.ts` + a controller in `src/controllers/` |
| Add backend business logic | A service in `src/services/`. Use Redis via `redisManager`, wrap with `withRedis(fn, fallback)` |
| Add a new website block | A component in `rekt_website/src/pages/launch/LaunchBlockRenderer.js` and register in `blockMap` |
| Use a brand asset | Import from `rekt_website/src/pages/launch/launchAssets.js` |
| Change website CSS | `rekt_website/src/pages/launch/launchHub.css` |
| Add an admin editor | A new `*Editor` component in `rekt_admin/src/components/CampaignsPage.tsx` |
| Add an env var | Update `rekt_backend/.env.example`, `render.yaml`, and `docs/launch-hub/ENV_KEYS.md` |

## Conventions

- Addresses are always **lowercased** before storage and Redis lookups.
- Daily TTL keys use **UTC date strings**.
- All API responses follow `{ success, data, error?, message? }`.
- Every admin route lives under `/api/admin/*` and is gated by
  `adminAuthMiddleware`.
- Every authenticated user route lives behind `authMiddleware` (existing
  SIWE JWT).
- Frontend block contract: `(data, onRefresh, walletAddress, ...props)`.

## Anti-patterns

- Do not add new top-level brand colors. Use the CSS variables in
  `rekt_website/src/index.css` (`--color-yellow`, `--color-red`,
  `--color-blue`, `--color-magenta`, `--color-purple`, `--color-green`).
- Do not store anything keyed by mixed-case addresses.
- Do not hard-code admin secrets in frontend code. The admin app reads the
  key from `localStorage[rekt_admin_key]` only.
- Do not call third-party APIs from the React app. Always proxy through the
  backend so we keep keys server-side and can layer caching/rate limits.

## Completing a task

When you finish a substantive change:

1. Run `ReadLints` over every file you touched.
2. If you added an env var, update all three: `.env.example`, `render.yaml`,
   `docs/launch-hub/ENV_KEYS.md`.
3. If you added a new block, update both:
   - `rekt_website/src/pages/launch/LaunchBlockRenderer.js` (`blockMap`)
   - `rekt_admin/src/components/CampaignsPage.tsx` (`DEFAULT_BLOCK_TYPES`)
4. If you changed a public API shape, update `docs/launch-hub/API.md`.

## What is intentionally not here

- Postgres. Redis is the only datastore today; see `DATABASE.md` for the
  migration plan.
- Real X/Discord/Telegram verification. Manual link via `/api/identity/link`
  is the MVP; real adapters are next.
- Per-user RBAC for admin. Single shared `ADMIN_API_KEY` is enough for now.
- On-chain XP claim. Snapshots will be Merkle trees consumed by the contracts
  repo when XP-on-chain ships.

## Useful entry points to read

- `rekt_backend/src/services/campaign.service.ts` — the core service.
- `rekt_backend/src/services/identity.service.ts` — identity + Base balance.
- `rekt_backend/src/routes/admin.routes.ts` — admin surface.
- `rekt_website/src/pages/launch/LaunchBlockRenderer.js` — every block lives here.
- `rekt_admin/src/components/CampaignsPage.tsx` — admin editors for layout,
  campaigns, X-rule presets.
