/**
 * AgentCash-powered brand agency analysis from a website URL.
 */

import { exaAnswer, exaSearch, softAgentCash } from './agentcash-client.js';
import { updateBrandProfile, getBrandProfile } from '../db/brandProfile.js';
import { upsertFeatureBySlug } from '../db/productFeatures.js';
import { createStrategyRun } from '../db/strategyRuns.js';

function safeJsonFromText(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  const raw = String(text);
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function slugify(title) {
  return String(title || 'feature')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Analyze a brand website like a sophisticated agency and persist results.
 */
export async function analyzeBrandFromUrl({
  websiteUrl,
  extraUrls = [],
  persistFeatures = true,
  payerHint = null,
} = {}) {
  const url = String(websiteUrl || '').trim();
  if (!url) throw new Error('websiteUrl required');

  const pages = [url, ...((extraUrls || []).map(String).filter(Boolean))].slice(0, 6);

  const search = await softAgentCash('exa_brand_search', () =>
    exaSearch({
      query: `${url} product features campaigns meme NFT token community`,
      numResults: 8,
    }),
  );

  const answer = await softAgentCash('exa_brand_agency', () =>
    exaAnswer({
      query: [
        `You are a senior brand strategist for crypto/web3 consumer brands.`,
        `Analyze this brand site and related pages: ${pages.join(', ')}.`,
        `Return ONLY valid JSON with keys:`,
        `name, tagline, voice, tone, slogans (string[]), audience, positioning,`,
        `do_list (string[]), dont_list (string[]), visual_cues (string[]),`,
        `competitors (string[]),`,
        `features (array of {title, category, status, url, short_description, cta_label, cta_url, do_follow[], dont_follow[], keywords[]}),`,
        `assets_notes (string).`,
        `Categories: product|campaign|token|topic. Status: live|soon|planned.`,
        `Infer product surfaces (meme gen, campaigns/XP, PFP, NFT mint, token topics) when present or implied.`,
      ].join(' '),
    }),
  );

  const rawAnswer = answer.ok
    ? (answer.data?.answer || answer.data?.text || answer.data)
    : null;
  const parsed = safeJsonFromText(rawAnswer) || {};

  const pack = {
    name: parsed.name || 'Rekt CEO',
    tagline: parsed.tagline || null,
    voice: parsed.voice || 'savage CT-native',
    tone: parsed.tone || 'edgy-humor',
    slogans: Array.isArray(parsed.slogans) ? parsed.slogans : ['REKT', '$CEO'],
    do_list: Array.isArray(parsed.do_list) ? parsed.do_list : [],
    dont_list: Array.isArray(parsed.dont_list) ? parsed.dont_list : [],
    guidelines: {
      audience: parsed.audience || null,
      positioning: parsed.positioning || null,
      visual_cues: parsed.visual_cues || [],
      competitors: parsed.competitors || [],
    },
    assets: {
      notes: parsed.assets_notes || null,
    },
    analysis: {
      raw: parsed,
      search: search.ok ? search.data : { error: search.error },
      answer_ok: answer.ok,
      answer_error: answer.ok ? null : answer.error,
      analyzed_pages: pages,
    },
    website_url: url,
    source_urls: pages,
    analyzed_at: new Date().toISOString(),
  };

  const brand = await updateBrandProfile(pack);

  const suggested = Array.isArray(parsed.features) ? parsed.features : [];
  const upserted = [];
  if (persistFeatures) {
    for (const f of suggested.slice(0, 20)) {
      try {
        const row = await upsertFeatureBySlug({
          slug: slugify(f.title),
          title: f.title || 'Feature',
          status: ['live', 'soon', 'planned'].includes(f.status) ? f.status : 'planned',
          category: ['product', 'campaign', 'token', 'topic'].includes(f.category)
            ? f.category
            : 'product',
          url: f.url || url,
          short_description: f.short_description || null,
          long_description: f.long_description || null,
          cta_label: f.cta_label || null,
          cta_url: f.cta_url || f.url || null,
          do_follow: Array.isArray(f.do_follow) ? f.do_follow : [],
          dont_follow: Array.isArray(f.dont_follow) ? f.dont_follow : [],
          keywords: Array.isArray(f.keywords) ? f.keywords : [],
          metadata: { source: 'brand_analyze', website: url },
          active: true,
        });
        upserted.push(row);
      } catch (err) {
        console.warn('feature upsert failed:', err.message);
      }
    }
  }

  await createStrategyRun({
    type: 'brand_analyze',
    input: { websiteUrl: url, extraUrls: pages.slice(1) },
    output: { brand_id: brand?.id, features_upserted: upserted.length, pack_keys: Object.keys(parsed) },
    payerHint,
    costUsd: null,
  });

  return {
    brand,
    features: upserted,
    analysis: pack.analysis,
    previous: await getBrandProfile(),
  };
}

/**
 * Enrich a single feature from its URL.
 */
export async function enrichFeatureFromUrl({ url, title = null, payerHint = null } = {}) {
  const pageUrl = String(url || '').trim();
  if (!pageUrl) throw new Error('url required');

  const answer = await softAgentCash('exa_feature_enrich', () =>
    exaAnswer({
      query: [
        `Analyze this product/feature page for a crypto brand: ${pageUrl}.`,
        title ? `Feature name hint: ${title}.` : '',
        `Return ONLY JSON: { title, short_description, long_description, cta_label, cta_url,`,
        `do_follow (string[]), dont_follow (string[]), keywords (string[]), category, status }.`,
        `Category product|campaign|token|topic. Status live|soon|planned.`,
      ].filter(Boolean).join(' '),
    }),
  );

  const parsed = safeJsonFromText(
    answer.ok ? (answer.data?.answer || answer.data?.text || answer.data) : null,
  ) || {};

  const fields = {
    title: parsed.title || title || 'Feature',
    slug: slugify(parsed.title || title || pageUrl),
    short_description: parsed.short_description || null,
    long_description: parsed.long_description || null,
    cta_label: parsed.cta_label || null,
    cta_url: parsed.cta_url || pageUrl,
    url: pageUrl,
    do_follow: Array.isArray(parsed.do_follow) ? parsed.do_follow : [],
    dont_follow: Array.isArray(parsed.dont_follow) ? parsed.dont_follow : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    category: ['product', 'campaign', 'token', 'topic'].includes(parsed.category)
      ? parsed.category
      : 'product',
    status: ['live', 'soon', 'planned'].includes(parsed.status) ? parsed.status : 'live',
    metadata: { source: 'feature_enrich', enrich_ok: answer.ok, enrich_error: answer.error || null },
  };

  const feature = await upsertFeatureBySlug(fields);

  await createStrategyRun({
    type: 'feature_enrich',
    input: { url: pageUrl, title },
    output: { feature_id: feature?.id, fields },
    payerHint,
  });

  return { feature, raw: parsed, ok: answer.ok };
}
