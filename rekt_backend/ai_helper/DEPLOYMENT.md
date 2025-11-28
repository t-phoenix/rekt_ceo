# Deployment Guide

This guide covers deploying the Rekt CEO backend to production.

## Prerequisites

- Docker and Docker Compose installed
- Contract addresses from deployment
- Backend wallet with APPROVER_ROLE granted
- Pinata API credentials
- Alchemy or similar RPC provider

## Environment Setup

1. **Copy environment template**

```bash
cp .env.example .env
```

2. **Configure environment variables**

Edit `.env` with production values:

```bash
# Blockchain Configuration
CHAIN_ID=8453  # Base Mainnet
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
RPC_URL_FALLBACK=https://mainnet.base.org
BACKEND_PRIVATE_KEY=0x...  # Backend wallet private key

# Contract Addresses (from deployment)
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS/Pinata Configuration
PINATA_JWT=eyJhbGc...  # Pinata JWT token
PINATA_GATEWAY=https://gateway.pinata.cloud

# API Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=YOUR_STRONG_SECRET_KEY_MIN_32_CHARS
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://rektceo.club  # Your frontend URL

# Redis
REDIS_URL=redis://redis:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Backend Wallet Setup

The backend wallet needs:
1. **APPROVER_ROLE** in MinterContract
2. **Sufficient ETH** for gas fees (~0.5 ETH recommended)

### Grant APPROVER_ROLE

```bash
# From main project directory
npx hardhat run scripts/grant-role.js --network base
# Or manually:
# minterContract.grantRole(APPROVER_ROLE, BACKEND_WALLET_ADDRESS)
```

### Fund Backend Wallet

```bash
# Check balance
cast balance $BACKEND_WALLET_ADDRESS --rpc-url $RPC_URL

# Send ETH if needed
cast send $BACKEND_WALLET_ADDRESS --value 0.5ether \
  --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Build and start:**

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

**View logs:**

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Stop services:**

```bash
docker-compose -f docker-compose.prod.yml down
```

### Option 2: Standalone Docker

**Build image:**

```bash
docker build -t rekt-ceo-backend .
```

**Run container:**

```bash
docker run -d \
  --name rekt-ceo-backend \
  --env-file .env \
  -p 3000:3000 \
  rekt-ceo-backend
```

### Option 3: Direct Node.js

**Install dependencies:**

```bash
npm install
```

**Build TypeScript:**

```bash
npm run build
```

**Start Redis:**

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Start backend:**

```bash
npm start
```

## Verification

### 1. Check Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "backendWallet": {
      "address": "0x...",
      "balanceETH": "0.5"
    }
  }
}
```

### 2. Test Pricing Endpoint

```bash
curl http://localhost:3000/api/info/pricing/PFP
```

### 3. Test Authentication

```bash
# Get nonce
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x..."}'
```

## Monitoring

### Backend Wallet Balance

Monitor the backend wallet ETH balance:

```bash
# Create monitoring script
cat > monitor-balance.sh << 'EOF'
#!/bin/bash
THRESHOLD=0.1
BALANCE=$(curl -s http://localhost:3000/api/health | jq -r '.data.backendWallet.balanceETH')

if (( $(echo "$BALANCE < $THRESHOLD" | bc -l) )); then
  echo "⚠️ WARNING: Backend wallet balance low: $BALANCE ETH"
  # Add alert notification here (email, Slack, etc.)
fi
EOF

chmod +x monitor-balance.sh
```

Run with cron:
```bash
# Check every hour
0 * * * * /path/to/monitor-balance.sh
```

### Log Monitoring

**View real-time logs:**

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml logs -f

# Direct Docker
docker logs -f rekt-ceo-backend

# Direct Node.js
tail -f logs/combined.log
```

**Check for errors:**

```bash
grep ERROR logs/error.log
```

## Maintenance

### Update Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Redis Data

```bash
docker exec rekt-ceo-redis redis-cli BGSAVE
docker cp rekt-ceo-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb
```

### Rotate Backend Wallet

If backend wallet is compromised:

1. Deploy new wallet with fresh private key
2. Grant APPROVER_ROLE to new wallet
3. Revoke APPROVER_ROLE from old wallet
4. Update `BACKEND_PRIVATE_KEY` in `.env`
5. Restart backend

```bash
# Update environment
vim .env  # Change BACKEND_PRIVATE_KEY

# Restart
docker-compose -f docker-compose.prod.yml restart backend
```

## Troubleshooting

### Backend Not Starting

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Common issues:**
- Invalid RPC URL → Check Alchemy key
- Redis connection failed → Ensure Redis is running
- Configuration error → Validate all env vars

### RPC Connection Issues

**Test RPC:**
```bash
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Use fallback:**
- Ensure `RPC_URL_FALLBACK` is configured
- Backend will automatically switch on failures

### IPFS Upload Failures

**Check Pinata:**
- Verify JWT token is valid
- Check Pinata dashboard for rate limits
- Ensure sufficient storage quota

### High Gas Costs

**Monitor gas prices:**
```bash
cast gas-price --rpc-url $RPC_URL
```

**Optimize:**
- Wait for low gas periods
- Batch operations if possible
- Consider alternative L2s

## Security Checklist

- [ ] Backend private key stored securely (never in git)
- [ ] JWT secret is strong (32+ characters)
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled
- [ ] Backend wallet has only APPROVER_ROLE (not ADMIN)
- [ ] HTTPS/TLS configured for production
- [ ] Firewall rules restricting access
- [ ] Monitoring and alerts configured
- [ ] Regular backups scheduled

## Performance Tuning

### Scaling

For high load (>100 mints/hour):

1. **Add more backend instances:**
```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3
```

2. **Use external Redis:**
- Deploy Redis separately
- Update `REDIS_URL` to point to external instance

3. **Add load balancer:**
- Nginx or Traefik
- Distribute requests across instances

### Caching

Consider caching tier info and CEO price in Redis with TTL:

```typescript
// In contract.service.ts
const cached = await redis.get('tier:PFP');
if (cached) return JSON.parse(cached);

// ... fetch from contract ...

await redis.setex('tier:PFP', 30, JSON.stringify(tierInfo));
```

## Production Best Practices

1. **Never expose private keys**
2. **Use environment variables for secrets**
3. **Enable HTTPS in production**
4. **Monitor backend wallet balance**
5. **Set up log aggregation (e.g., ELK, Datadog)**
6. **Configure alerts for errors**
7. **Regular security audits**
8. **Keep dependencies updated**
9. **Test on testnet first**
10. **Have rollback plan ready**

## Support

For issues or questions:
- Check logs first
- Review ARCHITECTURE.md for system design
- Test on local/testnet environment
- Contact development team

## Useful Commands

```bash
# Check all running services
docker-compose -f docker-compose.prod.yml ps

# View resource usage
docker stats rekt-ceo-backend

# Access Redis CLI
docker exec -it rekt-ceo-redis redis-cli

# Backup database
docker exec rekt-ceo-redis redis-cli BGSAVE

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Remove all and rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

