import { z } from 'zod';

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be checksummable 0x address');

export const erc20RuleSchema = z.object({
  kind: z.literal('erc20_min_balance'),
  token: ethAddress,
  /** Decimal string e.g. "100.5" — compared against ERC20.balanceOf(wallet) using token decimals */
  thresholdHuman: z.string().min(1),
  /** If set, skip token.decimals() and use this (e.g. 6 for USDC) */
  decimalsOverride: z.number().int().min(0).max(77).optional(),
});

export const erc721BalanceRuleSchema = z.object({
  kind: z.literal('erc721_min_balance'),
  contract: ethAddress,
  minCount: z.number().int().min(1).max(1_000_000),
});

export const erc721OwnerRuleSchema = z.object({
  kind: z.literal('erc721_owner_of'),
  contract: ethAddress,
  tokenId: z.string().regex(/^\d+$/, 'tokenId as decimal string'),
});

export const onchainRuleSchema = z.discriminatedUnion('kind', [
  erc20RuleSchema,
  erc721BalanceRuleSchema,
  erc721OwnerRuleSchema,
]);

export type OnchainRule = z.infer<typeof onchainRuleSchema>;

/** Display-only campaigns; verify endpoint returns not_verifiable */
export const verificationModeSchema = z.enum(['none', 'snapshot', 'held_window']);

export const onchainCampaignDefSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-_.]+$/i),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    status: z.string().min(1).max(32),
    rewardText: z.string().min(1).max(280),
    /** Primary CTA label */
    ctaLabel: z.string().min(1).max(64).optional(),
    /** Back-compat with older clients */
    cta: z.string().min(1).max(64).optional(),
    /** External link (DEX, marketplace, mint page). Omit or use empty string when not used. */
    actionUrl: z.union([z.string().url().max(2048), z.literal('')]).optional(),
    color: z.string().max(32).optional(),
    iconKey: z.string().max(64).optional(),
    xpReward: z.number().int().min(0).max(1_000_000),
    chainId: z.number().int().positive(),
    verificationMode: verificationModeSchema,
    /** Required when verificationMode === held_window */
    minHoldSeconds: z.number().int().min(60).max(365 * 24 * 3600).optional(),
    rule: onchainRuleSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.verificationMode === 'snapshot' || data.verificationMode === 'held_window') {
      if (!data.rule) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rule required for on-chain verification', path: ['rule'] });
      }
      if (data.xpReward <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'xpReward must be positive for on-chain verification',
          path: ['xpReward'],
        });
      }
    }
    if (data.verificationMode === 'held_window') {
      if (!data.minHoldSeconds || data.minHoldSeconds < 60) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'minHoldSeconds required for held_window (≥60)', path: ['minHoldSeconds'] });
      }
    }
    const label = data.ctaLabel || data.cta;
    if (data.actionUrl && data.actionUrl.length > 0 && !label) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ctaLabel or cta required when actionUrl is set', path: ['ctaLabel'] });
    }
  });

export type OnchainCampaignDefV2 = z.infer<typeof onchainCampaignDefSchema>;

/** Legacy v1 campaigns (marketing cards only until migrated). */
export const legacyCampaignSchema = z.object({
  schemaVersion: z.undefined().optional(),
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  rewardText: z.string().min(1),
  cta: z.string().optional(),
  color: z.string().optional(),
  iconKey: z.string().optional(),
});

export type LegacyCampaignRow = z.infer<typeof legacyCampaignSchema>;

export const campaignRowSchema = z.union([onchainCampaignDefSchema, legacyCampaignSchema]);

export const CampaignsPutSchema = z.object({
  schemaVersionList: z.literal(2).optional(),
  campaigns: z.array(campaignRowSchema).max(80),
});

/**
 * Validates admin PUT body — accepts either `{ campaigns: [...] }` (existing) only.
 */
export function parseValidatedCampaignPut(body: unknown): { campaigns: unknown[] } {
  const raw = typeof body === 'object' && body !== null ? (body as { campaigns?: unknown }) : {};
  const campaigns = raw.campaigns;
  if (!Array.isArray(campaigns)) {
    throw new Error('campaigns must be an array');
  }
  const parsed: unknown[] = [];
  for (const row of campaigns) {
    const o = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    const v = Number(o.schemaVersion);
    if (v === 2 || o.schemaVersion === 2) {
      try {
        parsed.push(onchainCampaignDefSchema.parse(o));
      } catch (ze) {
        const zerr = ze as z.ZodError;
        const msg = zerr.issues?.length
          ? zerr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : 'Campaign schema validation failed';
        throw new Error(msg);
      }
      continue;
    }
    parsed.push(
      legacyCampaignSchema.parse({
        id: String(o.id),
        title: String(o.title ?? ''),
        status: String(o.status ?? 'LIVE'),
        rewardText: String(o.rewardText ?? ''),
        cta: o.cta ? String(o.cta) : undefined,
        color: o.color ? String(o.color) : undefined,
        iconKey: o.iconKey ? String(o.iconKey) : undefined,
      }),
    );
  }
  const ids = new Set<string>();
  for (const c of parsed as { id?: string }[]) {
    if (c?.id && ids.has(c.id)) throw new Error(`Duplicate campaign id: ${c.id}`);
    if (c?.id) ids.add(c.id);
  }
  return { campaigns: parsed };
}
