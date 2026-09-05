const BRANDIFY_API_URL =
  import.meta.env.VITE_BRANDIFY_API_URL || 'http://localhost:3001';

export type PaidFetch = typeof fetch;

function adminKey(): string {
  return localStorage.getItem('rekt_admin_key') || import.meta.env.VITE_ADMIN_API_KEY || '';
}

type CmoFetchOptions = RequestInit & {
  paidFetch?: PaidFetch | null;
  requireAdminKey?: boolean;
};

async function cmoFetch<T>(
  path: string,
  options: CmoFetchOptions = {},
): Promise<T> {
  const { paidFetch, requireAdminKey = false, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };

  const key = adminKey();
  if (key) headers['x-admin-key'] = key;
  if (requireAdminKey && !key) {
    throw new Error('Admin key required — set it on the Campaigns page or in VITE_ADMIN_API_KEY.');
  }

  const doFetch = paidFetch || fetch;
  const res = await doFetch(`${BRANDIFY_API_URL}/api/cmo${path}`, {
    ...init,
    headers,
  });

  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    // non-JSON
  }

  if (!res.ok) {
    const msg = String(json.error || json.message || '');
    if (res.status === 402) {
      throw new Error(
        msg
          || 'Payment required — connect wallet on Base with USDC, then retry.',
      );
    }
    if (res.status === 401) {
      throw new Error('Invalid admin key — set it on the Campaigns page or in VITE_ADMIN_API_KEY.');
    }
    if (res.status === 404) {
      throw new Error(
        msg
          || `CMO route not found (${path}). Restart the Brandify server so new content package routes are loaded.`,
      );
    }
    const persisted = json.persisted ? ' (error logged for review)' : '';
    throw new Error((msg || `CMO API error (${res.status})`) + persisted);
  }
  return json as T;
}

export type WalletAccount = {
  network: string;
  chainId: number | null;
  chainLabel: string;
  address: string;
  balanceUsd: string;
  token: string;
  depositLink: string | null;
};

export type WalletStatus = {
  totalBalanceUsd: string;
  status: 'ok' | 'low' | 'critical' | 'unconfigured';
  lowBalanceWarning: boolean;
  thresholdUsd: string;
  criticalThresholdUsd: string;
  accounts: WalletAccount[];
  onboardingCta?: { message: string; onboardLink: string } | null;
  error?: string;
  lastCheckedAt: string;
};

export type BrandifyOutput = {
  id: string
  contentItemId: string
  pipelineRunId?: string | null
  sessionId?: string | null
  templateId?: string | null
  status: 'analyzing' | 'awaiting_choices' | 'processing' | 'done' | 'failed' | 'incomplete' | string
  isCurrent: boolean
  label?: string | null
  originalImageUrl?: string | null
  mediaUrl?: string | null
  engineUsed?: string | null
  strategy?: {
    elements?: Array<{
      name?: string
      element?: string
      type?: string
      reasoning?: string
      ideas?: string[]
    }>
  } | null
  choices?: Array<{ element: string; idea: string; isCustom?: boolean }>
  draftSelections?: {
    selections?: Record<string, string>
    customs?: Record<string, string>
  } | Record<string, unknown>
  error?: string | null
  brandifyError?: string | null
  customTarget?: string | null
  feedback?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string | null
  updatedAt?: string | null
}

export type BrandifyOutputSummary = {
  id: string
  sessionId?: string | null
  templateId?: string | null
  status: string
  isCurrent?: boolean
  label?: string | null
  mediaUrl?: string | null
  originalImageUrl?: string | null
  engineUsed?: string | null
  choices?: Array<{ element: string; idea: string; isCustom?: boolean }>
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type ContentItem = {
  id: string
  status: string
  platform?: string
  body_text?: string
  hashtags?: string[]
  media_url?: string
  meme_template_id?: string
  brandify_session_id?: string
  caption_run_id?: string
  scheduled_at?: string
  published_at?: string
  metadata?: Record<string, unknown>
  pipeline_run_id?: string
  source_research_id?: string
  created_at?: string
  updated_at?: string
}

export type StrategyRun = {
  id: string;
  type: string;
  status?: string;
  input?: Record<string, unknown> | unknown;
  output?: unknown;
  error_message?: string | null;
  error_detail?: Record<string, unknown> | null;
  agentcash_cost_usd?: string | number | null;
  x402_price_usd?: string | number | null;
  payer_hint?: string | null;
  cache_key?: string | null;
  pipeline_run_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type PostIdea = {
  title: string;
  angle?: string;
  cta?: string;
  platform?: string;
  suggested_day?: number;
};

export type ContentPrompt = {
  ideaIndex: number;
  title: string;
  platform: string;
  suggested_day: number;
  autoPrompt: string;
  promptEditable: string;
  idea: PostIdea;
  intensity?: string;
  audience?: string;
  templateId?: string | null;
  featureIds?: string[];
  stagePrompts?: Partial<Record<'curate' | 'select' | 'brandify' | 'caption' | 'compose', string>>;
};

export type BrandProfile = {
  id?: string;
  name?: string;
  tagline?: string;
  voice?: string;
  tone?: string;
  slogans?: string[] | string;
  guidelines?: Record<string, unknown>;
  do_list?: string[];
  dont_list?: string[];
  assets?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  website_url?: string | null;
  launch_url?: string | null;
  meme_gen_url?: string | null;
  source_urls?: string[];
  analyzed_at?: string | null;
  updated_at?: string;
};

export type ProductFeature = {
  id: string;
  slug: string;
  title: string;
  status: 'live' | 'soon' | 'planned' | string;
  category: 'product' | 'campaign' | 'token' | 'topic' | string;
  url?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  do_follow?: string[];
  dont_follow?: string[];
  keywords?: string[];
  priority?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type PromptMemory = {
  id: string;
  stage: string;
  feature_id?: string | null;
  original_prompt?: string | null;
  edited_prompt: string;
  diff_notes?: string | null;
  accepted?: boolean;
  usage_count?: number;
  pipeline_run_id?: string | null;
  created_at?: string;
};

export type MemeTemplate = {
  id: string;
  name: string;
  category: string;
  filename?: string;
  relativePath?: string;
  exists?: boolean;
};

export type TemplateCatalog = {
  generatedAt?: string | null;
  count: number;
  categories: string[];
  items: MemeTemplate[];
  limit?: number;
  offset?: number;
};

export type PipelineStep = {
  id: string;
  label: string;
  status: string;
  config?: Record<string, unknown>;
  autoPrompt?: string | null;
  promptEditable?: string | null;
  contentPrompts?: ContentPrompt[];
  contentIds?: string[];
  runIds?: string[];
  failedIdeas?: number[];
  error?: string | null;
};

export type PipelineRun = {
  id: string;
  preset: string;
  mode: 'manual' | 'auto' | string;
  status: string;
  current_step: number;
  steps: PipelineStep[];
  outputs: {
    research?: Record<string, unknown>;
    strategy?: {
      post_ideas?: PostIdea[];
      hashtags?: string[];
      mention?: string;
      season?: string;
      [key: string]: unknown;
    };
    contentIds?: string[];
    contentItems?: ContentItem[];
    scheduled?: ContentItem[];
  };
  metadata?: Record<string, unknown>;
  contentItems?: ContentItem[];
  strategyRuns?: StrategyRun[];
  session?: {
    pipeline_id?: string;
    research?: unknown;
    strategy?: unknown;
    content_count?: number;
    run_count?: number;
    scheduled?: unknown[];
  };
  error?: string | null;
  error_step?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ResearchConfig = {
  handles: string[];
  topic: string;
  includeCompetition: boolean;
  includeTrends: boolean;
  includeKol: boolean;
  includeTopics?: boolean;
  includeSocialPulse?: boolean;
  includeNewsEvents?: boolean;
  includeIntelPack?: boolean;
  days?: number;
};

type PaidOpts = { paidFetch: PaidFetch };

export const cmoApi = {
  health: () => cmoFetch<{ success: boolean; service: string }>('/health'),

  getWalletStatus: () =>
    cmoFetch<{ success: boolean; data: WalletStatus }>('/wallet/status', {
      requireAdminKey: true,
    }).then((r) => r.data),

  getLaunchContext: () =>
    cmoFetch<{ success: boolean; data: unknown }>('/strategy/launch-context', {
      requireAdminKey: true,
    }).then((r) => r.data),

  runCompetition: (
    handles: string[],
    { paidFetch }: PaidOpts,
    includeReddit = true,
    extras?: { pipelineId?: string },
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/competition', {
      method: 'POST',
      body: JSON.stringify({
        handles,
        include_reddit: includeReddit,
        pipelineId: extras?.pipelineId,
      }),
      paidFetch,
    }).then((r) => r.data),

  runKolResearch: (
    handles: string[],
    { paidFetch }: PaidOpts,
    niche?: string,
    extras?: { pipelineId?: string },
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/kol', {
      method: 'POST',
      body: JSON.stringify({ handles, niche, pipelineId: extras?.pipelineId }),
      paidFetch,
    }).then((r) => r.data),

  runTrends: (topic: string | undefined, { paidFetch }: PaidOpts, extras?: { pipelineId?: string }) =>
    cmoFetch<{ success: boolean; data: unknown }>('/research/trends', {
      method: 'POST',
      body: JSON.stringify({ topic, pipelineId: extras?.pipelineId }),
      paidFetch,
    }).then((r) => r.data),

  runTopics: (
    topic: string | undefined,
    { paidFetch }: PaidOpts,
    niche?: string,
    extras?: { pipelineId?: string },
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/topics', {
      method: 'POST',
      body: JSON.stringify({ topic, niche, pipelineId: extras?.pipelineId }),
      paidFetch,
    }).then((r) => r.data),

  runSocialPulse: (
    body: {
      handles?: string[];
      topic?: string;
      redditQuery?: string;
      linkedinUrls?: string[];
      linkedinCompanyUrls?: string[];
      pipelineId?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/social-pulse', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
    }).then((r) => r.data),

  runNewsEvents: (topic: string | undefined, { paidFetch }: PaidOpts, extras?: { pipelineId?: string }) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/news-events', {
      method: 'POST',
      body: JSON.stringify({ topic, pipelineId: extras?.pipelineId }),
      paidFetch,
    }).then((r) => r.data),

  runIntelPack: (
    body: {
      topic?: string;
      niche?: string;
      brand?: string;
      handles?: string[];
      linkedinUrls?: string[];
      pipelineId?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/research/intel-pack', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
    }).then((r) => r.data),

  curateContent: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      prompt?: string;
      featureIds?: string[];
      feedback?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { ideate: Record<string, unknown>; item?: ContentItem } }>(
      '/content/curate',
      { method: 'POST', body: JSON.stringify(body), paidFetch },
    ).then((r) => r.data),

  selectTemplate: (
    body: { pipelineId: string; ideaIndex: number; templateId?: string | null; ideate?: unknown },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { template: Record<string, unknown>; item?: ContentItem } }>(
      '/content/select-template',
      { method: 'POST', body: JSON.stringify(body), paidFetch },
    ).then((r) => r.data),

  brandifyContent: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      templateId?: string | null;
      feedback?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { brandify: Record<string, unknown>; item?: ContentItem } }>(
      '/content/brandify',
      { method: 'POST', body: JSON.stringify(body), paidFetch },
    ).then((r) => r.data),

  brandifyVision: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      templateId?: string | null;
      customTarget?: string;
      feedback?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{
      success: boolean;
      data: {
        vision: {
          sessionId: string;
          originalImageUrl: string;
          strategy: { elements?: Array<{ name?: string; ideas?: string[] }> };
        };
        item?: ContentItem;
        price?: number;
      };
    }>('/content/brandify-vision', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
    }).then((r) => r.data),

  brandifyGenerate: (
    body: {
      pipelineId: string
      ideaIndex: number
      sessionId?: string
      originalImageUrl?: string
      userCuratedChoices: Array<{ element: string; idea: string; isCustom?: boolean }>
      feedback?: string
      outputId?: string
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{
      success: boolean
      data: {
        brandify: Record<string, unknown>
        item?: ContentItem
        output?: BrandifyOutput
        price?: number
      }
    }>('/content/brandify-generate', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
    }).then((r) => r.data),

  listBrandifyOutputs: (params: { contentItemId?: string; pipelineId?: string }) => {
    const q = new URLSearchParams()
    if (params.contentItemId) q.set('contentItemId', params.contentItemId)
    if (params.pipelineId) q.set('pipelineId', params.pipelineId)
    return cmoFetch<{ success: boolean; data: { outputs: BrandifyOutput[] } }>(
      `/content/brandify-outputs?${q.toString()}`,
      { requireAdminKey: true },
    ).then((r) => r.data)
  },

  setBrandifyOutputCurrent: (body: { contentItemId: string; outputId: string }) =>
    cmoFetch<{ success: boolean; data: { item: ContentItem; output: BrandifyOutput } }>(
      '/content/brandify-output/current',
      {
        method: 'POST',
        body: JSON.stringify(body),
        requireAdminKey: true,
      },
    ).then((r) => r.data),

  saveBrandifyDraft: (body: {
    contentItemId?: string
    pipelineId?: string
    ideaIndex?: number
    outputId?: string
    draftSelections: {
      selections?: Record<string, string>
      customs?: Record<string, string>
    }
    customTarget?: string | null
    feedback?: string | null
    templates?: Array<{ id: string; name?: string; category?: string; addedAt?: string }>
    activeTemplateId?: string | null
  }) =>
    cmoFetch<{ success: boolean; data: { item: ContentItem } }>(
      '/content/brandify-draft',
      {
        method: 'POST',
        body: JSON.stringify(body),
        requireAdminKey: true,
      },
    ).then((r) => r.data),

  patchBrandifyOutput: (
    id: string,
    body: {
      label?: string
      feedback?: string
      customTarget?: string
      draftSelections?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
  ) =>
    cmoFetch<{ success: boolean; data: { output: BrandifyOutput; item?: ContentItem } }>(
      `/content/brandify-output/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
        requireAdminKey: true,
      },
    ).then((r) => r.data),

  syncBrandifyOutputs: (contentItemId: string) =>
    cmoFetch<{ success: boolean; data: { item: ContentItem; outputs: BrandifyOutput[] } }>(
      '/content/brandify-outputs/sync',
      {
        method: 'POST',
        body: JSON.stringify({ contentItemId }),
        requireAdminKey: true,
      },
    ).then((r) => r.data),

  captionContent: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      imageUrl?: string;
      intensity?: string;
      audience?: string;
      feedback?: string;
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { caption: Record<string, unknown>; item?: ContentItem } }>(
      '/content/caption',
      { method: 'POST', body: JSON.stringify(body), paidFetch },
    ).then((r) => r.data),

  composeContent: (body: {
    pipelineId: string;
    ideaIndex: number;
    top_text?: string;
    bottom_text?: string;
  }) =>
    cmoFetch<{ success: boolean; data: { item: ContentItem; body_text?: string } }>(
      '/content/compose',
      {
        method: 'POST',
        body: JSON.stringify(body),
        requireAdminKey: true,
      },
    ).then((r) => r.data),

  runFromStage: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      fromStage: string;
      prompt?: string;
      templateId?: string | null;
      intensity?: string;
      audience?: string;
      ideate?: Record<string, unknown>;
      top_text?: string;
      bottom_text?: string;
      featureIds?: string[];
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{
      success: boolean;
      data: {
        item?: ContentItem;
        stagesRun?: { stage: string; ok: boolean; price?: number }[];
        chargedUsd?: number;
      };
    }>('/content/run-from-stage', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-CMO-From-Stage': body.fromStage },
      paidFetch,
    }).then((r) => r.data),

  draftContent: (
    topic: string,
    { paidFetch }: PaidOpts,
    extras?: {
      platform?: string;
      prompt?: string;
      strategy_context?: unknown;
      research_context?: unknown;
    },
  ) =>
    cmoFetch<{ success: boolean; data: { body_text: string; hashtags?: string[]; run_id?: string } }>(
      '/research/content-draft',
      {
        method: 'POST',
        body: JSON.stringify({
          topic,
          platform: extras?.platform || 'twitter',
          prompt: extras?.prompt,
          strategy_context: extras?.strategy_context,
          research_context: extras?.research_context,
        }),
        paidFetch,
      },
    ).then((r) => r.data),

  getCampaignBrief: (
    days: number,
    focus: string,
    { paidFetch }: PaidOpts,
    extras?: {
      research_context?: unknown;
      research_run_ids?: string[];
      prompt?: string;
      pipelineId?: string;
    },
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> & { post_ideas?: PostIdea[]; run_id?: string } }>(
      '/strategy/campaign-brief',
      {
        method: 'POST',
        body: JSON.stringify({
          days,
          focus,
          research_context: extras?.research_context,
          research_run_ids: extras?.research_run_ids,
          prompt: extras?.prompt,
          pipelineId: extras?.pipelineId,
        }),
        paidFetch,
      },
    ).then((r) => r.data),

  listContent: (opts?: string | { status?: string; pipelineId?: string; limit?: number }) => {
    const status = typeof opts === 'string' ? opts : opts?.status;
    const pipelineId = typeof opts === 'object' ? opts?.pipelineId : undefined;
    const limit = typeof opts === 'object' ? opts?.limit : undefined;
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (pipelineId) qs.set('pipeline_run_id', pipelineId);
    if (limit) qs.set('limit', String(limit));
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: ContentItem[] }>(
      `/content${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },

  createContent: (body: Partial<ContentItem> & { pipeline_run_id?: string; source_research_id?: string }) =>
    cmoFetch<{ success: boolean; data: ContentItem }>('/content', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  patchContent: (id: string, patch: Partial<ContentItem>) =>
    cmoFetch<{ success: boolean; data: ContentItem }>(`/content/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      requireAdminKey: true,
    }).then((r) => r.data),

  approveContent: (id: string) =>
    cmoFetch<{ success: boolean; data: ContentItem }>(`/content/${id}/approve`, {
      method: 'POST',
      requireAdminKey: true,
    }).then((r) => r.data),

  markPublished: (id: string) =>
    cmoFetch<{ success: boolean; data: ContentItem }>(`/content/${id}/publish`, {
      method: 'POST',
      requireAdminKey: true,
    }).then((r) => r.data),

  scheduleContent: (id: string, scheduled_at: string) =>
    cmoFetch<{ success: boolean; data: ContentItem }>('/calendar/schedule', {
      method: 'POST',
      body: JSON.stringify({ id, scheduled_at }),
      requireAdminKey: true,
    }).then((r) => r.data),

  listCalendar: () =>
    cmoFetch<{ success: boolean; data: ContentItem[] }>('/calendar', {
      requireAdminKey: true,
    }).then((r) => r.data),

  listResearchRuns: (
    opts?: { type?: string; status?: string; limit?: number; pipelineId?: string } | string,
    status?: string,
  ) => {
    const type = typeof opts === 'string' ? opts : opts?.type;
    const st = typeof opts === 'string' ? status : opts?.status;
    const limit = typeof opts === 'object' && opts?.limit ? opts.limit : 50;
    const pipelineId = typeof opts === 'object' ? opts?.pipelineId : undefined;
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (st) qs.set('status', st);
    if (limit) qs.set('limit', String(limit));
    if (pipelineId) qs.set('pipeline_run_id', pipelineId);
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: StrategyRun[] }>(
      `/research/runs${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },

  getResearchRun: (id: string) =>
    cmoFetch<{ success: boolean; data: StrategyRun }>(`/research/runs/${id}`, {
      requireAdminKey: true,
    }).then((r) => r.data),

  // --- Pipeline ---
  listPipelines: (opts?: { limit?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.status) qs.set('status', opts.status);
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: PipelineRun[] }>(
      `/pipeline${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },

  createPipeline: (body: {
    mode: 'manual' | 'auto';
    research?: Partial<ResearchConfig>;
    preset?: string;
  }) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>('/pipeline', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  getPipeline: (id: string) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}`, {
      requireAdminKey: true,
    }).then((r) => r.data),

  updatePipeline: (id: string, body: Record<string, unknown>) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  completeResearchStep: (id: string, body: {
    research: Record<string, unknown>;
    runIds?: string[];
    strategyPrompt?: string;
    days?: number;
  }) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}/steps/research/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  completeStrategyStep: (id: string, body: {
    strategy: Record<string, unknown>;
    runIds?: string[];
    strategyPrompt?: string;
    contentPrompts?: ContentPrompt[];
  }) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}/steps/strategy/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  completeContentStep: (id: string, body: {
    contentIds: string[];
    contentItems?: ContentItem[];
    runIds?: string[];
    partial?: boolean;
    failedIdeas?: number[];
    error?: string;
  }) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}/steps/content/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  schedulePipeline: (id: string, items: { id: string; scheduled_at: string }[]) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}/steps/schedule`, {
      method: 'POST',
      body: JSON.stringify({ items }),
      requireAdminKey: true,
    }).then((r) => r.data),

  failPipelineStep: (id: string, step: string, error: string) =>
    cmoFetch<{ success: boolean; data: PipelineRun }>(`/pipeline/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ step, error }),
      requireAdminKey: true,
    }).then((r) => r.data),

  runDayPackage: (
    body: {
      pipelineId: string;
      ideaIndex: number;
      prompt?: string;
      intensity?: string;
      audience?: string;
      templateId?: string | null;
      featureIds?: string[];
    },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { item: ContentItem; unitPrice?: number } }>(
      '/content/day-package',
      {
        method: 'POST',
        body: JSON.stringify(body),
        paidFetch,
      },
    ).then((r) => r.data),

  runBatchPackage: (
    body: {
      pipelineId: string;
      ideaIndexes?: number[];
      intensity?: string;
      audience?: string;
      onlyIdle?: boolean;
      prompts?: Record<number, {
        promptEditable?: string;
        intensity?: string;
        audience?: string;
        featureIds?: string[];
      }>;
      intensities?: Record<number, string>;
      audiences?: Record<number, string>;
      templateOverrides?: Record<number, string>;
      featureIds?: string[];
    },
    dayCount: number,
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{
      success: boolean;
      data: {
        items: ContentItem[];
        results: unknown[];
        failed: { ideaIndex: number; error: string }[];
        totalPrice?: number;
      };
    }>('/content/batch-package', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
      headers: { 'X-CMO-Day-Count': String(Math.max(1, dayCount)) },
    }).then((r) => r.data),

  getBrand: () =>
    cmoFetch<{ success: boolean; data: BrandProfile }>('/brand', {
      requireAdminKey: true,
    }).then((r) => r.data),

  updateBrand: (patch: Partial<BrandProfile>) =>
    cmoFetch<{ success: boolean; data: BrandProfile }>('/brand', {
      method: 'PATCH',
      body: JSON.stringify(patch),
      requireAdminKey: true,
    }).then((r) => r.data),

  analyzeBrand: (
    body: { websiteUrl: string; extraUrls?: string[]; persistFeatures?: boolean },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: { brand?: BrandProfile; features?: ProductFeature[]; analysis?: unknown } }>(
      '/brand/analyze',
      { method: 'POST', body: JSON.stringify(body), paidFetch },
    ).then((r) => r.data),

  listFeatures: (opts?: { activeOnly?: boolean; category?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.activeOnly) qs.set('active', '1');
    if (opts?.category) qs.set('category', opts.category);
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: ProductFeature[] }>(
      `/features${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },

  createFeature: (body: Partial<ProductFeature> & { title: string }) =>
    cmoFetch<{ success: boolean; data: ProductFeature }>('/features', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  updateFeature: (id: string, patch: Partial<ProductFeature>) =>
    cmoFetch<{ success: boolean; data: ProductFeature }>(`/features/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      requireAdminKey: true,
    }).then((r) => r.data),

  deleteFeature: (id: string) =>
    cmoFetch<{ success: boolean }>(`/features/${id}`, {
      method: 'DELETE',
      requireAdminKey: true,
    }),

  enrichFeature: (
    body: { url: string; title?: string },
    { paidFetch }: PaidOpts,
  ) =>
    cmoFetch<{ success: boolean; data: Record<string, unknown> }>('/features/enrich', {
      method: 'POST',
      body: JSON.stringify(body),
      paidFetch,
    }).then((r) => r.data),

  listPromptMemory: (opts?: { stage?: string; acceptedOnly?: boolean }) => {
    const qs = new URLSearchParams();
    if (opts?.stage) qs.set('stage', opts.stage);
    if (opts?.acceptedOnly) qs.set('accepted', '1');
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: PromptMemory[] }>(
      `/prompt-memory${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },

  createPromptMemory: (body: {
    stage: string;
    edited_prompt?: string;
    editedPrompt?: string;
    original_prompt?: string;
    originalPrompt?: string;
    diff_notes?: string;
    feature_id?: string | null;
    accepted?: boolean;
    pipeline_run_id?: string | null;
  }) =>
    cmoFetch<{ success: boolean; data: PromptMemory }>('/prompt-memory', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAdminKey: true,
    }).then((r) => r.data),

  listTemplates: (opts?: { category?: string; q?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.category) qs.set('category', opts.category);
    if (opts?.q) qs.set('q', opts.q);
    if (opts?.limit != null) qs.set('limit', String(opts.limit));
    if (opts?.offset != null) qs.set('offset', String(opts.offset));
    const q = qs.toString();
    return cmoFetch<{ success: boolean; data: TemplateCatalog }>(
      `/templates${q ? `?${q}` : ''}`,
      { requireAdminKey: true },
    ).then((r) => r.data);
  },
};
