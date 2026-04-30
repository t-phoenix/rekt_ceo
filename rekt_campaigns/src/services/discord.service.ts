import { AppError } from '../types';
import { logger } from '../utils/logger';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string | null;
  email?: string | null;
  verified?: boolean;
}

/**
 * Discord identity adapter.
 *
 * Two legs of the integration:
 *   1) OAuth2 (identify scope) → proves the user controls the Discord account.
 *   2) Bot membership check (Bot token) → proves they joined the Rekt CEO guild.
 *
 * For a step-by-step setup walkthrough see `docs/launch-hub/INTEGRATIONS_DISCORD.md`.
 */
class DiscordService {
  private clientId() { return process.env.DISCORD_CLIENT_ID || ''; }
  private clientSecret() { return process.env.DISCORD_CLIENT_SECRET || ''; }
  private botToken() { return process.env.DISCORD_BOT_TOKEN || ''; }
  private guildId() { return process.env.DISCORD_GUILD_ID || ''; }

  /**
   * Allow either a bare callback URL or the full OAuth2 authorize URL with
   * `redirect_uri` embedded (some users paste that from the Discord dev portal).
   */
  redirectUri(): string {
    const raw = process.env.DISCORD_REDIRECT_URI || '';
    if (!raw) return 'http://localhost:3000/api/identity/discord/callback';
    try {
      const url = new URL(raw);
      const inner = url.searchParams.get('redirect_uri');
      if (inner) return decodeURIComponent(inner);
      return raw;
    } catch {
      return raw;
    }
  }

  isConfigured(): boolean {
    return !!(this.clientId() && this.clientSecret());
  }

  buildAuthorizeUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new AppError(503, 'Discord OAuth not configured (set DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET)');
    }
    const params = new URLSearchParams({
      client_id: this.clientId(),
      response_type: 'code',
      redirect_uri: this.redirectUri(),
      // identify = id + username, guilds = list of guild memberships,
      // email = email + verified flag (degrades silently if user denies).
      scope: 'identify guilds email',
      state,
      prompt: 'consent',
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    if (!this.isConfigured()) throw new AppError(503, 'Discord OAuth not configured');
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
    });
    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn('Discord token exchange failed', { status: res.status, body: text.slice(0, 200) });
      throw new AppError(res.status, 'Discord token exchange failed');
    }
    return res.json() as Promise<DiscordTokenResponse>;
  }

  async getMe(accessToken: string): Promise<DiscordUser> {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new AppError(res.status, 'Discord /users/@me failed');
    return res.json() as Promise<DiscordUser>;
  }

  /**
   * Returns:
   *   true  → user is a member of the configured guild.
   *   false → bot token + guild are configured but user is NOT a member.
   *   null  → bot/guild not configured (skip the check).
   */
  async isMember(userId: string): Promise<boolean | null> {
    if (!this.botToken() || !this.guildId()) return null;
    try {
      const res = await fetch(
        `https://discord.com/api/guilds/${this.guildId()}/members/${userId}`,
        { headers: { Authorization: `Bot ${this.botToken()}` } },
      );
      if (res.status === 404) return false;
      if (!res.ok) {
        logger.warn('Discord guild member lookup failed', { status: res.status });
        return null;
      }
      return true;
    } catch (error) {
      logger.warn('Discord guild member lookup error', { error: (error as Error).message });
      return null;
    }
  }

  formatHandle(user: DiscordUser): string {
    if (user.global_name) return user.global_name;
    if (user.discriminator && user.discriminator !== '0') {
      return `${user.username}#${user.discriminator}`;
    }
    return `@${user.username}`;
  }
}

export const discordService = new DiscordService();
