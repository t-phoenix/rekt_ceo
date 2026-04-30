# Launch Hub — Dev Guide

End-to-end workflow for building, testing and shipping the Launch Hub stack
(`rekt_backend`, `rekt_website`, `rekt_admin`) with Redis today and Postgres
on the roadmap. If a step says "Render", we're talking about the existing
[Render](https://dashboard.render.com) blueprint defined in
[`rekt_backend/render.yaml`](../../rekt_backend/render.yaml).

---

## TL;DR commands

```bash
# 0. Infra
cd rekt_backend
docker compose up -d                   # Redis only (default)
docker compose --profile postgres up -d # Redis + Postgres (when needed)

# 1. Backend (port 3000)
cd rekt_backend
cp .env.example .env  # edit the values, then:
pnpm install
pnpm dev

# 2. Website (port 3001 — backend already owns 3000)
cd rekt_website
PORT=3001 pnpm start

# 3. Admin dashboard (port 5173)
cd rekt_admin
pnpm install
pnpm dev
```

Smoke test:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/campaigns/launch-hub-layout
```

---

## 1. Local infrastructure

### Redis (always on)

The whole Launch Hub state is in Redis today (campaign layout, X-rule presets,
identity blob per address, XP, daily check-in/spin, streaks, invite codes,
leaderboard ZSETs, Base balance cache).

```bash
cd rekt_backend
docker compose up -d redis
docker compose ps
docker exec -it rekt_redis redis-cli ping        # → PONG
docker exec -it rekt_redis redis-cli keys 'campaign:*'
```

The backend gracefully degrades to in-memory if Redis is down — useful for
quick frontend iteration, but you'll lose state on restart.

### Postgres (optional today, required for prod scale)

We ship Postgres behind a docker-compose profile so it stays out of your way
until you need it.

```bash
docker compose --profile postgres up -d postgres
docker exec -it rekt_postgres psql -U rekt -d rekt_ceo -c '\l'
```

Default DSN: `postgresql://rekt:rekt@localhost:5432/rekt_ceo` (also pre-set in
`.env.example`). The backend does **not** require `DATABASE_URL` yet — once
the migration lands, `DATABASE.md` will spell out the table schema and the
`pg` integration. Until then the only thing it does is sit there ready.

---

## 2. Backend (`rekt_backend`)

```bash
cd rekt_backend
cp .env.example .env
# fill in: BACKEND_PRIVATE_KEY, JWT_SECRET, ADMIN_API_KEY, PINATA_*, social keys
pnpm install
pnpm dev
```

Hot-reload runs via `ts-node-dev`. The server listens on `PORT` (default 3000).

### Env vars that matter for the Launch Hub

| Name | What it does | Required for |
|---|---|---|
| `JWT_SECRET` | Signs SIWE-issued JWTs and the Discord OAuth `state`. Min 32 chars. | All identity flows |
| `ADMIN_API_KEY` | Header `x-admin-key` for `/api/admin/*` | rekt_admin |
| `BASE_RPC_URL`, `BASE_BALANCE_THRESHOLD_USD`, `ETH_PRICE_USD_FALLBACK` | $10-on-Base eligibility gate | Eligibility banner |
| `TWITTERAPI_IO_KEY` | X reads via twitterapi.io | X verification |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | OAuth code exchange | Discord linking |
| `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` | Optional guild membership probe | Discord guild gate |
| `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Login Widget render + HMAC verify + group probe | Telegram linking |
| `FRONTEND_URL` | Where the Discord OAuth callback redirects back to | Discord linking |
| `CORS_ORIGIN`, `CORS_ORIGIN_2` | Allowed browser origins | Frontend + admin |

The full reference lives in [`ENV_KEYS.md`](./ENV_KEYS.md).

### Key files (where things live)

```
rekt_backend/src
├── controllers/
│   ├── campaign.controller.ts     ← public Launch Hub reads
│   ├── daily.controller.ts        ← /api/daily/checkin /spin /state
│   ├── identity.controller.ts     ← X / Discord / Telegram / manual link
│   └── admin.controller.ts        ← layout / campaigns / X-rule presets
├── services/
│   ├── campaign.service.ts        ← Redis-backed layout, XP, daily, leaderboard
│   ├── identity.service.ts        ← Base RPC balance + markLinked façade
│   ├── twitter.service.ts         ← twitterapi.io wrapper
│   ├── discord.service.ts         ← OAuth + bot membership
│   └── telegram.service.ts        ← HMAC verify + getChatMember
├── middleware/
│   ├── auth.ts                    ← SIWE JWT bearer auth
│   └── admin-auth.ts              ← x-admin-key header gate
└── routes/
    ├── campaign.routes.ts
    ├── daily.routes.ts
    ├── identity.routes.ts
    └── admin.routes.ts
```

### TypeScript checks

```bash
pnpm exec tsc --noEmit -p tsconfig.json
```

There are pre-existing errors in `controllers/info.controller.ts` (unrelated
to the Launch Hub). New code under `services/`, `controllers/identity.*`,
`controllers/campaign.*`, `controllers/daily.*` and `controllers/admin.*`
must stay clean.

### Smoke testing the API

```bash
# Health
curl http://localhost:3000/api/health

# Public reads (no auth)
curl http://localhost:3000/api/campaigns/launch-hub-layout
curl http://localhost:3000/api/campaigns/list
curl http://localhost:3000/api/campaigns/leaderboard

# SIWE → JWT (in DevTools after a wallet sign-in)
TOKEN=eyJhbGciOiJI…   # localStorage.getItem('authToken_<address>')

# Identity
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/identity/me

# Daily
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/daily/checkin

# Admin (requires x-admin-key)
curl -H "x-admin-key: $ADMIN_API_KEY" http://localhost:3000/api/admin/campaigns
```

---

## 3. Frontend (`rekt_website`)

```bash
cd rekt_website
PORT=3001 pnpm start
```

Why `PORT=3001`: the backend uses 3000 in dev. Set
`REACT_APP_BACKEND_API_URL=http://localhost:3000` in `rekt_website/.env`
(already done in your local `.env`).

Open http://localhost:3001/launch.

### What you should see when wired correctly

- **Lock-screen "CAMPAIGNS LOCKED" banner** appears at the top until the user
  passes every requirement. Only the Identity Stack, Eligibility checklist,
  Season strip, and Connect Guide render in this state — daily spin, daily
  check-in, X mission, leaderboard, campaigns and invite code are hidden.
- **Eligibility banner** shows `BASE BAL: $X.XX` plus a per-requirement
  pass/fail list. Which rows are surfaced and which ones block the gate is
  driven by the **admin Gate Config** (`/api/admin/gate-config`, edited from
  the Campaigns admin page → Eligibility Gate Config). Defaults that ship:

  | Check | Default |
  |---|---|
  | `evmConnected` | REQUIRED (locked, not in admin UI) |
  | `baseBalanceEligible` | OPTIONAL |
  | `xLinked`, `xFollowsRektCeo` | REQUIRED |
  | `discordLinked`, `discordInGuild` | REQUIRED |
  | `telegramLinked`, `telegramInGroup` | OPTIONAL |

  Optional rows render with a yellow `OPTIONAL` pill and a neutral icon;
  required rows go red until they pass. The banner turns green when every
  *required* check passes, regardless of optional state. Admins can also
  HIDE any row entirely (e.g. retire `baseBalanceEligible` while the price
  oracle is wired up) — hidden rows are absent from the bootstrap arrays.
- **Identity stack** has up to 5 rows: EVM (auto), X, Discord, Telegram,
  Solana (`OPTIONAL`). The X / Discord / Telegram rows render only when the
  matching `*Linked` key is `enabled` in the Gate Config, and render with the
  `OPTIONAL` pill when `required=false`. Solana is always optional today
  (auto-linked via the wallet adapter once the user picks a wallet).
  Each social row shows a verified-chip:
    - X: `FOLLOWS @REKT_CEO` / `NOT FOLLOWING @REKT_CEO` / `FOLLOW CHECK SKIPPED`
    - Discord: `IN REKT CEO SERVER` / `NOT IN SERVER` / `GUILD CHECK SKIPPED`
    - Telegram: `IN REKT CEO GROUP` / `NOT IN GROUP` / `GROUP CHECK SKIPPED`
  ("skipped" = the relevant bot/key isn't configured; treated as ok by the gate
  to avoid softlocks during early access).
- **Daily Check-In**, **Daily Spin**, **Live Campaigns**, **Leaderboard**,
  **XP summary**, **Daily X Mission** and **Invite Code** unlock simultaneously
  the moment `eligibility.eligible === true`.

### How to test each social flow

#### X (Twitter)
1. Sign in with EVM wallet on `/launch`.
2. Click the X "Connect" button → frontend hits `/api/identity/x/oauth-url`,
   gets the authorize URL (with a signed `state` JWT and PKCE
   `code_challenge`).
3. Browser redirects to `https://twitter.com/i/oauth2/authorize?...`. User
   consents.
4. X calls back to `${X_REDIRECT_URI}` (the **backend** path — must EXACTLY
   match what's registered on the app in the X dev portal). Backend
   consumes the PKCE verifier, exchanges `code` for an access token,
   fetches `/2/users/me?user.fields=username,name,confirmed_email`,
   optionally probes `/2/users/:id/following` to verify the user follows
   `@rekt_ceo`, marks `xLinked = true`, persists `xId` + `xEmail` (when
   X grants `users.email`), and redirects to
   `${FRONTEND_URL}/launch?x=ok&handle=…`.
5. Frontend reads the toast, refreshes the bootstrap, the row turns green.

If you see `?x=fail&reason=exchange_failed`, the most common cause is the
`X_REDIRECT_URI` not matching the dev portal exactly — including http vs
https, port, and `127.0.0.1` vs `localhost` (X tier-dependent).

#### Discord
1. Click Discord "Connect" → frontend hits `/api/identity/discord/oauth-url`,
   gets a Discord authorize URL with a signed `state`.
2. Browser redirects to Discord, user consents.
3. Discord calls back to `${FRONTEND_URL or first CORS origin}/api/identity/discord/callback?code=…&state=…`
   (this is the **backend** path — make sure it matches the Redirect URI you
   registered in the Discord Dev Portal).
4. Backend exchanges `code` for an access token, fetches `/users/@me`
   with scopes `identify guilds email`, optionally verifies guild
   membership with `DISCORD_BOT_TOKEN`, persists `discordEmail` +
   `discordEmailVerified` when granted, marks linked, redirects to
   `${FRONTEND_URL}/launch?discord=ok&handle=…` (or `?discord=fail&reason=…`).
5. The frontend reads the query, shows a green/red banner, refreshes identity.

#### Telegram (optional by default, admin-configurable)
1. **Telegram defaults to OPTIONAL.** The Launch Hub gate does not block on
   it unless an admin flips `telegramLinked` / `telegramInGroup` to
   REQUIRED in the Gate Config (see `ADMIN_GUIDE.md`). If you ship without
   `TELEGRAM_BOT_USERNAME` / `TELEGRAM_BOT_TOKEN`, the Telegram row simply
   shows the OPTIONAL pill with a "not configured" message — and if it is
   marked REQUIRED in that state the gate will stay locked, so coordinate
   the admin toggle with the env vars.
2. To enable: set `TELEGRAM_BOT_USERNAME` (no `@`), `TELEGRAM_BOT_TOKEN`,
   optionally `TELEGRAM_CHAT_ID` on the backend.
3. The Telegram Login Widget renders inside the row. **If the page origin
   isn't registered with the bot via `/setdomain`, the widget refuses to
   inject an iframe.** The frontend now probes for that 2 s after script
   load and surfaces an in-app fallback banner with the current
   `window.location.host` and step-by-step BotFather instructions, so
   non-developer users aren't stuck.
4. User clicks the widget → Telegram returns a payload to
   `window.__rektOnTelegramAuth`, which POSTs `/api/identity/telegram/verify`.
5. Backend HMACs the payload against `SHA-256(BOT_TOKEN)`, optionally calls
   `getChatMember` to confirm group join, marks linked.

> Telegram requires the widget to be served from a domain you've registered
> with [@BotFather](https://t.me/botfather) via `/setdomain`. **Telegram does
> NOT accept `localhost` or IP addresses for this widget.** For local dev,
> tunnel via `ngrok http 3001` and register the `*.ngrok-free.app` host
> instead.

#### Solana (optional)
1. **Solana is OPTIONAL** at gate time, but required when the user wants
   to play pump.fun-buy / Solana-bridge tasks.
2. The Solana row uses the same wallet picker as the Buy CEO page on the
   Introduction (`useWalletModal` from `@solana/wallet-adapter-react-ui` —
   Phantom + Solflare).
3. Click **CONNECT** → wallet picker opens → user approves Phantom /
   Solflare. The Launch Hub watches `useWallet().publicKey` via a
   `useEffect` and auto-calls `POST /api/identity/link` with
   `{ provider: "solana", handle: <base58 address> }`. **No second
   signature is required** — the SIWE JWT obtained on EVM connect is
   reused.
4. Disconnect / unlink: hitting **UNLINK** disconnects the Solana wallet
   adapter and clears the link from Redis simultaneously.

---

## 4. Admin dashboard (`rekt_admin`)

```bash
cd rekt_admin
pnpm install
pnpm dev   # http://localhost:5173
```

In the dashboard:
1. Open the **Campaigns** tab.
2. Paste your `ADMIN_API_KEY` into the Admin Key bar.
3. You can edit the Launch Hub layout, the campaigns catalog, and the
   Organic-X rule presets. All writes hit `/api/admin/*` which is gated by
   the `x-admin-key` header.

If the bar shows "Admin key required", your key is missing or wrong.

---

## 5. Develop → check → ship

A safe loop for new identity-layer work:

1. **Branch off `main`.**
2. **Run `pnpm dev` in all three apps.** Use docker-compose for Redis and (when
   needed) Postgres. Most identity work needs only Redis.
3. **Mock first, then wire the real adapter.** All four `*.service.ts` files
   in `rekt_backend` follow the same pattern — they expose `isConfigured()`
   so the frontend / controllers can degrade gracefully.
4. **Type-check + smoke test.**
   ```bash
   cd rekt_backend && pnpm exec tsc --noEmit -p tsconfig.json
   cd rekt_website && pnpm exec eslint src --ext .js,.jsx
   ```
5. **Manual QA.** Walk the identity stack from a fresh wallet:
   `connect → X → Discord → Telegram → Solana`.
6. **Push, open PR, get green CI.**
7. **Promote env keys to Render** before merging:
   - `Settings → Environment` for the `rekt-ceo-backend` service. Add anything
     new from `.env.example` that's marked `sync: false` in `render.yaml`.
   - For Discord OAuth: the **Render Redirect URI** is
     `https://<your-backend>.onrender.com/api/identity/discord/callback`.
     Add it as an authorized redirect in the Discord Dev Portal **before** the
     deploy goes live, otherwise OAuth will reject the callback.
   - For Telegram: re-run `/setdomain` with @BotFather to add your prod domain.
8. **Render auto-deploys on merge** for the backend and any static sites
   wired to your repo. Smoke after deploy:
   ```bash
   curl https://<backend>.onrender.com/api/health
   curl https://<backend>.onrender.com/api/campaigns/launch-hub-layout
   ```
   And re-test the identity flows from the production frontend.

For the full deploy walkthrough see
[`DEPLOYMENT_RENDER.md`](./DEPLOYMENT_RENDER.md).

---

## 6. Postgres migration plan

Today every Launch Hub key lives in Redis. Once we want long-term retention,
analytics, and snapshot-friendly queries, we'll roll forward to Postgres in
this order:

1. **Stand up the database**
   - Local: `docker compose --profile postgres up -d`
   - Render: uncomment the `rekt-ceo-postgres` block in `render.yaml` and
     `DATABASE_URL` `fromDatabase` linker, then `Sync` the blueprint.
2. **Add `node-postgres`** (`pg`) to `rekt_backend` and a thin `db` client in
   `src/utils/db.ts` mirroring `redis.ts` (lazy connect + graceful degrade).
3. **Schema** (initial draft — see [`DATABASE.md`](./DATABASE.md) for the
   running spec):
   - `users(address pk, created_at, evm_chain_id)`
   - `identity_links(address fk, provider, handle, verified_at, last_seen_at, raw_payload jsonb)`
   - `xp_ledger(id pk, address, amount, reason, ts, season_id)`
   - `daily_actions(address, day, kind, ts, season_id)`
   - `invites(code pk, owner_address, redeemer_address, redeemed_at)`
   - `campaigns(id pk, json)` (admin-managed)
   - `season_snapshots(season_id, snapshot_at, merkle_root, leaves jsonb)`
4. **Dual-write** Redis + Postgres for a few weeks. Redis stays the hot path.
5. **Cutover** reads to Postgres for analytics + snapshots, keep Redis for
   real-time daily actions, leaderboards, and rate limiting.

Until step 4 is in place, treat Redis as the source of truth. Take periodic
RDB dumps if you want a backup:

```bash
docker exec -it rekt_redis redis-cli BGSAVE
docker cp rekt_redis:/data/dump.rdb ./backups/redis-$(date +%F).rdb
```

---

## 7. Common gotchas

- **Port collision on 3000.** The backend takes 3000; the website needs `PORT=3001`.
- **Stale JWT after wallet switch.** Each address gets its own `authToken_<addr>`
  in localStorage. If verification flows return 401, sign in again.
- **Discord callback says `bad_state`.** That means `JWT_SECRET` between request
  and callback isn't the same — most often a stale dev server. Restart the backend.
- **Telegram widget won't render.** Almost always a missing `/setdomain`
  in @BotFather. Telegram silently fails to load otherwise. The Launch
  Hub now detects this 2 s after script load and shows an in-app fallback
  banner with the current `window.location.host` plus exact BotFather
  steps (`@BotFather → /setdomain → @<bot> → <host>`). Telegram does NOT
  accept `localhost` or IP addresses; tunnel via `ngrok http 3001` for
  local dev.
- **twitterapi.io 401.** Wrong / expired key. Generate a new one and update
  `TWITTERAPI_IO_KEY`.
- **Base balance always $0.00.** `BASE_RPC_URL` is wrong, rate-limited, or
  blocked from your network. Try `https://mainnet.base.org`.

---

## 8. Pointers

- API surface: [`API.md`](./API.md)
- Env vars (full table): [`ENV_KEYS.md`](./ENV_KEYS.md)
- Deploy on Render: [`DEPLOYMENT_RENDER.md`](./DEPLOYMENT_RENDER.md)
- Per-protocol setup:
  - X: [`INTEGRATIONS_X.md`](./INTEGRATIONS_X.md)
  - Discord: [`INTEGRATIONS_DISCORD.md`](./INTEGRATIONS_DISCORD.md)
  - Telegram: [`INTEGRATIONS_TELEGRAM.md`](./INTEGRATIONS_TELEGRAM.md)
- Storage layout: [`DATABASE.md`](./DATABASE.md)
- Anti-bot strategy: [`SECURITY_AND_ANTIBOT.md`](./SECURITY_AND_ANTIBOT.md)
- Notes for AI assistants: [`AI_AGENT_NOTES.md`](./AI_AGENT_NOTES.md)
