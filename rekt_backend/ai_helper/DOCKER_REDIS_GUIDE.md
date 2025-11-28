# Docker & Redis Setup Guide

## Table of Contents
1. [Why Docker?](#why-docker)
2. [Why Redis?](#why-redis)
3. [Installation](#installation)
4. [Basic Usage](#basic-usage)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Why Docker?

### Problem Without Docker

**Scenario 1: Different Environments**
```
Developer 1 Machine: Node 20.1, Redis 6.2, Ubuntu
Developer 2 Machine: Node 18.5, Redis 7.0, macOS
Production Server: Node 20.3, Redis 7.2, Linux

Result: "Works on my machine" syndrome 🤷‍♂️
```

**Scenario 2: Manual Installation Hell**
```bash
# Without Docker, you need to:
1. Install Node.js
2. Install Redis separately
3. Configure Redis
4. Start Redis manually
5. Set up environment
6. Hope everything works together
```

### Solution With Docker

Docker packages your application and all its dependencies into **containers** - isolated, reproducible environments.

**Benefits:**

1. **Consistency:** Same environment everywhere (dev, staging, production)
2. **Isolation:** Redis runs in its own container, won't conflict with other apps
3. **Easy Setup:** One command to start everything
4. **Portability:** Works on Windows, Mac, Linux identically
5. **Easy Cleanup:** Delete containers without affecting your system

### Real-World Example

```bash
# Without Docker:
1. Install Redis: brew install redis / apt-get install redis / choco install redis
2. Configure Redis
3. Start Redis: redis-server
4. Install Node dependencies
5. Configure environment
6. Start app

# With Docker:
docker-compose up -d
# Done! Redis + App running
```

---

## Why Redis?

Redis is an **in-memory data store** used for:

### 1. **Rate Limiting** (Primary Use)

**Problem:** Users spamming your API
```
User sends 1000 mint requests in 1 second
→ Backend overwhelmed
→ Gas costs explode
→ System crashes
```

**Solution with Redis:**
```javascript
// Redis tracks requests per user
Key: "rate:user:0x123"
Value: 3  // requests in last minute
TTL: 60 seconds

// If value > 3, reject request
if (requestCount > 3) {
  return "Too many requests, slow down!"
}
```

### 2. **SIWE Nonce Storage** (Security)

**The Flow:**
```
1. User: "I want to sign in"
2. Backend: Generates random nonce → Stores in Redis
   Key: "nonce:0x123"
   Value: "0xabc123random"
   TTL: 5 minutes (auto-delete after)

3. User: Signs message with nonce
4. Backend: Checks nonce exists in Redis → Verifies signature
5. Backend: Deletes nonce (single-use)
```

**Why Redis?** 
- Fast (in-memory)
- Auto-expiry (TTL)
- Prevents replay attacks

### 3. **Caching** (Performance)

**Without Cache:**
```
Every request → Call blockchain RPC
Response time: 500-2000ms
Cost: RPC calls add up
```

**With Redis Cache:**
```javascript
// Cache tier pricing for 30 seconds
Key: "tier:PFP"
Value: { priceUSD: "50", priceCEO: "88.18", ... }
TTL: 30 seconds

// First request: Fetch from blockchain → Store in Redis
// Next 30 seconds: Return from Redis (< 5ms)
```

### 4. **Queue Management** (Currently In-Memory, Optional Redis)

For higher loads, could use Redis to persist queue:
```javascript
// Store mint tasks in Redis list
Key: "mint:queue"
Value: ["task1", "task2", "task3"]

// Workers pop from queue
```

---

## Installation

### macOS

```bash
# Install Docker Desktop (includes Docker Compose)
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### Linux

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker-compose --version
```

### Windows

```bash
# Download Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop

# Or using Chocolatey:
choco install docker-desktop

# Verify in PowerShell/CMD
docker --version
docker-compose --version
```

---

## Basic Usage

### Option 1: Redis Only (Local Development)

**Start Redis:**
```bash
cd backend

# Start Redis container
docker-compose up -d

# Check status
docker-compose ps

# Output:
# NAME                COMMAND                  STATUS          PORTS
# rekt-ceo-redis      "redis-server..."        Up 2 minutes    0.0.0.0:6379->6379/tcp
```

**Run Backend Locally:**
```bash
# In another terminal
pnpm dev
```

**Stop Redis:**
```bash
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### Option 2: Full Stack (Production)

**Start Everything:**
```bash
cd backend

# Build and start backend + Redis
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

**Stop Everything:**
```bash
docker-compose -f docker-compose.prod.yml down
```

---

## Configuration

### Redis Configuration

#### 1. **Basic Setup (Already Done)**

Your `docker-compose.yml`:
```yaml
services:
  redis:
    image: redis:7-alpine        # Lightweight Redis v7
    ports:
      - "6379:6379"              # Expose on localhost:6379
    volumes:
      - redis_data:/data         # Persist data
    command: redis-server --appendonly yes  # Enable persistence
```

#### 2. **Advanced Redis Configuration**

Create `redis.conf`:
```bash
cd backend
cat > redis.conf << 'EOF'
# Network
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru  # Remove least recently used keys

# Persistence
appendonly yes
appendfsync everysec

# Security (if needed)
# requirepass your_strong_password

# Logging
loglevel notice
EOF
```

Update `docker-compose.yml`:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf  # Mount config
    command: redis-server /usr/local/etc/redis/redis.conf
```

#### 3. **Redis with Password**

**Enable password in Redis:**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass YOUR_STRONG_PASSWORD
    environment:
      - REDIS_PASSWORD=YOUR_STRONG_PASSWORD
```

**Update backend `.env`:**
```bash
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@localhost:6379
```

#### 4. **Production Redis Configuration**

For production, use a managed Redis service:

**Option A: Railway**
```bash
# https://railway.app/
1. Create new Redis service
2. Copy connection URL
3. Update .env:
REDIS_URL=redis://default:password@redis.railway.app:6379
```

**Option B: Redis Cloud** (Free 30MB)
```bash
# https://redis.com/try-free/
1. Create free database
2. Copy connection string
3. Update .env:
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

**Option C: AWS ElastiCache**
```bash
# https://aws.amazon.com/elasticache/
1. Create Redis cluster
2. Get endpoint
3. Update .env:
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

### Backend Configuration

Your backend already uses Redis via `ioredis`:

**Connection (src/services/auth.service.ts):**
```typescript
import Redis from 'ioredis';
import { config } from '../config';

const redis = new Redis(config.redisUrl);
// Automatically connects to REDIS_URL from .env
```

**Rate Limiting (src/middleware/rate-limit.ts):**
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(config.redisUrl);

export const mintLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  max: 3,           // 3 requests per minute
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});
```

---

## Docker Commands Cheat Sheet

### Container Management

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f redis
docker-compose logs -f backend

# Execute command in container
docker exec -it rekt-ceo-redis redis-cli

# Stop specific container
docker stop rekt-ceo-redis

# Remove container
docker rm rekt-ceo-redis
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi redis:7-alpine

# Pull image
docker pull redis:7-alpine

# Build image
docker build -t rekt-ceo-backend .

# Remove unused images
docker image prune
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect backend_redis_data

# Remove volume (deletes data!)
docker volume rm backend_redis_data

# Remove all unused volumes
docker volume prune
```

### Network

```bash
# List networks
docker network ls

# Inspect network
docker network inspect backend_rekt-ceo-network
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused (careful!)
docker system prune -a --volumes
```

---

## Redis Commands Cheat Sheet

### Connect to Redis

```bash
# From your machine
docker exec -it rekt-ceo-redis redis-cli

# If Redis has password
docker exec -it rekt-ceo-redis redis-cli -a YOUR_PASSWORD

# Remote Redis
redis-cli -h redis.example.com -p 6379 -a password
```

### Basic Commands

```bash
# Inside redis-cli:

# Check connection
PING
# Output: PONG

# Set key
SET mykey "Hello World"

# Get key
GET mykey
# Output: "Hello World"

# Set with expiry (5 seconds)
SETEX tempkey 5 "Temporary"

# Check if key exists
EXISTS mykey
# Output: 1 (exists) or 0 (doesn't exist)

# Delete key
DEL mykey

# Get all keys (careful in production!)
KEYS *

# Get keys matching pattern
KEYS nonce:*
KEYS rate:*

# Check time to live
TTL nonce:0x123
# Output: remaining seconds or -1 (no expiry) or -2 (doesn't exist)
```

### Monitor Your Backend's Redis Usage

```bash
# Connect to Redis
docker exec -it rekt-ceo-redis redis-cli

# Check nonces
KEYS nonce:*
GET nonce:0x1234567890abcdef

# Check rate limits
KEYS rate:*

# Monitor real-time commands
MONITOR
# Shows all commands being executed (exit with Ctrl+C)

# Get Redis info
INFO
INFO stats
INFO memory

# Get current database size
DBSIZE
```

### Debugging Backend Issues

```bash
# 1. Check if Redis is running
docker ps | grep redis

# 2. Check Redis logs
docker logs rekt-ceo-redis

# 3. Verify Redis connectivity
docker exec -it rekt-ceo-redis redis-cli PING

# 4. Check what backend is storing
docker exec -it rekt-ceo-redis redis-cli
> KEYS *
> GET nonce:0x123
> TTL nonce:0x123

# 5. Clear all data (development only!)
docker exec -it rekt-ceo-redis redis-cli FLUSHALL

# 6. Check Redis performance
docker exec -it rekt-ceo-redis redis-cli --latency
docker exec -it rekt-ceo-redis redis-cli --stat
```

---

## Troubleshooting

### Docker Issues

**Problem: "Cannot connect to Docker daemon"**
```bash
# Solution 1: Start Docker Desktop (Mac/Windows)
# Just open Docker Desktop app

# Solution 2: Start Docker service (Linux)
sudo systemctl start docker
sudo systemctl enable docker

# Solution 3: Check if Docker is running
docker ps
```

**Problem: "Port 6379 already in use"**
```bash
# Check what's using the port
lsof -i :6379
# Or on Linux:
sudo netstat -tlnp | grep 6379

# Solution 1: Stop local Redis
brew services stop redis  # macOS
sudo systemctl stop redis  # Linux

# Solution 2: Change port in docker-compose.yml
ports:
  - "6380:6379"  # Use 6380 on host
# Update .env:
REDIS_URL=redis://localhost:6380
```

**Problem: "Permission denied"**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo docker-compose up -d
```

### Redis Issues

**Problem: "Connection refused"**
```bash
# 1. Check if Redis container is running
docker ps

# 2. Check Redis logs
docker logs rekt-ceo-redis

# 3. Verify REDIS_URL in .env
echo $REDIS_URL

# 4. Test connection
docker exec -it rekt-ceo-redis redis-cli PING
```

**Problem: "Out of memory"**
```bash
# Check Redis memory
docker exec -it rekt-ceo-redis redis-cli INFO memory

# Solution: Increase maxmemory in redis.conf
maxmemory 512mb

# Or use LRU eviction
maxmemory-policy allkeys-lru
```

**Problem: "Data lost after restart"**
```bash
# Ensure persistence is enabled
command: redis-server --appendonly yes

# Check if volume exists
docker volume ls | grep redis

# Backup Redis data
docker exec rekt-ceo-redis redis-cli BGSAVE
docker cp rekt-ceo-redis:/data/dump.rdb ./backup.rdb
```

### Backend Connection Issues

**Problem: Backend can't connect to Redis**
```bash
# 1. Check REDIS_URL in .env
cat .env | grep REDIS_URL

# 2. Test connection from backend container
docker-compose -f docker-compose.prod.yml exec backend sh
# Inside container:
nc -zv redis 6379

# 3. Check if Redis is in same network
docker network inspect backend_rekt-ceo-network
```

---

## Quick Start Guide

### For Development

```bash
# 1. Clone and setup
cd backend
cp .env.example .env

# 2. Start Redis only
docker-compose up -d

# 3. Install dependencies
pnpm install

# 4. Run backend locally
pnpm dev

# Backend connects to Redis at localhost:6379
# Done! ✅
```

### For Production

```bash
# 1. Setup environment
cd backend
cp .env.example .env
# Edit .env with production values

# 2. Build and start everything
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check status
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f

# Done! ✅
# Backend: http://localhost:3000
# Redis: localhost:6379
```

---

## Summary

### Docker
- **Why:** Consistent environment, easy setup, isolation
- **How:** `docker-compose up -d` to start, `docker-compose down` to stop
- **When:** Development (Redis only) or Production (full stack)

### Redis
- **Why:** Rate limiting, nonce storage, caching, performance
- **How:** Runs in Docker container, backend connects via REDIS_URL
- **When:** Always needed - backend won't work without it

### Key Files
- `docker-compose.yml` - Development setup (Redis only)
- `docker-compose.prod.yml` - Production setup (Backend + Redis)
- `Dockerfile` - Backend container definition
- `.env` - Configuration (REDIS_URL, etc.)

### Most Common Commands
```bash
# Development
docker-compose up -d           # Start Redis
pnpm dev                       # Run backend

# Production
docker-compose -f docker-compose.prod.yml up -d --build

# Debug
docker logs rekt-ceo-redis    # Check Redis logs
docker exec -it rekt-ceo-redis redis-cli  # Connect to Redis
```

---

Need help? Check the logs first:
```bash
docker-compose logs -f
```

