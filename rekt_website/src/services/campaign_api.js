/** Mint / nonce / SIWE stay on {@link BACKEND_URL}; Launch Hub endpoints use {@link CAMPAIGN_API_URL}. */
import { clearStoredAuthToken, getValidStoredAuthToken } from "../utils/evmAuthToken";

const BACKEND_URL = process.env.REACT_APP_BACKEND_API_URL || "http://localhost:3000";
const CAMPAIGN_API_URL = process.env.REACT_APP_CAMPAIGN_API_URL || BACKEND_URL;

const mockLayout = {
  page: "launch_hub",
  inviteColSpan: 2,
  blocks: [
    { type: "InviteCodeBlock", props: {}, colSpan: 2 },
    { type: "SeasonStripBlock", props: {}, colSpan: 1 },
    { type: "EligibilityBannerBlock", props: {}, colSpan: 1 },
    { type: "IdentityChecklistBlock", props: {}, colSpan: 1 },
    { type: "XPSummaryBlock", props: {}, colSpan: 1 },
    { type: "DailyCheckinBlock", props: {}, colSpan: 1 },
    { type: "DailySpinBlock", props: {}, colSpan: 1 },
    { type: "XShareTaskBlock", props: { presetId: "daily-meme-share" }, colSpan: 2 },
    { type: "CampaignListBlock", props: {}, colSpan: 2 },
    { type: "LeaderboardBlock", props: {}, colSpan: 2 },
    { type: "ConnectGuideBlock", props: {}, colSpan: 1 },
  ],
};

const mockBootstrap = {
  identity: {
    evmConnected: false,
    solanaLinked: false,
    xLinked: false,
    discordLinked: false,
    telegramLinked: false,
    baseBalanceEligible: false,
    baseBalanceUsd: 0,
    handles: { x: null, discord: null, telegram: null, solana: null },
  },
  xp: { lifetime: 0, season: 0, level: 1, nextLevelAt: 500 },
  daily: { today: "", checkinClaimed: false, spinClaimed: false, streak: { count: 0, lastDate: null } },
  invite: {
    inviteWall: false,
    activation: null,
    batch: null,
    canRotate: false,
  },
  xTaskRules: {
    mention: "@rekt_ceo",
    mustHaveMemeImage: true,
    minFriendTags: 2,
    hashtags: ["#RektCEO", "#RektMeme", "#GMRekt"],
    delayBeforeCreditMinutes: 5,
    presetId: "daily-meme-share",
    label: "Daily Meme Share",
  },
  xMission: {
    presetId: "daily-meme-share",
    label: "Daily Meme Share",
    rules: { delayBeforeCreditMinutes: 5 },
    today: "",
    allTasksCredited: false,
    totalXpAvailable: 160,
    totalXpEarnedToday: 0,
    tasks: [
      {
        id: "mention",
        label: "Mention @rekt_ceo",
        kind: "mention",
        required: true,
        xp: 60,
        creditedToday: false,
      },
      {
        id: "meme_image",
        label: "Attach a meme image",
        kind: "meme_image",
        required: true,
        xp: 40,
        creditedToday: false,
      },
      {
        id: "friend_tags",
        label: "Tag 2 friends",
        kind: "friend_tags",
        required: false,
        xp: 30,
        creditedToday: false,
      },
      {
        id: "hashtags",
        label: "Campaign hashtags",
        kind: "hashtags",
        required: false,
        xp: 30,
        creditedToday: false,
      },
    ],
  },
  xpRewards: {
    dailyCheckinBase: 10,
    dailyCheckinStreakBonusMax: 20,
    dailySpinBuckets: [5, 10, 15, 20, 25, 35, 50, 75],
    linkXp: { x: 75, discord: 75, telegram: 50, solana: 40 },
    inviteXpInvitee: 75,
    inviteXpInviter: 200,
    xMissionRewards: { "daily-meme-share": 60 },
  },
  season: {
    id: "season-1",
    title: "Season 1: Pre-Launch Hype",
    endsInDays: 30,
    focus: "Daily memes, social rituals, invite the crew.",
  },
  campaigns: [
    {
      id: "meme-marathon",
      title: "Meme Marathon",
      status: "LIVE",
      rewardText: "Earn up to 150 XP/day",
      cta: "START TODAY",
      color: "yellow",
      iconKey: "meme",
    },
    {
      id: "tag-two-friends",
      title: "Tag Two Friends Sprint",
      status: "LIVE",
      rewardText: "Extra 40 XP bonus",
      cta: "VIEW RULES",
      color: "red",
      iconKey: "tag",
    },
    {
      id: "discord-gm-streak",
      title: "Discord GM Streak",
      status: "LIVE",
      rewardText: "7/14/30-day milestones",
      cta: "JOIN DISCORD",
      color: "blue",
      iconKey: "discord",
    },
    {
      id: "invite-the-crew",
      title: "Invite the Crew",
      status: "LIVE",
      rewardText: "+200 XP per qualified invite",
      cta: "GRAB CODE",
      color: "purple",
      iconKey: "invite",
    },
  ],
  leaderboard: [
    {
      rank: 1,
      address: "0x1111111111111111111111111111111111111111",
      handle: "@rekt_legend",
      points: 12450,
      connections: { x: true, discord: true, telegram: false, solana: false },
      baseBalanceEligible: true,
    },
    {
      rank: 2,
      address: "0x2222222222222222222222222222222222222222",
      handle: "@ceo_memelord",
      points: 11320,
      connections: { x: true, discord: false, telegram: false, solana: true },
      baseBalanceEligible: false,
    },
    {
      rank: 3,
      address: "0x3333333333333333333333333333333333333333",
      handle: "@based_rekt",
      points: 10960,
      connections: { x: true, discord: false, telegram: true, solana: false },
      baseBalanceEligible: true,
    },
    {
      rank: 4,
      address: "0x4444444444444444444444444444444444444444",
      handle: "@wagmi_anon",
      points: 8800,
      connections: { x: false, discord: true, telegram: false, solana: false },
      baseBalanceEligible: false,
    },
    {
      rank: 5,
      address: "0x5555555555555555555555555555555555555555",
      handle: "@degenpilled",
      points: 7200,
      connections: { x: true, discord: true, telegram: true, solana: false },
      baseBalanceEligible: true,
    },
  ],
};

function getAuthToken(address) {
  if (!address) return null;
  return getValidStoredAuthToken(address);
}

function clearAuthToken(address) {
  if (!address) return;
  clearStoredAuthToken(address);
}

async function getJSON(path, options, address, opts = {}) {
  const { token: explicitToken } = opts;
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  };
  const token = explicitToken || getAuthToken(address);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${CAMPAIGN_API_URL}${path}`, { ...options, headers });
  // Try to parse JSON regardless of status so callers can read structured errors.
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    // 401 means our cached JWT is stale (or never existed). Clear it so the
    // next attempt runs the SIWE flow again instead of silently failing.
    if (response.status === 401 && address) {
      clearAuthToken(address);
    }
    const err = new Error(
      body?.message ||
        body?.error ||
        (response.status === 401
          ? "Sign in with your wallet first (SIWE)."
          : `Request failed: ${response.status}`),
    );
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const campaignApi = {
  async getLaunchHubLayout() {
    try {
      const payload = await getJSON("/api/campaigns/launch-hub-layout");
      return payload?.data || mockLayout;
    } catch (error) {
      return mockLayout;
    }
  },

  async getLaunchHubBootstrap(address) {
    try {
      const query = address ? `?address=${address}` : "";
      const payload = await getJSON(`/api/campaigns/launch-hub-bootstrap${query}`, undefined, address);
      return payload?.data || mockBootstrap;
    } catch (error) {
      return mockBootstrap;
    }
  },

  /**
   * Loads layout + bootstrap without swallowing errors — callers can toast and still show mock fallbacks.
   */
  async loadLaunchHubData(address) {
    const errors = [];
    let layout = mockLayout;
    let data = mockBootstrap;

    try {
      const payload = await getJSON("/api/campaigns/launch-hub-layout");
      if (payload?.data) layout = payload.data;
    } catch (e) {
      errors.push({ scope: "layout", message: e?.message || "Could not load hub layout." });
    }

    try {
      const query = address ? `?address=${encodeURIComponent(address)}` : "";
      const payload = await getJSON(`/api/campaigns/launch-hub-bootstrap${query}`, undefined, address);
      if (payload?.data) data = payload.data;
    } catch (e) {
      errors.push({ scope: "bootstrap", message: e?.message || "Could not load your campaign data." });
    }

    return { layout, data, errors };
  },

  async claimDailyCheckin(address) {
    try {
      const payload = await getJSON("/api/daily/checkin", { method: "POST" }, address);
      const d = payload?.data;
      return {
        ok: true,
        awarded: d?.awarded ?? 10,
        claimed: d?.claimed ?? true,
        breakdown: d?.breakdown ?? null,
        reason: d?.reason ?? null,
      };
    } catch (error) {
      return {
        ok: false,
        awarded: 0,
        claimed: false,
        message: error?.message || "Check-in failed.",
      };
    }
  },

  async claimDailySpin(address) {
    try {
      const payload = await getJSON("/api/daily/spin", { method: "POST" }, address);
      const d = payload?.data;
      return {
        ok: true,
        awarded: d?.awarded ?? 0,
        claimed: d?.claimed ?? true,
        buckets: d?.buckets ?? null,
        bucketIndex: d?.bucketIndex ?? null,
        reason: d?.reason ?? null,
      };
    } catch (error) {
      return {
        ok: false,
        awarded: 0,
        claimed: false,
        message: error?.message || "Spin failed.",
      };
    }
  },

  async verifyXMission(address, presetId) {
    try {
      const payload = await getJSON(
        "/api/campaigns/x-mission/verify",
        {
          method: "POST",
          body: JSON.stringify(presetId ? { presetId: String(presetId) } : {}),
        },
        address,
      );
      const d = payload?.data;
      const verification = d?.verification && typeof d.verification === "object" ? d.verification : null;
      return {
        ok: true,
        credits: Array.isArray(d?.credits) ? d.credits : [],
        allTasksComplete: !!d?.allTasksComplete,
        awarded: d?.awarded ?? 0,
        presetId: d?.presetId ?? null,
        verification,
      };
    } catch (error) {
      return {
        ok: false,
        credits: [],
        allTasksComplete: false,
        awarded: 0,
        message: error?.message || error?.body?.error || "Verification failed.",
        status: error?.status,
        serverError: error?.body?.error,
      };
    }
  },

  async linkIdentity(address, provider, handle, opts = {}) {
    try {
      const payload = await getJSON(
        "/api/identity/link",
        { method: "POST", body: JSON.stringify({ provider, handle }) },
        address,
        opts,
      );
      return { ok: !!payload?.success, data: payload?.data };
    } catch (error) {
      return {
        ok: false,
        status: error?.status,
        error: error?.body?.error || "request_failed",
        message: error?.body?.message || error.message,
      };
    }
  },

  async unlinkIdentity(address, provider, opts = {}) {
    try {
      const payload = await getJSON(
        "/api/identity/unlink",
        { method: "POST", body: JSON.stringify({ provider }) },
        address,
        opts,
      );
      return payload?.data;
    } catch (error) {
      return null;
    }
  },

  async refreshBaseBalance(address) {
    try {
      const payload = await getJSON("/api/campaigns/refresh-base-balance", { method: "POST" }, address);
      return { ok: true, data: payload?.data };
    } catch (error) {
      return { ok: false, message: error?.message || "Balance refresh failed." };
    }
  },

  /**
   * On-chain campaign verification (ERC-20 / ERC-721 rules). Requires SIWE JWT and Launch Hub eligibility.
   * Backend: POST /api/campaigns/:campaignId/onchain-verify
   */
  async verifyOnchainCampaign(campaignId, address) {
    const id = String(campaignId || "").trim();
    if (!id) {
      return { ok: false, code: "invalid_id", message: "Missing campaign id." };
    }
    try {
      const payload = await getJSON(`/api/campaigns/${encodeURIComponent(id)}/onchain-verify`, { method: "POST" }, address);
      const d = payload?.data;
      if (payload?.success && d?.ok) {
        return {
          ok: true,
          already: !!d.already,
          xp: d.xp,
          raw: payload,
        };
      }
      return {
        ok: false,
        code: d?.code ?? "unknown",
        message: payload?.message || d?.message || "Verification failed.",
        holdStartedAt: d?.holdStartedAt,
        raw: payload,
      };
    } catch (error) {
      return {
        ok: false,
        code: error?.body?.data?.code || "request_failed",
        message: error?.body?.message || error?.message || "Verification failed.",
        holdStartedAt: error?.body?.data?.holdStartedAt,
      };
    }
  },

  /** Pre-wallet: checks code and returns a short-lived proof JWT for POST /invite/redeem. */
  async validateInvite(code) {
    try {
      const response = await fetch(`${CAMPAIGN_API_URL}/api/campaigns/invite/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: String(code || "").trim() }),
      });
      let body = null;
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }
      if (!response.ok) {
        return {
          ok: false,
          message: body?.message || body?.error || "Invite validation failed.",
        };
      }
      const d = body?.data;
      if (!d?.proof || !d?.code) {
        return { ok: false, message: "Invalid server response." };
      }
      return { ok: true, code: d.code, proof: d.proof };
    } catch (error) {
      return {
        ok: false,
        message: error?.message || "Invite validation failed.",
      };
    }
  },

  async redeemInvite(address, code, proof) {
    try {
      const payload = await getJSON(
        "/api/campaigns/invite/redeem",
        {
          method: "POST",
          body: JSON.stringify({
            code: String(code || "").trim(),
            proof: String(proof || "").trim(),
          }),
        },
        address,
      );
      return { ok: true, data: payload?.data };
    } catch (error) {
      return {
        ok: false,
        message: error?.body?.message || error?.message || "Invite redemption failed.",
      };
    }
  },

  async getInviteHistory(address) {
    try {
      const payload = await getJSON("/api/campaigns/invite/history", undefined, address);
      return { ok: true, data: payload?.data };
    } catch (error) {
      return {
        ok: false,
        message: error?.body?.message || error?.message || "Could not load invite history.",
      };
    }
  },

  async rotateInviteBatch(address) {
    try {
      const payload = await getJSON("/api/campaigns/invite/rotate-batch", { method: "POST", body: "{}" }, address);
      return { ok: true, data: payload?.data };
    } catch (error) {
      return {
        ok: false,
        message: error?.body?.message || error?.message || "Could not mint a new invite batch.",
      };
    }
  },

  // X (Twitter) OAuth 2.0 — backend returns the authorize URL we redirect to.
  async getXOAuthUrl(address, opts = {}) {
    try {
      const payload = await getJSON(
        "/api/identity/x/oauth-url",
        undefined,
        address,
        opts,
      );
      return { ok: true, url: payload?.data?.url || null };
    } catch (error) {
      return {
        ok: false,
        status: error?.status,
        error: error?.body?.error || "request_failed",
        message: error?.body?.message || error.message,
      };
    }
  },

  // Discord OAuth — backend returns the authorize URL we redirect to.
  async getDiscordOAuthUrl(address, opts = {}) {
    try {
      const payload = await getJSON(
        "/api/identity/discord/oauth-url",
        undefined,
        address,
        opts,
      );
      return { ok: true, url: payload?.data?.url || null };
    } catch (error) {
      return {
        ok: false,
        status: error?.status,
        error: error?.body?.error || "request_failed",
        message: error?.body?.message || error.message,
      };
    }
  },

  // Telegram — Login Widget config + verify
  async getTelegramConfig() {
    try {
      const payload = await getJSON("/api/identity/telegram/config");
      return payload?.data || null;
    } catch (error) {
      return null;
    }
  },

  async verifyTelegramLogin(address, payload, opts = {}) {
    try {
      const res = await getJSON(
        "/api/identity/telegram/verify",
        { method: "POST", body: JSON.stringify(payload) },
        address,
        opts,
      );
      return { ok: !!res?.success, data: res?.data };
    } catch (error) {
      return {
        ok: false,
        status: error?.status,
        error: error?.body?.error || "request_failed",
        message: error?.body?.message || error.message,
      };
    }
  },

  /**
   * Re-check X follow (twitterapi.io), Discord guild, Telegram group vs Redis identity.
   * Call after user follows/joins; `force: true` bypasses bootstrap throttle entry.
   */
  async refreshSocialMembership(address, opts = {}) {
    try {
      const payload = await getJSON(
        "/api/identity/refresh-social",
        {
          method: "POST",
          body: JSON.stringify({
            force: opts.force !== false,
          }),
        },
        address,
        opts,
      );
      return { ok: !!payload?.success, data: payload?.data };
    } catch (error) {
      return {
        ok: false,
        status: error?.status,
        error: error?.body?.error || "request_failed",
        message: error?.body?.message || error.message,
      };
    }
  },
};
