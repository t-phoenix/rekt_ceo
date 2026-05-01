import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger';

export interface TelegramLoginPayload {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

/**
 * Telegram identity adapter.
 *
 * Identity primitive: Telegram Login Widget.
 * The widget hands the frontend a signed payload. We re-compute HMAC-SHA-256
 * with `secret = SHA-256(BOT_TOKEN)` over the alphabetically-sorted fields
 * (excluding `hash`) joined as `key=value\n…`.
 *
 * We additionally verify chat membership against TELEGRAM_CHAT_ID when both
 * the bot token and chat id are configured.
 *
 * For setup steps see `docs/launch-hub/INTEGRATIONS_TELEGRAM.md`.
 */
class TelegramService {
  private botToken() { return process.env.TELEGRAM_BOT_TOKEN || ''; }
  private chatId() { return process.env.TELEGRAM_CHAT_ID || ''; }

  /**
   * Login Widget expects the bot username only (letters, digits, underscore), no `@`.
   * Empty TELEGRAM_BOT_USERNAME with token set yields Telegram iframe "Username Invalid".
   */
  botUsername(): string {
    const raw = (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@+/, '');
    return raw;
  }

  isConfigured(): boolean {
    return !!this.botToken() && this.botUsername().length >= 3;
  }

  verifyLoginPayload(payload: Record<string, any>): { ok: boolean; reason?: string } {
    const token = this.botToken();
    if (!token) return { ok: false, reason: 'TELEGRAM_BOT_TOKEN missing' };
    const { hash, ...rest } = payload;
    if (!hash || typeof hash !== 'string') return { ok: false, reason: 'missing_hash' };

    const dataCheckString = Object.keys(rest)
      .filter((k) => rest[k] !== undefined && rest[k] !== null)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join('\n');

    const secretKey = createHash('sha256').update(token).digest();
    const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    let equal = false;
    try {
      const a = Buffer.from(hash, 'hex');
      const b = Buffer.from(computed, 'hex');
      equal = a.length === b.length && timingSafeEqual(a, b);
    } catch {
      equal = false;
    }

    if (!equal) return { ok: false, reason: 'bad_signature' };

    const authDate = Number(rest.auth_date) || 0;
    const drift = Math.floor(Date.now() / 1000) - authDate;
    if (drift > 86_400) return { ok: false, reason: 'expired_payload' };

    return { ok: true };
  }

  async isMember(userId: number | string): Promise<boolean | null> {
    if (!this.botToken() || !this.chatId()) return null;
    try {
      const url = `https://api.telegram.org/bot${this.botToken()}/getChatMember?chat_id=${encodeURIComponent(this.chatId())}&user_id=${encodeURIComponent(String(userId))}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: any = await res.json();
      if (!json?.ok) return false;
      const status = json?.result?.status;
      if (!status) return false;
      return !['left', 'kicked'].includes(status);
    } catch (error) {
      logger.warn('Telegram getChatMember error', { error: (error as Error).message });
      return null;
    }
  }

  formatHandle(payload: TelegramLoginPayload): string {
    if (payload.username) return `@${payload.username}`;
    const parts = [payload.first_name, payload.last_name].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return `tg:${payload.id}`;
  }
}

export const telegramService = new TelegramService();
