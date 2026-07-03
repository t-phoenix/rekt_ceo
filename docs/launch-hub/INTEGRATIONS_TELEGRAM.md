# Telegram Integration

> **Telegram is OPTIONAL.** It is shown as an optional row in the Identity
> Stack and tagged `OPTIONAL` everywhere it appears. The Launch Hub gate
> does **not** block on Telegram — users without a Telegram account can
> still complete the gate by linking EVM + ≥ $10 on Base + X (with
> `@rekt_ceo` follow) + Discord (in Rekt server). Linking Telegram still
> earns task XP later in the season.

Telegram has the cleanest identity primitive of the three: the official
**Telegram Login Widget** signs the user's Telegram id with your bot token,
which the backend can verify deterministically. We use that for identity,
and a long-poll bot session for daily activity verification.

## Manual setup

### 1. Create the bot

1. Open Telegram, search for `@BotFather`.
2. `/newbot` → answer the prompts. Choose a name + username (`@RektCEOBot`).
3. Copy the **bot token**. This is `TELEGRAM_BOT_TOKEN`.

### 2. Configure the bot

Inside `@BotFather`:

```
/setdomain    @RektCEOBot   rekt.ceo
/setprivacy   @RektCEOBot   Disable
/setjoingroups @RektCEOBot  Enable
```

`setdomain` is required for the Telegram Login Widget to function on
`https://rekt.ceo` (and `https://www.rekt.ceo`). You can re-run with
multiple domains; BotFather appends them.

### 3. Add the bot to the Rekt Telegram group

1. Add `@RektCEOBot` to the public Rekt group.
2. Promote it to admin (Read messages + Add new admins as needed).
3. Capture the chat id:

```bash
# Send a message in the group, then:
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq
# Look for `chat.id` in the most recent message. Negative number for groups.
```

Set that as `TELEGRAM_CHAT_ID` in Render.

## Identity flow (live)

The Login Widget flow is wired today. Required env:

```
TELEGRAM_BOT_USERNAME=RektCEOBot   # no '@'; used to render the widget
TELEGRAM_BOT_TOKEN=<bot token>     # used to HMAC-verify the payload
TELEGRAM_CHAT_ID=<group chat id>   # optional — enables getChatMember check
```

1. Frontend calls `GET /api/identity/telegram/config` and renders the
   Telegram Login Widget for `data-telegram-login="<TELEGRAM_BOT_USERNAME>"`.
2. User clicks the widget. Telegram returns a signed payload to
   `window.__rektOnTelegramAuth(user)`:
   `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`.
3. Frontend POSTs the payload to `/api/identity/telegram/verify` with the
   wallet's bearer token.
4. Backend verifies HMAC: `secret = SHA-256(BOT_TOKEN)`,
   `hash = HMAC-SHA-256(secret, sorted-data-check-string)` and compares with
   `timingSafeEqual`. Rejects if `auth_date` is older than 24h.
5. If `TELEGRAM_CHAT_ID` is set, backend also calls
   `getChatMember(chat_id, user_id)` and rejects with 409 `NOT_IN_GROUP` if
   the user isn't a member.
6. Persist via `identityService.markLinked(addr, 'telegram', formatHandle(payload))`.

This is the most secure of the three identity flows because it gives us
cryptographic proof of Telegram id without OAuth.

## Daily Telegram task (planned)

The bot, running in long-poll mode (or webhook), watches `TELEGRAM_CHAT_ID`
for `gm` messages. Per UTC day, the first matching message from a Telegram
id we have linked credits a `telegram_gm` event.

```ts
// Pseudocode for the worker
bot.on('message', async (msg) => {
  if (msg.chat.id !== Number(process.env.TELEGRAM_CHAT_ID)) return;
  const text = (msg.text || '').toLowerCase();
  if (!text.includes('gm')) return;
  const tgId = msg.from.id;
  const address = await identityRepo.findAddressByTelegramId(tgId);
  if (!address) return;
  await xp.creditDailyOnce(address, 'telegram_gm', 5);
});
```

## Webhook vs long-poll

For Render Web Services, **webhook** is preferable:

```bash
curl -F "url=https://api.rekt.ceo/api/identity/telegram/webhook" \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
```

Render free tier sleeps inactive services. If you stay on free, use
long-poll from a separate worker (planned `automations/` package). On
Starter tier and above, webhook is fine.

## Failure modes

- **Wrong domain in setdomain** → Login Widget never injects an iframe and
  silently logs `Bot domain invalid` in the browser console. The Launch
  Hub now detects this 2 s after the script loads and shows an in-app
  fallback hint with the current `window.location.host`, telling the user
  to register that hostname via `@BotFather → /setdomain`. Telegram does
  **not** accept `localhost` or IP addresses — for local dev, tunnel via
  `ngrok http 3001` and register the `*.ngrok-free.app` host.
- **HMAC mismatch** → user tampered with widget payload, or bot token in
  env doesn't match the bot used to render the widget. Reject.
- **Bot kicked from group** → daily GM verification stops. Add it back; no
  data loss.

## Useful debug commands

```bash
# Inspect bot config
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Read latest updates (long-poll)
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates?timeout=10"

# Send a test message to confirm bot still in group
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=Rekt CEO bot is online ✓"
```
