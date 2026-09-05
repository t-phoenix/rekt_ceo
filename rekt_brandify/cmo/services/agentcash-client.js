import { agentCashFetch } from '../../scripts/agentcash-runtime.js';
import { STABLE_ENRICH, STABLE_SOCIAL } from './config.js';

export async function stableSocialPost(path, body) {
  const url = `${STABLE_SOCIAL}${path.startsWith('/') ? path : `/${path}`}`;
  return agentCashFetch(url, { method: 'POST', body });
}

export async function stableEnrichPost(path, body) {
  const url = `${STABLE_ENRICH}${path.startsWith('/') ? path : `/${path}`}`;
  return agentCashFetch(url, { method: 'POST', body });
}

export async function fetchTwitterUserTweets(userName) {
  return stableSocialPost('/api/sc/twitter/user-tweets', {
    userName: userName.replace(/^@/, ''),
  });
}

export async function fetchTwitterProfile(userName) {
  return stableSocialPost('/api/sc/twitter/profile', {
    userName: userName.replace(/^@/, ''),
  });
}

export async function fetchLinkedInProfile(profileUrl) {
  return stableSocialPost('/api/sc/linkedin/profile', { url: profileUrl });
}

export async function fetchLinkedInCompany(companyUrl) {
  return stableSocialPost('/api/sc/linkedin/company', { url: companyUrl });
}

export async function lightreelTrends(body) {
  return stableSocialPost('/api/lightreel/trends', body);
}

export async function lightreelCompetitorStrategy(body) {
  return stableSocialPost('/api/lightreel/competitor-strategy', body);
}

export async function lightreelBrandMentions(body) {
  return stableSocialPost('/api/lightreel/brand-mentions', body);
}

export async function lightreelContentCalendar(body) {
  return stableSocialPost('/api/lightreel/content-calendar', body);
}

export async function lightreelScriptIdeas(body) {
  return stableSocialPost('/api/lightreel/script-ideas', body);
}

export async function lightreelTopHooks(body) {
  return stableSocialPost('/api/lightreel/top-hooks', body);
}

export async function redditSearch(body) {
  return stableEnrichPost('/api/reddit/search', body);
}

export async function redditPostComments(body) {
  return stableEnrichPost('/api/reddit/post-comments', body);
}

/** Exa neural web search — required: query */
export async function exaSearch(body) {
  return stableEnrichPost('/api/exa/search', body);
}

/** Exa AI answer with citations — required: query */
export async function exaAnswer(body) {
  return stableEnrichPost('/api/exa/answer', body);
}

/** Serper Google News — required: q */
export async function serperNews(body) {
  return stableEnrichPost('/api/serper/news', body);
}

/** Soft-fail wrapper: returns { ok, data|error } without throwing. */
export async function softAgentCash(label, fn) {
  try {
    const data = await fn();
    return { ok: true, label, data };
  } catch (err) {
    console.warn(`[agentcash:${label}]`, err.message);
    return { ok: false, label, error: err.message };
  }
}
