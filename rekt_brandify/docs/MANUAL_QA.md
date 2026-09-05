# Manual QA — Content stages + research intel + x402 listing

Run after deploy (or locally with payment enabled).

## Local / staging

1. `npm run db:migrate` — confirm 007 applied
2. Restart brandify; `curl /health` and `curl /openapi.json | jq '.paths | keys'` — CMO routes present
3. Unauthenticated `POST /api/cmo/research/topics` and `POST /api/cmo/content/curate` → **402** (when receiver configured)
4. Admin Workshop: enable Topics + News; Run research → ArtifactView shows keywords/news
5. Strategy → Content: Process one day (bundle) → media + caption
6. Per-stage: Curate → Template → Brandify → Caption → Compose on another day
7. Process all days: per-day intensity respected; failed days show **failed** chip
8. Website Brandify (`/api/sessions/*`, captions, free variations) still works

## Production (Render)

1. Env: receiver, CDP, AgentCash wallet, ADMIN_API_KEY, X402_PUBLIC_ORIGIN, CORS, DATABASE_URL
2. Templates on disk (`brand_assets/meme_templates` or `npm run sync:templates` in build)
3. Deploy → health + openapi + 402 smoke
4. Point admin `VITE_BRANDIFY_API_URL` at prod
5. **x402 listing** — only after green discovery:
   - `X402_VERIFY_ORIGIN=https://<origin> npm run test:discovery`
   - Register at https://x402scan.com/resources/register
   - See [docs/X402_REGISTRY.md](docs/X402_REGISTRY.md) Part 3

## Do not register until

- Discovery tests have no **errors**
- At least one real paid smoke settled on Base
- Public origin is final (prefer custom domain)
