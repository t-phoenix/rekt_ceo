# REKT CEO — SEO Action Plan
**Updated:** 2026-03-11
**Current Score:** 55/100 (up from 42/100 on 2026-03-10)
**Target Score:** 70/100

---

## ✅ Completed Since Last Audit

- [x] Add Helmet tags to `/blueprint` (title, description, canonical, OG)
- [x] Add Helmet tags to `/buy-ceo` (title, description, canonical, OG)
- [x] Add security headers to vercel.json (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [x] Add changefreq + priority to sitemap.xml
- [x] Add FAQPage schema to homepage
- [x] Add WebSite schema with SearchAction
- [x] Add WebApplication schema to /memes and /pfp
- [x] Add React.lazy() code-splitting for all routes
- [x] Add LCP image preload hint with fetchpriority="high"
- [x] Update FAQ: correct blockchain (Base L2 + Solana, not BNB)
- [x] Fix copyright year to 2026
- [x] Add alt text to Blueprint logo image
- [x] Add `<link rel="llms">` to HTML head
- [x] Add static asset caching headers in vercel.json

---

## CRITICAL — Fix This Week

### C1 — Replace Invalid `DigitalCommunity` Schema Type
**File:** `public/index.html`
**Impact:** Schema section score +15 pts estimated
**Fix:** Replace `"@type": "DigitalCommunity"` with `"@type": "Organization"`. `DigitalCommunity` is not in the Schema.org vocabulary and is completely ignored by Google.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Rekt CEO",
  "url": "https://www.rektceo.club",
  "logo": "https://www.rektceo.club/logo512.png",
  "description": "REKT CEO ($CEO) is the ultimate community-driven memecoin movement on Base L2 and Solana.",
  "sameAs": [
    "https://twitter.com/rekt_ceo",
    "https://www.instagram.com/rektceo",
    "https://farcaster.xyz/rekt-ceo"
  ]
}
```

### C2 — Fix Multiple `<h1>` Tags on Homepage
**File:** `src/pages/landingpage/Introduction.js` (FAQ section, ~line 148)
**Impact:** On-page SEO +5 pts
**Fix:** Change `<h1>` inside `.faq-card` to `<h3>`. There should be exactly one `<h1>` per page — the main page title. FAQ questions should be `<h3>`.

```jsx
// BEFORE (wrong):
<h1>{data.question}</h1>

// AFTER (correct):
<h3>{data.question}</h3>
```

### C3 — Standardize Twitter Handle Across All Files
**Files:** `public/index.html`, `src/pages/MemeGen.js`, `src/pages/ProfileNFT.js`, `src/pages/BuyCEOPage.js`, `src/pages/Blueprint.jsx`
**Impact:** Social card consistency, correct attribution
**Fix:** Verify correct handle on Twitter/X. Currently mismatched:
- `index.html` → `@rekt_ceo` (with underscore)
- Most Helmet files → `@rektceo` (without underscore)

Add `twitter:site` + `twitter:card` to BuyCEOPage and Blueprint (currently missing Twitter card entirely).

---

## HIGH — Fix Within 1–2 Weeks

### H1 — Update Contract Address Placeholders
**Files:** `src/constants/faqData.js`, `public/llms.txt`, `src/pages/BuyCEOPage.js`
**Impact:** Trust/E-E-A-T +8 pts, keyword ranking for "how to buy" queries
**Fix:** Replace "0xcomingsoon" with actual deployed contract address. Until deployment, change to:
> "Launching Soon — follow @rekt_ceo for the official contract address."

### H2 — Add Content-Security-Policy Header
**File:** `vercel.json`
**Impact:** Technical SEO security score +3 pts
**Fix:** Add CSP header in report-only mode first to avoid breaking the app:
```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com unpkg.com; connect-src *; img-src * data:; font-src 'self' fonts.gstatic.com;"
}
```

### H3 — Add Twitter Cards to Blueprint and BuyCEO Helmet
**Files:** `src/pages/Blueprint.jsx`, `src/pages/BuyCEOPage.js`
**Impact:** Social sharing appearance on Twitter/X
**Fix:** Add inside each page's Helmet block:
```jsx
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@rekt_ceo" />
<meta name="twitter:image" content="https://www.rektceo.club/rekt.webp" />
```

### H4 — Uncomment AI Discovery Lines in robots.txt
**File:** `public/robots.txt`
**Impact:** AI search readiness +3 pts (second discovery signal alongside `<link rel="llms">`)
**Fix:**
```
# BEFORE (commented out — bots don't read comments):
# llm.txt: /llm.txt
# llm-full.txt: /llm-full.txt

# AFTER:
llm.txt: /llm.txt
llm-full.txt: /llm-full.txt
```

### H5 — Add Descriptive H1 and Intro Text to /memes and /pfp
**Files:** `src/pages/MemeGen.js` (intro section commented out ~line 445), `src/pages/ProfileNFT.js`
**Impact:** Content quality +8 pts, thin content resolution, keyword targeting
**Fix for /memes:** Uncomment or add:
```jsx
<section className="meme-intro" style={{ textAlign: "center", padding: "2rem", color: "white" }}>
  <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Free AI Crypto Meme Generator</h1>
  <p>Create $CEO memes in seconds. Choose a template, customize your text, or generate with AI. Share with the REKT CEO community and own your memes on-chain.</p>
</section>
```
**Fix for /pfp:** Add an H1 to the currently empty `<header className="pfp-gen-header">`:
```jsx
<h1 className="pfp-gen-title">Mint Your Unique $CEO PFP NFT</h1>
```

---

## MEDIUM — Fix Within 1 Month

### M1 — Replace Buffer CDN with Bundled Version
**File:** `public/index.html`
**Impact:** Performance — removes blocking external HTTP request on every page load
**Fix:** Remove the `<script src="https://cdnjs.cloudflare.com/...buffer.min.js">` tag. Configure webpack (craco) to provide `Buffer` as a global from the bundled `buffer` npm package already in dependencies.

### M2 — Convert Heavy Images to WebP
**Files:** All `.jpg` and large `.png` in `src/creatives/`
**Impact:** Performance +5 pts, Image score +10 pts
**Target sizes:** Background images < 100KB, logos < 50KB
```bash
# Using cwebp (brew install webp):
find src/creatives -name "*.jpg" -exec sh -c 'cwebp -q 80 "$1" -o "${1%.jpg}.webp"' _ {} \;
find src/creatives -name "*.png" -exec sh -c 'cwebp -q 85 "$1" -o "${1%.png}.webp"' _ {} \;
```

### M3 — Add BreadcrumbList Schema to Inner Pages
**Files:** `src/pages/MemeGen.js`, `src/pages/ProfileNFT.js`, `src/pages/BuyCEOPage.js`, `src/pages/Blueprint.jsx`
**Impact:** Schema score +5 pts, potential sitelinks in SERPs
**Fix:** Add to each page's Helmet:
```jsx
<script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.rektceo.club/" },
    { "@type": "ListItem", "position": 2, "name": "Meme Generator", "item": "https://www.rektceo.club/memes" }
  ]
})}</script>
```

### M4 — Expand FAQ Answers for Featured Snippets
**File:** `src/constants/faqData.js`
**Impact:** Content quality +5 pts, AI citability, featured snippet eligibility
**Fix:** Expand each FAQ answer to 3-5 sentences with specific facts, actionable steps, and numbers. One-sentence answers won't be selected for Google featured snippets or AI Overviews.

### M5 — Add Footer Text Links
**File:** `src/pages/landingpage/Introduction.js` (footer area)
**Impact:** Internal linking +3 pts
**Fix:** Add text navigation links alongside social icons:
> `Meme Generator | Mint PFP | Buy $CEO | Blueprint`

### M6 — Add `width` and `height` Attributes to Images
**Files:** All component files with `<img>` tags
**Impact:** Reduces CLS (Cumulative Layout Shift)
**Fix:** All `<img>` elements should have explicit `width` and `height` matching rendered size.

---

## LOW — Backlog

### L1 — Consider Next.js Migration (SSR/SSG)
**Impact:** +15-20 pts overall if implemented
**Effort:** Very High — full rewrite
This is the single biggest SEO improvement available. SSR makes all content immediately indexable without Google needing to render JavaScript. Enables automatic image optimization, per-page metadata, edge caching.

### L2 — Create a Blog or Community Updates Section
**Impact:** Unlocks informational keyword rankings
A `/blog` section with 500-1000 word articles would target queries like "what is a memecoin", "how to create crypto memes", "Base chain explained".

### L3 — Add `srcset` for Responsive Images
**Impact:** Performance on mobile devices
Serve appropriately-sized images based on device screen size.

### L4 — Implement Prerendering Fallback (react-snap)
**Impact:** Helps non-JS crawlers see content without full SSR migration
`react-snap` can pre-render static HTML for bots while serving the React SPA to users.

### L5 — Submit Sitemap to Google Search Console
**Steps:**
1. Go to https://search.google.com/search-console
2. Add `https://www.rektceo.club` property
3. Verify via Vercel DNS TXT record
4. Submit: `https://www.rektceo.club/sitemap.xml`
5. Request indexing for all 5 pages

---

## Score Projection

| Action | Est. Score Impact |
|--------|------------------|
| Current score | **55** |
| C1 Fix DigitalCommunity schema | +3 |
| C2 Fix multiple H1 | +2 |
| C3 Fix Twitter handle | +1 |
| H1 Update contract placeholders | +3 |
| H2–H5 Quick fixes | +3 |
| M1–M6 Medium fixes | +5 |
| **Projected after all above** | **~72** |

---

*Action plan generated by Claude Code seo-audit skill | 2026-03-11*
*Previous plan: 2026-03-10 | Score delta: +13 (42 → 55)*
