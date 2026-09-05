-- Brand Studio: extend brand profile, product features catalog, prompt memory
-- Apply: npm run db:migrate

ALTER TABLE cmo_brand_profile
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Rekt CEO',
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS do_list JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS dont_list JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assets JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

UPDATE cmo_brand_profile
SET
  name = COALESCE(name, 'Rekt CEO'),
  tagline = COALESCE(tagline, 'Get rekt. Make memes. Earn XP.'),
  do_list = CASE
    WHEN do_list = '[]'::jsonb OR do_list IS NULL THEN
      '["CT-native savage humor","Drive UGC memes","Push Launch Hub + meme gen CTAs","Keep hashtags natural"]'::jsonb
    ELSE do_list
  END,
  dont_list = CASE
    WHEN dont_list = '[]'::jsonb OR dont_list IS NULL THEN
      '["Corporate tone","Ask users to like/comment/share","Financial advice","Guaranteed returns claims"]'::jsonb
    ELSE dont_list
  END,
  website_url = COALESCE(website_url, 'https://rektceo.com'),
  assets = CASE
    WHEN assets = '{}'::jsonb OR assets IS NULL THEN
      '{"notes":"Brand assets live in brandify brand_assets/","logo_urls":[],"meme_gen_url":"https://rektceo.com/memes","launch_url":"https://rektceo.com/launch","campaigns_url":"https://rektceo.com/campaigns"}'::jsonb
    ELSE assets
  END
WHERE id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cmo_product_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live'
    CHECK (status IN ('live', 'soon', 'planned')),
  category TEXT NOT NULL DEFAULT 'product'
    CHECK (category IN ('product', 'campaign', 'token', 'topic')),
  url TEXT,
  short_description TEXT,
  long_description TEXT,
  cta_label TEXT,
  cta_url TEXT,
  do_follow JSONB NOT NULL DEFAULT '[]',
  dont_follow JSONB NOT NULL DEFAULT '[]',
  keywords TEXT[] DEFAULT '{}',
  priority INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_features_active
  ON cmo_product_features (active, priority ASC, title ASC);
CREATE INDEX IF NOT EXISTS idx_cmo_features_category
  ON cmo_product_features (category, status);

CREATE TABLE IF NOT EXISTS cmo_prompt_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  feature_id UUID REFERENCES cmo_product_features (id) ON DELETE SET NULL,
  original_prompt TEXT,
  edited_prompt TEXT NOT NULL,
  diff_notes TEXT,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INT NOT NULL DEFAULT 0,
  pipeline_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_prompt_memory_stage
  ON cmo_prompt_memory (stage, accepted, created_at DESC);

-- Seed Rekt CEO product / topic catalog (idempotent by slug)
INSERT INTO cmo_product_features
  (slug, title, status, category, url, short_description, long_description, cta_label, cta_url, do_follow, dont_follow, keywords, priority)
VALUES
  (
    'meme-generation',
    'Meme generation',
    'live',
    'product',
    'https://rektceo.com/memes',
    'Branded meme studio for CT-native UGC.',
    'Users generate Rekt CEO branded memes and share them for engagement.',
    'Make a meme',
    'https://rektceo.com/memes',
    '["Invite users to create a branded meme","Link meme gen naturally","Ask for quote-tweet / reply energy"]'::jsonb,
    '["Ask for likes","Corporate product pitch"]'::jsonb,
    ARRAY['meme','ugc','brandify'],
    10
  ),
  (
    'ai-assists',
    'AI assists',
    'live',
    'product',
    'https://rektceo.com',
    'AI-assisted creative tools across the Rekt stack.',
    'Position AI assists as leverage for CT creators, not enterprise SaaS.',
    'Try AI assist',
    'https://rektceo.com',
    '["Frame AI as co-pilot for savage takes","Keep tone playful"]'::jsonb,
    '["Overpromise AGI","Boring feature dump"]'::jsonb,
    ARRAY['ai','assist','tools'],
    20
  ),
  (
    'sticks',
    'Sticks',
    'live',
    'product',
    'https://rektceo.com',
    'Sticks product surface in the Rekt ecosystem.',
    'Call out Sticks as a product feature when relevant to the day angle.',
    'Check Sticks',
    'https://rektceo.com',
    '["Tie Sticks to CT culture","Keep copy short"]'::jsonb,
    '["Hard sell without context"]'::jsonb,
    ARRAY['sticks'],
    30
  ),
  (
    'nft-minting',
    'NFT minting',
    'soon',
    'product',
    'https://rektceo.com',
    'NFT minting — soon to launch.',
    'Tease minting without promising dates or returns. Drive waitlist/hype energy.',
    'Mint soon',
    'https://rektceo.com',
    '["Tease upcoming mint","Build FOMO without fake dates"]'::jsonb,
    '["Guaranteed mint price","Investment advice"]'::jsonb,
    ARRAY['nft','mint'],
    40
  ),
  (
    'campaigns-xp',
    'Campaigns & XP',
    'live',
    'campaign',
    'https://rektceo.com/campaigns',
    'Daily tasks: follow, meme, share on X/TG, tag friends, earn points.',
    'Drive community to campaigns page to complete missions for XP redeemable later for coins.',
    'Do campaigns',
    'https://rektceo.com/campaigns',
    '["Send users to campaigns","List concrete tasks: follow, make meme, share X/TG, tag us + friends","Mention XP / points"]'::jsonb,
    '["Promise cash payouts","Vague engagement farming"]'::jsonb,
    ARRAY['campaigns','xp','missions','tasks'],
    5
  ),
  (
    'pfp-generation',
    'PFP generation',
    'live',
    'product',
    'https://rektceo.com',
    'Generate Rekt-style PFPs.',
    'Encourage PFP creation as identity flex for CT.',
    'Make a PFP',
    'https://rektceo.com',
    '["Identity / flex angle","Link to PFP flow"]'::jsonb,
    '["Generic avatar spam"]'::jsonb,
    ARRAY['pfp','avatar'],
    25
  ),
  (
    'pfp-minting',
    'PFP minting',
    'soon',
    'product',
    'https://rektceo.com',
    'Mint generated PFPs — soon.',
    'Tease PFP minting as next step after generation.',
    'Mint PFP soon',
    'https://rektceo.com',
    '["Connect gen → mint narrative"]'::jsonb,
    '["Fake mint date"]'::jsonb,
    ARRAY['pfp','mint'],
    45
  ),
  (
    'token-buy',
    'Buy token',
    'planned',
    'token',
    'https://rektceo.com',
    'Topic: buying the token after launch.',
    'Educational/hype posts about acquiring $CEO once live — not financial advice.',
    'Get $CEO',
    'https://rektceo.com',
    '["Use cases over price talk","Not financial advice disclaimer vibe"]'::jsonb,
    '["Guaranteed returns","Price predictions"]'::jsonb,
    ARRAY['token','buy','$CEO'],
    50
  ),
  (
    'token-lp',
    'Become LP',
    'planned',
    'token',
    'https://rektceo.com',
    'Topic: providing liquidity.',
    'Explain LP participation as ecosystem support once token is live.',
    'Provide liquidity',
    'https://rektceo.com',
    '["Explain why LP helps the pool","Keep risk-aware"]'::jsonb,
    '["Risk-free yield claims"]'::jsonb,
    ARRAY['lp','liquidity'],
    55
  ),
  (
    'token-stake',
    'Stake tokens',
    'planned',
    'token',
    'https://rektceo.com',
    'Topic: staking after launch.',
    'Stake narrative for holders — no APY guarantees.',
    'Stake $CEO',
    'https://rektceo.com',
    '["Utility / alignment angle"]'::jsonb,
    '["Guaranteed APY"]'::jsonb,
    ARRAY['stake','staking'],
    60
  ),
  (
    'token-arbitrage',
    'Arbitrage',
    'planned',
    'topic',
    'https://rektceo.com',
    'Topic: arb / market-making culture around the token.',
    'CT-native takes on arb opportunities — educational, not advice.',
    'Explore arb',
    'https://rektceo.com',
    '["Educational CT angle"]'::jsonb,
    '["Guaranteed profit"]'::jsonb,
    ARRAY['arbitrage','arb'],
    70
  )
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE cmo_product_features IS
  'Selectable product/campaign/token features injected into CMO curate prompts';
COMMENT ON TABLE cmo_prompt_memory IS
  'Operator prompt edits used as long-term learnings for stage prompts';
