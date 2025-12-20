# Simple Backend Deployment Guide

A step-by-step guide to deploy the backend with password-protected Redis.

## Prerequisites

- Docker and Docker Compose installed
- All required API keys and contract addresses ready

---

## Step 1: Set Up Environment Variables

1. **Create `.env` file** in the `rekt_backend` directory:

```bash
cd rekt_backend
touch .env
```

2. **Add these variables to `.env`** (replace with your actual values):

```bash
# Server
PORT=3000
NODE_ENV=production

# Blockchain
CHAIN_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
RPC_URL_FALLBACK=https://mainnet.base.org
BACKEND_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Contracts
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS
PINATA_JWT=YOUR_PINATA_JWT_TOKEN
PINATA_GATEWAY=https://gateway.pinata.cloud

# Authentication
JWT_SECRET=YOUR_32_CHARACTER_SECRET_KEY_HERE
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Redis Password (IMPORTANT: Use a strong password)
REDIS_PASSWORD=your_strong_redis_password_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
```

**Important:** 
- Generate a strong `REDIS_PASSWORD` (at least 16 characters)
- Generate a strong `JWT_SECRET` (at least 32 characters): `openssl rand -hex 32`

---

## Step 2: Deploy Redis with Password Protection

The `docker-compose.prod.yml` file is already configured to use password-protected Redis.

**Redis will automatically:**
- Use the password from `REDIS_PASSWORD` in your `.env` file
- Store data persistently
- Only expose port 6379 to localhost (not publicly accessible)

**No additional Redis setup needed** - it will be deployed automatically in Step 3.

---

## Step 3: Deploy Backend and Redis Together

1. **Build and start both services:**

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

This command will:
- Build the backend Docker image
- Start Redis with password protection
- Start the backend and connect it to Redis
- Run both services in the background

2. **Check if services are running:**

```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see both `rekt-ceo-backend` and `rekt-ceo-redis` running.

---

## Step 4: Verify Deployment

1. **Check backend health:**

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    ...
  }
}
```

2. **Check Redis connection:**

```bash
docker exec -it rekt-ceo-redis redis-cli -a YOUR_REDIS_PASSWORD PING
```

Should return: `PONG`

---

## Step 5: View Logs (Optional)

**View backend logs:**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

**View Redis logs:**
```bash
docker-compose -f docker-compose.prod.yml logs -f redis
```

**View all logs:**
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

## How Redis Connection Works

The backend automatically connects to Redis using the connection string built from your `.env` file:

- **Redis URL format:** `redis://:PASSWORD@redis:6379`
- The `docker-compose.prod.yml` file automatically creates this URL from `REDIS_PASSWORD`
- Both services are on the same Docker network, so they can communicate

**You don't need to manually configure the connection** - it's all handled automatically!

---

## Common Commands

**Stop services:**
```bash
docker-compose -f docker-compose.prod.yml down
```

**Restart services:**
```bash
docker-compose -f docker-compose.prod.yml restart
```

**Rebuild and restart (after code changes):**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

**Stop and remove everything (including data):**
```bash
docker-compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

**Backend won't start:**
- Check logs: `docker-compose -f docker-compose.prod.yml logs backend`
- Verify all environment variables are set correctly in `.env`
- Ensure Redis is running: `docker-compose -f docker-compose.prod.yml ps`

**Can't connect to Redis:**
- Verify `REDIS_PASSWORD` is set in `.env`
- Check Redis is running: `docker ps | grep redis`
- Test Redis: `docker exec -it rekt-ceo-redis redis-cli -a YOUR_PASSWORD PING`

**Port 3000 already in use:**
- Change `PORT` in `.env` to a different port (e.g., `3001`)
- Update the port mapping in `docker-compose.prod.yml` if needed

---

## Security Notes

✅ **Good practices:**
- Use strong passwords (16+ characters)
- Never commit `.env` file to git
- Redis port is only exposed to localhost (127.0.0.1)
- Backend and Redis communicate on private Docker network

⚠️ **For production:**
- Use HTTPS/TLS for the backend
- Set up firewall rules
- Monitor logs regularly
- Keep dependencies updated

---

That's it! Your backend and Redis are now deployed and connected.

