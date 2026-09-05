import { query, isPgEnabled } from '../../server/db/pg.js';

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    guidelines: typeof row.guidelines === 'string' ? JSON.parse(row.guidelines) : (row.guidelines || {}),
    do_list: typeof row.do_list === 'string' ? JSON.parse(row.do_list) : (row.do_list || []),
    dont_list: typeof row.dont_list === 'string' ? JSON.parse(row.dont_list) : (row.dont_list || []),
    assets: typeof row.assets === 'string' ? JSON.parse(row.assets) : (row.assets || {}),
    analysis: typeof row.analysis === 'string' ? JSON.parse(row.analysis) : (row.analysis || {}),
    source_urls: row.source_urls || [],
    slogans: row.slogans || [],
  };
}

export async function getBrandProfile() {
  if (!isPgEnabled()) {
    return {
      id: 'memory',
      name: 'Rekt CEO',
      tagline: 'Get rekt. Make memes. Earn XP.',
      voice: 'savage CT-native',
      tone: 'edgy-humor',
      slogans: ['REKT', '$CEO', 'Rekt CEO'],
      guidelines: {},
      do_list: ['CT-native savage humor', 'Drive UGC memes'],
      dont_list: ['Corporate tone', 'Ask users to like/comment/share'],
      assets: {},
      analysis: {},
      website_url: 'https://rektceo.com',
      launch_url: 'https://rektceo.com/launch',
      meme_gen_url: 'https://rektceo.com/memes',
      source_urls: [],
    };
  }
  const result = await query(
    `SELECT * FROM cmo_brand_profile ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  );
  return normalize(result?.rows?.[0]);
}

export async function updateBrandProfile(patch = {}) {
  const existing = await getBrandProfile();
  if (!isPgEnabled()) {
    return { ...existing, ...patch, updated_at: new Date().toISOString() };
  }
  if (!existing?.id || existing.id === 'memory') {
    const result = await query(
      `INSERT INTO cmo_brand_profile
        (name, tagline, voice, tone, slogans, guidelines, do_list, dont_list, assets, analysis,
         website_url, launch_url, meme_gen_url, source_urls, analyzed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        patch.name || 'Rekt CEO',
        patch.tagline || null,
        patch.voice || 'savage CT-native',
        patch.tone || 'edgy-humor',
        patch.slogans || ['REKT', '$CEO'],
        JSON.stringify(patch.guidelines || {}),
        JSON.stringify(patch.do_list || []),
        JSON.stringify(patch.dont_list || []),
        JSON.stringify(patch.assets || {}),
        JSON.stringify(patch.analysis || {}),
        patch.website_url || 'https://rektceo.com',
        patch.launch_url || null,
        patch.meme_gen_url || null,
        patch.source_urls || [],
        patch.analyzed_at || null,
      ],
    );
    return normalize(result?.rows?.[0]);
  }

  const next = {
    name: patch.name !== undefined ? patch.name : existing.name,
    tagline: patch.tagline !== undefined ? patch.tagline : existing.tagline,
    voice: patch.voice !== undefined ? patch.voice : existing.voice,
    tone: patch.tone !== undefined ? patch.tone : existing.tone,
    slogans: patch.slogans !== undefined ? patch.slogans : existing.slogans,
    guidelines: patch.guidelines !== undefined ? patch.guidelines : existing.guidelines,
    do_list: patch.do_list !== undefined ? patch.do_list : existing.do_list,
    dont_list: patch.dont_list !== undefined ? patch.dont_list : existing.dont_list,
    assets: patch.assets !== undefined
      ? { ...(existing.assets || {}), ...(patch.assets || {}) }
      : existing.assets,
    analysis: patch.analysis !== undefined ? patch.analysis : existing.analysis,
    website_url: patch.website_url !== undefined ? patch.website_url : existing.website_url,
    launch_url: patch.launch_url !== undefined ? patch.launch_url : existing.launch_url,
    meme_gen_url: patch.meme_gen_url !== undefined ? patch.meme_gen_url : existing.meme_gen_url,
    source_urls: patch.source_urls !== undefined ? patch.source_urls : existing.source_urls,
    analyzed_at: patch.analyzed_at !== undefined ? patch.analyzed_at : existing.analyzed_at,
  };

  const result = await query(
    `UPDATE cmo_brand_profile SET
      name = $2, tagline = $3, voice = $4, tone = $5, slogans = $6,
      guidelines = $7, do_list = $8, dont_list = $9, assets = $10, analysis = $11,
      website_url = $12, launch_url = $13, meme_gen_url = $14, source_urls = $15,
      analyzed_at = $16, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      next.name,
      next.tagline,
      next.voice,
      next.tone,
      next.slogans,
      JSON.stringify(next.guidelines || {}),
      JSON.stringify(next.do_list || []),
      JSON.stringify(next.dont_list || []),
      JSON.stringify(next.assets || {}),
      JSON.stringify(next.analysis || {}),
      next.website_url,
      next.launch_url,
      next.meme_gen_url,
      next.source_urls || [],
      next.analyzed_at,
    ],
  );
  return normalize(result?.rows?.[0]) || { ...existing, ...next };
}
