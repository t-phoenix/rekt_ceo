# Environment Variables — Launch Hub Additions

Existing variables (chain, contracts, Pinata, JWT, CORS, Redis) keep their
current meanings. The new keys below are required to fully enable the Launch
Hub. Where a value is marked **secret**, set it via the Render Dashboard
(Environment → Add Environment Variable) or your secret manager.

## rekt_backend

| Key | Required | Default | Notes |
|---|---|---|---|
| `ADMIN_API_KEY` | yes (for admin) | _none_ | Shared secret for `x-admin-key`. **Generate with `openssl rand -hex 32`.** Without it `/api/admin/*` returns 503. |
| `BASE_RPC_URL` | recommended | `https://mainnet.base.org` | Base mainnet RPC for the wallet eligibility gate. Use Alchemy/QuickNode in production. |
| `BASE_BALANCE_THRESHOLD_USD` | no | `10` | USD threshold to mark a wallet `baseBalanceEligible`. Whether this check actually blocks the gate is controlled by the **admin Gate Config** (see `ADMIN_GUIDE.md` → Gate Config). Default ships as **OPTIONAL** so the launch hub does not soft-lock degens during early access. |
| `ETH_PRICE_USD_FALLBACK` | no | `3000` | Used to convert native ETH → USD when no oracle is wired. Replace with Chainlink/Pyth call before mainnet GA. |
| `FRONTEND_URL` | yes (X / Discord OAuth) | _first `CORS_ORIGIN`_ | Where the X and Discord OAuth callbacks redirect the browser back to (e.g. `https://www.rektceo.club`). Defaults to the first comma-separated `CORS_ORIGIN`. |
| `X_CLIENT_ID` | yes for X identity | _none_ | OAuth 2.0 client id from the X developer portal. |
| `X_CLIENT_SECRET` | optional | _none_ | OAuth 2.0 client secret. **Secret.** Required for "Web App" (confidential) clients; leave blank for "Native App" (public) clients — PKCE alone authenticates the request. |
| `X_REDIRECT_URI` | yes for X identity | `http://127.0.0.1:3000/api/identity/x/callback` | Must EXACTLY match the callback URI registered on the app in the X dev portal. X requires `127.0.0.1` instead of `localhost` on some account tiers. |
| `X_REQUEST_EMAIL` | no | `true` | When truthy, the X authorize URL also asks for `users.email` (added 2024-12). The backend reads `confirmed_email` from `/2/users/me` and persists it as `xEmail`. Set `false` if your X app doesn't have that scope approved yet (avoids users seeing it in the consent screen). |
| `TWITTERAPI_IO_KEY` | optional | _none_ | API key from <https://twitterapi.io>. Used by the daily-mission verification worker for read-side scoring (likes, hashtag enforcement, account-age checks). The identity flow itself does NOT depend on this key. |
| `X_FOLLOW_TARGET` | no | `rekt_ceo` | Handle (without `@`) the verifier checks the user follows. Resolved to a numeric id once per process and queried via `/2/users/:id/following`. If `follows.read` is denied or rate-limited we mark the check as "unknown" rather than blocking. |
| `DISCORD_CLIENT_ID` | yes for Discord OAuth | _none_ | OAuth2 client id from the Discord dev portal. |
| `DISCORD_CLIENT_SECRET` | yes for Discord OAuth | _none_ | OAuth2 client secret. **Secret.** |
| `DISCORD_REDIRECT_URI` | yes for Discord OAuth | _none_ | The exact callback URL registered in the Discord dev portal. Accepts a bare URL or the full authorize URL — backend extracts the inner `redirect_uri` if you paste the latter. |
| `DISCORD_BOT_TOKEN` | optional | _none_ | If set together with `DISCORD_GUILD_ID`, backend additionally probes guild membership during OAuth callback. |
| `DISCORD_GUILD_ID` | optional | _none_ | Guild ID for the Rekt Discord. Pair with `DISCORD_BOT_TOKEN`. |
| `TELEGRAM_BOT_USERNAME` | optional | _none_ | Bot username (no `@`). Frontend uses this to render the Login Widget. Whether Telegram is required is admin-controlled via **Gate Config** (`telegramLinked`/`telegramInGroup`). Default ships as OPTIONAL. |
| `TELEGRAM_BOT_TOKEN` | optional | _none_ | Bot token from `@BotFather`. Used to HMAC-verify Login Widget payloads. |
| `TELEGRAM_CHAT_ID` | optional | _none_ | When set, backend additionally calls `getChatMember` during verify. |
| `DATABASE_URL` | not yet | _none_ | Reserved for the upcoming Postgres migration. See `DATABASE.md`. |

### Existing keys still required

`PORT`, `NODE_ENV`, `CHAIN_ID`, `RPC_URL`, `RPC_URL_FALLBACK`,
`BACKEND_PRIVATE_KEY`, `MINTER_CONTRACT_ADDRESS`, `PFP_COLLECTION_ADDRESS`,
`MEME_COLLECTION_ADDRESS`, `CEO_TOKEN_ADDRESS`, `PINATA_JWT`,
`PINATA_GATEWAY`, `JWT_SECRET`, `JWT_EXPIRY`, `CORS_ORIGIN`, `REDIS_URL`,
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `LOG_LEVEL`.

## rekt_website

| Key | Required | Default | Notes |
|---|---|---|---|
| `REACT_APP_BACKEND_API_URL` | recommended | `http://localhost:3000` | Backend base URL. In production set to `https://api.rekt.ceo` or whatever your Render service URL is. |

The website also reads existing `REACT_APP_*` keys for AppKit / WalletConnect.
Those are unchanged.

## rekt_admin

| Key | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_URL` | recommended | `http://localhost:3000` | Same backend used by the website. Do **not** add a trailing `/` — combined with `/api/...` paths it becomes `//api/...` and Express returns `Cannot GET //api/...` (fixed in code by normalizing the base URL, but still avoid slashes for clarity). |
| `VITE_ADMIN_API_KEY` | no | _none_ | Optional convenience: same value as backend `ADMIN_API_KEY`. Without the `VITE_` prefix, a variable **is not visible** to Vite/React in the browser — `ADMIN_API_KEY` alone in `.env` does nothing. When set, the admin app seeds `localStorage` once if empty; operators can still paste/rotate via the Campaigns yellow bar. **Do not ship this to a public CDN** if your build bundles the secret; use only in local/staging or rely on manual paste. |

Admin key is normally entered at runtime via the Campaigns page yellow bar and
stored in `localStorage` as `rekt_admin_key`. Rotate it on the backend and
operators paste the new value (or clear `localStorage` and rely on
`VITE_ADMIN_API_KEY` again if configured).

## How to obtain each secret

| Secret | Where to get it |
|---|---|
| `ADMIN_API_KEY` | `openssl rand -hex 32` (or `pwgen 64`). Treat like a password. |
| Base RPC URL | <https://www.alchemy.com/base> or <https://www.quicknode.com/chains/base>. |
| `TWITTERAPI_IO_KEY` | Sign up at <https://twitterapi.io>. They support read-only X data without an X dev account. See `INTEGRATIONS_X.md`. |
| Discord bot | Create an application at <https://discord.com/developers/applications> → Bot tab → Reset Token. See `INTEGRATIONS_DISCORD.md`. |
| Telegram bot | Talk to <https://t.me/BotFather>, `/newbot`, copy the token. See `INTEGRATIONS_TELEGRAM.md`. |

## Secret hygiene

- Never commit `.env` files; only `.env.example` is tracked.
- Rotate `JWT_SECRET` and `ADMIN_API_KEY` together if either leaks. Rotating
  `JWT_SECRET` invalidates all existing user sessions.
- For Render, prefer `sync: false` envVars (already configured in
  `rekt_backend/render.yaml`) so values stay in the dashboard, not in git.
