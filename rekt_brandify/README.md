# Rekt CEO Brandify Pipeline

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
Create `.env`:
```
AGENTCASH_WALLET_KEY=your_wallet_private_key
STABLESTUDIO_BASE_URL=https://stablestudio.io
```

Run: `npx agentcash@latest accounts` to get your wallet key.

## Cost Estimates
- GPT Image 2 Edit: ~$0.04–0.10 per image (dynamic pricing)
- 987 templates × $0.07 avg = ~$70 total for full production run
- Test batch of 36 = ~$3

## Brand Guidelines Baked In
Colors: Gold #F5C518, Hot Pink #E8307A, Teal #4DBFBF, Dark Navy #0D0E1A
Assets: Rekt coin logo, CEO badge, WAGMI/Rekt-to-CEO speech bubbles, branded props
