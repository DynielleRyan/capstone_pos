# 🚨 Force Railway to Use Docker (Buildkit Still Failing)

## The Problem
Railway is **still using buildkit** instead of Docker, even though we have a `Dockerfile` and `railway.toml`.

## ✅ Solution: Force Docker in Railway Dashboard

Railway dashboard settings can override `railway.toml`. You need to manually set it:

### Step 1: Go to Railway Dashboard
1. Open your Railway project
2. Click on your **backend service**

### Step 2: Change Builder to Docker
1. Click **Settings** tab
2. Scroll to **Build** section
3. Find **"Builder"** dropdown
4. Change it from **"Railpack"** or **"Nixpacks"** to **"Dockerfile"**
5. **Save** the settings

### Step 3: Clear Build Cache
1. Still in **Settings** → **Build**
2. Click **"Clear Build Cache"** button
3. Confirm

### Step 4: Redeploy
1. Go back to **Deployments** tab
2. Click **"Redeploy"** or **"Deploy"**
3. Watch the logs - it should now say "Using Dockerfile" instead of "Railpack"

---

## Alternative: If Builder Option Doesn't Exist

If you don't see a "Builder" dropdown:

### Option A: Delete and Recreate Service
1. **Backup your environment variables** (copy them somewhere)
2. Delete the current service
3. Create a new service from the same GitHub repo
4. Set **Root Directory** to `backend`
5. Railway should auto-detect the Dockerfile
6. Re-add all environment variables

### Option B: Use Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set builder to Dockerfile
railway variables set RAILWAY_BUILDER=DOCKERFILE
```

---

## Verify It's Working

After redeploying, check the build logs. You should see:
- ✅ "Using Dockerfile" or "Building with Docker"
- ✅ Docker build steps (FROM, COPY, RUN, etc.)
- ❌ NOT "Railpack" or "buildkit"

---

## If Still Failing

If Railway **still** tries to use buildkit after setting it to Dockerfile:

1. **Check railway.toml location**: It should be in `backend/railway.toml` (same directory as Dockerfile)
2. **Check Dockerfile name**: Must be exactly `Dockerfile` (capital D, no extension)
3. **Check Root Directory**: In Railway settings, Root Directory should be `backend`
4. **Contact Railway Support**: This might be a platform issue

---

## Quick Checklist

- [ ] Builder set to "Dockerfile" in Railway dashboard
- [ ] Build cache cleared
- [ ] `backend/Dockerfile` exists and is committed
- [ ] `backend/railway.toml` exists and is committed
- [ ] Root Directory is set to `backend` in Railway
- [ ] Redeployed after changes

---

**The key:** Railway dashboard settings override `railway.toml` in some cases. You MUST set the builder in the dashboard!
