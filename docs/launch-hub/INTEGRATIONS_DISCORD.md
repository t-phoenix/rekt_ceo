# Discord Integration

Discord verification is a two-leg integration:

1. **OAuth2** — confirm the user controls a Discord account and capture the
   Discord user id.
2. **Bot membership check** — confirm that user is in the Rekt Discord and
   optionally has a specific role.

Both legs are required to mark `discordLinked = true`.

## Manual setup

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications>.
2. **New Application** → name it `Rekt CEO Identity`.
3. Tab **OAuth2 → General**:
   - Add redirect URI(s):
     - `https://api.rekt.ceo/api/identity/discord/callback`
     - `http://localhost:3000/api/identity/discord/callback` (dev)
   - Copy **Client ID** and **Client Secret**.
4. Tab **Bot**:
   - Click **Reset Token**, copy the token. **This is the bot token.**
   - Privileged Gateway Intents: enable **Server Members Intent**.
   - Save.

### 2. Invite the bot to your server

Use this URL pattern, replacing `CLIENT_ID`:

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=66560&scope=bot%20applications.commands
```

The bot needs at minimum: `View Channels`, `Read Message History`, and
`Manage Roles` (only if you want it to grant a "Verified" role).

### 3. Capture the Guild ID

Discord → User Settings → Advanced → **Developer Mode = ON**. Then right
click your server icon → Copy ID. This is `DISCORD_GUILD_ID`.

### 4. Set env vars

In `rekt_backend/.env` (and on Render):

```
DISCORD_CLIENT_ID=<client id>
DISCORD_CLIENT_SECRET=<client secret>
DISCORD_REDIRECT_URI=http://localhost:3000/api/identity/discord/callback
DISCORD_BOT_TOKEN=<bot token>      # optional — enables guild membership probe
DISCORD_GUILD_ID=<guild id>        # optional, paired with BOT_TOKEN
FRONTEND_URL=http://localhost:3001 # where backend redirects after callback
```

`DISCORD_REDIRECT_URI` accepts either the bare callback URL or the full
authorize URL with `redirect_uri` embedded — the backend extracts the inner
value if you pasted the latter from the dev portal.

## Identity flow (live)

1. User clicks **CONNECT** on the Discord row.
2. Frontend `GET /api/identity/discord/oauth-url` (auth required) — backend
   returns a Discord authorize URL with `state = jwt({address, kind:"discord-oauth"}, "10m")`.
3. Frontend `window.location.href = url`.
4. Discord redirects back to `/api/identity/discord/callback?code=…&state=…`.
5. Backend:
   - verifies `state` JWT,
   - exchanges `code` for an access token (`POST oauth2/token`),
   - fetches `/users/@me` (scopes requested: `identify guilds email`),
   - if `DISCORD_BOT_TOKEN` + `DISCORD_GUILD_ID` are set, calls `GET guilds/{id}/members/{user.id}`
     to confirm guild membership,
   - persists `discordLinked = true`, `discordId = user.id`,
     `discordEmail = user.email` (when granted by the user),
     `discordEmailVerified = user.verified`, and `discordInGuild = …`,
   - calls `identityService.markLinked(addr, 'discord', formatHandle(user))`.
6. Backend redirects to `${FRONTEND_URL}/launch?discord=ok&handle=…` (or
   `?discord=fail&reason=…`). The frontend renders a banner from the query.

The `state` JWT is short-lived (10m) and can't be reused.

## Solo-test it locally

```bash
# Get an auth URL with a real wallet token
TOKEN=$(localStorage.getItem('authToken_<addr>'))
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/identity/discord/oauth-url

# Open the returned `data.url` in a browser, click Authorize, and watch the
# backend logs — the callback prints `Discord linked` on success.
```

## Daily Discord tasks (planned)

The verification worker tails the Rekt guild's `#gm` channel via the bot's
gateway connection. For each message:

- If author Discord id maps to a known address → record a `discord_gm`
  event for that address.
- The XP engine credits `discord_gm` once per UTC day per address.

Bot intents required: `MESSAGE_CONTENT` and `GUILD_MESSAGES`. Note that
`MESSAGE_CONTENT` is privileged and requires Discord to approve your app
once you cross 100 servers — single-server use is unrestricted.

## Failure modes

- **User not in guild** → mark `discordLinked = false`, surface "Join the
  Rekt Discord" CTA in the IdentityChecklistBlock.
- **Bot offline** → gateway reconnects automatically; pending verifications
  retry on next session start.
- **OAuth callback CSRF** → always validate `state` matches the user's JWT.

## Useful debug commands

```bash
# Confirm bot can see the guild
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  "https://discord.com/api/v10/guilds/$DISCORD_GUILD_ID"

# List recent members (paginated)
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  "https://discord.com/api/v10/guilds/$DISCORD_GUILD_ID/members?limit=10"
```
