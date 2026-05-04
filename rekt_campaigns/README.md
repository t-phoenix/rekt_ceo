# Launch Hub — campaigns API (`rekt_campaigns`)

This folder contains **only** the Launch Hub backend: `/api/campaigns`, `/api/daily`, `/api/identity`, and `/api/admin` (layout, XP, invites, etc.). The Node app lives at **this directory root** (`package.json`, `src/`, `.env.example`), with no extra nesting.

**UI lives in the main apps** (not here):

- **`rekt_website`** — Launch Hub page (`/launch`), `campaign_api.js`, `useSiweAuth`, wallet UI.
- **`rekt_admin`** — Campaigns configuration page.

---

## Local development

### Prerequisites

- **Node 18+**
- **Redis** (local or Docker) — same Redis can be shared with `rekt_backend` only if you intentionally want shared state; typically use one `REDIS_URL` per service in dev or separate DB indexes (this app uses `campaign:*` keys).

### 1. Main backend (`rekt_backend`) — SIWE

The site gets JWTs from the main API (`/api/auth/nonce`, `/api/auth/verify`). Run it first so SIWE works.

```bash
cd rekt_backend
cp .env.example .env   # fill JWT_SECRET, REDIS_URL, RPC, contracts, Pinata…
pnpm install           # or npm install
pnpm dev               # default http://localhost:3000 — check your .env PORT
```

### 2. Campaigns API (`rekt_campaigns`)

Must use the **same `JWT_SECRET`** as `rekt_backend` so Bearer tokens minted by SIWE are accepted.

```bash
cd rekt_campaigns
cp .env.example .env
# Set JWT_SECRET (match rekt_backend), REDIS_URL, CORS_ORIGIN, ADMIN_API_KEY, …
npm install
npm run dev
```

Defaults to **`http://localhost:4047`** (`PORT` in `.env`).

### 3. Website (`rekt_website`)

Point the SPA at **two** bases: main API + campaigns API.

```bash
cd rekt_website
# .env — see `.env.example` in this repo for variable names
```

| Variable | Purpose |
|---------|---------|
| `REACT_APP_BACKEND_API_URL` | Main backend (auth, mint, info). Usually `http://localhost:3000` (your `PORT`). |
| **`REACT_APP_CAMPAIGN_API_URL`** | Campaigns API. **`http://localhost:4047`** when running `rekt_campaigns`. If omitted, Launch Hub URLs fall back to `REACT_APP_BACKEND_API_URL` (won’t work until those routes exist on the main server). |

```bash
npm start    # or yarn start — typically port 3001
```

### 4. Admin (`rekt_admin`)

| Variable | Purpose |
|---------|---------|
| `VITE_API_URL` | Main backend (pricing, mint, etc.). |
| **`VITE_CAMPAIGN_API_URL`** | Campaign admin + layout + bootstrap reads. **`http://localhost:4047`** in dev when using the split service. If omitted, falls back to `VITE_API_URL`. |

Optional: `VITE_ADMIN_API_KEY` (same logical value as `ADMIN_API_KEY` on the campaigns API).

```bash
cd rekt_admin
cp .env.example .env    # created in repo root rekt_admin
pnpm dev                # port from Vite, often 5173
```

### OAuth redirects (X / Discord)

Register redirect URLs against the **campaigns** host/port, not the main backend:

- X: `{CAMPAIGN_API_ORIGIN}/api/identity/x/callback`
- Discord: `{CAMPAIGN_API_ORIGIN}/api/identity/discord/callback`

Set **`X_REDIRECT_URI`** / **`DISCORD_REDIRECT_URI`** in `rekt_campaigns/.env` to match (defaults in code assumed port 3000 — **override when using port 4047**).

Set **`FRONTEND_URL`** on the campaigns server to your site origin (e.g. `http://localhost:3001`) so OAuth redirects return users to `/launch`.

---

## On-chain campaigns (admin v2)

Editors in **rekt_admin → Campaigns** can define **schema v2** rows: display copy (title, subtitle, CTA label, external `actionUrl`), **XP** rewards, **chain id**, and a **verification mode**:

- **none** — marketing card only (`GET` bootstrap still returns it; verify returns `not_verifiable`).
- **snapshot** — user calls `POST /api/campaigns/:campaignId/onchain-verify` once; the server runs read-only `eth_call` against rules (ERC-20 min balance, ERC-721 min balance, ERC-721 `ownerOf`).
- **held_window** — first successful check records a **hold anchor** in Redis; after `minHoldSeconds` wall time, a later check that still passes the rule completes the claim. If the user loses eligibility before claim, the anchor is cleared when the rule fails (clock can restart — see code).

**Security & operations (required reading):**

| Topic | Behavior |
|-------|----------|
| RPC | **Read-only** RPC calls only; the server never submits transactions for verification. |
| Contracts | Admins can aim rules at **any** contract address — treat user-facing copy as **“do your own research”** and consider an allowlist env in a future iteration. |
| XP | Completion is **SET NX** on a per-user key before `addXp`; replays return `already_completed`. |
| Cost / abuse | Verification is **rate-limited** (per IP, user, campaign). |
| “True” continuous hold | **v1** proves **minimum wall time** between first seen eligibility and claim, plus **current** rule pass at claim — not full custody history without indexing. Document that in user-facing copy where needed. |

**Multi-chain RPC:** set `RPC_URL_CHAIN_{chainId}` (e.g. `RPC_URL_CHAIN_84532` for Base Sepolia). Base mainnet `8453` also falls back to `BASE_RPC_URL` or `RPC_URL` from [`config` / env](src/config/index.ts).

**Website:** Launch Hub campaign cards use bootstrap `viewerProgress` plus `POST …/onchain-verify` (Bearer SIWE JWT); users must pass the same **eligibility gate** as the rest of the hub.

---

## Production deploy (outline)

1. **Deploy main backend** (Render/Fly/etc.) — auth + mint only; **`JWT_SECRET`** is the source of truth for SIWE.
2. **Deploy campaigns service** — build from `rekt_campaigns/` (`pnpm install && pnpm build` / `npm run build`), set `PORT` (platform often injects `$PORT`). Set **`JWT_SECRET`** identical to step 1, **`REDIS_URL`**, **`DATABASE_URL`** if using invite Postgres ledger, **`CORS_ORIGIN`** for prod web + admin origins, **`ADMIN_API_KEY`**, integration keys (`X_*`, Discord, Telegram, `TWITTERAPI_IO_KEY`).
3. Run **Postgres migration** once: `rekt_campaigns/migrations/001_schema.sql` when `DATABASE_URL` is configured.
4. **Deploy frontend** — set **`REACT_APP_BACKEND_API_URL`**, **`REACT_APP_CAMPAIGN_API_URL`**, **`VITE_API_URL`**, **`VITE_CAMPAIGN_API_URL`** to HTTPS URLs for each service.
5. **Render:** add a second Web Service with **`rootDir: rekt_campaigns`** — use the same `.env.example` patterns (health: `GET /health`).

---

## Environment files

| File | Purpose |
|------|---------|
| **`rekt_campaigns/.env.example`** | All variables accepted by the campaigns server (copy to `.env`). |
| **`rekt_backend/.env.example`** | Main NFT backend only. |
| **`rekt_website/.env.example`** | Includes **campaign URL** vars for split API. |
| **`rekt_admin/.env.example`** | Includes **`VITE_CAMPAIGN_API_URL`**. |

**Port recap:** campaigns default **`4047`** (`PORT`). Main backend is usually **`3000`**. Frontend dev server may be **`3001`** or **`5173`** — set `CORS_ORIGIN` / `FRONTEND_URL` accordingly, not magic ports in code.

