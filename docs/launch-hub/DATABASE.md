# Data Storage — Today (Redis) and Tomorrow (Postgres)

## Today: Redis-only

All Launch Hub state lives in Redis. We use this footprint:

```
campaign:layout:launch_hub                  string  → JSON (LaunchHubLayout)
campaign:list                               string  → JSON CampaignDef[]
campaign:rules:x_presets                    string  → JSON XRulePreset[]
campaign:identity:<addr>                    string  → JSON Identity
campaign:xp:<addr>                          string  → JSON {lifetime, season, level, nextLevelAt}
campaign:ledger:<addr>                      list    → JSON {ts, amount, reason} (LPUSH, capped 50)
campaign:invite:<addr>                      string  → JSON {code}
campaign:invite:code:<CODE>                 string  → addr (lowercased)
campaign:daily:<addr>:<YYYY-MM-DD>:checkin  string  → "1" (TTL 30h)
campaign:daily:<addr>:<YYYY-MM-DD>:spin     string  → "1" (TTL 30h)
campaign:streak:<addr>                      string  → JSON {count, lastDate}
campaign:base_balance:<addr>                string  → JSON {usd, eligible, ts} (TTL 30m)
campaign:leaderboard:season                 zset    → score=XP, member=addr (lowercased)
campaign:leaderboard:lifetime               zset    → score=XP, member=addr
```

Conventions:

- Addresses are stored **lowercased** (we never trust mixed case).
- Daily keys use **UTC date strings** (`new Date().toISOString().slice(0,10)`).
  This means a "day" rolls at 00:00 UTC. If you want local-time rollover you
  must change `todayKey()` in `campaign.service.ts` and document the choice.
- The TTL on daily keys is `60 * 60 * 30` (30h) which gives leeway for users
  on slow networks claiming around midnight.
- `campaign:base_balance:<addr>` is a 30-minute cache to limit RPC calls.

### Graceful degradation

`campaign.service.ts` wraps every Redis call in `withRedis(fn, fallback)`. When
Redis is unreachable:

- Reads return defaults baked into the service (default layout, default
  campaigns, default presets, empty leaderboard fallback).
- Writes are kept in an in-process `Map` so the same Express instance keeps
  working until Redis is restored.
- Daily TTLs cannot be enforced without Redis, so the in-memory mode allows
  the user to claim again after a restart. This is acceptable for an outage
  window; not for normal operation.

### Backup / inspection

- Render's managed Redis exposes a `redis-cli` URL in the dashboard.
- Useful queries:

```bash
# Inspect layout
redis-cli -u "$REDIS_URL" GET campaign:layout:launch_hub | jq

# Top 25 of season leaderboard
redis-cli -u "$REDIS_URL" ZREVRANGE campaign:leaderboard:season 0 24 WITHSCORES

# All daily checkin keys for an address (today)
redis-cli -u "$REDIS_URL" KEYS "campaign:daily:0xabc...:*"

# Wipe Organic-X presets to fall back to defaults
redis-cli -u "$REDIS_URL" DEL campaign:rules:x_presets
```

### Local Redis quickstart

```bash
cd rekt_backend
docker compose up -d redis
docker exec -it rekt_redis redis-cli ping        # → PONG
docker exec -it rekt_redis redis-cli keys 'campaign:*'

# Snapshot for backup
docker exec -it rekt_redis redis-cli BGSAVE
docker cp rekt_redis:/data/dump.rdb ./backups/redis-$(date +%F).rdb
```

## Invite flywheel ledger (Postgres, append-only)

**Historical invite data** (codes issued, redemptions, batch rotations) is stored in **Postgres** in append-only tables. Rows are **never deleted** when a user rotates to a new batch — only **Redis** drops old `campaign:invite:lookup:v2:*` keys so those codes cannot be redeemed again.

| Table | Purpose |
| ----- | ------- |
| `launch_invite_code_issued` | Every code minted (user batch slot, post-rotation batch, or admin on-demand). |
| `launch_invite_redemption` | Each wallet’s one-time hub registration via a code (`invitee_wallet` unique). |
| `launch_invite_rotation` | Snapshot of the previous batch (codes + statuses) when a user mints a new trio. |

Migration file: `rekt_campaigns/migrations/001_invite_history.sql`.

```bash
# Apply locally (requires Postgres running)
psql "$DATABASE_URL" -f rekt_campaigns/migrations/001_invite_history.sql
```

If `DATABASE_URL` is unset, the campaigns API **skips** ledger writes (logs a warning on failure) and invite **behavior** still uses **Redis** only.

## Tomorrow: Postgres + Redis split (broader)

### Local Postgres quickstart (already wired)

```bash
cd rekt_backend
docker compose --profile postgres up -d postgres
docker exec -it rekt_postgres psql -U rekt -d rekt_ceo -c '\dt'
```

Default DSN is `postgresql://rekt:rekt@localhost:5432/rekt_ceo`, also pre-set
in `.env.example` as `DATABASE_URL`. The backend uses it for the **invite ledger**
via `pg` (`src/services/invite-history.service.ts`). A full `db.ts` abstraction
for identities/layouts is still future work — see the migration plan below.

Redis stays as the hot path (rate limits, daily TTLs, leaderboard ZSETs,
balance cache). Postgres becomes the system of record for:

- `users(address PRIMARY KEY, created_at, …)`
- `identity_links(address, provider, handle, verified_at, raw_metadata)`
- `xp_ledger(id, address, amount, reason_code, source_event_id, created_at)`
- `campaigns(id, status, props_jsonb, created_at, updated_at)`
- `campaign_layout_versions(id, blocks_jsonb, created_by, created_at)`
- `x_rule_presets(id, label, rules_jsonb, created_at, updated_at)`
- `season_snapshots(season_id, address, points, snapshot_at, merkle_proof)`
- `events(id, type, payload_jsonb, address, created_at)` — append-only event store

Migration plan when we add Postgres:

1. Add Prisma (or Kysely) to `rekt_backend`. Generate the schema above.
2. Wrap `campaign.service.ts` writes to **dual-write**: Postgres for source of
   truth, Redis for caches. Keep ZSETs in Redis for fast leaderboards.
3. Backfill from Redis (one-shot script). The append-only ledger replays into
   `xp_ledger`, identities into `identity_links`, etc.
4. Flip reads to Postgres for layout/campaigns/presets (admin edits go through
   Postgres → Redis cache invalidation).
5. Daily TTL state stays Redis-only. There is no Postgres equivalent we need.

## Naming rules

- All keys are prefixed with `campaign:` so we can scope a future
  `IDENTITY:`/`AIRDROP:`/etc. namespace cleanly.
- Hash users by lowercased address. Never store with mixed case.
- Use ISO date strings, never local strings. Never store epoch seconds for
  daily keys (TTLs are calendar-aware, not seconds-aware in this domain).
