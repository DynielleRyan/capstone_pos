# 🚀 Quick Deployment Reference

## Backend on Railway (5 minutes)

1. **Sign up/Login**: [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. **Select your repo** → Set root directory to `backend`
4. **Add Environment Variables**:
   ```
   PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   SUPABASE_ANON_KEY=your_key
   ALLOWED_ORIGINS=http://localhost:5173
   ```
5. **Deploy** → Copy your Railway URL (e.g., `https://xxx.railway.app`)

## Frontend on Vercel (5 minutes)

1. **Sign up/Login**: [vercel.com](https://vercel.com)
2. **Add New Project** → Import GitHub repo
3. **Set root directory** to `frontend`
4. **Add Environment Variables**:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   VITE_API_URL=https://xxx.railway.app/api
   ```
5. **Deploy** → Copy your Vercel URL

## Final Step

Go back to Railway → Update `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

**Done!** 🎉

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

