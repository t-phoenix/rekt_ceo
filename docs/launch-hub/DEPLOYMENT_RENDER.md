# Render Deployment — Backend, Redis, Admin, Website

This stack runs entirely on Render. Backend is a Web Service, Redis is a
managed key-value store, the website is a Static Site (CRA build), and the
admin app is a Static Site (Vite build).

## 0. Prerequisites

- A Render account at <https://dashboard.render.com>.
- Repos pushed to GitHub/GitLab. Render reads from the connected repo.
- The secrets in [`ENV_KEYS.md`](./ENV_KEYS.md) ready to paste.

## 1. Backend + Redis (managed by `render.yaml`)

`rekt_backend/render.yaml` already declares both services. To bootstrap:

1. In Render, **New → Blueprint**, select your repo, and pick `rekt_backend/render.yaml`.
2. Render will create:
   - `rekt-ceo-backend` (Web Service, Node, port 3000)
   - `rekt-ceo-redis` (managed Redis, `allkeys-lru` policy)
3. Render auto-injects `REDIS_URL` into the backend via the
   `fromDatabase.connectionString` block — no manual wiring.
4. Open the backend service → **Environment** and fill all keys flagged
   `sync: false` in `render.yaml`. At minimum:
   - `BACKEND_PRIVATE_KEY`
   - `MINTER_CONTRACT_ADDRESS`, `PFP_COLLECTION_ADDRESS`, `MEME_COLLECTION_ADDRESS`, `CEO_TOKEN_ADDRESS`
   - `PINATA_JWT`
   - `JWT_SECRET` (≥32 chars, random)
   - `CORS_ORIGIN` (e.g. `https://rekt.ceo`)
   - `RPC_URL` (Alchemy/QuickNode/Base official)
   - **`ADMIN_API_KEY`** (new — required for `/api/admin/*` and the admin UI)
5. Hit **Manual Deploy → Clear build cache & deploy**.
6. Health check: `GET https://<your-service>.onrender.com/api/health` → 200.

### Verifying the Launch Hub additions

```bash
# 1. Layout (no auth)
curl https://<your-service>/api/campaigns/launch-hub-layout

# 2. Bootstrap with no address (anonymous shape)
curl https://<your-service>/api/campaigns/launch-hub-bootstrap

# 3. Admin layout (requires x-admin-key)
curl -H "x-admin-key: <ADMIN_API_KEY>" \
     https://<your-service>/api/admin/launch-hub-layout
```

If any admin call returns 503, `ADMIN_API_KEY` is not set on the service.

### Campaigns / Launch Hub API (`rekt_campaigns` Web Service)

Deploy this folder as a **separate Web Service** when the campaigns API runs
standalone from `rekt_backend`:

1. **Root Directory**: **`rekt_campaigns`** — Render must run install/build here.
   If this is empty (repo root), `node_modules` never lands next to `package.json`
   and `tsc` fails with **TS2307** (“Cannot find module …”) for every dependency.
2. **Build Command**: **`pnpm run build:ci`** — runs `pnpm install --frozen-lockfile`
   then `tsc` so a full dependency tree (including `typescript` and `@types/*`)
   exists before compile.
3. **Start Command**: `pnpm start` (or `node dist/index.js`).
4. Use **pnpm only** in this package: keep **`pnpm-lock.yaml`** committed and do not
   add `package-lock.json` (mixed locks can send Render down the wrong install path).

## 2. Website (`rekt_website`) as a Static Site

1. **New → Static Site**, point at your repo, set:
   - **Root Directory**: `rekt_website`
   - **Build Command**: `yarn install --frozen-lockfile && yarn build`
   - **Publish Directory**: `build`
2. **Environment Variables**:
   - `REACT_APP_BACKEND_API_URL` → `https://<your-backend>.onrender.com`
   - any existing `REACT_APP_*` keys you already use.
3. Add a **Redirect/Rewrite** rule:
   - Source: `/*` → Destination: `/index.html`, Action: Rewrite
   - This makes `/launch` and other client routes refreshable.
4. Custom domain: add `rekt.ceo` (and `www.rekt.ceo`) via **Custom Domains**.

## 3. Admin (`rekt_admin`) as a Static Site

1. **New → Static Site**, set:
   - **Root Directory**: `rekt_admin`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
   - **Publish Directory**: `dist`
2. **Environment Variables**:
   - `VITE_API_URL` → `https://<your-backend>.onrender.com`
3. Restrict access at the network layer if possible (Render password
   protection on Pro plans, or a Cloudflare Access policy in front of the
   admin domain). Combined with `ADMIN_API_KEY`, this gives two factors:
   *who can see the page* and *who can call the API*.

## 4. Smoke test after deploy

1. Open the website, hit `/launch`. The hero should load even before wallet
   connect; the loader text should be replaced quickly.
2. Connect wallet, sign in with SIWE. Daily check-in and spin should award
   XP and update the streak strip without page reload.
3. Open admin, paste `ADMIN_API_KEY`, modify a campaign title, save, then
   reload the website. The new title should appear in the Live Campaigns block.
4. In Render → backend → **Logs**, confirm no Redis errors.

## 5. Rollback strategy

- Render stores the last 5 deploys per service. Use **Manual Deploy →
  Previous Deploy** to instantly roll back the backend.
- Layout, campaigns, and presets are stored in Redis. If you mis-edit them,
  re-paste the previous JSON via the admin UI (the editor preloads current
  values) or `DEL` the key in Redis to fall back to the in-code defaults
  baked into `campaign.service.ts`.

## 6. Domains and CORS gotchas

- `CORS_ORIGIN` must include both `https://rekt.ceo` and any preview
  subdomain you use (`https://staging.rekt.ceo`). Comma-separate values.
- The admin app must also be allowed: add `https://admin.rekt.ceo` to CORS.
- During local dev, `http://localhost:3000`, `http://localhost:3001`,
  `http://localhost:5173` are typical origins to allow.
