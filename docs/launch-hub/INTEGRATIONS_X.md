# X (Twitter) Integration

Identity verification for X uses **X OAuth 2.0 with PKCE** (the same shape as
Discord). Daily-mission scoring (likes, organic-content checks, hashtag /
mention enforcement) still calls out to [twitterapi.io](https://twitterapi.io)
for read-only data. Both legs are configured independently — you can ship the
identity flow before wiring up the read-side worker.

## What the OAuth flow proves

1. The connecting user controls the X account they're claiming.
2. The X handle (`username`) and immutable `id` are linked to their EVM wallet.
3. Whether the user follows `@rekt_ceo` (or whatever `X_FOLLOW_TARGET` you
   set) — checked via `/2/users/:id/following` using the user's freshly
   issued bearer token.

It does **not** post on behalf of the user — we never need that.

## Manual setup (X Developer Portal)

1. Go to <https://developer.twitter.com/> → **Projects & Apps** → create a
   project (or pick an existing one) and an app under it.
2. Open the app → **User authentication settings** → click **Set up**.
   - **App permissions**: Read.
   - **Type of App**:
     - **Web App, Automated App or Bot** → confidential client (recommended).
       You'll get both a `Client ID` and `Client Secret`.
     - **Native App** → public client. PKCE alone authenticates the
       request; leave `Client Secret` empty.
   - **Callback URI / Redirect URL**: must EXACTLY match `X_REDIRECT_URI`.
     For local dev: `http://127.0.0.1:3000/api/identity/x/callback`
     (X requires `127.0.0.1` instead of `localhost` on some account tiers).
   - **Website URL**: your site origin (e.g. `https://rekt.ceo`).
3. Copy the `Client ID` (and `Client Secret` if confidential) into the
   backend env:
   ```
   X_CLIENT_ID=...
   X_CLIENT_SECRET=...                 # leave blank for native (public) apps
   X_REDIRECT_URI=http://127.0.0.1:3000/api/identity/x/callback
   X_FOLLOW_TARGET=rekt_ceo            # without @
   ```
4. Restart the backend.

## What the backend does (live)

1. Frontend calls `GET /api/identity/x/oauth-url` (auth required). The backend
   - mints a PKCE `code_verifier` + SHA-256 `code_challenge`,
   - stashes the verifier in Redis (with in-memory fallback) keyed by an
     opaque `vid`,
   - signs `state = JWT({ address, vid, kind: "x-oauth" })` with a 10-minute
     expiry,
     - builds the authorize URL with
     `scope=tweet.read users.read follows.read offline.access users.email`
     (drop `users.email` by setting `X_REQUEST_EMAIL=false` if your X app
     doesn't have that scope approved yet) and returns it.
2. Frontend redirects the browser to `https://twitter.com/i/oauth2/authorize?...`.
3. User approves on X. X redirects back to
   `GET /api/identity/x/callback?code=...&state=...` (no auth — identity
   recovered from `state`).
4. Backend
   - verifies `state` JWT and recovers `(address, vid)`,
   - consumes the verifier from the cache (one-shot),
   - exchanges `code` + `code_verifier` for an access token at
     `POST /2/oauth2/token` (sends Basic auth when a secret is configured),
   - calls `GET /2/users/me?user.fields=username,name,confirmed_email` —
     when X grants `users.email` we capture the verified email as
     `xEmail` on the identity blob (so we can DM users about airdrops),
     and silently retry without `confirmed_email` if X rejects the field,
   - resolves `X_FOLLOW_TARGET` to a numeric id and calls
     `GET /2/users/:id/following` (paginated) to determine
     `xFollowsRektCeo` (`true` / `false` / `null` if scope was denied or
     rate-limited),
   - persists `xLinked = true`, `handles.x = "@<username>"`, `xId`,
     `xEmail` (best-effort), and `xFollowsRektCeo` on the identity blob,
   - redirects back to `${FRONTEND_URL}/launch?x=ok&handle=@username` (or
     `?x=fail&reason=…` on any failure mode).
5. The frontend Launch Hub reads the query params, shows a toast, and
   refreshes the bootstrap. The eligibility gate ungates X automatically
   if `xLinked && xFollowsRektCeo !== false`.

## Failure modes (browser banner reasons)

- `bad_state` — JWT failed verification or kind mismatch.
- `expired_state` — verifier was already consumed or has expired (>10 min).
- `missing_params` — X redirected without `code` or `state`.
- `exchange_failed` — token exchange rejected (most often: redirect URI
  mismatch in dev portal, or expired authorization code).
- `not_following` — auth succeeded, but the user doesn't follow
  `X_FOLLOW_TARGET`. We persist the link anyway and surface a "follow then
  re-link" prompt. The eligibility gate stays closed for this user.
- `access_denied` (X-side) — user clicked Cancel on the consent screen.

## Optional read-side adapter (twitterapi.io)

Used by the daily-mission verification worker, not by the identity flow.
It avoids needing to bump your X dev account into elevated tiers just for
read-side polling.

```
TWITTERAPI_IO_KEY=
```

When set, the worker calls:
- `/twitter/user/last_tweets` — find candidate posts for a verified user.
- `/twitter/user/info` — public profile (account age, etc.).
- relationship endpoints — fallback follow check when the OAuth token has
  expired.

## Daily X mission (organic-only enforcement)

When a user clicks **POST TO X** on the Launch Hub, we open the X intent. We
do not yet credit XP; instead the verification worker (planned) will:

1. Call twitterapi.io: search recent posts matching the configured rule preset.
2. For each candidate post by the verified user, evaluate every rule from
   the preset configured for the campaign:
   - mention `@rekt_ceo`
   - meme image attached (`media_count >= 1`)
   - at least N friend tags (`@handle` mentions other than `@rekt_ceo`)
   - includes all required hashtags
   - account age ≥ `minAccountAgeDays`
   - includes the user's daily nonce phrase (`xTaskRules.noncePhrase`)
3. Wait `delayBeforeCreditMinutes`. Re-fetch the post.
4. If `likes >= minLikesAfter24h`, credit XP via
   `addXp(addr, amount, 'x_daily_share')`.
5. Apply `maxPerDay` cap and `decayCurveEnabled` (diminishing reward
   across the day).

The presets live in `campaign:rules:x_presets` and are configurable in the
admin UI. The default presets are seeded by `campaign.service.ts`.

## Quotas and cost

- twitterapi.io bills per request. Cache aggressively:
  - Profile lookups: 1 hour TTL.
  - Tweet engagement: 5 minute TTL.
  - Search by user: only run within the verification window.
- X OAuth itself is free, but `/2/users/:id/following` has a tighter
  rate limit (15 req / 15 min on Free tier). We treat any non-200 from the
  follow check as `null` and surface a `FOLLOW CHECK SKIPPED` chip rather
  than blocking the user.
- Configure per-address daily caps via `maxPerDay` to prevent runaway costs.
