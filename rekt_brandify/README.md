# Rekt CEO Brandify Pipeline

AI-powered meme brandification and caption API for the Rekt CEO ($CEO) brand. Includes a batch CLI for offline template processing and an Express API server with x402 payments.

## API Server (local dev)

### Prerequisites

1. Copy env file and fill in values (see [`.env.example`](.env.example)):
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Apply database migrations (Supabase Postgres):
   ```bash
   npm run db:migrate
   ```

### Run the server

```bash
npm start
```

Server runs at **http://localhost:3001** (override with `PORT` in `.env`).

Equivalent alias:

```bash
npm run start-server
```

### Verify it's up

```bash
curl http://localhost:3001/health
```

Expected: `{ "status": "ok", "service": "rekt-brandify", "database": { "status": "connected" }, ... }`

Other useful endpoints:

| URL | Purpose |
|-----|---------|
| `GET /health` | Health + database status |
| `GET /openapi.json` | OpenAPI 3.1 (x402 / agent discovery) |
| `GET /.well-known/x402` | Legacy payment manifest |
| `POST /api/sessions/start` | Brandify: upload meme + vision strategy |
| `POST /api/generate` | Brandify: generate branded image |
| `POST /api/captions/suggest` | Caption API: top 3 meme captions |
| `POST /api/cmo/research/intel-pack` | CMO research: topics + social + news (x402) |
| `POST /api/cmo/content/day-package` | CMO day: curate → brandify → caption (x402) |
| `POST /api/cmo/content/curate` | CMO content stage (also select-template, brandify, caption) |

See [PRODUCTION.md](PRODUCTION.md) and [docs/X402_REGISTRY.md](docs/X402_REGISTRY.md) for deploy + x402scan listing.

```bash
npm run db:test       # ping Supabase connection
npm run db:session    # brandify_sessions round-trip
npm test              # full test suite
```

### Website integration

Point `rekt_website` at the local API via craco proxy (dev default):

- `/brandify-api` → `http://localhost:3001` (set `REACT_APP_BRANDIFY_API_URL=http://localhost:3001` if not using the proxy)

---

## Batch CLI (offline brandify)

## What This Is
AI-powered batch processor that takes generic meme templates from the rekt_website and generates Rekt CEO branded versions using GPT Image 2 (via StableStudio / AgentCash).

## Folder Structure
```
rekt_brandify/
├── scripts/
│   ├── brandify-batch.js      # Batch process N templates per category
│   ├── brandify-single.js     # Process one specific image (for testing)
│   ├── agentcash-client.js    # AgentCash / StableStudio API wrapper
│   ├── prompt-builder.js      # Builds GPT Image 2 edit prompts per category
│   ├── status.js              # Show processed/pending/failed counts
│   └── preview-server.js      # Local HTML gallery to QA results
├── config/
│   └── brandify.config.js     # Category → strategy, prompt templates, settings
├── brand_assets/              # Rekt CEO logos, stickers (copied from rekt_website)
├── output/                    # Branded images, same folder structure as source
│   ├── Angry - Wicked/
│   ├── Yes - Win - Love/
│   └── ... (12 categories)
├── logs/
│   └── run-<timestamp>.json   # Per-run log: input, prompt, output, success/fail
├── .env                       # AGENTCASH_WALLET_KEY (private)
└── README.md
```

## Source Images
All templates read from:
`../rekt_website/src/creatives/memes/<Category>/<filename>`

## Output Images
Branded versions saved to (same naming, same structure):
`./output/<Category>/<filename>`

This means once you're happy with results, you can do:
```bash
cp -r ./output/* ../rekt_website/src/creatives/memes/
```
...and the website picks up the branded templates automatically.

## Usage

### Test one image
```bash
node scripts/brandify-single.js --category "Angry - Wicked" --file "Pepe 1.jpg"
```

### Batch process N images per category
```bash
node scripts/brandify-batch.js --limit 3
# Processes 3 images per category = 36 total
```

### Process a specific category only
```bash
node scripts/brandify-batch.js --category "Yes - Win - Love" --limit 5
```

### Check progress
```bash
node scripts/status.js
```

### Open QA gallery
```bash
node scripts/preview-server.js
# Opens http://localhost:3333 with side-by-side original vs branded
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` — Supabase Postgres (required for API persistence)
- `AGENTCASH_WALLET_BASE64` — pays upstream vision/image APIs
- `X402_RECEIVER_ADDRESS` + CDP keys — incoming x402 payments (optional locally; omit for free mode)

For batch CLI only (legacy), you may also need AgentCash wallet setup:

```
AGENTCASH_WALLET_BASE64=...
```

Run: `npx agentcash@latest accounts` to get your wallet key.

## Cost Estimates
- GPT Image 2 Edit: ~$0.04–0.10 per image (dynamic pricing)
- 987 templates × $0.07 avg = ~$70 total for full production run
- Test batch of 36 = ~$3

## Brand Guidelines Baked In
Colors: Gold #F5C518, Hot Pink #E8307A, Teal #4DBFBF, Dark Navy #0D0E1A
Assets: Rekt coin logo, CEO badge, WAGMI/Rekt-to-CEO speech bubbles, branded props
