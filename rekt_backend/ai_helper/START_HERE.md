# 🚀 START HERE - Quick Setup for Apple M2

## Current Status
- ✅ Docker 29.0.1 installed
- ❌ Docker Desktop not running
- ❌ Docker Compose not installed

---

## Step 1: Start Docker Desktop (1 minute)

```bash
# Open Docker Desktop
open -a Docker
```

**Wait for the whale icon 🐳 to appear in your menu bar (top right)**

When the icon stops animating, Docker is ready!

---

## Step 2: Install Docker Compose (30 seconds)

```bash
# Create directory
mkdir -p ~/.docker/cli-plugins

# Download for Apple Silicon M2
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-darwin-aarch64 -o ~/.docker/cli-plugins/docker-compose

# Make executable
chmod +x ~/.docker/cli-plugins/docker-compose

# Verify (should show version)
docker compose version
```

---

## Step 3: Start Redis (30 seconds)

```bash
# Go to backend folder
cd /Users/abhinilagarwal/Desktop/rekt_ceo_contracts/backend

# Start Redis
docker compose up -d

# Verify it's running
docker ps
```

**You should see a container running `redis:7-alpine`**

---

## Step 4: Test Redis (10 seconds)

```bash
# Connect to Redis
docker exec -it backend-redis-1 redis-cli

# Test (type these in Redis):
> PING
# Should return: PONG

> EXIT
```

---

## Step 5: Setup Backend (2 minutes)

```bash
# Still in backend folder

# Install dependencies (if not done)
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your values:
# - RPC_URL
# - BACKEND_PRIVATE_KEY
# - Contract addresses
# - PINATA_JWT
# - JWT_SECRET

# Start backend
pnpm dev
```

---

## ✅ Verify Everything Works

```bash
# Test backend health
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
      "balanceETH": "..."
    }
  }
}
```

---

## 🎯 Daily Workflow

### Starting Work
```bash
# 1. Make sure Docker Desktop is running (whale icon in menu bar)
# 2. Go to backend folder
cd /Users/abhinilagarwal/Desktop/rekt_ceo_contracts/backend

# 3. Start Redis (if not running)
docker compose up -d

# 4. Start backend
pnpm dev
```

### Stopping Work
```bash
# Stop backend: Ctrl+C in terminal

# Stop Redis
docker compose down
```

---

## 🐛 Quick Troubleshooting

### "docker: command not found"
```bash
# Docker not in PATH. Run:
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

### "Cannot connect to Docker daemon"
```bash
# Start Docker Desktop
open -a Docker
# Wait 30 seconds
```

### "docker compose: unknown command"
```bash
# Run Step 2 above to install Docker Compose
```

### "Port 6379 already in use"
```bash
# Stop whatever is using it
lsof -i :6379
kill -9 <PID>
```

---

## 📋 Essential Commands

```bash
# Start Redis
docker compose up -d

# Stop Redis
docker compose down

# View Redis logs
docker logs -f backend-redis-1

# Connect to Redis
docker exec -it backend-redis-1 redis-cli

# Restart Redis
docker compose restart

# Check running containers
docker ps

# Check backend health
curl http://localhost:3000/api/health
```

---

## 📚 Full Guides

- **Complete Setup:** [DOCKER_SETUP_M2.md](./DOCKER_SETUP_M2.md)
- **Docker & Redis Deep Dive:** [DOCKER_REDIS_GUIDE.md](./DOCKER_REDIS_GUIDE.md)
- **Quick Start:** [QUICK_START.md](./QUICK_START.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Need Help?

Run diagnostics:
```bash
docker version
docker compose version
docker ps
docker logs backend-redis-1
```

Check detailed guide: [DOCKER_SETUP_M2.md](./DOCKER_SETUP_M2.md)

