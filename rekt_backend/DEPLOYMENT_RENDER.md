# Render Deployment Guide

A step-by-step guide to deploy the backend and Redis on Render.

## Prerequisites

- Render account (sign up at https://render.com)
- GitHub repository with your code (or GitLab/Bitbucket)
- All required API keys and contract addresses ready

---

## Deployment Methods

You can deploy using one of two methods:

1. **Manual Setup (Dashboard)** - Step-by-step via Render dashboard (recommended for first-time setup)
2. **Infrastructure as Code (render.yaml)** - Automated setup using `render.yaml` file (see [Alternative: Using render.yaml](#alternative-using-renderyaml) section)

---

## Step 1: Prepare Your Repository

1. **Ensure your code is pushed to GitHub/GitLab/Bitbucket**
   - Make sure `package.json`, `tsconfig.json`, and all source files are committed
   - The `dist/` folder should be in `.gitignore` (it will be built on Render)

2. **Verify your build scripts in `package.json`:**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```

---

## Step 2: Create Redis Database on Render

1. **Go to Render Dashboard** → Click **"New +"** → Select **"Redis"**

2. **Configure Redis:**
   - **Name:** `rekt-ceo-redis` (or your preferred name)
   - **Region:** Choose closest to your backend region
   - **Plan:** 
     - **Free tier** for development/testing
     - **Starter** ($15/month) or higher for production
   - **Redis Version:** Latest (7.x recommended)
   - **Maxmemory Policy:** `allkeys-lru` (or your preference)

3. **Click "Create Redis"**

4. **After creation, copy the Redis connection details:**
   - **Internal Redis URL** (format: `redis://:PASSWORD@HOST:PORT`)
   - **External Redis URL** (if you need external access)
   - **Password** (save this securely)

   **Important:** Use the **Internal Redis URL** for your backend service (services on Render can communicate internally).

---

## Step 3: Create Web Service (Backend)

1. **Go to Render Dashboard** → Click **"New +"** → Select **"Web Service"**

2. **Connect your repository:**
   - Connect your GitHub/GitLab/Bitbucket account if not already connected
   - Select your repository: `rekt_ceo` (or your repo name)
   - Select the branch: `main` (or your production branch)

3. **Configure the service:**

   **Basic Settings:**
   - **Name:** `rekt-ceo-backend` (or your preferred name)
   - **Region:** Choose the same region as your Redis (for lower latency)
   - **Branch:** `main` (or your production branch)
   - **Root Directory:** `rekt_backend` (if your backend is in a subdirectory)
   - **Runtime:** `Node`
   - **Build Command:** `pnpm install && pnpm run build`
   - **Start Command:** `pnpm start` (or `node dist/index.js`)

   **Plan:**
   - **Free tier** for development/testing (spins down after inactivity)
   - **Starter** ($7/month) or higher for production (always-on)

4. **Environment Variables:**

   Click **"Advanced"** → **"Add Environment Variable"** and add all these variables:

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

   # Redis (Use the Internal Redis URL from Step 2)
   REDIS_URL=redis://:PASSWORD@HOST:PORT

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100

   # Logging
   LOG_LEVEL=warn
   ```

   **Important Notes:**
   - Replace all placeholder values with your actual values
   - For `REDIS_URL`, use the **Internal Redis URL** from your Redis database
   - Generate `JWT_SECRET`: `openssl rand -hex 32`
   - Use a strong Redis password (provided by Render)

5. **Advanced Settings (Optional):**

   **Health Check Path:** `/api/health`
   
   **Auto-Deploy:** Enable if you want automatic deployments on git push

6. **Click "Create Web Service"**

---

## Step 4: Configure Build Settings

If your backend is in a subdirectory (`rekt_backend`), you need to set the root directory:

1. Go to your **Web Service** settings
2. Under **"Settings"** → **"Build & Deploy"**
3. Set **"Root Directory"** to: `rekt_backend`
4. Save changes

---

## Step 5: Install pnpm (if needed)

Render's Node environment may not have `pnpm` by default. Add this to your build command:

**Option 1: Use corepack (Recommended)**
```bash
corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm run build
```

**Option 2: Install pnpm manually**
```bash
npm install -g pnpm && pnpm install && pnpm run build
```

**Update your Build Command in Render:**
- Go to your Web Service → Settings → Build & Deploy
- Update **Build Command** to one of the above options

---

## Step 6: Verify Deployment

1. **Check deployment logs:**
   - Go to your Web Service → **"Logs"** tab
   - Watch for successful build and startup messages
   - Look for: `🚀 Server running on port 3000`

2. **Test health endpoint:**
   ```bash
   curl https://your-service-name.onrender.com/api/health
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

3. **Test root endpoint:**
   ```bash
   curl https://your-service-name.onrender.com/
   ```

---

## Step 7: Update CORS Origin

After deployment, you'll get a Render URL like:
- `https://rekt-ceo-backend.onrender.com`

1. **Update CORS_ORIGIN** in your Web Service environment variables:
   - Add your frontend domain(s)
   - For multiple origins, you may need to update your CORS config in code

2. **If you need to allow multiple origins**, update `src/index.ts`:

```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [process.env.CORS_ORIGIN || '*'];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
```

Then set `CORS_ORIGIN` to comma-separated values:
```
CORS_ORIGIN=https://your-frontend.com,https://your-other-frontend.com
```

---

## Common Issues & Solutions

### Issue: Build fails with "pnpm: command not found"

**Solution:** Update your Build Command to include pnpm installation:
```bash
corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm run build
```

### Issue: Cannot connect to Redis

**Solutions:**
- Verify you're using the **Internal Redis URL** (not external)
- Check that Redis database is in the same region as your backend
- Ensure `REDIS_URL` environment variable is set correctly
- Check Redis logs in Render dashboard

### Issue: Port binding error

**Solution:** 
- Render automatically sets `PORT` environment variable
- Your code should use `process.env.PORT` (which it does)
- Don't hardcode port 3000 in your code

### Issue: Service spins down (Free tier)

**Solution:**
- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- Upgrade to Starter plan ($7/month) for always-on service

### Issue: Build timeout

**Solution:**
- Free tier has 10-minute build timeout
- Optimize your build (remove unnecessary dependencies)
- Consider upgrading plan for longer build times

### Issue: Environment variables not working

**Solution:**
- Verify all required variables are set in Render dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding/updating environment variables

---

## Updating Your Deployment

### Manual Deploy

1. Go to your Web Service → **"Manual Deploy"**
2. Select branch/commit
3. Click **"Deploy"**

### Automatic Deploy

- Enabled by default when connected to Git
- Deploys automatically on push to connected branch
- Can be disabled in Settings → Build & Deploy

### After Code Changes

1. Push changes to your repository
2. Render will automatically detect and deploy (if auto-deploy is enabled)
3. Monitor logs to verify successful deployment

---

## Monitoring & Logs

### View Logs

1. Go to your Web Service → **"Logs"** tab
2. View real-time logs
3. Filter by log level if needed

### Metrics

- View CPU, Memory, and Request metrics in the **"Metrics"** tab
- Monitor response times and error rates

### Alerts

- Set up email alerts for deployment failures
- Configure uptime monitoring

---

## Security Best Practices

✅ **Good practices:**
- Never commit `.env` files to git
- Use strong passwords and secrets
- Enable HTTPS (automatic on Render)
- Use Internal Redis URL (not exposed externally)
- Regularly update dependencies
- Monitor logs for suspicious activity

⚠️ **Production recommendations:**
- Use Starter plan or higher (always-on)
- Set up custom domain with SSL
- Configure firewall rules if needed
- Enable rate limiting (already configured)
- Use environment-specific secrets
- Regular security audits

---

## Cost Estimation

**Free Tier:**
- Web Service: Free (spins down after inactivity)
- Redis: Free (limited to 25MB)
- **Total: $0/month** (for development/testing)

**Starter Plan (Production):**
- Web Service: $7/month (always-on)
- Redis: $15/month (Starter plan)
- **Total: ~$22/month**

**Note:** Prices may vary. Check Render's current pricing.

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Configure CI/CD (if needed)
3. ✅ Set up monitoring and alerts
4. ✅ Test all API endpoints
5. ✅ Update frontend to use new backend URL

---

## Alternative: Using render.yaml

If you prefer infrastructure-as-code, you can use the included `render.yaml` file for automated deployment.

### Prerequisites

1. **Place `render.yaml` in your repository:**
   - If deploying from repo root: place `render.yaml` at the root
   - If deploying from `rekt_backend` subdirectory: place `render.yaml` in `rekt_backend/` (already included)
   - The file is currently in `rekt_backend/render.yaml`

2. **Update `render.yaml`** with your actual values:
   - Replace all `sync: false` values with actual secrets in Render dashboard
   - Update region if needed
   - Adjust plans (free/starter) based on your needs

### Deploy with render.yaml

1. **Go to Render Dashboard** → Click **"New +"** → Select **"Blueprint"**

2. **Connect your repository:**
   - Select your repository
   - Render will automatically detect `render.yaml`

3. **Review configuration:**
   - Render will show all services and databases to be created
   - Verify settings match your requirements

4. **Set secrets:**
   - You'll need to set all `sync: false` environment variables manually
   - Go to each service → Environment → Add variables

5. **Click "Apply"** to create all resources

### Benefits of render.yaml

- ✅ Version-controlled infrastructure
- ✅ Repeatable deployments
- ✅ Easy to recreate in different environments
- ✅ Automatic linking between services

### Note

Even with `render.yaml`, you still need to manually set secret environment variables (marked with `sync: false`) in the Render dashboard for security.

---

## Support

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Render Community:** https://community.render.com
- **render.yaml Reference:** https://render.com/docs/yaml-spec

---

That's it! Your backend is now deployed on Render! 🚀

