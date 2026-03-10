# REKT CEO — SEO Action Plan
**Site:** https://www.rektceo.club
**Generated:** 2026-03-10
**Current Score:** 42/100 | **Target Score:** 75/100

---

## CRITICAL — Fix Immediately

### C1. Add `<Helmet>` to `/buy-ceo` page
**File:** `src/pages/BuyCEOPage.js`
**Impact:** Page appears in Google index with wrong title/description

**Steps:**
1. Open `src/pages/BuyCEOPage.js`
2. Add `import { Helmet } from "react-helmet-async";` at the top
3. Add inside the return, before the main div:
```jsx
<Helmet>
  <title>Buy $CEO Token on Base Chain | REKT CEO</title>
  <meta name="description" content="Buy $CEO on Base chain via Uniswap. Simple token swap interface — connect wallet, choose amount, swap. Provide liquidity to earn fees." />
  <link rel="canonical" href="https://www.rektceo.club/buy-ceo" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.rektceo.club/buy-ceo" />
  <meta property="og:title" content="Buy $CEO Token on Base Chain | REKT CEO" />
  <meta property="og:description" content="Buy $CEO on Base chain via Uniswap. Simple token swap interface." />
  <meta property="og:image" content="https://www.rektceo.club/rekt.jpg" />
</Helmet>
```

---

### C2. Add `<Helmet>` to `/blueprint` page
**File:** `src/pages/Blueprint.jsx`
**Impact:** Page appears in Google index with wrong title/description

**Steps:**
1. Open `src/pages/Blueprint.jsx`
2. Add `import { Helmet } from "react-helmet-async";` at top (after existing imports)
3. Find the main return statement and add before the first div:
```jsx
<Helmet>
  <title>REKT CEO Blueprint & Roadmap | $CEO Token</title>
  <meta name="description" content="The official REKT CEO blueprint — our vision, roadmap, and strategy for building the best memecoin community on Base L2 and Solana." />
  <link rel="canonical" href="https://www.rektceo.club/blueprint" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.rektceo.club/blueprint" />
  <meta property="og:title" content="REKT CEO Blueprint & Roadmap | $CEO Token" />
  <meta property="og:description" content="The official REKT CEO blueprint — our vision, roadmap, and strategy." />
  <meta property="og:image" content="https://www.rektceo.club/rekt.jpg" />
</Helmet>
```

---

### C3. Fix Schema.org type (invalid `DigitalCommunity`)
**File:** `public/index.html`
**Impact:** All structured data is currently ignored by Google

**Steps:**
1. Open `public/index.html`
2. Find the `<script type="application/ld+json">` block (lines 52–61)
3. Replace the entire block with:
```html
<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "REKT CEO",
    "alternateName": "$CEO",
    "url": "https://www.rektceo.club",
    "logo": "https://www.rektceo.club/logo512.png",
    "description": "REKT CEO ($CEO) is the ultimate community-driven memecoin movement on Base L2 and Solana. AI Meme Generator, NFT PFPs, and a growing global community.",
    "sameAs": [
      "https://twitter.com/rekt_ceo",
      "https://www.instagram.com/rektceo",
      "https://farcaster.xyz/rekt-ceo"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "REKT CEO",
    "url": "https://www.rektceo.club",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.rektceo.club/memes?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
]
</script>
```

---

### C4. Fix FAQ content — wrong blockchain + TBD contract
**File:** `src/constants/faqData.js`
**Impact:** Visitors see wrong info; harms trust and E-E-A-T signals

**Steps:**
1. Open `src/constants/faqData.js`
2. Replace the entire file contents:
```js
export const faqData = [
  {
    question: "What blockchain is $CEO on?",
    answer: "$CEO is live on two chains: Base L2 (EVM) and Solana. The Base contract address is 0xcomingsoon. The Solana mint address is 0xcomingsoononpump."
  },
  {
    question: "What is the $CEO token contract address?",
    answer: "Base L2: 0xcomingsoon | Solana: 0xcomingsoononpump. Always verify contract addresses from official sources before transacting."
  },
  {
    question: "What is the vision of REKT CEO?",
    answer: "REKT CEO is building a community that can coordinate on scale. We're creating real utility for a memecoin: an AI Meme Generator, NFT PFP collection, DAO governance, and IRL events — turning memes into a movement."
  },
  {
    question: "What's in the future for REKT CEO?",
    answer: "IRL clubhouse events, DAO-based decentralised coordinated operations, public chat for holders, Meme Coin Investment Funds, and more. See our full roadmap at rektceo.club/blueprint."
  },
  {
    question: "Is $CEO a safe investment?",
    answer: "$CEO is a memecoin created for entertainment and community, with no intrinsic value or expectation of financial return. Please do not invest more than you can afford to lose."
  }
]
```

---

## HIGH — Fix Within 1 Week

### H1. Add FAQPage schema to homepage
**File:** `src/pages/landingpage/Introduction.js`
**Impact:** Unlocks FAQ rich results in Google search

**Steps:**
1. Open `src/pages/landingpage/Introduction.js`
2. Import faqData at the top: `import { faqData } from "../../constants/faqData";` (already imported)
3. Inside the `<Helmet>` block, add a script tag with FAQPage schema:
```jsx
<Helmet>
  {/* ...existing tags... */}
  <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  })}</script>
</Helmet>
```

---

### H2. Fix FAQ heading structure (multiple H1s)
**File:** `src/pages/landingpage/Introduction.js` (FAQ section, ~line 136)
**Impact:** Multiple H1s confuse Google about page topic

**Steps:**
1. Open `src/pages/landingpage/Introduction.js`
2. Find the FAQ section (around line 136):
```jsx
{faqData.map((data, index) => (
  <div key={index} className="faq-card" ...>
    <h1>{data.question}</h1>   ← CHANGE THIS
    <p>{data.answer}</p>
  </div>
))}
```
3. Change `<h1>` to `<h3>` for FAQ questions:
```jsx
<h3>{data.question}</h3>
```

---

### H3. Add security headers via vercel.json
**File:** Create/update `vercel.json` in project root
**Impact:** Improves security score; some SEO tools factor security

**Steps:**
1. Check if `vercel.json` exists in project root; if not, create it
2. Add the following (merge with existing config if needed):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```
3. Deploy to Vercel — headers will be active immediately

---

### H4. Fix Twitter handle inconsistency
**File:** `src/pages/landingpage/Introduction.js` (line 89)
**Impact:** Ensures correct social attribution in search results

**Steps:**
1. Open `src/pages/landingpage/Introduction.js`
2. Find line 89: `<meta name="twitter:site" content="@rektceo" />`
3. Check your actual Twitter handle — if it's `@rekt_ceo`, change to:
   `<meta name="twitter:site" content="@rekt_ceo" />`
4. Ensure `public/index.html` and `Introduction.js` both use the same handle

---

### H5. Update copyright year + improve meta descriptions
**File:** `src/pages/landingpage/Introduction.js` (line 167)
**Impact:** Outdated year signals stale content

**Steps:**
1. Find line ~167: `2024 © RektCeo. All right reserved.`
2. Replace with: `2026 © REKT CEO. All rights reserved.`

Also update the OG description in `Introduction.js` Helmet (line ~83):
- Change: `"The Best Memecoin Community on Base L2 and Solana."`
- To: `"Join the REKT CEO movement — AI meme generator, NFT PFPs, and the best memecoin community on Base L2 and Solana."`

---

### H6. Update sitemap with changefreq and priority
**File:** `public/sitemap.xml`
**Impact:** Helps Googlebot prioritize crawl frequency

**Steps:**
1. Open `public/sitemap.xml`
2. Replace contents with:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.rektceo.club/</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.rektceo.club/memes</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.rektceo.club/pfp</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.rektceo.club/buy-ceo</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.rektceo.club/blueprint</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

---

### H7. Update llms.txt with complete information
**File:** `public/llms.txt`
**Impact:** Better AI search visibility and citation quality

**Steps:**
1. Open `public/llms.txt`
2. Expand it with:
```markdown
# REKT CEO ($CEO)

> The best memecoin community on Base L2 and Solana.

REKT CEO ($CEO) is the ultimate community-driven memecoin movement. Building a community that coordinates on scale.

## Core Links
- Website: https://www.rektceo.club/
- Meme Generator: https://www.rektceo.club/memes
- PFP NFT Minting: https://www.rektceo.club/pfp
- Buy $CEO: https://www.rektceo.club/buy-ceo
- Blueprint/Roadmap: https://www.rektceo.club/blueprint

## Key Facts
- Ticker: $CEO
- Chains: Base L2, Solana
- Base Contract: 0xcomingsoon
- Solana Mint: comingsoonSolana
- Core Products: AI Meme Generator, NFT PFP Collection
- Social: Twitter/X @rekt_ceo | Instagram @rektceo | Farcaster @rekt-ceo

## AI Meme Generator
Free tool at https://www.rektceo.club/memes. Create and customize $CEO memes, own them on-chain, and earn royalties forever.

## PFP NFT Collection
Unique on-chain identity collectibles for the $CEO community. Mint at https://www.rektceo.club/pfp.

## Tokenomics
Community-driven memecoin with no pre-sale, no VC allocation. Token for entertainment purposes only.

## Disclaimer
$CEO is a memecoin with no intrinsic value or expectation of financial return.
```

---

## MEDIUM — Fix Within 1 Month

### M1. Implement route-based code splitting
**File:** `src/App.js`
**Impact:** Dramatically reduces initial bundle size, improves LCP

**Steps:**
1. Open `src/App.js`
2. Replace static imports with lazy imports:
```js
import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CustomCursor from "./components/CustomCursor";
import { InitNexusOnConnect } from "./components/nexus/InitNexusOnConnect";
import { Analytics } from '@vercel/analytics/react';

const Introduction = lazy(() => import("./pages/landingpage/Introduction"));
const ProfileNFT = lazy(() => import("./pages/ProfileNFT"));
const AdminPage = lazy(() => import("./pages/Admin"));
const MemeGen = lazy(() => import("./pages/MemeGen"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const BuyCEOPage = lazy(() => import("./pages/BuyCEOPage"));

function App() {
  return (
    <div className="App">
      <InitNexusOnConnect />
      <CustomCursor />
      <Header />
      <div className="body">
        <Suspense fallback={<div style={{minHeight:'100vh'}}></div>}>
          <Routes>
            <Route path="/" element={<Introduction />} />
            <Route path="/pfp" element={<ProfileNFT />} />
            <Route path="/buy-ceo" element={<BuyCEOPage />} />
            <Route path="/memes" element={<MemeGen />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/blueprint" element={<Blueprint />} />
          </Routes>
        </Suspense>
      </div>
      <Analytics />
    </div>
  );
}
export default App;
```
3. Run `yarn build` and verify bundle splits into multiple chunks

---

### M2. Convert images to WebP and compress
**Impact:** Reduces page weight 60-80%, improves LCP significantly

**Steps:**
1. Install `cwebp` or use Squoosh (squoosh.app) for batch conversion
2. Convert all large images in `src/creatives/`:
   ```bash
   # Install cwebp
   brew install webp

   # Convert JPEGs
   find src/creatives -name "*.jpg" -exec sh -c 'cwebp -q 80 "$1" -o "${1%.jpg}.webp"' _ {} \;

   # Convert large PNGs
   find src/creatives -name "*.png" -exec sh -c 'cwebp -q 85 "$1" -o "${1%.png}.webp"' _ {} \;
   ```
3. Update import statements in components to use `.webp` versions
4. Also convert `public/rekt.jpg` → `public/rekt.webp` (497KB → ~60KB)
5. Update `public/index.html` OG image references

---

### M3. Add `<link rel="preload">` for LCP image
**File:** `public/index.html`
**Impact:** Faster LCP by pre-loading the hero image

**Steps:**
1. Identify the LCP image (likely the hero background or logo)
2. Add in `<head>` before other CSS/JS:
```html
<link rel="preload" as="image" href="/rekt.jpg" fetchpriority="high" />
```
3. If hero uses a bundled image, use preload with the WebP version

---

### M4. Add `loading="lazy"` to below-fold images
**Files:** All component files using `<img>` tags
**Impact:** Reduces initial page load, improves LCP

**Steps:**
1. Search for `<img` in all component files:
   ```bash
   grep -r "<img " src/pages/ src/components/ --include="*.js" --include="*.jsx"
   ```
2. For images that are NOT in the hero/above-fold:
   - Add `loading="lazy"` attribute
   - Add explicit `width` and `height` to prevent CLS
3. Hero images should have `fetchpriority="high"` instead of lazy

---

### M5. Add content sections to thin pages

#### For `/buy-ceo` page (`src/pages/BuyCEOPage.js`):
Add a text section above the swap widget:
```jsx
<section className="buy-intro-section">
  <h2>How to Buy $CEO on Base Chain</h2>
  <p>$CEO is available on Uniswap on Base L2. Connect your wallet, enter the amount, and swap USDC for $CEO in seconds.</p>
  <div className="contract-info">
    <strong>Contract Address:</strong>
    <code>0xcomingsoon</code>
  </div>
</section>
```

#### For `/memes` page:
Add an intro section with keyword-rich copy:
```jsx
<section className="meme-intro">
  <h2>Free AI Crypto Meme Generator</h2>
  <p>Create $CEO memes in seconds. Choose a template, add your text, generate with AI, and share with the community. Own your memes as NFTs and earn royalties forever.</p>
</section>
```

---

### M6. Add WebApplication schema to /memes and /pfp
**Files:** `src/pages/MemeGen.js`, `src/pages/ProfileNFT.js`
**Impact:** Rich results for web app pages

**Steps:**

In `MemeGen.js` Helmet:
```jsx
<script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "CEO Meme Generator",
  "url": "https://www.rektceo.club/memes",
  "applicationCategory": "EntertainmentApplication",
  "description": "Free AI-powered crypto meme generator for the REKT CEO ($CEO) community.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
})}</script>
```

In `ProfileNFT.js` Helmet:
```jsx
<script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "REKT CEO PFP Minter",
  "url": "https://www.rektceo.club/pfp",
  "applicationCategory": "FinanceApplication",
  "description": "Mint your REKT CEO PFP NFT — a unique on-chain identity collectible on Base L2."
})}</script>
```

---

## LOW — Backlog

### L1. Consider Next.js migration for SSR
**Impact:** Biggest long-term SEO improvement (+20–30 points)
**Why:** React SPA is the root cause of most critical SEO issues. Next.js with SSR/SSG would pre-render HTML for Googlebot.
**Effort:** High (full rewrite)
**When:** Plan for v2 of the website

### L2. Add a blog or content hub
**Impact:** Opens up informational keyword rankings
**Why:** Currently zero content targeting "what is memecoin", "how to buy crypto on Base", "best meme generators", etc.
**Steps:** Add a `/blog` route with 5-10 articles about memecoin culture, Base L2, and $CEO

### L3. Add Google Search Console and submit sitemap
**Steps:**
1. Go to https://search.google.com/search-console
2. Add property for `https://www.rektceo.club`
3. Verify via DNS TXT record (easiest with Vercel)
4. Submit sitemap: `https://www.rektceo.club/sitemap.xml`
5. Request indexing for all 5 pages

### L4. Set up Google Analytics / Vercel Analytics review
**Steps:**
1. Vercel Analytics already installed (`@vercel/analytics`) ✅
2. Review data in Vercel dashboard
3. Set up Google Search Console for organic search data
4. Track conversion events: meme creates, wallet connects, NFT mints

### L5. Add `font-display: swap` to Google Fonts
**File:** `public/index.html`
**Steps:**
Add `&display=swap` to Google Fonts URL (if loading via URL parameter)
Or add to CSS: `font-display: swap` in `@font-face` declarations

### L6. Fix alt text on Blueprint logo image
**File:** `src/pages/Blueprint.jsx`
**Steps:**
Find: `<img src={RektLogo} ...>`
Ensure: `<img src={RektLogo} alt="REKT CEO Logo" width="200" height="200" />`

---

## Priority Summary

| Priority | # Issues | Est. Time | SEO Impact |
|----------|----------|-----------|------------|
| Critical | 4 | 2–3 hours | +15 points |
| High | 7 | 1 day | +10 points |
| Medium | 6 | 3–5 days | +8 points |
| Low | 6 | 1–2 weeks | +5 points |

**Implementing Critical + High fixes alone should bring score to ~65–70/100.**
**Full implementation (all priorities) should reach ~80/100.**

---

*Action plan generated by Claude Code seo-audit skill | 2026-03-10*
