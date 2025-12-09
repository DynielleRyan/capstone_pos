# 🚨 Railway Buildkit Error Fix

## The Error
```
Build Failed: build daemon returned an error < listing workers for Build: failed to list workers: Unavailable: connection error: desc = "transport: Error while dialing: dial unix /writeable/merged/run/buildkit/buildkitd.sock: connect: connection refused" >
```

This is a **Railway infrastructure issue**, not a code problem. The buildkit daemon (Railway's build system) is having connection issues.

---

## 🔧 Quick Fixes (Try in Order)

### Fix 1: Retry the Build (Most Common Solution)
1. Go to Railway dashboard
2. Click on your service
3. Click **"Redeploy"** or **"Deploy"** again
4. This often resolves temporary buildkit daemon issues

### Fix 2: Create `railway.toml` Configuration
Create a `railway.toml` file in your `backend/` directory to help Railway detect your build correctly:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"
startCommand = "npm start"

[deploy]
startCommand = "npm start"
```

### Fix 3: Check Railway Status
1. Visit: https://status.railway.app
2. Check if there are any ongoing incidents
3. If yes, wait for Railway to resolve it

### Fix 4: Clear Build Cache
1. In Railway dashboard → Your service
2. Go to **Settings** → **Build**
3. Click **"Clear Build Cache"**
4. Redeploy

### Fix 5: Force Nixpacks Builder
If Railway is using Railpack (v0.15.1), try forcing Nixpacks:
1. In Railway dashboard → Your service
2. Go to **Settings** → **Build**
3. Set **Builder** to **"Nixpacks"** (instead of Railpack)
4. Redeploy

### Fix 6: Simplify Build Process
Temporarily modify your build to be simpler:
1. Ensure `package.json` has correct build scripts
2. Make sure `tsconfig.json` is valid
3. Check that all dependencies are listed in `package.json` (not just devDependencies)

---

## 🔍 Verify Your Configuration

### Check `backend/package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Check `backend/tsconfig.json`:
- Should compile without errors
- `outDir` should be `"./dist"`
- `rootDir` should be `"./src"`

---

## 🆘 If Nothing Works

### Option A: Contact Railway Support
1. Go to Railway dashboard
2. Click **Help** → **Support**
3. Include the full error message
4. Mention it's a buildkit daemon connection error

### Option B: Try Alternative Deployment
- **Render.com**: Similar to Railway, free tier available
- **Fly.io**: Good for Node.js apps
- **Heroku**: Classic option (paid now)

### Option C: Use Docker
If Railway continues to have issues, you can use Docker:
1. Create a `Dockerfile` in `backend/`
2. Railway will use Docker instead of buildkit

---

## 📝 Prevention Tips

1. **Keep builds simple**: Avoid complex build steps
2. **Use exact versions**: Pin dependency versions in `package-lock.json`
3. **Monitor Railway status**: Check before deploying
4. **Have a backup plan**: Know alternative deployment options

---

## ✅ Success Checklist

After applying fixes, verify:
- [ ] Build completes without errors
- [ ] Service starts successfully
- [ ] Health endpoint responds: `/api/health`
- [ ] Environment variables are set correctly

---

## 🎯 Most Likely Solution

**90% of the time, this is fixed by:**
1. Clicking **"Redeploy"** in Railway dashboard
2. Waiting 2-3 minutes
3. If it fails again, try Fix 2 (create `railway.toml`)

This error is usually temporary and Railway's infrastructure issue, not your code!
