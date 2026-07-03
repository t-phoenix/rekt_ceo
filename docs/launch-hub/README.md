# Rekt CEO — Launch Hub

The Launch Hub is the entry point for the Rekt CEO identity and campaign layer.
It powers daily loops (check-in, spin, social), independently configurable
campaigns, the XP/level/leaderboard system, and the upcoming on-chain reward
snapshots.

This folder is the developer + AI-agent reference. All files are written to be
readable by both humans and agents during onboarding.

## Index

- [`DEV_GUIDE.md`](./DEV_GUIDE.md) — **Start here.** End-to-end develop → check → ship.
- [`OVERVIEW.md`](./OVERVIEW.md) — Architecture, modules, data flow.
- [`ENV_KEYS.md`](./ENV_KEYS.md) — Every env variable + how to obtain it.
- [`DEPLOYMENT_RENDER.md`](./DEPLOYMENT_RENDER.md) — Render deploy (backend + Redis + admin + website).
- [`DATABASE.md`](./DATABASE.md) — Redis key schema today + Postgres roadmap.
- [`API.md`](./API.md) — REST surface for `rekt_website` and `rekt_admin`.
- [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md) — Configuring layout, campaigns, rule presets.
- [`INTEGRATIONS_X.md`](./INTEGRATIONS_X.md) — twitterapi.io setup + organic-X enforcement.
- [`INTEGRATIONS_DISCORD.md`](./INTEGRATIONS_DISCORD.md) — Discord OAuth + bot setup.
- [`INTEGRATIONS_TELEGRAM.md`](./INTEGRATIONS_TELEGRAM.md) — Telegram bot + login widget setup.
- [`SECURITY_AND_ANTIBOT.md`](./SECURITY_AND_ANTIBOT.md) — Trust score, organic rules, sybil signals.
- [`AI_AGENT_NOTES.md`](./AI_AGENT_NOTES.md) — Concise contract for AI agents touching this module.

## Quickstart (local)

```bash
# 1. Infra
cd rekt_backend
docker compose up -d                      # Redis (always)
docker compose --profile postgres up -d   # Redis + Postgres (when needed)

# 2. Backend (port 3000)
cd rekt_backend
cp .env.example .env   # fill in secrets, especially ADMIN_API_KEY + JWT_SECRET
pnpm install && pnpm dev

# 3. Website (port 3001 — backend already owns 3000)
cd ../rekt_website
PORT=3001 pnpm start

# 4. Admin (port 5173)
cd ../rekt_admin
pnpm install && pnpm dev
# Open the Campaigns tab and paste your ADMIN_API_KEY when prompted.
```

## What the Launch Hub gives you today

- A theme-aligned `/launch` page on the website with hero, identity stack,
  XP block, daily check-in (streak), daily spin (wheel), X mission, live
  campaigns, season leaderboard, invite code, and connect-guide cards.
- A backend that persists XP, daily state, identity links, invites,
  leaderboards, layout, campaigns, and Organic-X rule presets in Redis
  (with graceful in-memory fallback when Redis is unreachable).
- An admin Campaigns tab to edit layout/campaigns/presets without redeploys.
- An identity service with an on-chain Base balance gate (USDC + ETH→USD).

## What is wired now

- **X (Twitter)** — `twitterapi.io` adapter. Per-day, per-address nonce phrase;
  user posts a tweet containing the nonce, backend looks up `last_tweets` and
  matches. See [`INTEGRATIONS_X.md`](./INTEGRATIONS_X.md).
- **Discord** — OAuth2 (identify + guilds) + optional bot guild membership probe.
  Frontend hits `/api/identity/discord/oauth-url`, gets an authorize URL with a
  signed `state`. Discord redirects to `/api/identity/discord/callback`. The
  backend redirects to `${FRONTEND_URL}/launch?discord=ok|fail`.
- **Telegram** — Login Widget renders inline; backend HMAC-verifies the payload
  against `SHA-256(BOT_TOKEN)` and (optionally) checks `getChatMember`.
- **Solana** — manual address linking (until we add a Solana sign-in).

## What is intentionally still stubbed

- **Postgres** for ledger/event store. Compose profile + Render block are wired,
  schema is in [`DATABASE.md`](./DATABASE.md), but Redis remains the source of
  truth until we dual-write.
- **Snapshot → on-chain claim**. We have the season-XP data; the contract lives
  in a separate repo and gets consumed via env (`MINTER_CONTRACT_ADDRESS` etc).
- **Decay-curve credit + delayed XP credit** for X tasks (we currently credit
  on verify; delayed-credit job + signal checks come next).
