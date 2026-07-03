# Pricing & Balance API Endpoints — Documentation

> This file documents the new pricing and balance API endpoints added to the Rekt Bot Management server.
> These endpoints provide real-time market data and wallet balance information for frontend integration.

---

## Overview

Three new REST endpoints have been added to provide market data and wallet information:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pricing` | GET | Current token prices on both Solana (Pump.fun) and Base (Uniswap V2) chains |
| `/api/balances` | GET | Wallet balances for both chains including native tokens and target tokens |
| `/api/pools` | GET | Pool reserves, liquidity information, and arbitrage opportunity analysis |

**Base URL**: Same as main API. Default local: `http://localhost:3000`. Production: `https://your-domain.com`.

All endpoints follow the same response envelope pattern as the main API and are subject to the same CORS configuration.

---

## Universal Response Format

All endpoints return JSON in this standardized format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

---

## Endpoint Details

### 1. GET `/api/pricing`

**Purpose**: Returns current token prices on both chains with price difference analysis.

**Response Data Structure**:
```json
{
  "success": true,
  "data": {
    "solana": {
      "price": 0.00000257,           // Price in SOL
      "priceUsd": 0.617,             // Price in USD
      "liquidity": 7200,             // Liquidity in SOL
      "liquidityUsd": 1728000,       // Liquidity in USD
      "marketCapUsd": 617000         // Market cap in USD
    },
    "base": {
      "price": 0.00000057,           // Price in ETH/USDC
      "priceUsd": 0.137,             // Price in USD
      "liquidity": 10000,            // Liquidity in USDC
      "liquidityUsd": 10000          // Liquidity in USD
    },
    "priceDifference": {
      "absolute": 0.48,              // Absolute USD difference
      "percent": 350.4               // Percentage difference
    },
    "timestamp": 1234567890
  },
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

**Use Cases**:
- Display current token prices on dashboard
- Show price differences for arbitrage opportunities
- Monitor liquidity across both chains
- Calculate potential profits

---

### 2. GET `/api/balances`

**Purpose**: Returns wallet balances for both chains including native tokens, stablecoins, and target tokens.

**Response Data Structure**:
```json
{
  "success": true,
  "data": {
    "solana": {
      "sol": 0.5,                    // SOL balance
      "solUsd": 120,                 // SOL value in USD
      "token": 1000000,              // Target token balance
      "tokenUsd": 2.57,              // Token value in USD
      "totalUsd": 122.57             // Total wallet value in USD
    },
    "base": {
      "eth": 0.01,                   // ETH balance
      "ethUsd": 35,                  // ETH value in USD
      "usdc": 100,                   // USDC balance
      "token": 500000,               // Target token balance
      "totalUsd": 135.285            // Total wallet value in USD
    },
    "combined": {
      "totalUsd": 257.855            // Combined portfolio value
    },
    "timestamp": 1234567890
  },
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

**Use Cases**:
- Display portfolio overview
- Show individual wallet balances
- Track total portfolio value
- Monitor available funds for trading

---

### 3. GET `/api/pools`

**Purpose**: Returns detailed pool information, reserves, and arbitrage opportunity analysis.

**Response Data Structure**:
```json
{
  "success": true,
  "data": {
    "solana": {
      "chain": "solana",
      "dex": "pump.fun",
      "reserves": {
        "virtual": {
          "solFormatted": 30,        // Virtual SOL reserves (human readable)
          "tokensFormatted": 1073000000  // Virtual token reserves (human readable)
        },
        "real": {
          "solFormatted": 25,        // Real SOL reserves (human readable)
          "tokensFormatted": 973000000   // Real token reserves (human readable)
        }
      },
      "liquidity": 7200,             // Liquidity amount
      "liquidityUsd": 1728000,       // Liquidity in USD
      "price": 0.00000257,           // Current price
      "priceUsd": 0.617              // Current price in USD
    },
    "base": {
      "chain": "base",
      "dex": "uniswap-v2",
      "reserves": {
        "usdcFormatted": 5000,       // USDC reserves (human readable)
        "tokensFormatted": 8771929   // Token reserves (human readable)
      },
      "liquidity": 10000,            // Liquidity amount
      "liquidityUsd": 10000,         // Liquidity in USD
      "price": 0.00000057,           // Current price
      "priceUsd": 0.137              // Current price in USD
    },
    "comparison": {
      "priceDifference": {
        "absolute": 0.48,            // Absolute price difference
        "percent": 350.4             // Percentage difference
      },
      "liquidityRatio": 172.8,       // Solana liquidity / Base liquidity
      "recommendedDirection": "SOLANA_TO_BASE"  // Suggested arbitrage direction
    },
    "timestamp": 1234567890
  },
  "timestamp": "2024-03-14T12:00:00.000Z"
}
```

**Use Cases**:
- Display pool reserve information
- Show arbitrage opportunities
- Analyze liquidity distribution
- Recommend trading direction

---

## Data Refresh Strategy

### Real-time Data Only
- All endpoints fetch live data using `arbitrageBotService.triggerAnalysis()`
- Data is as current as the last market analysis cycle
- **No fallback or dummy data** - endpoints return errors if real data is unavailable

### Error-First Approach
- If live data fetch fails, endpoints return HTTP 500 with error details
- Frontend must handle errors gracefully and implement retry logic
- Ensures data integrity - no stale or dummy data displayed

### Recommended Refresh Intervals
- **High-frequency trading**: 1-2 seconds
- **Dashboard monitoring**: 5-10 seconds  
- **Portfolio tracking**: 30-60 seconds

---

## Error Handling

### Common Error Scenarios

1. **Market Data Unavailable (HTTP 500)**
   ```json
   {
     "success": false,
     "error": "No market data available - arbitrage bot may not be running or configured properly",
     "timestamp": "2024-03-14T12:00:00.000Z"
   }
   ```

2. **Wallet Stats Unavailable (HTTP 500)**
   ```json
   {
     "success": false,
     "error": "No wallet data available - arbitrage bot may not be running or wallets not configured properly", 
     "timestamp": "2024-03-14T12:00:00.000Z"
   }
   ```

3. **Pool Data Unavailable (HTTP 500)**
   ```json
   {
     "success": false,
     "error": "No pool data available - arbitrage bot may not be running or market data unavailable",
     "timestamp": "2024-03-14T12:00:00.000Z"
   }
   ```

4. **Network/Connection Issues (HTTP 500)**
   ```json
   {
     "success": false,
     "error": "Failed to fetch real-time pricing data",
     "timestamp": "2024-03-14T12:00:00.000Z"
   }
   ```

### Frontend Error Handling Best Practices

1. **Always check `success` field** before using data
2. **Check HTTP status codes** - 500 indicates server-side data unavailability
3. **Implement fallback UI** for error states (loading spinners, error messages)
4. **Provide retry mechanisms** for temporary failures
5. **Cache successful responses** client-side for offline display during errors
6. **Show meaningful error messages** to users (e.g., "Market data temporarily unavailable")
7. **Log errors** for debugging and monitoring

---

## Frontend Integration Examples

### JavaScript Fetch
```javascript
async function getPricing() {
  try {
    const response = await fetch('/api/pricing');
    const result = await response.json();
    
    if (response.ok && result.success) {
      return result.data;
    } else {
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to fetch pricing:', error);
    // Handle error - show cached data, error message, or retry option
    throw error; // Re-throw for caller to handle
  }
}
```

### React Hook Example
```javascript
function usePricingData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/pricing');
        const result = await response.json();
        
        if (response.ok && result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error || `HTTP ${response.status}: Failed to fetch data`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
```

---

## Security & Performance Notes

### CORS Configuration
- Endpoints respect the same CORS settings as main API
- Configure `CORS_ORIGINS` environment variable appropriately
- Use specific origins in production (avoid `*`)

### Rate Limiting Considerations
- No built-in rate limiting on these endpoints
- Consider implementing client-side throttling for high-frequency requests
- Monitor server resources if polling frequently

### Data Sensitivity
- No private keys or sensitive data exposed
- All data is read-only market information
- Safe for frontend consumption

---

## Utility Functions

For consistent data formatting across frontends, consider these utility functions:

```javascript
// Format currency values
const formatCurrency = (value, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Format large numbers with K/M/B suffixes
const formatTokenAmount = (amount, decimals = 2) => {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(decimals)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(decimals)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(decimals)}K`;
  return amount.toFixed(decimals);
};

// Format percentage with +/- sign
const formatPercentage = (value, decimals = 2) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

// Get color class for price changes
const getPriceColor = (percent) => {
  if (percent > 0) return 'green';
  if (percent < 0) return 'red';
  return 'gray';
};
```

---

## Summary

These three endpoints provide comprehensive market data and wallet information needed for a complete trading dashboard:

- **`/api/pricing`** - Real-time price data and arbitrage opportunities
- **`/api/balances`** - Portfolio overview and wallet balances  
- **`/api/pools`** - Detailed liquidity and reserve information

All endpoints are production-ready with proper error handling, fallback data, and consistent response formats.