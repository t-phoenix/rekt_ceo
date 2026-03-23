# Rekt Bot Management API — AI Context File

> Feed this entire file as context to a frontend AI assistant (e.g. as a system prompt or RAG chunk).
> It covers every endpoint, every request/response shape, all SSE event payloads, dashboard data
> structures, error handling conventions, and suggested UI patterns.

---

## 1. Overview

The backend is a single **Express HTTP server** (TypeScript, Node.js) that manages three trading bots:

| Bot ID | Name | What it does |
|--------|------|-------------|
| `arb` | Arbitrage bot | Monitors Pump.fun (Solana) vs Uniswap V2 (Base) for price differences, simulates and executes cross-chain arb trades |
| `volume-solana` | Solana volume bot | Generates randomised buy/sell volume on Pump.fun |
| `volume-base` | Base volume bot | Generates randomised buy/sell volume on Uniswap V2 (Base) |

**Base URL**: Configurable. Default local: `http://localhost:3000`. Render deployment: `https://sol-base-arb-bot.onrender.com`.

All credentials (private keys, RPC URLs) live in server-side `.env`. The frontend never handles private keys.

---

## 2. Universal Response Envelope

**Every REST endpoint** returns JSON in this shape:

### Success
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "error": "Human-readable error message",
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

The frontend should always check `response.success` before reading `response.data`.

---

## 3. Shared Status Types

```typescript
type ArbBotStatus       = 'running' | 'stopped' | 'error'
type SolanaVolumeBotStatus = 'running' | 'stopped' | 'error'
type BaseVolumeBotStatus   = 'running' | 'stopped' | 'error'
```

---

## 4. Endpoints — System

### `GET /health`
Use for: ping / connection test / showing a global status indicator.

**Response `data`:**
```json
{
  "status": "ok",
  "arb": "stopped",
  "volumeSolana": "running",
  "volumeBase": "stopped",
  "sseClients": 2
}
```

---

### `GET /dashboard`
Use for: initial dashboard page load. Returns the full state of all bots in one call.

**Response `data`:**
```json
{
  "arb": {
    "status": "stopped",
    "stats": {
      "status": "stopped",
      "startedAt": null,
      "lastError": null,
      "eventCoordinatorStats": null
    },
    "config": {
      "NODE_ENV": "production",
      "MIN_PROFIT_THRESHOLD": 0.02,
      "TRADE_SIZE_USD": 100,
      "AUTO_EXECUTE_TRADES": false,
      "PRICE_MOVEMENT_THRESHOLD": 2.0,
      "ANALYSIS_COOLDOWN_MS": 30000,
      "EVENT_POLL_INTERVAL_MS": 2000,
      "SOLANA_TOKEN_MINT": "...",
      "BASE_TOKEN_ADDRESS": "0x...",
      "BASE_USDC_ADDRESS": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "UNISWAP_V2_ROUTER02_ADDRESS": "0x..."
    }
  },
  "volumeSolana": {
    "status": "stopped",
    "stats": {
      "status": "stopped",
      "startedAt": null,
      "totalVolumeUsd": 0,
      "solPriceUsd": 200,
      "lastError": null,
      "tradeCount": 0
    },
    "config": null,
    "recentTrades": []
  },
  "volumeBase": {
    "status": "stopped",
    "stats": {
      "status": "stopped",
      "startedAt": null,
      "totalVolumeUsd": 0,
      "ethPriceUsd": 3000,
      "lastError": null,
      "tradeCount": 0
    },
    "config": null,
    "recentTrades": []
  },
  "sseClients": 1
}
```

Note: `config` is `null` for volume bots until they are started for the first time (config is supplied per-run). `SOLANA_PRIVATE_KEY` and `BASE_PRIVATE_KEY_HEX` are always stripped server-side.

---

## 5. Endpoints — Arbitrage Bot (`/arb/*`)

### `GET /arb/config`
Returns the current merged config (env defaults + any runtime overrides).

**Response `data`:** Full config object (private keys stripped). Key fields:
```json
{
  "MIN_PROFIT_THRESHOLD": 0.02,
  "TRADE_SIZE_USD": 100,
  "AUTO_EXECUTE_TRADES": false,
  "PRICE_MOVEMENT_THRESHOLD": 2.0,
  "ANALYSIS_COOLDOWN_MS": 30000,
  "EVENT_POLL_INTERVAL_MS": 2000,
  "LOG_ALL_EVENTS": false,
  "SOLANA_TOKEN_MINT": "...",
  "BASE_TOKEN_ADDRESS": "0x...",
  "BASE_USDC_ADDRESS": "0x...",
  "UNISWAP_V2_ROUTER02_ADDRESS": "0x...",
  "RUN_MODE": "paper",
  "ENABLE_LIVE_TRADING": false
}
```

---

### `PUT /arb/config`
Update strategy parameters at runtime without restarting. Can be called while the bot is running or stopped.

**Request body** (send only the fields you want to change):
```json
{
  "MIN_PROFIT_THRESHOLD": 0.015,
  "TRADE_SIZE_USD": 250,
  "AUTO_EXECUTE_TRADES": true,
  "PRICE_MOVEMENT_THRESHOLD": 1.5,
  "ANALYSIS_COOLDOWN_MS": 15000,
  "EVENT_POLL_INTERVAL_MS": 1000,
  "LOG_ALL_EVENTS": false
}
```

**Allowed keys:** `MIN_PROFIT_THRESHOLD`, `TRADE_SIZE_USD`, `AUTO_EXECUTE_TRADES`, `PRICE_MOVEMENT_THRESHOLD`, `ANALYSIS_COOLDOWN_MS`, `EVENT_POLL_INTERVAL_MS`, `LOG_ALL_EVENTS`. Any other keys are silently ignored.

**Response `data`:**
```json
{ "updated": { "MIN_PROFIT_THRESHOLD": 0.015 } }
```

**Error (400):** `"No valid config keys provided"`

---

### `POST /arb/start`
Start the arbitrage monitoring loop. Fails if already running.

**Request body** (optional — same keys as `PUT /arb/config`; applied before start):
```json
{ "AUTO_EXECUTE_TRADES": true, "MIN_PROFIT_THRESHOLD": 0.02 }
```
Or send empty body `{}` to use existing config.

**Requirements** (must be set in server `.env`):
- `SOLANA_TOKEN_MINT`
- `BASE_TOKEN_ADDRESS`
- `BASE_USDC_ADDRESS`
- `UNISWAP_V2_ROUTER02_ADDRESS`

**Response `data`:** `{ "message": "Arbitrage bot started" }`

**Error (400):** `"Arbitrage bot is already running"` | `"SOLANA_TOKEN_MINT is required"` | etc.

---

### `POST /arb/stop`
Stop the monitoring loop. Fails if not running.

**Response `data`:** `{ "message": "Arbitrage bot stopped" }`

**Error (400):** `"Arbitrage bot is not running"`

---

### `GET /arb/stats`
Live stats while the bot is running (or last known state when stopped).

**Response `data`:**
```json
{
  "status": "running",
  "startedAt": 1710000000000,
  "lastError": null,
  "eventCoordinatorStats": {
    "eventCounts": {
      "solana": 42,
      "base": 18
    },
    "currentPrices": {
      "solanaPrice": 0.000003812,
      "basePrice": 0.000003950,
      "timestamp": 1710000045000,
      "source": "event"
    },
    "baselinePrices": {
      "solanaPrice": 0.000003800,
      "basePrice": 0.000003900,
      "timestamp": 1710000000000,
      "source": "event"
    },
    "currentChanges": {
      "solana": 0.32,
      "base": 1.28
    },
    "isAnalysisRunning": false,
    "lastAnalysisTime": 1710000040000
  }
}
```

`eventCoordinatorStats` is `null` when the bot is stopped.

Dashboard use: show `eventCounts`, `currentPrices`, `currentChanges`, and `lastAnalysisTime`.

---

### `POST /arb/trigger`
Manually trigger one analysis cycle immediately (ignores cooldown).

**Response `data`:**
```json
{
  "message": "Analysis triggered",
  "result": null
}
```
`result` is `null` if no profitable opportunity was found, otherwise contains `{ opportunity, simulation, executed }`.

**Error (400):** `"Arbitrage bot is not running"`

---

### `POST /arb/reset-baseline`
Reset the price baseline used for detecting movements. Useful after a large manual trade or to force a fresh reference point.

**Response `data`:** `{ "message": "Price baseline reset" }`

---

## 6. Endpoints — Solana Volume Bot (`/volume/solana/*`)

### `GET /volume/solana/status`
**Response `data`:**
```json
{
  "status": "running",
  "config": {
    "rpcUrl": "https://...",
    "tokenMint": "...",
    "minTradeAmountSol": 0.01,
    "maxTradeAmountSol": 0.05,
    "tradingIntervalMs": 30000,
    "slippagePercent": 5,
    "summaryIntervalMs": 300000,
    "priorityFeeSol": 0.0001,
    "buyProbability": 50,
    "randomizeTradeSize": true,
    "maxTotalVolumeUsd": 0,
    "runDurationMinutes": 0
  }
}
```
`config` is `null` if bot has never been started. `privateKey` is always stripped.

---

### `POST /volume/solana/start`
Start the Solana volume trading loop. Reads wallet credentials from server `.env`.

**Request body:**
```json
{
  "minTradeAmountSol": 0.01,
  "maxTradeAmountSol": 0.05,
  "tradingIntervalMs": 30000,
  "slippagePercent": 5,
  "buyProbability": 50,
  "priorityFeeSol": 0.0001,
  "randomizeTradeSize": true,
  "maxTotalVolumeUsd": 0,
  "runDurationMinutes": 0
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `minTradeAmountSol` | number | YES | — | Min SOL per trade (e.g. `0.01`) |
| `maxTradeAmountSol` | number | YES | — | Max SOL per trade (e.g. `0.1`) |
| `tradingIntervalMs` | number | YES | — | Milliseconds between trades (e.g. `30000`) |
| `slippagePercent` | number | YES | — | Slippage tolerance % (e.g. `5`) |
| `buyProbability` | number | no | `50` | % chance each cycle is a buy (0–100) |
| `priorityFeeSol` | number | no | `0.0001` | Solana priority fee in SOL |
| `randomizeTradeSize` | boolean | no | `true` | Randomise size within min/max |
| `maxTotalVolumeUsd` | number | no | `0` | Stop after this USD volume (`0` = unlimited) |
| `runDurationMinutes` | number | no | `0` | Stop after N minutes (`0` = infinite) |

**Response `data`:** `{ "message": "Solana volume bot started" }`

**Error (400):** `"Solana volume bot is already running"` | `"SOLANA_PRIVATE_KEY not configured"` | etc.

---

### `POST /volume/solana/stop`
Signal the trading loop to stop gracefully after the current iteration.

**Response `data`:** `{ "message": "Solana volume bot stop signal sent" }`

Note: stop is asynchronous. The loop finishes its current trade then exits. Poll `/volume/solana/status` or watch the SSE `volume:solana:stopped` event to confirm.

---

### `GET /volume/solana/stats`
**Response `data`:**
```json
{
  "status": "running",
  "startedAt": 1710000000000,
  "totalVolumeUsd": 247.50,
  "solPriceUsd": 185.40,
  "lastError": null,
  "pnl": null,
  "tradeCount": 18
}
```

---

### `GET /volume/solana/trades?limit=20`
Recent trade history. `limit` query param defaults to 20.

**Response `data`:** Array of `SolanaTradeRecord`:
```json
[
  {
    "timestamp": "2024-03-14T12:00:00.000Z",
    "direction": "BUY",
    "tokenAmount": 1523.44,
    "solAmount": 0.023,
    "usdValue": 4.26,
    "gasUsedSol": 0.000012,
    "signature": "5KJp...abc",
    "success": true,
    "error": null
  },
  {
    "timestamp": "2024-03-14T12:00:35.000Z",
    "direction": "SELL",
    "tokenAmount": 610.0,
    "solAmount": 0.009,
    "usdValue": 1.67,
    "gasUsedSol": 0.000011,
    "signature": "3Xmn...def",
    "success": true,
    "error": null
  }
]
```

`success: false` trades include an `error` string. Use these for error display.

---

## 7. Endpoints — Base Volume Bot (`/volume/base/*`)

### `GET /volume/base/status`
**Response `data`:**
```json
{
  "status": "stopped",
  "config": null
}
```
When running, `config` contains (private key stripped):
```json
{
  "rpcUrl": "https://...",
  "tokenAddress": "0x...",
  "usdcAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "routerAddress": "0x...",
  "minTradeAmountUsdc": 5,
  "maxTradeAmountUsdc": 50,
  "tradingIntervalMs": 30000,
  "slippageBps": 50,
  "summaryIntervalMs": 300000,
  "deadlineSeconds": 30,
  "buyProbability": 50,
  "randomizeTradeSize": true,
  "maxTotalVolumeUsd": 0,
  "runDurationMinutes": 0
}
```

---

### `POST /volume/base/start`
**Request body:**
```json
{
  "minTradeAmountUsdc": 5,
  "maxTradeAmountUsdc": 50,
  "tradingIntervalMs": 30000,
  "slippageBps": 50,
  "buyProbability": 50,
  "deadlineSeconds": 30,
  "randomizeTradeSize": true,
  "maxTotalVolumeUsd": 0,
  "runDurationMinutes": 0
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `minTradeAmountUsdc` | number | YES | — | Min USDC per trade (e.g. `5`) |
| `maxTradeAmountUsdc` | number | YES | — | Max USDC per trade (e.g. `50`) |
| `tradingIntervalMs` | number | YES | — | Milliseconds between trades |
| `slippageBps` | number | YES | — | Slippage in basis points (`50` = 0.5%) |
| `buyProbability` | number | no | `50` | % chance each cycle is a buy |
| `deadlineSeconds` | number | no | `30` | Uniswap transaction deadline |
| `randomizeTradeSize` | boolean | no | `true` | Randomise within min/max |
| `maxTotalVolumeUsd` | number | no | `0` | Stop after this USD volume |
| `runDurationMinutes` | number | no | `0` | Stop after N minutes |

**Response `data`:** `{ "message": "Base volume bot started" }`

---

### `POST /volume/base/stop`
**Response `data`:** `{ "message": "Base volume bot stop signal sent" }`

---

### `GET /volume/base/stats`
**Response `data`:**
```json
{
  "status": "running",
  "startedAt": 1710000000000,
  "totalVolumeUsd": 430.00,
  "ethPriceUsd": 3280.00,
  "lastError": null,
  "tradeCount": 22
}
```

---

### `GET /volume/base/trades?limit=20`
**Response `data`:** Array of `BaseTradeRecord`:
```json
[
  {
    "timestamp": "2024-03-14T12:00:00.000Z",
    "direction": "BUY",
    "tokenAmount": 5230.0,
    "usdcAmount": 10.50,
    "usdValue": 10.50,
    "gasUsedEth": 0.000021,
    "transactionHash": "0xabc...123",
    "success": true,
    "error": null
  }
]
```

Note: Solana trades have `solAmount` + `signature`; Base trades have `usdcAmount` + `transactionHash`.

---

## 8. SSE Event Stream (`GET /events`)

### Connecting

```javascript
const BASE_URL = 'https://sol-base-arb-bot.onrender.com'; // or localhost:3000

const source = new EventSource(`${BASE_URL}/events`);

source.onmessage = (e) => {
  const event = JSON.parse(e.data);
  handleBotEvent(event);
};

source.onerror = () => {
  // EventSource reconnects automatically — no manual reconnect needed
  console.warn('SSE connection lost, reconnecting...');
};
```

### Universal event envelope

Every SSE message has this shape:
```typescript
interface BotEvent {
  type: string;              // See event type catalogue below
  botId: 'arb' | 'volume-solana' | 'volume-base' | 'system';
  timestamp: number;         // Unix milliseconds
  data: Record<string, any>; // Event-specific payload — see below
}
```

### Event type catalogue

#### `system:status` — sent immediately on SSE connect
`data` is the full `/dashboard` snapshot (same shape as `GET /dashboard` response `data`).
Use this to hydrate the entire dashboard on connection.

```json
{
  "type": "system:status",
  "botId": "system",
  "timestamp": 1710000000000,
  "data": { "arb": {...}, "volumeSolana": {...}, "volumeBase": {...}, "sseClients": 1 }
}
```

#### `system:heartbeat` — every 25 seconds
Use to detect connection health. `data` is `{}`.

---

#### `arb:started`
```json
{
  "type": "arb:started",
  "botId": "arb",
  "timestamp": 1710000000000,
  "data": {
    "config": {
      "solanaToken": "...",
      "baseToken": "0x...",
      "minProfitThreshold": 0.02,
      "tradeSizeUsd": 100,
      "autoExecute": false
    }
  }
}
```

#### `arb:stopped`
```json
{ "type": "arb:stopped", "botId": "arb", "timestamp": 1710000000000, "data": {} }
```

#### `arb:config_updated`
```json
{
  "type": "arb:config_updated",
  "botId": "arb",
  "timestamp": 1710000000000,
  "data": {
    "overrides": { "MIN_PROFIT_THRESHOLD": 0.015, "AUTO_EXECUTE_TRADES": true }
  }
}
```

#### `arb:analysis` — fired every time an analysis cycle starts
```json
{
  "type": "arb:analysis",
  "botId": "arb",
  "timestamp": 1710000000000,
  "data": {
    "triggerChain": "solana",
    "percentChange": 0,
    "currentSnapshot": {
      "solanaPrice": 0.000003812,
      "basePrice": 0.000003950,
      "timestamp": 1710000000000,
      "source": "event"
    }
  }
}
```
Use for: "analysis in progress" spinner / last-checked timestamp.

#### `arb:opportunity` — profitable opportunity found (may or may not execute)
```json
{
  "type": "arb:opportunity",
  "botId": "arb",
  "timestamp": 1710000000000,
  "data": {
    "direction": "SOLANA_TO_BASE",
    "priceDifferencePercent": 3.65,
    "estimatedProfitUsd": 3.42,
    "estimatedProfitPercent": 3.42,
    "solanaPrice": {
      "price": 0.000003812,
      "timestamp": 1710000000000,
      "source": "api",
      "chain": "solana"
    },
    "basePrice": {
      "price": 0.000003950,
      "timestamp": 1710000000000,
      "source": "api",
      "chain": "base"
    },
    "simulationSuccess": true,
    "netProfitUsd": 3.18,
    "executed": false
  }
}
```
`direction`: `"SOLANA_TO_BASE"` means buy cheap on Solana, sell expensive on Base. `"BASE_TO_SOLANA"` is the reverse.
`executed`: `false` means opportunity found but `AUTO_EXECUTE_TRADES` is off.

#### `arb:trade` — trade was actually executed on-chain
```json
{
  "type": "arb:trade",
  "botId": "arb",
  "timestamp": 1710000000000,
  "data": {
    "direction": "SOLANA_TO_BASE",
    "netProfitUsd": 3.18,
    "netProfitPercent": 3.18,
    "totalCostUsd": 97.20,
    "totalRevenueUsd": 100.38
  }
}
```

---

#### `volume:solana:started`
```json
{
  "type": "volume:solana:started",
  "botId": "volume-solana",
  "timestamp": 1710000000000,
  "data": {
    "config": {
      "rpcUrl": "https://...",
      "tokenMint": "...",
      "minTradeAmountSol": 0.01,
      "maxTradeAmountSol": 0.05,
      "tradingIntervalMs": 30000,
      "slippagePercent": 5,
      "buyProbability": 50
    }
  }
}
```

#### `volume:solana:stopped`
```json
{
  "type": "volume:solana:stopped",
  "botId": "volume-solana",
  "timestamp": 1710000000000,
  "data": { "totalVolumeUsd": 247.50, "tradeCount": 18 }
}
```

#### `volume:solana:trade` — every completed Solana buy or sell
```json
{
  "type": "volume:solana:trade",
  "botId": "volume-solana",
  "timestamp": 1710000000000,
  "data": {
    "direction": "BUY",
    "tokenAmount": 1523.44,
    "solAmount": 0.023,
    "usdValue": 4.26,
    "gasUsedSol": 0.000012,
    "signature": "5KJp...abc",
    "success": true,
    "error": null,
    "totalVolumeUsd": 52.40
  }
}
```

---

#### `volume:base:started` / `volume:base:stopped`
Same structure as Solana equivalents, with `botId: "volume-base"` and Base-specific config fields.

#### `volume:base:trade` — every completed Base buy or sell
```json
{
  "type": "volume:base:trade",
  "botId": "volume-base",
  "timestamp": 1710000000000,
  "data": {
    "direction": "SELL",
    "tokenAmount": 5230.0,
    "usdcAmount": 10.42,
    "usdValue": 10.42,
    "gasUsedEth": 0.000021,
    "transactionHash": "0xabc...123",
    "success": true,
    "error": null,
    "totalVolumeUsd": 430.00
  }
}
```

---

## 9. Recommended Dashboard Architecture

### On page load
1. `GET /dashboard` — hydrate all bot state panels
2. Open `EventSource` to `GET /events` — the first message is always `system:status` which re-delivers the full snapshot; ignore duplicates

### Routing SSE events in your handler
```javascript
function handleBotEvent(event) {
  switch (event.type) {
    case 'system:status':
      hydrateFullDashboard(event.data);
      break;

    case 'arb:started':
    case 'arb:stopped':
      updateArbStatusBadge(event.data);
      break;

    case 'arb:config_updated':
      refreshArbConfigPanel(event.data.overrides);
      break;

    case 'arb:analysis':
      showAnalysisSpinner();
      updateLastCheckedTime(event.timestamp);
      break;

    case 'arb:opportunity':
      hideAnalysisSpinner();
      addOpportunityToFeed(event.data);
      break;

    case 'arb:trade':
      addTradeToHistory(event.data);
      updateCumulativeProfit(event.data.netProfitUsd);
      break;

    case 'volume:solana:trade':
    case 'volume:base:trade':
      addVolumeTrade(event.botId, event.data);
      updateVolumeCounter(event.botId, event.data.totalVolumeUsd);
      break;

    case 'volume:solana:stopped':
    case 'volume:base:stopped':
      updateVolumeBotStatus(event.botId, 'stopped');
      break;

    case 'system:heartbeat':
      markConnectionAlive();
      break;
  }
}
```

### Polling fallback (optional)
If you need guaranteed consistency (e.g. after a tab regain visibility), supplement SSE with periodic `GET /arb/stats`, `GET /volume/solana/stats`, and `GET /volume/base/stats` every 15–30 seconds.

---

## 10. Config Panel — Arb Bot

When building a settings UI, these are all the tunable fields, their types, and safe ranges:

| Field | Type | Min | Max | Description | Live-update? |
|-------|------|-----|-----|-------------|-------------|
| `MIN_PROFIT_THRESHOLD` | float (0–1) | 0.005 | 0.20 | e.g. `0.02` = 2% min profit | Yes — `PUT /arb/config` |
| `TRADE_SIZE_USD` | number | 10 | — | Max USD per trade | Yes |
| `AUTO_EXECUTE_TRADES` | boolean | — | — | Toggle paper/live mode | Yes |
| `PRICE_MOVEMENT_THRESHOLD` | float | 0.5 | 20 | % move to wake up analysis | Yes |
| `ANALYSIS_COOLDOWN_MS` | integer | 1000 | 300000 | Min ms between analyses | Yes |
| `EVENT_POLL_INTERVAL_MS` | integer | 500 | 30000 | On-chain poll frequency | Yes (restart needed) |
| `LOG_ALL_EVENTS` | boolean | — | — | Verbose event logging | Yes |

**Important**: `AUTO_EXECUTE_TRADES: true` will spend real funds. The UI should show a confirmation dialog and require the user to acknowledge before enabling.

---

## 11. Config Panel — Solana Volume Bot

These are passed in the `POST /volume/solana/start` body and cannot be changed mid-run (stop and restart to change):

| Field | Type | Recommended Range | Notes |
|-------|------|------------------|-------|
| `minTradeAmountSol` | float | 0.005 – 1.0 | Must be less than `maxTradeAmountSol` |
| `maxTradeAmountSol` | float | 0.01 – 5.0 | Keep reasonable relative to wallet balance |
| `tradingIntervalMs` | integer | 5000 – 300000 | 30s = 30000 |
| `slippagePercent` | float | 1 – 25 | Higher = more likely to succeed on volatile tokens |
| `buyProbability` | integer | 0 – 100 | 50 = balanced, 70 = buy-heavy |
| `priorityFeeSol` | float | 0 – 0.01 | Higher = faster confirmation |
| `maxTotalVolumeUsd` | number | 0 = unlimited | Use to cap total spend |
| `runDurationMinutes` | integer | 0 = infinite | Use to auto-stop |

---

## 12. Config Panel — Base Volume Bot

Passed in `POST /volume/base/start` body:

| Field | Type | Recommended Range | Notes |
|-------|------|------------------|-------|
| `minTradeAmountUsdc` | float | 1 – 100 | Must be less than `maxTradeAmountUsdc` |
| `maxTradeAmountUsdc` | float | 5 – 500 | Keep relative to wallet USDC balance |
| `tradingIntervalMs` | integer | 5000 – 300000 | |
| `slippageBps` | integer | 10 – 500 | 50 = 0.5%, 300 = 3% |
| `deadlineSeconds` | integer | 15 – 120 | Uniswap TX expiry |
| `buyProbability` | integer | 0 – 100 | |
| `maxTotalVolumeUsd` | number | 0 = unlimited | |
| `runDurationMinutes` | integer | 0 = infinite | |

---

## 13. Error Handling Patterns

### Bot already running
```json
{ "success": false, "error": "Arbitrage bot is already running" }
```
UI: Disable the "Start" button when `status === "running"`. Show "Stop" instead.

### Bot not running
```json
{ "success": false, "error": "Arbitrage bot is not running" }
```
UI: Disable "Stop", "Trigger", and "Reset Baseline" when `status !== "running"`.

### Missing env config on server
```json
{ "success": false, "error": "SOLANA_TOKEN_MINT is required" }
```
UI: Show as a server configuration error — the user needs to set env vars in Render, not in the frontend.

### Volume bot insufficient balance (loop error, arrives via SSE)
```json
{
  "type": "volume:solana:trade",
  "data": { "success": false, "error": "Insufficient SOL balance for buy trade" }
}
```
UI: Show failed trades with a red badge. The bot auto-skips and retries next interval.

---

## 14. Transaction Explorer Links

Use these to build "View on explorer" links from trade data:

| Chain | URL pattern | Field |
|-------|-------------|-------|
| Solana (Pump.fun trades) | `https://solscan.io/tx/{signature}` | `data.signature` from `volume:solana:trade` |
| Base (Uniswap trades) | `https://basescan.org/tx/{transactionHash}` | `data.transactionHash` from `volume:base:trade` |
| Solana token | `https://pump.fun/{tokenMint}` | `SOLANA_TOKEN_MINT` from config |
| Base token | `https://basescan.org/address/{tokenAddress}` | `BASE_TOKEN_ADDRESS` from config |

---

## 15. Key Data Relationships

```
GET /dashboard (initial load)
  └─ arb.stats.eventCoordinatorStats.currentPrices  → show live Solana + Base price
  └─ arb.stats.eventCoordinatorStats.eventCounts    → show events heard since start
  └─ volumeSolana.stats.totalVolumeUsd              → show cumulative volume
  └─ volumeSolana.recentTrades[]                    → seed trade history table
  └─ volumeBase.stats.totalVolumeUsd                → Base volume counter
  └─ volumeBase.recentTrades[]                      → Base trade history

SSE (live updates)
  arb:analysis          → update "last checked" timestamp
  arb:opportunity       → push to opportunity feed
  arb:trade             → push to arb trade log + update P&L
  volume:solana:trade   → push to Solana trade table + update volume counter
  volume:base:trade     → push to Base trade table + update volume counter
```

---

## 16. Suggested Dashboard Panels

| Panel | Data source | Refresh |
|-------|-------------|---------|
| Global status bar | `GET /health` | Poll every 10s or SSE started/stopped events |
| Arb bot controls | `GET /arb/config` + status | SSE `arb:started/stopped/config_updated` |
| Live price comparison | `GET /arb/stats` → `currentPrices` | SSE `arb:analysis` (contains snapshot) |
| Price chart | Accumulate `arb:analysis` `currentSnapshot` payloads | SSE |
| Opportunity feed | SSE `arb:opportunity` events | Real-time via SSE |
| Arb trade log | SSE `arb:trade` events | Real-time via SSE |
| Solana volume controls | `GET /volume/solana/status` | SSE `volume:solana:started/stopped` |
| Solana trade table | `GET /volume/solana/trades` + SSE | On load + append from SSE |
| Solana volume counter | `GET /volume/solana/stats` → `totalVolumeUsd` | SSE `volume:solana:trade` |
| Base volume controls | `GET /volume/base/status` | SSE `volume:base:started/stopped` |
| Base trade table | `GET /volume/base/trades` + SSE | On load + append from SSE |
| Base volume counter | `GET /volume/base/stats` → `totalVolumeUsd` | SSE `volume:base:trade` |
