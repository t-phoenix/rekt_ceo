import crypto from 'crypto';
import { AppError } from '../types';
import { logger } from '../utils/logger';

const TWITTERAPI_IO_BASE = 'https://api.twitterapi.io';
const X_AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_API_BASE = 'https://api.twitter.com/2';

interface XOAuthTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
  scope: string;
}

interface XUser {
  id: string;
  name: string;
  username: string;
  // Some X account tiers / scope combos return `confirmed_email` on /2/users/me.
  // It's only present when the app is approved for the `users.email` scope and
  // the user consents. We treat it as best-effort — never block on its
  // absence.
  confirmed_email?: string | null;
}

/**
 * Thin wrapper around twitterapi.io.
 *
 * Why twitterapi.io: avoids needing a paid X developer account.
 * Auth: a single `X-API-Key` header.
 *
 * NOTE: response shape can vary slightly between endpoints. We defensively
 * extract `tweets` from a few possible field names.
 */
class TwitterService {
  private get key(): string {
    return process.env.TWITTERAPI_IO_KEY || '';
  }

  // ── X OAuth 2.0 (PKCE) ────────────────────────────────────────────────

  private clientId(): string { return process.env.X_CLIENT_ID || ''; }
  private clientSecret(): string { return process.env.X_CLIENT_SECRET || ''; }

  redirectUri(): string {
    return process.env.X_REDIRECT_URI || 'http://127.0.0.1:3000/api/identity/x/callback';
  }

  /**
   * Whether the X OAuth flow is configured (ready to handle Connect-X clicks).
   * `CLIENT_SECRET` is optional — for native (public) clients we rely on PKCE.
   */
  isOAuthConfigured(): boolean {
    return !!this.clientId();
  }

  /**
   * Generate a PKCE code_verifier (43–128 URL-safe chars).
   * https://datatracker.ietf.org/doc/html/rfc7636#section-4.1
   */
  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /** code_challenge = BASE64URL(SHA256(verifier)). */
  codeChallengeFromVerifier(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Build the authorize URL for X OAuth 2.0 with PKCE.
   * `state` is the signed wallet-binding token; the verifier is stored
   * server-side (Redis / in-memory) keyed by a separate cache id we put in
   * the JWT claims so the callback can find it again.
   */
  buildAuthorizeUrl(state: string, codeChallenge: string): string {
    if (!this.isOAuthConfigured()) {
      throw new AppError(503, 'X OAuth not configured (set X_CLIENT_ID).');
    }
    // `users.email` is X's newer scope (added 2024-12). Apps that don't have
    // it approved will just ignore it during the authorize step — they won't
    // reject the whole request, so it's safe to always include.
    const baseScopes = 'tweet.read users.read follows.read offline.access';
    const requestEmail = (process.env.X_REQUEST_EMAIL || 'true').toLowerCase() !== 'false';
    const scope = requestEmail ? `${baseScopes} users.email` : baseScopes;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${X_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization `code` for an access token.
   * Confidential clients (X "Web App" type) MUST send Basic auth.
   * Public clients (Native App) omit the secret and rely on PKCE alone.
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<XOAuthTokenResponse> {
    if (!this.isOAuthConfigured()) throw new AppError(503, 'X OAuth not configured');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
      code_verifier: codeVerifier,
      client_id: this.clientId(),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (this.clientSecret()) {
      const basic = Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    }

    const res = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers,
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn('X token exchange failed', { status: res.status, body: text.slice(0, 200) });
      throw new AppError(res.status, `X token exchange failed: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<XOAuthTokenResponse>;
  }

  /**
   * GET /2/users/me — returns id, name, username and (when the
   * `users.email` scope was approved + granted) `confirmed_email`.
   */
  async getMe(accessToken: string): Promise<XUser> {
    const res = await fetch(
      `${X_API_BASE}/users/me?user.fields=username,name,confirmed_email`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const text = await res.text();
      logger.warn('X /users/me failed', { status: res.status, body: text.slice(0, 200) });
      // Some apps don't have `users.email` approved — retry without it.
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        const retry = await fetch(
          `${X_API_BASE}/users/me?user.fields=username,name`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (retry.ok) {
          const j: any = await retry.json();
          if (j?.data?.id) return j.data as XUser;
        }
      }
      throw new AppError(res.status, 'X /users/me failed');
    }
    const json: any = await res.json();
    if (!json?.data?.id) throw new AppError(502, 'X /users/me returned no user');
    return json.data as XUser;
  }

  /**
   * Check whether the OAuth'd source user follows `targetUserId` using the
   * authenticated bearer token (which has `follows.read`). Returns:
   *   true | false   on success
   *   null           when the lookup is unavailable (rate limit, scope, etc.)
   */
  async checkFollowsViaOAuth(
    accessToken: string,
    sourceUserId: string,
    targetUserId: string,
  ): Promise<boolean | null> {
    try {
      let url =
        `${X_API_BASE}/users/${encodeURIComponent(sourceUserId)}/following` +
        `?user.fields=username&max_results=1000`;
      // Paginate until we either find the target or run out of pages.
      // Most degens follow well under 1k accounts so this is usually one call.
      for (let safety = 0; safety < 5; safety += 1) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          logger.warn('X following lookup failed', { status: res.status });
          return null;
        }
        const json: any = await res.json();
        const arr: any[] = Array.isArray(json?.data) ? json.data : [];
        if (arr.some((u) => u?.id === targetUserId)) return true;
        const next = json?.meta?.next_token;
        if (!next) return false;
        url =
          `${X_API_BASE}/users/${encodeURIComponent(sourceUserId)}/following` +
          `?user.fields=username&max_results=1000&pagination_token=${encodeURIComponent(next)}`;
      }
      return null;
    } catch (error) {
      logger.warn('X following lookup error', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Resolve a username (no @) to its X user id via /2/users/by/username/:username.
   * Used to resolve the X_FOLLOW_TARGET ('rekt_ceo') to its numeric id once
   * per process; we cache it in memory.
   */
  private targetIdCache: { username: string; id: string } | null = null;
  async resolveUserIdByUsername(accessToken: string, username: string): Promise<string | null> {
    const handle = username.replace(/^@/, '');
    if (this.targetIdCache && this.targetIdCache.username === handle) {
      return this.targetIdCache.id;
    }
    try {
      const res = await fetch(
        `${X_API_BASE}/users/by/username/${encodeURIComponent(handle)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;
      const json: any = await res.json();
      const id = json?.data?.id ? String(json.data.id) : null;
      if (id) this.targetIdCache = { username: handle, id };
      return id;
    } catch (error) {
      logger.warn('X resolveUserIdByUsername failed', { error: (error as Error).message });
      return null;
    }
  }

  // ── twitterapi.io (read-only side channel for daily-mission worker) ───

  isConfigured(): boolean {
    return !!this.key;
  }

  private async request<T>(path: string): Promise<T> {
    if (!this.key) {
      throw new AppError(503, 'twitterapi.io is not configured (TWITTERAPI_IO_KEY missing)');
    }
    const res = await fetch(`${TWITTERAPI_IO_BASE}${path}`, {
      headers: { 'X-API-Key': this.key },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn('twitterapi.io error', { status: res.status, path, body: text.slice(0, 200) });
      throw new AppError(res.status, `twitterapi.io error: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async getUserInfo(userName: string) {
    const handle = userName.replace(/^@/, '');
    return this.request<any>(`/twitter/user/info?userName=${encodeURIComponent(handle)}`);
  }

  async getLastTweets(userName: string) {
    const handle = userName.replace(/^@/, '');
    return this.request<any>(`/twitter/user/last_tweets?userName=${encodeURIComponent(handle)}`);
  }

  /** Normalized tweet list from last_tweets API (shape varies by version). */
  extractTweetArray(resMeta: any): any[] {
    if (!resMeta || typeof resMeta !== 'object') return [];
    const candidates: any[] =
      resMeta?.tweets ||
      resMeta?.data?.tweets ||
      resMeta?.data ||
      resMeta?.last_tweets ||
      resMeta?.results ||
      [];
    return Array.isArray(candidates) ? candidates : [];
  }

  async listRecentTweets(userName: string): Promise<any[]> {
    const raw = await this.getLastTweets(userName);
    return this.extractTweetArray(raw);
  }

  /**
   * Try to find a tweet from `userName` that contains `nonce` (case-insensitive).
   * Returns the matching tweet object or null.
   */
  async findTweetWithNonce(userName: string, nonce: string) {
    const candidates = await this.listRecentTweets(userName);
    const needle = nonce.toLowerCase();
    return (
      candidates.find((t: any) => {
        const text: string = t?.text || t?.full_text || t?.content || '';
        return typeof text === 'string' && text.toLowerCase().includes(needle);
      }) || null
    );
  }

  /**
   * Best-effort: does `sourceUserName` follow `targetUserName`?
   *
   * Returns:
   *   - `true`  → confirmed follow
   *   - `false` → confirmed not following
   *   - `null`  → unknown (API not configured, endpoint failed, or shape unrecognised).
   *               Caller should treat this as "skip / mark unknown" and not block the user
   *               on a transient infra problem.
   *
   * twitterapi.io has changed endpoint shapes a few times. We try a couple of
   * known paths and parse a handful of response shapes.
   */
  async checkFollows(sourceUserName: string, targetUserName: string): Promise<boolean | null> {
    if (!this.key) return null;
    const source = sourceUserName.replace(/^@/, '');
    const target = targetUserName.replace(/^@/, '');

    const paths = [
      `/twitter/user/check_follow_relationship?source_user_name=${encodeURIComponent(source)}&target_user_name=${encodeURIComponent(target)}`,
      `/twitter/user/relationship?source_user_name=${encodeURIComponent(source)}&target_user_name=${encodeURIComponent(target)}`,
      `/twitter/user/is_following?source_user_name=${encodeURIComponent(source)}&target_user_name=${encodeURIComponent(target)}`,
    ];

    for (const path of paths) {
      try {
        const res = await fetch(`${TWITTERAPI_IO_BASE}${path}`, {
          headers: { 'X-API-Key': this.key },
        });
        if (!res.ok) continue;
        const json: any = await res.json();
        const parsed = this.parseFollowingFlag(json);
        if (parsed !== null) return parsed;
      } catch (error) {
        logger.warn('twitterapi.io follow probe failed', {
          path,
          error: (error as Error).message,
        });
      }
    }
    return null;
  }

  private parseFollowingFlag(json: any): boolean | null {
    if (!json || typeof json !== 'object') return null;
    if (typeof json.is_following === 'boolean') return json.is_following;
    if (typeof json.following === 'boolean') return json.following;
    if (typeof json.is_followed_by_source === 'boolean') return json.is_followed_by_source;
    if (typeof json?.data?.following === 'boolean') return json.data.following;
    if (typeof json?.data?.is_following === 'boolean') return json.data.is_following;
    if (typeof json?.source_to_target?.following === 'boolean') return json.source_to_target.following;
    if (typeof json?.relationship?.source?.following === 'boolean') return json.relationship.source.following;
    return null;
  }
}

export const twitterService = new TwitterService();
