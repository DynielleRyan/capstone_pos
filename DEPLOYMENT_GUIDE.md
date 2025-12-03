# Deployment Guide: Railway (Backend) + Vercel (Frontend)

This guide will walk you through deploying your Pharmacy PoS system to production.

## 📋 Prerequisites

- GitHub account (your code should be in a repository)
- Railway account (sign up at [railway.app](https://railway.app))
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project with your database set up

---

## 🚂 Part 1: Deploy Backend on Railway

### Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub. Railway will connect to your repository.

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository (`Capstone_PoS`)
5. Railway will detect your project

### Step 3: Configure Backend Service

1. After connecting, Railway might create a service automatically
2. If not, click **"New Service"** → **"GitHub Repo"** → Select your repo
3. In the service settings:
   - **Root Directory**: Set to `backend`
   - **Build Command**: Railway will auto-detect, but ensure it's `npm run build`
   - **Start Command**: Should be `npm start`

### Step 4: Set Environment Variables

In Railway dashboard, go to your service → **Variables** tab, and add:

```
PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5179,https://your-frontend.vercel.app
```

**Important Notes:**
- Get these values from your Supabase project dashboard
- `ALLOWED_ORIGINS` should include your Vercel URL (you'll add this after deploying frontend)
- For now, you can leave the Vercel URL out and add it later

### Step 5: Deploy

1. Railway will automatically start building and deploying
2. Watch the build logs to ensure everything compiles correctly
3. Once deployed, Railway will provide a URL like: `https://your-app.railway.app`

### Step 6: Test Your Backend

1. Visit: `https://your-app.railway.app/api/health`
   - Should return: `{"message":"API is running","status":"healthy",...}`
2. Visit: `https://your-app.railway.app/api/test-db`
   - Should return database connection status

### Step 7: Get Your Backend URL

Copy your Railway backend URL. It will look like:
```
https://your-backend-name.railway.app
```

**Save this URL** - you'll need it for the frontend deployment!

---

## ⚡ Part 2: Deploy Frontend on Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select your repository (`Capstone_PoS`)

### Step 2: Configure Frontend Project

In the project configuration:

1. **Framework Preset**: Vercel should auto-detect "Vite"
2. **Root Directory**: Set to `frontend`
3. **Build Command**: Should be `npm run build` (auto-detected)
4. **Output Directory**: Should be `dist` (auto-detected)
5. **Install Command**: `npm install`

### Step 3: Set Environment Variables

Before deploying, add these environment variables in Vercel:

Go to **Settings** → **Environment Variables** and add:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend.railway.app/api
```

**Important:**
- Replace `https://your-backend.railway.app/api` with your actual Railway backend URL from Part 1, Step 7
- Make sure to add `/api` at the end of the Railway URL

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Once complete, you'll get a URL like: `https://your-app.vercel.app`

### Step 5: Update Backend CORS

Now that you have your Vercel URL, go back to Railway:

1. Go to your Railway service → **Variables**
2. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5179,https://your-frontend.vercel.app
   ```
3. Railway will automatically redeploy with the new CORS settings

### Step 6: Test Your Application

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try logging in
3. Test the application functionality
4. Check browser console for any errors

---

## 🔧 Troubleshooting

### Backend Issues

**Build fails:**
- Check Railway build logs
- Ensure `tsconfig.json` is correct
- Verify all dependencies are in `package.json`

**Environment variables not working:**
- Make sure variable names match exactly (case-sensitive)
- Restart the service after adding variables

**CORS errors:**
- Verify `ALLOWED_ORIGINS` includes your Vercel URL
- Check that the URL matches exactly (including `https://`)

### Frontend Issues

**API calls failing:**
- Verify `VITE_API_URL` is set correctly
- Check that it includes `/api` at the end
- Ensure backend is running and accessible

**Build fails:**
- Check Vercel build logs
- Ensure TypeScript compiles without errors
- Verify all dependencies are installed

**Environment variables not working:**
- Vite requires `VITE_` prefix for environment variables
- Redeploy after adding/changing variables
- Check that variables are set for "Production" environment

---

## 📝 Environment Variables Summary

### Backend (Railway)
```
PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
PORT=5002 (optional, Railway sets this automatically)
```

### Frontend (Vercel)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend.railway.app/api
```

---

## 🔄 Updating Your Deployment

### Backend Updates
1. Push changes to GitHub
2. Railway automatically detects and redeploys
3. Check build logs if issues occur

### Frontend Updates
1. Push changes to GitHub
2. Vercel automatically detects and redeploys
3. Check build logs if issues occur

---

## ✅ Deployment Checklist

### Backend (Railway)
- [ ] Repository connected to Railway
- [ ] Root directory set to `backend`
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`
- [ ] All environment variables set
- [ ] Backend URL obtained and saved
- [ ] Health check endpoint working
- [ ] Database connection test passing

### Frontend (Vercel)
- [ ] Repository connected to Vercel
- [ ] Root directory set to `frontend`
- [ ] Framework preset: Vite
- [ ] All environment variables set (including backend URL)
- [ ] Frontend URL obtained
- [ ] Backend CORS updated with frontend URL
- [ ] Application tested and working

---

## 🎉 You're Done!

Your application should now be live:
- **Backend**: `https://your-backend.railway.app`
- **Frontend**: `https://your-frontend.vercel.app`

Both services will automatically redeploy when you push changes to your GitHub repository.

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

