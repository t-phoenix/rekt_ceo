# Rekt CEO Backend API

Minimal, secure backend for gasless NFT minting on Aptos blockchain.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Configuration section)

# Start Redis
docker-compose up -d

# Start development server
npm run dev

# Server runs at http://localhost:3000
```

---

## API Endpoints

### Authentication

**Get Nonce**
```bash
POST /api/auth/nonce
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Verify Signature**
```bash
POST /api/auth/verify
Content-Type: application/json

{
  "message": "Sign in to Rekt CEO...",
  "signature": "0xabc..."
}

# Returns JWT token
```

### Information

**Get Pricing**
```bash
GET /api/info/pricing/:nftType
# nftType = "PFP" or "MEME"

# Example
curl http://localhost:3000/api/info/pricing/PFP
```

**Get User Info**
```bash
GET /api/info/user/:address

# Example
curl http://localhost:3000/api/info/user/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Get CEO Token Price**
```bash
GET /api/info/ceo-price

curl http://localhost:3000/api/info/ceo-price
```

### Minting

**Initiate Mint**
```bash
POST /api/mint/initiate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "nftType": "PFP",
  "imageData": "data:image/png;base64,iVBORw0KG...",
  "permitSignature": {
    "owner": "0x742d35Cc...",
    "spender": "0xMinterContract...",
    "value": "88183421516754176610",
    "deadline": 1704182400,
    "v": 27,
    "r": "0xabc...",
    "s": "0xdef..."
  }
}
```

### Health Check

```bash
GET /api/health

curl http://localhost:3000/api/health
```

---

## Configuration

### Development Setup

1. **Create `.env` file:**
```bash
cp .env.example .env
```

2. **Configure required variables in `.env`:**

```bash
# Server
PORT=3000
NODE_ENV=development

# Blockchain - Get from Alchemy/Infura
CHAIN_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
RPC_URL_FALLBACK=https://mainnet.base.org  # Optional

# Backend Wallet - Must have APPROVER_ROLE
BACKEND_PRIVATE_KEY=0x1234567890abcdef...

# Smart Contract Addresses - From deployment
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS - Get from Pinata
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY=https://gateway.pinata.cloud

# Authentication
JWT_SECRET=your_32_character_secret_key_here_min_32_chars
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3001

# Redis
REDIS_URL=redis://localhost:6379

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging (Optional)
LOG_LEVEL=info
```

### Production Setup

**Changes for Production:**

1. **Update `.env` for production:**
```bash
NODE_ENV=production
CORS_ORIGIN=https://rektceo.club
REDIS_URL=redis://:password@redis:6379
LOG_LEVEL=warn
```

2. **Use production RPC URLs:**
```bash
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_PRODUCTION_KEY
RPC_URL_FALLBACK=https://base.llamarpc.com
```

3. **Secure Redis:**
```bash
# Update docker-compose.prod.yml
redis:
  command: redis-server --requirepass YOUR_STRONG_PASSWORD

# Update REDIS_URL in .env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@redis:6379
```

4. **Use strong secrets:**
```bash
# Generate strong JWT secret
JWT_SECRET=$(openssl rand -hex 32)
```

---

## Required API Keys

### 1. **Alchemy RPC** (Required)
- **Get from:** https://www.alchemy.com/
- **Usage:** Blockchain RPC connection
- **Used in:** `RPC_URL` and `RPC_URL_FALLBACK`
- **Free tier:** 300M compute units/month

### 2. **Pinata IPFS** (Required)
- **Get from:** https://www.pinata.cloud/
- **Usage:** Store NFT images and metadata
- **Used in:** `PINATA_JWT`
- **Free tier:** 1GB storage, 100GB bandwidth/month

### 3. **Backend Private Key** (Required)
- **Generate:** Use MetaMask or ethers.js
- **Usage:** Execute minting transactions (pays gas)
- **Requirements:**
  - Must have APPROVER_ROLE in MinterContract
  - Must have ETH for gas fees (~0.01-0.05 ETH per mint)
- **Security:** NEVER commit to git, use environment variables only

### 4. **JWT Secret** (Required)
- **Generate:** `openssl rand -hex 32`
- **Usage:** Sign authentication tokens
- **Minimum:** 32 characters

---

## Troubleshooting

### Port 6379 already in use
```bash
# Stop whatever is using it
lsof -i :6379
kill -9 <PID>

# Or stop local Redis
brew services stop redis  # macOS
sudo systemctl stop redis  # Linux
```

### Cannot connect to Docker
```bash
# Start Docker Desktop (macOS/Windows)
open -a Docker

# Start Docker service (Linux)
sudo systemctl start docker
```

### Backend can't connect to Redis
```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it rekt_ceo-redis redis-cli PING
# Should return: PONG
```

### Invalid configuration error
Check that all required environment variables are set correctly:
- Contract addresses must be 42 chars (0x + 40 hex)
- Private key must be 66 chars (0x + 64 hex)
- RPC URLs must be valid URLs
- JWT secret must be at least 32 characters

---

## Documentation

- **[ARCHITECTURE.md](./ai_helper/ARCHITECTURE.md)** - System design and flow
- **[QUICK_START.md](./ai_helper/QUICK_START.md)** - Detailed setup guide
- **[DEPLOYMENT.md](./ai_helper/DEPLOYMENT.md)** - Production deployment

---

## Tech Stack

- **Node.js** + **TypeScript** - Runtime and language
- **Express** - Web framework
- **Redis** - Caching and rate limiting
- **ethers.js** - Blockchain interaction
- **Pinata** - IPFS storage
- **Docker** - Redis containerization

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

---

## License

MIT
