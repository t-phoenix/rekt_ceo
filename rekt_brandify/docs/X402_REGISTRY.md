# x402 Agent Discovery & Registry Guide

This guide covers making the Rekt CEO Brandify API discoverable and listed in x402 registries so AI agents can find, pay for, and invoke it autonomously.

**Production origin (current):** `https://rekt-ceo-brandification.onrender.com`

---

## What the server exposes today

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /health` | Free | Health check |
| `GET /openapi.json` | Free | **Canonical** agent discovery document (OpenAPI 3.1) |
| `GET /.well-known/x402` | Free | Legacy compatibility discovery |
| `GET /api/templates/{templateId}/variations` | Free | Public community variations |
| `POST /api/sessions/start` | x402 ($0.19) | Upload meme + vision strategy |
| `POST /api/generate` | x402 ($0.49) | Generate branded image |
| `POST /api/sessions/rate` | x402 ($0.01) | Rate a generation |

Runtime payment uses **USDC on Base mainnet** (`eip155:8453`) via Coinbase CDP facilitator.

---

## Part 1 — Code & deploy checklist (engineering)

### 1. Run tests locally (baseline + discovery)

```bash
cd rekt_brandify
npm test
```

Optional — x402 integration tests (requires `.env` with `X402_RECEIVER_ADDRESS`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`):

```bash
# Loads CDP keys from .env automatically via dotenv in createApp
npm test
```

### 2. Deploy to Render

Push to `main` (or trigger manual deploy). Ensure Render env vars match `PRODUCTION.md`:

- `X402_RECEIVER_ADDRESS`
- `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`
- `X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402`
- `X402_NETWORK=base`
- `X402_PUBLIC_ORIGIN=https://rekt-ceo-brandification.onrender.com` (or custom domain)
- `X402_CONTACT_EMAIL=your@email.com`
- `CORS_ORIGINS=https://www.rektceo.club,...`

### 3. Verify discovery after deploy

```bash
npm run test:discovery
# Or against a custom domain once live:
X402_VERIFY_ORIGIN=https://brandify.rektceo.club npm run test:discovery
```

Fix any **errors** (not just warnings) before registering.

### 4. Manual smoke on production

```bash
curl -s https://rekt-ceo-brandification.onrender.com/health
curl -s https://rekt-ceo-brandification.onrender.com/openapi.json | head -c 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://rekt-ceo-brandification.onrender.com/api/sessions/start
# Expect: 402
```

---

## Part 2 — Custom domain setup (recommended)

Agents trust branded domains more than `*.onrender.com`. Optional but recommended.

### Option A: Subdomain on rektceo.club

**Goal:** `https://brandify.rektceo.club` → Render service

1. **Render — add custom domain**
   - Render Dashboard → `rekt-ceo-brandification` → Settings → Custom Domains
   - Add: `brandify.rektceo.club`
   - Render shows a **CNAME target** (e.g. `rekt-ceo-brandification.onrender.com`)

2. **DNS provider (Cloudflare / Namecheap / etc.)**
   - Add record:
     - Type: `CNAME`
     - Name: `brandify`
     - Target: Render CNAME hostname
     - TTL: Auto / 300s

3. **Wait for TLS**
   - Render provisions HTTPS automatically (may take 15–60 min)

4. **Update environment**
   - Render env: `X402_PUBLIC_ORIGIN=https://brandify.rektceo.club`
   - Render env: `CORS_ORIGINS` — add `https://www.rektceo.club` if not present
   - Redeploy

5. **Verify**
   ```bash
   curl -s https://brandify.rektceo.club/openapi.json | jq '.servers[0].url'
   X402_VERIFY_ORIGIN=https://brandify.rektceo.club npm run test:discovery
   ```

### Option B: Keep Render URL

Skip domain setup; use `https://rekt-ceo-brandification.onrender.com` as the registered origin. Works, but less ideal for merchant branding.

---

## Part 3 — Register on x402scan (primary registry)

x402scan is the main ecosystem explorer. AgentCash search indexes origins registered here.

**Official spec:** https://www.x402scan.com/discovery/spec

### Prerequisites (must all pass)

- [ ] API live at final public URL (not localhost)
- [ ] `GET /openapi.json` returns valid OpenAPI 3.1 with:
  - `info.x-guidance`
  - `info.contact.email`
  - `x-payment-info` on each paid route
  - Request + response schemas on paid routes
  - `responses.402` on paid routes
- [ ] Unauthenticated `POST` to paid routes returns **402** (not 400) with parseable x402 challenge
- [ ] `npm run test:discovery` shows no **errors**
- [ ] CDP facilitator + receiver wallet configured (payments settle on Base)

### Step-by-step registration

#### 1. Install AgentCash (if not already)

```bash
npx agentcash install
```

Ensure the AgentCash MCP server is available in Cursor (for SIWX wallet auth during registration).

#### 2. Audit discovery one last time

```bash
npx -y @agentcash/discovery@latest discover "https://rekt-ceo-brandification.onrender.com"
npx -y @agentcash/discovery@latest check "https://rekt-ceo-brandification.onrender.com/api/sessions/start"
npx -y @agentcash/discovery@latest check "https://rekt-ceo-brandification.onrender.com/api/generate"
npx -y @agentcash/discovery@latest check "https://rekt-ceo-brandification.onrender.com/api/sessions/rate"
```

#### 3. Register via x402scan UI (easiest)

1. Open https://x402scan.com/resources/register
2. Enter origin: `https://rekt-ceo-brandification.onrender.com` (or custom domain)
3. Click **Add**
4. Connect wallet when prompted (SIWX — proves ownership)
5. Review discovered routes, prices, and auth modes
6. Confirm registration
7. Fix any `failedDetails` and re-register

#### 4. Register programmatically (alternative)

Requires SIWX-authenticated wallet (AgentCash `fetch` with auth):

```http
POST https://x402scan.com/api/x402/registry/register-origin
Content-Type: application/json

{ "origin": "https://rekt-ceo-brandification.onrender.com" }
```

Expected response shape:

```json
{
  "registered": 3,
  "failed": 0,
  "deprecated": 0,
  "total": 3,
  "source": "openapi",
  "failedDetails": []
}
```

If `failedDetails` is non-empty, fix each endpoint and re-run registration.

#### 5. Verify listing

- Search on https://x402scan.com for "Rekt CEO" or your origin URL
- AgentCash search (in Cursor): query `meme brandify rekt ceo`
- Confirm three paid routes appear with correct Base USDC pricing

#### 6. Poncho merchant page (optional)

If you set `info.contact.email` in OpenAPI, x402scan/Poncho may let you verify origin ownership and customize your merchant profile. Use the same email you control.

---

## Part 4 — Register on MPP / mppscan (optional)

If you want **Machine Payments Protocol** discovery in addition to x402:

1. Ensure routes work with MPP headers (x402scan registration covers most agent tooling today)
2. Register origin via mppscan:
   ```http
   POST https://mppscan.com/api/mpp/register
   ```
   (Exact endpoint — check current mppscan docs; AgentCash guidance references this alongside x402scan.)

MPP is secondary; **x402scan registration is the priority**.

---

## Part 5 — AgentCash search indexing

AgentCash aggregates origins from x402scan/MCP registries. After x402scan registration:

1. Wait for index refresh (may take hours)
2. Test: AgentCash `search` for `"meme brandify"`, `"rekt ceo brandifier"`
3. Your origin should appear with `POST /api/sessions/start`, `/api/generate`, `/api/sessions/rate`

No separate AgentCash registration API is required beyond x402scan listing + valid OpenAPI.

---

## Part 6 — How agents invoke your API

Once listed, an x402-capable agent (AgentCash, Locus, etc.) will:

1. Discover origin via x402scan or AgentCash search
2. Read `/openapi.json` for schemas and `info.x-guidance`
3. Call `POST /api/sessions/start` without payment → receive **402**
4. Pay `$0.19` USDC on Base, retry with payment header
5. Receive `{ sessionId, imageUrl, strategy }`
6. Call `POST /api/generate` with `{ sessionId, userCuratedChoices }` (pay `$0.49`)
7. Optionally call `POST /api/sessions/rate` (pay `$0.01`)

Document this flow in `info.x-guidance` (already included in `/openapi.json`).

---

## Troubleshooting registration failures

| Error | Cause | Fix |
|-------|-------|-----|
| `OPENAPI_NOT_FOUND` | No `/openapi.json` | Deploy latest code with OpenAPI route |
| `Input/Output Schema Missing` | OpenAPI lacks schemas | Update `server/openapi.js` |
| `Expected 402, got 400` | Validation before paywall | Ensure x402 middleware runs before route handlers (already the case) |
| `No Payment Modes Detected` | 402 body/header malformed | Verify CDP keys; check Render logs |
| `failedDetails` on register | Per-route probe failed | Run `npx @agentcash/discovery check <url>` for each |

---

## Security notes

- **Do not** register until production is stable — registration creates a public paid listing
- Use a dedicated **receiver wallet** (`X402_RECEIVER_ADDRESS`) for incoming USDC
- Keep **CDP API keys** secret in Render env only
- `AGENTCASH_WALLET_BASE64` pays upstream (StableStudio, vision) — monitor balance

---

## Quick reference commands

```bash
# Local tests
cd rekt_brandify && npm test

# Post-deploy discovery audit
npm run test:discovery

# Production health
curl -s https://rekt-ceo-brandification.onrender.com/health | jq

# OpenAPI
curl -s https://rekt-ceo-brandification.onrender.com/openapi.json | jq '.info.title, .paths | keys'

# x402 probe
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://rekt-ceo-brandification.onrender.com/api/generate \
  -H "Content-Type: application/json" -d '{}'
```
