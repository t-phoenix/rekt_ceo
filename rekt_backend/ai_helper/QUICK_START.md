# Quick Start Guide - Rekt CEO Backend

## 🎯 Goal
Get the backend running in 5 minutes!

---

## ⚡ Super Quick Start

```bash
# 1. Go to backend folder
cd backend

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env

# 4. Start Redis (in Docker)
docker-compose up -d

# 5. Run backend
pnpm dev

# ✅ Done! Backend running at http://localhost:3000
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                        │
│                    (Frontend Application)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    YOUR BACKEND API                          │
│                   (Node.js + Express)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Minting    │  │   Info       │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌─────────┐      ┌──────────────┐   ┌──────────────┐
    │  REDIS  │      │     IPFS     │   │  BLOCKCHAIN  │
    │ (Docker)│      │   (Pinata)   │   │   (Base)     │
    └─────────┘      └──────────────┘   └──────────────┘
     localhost:6379   api.pinata.cloud   RPC URL
```

---

## 🐳 Docker: What & Why?

### What is Docker?
Think of Docker like a **shipping container** for your app:
- Everything your app needs is inside the container
- Works the same everywhere (your laptop, server, cloud)
- Isolated from other apps

### Why Use Docker for Redis?

**Without Docker:**
```bash
# Install Redis on your machine
brew install redis              # macOS
apt-get install redis          # Linux
choco install redis            # Windows

# Configure it
# Start it manually
# Hope it doesn't conflict with other stuff
```

**With Docker:**
```bash
docker-compose up -d
# Done! Redis running in isolated container
```

### Visual: Docker Containers

```
┌─────────────────────────────────────────┐
│          YOUR COMPUTER                  │
│                                         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │   Container  │   │   Container  │  │
│  │              │   │              │  │
│  │    Redis     │   │   Backend    │  │
│  │    (6379)    │   │    (3000)    │  │
│  │              │   │              │  │
│  └──────────────┘   └──────────────┘  │
│         ▲                   ▲          │
│         │                   │          │
│         └───── Network ─────┘          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔴 Redis: What & Why?

### What is Redis?
Redis = **Remote Dictionary Server**
- Super fast in-memory database
- Stores key-value pairs
- Auto-expires data (TTL = Time To Live)

### Why Your Backend Needs Redis?

#### 1. **Rate Limiting** (Stop Spam)

```javascript
// Without Redis:
User sends 1000 requests/second → Backend crashes 💥

// With Redis:
Redis tracks: "user:0x123 sent 3 requests"
If > 3 requests/minute → Reject with "Too many requests"
```

#### 2. **SIWE Nonces** (Security)

```javascript
// Login flow:
1. User: "I want to sign in"
2. Backend: Generates nonce → Stores in Redis (5 min TTL)
   Key: "nonce:0x123"
   Value: "random_0xabc"

3. User: Signs message with nonce
4. Backend: Verifies nonce from Redis → Deletes it
5. Prevents replay attacks ✅
```

#### 3. **Caching** (Speed)

```javascript
// Without cache:
Get NFT price → Call blockchain → 500ms delay

// With Redis cache:
Get NFT price → Check Redis → 5ms response
(Cache expires after 30 seconds)
```

### Redis in Action

```bash
# Start Redis
docker-compose up -d

# Connect to Redis
docker exec -it rekt-ceo-redis redis-cli

# Inside Redis:
> PING
PONG

> SET mykey "Hello"
OK

> GET mykey
"Hello"

> KEYS *
1) "mykey"
```

---

## 🚀 Development Workflow

### Option 1: Local Backend + Docker Redis (Recommended)

```bash
# Terminal 1: Start Redis
cd backend
docker-compose up -d

# Terminal 2: Run backend
pnpm dev

# Terminal 3: Watch logs
docker logs -f rekt-ceo-redis
```

**When to use:** Daily development, debugging, testing

### Option 2: Everything in Docker

```bash
# Build and start everything
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**When to use:** Testing production build, deployment

---

## 🔧 Configuration

### 1. Environment Variables (.env)

```bash
# Copy template
cp .env.example .env

# Edit with your values
vim .env
```

**Required Variables:**
```bash
# Blockchain
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
BACKEND_PRIVATE_KEY=0x...  # Wallet with APPROVER_ROLE

# Contracts (after deployment)
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS
PINATA_JWT=eyJ...  # From pinata.cloud

# Security
JWT_SECRET=your_32_character_secret_key_here

# Redis (already configured)
REDIS_URL=redis://localhost:6379
```

### 2. Redis Configuration

**Default (docker-compose.yml):**
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

**With Password (production):**
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass YOUR_PASSWORD
```

Then update `.env`:
```bash
REDIS_URL=redis://:YOUR_PASSWORD@localhost:6379
```

---

## 🧪 Testing It Works

### 1. Check Backend Health

```bash
curl http://localhost:3000/api/health
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "backendWallet": {
      "address": "0x...",
      "balanceETH": "0.5"
    }
  }
}
```

### 2. Test Authentication

```bash
# Get nonce
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "nonce": "0x1234567890abcdef"
  }
}
```

### 3. Check Redis

```bash
# Connect to Redis
docker exec -it rekt-ceo-redis redis-cli

# Check stored nonce
KEYS nonce:*
GET nonce:0x742d35cc6634c0532925a3b844bc9e7595f0beb
```

### 4. Test Pricing Endpoint

```bash
curl http://localhost:3000/api/info/pricing/PFP
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Mac/Windows: Open Docker Desktop app

# Linux: Start Docker service
sudo systemctl start docker
```

### Issue 2: "Port 6379 already in use"

**Solution:**
```bash
# Check what's using it
lsof -i :6379

# Stop local Redis if running
brew services stop redis  # macOS
sudo systemctl stop redis  # Linux

# Or change port in docker-compose.yml
ports:
  - "6380:6379"
```

### Issue 3: "Backend can't connect to Redis"

**Check:**
```bash
# 1. Is Redis running?
docker ps | grep redis

# 2. Check Redis logs
docker logs rekt-ceo-redis

# 3. Test connection
docker exec -it rekt-ceo-redis redis-cli PING
# Should return: PONG

# 4. Verify REDIS_URL in .env
cat .env | grep REDIS_URL
```

### Issue 4: "Invalid configuration"

**Solution:**
```bash
# Backend validates .env on startup
# Check the error message and fix the missing/invalid variable

# Common issues:
# - Contract addresses not set
# - Invalid private key format (must be 0x + 64 hex chars)
# - Missing Pinata JWT
# - Invalid RPC URL
```

---

## 📝 Essential Commands

### Docker
```bash
# Start Redis
docker-compose up -d

# Stop Redis
docker-compose down

# View logs
docker logs -f rekt-ceo-redis

# Connect to Redis
docker exec -it rekt-ceo-redis redis-cli

# Restart Redis
docker-compose restart redis

# Remove all (including data)
docker-compose down -v
```

### Backend
```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Lint
pnpm lint

# Format
pnpm format
```

### Redis CLI
```bash
# Connect
docker exec -it rekt-ceo-redis redis-cli

# Basic commands
PING                    # Test connection
KEYS *                  # List all keys
GET key                 # Get value
SET key value           # Set value
DEL key                 # Delete key
TTL key                 # Check expiry
FLUSHALL                # Clear everything (dev only!)
```

---

## 🎓 Learn More

- **Docker Guide:** [DOCKER_REDIS_GUIDE.md](./DOCKER_REDIS_GUIDE.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Dependencies:** [DEPENDENCIES.md](./DEPENDENCIES.md)

---

## 🆘 Still Stuck?

1. Check logs: `docker-compose logs -f`
2. Verify Redis: `docker exec -it rekt-ceo-redis redis-cli PING`
3. Test backend: `curl http://localhost:3000/api/health`
4. Read error messages carefully - they tell you what's wrong!
5. Check all environment variables in `.env`

**Most common issue:** Missing or invalid `.env` variables!

---

## ✅ Checklist

Development Ready:
- [ ] Docker installed and running
- [ ] Redis container running (`docker ps`)
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env` configured with required values
- [ ] Backend starts without errors (`pnpm dev`)
- [ ] Health endpoint returns success
- [ ] Can connect to Redis CLI

Production Ready:
- [ ] All development items ✅
- [ ] Backend wallet has APPROVER_ROLE
- [ ] Backend wallet has ETH for gas
- [ ] Strong JWT_SECRET set
- [ ] Production CORS_ORIGIN set
- [ ] RPC URLs configured with fallback
- [ ] Pinata account with sufficient storage

