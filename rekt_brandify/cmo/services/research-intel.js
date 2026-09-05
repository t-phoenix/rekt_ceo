/**
 * Research intelligence via AgentCash (StableEnrich + StableSocial).
 * Soft-fails per source so one provider outage does not kill the pack.
 */

import {
  exaAnswer,
  exaSearch,
  lightreelTrends,
  fetchTwitterUserTweets,
  fetchLinkedInProfile,
  fetchLinkedInCompany,
  redditSearch,
  serperNews,
  softAgentCash,
} from './agentcash-client.js';
import { createStrategyRun } from '../db/strategyRuns.js';
import { extractPayerHint, priceForRoute } from './paid-run.js';

function uniqueStrings(arr, max = 24) {
  const out = [];
  const seen = new Set();
  for (const raw of arr || []) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function extractKeywordsFromText(text, { geo = false } = {}) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 40);
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'are', 'was',
    'how', 'what', 'when', 'where', 'which', 'into', 'about', 'have', 'will',
    'can', 'not', 'but', 'you', 'our', 'its', 'they', 'them', 'than', 'then',
  ]);
  const counts = new Map();
  for (const w of words) {
    if (stop.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
  if (geo) {
    return uniqueStrings(
      ranked.filter((w) =>
        /ai|llm|search|seo|geo|overview|citation|perplexity|chatgpt|google|ranking|content|meme|crypto|web3|defi|token|brand/.test(w)
      ).concat(ranked),
      16,
    );
  }
  return uniqueStrings(ranked, 20);
}

function normalizeTopicsFromAnswer(answer, topic) {
  const text = typeof answer === 'string' ? answer : JSON.stringify(answer || {});
  const lines = text.split(/\n+/).map((l) => l.replace(/^[\d\.\-\*]+\s*/, '').trim()).filter((l) => l.length > 8);
  const topics = lines.slice(0, 8).map((line) => ({
    name: line.slice(0, 120),
    why: `Relevant to ${topic || 'Rekt CEO'} content and discovery`,
    emotion: /fear|fomo|greed|anger|joy|cope|rekt/i.test(line) ? 'high-arousal CT' : 'curiosity',
    behavior_hook: 'reply-bait + meme UGC',
  }));
  if (!topics.length) {
    topics.push({
      name: topic || 'crypto CT memes',
      why: 'Default campaign focus',
      emotion: 'savage CT',
      behavior_hook: 'reply-bait',
    });
  }
  return topics;
}

/**
 * Topics + SEO/GEO keyword packs from Exa answer + Lightreel trends.
 */
export async function runTopicsResearch({
  topic = 'Rekt CEO crypto memecoin CT',
  niche = 'web3',
  brand = 'Rekt CEO',
} = {}) {
  const sources = {};
  const costs = [];

  const answerRes = await softAgentCash('exa_answer', () =>
    exaAnswer({
      query: `What are the top content topics, SEO keywords, and AI-overview (GEO) phrases for ${brand} / ${topic} in ${niche}? List concrete topic angles and keyword phrases.`,
      text: true,
    }));
  sources.exa_answer = answerRes.ok ? answerRes.data : { error: answerRes.error };
  if (answerRes.ok) costs.push(0.01);

  const trendsRes = await softAgentCash('lightreel_trends', () =>
    lightreelTrends({ topic, niche }));
  sources.trends = trendsRes.ok ? trendsRes.data : { error: trendsRes.error };
  if (trendsRes.ok) costs.push(0.06);

  const answerText =
    sources.exa_answer?.answer
    || (typeof sources.exa_answer === 'string' ? sources.exa_answer : '')
    || '';
  const topics = normalizeTopicsFromAnswer(answerText, topic);
  const trendBlob = JSON.stringify(sources.trends || {}).slice(0, 4000);
  const seo_keywords = uniqueStrings([
    ...extractKeywordsFromText(`${answerText} ${topic} ${brand}`),
    `${brand} meme`,
    `${topic} crypto`,
    'rekt ceo',
    'ct meme',
  ]);
  const geo_keywords = uniqueStrings([
    ...extractKeywordsFromText(`${answerText} ${trendBlob}`, { geo: true }),
    `what is ${brand}`,
    `${brand} token explained`,
    `${topic} AI overview`,
  ]);
  const content_angles = topics.slice(0, 6).map((t) => t.name);

  return {
    topics,
    seo_keywords,
    geo_keywords,
    content_angles,
    trends: sources.trends,
    sources,
    agentcash_cost_usd: Number(costs.reduce((a, b) => a + b, 0).toFixed(4)),
  };
}

/**
 * Twitter + Reddit + optional LinkedIn pulse.
 */
export async function runSocialPulse({
  handles = [],
  redditQuery = null,
  linkedinUrls = [],
  linkedinCompanyUrls = [],
  topic = 'crypto memecoin',
} = {}) {
  const social = { twitter: [], reddit: [], linkedin: [] };
  const errors = [];
  let cost = 0;

  const twHandles = (handles || []).slice(0, 5);
  for (const handle of twHandles) {
    const res = await softAgentCash(`twitter:${handle}`, () => fetchTwitterUserTweets(handle));
    if (res.ok) {
      social.twitter.push({ handle: handle.replace(/^@/, ''), data: res.data });
      cost += 0.06;
    } else {
      errors.push({ source: `twitter:${handle}`, error: res.error });
    }
  }

  const q = redditQuery || topic || 'crypto meme';
  const redditRes = await softAgentCash('reddit', () =>
    redditSearch({ query: q, sort: 'hot', limit: 15 }));
  if (redditRes.ok) {
    social.reddit = Array.isArray(redditRes.data?.posts)
      ? redditRes.data.posts
      : redditRes.data?.results || redditRes.data || [];
    cost += 0.02;
  } else {
    errors.push({ source: 'reddit', error: redditRes.error });
  }

  for (const url of (linkedinUrls || []).slice(0, 2)) {
    const res = await softAgentCash(`linkedin_profile`, () => fetchLinkedInProfile(url));
    if (res.ok) {
      social.linkedin.push({ type: 'profile', url, data: res.data });
      cost += 0.06;
    } else {
      errors.push({ source: 'linkedin_profile', error: res.error });
    }
  }
  for (const url of (linkedinCompanyUrls || []).slice(0, 2)) {
    const res = await softAgentCash(`linkedin_company`, () => fetchLinkedInCompany(url));
    if (res.ok) {
      social.linkedin.push({ type: 'company', url, data: res.data });
      cost += 0.06;
    } else {
      errors.push({ source: 'linkedin_company', error: res.error });
    }
  }

  return {
    social,
    errors,
    agentcash_cost_usd: Number(cost.toFixed(4)),
  };
}

/**
 * News + events + research references for topics.
 */
export async function runNewsEvents({
  topic = 'crypto memecoin',
  topics = [],
  query = null,
} = {}) {
  const q = query
    || (topics[0]?.name)
    || topic;
  const errors = [];
  let cost = 0;

  const newsRes = await softAgentCash('serper_news', () =>
    serperNews({ q, num: 10, gl: 'us', hl: 'en' }));
  const newsRaw = newsRes.ok ? (newsRes.data?.news || []) : [];
  if (newsRes.ok) cost += 0.04;
  else errors.push({ source: 'serper_news', error: newsRes.error });

  const news = newsRaw.slice(0, 12).map((n) => ({
    title: n.title || '',
    url: n.link || n.url || '',
    source: n.source || '',
    date: n.date || null,
    angle: n.snippet || '',
  }));

  const searchRes = await softAgentCash('exa_search', () =>
    exaSearch({
      query: `${q} crypto web3 news events research`,
      numResults: 8,
      category: 'news',
      contents: { summary: { query: 'Key claim for meme/content marketers' } },
    }));
  if (searchRes.ok) cost += 0.01;
  else errors.push({ source: 'exa_search', error: searchRes.error });

  const answerRes = await softAgentCash('exa_answer_events', () =>
    exaAnswer({
      query: `Upcoming or recent events, launches, and research references related to: ${q}. List events and cite sources.`,
      text: true,
    }));
  if (answerRes.ok) cost += 0.01;
  else errors.push({ source: 'exa_answer', error: answerRes.error });

  const references = [];
  const citations = answerRes.data?.citations || [];
  for (const c of citations) {
    references.push({ url: c.url, claim: c.title || c.text?.slice(0, 160) || '' });
  }
  for (const r of searchRes.data?.results || []) {
    references.push({
      url: r.url,
      claim: r.summary || r.title || '',
    });
  }

  const events = [];
  const answerText = typeof answerRes.data?.answer === 'string'
    ? answerRes.data.answer
    : JSON.stringify(answerRes.data?.answer || '');
  for (const line of answerText.split(/\n+/).slice(0, 10)) {
    const cleaned = line.replace(/^[\d\.\-\*]+\s*/, '').trim();
    if (cleaned.length > 12) events.push(cleaned.slice(0, 200));
  }

  return {
    news,
    events,
    references: uniqueStrings(references.map((r) => JSON.stringify(r)), 20)
      .map((s) => { try { return JSON.parse(s); } catch { return { url: '', claim: s }; } }),
    sources: {
      serper: newsRes.ok ? { count: news.length } : { error: newsRes.error },
      exa_search: searchRes.ok ? { count: (searchRes.data?.results || []).length } : { error: searchRes.error },
      exa_answer: answerRes.ok ? true : { error: answerRes.error },
    },
    errors,
    agentcash_cost_usd: Number(cost.toFixed(4)),
  };
}

/**
 * One-shot intel pack: topics + social + news.
 */
export async function runIntelPack({
  topic = 'Rekt CEO crypto memecoin CT',
  niche = 'web3',
  brand = 'Rekt CEO',
  handles = [],
  redditQuery = null,
  linkedinUrls = [],
  linkedinCompanyUrls = [],
} = {}) {
  const topicsResult = await runTopicsResearch({ topic, niche, brand });
  const socialResult = await runSocialPulse({
    handles,
    redditQuery: redditQuery || topic,
    linkedinUrls,
    linkedinCompanyUrls,
    topic,
  });
  const newsResult = await runNewsEvents({
    topic,
    topics: topicsResult.topics,
  });

  const cost = Number((
    (topicsResult.agentcash_cost_usd || 0)
    + (socialResult.agentcash_cost_usd || 0)
    + (newsResult.agentcash_cost_usd || 0)
  ).toFixed(4));

  return {
    topics: topicsResult.topics,
    seo_keywords: topicsResult.seo_keywords,
    geo_keywords: topicsResult.geo_keywords,
    content_angles: topicsResult.content_angles,
    trends: topicsResult.trends,
    social: socialResult.social,
    news: newsResult.news,
    events: newsResult.events,
    references: newsResult.references,
    errors: [
      ...(socialResult.errors || []),
      ...(newsResult.errors || []),
    ],
    agentcash_cost_usd: cost,
  };
}

export async function persistIntelRun({
  type,
  input,
  output,
  payerHint,
  priceEnv,
  priceDefault,
  agentcashCostUsd = null,
  pipelineRunId = null,
}) {
  const x402PriceUsd = priceForRoute(priceEnv, priceDefault);
  return createStrategyRun({
    type,
    input,
    output,
    costUsd: agentcashCostUsd ?? x402PriceUsd,
    x402PriceUsd,
    payerHint,
    pipelineRunId: pipelineRunId || input?.pipelineId || input?.pipeline_id || null,
  });
}

export { extractPayerHint };
