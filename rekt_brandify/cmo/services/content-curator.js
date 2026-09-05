/**
 * Professional social content curator for CMO stage 1.
 * Produces schedule-ready copy: bold hook → story/news body → product CTA.
 */

import { agentCashFetch } from '../../scripts/agentcash-runtime.js';
import { buildBrandPromptContext } from './brand-context.js';
import { summarizeResearch } from './pipeline.js';
import { getCmoConfig } from './config.js';
import { lightreelScriptIdeas, lightreelTopHooks } from './agentcash-client.js';

const TEXT_ENDPOINT = 'https://netintel.dev/openai/gpt-4o';
const TEXT_TIMEOUT_MS = 120_000;

/** CTA line templates — LLM picks one; vars: cta_label, cta_url, product */
export const CTA_TEMPLATES = [
  {
    id: 'direct',
    label: 'Direct link',
    pattern: '{cta_label} → {cta_url}',
  },
  {
    id: 'soft_scroll',
    label: 'Soft scroll stop',
    pattern: 'Still scrolling? {cta_label} → {cta_url}',
  },
  {
    id: 'challenge',
    label: 'Challenge',
    pattern: 'Prove it — {cta_label} → {cta_url}',
  },
  {
    id: 'ugc_make',
    label: 'UGC make yours',
    pattern: 'Make yours → {cta_url}',
  },
  {
    id: 'tribe',
    label: 'Tribe join',
    pattern: 'Join the rekt ones — {cta_label}: {cta_url}',
  },
  {
    id: 'fomo',
    label: 'FOMO nudge',
    pattern: 'Don\'t get left holding the bag. {cta_label} → {cta_url}',
  },
  {
    id: 'mission',
    label: 'Mission / XP',
    pattern: 'Complete the mission — {cta_label} → {cta_url}',
  },
  {
    id: 'quote_energy',
    label: 'Quote / reply energy',
    pattern: 'Quote this with your take, then {cta_label} → {cta_url}',
  },
];

function parseJsonContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM returned empty content');
  }
  const cleaned = content
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`LLM returned non-JSON: ${cleaned.slice(0, 240)}`);
  }
}

function extractOpenAiContent(response) {
  const message =
    response?.choices?.[0]?.message
    ?? response?.data?.choices?.[0]?.message;
  if (message?.refusal) throw new Error(`LLM declined: ${message.refusal}`);
  const content = message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
    if (text) return text;
  }
  throw new Error('LLM returned empty content');
}

async function callCuratorLlm({ system, user }) {
  const response = await agentCashFetch(TEXT_ENDPOINT, {
    method: 'POST',
    body: {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    },
    timeout: TEXT_TIMEOUT_MS,
  });
  const content = extractOpenAiContent(response);
  return parseJsonContent(content);
}

export function formatCtaLine(templateId, { cta_label, cta_url, product }) {
  const tpl = CTA_TEMPLATES.find((t) => t.id === templateId) || CTA_TEMPLATES[0];
  return tpl.pattern
    .replace(/\{cta_label\}/g, cta_label || 'Learn more')
    .replace(/\{cta_url\}/g, cta_url || 'https://rektceo.com')
    .replace(/\{product\}/g, product || 'Rekt CEO');
}

/** Rich trend / news pack for the curator prompt */
export function buildTrendPack(research, strategy) {
  const intel = research?.intel || research || {};
  const news = Array.isArray(intel.news) ? intel.news : [];
  const trends = Array.isArray(intel.trends)
    ? intel.trends
    : (Array.isArray(research?.trends) ? research.trends : []);
  const angles = Array.isArray(intel.content_angles) ? intel.content_angles : [];
  const seo = Array.isArray(intel.seo_keywords) ? intel.seo_keywords : [];
  const geo = Array.isArray(intel.geo_keywords) ? intel.geo_keywords : [];

  const newsLines = news.slice(0, 6).map((n, i) => {
    if (typeof n === 'string') return `${i + 1}. ${n}`;
    const title = n.title || n.headline || n.name || 'Untitled';
    const src = n.source || n.publisher || '';
    const why = n.summary || n.snippet || n.description || '';
    return `${i + 1}. ${title}${src ? ` (${src})` : ''}${why ? ` — ${String(why).slice(0, 140)}` : ''}`;
  });

  const trendLines = trends.slice(0, 8).map((t, i) => {
    if (typeof t === 'string') return `${i + 1}. ${t}`;
    return `${i + 1}. ${t.name || t.title || t.topic || JSON.stringify(t).slice(0, 80)}`;
  });

  return {
    summary: summarizeResearch(research || {}).slice(0, 500),
    newsLines,
    trendLines,
    angles: angles.slice(0, 8).map(String),
    keywords: [...seo.slice(0, 10), ...geo.slice(0, 6)].map(String),
    strategyHashtags: Array.isArray(strategy?.hashtags) ? strategy.hashtags : [],
  };
}

function pickFeatureCta(features, idea, brand) {
  const primary = Array.isArray(features) && features.length ? features[0] : null;
  const memeUrl = brand?.meme_gen_url || getCmoConfig().memeGenUrl || 'https://rektceo.com/memes';
  const launchUrl = brand?.launch_url || getCmoConfig().launchUrl || 'https://rektceo.com/launch';

  if (primary) {
    return {
      product: primary.title,
      product_slug: primary.slug || null,
      cta_label: primary.cta_label || `Try ${primary.title}`,
      cta_url: primary.cta_url || primary.url || memeUrl,
      do_follow: Array.isArray(primary.do_follow) ? primary.do_follow : [],
      dont_follow: Array.isArray(primary.dont_follow) ? primary.dont_follow : [],
    };
  }

  // Fallback from idea CTA or brand defaults
  const ideaCta = idea?.cta ? String(idea.cta) : '';
  const looksLikeUrl = /^https?:\/\//i.test(ideaCta);
  return {
    product: 'Meme generation',
    product_slug: 'meme-generation',
    cta_label: looksLikeUrl ? 'Make a meme' : (ideaCta || 'Make a meme'),
    cta_url: looksLikeUrl ? ideaCta : memeUrl,
    do_follow: ['Invite users to create a branded meme', 'Link meme gen naturally'],
    dont_follow: ['Ask for likes', 'Corporate product pitch'],
    fallback_launch_url: launchUrl,
  };
}

const CURATOR_SYSTEM = `You are a senior social content curator for a crypto/CT brand (Rekt CEO).
You write posts that feel native on X/Twitter — bold, sharp, culturally fluent — never corporate.

Output ONLY valid JSON with this exact shape:
{
  "hook": "1 short line. ALL-CAPS energy or punchy CT slang. Must stop the scroll. Max 12 words.",
  "story_body": "2-4 short lines. Either (A) a mini-story/anecdote with emotion + payoff, OR (B) rekt/crypto news framed into valuable takeaway for the tribe. Use line breaks as \\n. No hashtags here. No CTA here.",
  "news_anchor": "Which trend or news item you used (or 'original story' if inventing a narrative from the angle)",
  "value_point": "One sentence: why this matters to Rekt CEO holders / CT",
  "visual_concept": "Concrete meme visual direction for the brandify stage (subject + emotion + gag)",
  "template_category": "One of: Angry - Wicked | Sad - Oof - Lose | WTF | Dumb - Genius | Yes - Win - Love | No - Stop - Police | Liar - Sauce | Sweat - Run away | Funny - Not funny | Offend | Humm - Not interesting - Boring",
  "template_keywords": ["3-6 short keywords for meme template search"],
  "vibe": "2-4 word vibe tag",
  "cta_template_id": "one id from the provided CTA template list",
  "hashtags": ["#RektCEO", "...2-4 more max"],
  "intensity": "savage|witty|bullish|roast"
}

Rules:
- Hook MUST be catchy and bold — not a soft question, not "Thoughts?".
- Story must deliver value (insight, roast, news take, FOMO, belonging) — not empty hype.
- Never ask for likes/shares/follows as the CTA; use the product CTA templates.
- Honor product Do/Don't lists.
- CT-native voice: rekt, bags, cope, ngmi/wagmi energy when it fits — never cringe corporate.
- Keep total post scannable on mobile (hook + body under ~280 chars preferred before CTA/hashtags).`;

/**
 * Run professional curation → structured ideate ready for pipeline + schedule.
 */
export async function curateProfessionalContent({
  idea,
  prompt = null,
  research = null,
  strategy = null,
  featureIds = null,
  feedback = null,
}) {
  const brandCtx = await buildBrandPromptContext({
    featureIds: featureIds || idea?.featureIds || null,
    stage: 'curate',
  });
  const trendPack = buildTrendPack(research, strategy);
  const featureCta = pickFeatureCta(brandCtx.features, idea, brandCtx.brand);

  let hookHints = [];
  try {
    const hooksRes = await lightreelTopHooks({
      brand: brandCtx.brand?.name || 'Rekt CEO',
      topic: `${idea?.title || ''} ${idea?.angle || ''}`.trim(),
      platform: idea?.platform || 'twitter',
      limit: 5,
    });
    const list = hooksRes?.hooks || hooksRes?.top_hooks || hooksRes?.data || [];
    if (Array.isArray(list)) {
      hookHints = list.slice(0, 5).map((h) => (typeof h === 'string' ? h : h.hook || h.text || '')).filter(Boolean);
    }
  } catch {
    // optional enrichment
  }

  const ctaCatalog = CTA_TEMPLATES.map((t) => `- ${t.id}: "${t.pattern}"`).join('\n');

  const userPrompt = [
    brandCtx.text,
    '',
    '=== DAY BRIEF ===',
    `Day: ${idea?.suggested_day ?? ''}`,
    `Title: ${idea?.title || ''}`,
    `Angle: ${idea?.angle || ''}`,
    `Platform: ${idea?.platform || 'twitter'}`,
    prompt ? `Operator notes:\n${String(prompt).slice(0, 1600)}` : '',
    feedback
      ? `PREVIOUS OUTPUT REJECTED — produce a clearly different hook + story:\n${String(feedback).slice(0, 600)}`
      : '',
    '',
    '=== TRENDING / NEWS INTEL (use for story OR news frame) ===',
    trendPack.summary ? `Brief: ${trendPack.summary}` : '',
    trendPack.trendLines.length ? `Trends:\n${trendPack.trendLines.join('\n')}` : 'Trends: (none — invent a timely CT story from the angle)',
    trendPack.newsLines.length ? `Rekt / market news:\n${trendPack.newsLines.join('\n')}` : '',
    trendPack.angles.length ? `Content angles: ${trendPack.angles.join('; ')}` : '',
    trendPack.keywords.length ? `Keywords: ${trendPack.keywords.join(', ')}` : '',
    hookHints.length ? `Hook inspiration (remix, don't copy):\n${hookHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : '',
    '',
    '=== PRODUCT CTA (must close the post with one of these templates) ===',
    `Product: ${featureCta.product}`,
    `cta_label: ${featureCta.cta_label}`,
    `cta_url: ${featureCta.cta_url}`,
    featureCta.do_follow?.length ? `Do: ${featureCta.do_follow.join('; ')}` : '',
    featureCta.dont_follow?.length ? `Don't: ${featureCta.dont_follow.join('; ')}` : '',
    'CTA templates (pick cta_template_id):',
    ctaCatalog,
    '',
    'Write as a professional content curator. Hook bold → story/news valuable → CTA from templates.',
  ].filter(Boolean).join('\n');

  let curated = null;
  let curatorError = null;
  try {
    curated = await callCuratorLlm({ system: CURATOR_SYSTEM, user: userPrompt });
  } catch (err) {
    curatorError = err.message;
    curated = await fallbackFromLightreel({
      idea,
      prompt,
      brandCtx,
      research,
      strategy,
      featureCta,
      feedback,
    });
  }

  return normalizeCuratedIdeate(curated, {
    idea,
    prompt,
    featureCta,
    trendPack,
    curatorError,
    brandCtx,
  });
}

async function fallbackFromLightreel({
  idea, prompt, brandCtx, research, strategy, featureCta, feedback,
}) {
  const topic = [
    brandCtx.text,
    `Day: ${idea?.title} — ${idea?.angle || ''}`,
    prompt ? String(prompt).slice(0, 800) : '',
    feedback ? `Feedback: ${feedback}` : '',
    'Write a bold hook then a short story or news take, CT-native.',
    `End intent CTA: ${featureCta.cta_label} → ${featureCta.cta_url}`,
  ].filter(Boolean).join('\n');

  try {
    const ideas = await lightreelScriptIdeas({
      topic,
      platform: idea?.platform || 'twitter',
      brand: brandCtx.brand?.name || 'Rekt CEO',
      goal: 'catchy hook + valuable story + product CTA',
      strategy_context: strategy || undefined,
      research_context: research || undefined,
    });
    const text =
      ideas?.script
      || ideas?.text
      || ideas?.caption
      || (Array.isArray(ideas?.ideas) ? ideas.ideas[0]?.text : null)
      || idea?.angle
      || idea?.title
      || '';
    const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
    return {
      hook: lines[0] || String(idea?.title || 'GET REKT'),
      story_body: lines.slice(1).join('\n') || String(idea?.angle || text),
      news_anchor: 'lightreel fallback',
      value_point: idea?.angle || '',
      visual_concept: ideas?.visual_concept || idea?.angle || idea?.title || 'Rekt CEO meme',
      template_category: ideas?.template_category || ideas?.category || null,
      template_keywords: ideas?.template_keywords || ['rekt', 'ceo'],
      vibe: ideas?.vibe || 'savage CT',
      cta_template_id: 'direct',
      hashtags: ideas?.hashtags || ['#RektCEO', '#RektMeme'],
      intensity: 'savage',
      raw_ideas: ideas,
    };
  } catch (err) {
    return {
      hook: String(idea?.title || 'GET REKT').toUpperCase(),
      story_body: String(idea?.angle || idea?.title || 'CT is coping again.'),
      news_anchor: 'fallback',
      value_point: '',
      visual_concept: idea?.angle || idea?.title || 'Rekt CEO meme',
      template_category: null,
      template_keywords: ['rekt', 'ceo'],
      vibe: 'savage CT',
      cta_template_id: 'direct',
      hashtags: ['#RektCEO', '#RektMeme'],
      intensity: 'savage',
      error: err.message,
    };
  }
}

export function normalizeCuratedIdeate(raw, {
  idea,
  prompt,
  featureCta,
  trendPack,
  curatorError = null,
  brandCtx = null,
}) {
  const hook = String(raw?.hook || idea?.title || 'GET REKT').trim();
  const story_body = String(raw?.story_body || raw?.story || idea?.angle || '').trim();
  const cta_template_id = String(raw?.cta_template_id || 'direct');
  const cta_label = featureCta.cta_label;
  const cta_url = featureCta.cta_url;
  const cta_line = formatCtaLine(cta_template_id, {
    cta_label,
    cta_url,
    product: featureCta.product,
  });

  let hashtags = Array.isArray(raw?.hashtags) ? raw.hashtags.map(String) : null;
  if (!hashtags?.length && trendPack?.strategyHashtags?.length) {
    hashtags = trendPack.strategyHashtags.slice(0, 5);
  }
  if (!hashtags?.length) hashtags = ['#RektCEO', '#RektMeme'];

  // Schedule-ready body (compose uses this as-is when present)
  const schedule_body = [
    hook,
    '',
    story_body,
    '',
    cta_line,
    hashtags.join(' '),
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim();

  // tweet_angle = full narrative for caption context / legacy consumers
  const tweet_angle = [hook, story_body].filter(Boolean).join('\n\n');

  const categoryGuess =
    raw?.template_category
    || null;

  return {
    // Structured curator fields
    hook,
    story_body,
    news_anchor: raw?.news_anchor || null,
    value_point: raw?.value_point || null,
    cta_template_id,
    cta_label,
    cta_url,
    cta_line,
    product: featureCta.product,
    product_slug: featureCta.product_slug,
    schedule_body,
    intensity: raw?.intensity || 'savage',

    // Pipeline compatibility
    tweet_angle,
    visual_concept: raw?.visual_concept || idea?.angle || idea?.title || 'Rekt CEO meme',
    template_category: categoryGuess,
    template_keywords: Array.isArray(raw?.template_keywords) && raw.template_keywords.length
      ? raw.template_keywords.map(String)
      : ['rekt', 'ceo'],
    caption_context: [
      hook,
      story_body,
      raw?.value_point,
      idea?.title,
      prompt ? String(prompt).slice(0, 300) : '',
    ].filter(Boolean).join('\n'),
    vibe: raw?.vibe || 'savage CT',
    hashtags,
    curator_version: 2,
    curator_error: curatorError || raw?.error || null,
    trends_used: {
      news_anchor: raw?.news_anchor || null,
      keywords: trendPack?.keywords?.slice(0, 8) || [],
    },
    features_used: (brandCtx?.features || []).map((f) => ({
      id: f.id,
      slug: f.slug,
      title: f.title,
    })),
    raw_ideas: raw?.raw_ideas || raw,
  };
}

/**
 * Assemble final post body for schedule — prefers curator schedule_body.
 */
export function composeCuratedBodyText({ ideate, caption, idea, strategy, campaign }) {
  // Prefer fully curated schedule-ready body
  if (ideate?.schedule_body && String(ideate.schedule_body).trim()) {
    const lines = [String(ideate.schedule_body).trim()];
    // Optionally append meme caption overlay text as a quiet note for operators
    // — keep schedule body clean; caption lives on the image.
    if (caption?.top_text || caption?.bottom_text) {
      // Do not inject overlay into schedule body — image carries it.
    }
    return lines.join('\n');
  }

  // Structured rebuild if pieces exist
  if (ideate?.hook || ideate?.story_body) {
    const cta_line = ideate.cta_line
      || formatCtaLine(ideate.cta_template_id || 'direct', {
        cta_label: ideate.cta_label || 'Make a meme',
        cta_url: ideate.cta_url
          || idea?.cta
          || strategy?.meme_gen_url
          || campaign?.memeGenUrl
          || getCmoConfig().memeGenUrl,
        product: ideate.product || 'Rekt CEO',
      });
    const tags = ideate.hashtags || strategy?.hashtags || campaign?.hashtags || ['#RektCEO', '#RektMeme'];
    return [
      ideate.hook || ideate.tweet_angle || idea?.title,
      '',
      ideate.story_body || '',
      '',
      cta_line,
      Array.isArray(tags) ? tags.join(' ') : '',
    ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim();
  }

  // Legacy fallback
  const lines = [];
  const hook = ideate?.tweet_angle || idea?.angle || idea?.title;
  if (hook) lines.push(String(hook).trim());
  const cta = ideate?.cta_url
    || idea?.cta
    || strategy?.meme_gen_url
    || campaign?.memeGenUrl
    || getCmoConfig().memeGenUrl;
  const label = ideate?.cta_label || 'Make yours';
  lines.push('', `${label} → ${cta}`);
  const tags = ideate?.hashtags || strategy?.hashtags || campaign?.hashtags || ['#RektCEO', '#RektMeme'];
  if (Array.isArray(tags) && tags.length) lines.push(tags.join(' '));
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
