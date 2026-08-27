/**
 * brandify.config.js
 * 
 * Central config for the Rekt CEO brandification pipeline.
 * Edit prompts here to tune how each category gets branded.
 */

export const BRAND = {
  name: 'Rekt CEO',
  ticker: '$CEO',
  colors: {
    gold: '#F5C518',
    hotPink: '#E8307A',
    teal: '#4DBFBF',
    darkNavy: '#0D0E1A',
    offWhite: '#F5F5F0',
    orange: '#FF8C00',
  },
  // Key visual phrases the AI should reference
  slogans: ['REKT', '$CEO', 'Rekt CEO', 'Rekt to CEO'],
};

/**
 * Per-category branding strategy + prompt template.
 * 
 * Strategy types:
 *  - "clothing"   → Change shirt/outfit to brand colors, add $CEO logo on chest
 *  - "background" → Subtle brand color wash on background
 *  - "badge"      → Add CEO badge or REKT logo in corner dead space
 *  - "bubble"     → Add speech bubble sticker with brand text
 *  - "hue"        → Shift the dominant color toward brand palette
 *  - "prop"       → Add branded prop near character hands
 */
export const CATEGORY_CONFIG = {
  'Angry - Wicked': {
    strategy: ['clothing', 'badge'],
    promptInstruction: `
      This is an angry/wicked themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If the character is wearing a shirt or clothing, change the shirt color to deep navy blue (#0D0E1A) or gold (#F5C518). Add a tiny "REKT" or "$CEO" text or logo mark on the chest area if possible.
      2. Place a small Rekt CEO coin logo (gold circle with "REKT" text, pink and teal letters) in the bottom-right corner at about 12% of the image width. Make it look natural, not like a watermark.
      3. Keep the character's face, expression, and overall meme composition COMPLETELY unchanged.
      4. Do NOT add any new text overlays at the top or bottom — those areas are reserved for user meme captions.
      5. The edit should look like a creative agency branded the original template, not like a filter was applied.
    `,
  },

  'Yes - Win - Love': {
    strategy: ['bubble', 'badge'],
    promptInstruction: `
      This is a positive/celebratory meme template (yes, win, love themed).
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. Add a small speech bubble or sticker in a natural empty corner or space that says "WAGMI" or "Rekt to CEO" in a comic/sticker style with gold and blue colors. Keep it small (10-15% of image width).
      2. The speech bubble should look like it was designed as part of the image, not pasted on top — give it a slight drop shadow.
      3. If there's a character with clothing, optionally add a gold/pink color accent to their shirt.
      4. Keep all facial expressions and the core meme composition unchanged.
      5. Do NOT cover faces or key meme elements with the branding.
    `,
  },

  'WTF': {
    strategy: ['background', 'badge'],
    promptInstruction: `
      This is a "WTF / confused" themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. Add a very subtle warm tint (gold/amber glow, ~15% opacity) to the background areas that don't contain the main character or subject. This should feel atmospheric, not like a color filter.
      2. Place a small Rekt CEO coin logo in the most natural corner (usually bottom-right or top-right dead space) at about 12% image width, 80% opacity.
      3. Keep all character expressions and the core meme composition completely unchanged.
      4. The overall mood should still be "WTF/confused" — the branding should be ambient, not distracting.
    `,
  },

  'Sad - Oof - Lose': {
    strategy: ['hue', 'badge'],
    promptInstruction: `
      This is a sad/loss themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. The "Rekt" brand is literally about being "rekt" (losing) in crypto — this is a perfect fit. Shift the overall mood slightly toward the brand's signature hot pink/magenta color palette. If there are background elements (sky, walls, abstract shapes), tint them slightly toward hot pink or magenta (very subtle, 10-15% strength).
      2. Add a small "$REKT" or "Rekt CEO" text badge in bottom-right corner in the brand's signature style (gold coin with pink text).
      3. Keep all character expressions, tears, and sad elements — these are the soul of the meme.
      4. The connection here is crypto "getting rekt" — the branding should feel ironic and self-aware.
    `,
  },

  'Funny - Not funny': {
    strategy: ['clothing', 'bubble'],
    promptInstruction: `
      This is a funny/humor contrast meme template (often two-panel: something funny vs. not funny).
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If the character(s) are wearing clothing, shift one outfit to gold (#F5C518) and one to dark navy (#0D0E1A) — like they're wearing Rekt CEO team colors.
      2. In the "funny/yes" panel or corner, optionally add a tiny "WAGMI" text stamp.
      3. In the "not funny/no" panel or corner, optionally add a tiny "REKT" text stamp.
      4. Keep the facial expressions and panel structure completely intact.
      5. The branding should feel like the characters are Rekt CEO community members reacting.
    `,
  },

  'Dumb - Genius': {
    strategy: ['background', 'badge'],
    promptInstruction: `
      This is a dumb vs. genius contrast meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If there's a brain/galaxy brain style meme, add a subtle gold shimmer to the "big brain" panel.
      2. Add a small Rekt CEO coin logo in the corner dead space at 12% image width.
      3. If there's text in the template image itself (like "Galaxy Brain"), keep it unchanged.
      4. Keep all expressions, the contrast dynamic, and the humor intact.
    `,
  },

  'Humm - Not interesting - Boring': {
    strategy: ['hue', 'badge'],
    promptInstruction: `
      This is a "hmm/thinking/unimpressed" meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If the meme has a neutral or grey background, add a faint warm gold (#F5C518) ambient glow to the background corners — like a vignette in gold instead of dark.
      2. Add a small Rekt CEO coin logo badge in the bottom-right corner.
      3. Keep all character expressions completely unchanged — the "unimpressed" face is the whole point.
    `,
  },

  'Horny': {
    strategy: ['prop', 'badge'],
    promptInstruction: `
      This is an excited/desire themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If the character is holding something or reaching toward something, try to replace or add a Rekt CEO branded bottle or can (a drink can/bottle with "REKT" or "$CEO" text on it in gold/pink colors) near their hands. Keep it looking natural.
      2. If no prop placement is possible, add a small Rekt CEO coin logo in the corner.
      3. Keep all expressions and the core composition unchanged.
      4. The energy here is "so excited about $CEO / crypto" — the prop should reinforce that.
    `,
  },

  'Liar - Sauce': {
    strategy: ['bubble', 'badge'],
    promptInstruction: `
      This is a "liar/fake/sauce (source?)" themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. Add a small speech bubble in a natural dead space that says "Source: $CEO" or "REKT ✓" in a comic sticker style with gold and blue colors. Keep it small and natural.
      2. The speech bubble can come from a character or float in the corner — whichever looks more natural.
      3. Place a small Rekt CEO coin logo in the opposite corner.
      4. Keep all facial expressions and the lie/fact contrast intact.
    `,
  },

  'No - Stop - Police': {
    strategy: ['badge', 'clothing'],
    promptInstruction: `
      This is a "no/stop/police/authority" themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. If there's a police officer, authority figure, or someone holding up a hand: change their badge or uniform accent color to the Rekt CEO gold (#F5C518). Add a small "CEO SHERIFF" or "$CEO" badge if there's a natural place for it.
      2. If it's a "stop" sign or stop gesture meme, optionally tint the stop element to gold.
      3. Add the small Rekt CEO coin logo in the corner.
      4. Keep all expressions and the "STOP/NO" energy completely intact.
    `,
  },

  'Offend': {
    strategy: ['hue', 'badge'],
    promptInstruction: `
      This is an offensive/shocked/outraged meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. Add a hot pink/magenta ambient color wash to the background elements (NOT on the character's face or expression areas) at about 15% opacity. This gives it the Rekt CEO signature edgy pink energy.
      2. Place a small Rekt CEO coin logo in the natural corner dead space.
      3. Keep all expressions and the shocking/offensive energy completely intact.
    `,
  },

  'Sweat - Run away': {
    strategy: ['background', 'badge'],
    promptInstruction: `
      This is a "sweating/running away/panic" themed meme template.
      Make these SUBTLE changes to brandify it for Rekt CEO ($CEO crypto token):
      1. Add a subtle warm light-orange/gold glow emanating from behind the character (like a "danger" or "pump" glow), at about 15-20% opacity. This reinforces crypto panic energy.
      2. Place a small Rekt CEO coin logo in the corner dead space. The coin can look slightly tilted or dynamic as if it's "falling" — reinforcing the "getting rekt" narrative.
      3. Keep all sweat drops, panic expressions, and running poses completely unchanged.
    `,
  },
};

// === GLOBAL SETTINGS ===

export const SOURCE_BASE = '../rekt_website/src/creatives/memes';
export const OUTPUT_BASE = './output';
export const BRAND_ASSETS_DIR = './brand_assets';
export const LOGS_DIR = './logs';

// StableStudio API (via AgentCash)
// Note: base URL is stablestudio.dev (not .io) per OpenAPI schema
export const API_CONFIG = {
  baseUrl: 'https://stablestudio.dev',
  // Flux 2 Pro edit — highest quality, perfect for inpainting and text
  editEndpoint: '/api/generate/flux-2-pro/edit',
  // Fallback: GPT Image 2
  fallbackEndpoint: '/api/generate/gpt-image-2/edit',
  maxPollAttempts: 36, // 36 × 10s = 6 minutes max wait per job
  // Public URLs for our exact brand logos and stickers.
  // These are passed as reference images to GPT Image 2 to prevent hallucinated logos.
  REFERENCE_LOGOS: [
    "https://wgunica1uhl5nijm.public.blob.vercel-storage.com/uploads/e7b88731-af55-439e-9745-965ac6e3d064/rekt.png",
    "https://wgunica1uhl5nijm.public.blob.vercel-storage.com/uploads/c78213d1-0729-4506-a479-946940e8a694/Rekt_logo_2D.png",
    "https://wgunica1uhl5nijm.public.blob.vercel-storage.com/uploads/eabbd842-d29d-4e04-97fb-c24058cce03d/Rekt_logo_3D.png",
    "https://wgunica1uhl5nijm.public.blob.vercel-storage.com/uploads/52593575-c2ec-42ec-9e89-3c8755dbd86f/happy_glass.png"
  ],
};

// Output image settings
export const OUTPUT_SETTINGS = {
  // Keep original dimensions, output as JPEG at high quality
  format: 'jpeg',
  quality: 92,
};

// Global branding instruction appended to every category prompt
export const GLOBAL_BRAND_RULES = `
CRITICAL RULES FOR ALL EDITS:
- The meme template MUST remain recognizable as the same meme. Do not change the core composition.
- DO NOT add any text at the top or bottom of the image — users will add their own captions.
- DO NOT cover faces, key visual elements, or the subject of the meme.
- IMPORTANT LOGO RULE: You have been provided with reference images containing the EXACT "Rekt CEO" logos and stickers. You MUST use one of these exact designs. DO NOT invent, hallucinate, or create your own version of the Rekt Logo. Replicate the provided reference assets exactly when adding a badge or sticker.
- IMPORTANT QUALITY RULE: Maintain the absolute highest image quality. Do NOT pixelate, blur, or distort the original image when adding brand colors. The edit must be pristine and clean. Preserve original textures.
- The branding should feel like it was "born into" the image, not added on top.
- Keep the image dimensions and aspect ratio identical to the original.
- Style: The Rekt CEO brand has a fun, chaotic, crypto-degen energy. The branding should feel like it belongs to a meme culture brand, not a corporate brand.
- Output ONLY the branded version of the same image. Do not create a new meme or change the narrative.
`;
