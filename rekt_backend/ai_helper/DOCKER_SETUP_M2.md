# Docker Setup for Apple M2 (arm64)

## ✅ Current Status
- **Docker Version:** 29.0.1
- **Architecture:** arm64 (Apple Silicon M2)
- **Status:** Docker installed but daemon not running

---

## 🚀 Step 1: Start Docker Desktop

### Open Docker Desktop App

```bash
# Option 1: Open from Applications
open -a Docker

# Option 2: Use Spotlight
# Press Cmd+Space, type "Docker", press Enter
```

### Wait for Docker to Start

You'll see a **whale icon** 🐳 in your macOS menu bar (top right)

**Initial startup takes 30-60 seconds**

When ready, the whale icon will stop animating.

### Verify Docker is Running

```bash
# This should now work without errors
docker info

# Should show something like:
# Server Version: 29.0.1
# Operating System: Docker Desktop
# OSType: linux
# Architecture: aarch64
# CPUs: 8
# Total Memory: 7.654GiB
```

---

## 📦 Step 2: Install Docker Compose

Docker Compose is needed to run multi-container applications (like our backend + Redis).

### Install Docker Compose Plugin

```bash
# Create plugin directory
mkdir -p ~/.docker/cli-plugins

# Download Docker Compose for Apple Silicon
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-darwin-aarch64 -o ~/.docker/cli-plugins/docker-compose

# Make it executable
chmod +x ~/.docker/cli-plugins/docker-compose

# Verify installation
docker compose version
```

**Expected output:**
```
Docker Compose version v2.24.5
```

### Alternative: Install with Homebrew

```bash
brew install docker-compose

# Verify
docker-compose version
```

---

## 🔑 Step 3: Docker Hub Login (Optional but Recommended)

Docker Hub has rate limits for anonymous users. Login to avoid hitting limits.

### Create Docker Hub Account (Free)

1. Go to: https://hub.docker.com/signup
2. Sign up with email
3. Verify your email

### Login from Terminal

```bash
docker login

# Enter your Docker Hub username and password when prompted
# Username: your_dockerhub_username
# Password: your_dockerhub_password
```

**Success message:**
```
Login Succeeded

Logging in with your password grants your terminal complete access to your account.
For better security, log in with a limited-privilege personal access token.
```

### Check Login Status

```bash
docker info | grep -i username
# Output: Username: your_dockerhub_username
```

---

## 🐳 Step 4: Test Docker Setup

### Test 1: Run Hello World

```bash
docker run hello-world
```

**Expected output:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### Test 2: Check Available Images

```bash
docker images
```

### Test 3: Pull Redis Image

```bash
# Pull Redis for Apple Silicon
docker pull redis:7-alpine

# Verify
docker images | grep redis
# Should show: redis  7-alpine  ...  (arm64)
```

---

## 🎯 Step 5: Start Redis for Backend

Now you can start Redis for your Rekt CEO backend!

### Navigate to Backend Folder

```bash
cd /Users/abhinilagarwal/Desktop/rekt_ceo_contracts/backend
```

### Start Redis with Docker Compose

```bash
# Start Redis in detached mode
docker compose up -d

# Or if using standalone docker-compose:
docker-compose up -d
```

**Expected output:**
```
[+] Running 2/2
 ✔ Network backend_default       Created
 ✔ Container backend-redis-1     Started
```

### Verify Redis is Running

```bash
# Check running containers
docker ps

# Should show:
# CONTAINER ID   IMAGE          COMMAND                  PORTS                    NAMES
# abc123...      redis:7-alpine "redis-server..."        0.0.0.0:6379->6379/tcp   backend-redis-1
```

### Test Redis Connection

```bash
# Connect to Redis CLI
docker exec -it backend-redis-1 redis-cli

# Inside Redis CLI, test:
> PING
PONG

> SET test "Hello from M2"
OK

> GET test
"Hello from M2"

> EXIT
```

---

## 🔧 Configuration (If Needed)

### Redis Configuration File

If you need custom Redis settings, create `redis.conf`:

```bash
cd /Users/abhinilagarwal/Desktop/rekt_ceo_contracts/backend

cat > redis.conf << 'EOF'
# Redis Configuration for Apple Silicon M2

# Network
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfsync everysec

# Security (optional - set password)
# requirepass your_strong_password_here

# Logging
loglevel notice
logfile ""

# Apple Silicon Optimizations
save 900 1
save 300 10
save 60 10000
EOF
```

### Use Custom Config in docker-compose.yml

Update your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    platform: linux/arm64/v8  # Explicit ARM64
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped

volumes:
  redis_data:
```

### If Using Redis Password

Update `.env` file:

```bash
# If you set requirepass in redis.conf
REDIS_URL=redis://:your_password_here@localhost:6379

# Without password (default)
REDIS_URL=redis://localhost:6379
```

---

## 📋 Essential Docker Commands for M2

### Container Management

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Start containers
docker compose up -d          # With compose plugin
docker-compose up -d          # With standalone compose

# Stop containers
docker compose down
docker-compose down

# Restart containers
docker compose restart
docker-compose restart

# View logs
docker compose logs -f redis
docker-compose logs -f redis

# Or directly:
docker logs -f backend-redis-1

# Execute command in running container
docker exec -it backend-redis-1 redis-cli
docker exec -it backend-redis-1 sh

# Stop specific container
docker stop backend-redis-1

# Remove container
docker rm backend-redis-1

# Remove container with volumes
docker rm -v backend-redis-1
```

### Image Management

```bash
# List images
docker images

# Pull image (M2-optimized)
docker pull --platform linux/arm64 redis:7-alpine

# Remove image
docker rmi redis:7-alpine

# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a
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

### System Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused (careful!)
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Apple Silicon Specific

```bash
# Check architecture
docker version | grep -i arch

# Pull multi-platform image
docker pull --platform linux/arm64/v8 redis:7-alpine

# Run with explicit platform
docker run --platform linux/arm64/v8 redis:7-alpine

# Build for Apple Silicon
docker build --platform linux/arm64/v8 -t myapp .
```

---

## 🚨 Troubleshooting M2-Specific Issues

### Issue 1: "no matching manifest for linux/arm64/v8"

**Problem:** Image doesn't support Apple Silicon

**Solution:**
```bash
# Try different tags or alpine versions
docker pull redis:7-alpine  # Usually works
docker pull redis:alpine    # Latest alpine
docker pull redis:latest    # Might be x86 only
```

### Issue 2: Docker Daemon Not Running

**Solution:**
```bash
# Start Docker Desktop
open -a Docker

# Wait for whale icon in menu bar
# Then verify:
docker info
```

### Issue 3: "Cannot connect to Docker daemon"

**Check:**
```bash
# 1. Is Docker Desktop running?
ps aux | grep Docker

# 2. Check Docker context
docker context ls

# 3. Reset to default context
docker context use default

# 4. Restart Docker Desktop
killall Docker && open -a Docker
```

### Issue 4: Slow Performance

**Solution:**
```bash
# 1. Allocate more resources in Docker Desktop
# Docker Desktop → Settings → Resources
# - CPUs: 4-6 (default is good)
# - Memory: 4-6 GB
# - Swap: 1 GB

# 2. Enable VirtioFS (faster file sharing)
# Docker Desktop → Settings → General
# ✓ Use VirtioFS file sharing

# 3. Use volumes instead of bind mounts
# Volumes are faster on M2
```

### Issue 5: Port Already in Use

```bash
# Check what's using port 6379
lsof -i :6379

# Kill process using port
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "6380:6379"  # Use 6380 on host

# Update .env
REDIS_URL=redis://localhost:6380
```

---

## 🎯 Quick Start for Rekt CEO Backend

### Complete Setup in 5 Commands

```bash
# 1. Start Docker Desktop (if not running)
open -a Docker && sleep 10

# 2. Navigate to backend
cd /Users/abhinilagarwal/Desktop/rekt_ceo_contracts/backend

# 3. Start Redis
docker compose up -d

# 4. Verify Redis
docker ps && docker exec -it backend-redis-1 redis-cli PING

# 5. Run backend
pnpm dev
```

### Verify Everything Works

```bash
# 1. Check Docker
docker --version
# Output: Docker version 29.0.1, build 1234567

# 2. Check Compose
docker compose version
# Output: Docker Compose version v2.24.5

# 3. Check Redis
docker ps | grep redis
# Should show running redis container

# 4. Test Redis
docker exec -it backend-redis-1 redis-cli PING
# Output: PONG

# 5. Check Backend
curl http://localhost:3000/api/health
# Should return: {"success":true,"data":{...}}
```

---

## 📚 Additional Resources

### Docker Desktop Settings for M2

**Recommended Settings:**
- **General:**
  - ✓ Use VirtioFS file sharing
  - ✓ Use Rosetta for x86_64/amd64 emulation (if needed)
  
- **Resources:**
  - CPUs: 4-6 cores
  - Memory: 4-6 GB
  - Swap: 1 GB
  - Virtual disk limit: 64 GB

- **Docker Engine:**
  ```json
  {
    "builder": {
      "gc": {
        "defaultKeepStorage": "20GB",
        "enabled": true
      }
    },
    "experimental": false,
    "features": {
      "buildkit": true
    }
  }
  ```

### Useful Docker Desktop Features

1. **Dashboard:** Click whale icon → Dashboard
   - View running containers
   - See logs
   - Start/stop containers
   - Inspect volumes

2. **Dev Environments:** For full development setup

3. **Extensions:** Add tools like Disk usage analyzer

### Learning Resources

- **Official Docs:** https://docs.docker.com/desktop/install/mac-install/
- **Docker Compose:** https://docs.docker.com/compose/
- **Redis:** https://redis.io/docs/

---

## ✅ Checklist

- [ ] Docker Desktop installed and running
- [ ] Docker Compose installed and working
- [ ] Docker Hub account created (optional)
- [ ] Logged into Docker Hub (optional)
- [ ] Redis image pulled successfully
- [ ] Redis container running
- [ ] Can connect to Redis via CLI
- [ ] Backend `.env` configured
- [ ] Backend connects to Redis
- [ ] Health check returns success

---

## 🆘 Still Having Issues?

```bash
# Collect diagnostic info
echo "=== Docker Version ==="
docker version

echo -e "\n=== Docker Info ==="
docker info

echo -e "\n=== Docker Compose ==="
docker compose version || docker-compose version

echo -e "\n=== Running Containers ==="
docker ps

echo -e "\n=== Docker Images ==="
docker images

echo -e "\n=== Docker Volumes ==="
docker volume ls

echo -e "\n=== System Architecture ==="
uname -m
```

Send this output for debugging!

---

## 🎉 You're Ready!

Once you see:
- ✅ Docker Desktop running (whale icon in menu bar)
- ✅ `docker compose version` working
- ✅ Redis container running (`docker ps`)
- ✅ Can connect to Redis (`docker exec -it backend-redis-1 redis-cli PING`)

You're all set to run your Rekt CEO backend! 🚀

