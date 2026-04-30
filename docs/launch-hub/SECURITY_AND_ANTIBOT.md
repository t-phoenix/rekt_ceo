# Security and Anti-Bot Notes

The Launch Hub gates rewards behind organic-human signals. There is no
single defense; we layer cheap filters first, then expensive ones, then
delay XP credits to make farming uneconomic.

## Layer 1 — Wallet/Identity gating

- Primary EVM wallet must be SIWE-authenticated. JWTs expire (`JWT_EXPIRY`).
- Linked socials (X, Discord, Telegram) eventually require proof of control
  (X challenge tweet, Discord OAuth, Telegram Login Widget HMAC).
- Base balance gate: address must hold ≥ `BASE_BALANCE_THRESHOLD_USD` USD on
  Base. We sum USDC + ETH→USD via the Base RPC, cached for 30 minutes in
  `campaign:base_balance:<addr>`. This prevents "free wallet farms".

## Layer 2 — Action-level guards

- Daily endpoints are idempotent per UTC day per address. Implemented as a
  Redis SETEX key with 30h TTL. The endpoint refuses on hit.
- Each XP credit goes through a single `addXp(addr, amount, reason)` call
  that is the only writer to the leaderboard ZSETs and the per-user XP key.
- Rate limits are applied at the route level via `generalLimiter`,
  `authLimiter`, `mintLimiter` (existing middleware). The Launch Hub
  inherits `generalLimiter`.

## Layer 3 — Organic-X rule engine

The configurable preset (see `INTEGRATIONS_X.md` and `ADMIN_GUIDE.md`)
enforces:

- mention `@rekt_ceo`
- meme image required
- minimum friend tags
- required hashtags
- minimum account age (filters fresh sock-puppets)
- nonce phrase (proves the post is for *this* address, not recycled)
- delayed credit + minimum likes after 24h (filters dead accounts)
- max per day + decay curve (caps farming rewards)

Each rule is cheap to check and combined gives a high signal-to-noise ratio
without needing ML.

## Layer 4 — Trust score (planned)

Per address we compute a trust score from:

- Wallet on-chain history (age, txn count, ENS, native balance).
- Social link verification status (3 of 3 vs 0 of 3).
- Behavioral cadence (consistent daily activity vs bursty bot pattern).
- Network/graph signals (sybil clusters via shared device fingerprint,
  shared IP, near-identical post timing).

Trust score modifies:

- Daily spin weights (low trust → low odds of high-XP slices).
- Eligibility for high-value campaigns.
- Visibility on the leaderboard (low trust → suppressed from public).

Trust score is **not** a public number; we keep it server-side and use it
to adjust outcomes silently.

## Layer 5 — Snapshot integrity

- Season snapshots will be a Merkle tree over `{address, points}` taken at
  season end.
- Snapshot data is recomputed from the append-only ledger, not from current
  ZSET values, so a corrupted leaderboard cannot poison the snapshot.
- The Merkle root is published on-chain by the contracts repo. The XP-claim
  contract verifies inclusion proofs at claim time.

## What we deliberately do **not** do (yet)

- Captchas. They damage UX and bots solve them cheaply.
- KYC. Web3 audience hostile. Reserve for the Proof of Humanity hook below.
- IP geo-blocking. Rotates trivially with a VPN; not worth the false
  positives.

## Proof of Humanity hook

`identityService` exposes a `markLinked` API and an internal-only "trust
boosters" map. When a PoH provider is integrated (Worldcoin, BrightID,
Gitcoin Passport), we:

1. Add `POST /api/identity/poh/verify { proof }`.
2. On success, set a new `pohVerified` flag on the identity blob.
3. Bump trust score and unlock a new tier of perks.

We do **not** ship PoH today; the flag is reserved.

## Logging and observability

- Every XP credit appends to `campaign:ledger:<addr>` with `{ts, amount, reason}`.
- Add structured logs for:
  - daily claim attempts (allowed/denied)
  - identity link/unlink
  - admin layout/campaign/preset changes (planned: include caller IP)
- Metrics to instrument once we have a metrics stack:
  - `daily_checkin_claims_total{result}`
  - `daily_spin_claims_total{result}`
  - `xp_credited_total{reason}`
  - `identity_links_total{provider, result}`
  - `admin_writes_total{resource}`

## Incident playbook

| Symptom | Likely cause | Action |
|---|---|---|
| All admin calls 503 | `ADMIN_API_KEY` missing on backend | Set in Render env, redeploy. |
| Daily claims work twice in a day | Redis offline, in-memory fallback active | Check Redis dashboard, restart backend. |
| Leaderboard shows fallback data only | Empty ZSETs (fresh boot or KEYS cleared) | Expected on first run; populates as users earn XP. |
| User sees `baseBalanceEligible = false` despite holding USDC | Cached USD value is stale | Have the user click **RE-CHECK** on the eligibility banner. |
| X verifications never credit XP | Worker down or `TWITTERAPI_IO_KEY` missing | Confirm worker logs; rotate key if needed. |
