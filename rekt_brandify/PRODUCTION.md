# Brandify API — Production checklist

Before enabling live x402 payments on Render (`rekt-ceo-brandification`):

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase Postgres — brandify sessions + caption + CMO (required) |
| `X402_RECEIVER_ADDRESS` | Base wallet to **receive** USDC from callers (merchant) |
| `X402_FACILITATOR_URL` | Coinbase CDP facilitator for Base mainnet (not `x402.org`) |
| `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` | CDP API credentials |
| `CORS_ORIGINS` | Website + admin origins, e.g. `https://www.rektceo.club,https://admin…` |
| `AGENTCASH_WALLET_BASE64` | AgentCash **spend** wallet for StableStudio / StableSocial / StableEnrich |
| `X402_PUBLIC_ORIGIN` | Public URL in `/openapi.json` |
| `X402_CONTACT_EMAIL` | OpenAPI contact for x402scan ownership verification |
| `ADMIN_API_KEY` | Protects CMO admin mutate routes (`x-admin-key`) |

**Wallet separation:** `X402_RECEIVER_ADDRESS` ≠ AgentCash spend wallet. Never commit either.

## Migrations

```bash
cd rekt_brandify
npm run db:migrate   # applies 001–007 including CMO content stage indexes
```

Use Supabase **transaction pooler** (port 6543) on Render.

## Agent discovery (x402 registry)

- `GET /openapi.json` — OpenAPI 3.1 (Brandify + captions + templates + **CMO research/content stages**)
- `GET /.well-known/x402` — legacy manifest
- Paid routes include **Bazaar** `declareDiscoveryExtension` (`server/x402-bazaar.js`) so 402 challenges carry input/output schemas (required for clean AgentCash / x402scan indexing)

Before registering on x402scan:

```bash
npm test
npm run test:discovery
```

`test:discovery` fails if `SCHEMA_INPUT_MISSING` / `SCHEMA_OUTPUT_MISSING` appear.

Full steps: [docs/X402_REGISTRY.md](docs/X402_REGISTRY.md).  
Cross-package push order: [../PRODUCTION_PUSH_CHECKLIST.md](../PRODUCTION_PUSH_CHECKLIST.md).

## Security checklist

- [ ] Payment middleware runs before route validation (402 not 400 on unpaid paid routes)
- [ ] Admin routes require `ADMIN_API_KEY`
- [ ] CORS restricted; `payment-required` exposed for browser x402
- [ ] Post-pay failures persist via `createFailedStrategyRun`
- [ ] Soft-fail AgentCash sources in research intel (partial results)
- [ ] Compose/schedule not listed as public paid routes

## Frontend

**rekt_website:** `REACT_APP_BRANDIFY_API_URL=https://…`

**rekt_admin:** `VITE_BRANDIFY_API_URL=https://…` and `VITE_ADMIN_API_KEY` matching Render `ADMIN_API_KEY`.

## Notes

- `x402.org` facilitator does **not** support Base mainnet — use CDP.
- Without `X402_RECEIVER_ADDRESS`, paid endpoints run in free mode.
- Without `DATABASE_URL`, reads empty / writes 503.
- After deploy: verify `/health`, `/openapi.json` path keys, unauthenticated POST → **402**.
- Then register origin on https://x402scan.com/resources/register (see X402_REGISTRY.md Part 3).
