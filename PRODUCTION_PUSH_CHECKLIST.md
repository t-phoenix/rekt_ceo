# Production push checklist

Use this before shipping **rekt_website** (stable public site), **rekt_admin** (CMO + campaigns), and **rekt_brandify** (x402 API). Goal: nothing breaks between frontends and the Brandify/CMO backend, and x402 registry stays accurate after deploy.

---

## 0) Pre-flight (all packages)

- [ ] No secrets staged: `git status` must not show `.env`, wallets, CDP keys, `ADMIN_API_KEY` values
- [ ] `.DS_Store` and `rekt_brandify/brand_assets/meme_templates/` are ignored (sync templates on the server, do not commit ~1k JPGs)
- [ ] Builds pass locally:
  - `cd rekt_admin && pnpm run build`
  - `cd rekt_website && npm run build`
  - `cd rekt_brandify && npm test`

---

## 1) rekt_brandify (backend) — deploy first

Brandify is the shared API for website memes **and** admin CMO. Deploy/migrate it **before** pointing frontends at new routes.

### Env on Render (`rekt-ceo-brandification`)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | Supabase pooler `:6543` + `?pgbouncer=true` on Render |
| `X402_RECEIVER_ADDRESS` | yes (paid mode) | Merchant wallet (receives USDC) — **≠** AgentCash spend wallet |
| `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` | yes for Base mainnet | With CDP facilitator |
| `X402_FACILITATOR_URL` | yes | `https://api.cdp.coinbase.com/platform/v2/x402` |
| `X402_NETWORK` | yes | `base` |
| `X402_PUBLIC_ORIGIN` | yes | Public URL used in `/openapi.json` |
| `X402_CONTACT_EMAIL` | yes | x402scan / Poncho ownership |
| `AGENTCASH_WALLET_BASE64` | yes for CMO research | Spend wallet for Stable* upstreams |
| `ADMIN_API_KEY` | yes for admin | Must match admin `VITE_ADMIN_API_KEY` / UI key |
| `CORS_ORIGINS` | yes | Include `https://www.rektceo.club` **and** production admin origin + local `http://localhost:5173` if needed |

Optional but recommended: pin `X402_PRICE_*` / `X402_PRICE_CMO_*` to match admin UI labels (`VITE_CMO_PRICE_*`).

### Migrations

```bash
cd rekt_brandify
npm run db:migrate   # through 010_cmo_brandify_outputs (and any newer)
```

On Render: run migrate in a release command or one-off shell **before** traffic hits new routes.

### Templates on the server

```bash
cd rekt_brandify
npm run sync:templates   # pulls from rekt_website creatives → brand_assets/meme_templates
```

Without this, `GET /api/templates` fails after deploy.

### Smoke after deploy

```bash
curl -sS "$ORIGIN/health"
curl -sS "$ORIGIN/openapi.json" | jq '.info.version, (.paths|keys|length)'
# Expect version ≥ 1.1.0 and many paths (Brandify + captions + templates + CMO), not only 7 legacy routes

curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$ORIGIN/api/sessions/start"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$ORIGIN/api/cmo/research/intel-pack" -H 'Content-Type: application/json' -d '{}'
# Both should be 402 when X402_RECEIVER_ADDRESS is set (not 400/500)
```

### x402 registry update (required after OpenAPI / paid-route changes)

Local code now includes:

1. OpenAPI **1.1.0** with CMO + template paths (`server/openapi.js` + `openapi-cmo.js`)
2. **Bazaar discovery extensions** on paid routes (`server/x402-bazaar.js`) so AgentCash stops reporting `SCHEMA_INPUT_MISSING` / `SCHEMA_OUTPUT_MISSING`

After Render is green:

```bash
cd rekt_brandify
X402_VERIFY_ORIGIN=https://rekt-ceo-brandification.onrender.com npm run test:discovery
# Must exit 0 with zero SCHEMA_* errors
```

Then **re-register** the origin (SIWX):

1. UI: https://www.x402scan.com/resources/register → origin = `X402_PUBLIC_ORIGIN`
2. Or: `POST https://x402scan.com/api/x402/registry/register-origin` body `{ "origin": "…" }` via AgentCash `fetch`
3. Confirm search finds **Rekt CEO Meme Brandifier** and new CMO paths (not only `/api/generate`)
4. Optional: custom domain `brandify.rektceo.club` — update `X402_PUBLIC_ORIGIN` + DNS + re-register

Full detail: [rekt_brandify/docs/X402_REGISTRY.md](rekt_brandify/docs/X402_REGISTRY.md) and [rekt_brandify/PRODUCTION.md](rekt_brandify/PRODUCTION.md).

---

## 2) rekt_website (public / “old” surface)

Website should keep working against the **same** Brandify origin. Prefer no breaking changes to `/api/sessions/*`, `/api/generate`, `/api/captions/*`.

### Env (hosting: Vercel / Netlify / etc.)

| Variable | Purpose |
|----------|---------|
| `REACT_APP_BACKEND_API_URL` | Main backend (auth/mint) |
| `REACT_APP_CAMPAIGN_API_URL` | Launch Hub / campaigns |
| `REACT_APP_BRANDIFY_API_URL` | **Must** be production Brandify URL (e.g. `https://rekt-ceo-brandification.onrender.com`) |
| `REACT_APP_WALLETCONNECT_PROJECT_ID` | WalletConnect |
| `REACT_APP_BASE_*` / Solana vars | Bridge / token display |

Local: leave `REACT_APP_BRANDIFY_API_URL` unset so craco proxies `/brandify-api` → `localhost:3001`.

### Checklist

- [ ] `npm run build` succeeds
- [ ] Production env points Brandify at the **deployed** origin (not localhost)
- [ ] Meme brandify + caption flows still work (start → generate → rate; caption suggest → rate)
- [ ] CORS on Brandify includes the live website origin
- [ ] Do **not** require admin key for public meme flows

---

## 3) rekt_admin (new CMO / campaigns updates)

Deploy admin **after** Brandify migrations + paid routes are live.

### Env

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Main backend |
| `VITE_CAMPAIGN_API_URL` | Campaigns service |
| `VITE_BRANDIFY_API_URL` | **Required on Vercel** — same Brandify origin as website, e.g. `https://rekt-ceo-brandification.onrender.com`. If unset, the build falls back to `http://localhost:3001` and production will show `ERR_CONNECTION_REFUSED`. Vite bakes this at **build** time → set env, then **Redeploy**. |
| `VITE_ADMIN_API_KEY` | Same value as Brandify `ADMIN_API_KEY` (or enter key in UI) |
| `VITE_WALLETCONNECT_PROJECT_ID` | Wagmi / Web3Modal |
| `VITE_BASE_RPC_HTTP_URL` / `VITE_BASE_USDC_ADDRESS` | CMO x402 USDC on Base |
| `VITE_CMO_PRICE_*` | Optional UI labels — keep aligned with Brandify `X402_PRICE_CMO_*` |

### Checklist

- [ ] `pnpm run build` succeeds
- [ ] Wallet on **Base** for CMO paid calls; USDC balance enough for day-package / intel-pack
- [ ] Admin key works: research, strategy, content stages, brand studio
- [ ] Free admin reads (wallet status, history) work with `x-admin-key`
- [ ] Paid CMO routes return 402 then settle (not free-mode accidentally)
- [ ] CORS includes admin production origin

---

## 4) Integration matrix (do not break)

| Client | Talks to | Auth |
|--------|----------|------|
| Website memes | Brandify `/api/sessions/*`, `/api/generate`, `/api/captions/*` | x402 (browser) |
| Admin CMO | Brandify `/api/cmo/*` + templates | x402 + `x-admin-key` for mutate/admin |
| Admin campaigns | `VITE_CAMPAIGN_API_URL` | admin key |
| Admin mint / auth | `VITE_API_URL` | SIWE / wallet |

**Safe order:** Brandify migrate → Brandify deploy → discovery + registry → Website env/build → Admin env/build.

**Rollback:** Keep previous Brandify deploy until website smoke passes; admin can wait.

---

## 5) Post-push verification (15 min)

1. Website: brandify one meme + caption on production
2. Admin: run intel-pack or day-package once with wallet payment
3. `GET /openapi.json` path count matches local `1.1.0+` doc
4. `npm run test:discovery` against production origin is clean
5. x402scan search shows updated origin / routes
6. AgentCash spend wallet still funded (`AGENTCASH_WALLET_BASE64` balance)

---

## Known gotchas

- Without `X402_RECEIVER_ADDRESS`, Brandify runs **free mode** — admin “payments” will not match production behavior.
- `x402.org` facilitator ≠ Base mainnet; use **CDP**.
- Production OpenAPI was historically **v1.0.0 / 7 paths** until this codebase ships — registry **must** be re-registered after deploy or agents only see legacy Brandify routes.
- Meme templates are **not** in git; sync on every fresh host.
- Never commit `.env` or AgentCash wallet files.
