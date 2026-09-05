import { getCmoConfig } from './config.js';

export async function fetchLaunchHubBootstrap(address) {
  const { campaignsApiUrl } = getCmoConfig();
  const qs = address ? `?address=${encodeURIComponent(address)}` : '';
  const res = await fetch(`${campaignsApiUrl}/api/campaigns/launch-hub-bootstrap${qs}`);
  if (!res.ok) {
    throw new Error(`Campaigns API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function fetchCampaignContextForPrompt() {
  try {
    const bootstrap = await fetchLaunchHubBootstrap();
    const xRules = bootstrap.xTaskRules || {};
    const season = bootstrap.season || {};
    return {
      season: season.title || season.id || 'Launch season',
      seasonFocus: season.focus || '',
      xTaskRules: xRules,
      hashtags: xRules.hashtags || ['#RektCEO', '#RektMeme'],
      mention: xRules.mention || '@rekt_ceo',
      mustHaveMemeImage: Boolean(xRules.mustHaveMemeImage),
      campaigns: bootstrap.campaigns || [],
    };
  } catch (err) {
    return {
      season: 'Rekt CEO Launch',
      seasonFocus: 'Daily memes, social rituals, invite the crew.',
      xTaskRules: {},
      hashtags: ['#RektCEO', '#RektMeme'],
      mention: '@rekt_ceo',
      mustHaveMemeImage: true,
      campaigns: [],
      _fetchError: err.message,
    };
  }
}
