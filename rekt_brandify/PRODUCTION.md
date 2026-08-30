# Brandify API — Production checklist

Before enabling live x402 payments on Render (`rekt-ceo-brandification`):

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas connection string — whitelist Render outbound IPs |
| `X402_RECEIVER_ADDRESS` | Base wallet to receive USDC |
| `X402_FACILITATOR_URL` | Use Coinbase CDP facilitator for Base mainnet (not `x402.org`) |
| `CDP_API_KEY_ID` | Coinbase Developer Platform API key |
| `CDP_API_KEY_SECRET` | CDP API secret |
| `CORS_ORIGINS` | Comma-separated origins, e.g. `https://www.rektceo.club,http://localhost:3000` |
| `AGENTCASH_WALLET_BASE64` | AgentCash wallet for StableStudio / vision calls |
| `X402_PUBLIC_ORIGIN` | Public URL in `/openapi.json` (e.g. `https://rekt-ceo-brandification.onrender.com`) |
| `X402_CONTACT_EMAIL` | Contact email in OpenAPI for x402scan ownership verification |

## Agent discovery (x402 registry)

The server exposes:

- `GET /openapi.json` — canonical OpenAPI 3.1 document for x402scan / AgentCash discovery
- `GET /.well-known/x402` — legacy compatibility manifest (links to OpenAPI)

**Before registering on x402scan**, run:

```bash
npm test
npm run test:discovery
```

Full manual steps (custom domain, x402scan registration, verification): see [docs/X402_REGISTRY.md](docs/X402_REGISTRY.md).

## Frontend (rekt_website)

Set in production deploy:

```
REACT_APP_BRANDIFY_API_URL=https://rekt-ceo-brandification.onrender.com
```

## Notes

- `x402.org` facilitator does **not** support Base mainnet (`eip155:8453`). Use CDP for production.
- **CDP API keys are required** when `X402_FACILITATOR_URL` points to Coinbase CDP. Without them, payment middleware stays off and endpoints run in free mode.
- **CORS** must include your frontend origin in `CORS_ORIGINS`. The server exposes `payment-required` headers so browsers can read x402 payment info cross-origin.
- **MongoDB Atlas** must allow Render’s outbound IPs (or `0.0.0.0/0` temporarily). If connection fails, the service falls back to in-memory MongoDB (sessions lost on restart).
- Set `X402_FACILITATOR_URL` to the CDP URL above — do **not** override with `x402.org` on Render when using mainnet.
- Without `MONGODB_URI`, the service uses in-memory MongoDB (variations are lost on restart).
- Without `X402_RECEIVER_ADDRESS`, all brandify endpoints run in free mode (no wallet payments).
