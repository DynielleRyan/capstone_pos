# 🚨 TIMEOUT ERROR FIX - 5 MINUTE SOLUTION

## What's Wrong?
Your database queries are too slow and timing out after 30 seconds.

## What's the Fix?
Add database indexes + create a fast query function

---

## 🎯 DO THIS NOW (Follow in order):

### 1️⃣ Go to Supabase (1 min)
- Open: https://supabase.com/dashboard
- Select your project
- Click **SQL Editor** → **New Query**

### 2️⃣ Run First SQL File (2 min)
- Open: `backend/migrations/performance_indexes.sql`
- Copy **ENTIRE** file
- Paste in Supabase SQL Editor
- Click **Run**
- ✅ Should say "Success. No rows returned"

### 3️⃣ Run Second SQL File (2 min)
- Click **New Query** in Supabase
- Open: `backend/migrations/get_products_with_stock_function.sql`
- Copy **ENTIRE** file
- Paste in Supabase SQL Editor
- Click **Run**
- ✅ Should say "Success"

### 4️⃣ Test It Works (30 sec)
Run this in Supabase:
```sql
SELECT * FROM get_products_with_stock() LIMIT 5;
```
✅ Should see your products instantly!

### 5️⃣ Restart Backend (30 sec)
```bash
# In backend terminal:
# Press Ctrl+C, then:
npm run dev
```

### 6️⃣ Test Your App (30 sec)
- Open http://localhost:5173
- Login
- Go to Dashboard
- ✅ Products should load in <5 seconds!

---

## ❌ Still Broken?

Open `FIX_TIMEOUT_NOW.md` for detailed troubleshooting.

Quick check:
```sql
-- Run in Supabase to verify indexes:
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
```
Should return: **19 or more**

If less than 19 → Re-run step 2️⃣

---

## 📚 More Info

- **Quick Guide**: `QUICK_FIX_GUIDE.md`
- **Detailed Guide**: `FIX_TIMEOUT_NOW.md`
- **Technical Details**: `PERFORMANCE_FIXES.md`
- **Diagnose Problems**: `backend/migrations/diagnostic_queries.sql`

---

## 🎯 Success = This Works:

```sql
-- In Supabase, this should run in <1 second:
SELECT * FROM get_products_with_stock();
```

If ✅ fast → Database is fixed!  
If ❌ slow → Read `FIX_TIMEOUT_NOW.md`
