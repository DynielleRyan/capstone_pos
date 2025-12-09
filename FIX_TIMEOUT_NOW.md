# 🚨 FIX TIMEOUT ERRORS - STEP BY STEP

Your app is timing out because the database queries are too slow. Follow these steps **IN ORDER**:

---

## 📊 STEP 1: Diagnose the Problem (2 minutes)

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Click **SQL Editor** → **New Query**
3. Open file: `backend/migrations/diagnostic_queries.sql`
4. Copy **ONLY Query #1** (lines 7-31 - the row counts query)
5. Paste and **Run**

### What you'll see:
```
table_name      | total_rows | active_rows
----------------|------------|------------
Product         | 50         | 45
Product_Item    | 150        | 140
Transaction     | 1000       | NULL
Transaction_Item| 3000       | NULL
```

### Diagnosis:
- **If Product rows < 1,000**: Should work fine with fixes
- **If Product_Item rows > 10,000**: Database has lots of data
- **If Transaction rows > 50,000**: Need pagination (optional)

📸 **Take a screenshot of these numbers** - we may need them later

---

## 🔧 STEP 2: Apply Performance Indexes (3 minutes)

### 2A: Create Indexes

1. In Supabase SQL Editor, click **New Query** (don't close the diagnostic one)
2. Open file: `backend/migrations/performance_indexes.sql`
3. Copy the **ENTIRE file** (all 200+ lines)
4. Paste into Supabase
5. Click **Run** (Ctrl+Enter)

### Expected Result:
```
Success. No rows returned
```

If you get errors about "already exists", that's OK - it means some indexes were already there.

### 2B: Verify Indexes

1. Run Query #3 from `diagnostic_queries.sql` (the "CHECK INDEXES" query)
2. You should see **19+ indexes** with names starting with `idx_`

✅ **Success indicator**: You see indexes like:
- `idx_product_is_active`
- `idx_product_item_stock`  
- `idx_transaction_order_date`

---

## ⚡ STEP 3: Create Fast Query Function (2 minutes)

### 3A: Create Function

1. In Supabase SQL Editor, click **New Query**
2. Open file: `backend/migrations/get_products_with_stock_function.sql`
3. Copy the **ENTIRE file**
4. Paste into Supabase
5. Click **Run**

### Expected Result:
```
Success. No rows returned
```

### 3B: Test Function

Run this test query:
```sql
SELECT * FROM get_products_with_stock() LIMIT 10;
```

✅ **Success indicator**: You see your products with a `stock` column!

Example output:
```
ProductID | Name        | Category | stock
----------|-------------|----------|------
xxx-xxx   | Paracetamol | OTC      | 150
yyy-yyy   | Biogesic    | OTC      | 75
```

---

## 🔄 STEP 4: Restart Backend (1 minute)

The backend needs to reload with the new code:

```bash
# In your backend terminal (Terminal 2):
# 1. Press Ctrl+C to stop
# 2. Then run:
npm run dev
```

Wait for:
```
✅ SendGrid initialized successfully
Server running http:3000
```

---

## 🧪 STEP 5: Test the Fix (1 minute)

1. Open your app: http://localhost:5173
2. Log in
3. Go to Dashboard
4. **Wait 5-10 seconds**

### Expected Results:

✅ **SUCCESS:**
- Products load in <5 seconds
- No "timeout" errors in console
- You see product cards with images

❌ **STILL FAILING:**
- Still see "statement timeout" errors
- Backend logs show errors
- → **Continue to Step 6**

---

## 🔍 STEP 6: If Still Timing Out (Troubleshooting)

### 6A: Check Backend Logs

Look at your backend terminal (Terminal 2) for errors like:
```
Supabase error fetching products: {
  code: '57014',
  message: 'canceling statement due to statement timeout'
}
```

### 6B: Run Deep Diagnostics

In Supabase SQL Editor, run Query #5 from `diagnostic_queries.sql`:
```sql
EXPLAIN ANALYZE
SELECT 
    p.*,
    COALESCE(SUM(pi."Stock"), 0) as stock
FROM "Product" p
LEFT JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID" 
    AND pi."IsActive" = true
WHERE p."IsActive" = true
GROUP BY p."ProductID"
LIMIT 100;
```

Look for:
- **Execution Time**: Should be <100ms
- **Seq Scan**: If you see this, indexes aren't working
- **Index Scan**: Good! Indexes are working

### 6C: Common Issues

#### Issue 1: Indexes not created
```sql
-- Check if indexes exist:
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```
**Fix**: Re-run Step 2

#### Issue 2: Too much data
If you have >50,000 products or >500,000 product items:
```sql
-- Check row counts:
SELECT COUNT(*) FROM "Product" WHERE "IsActive" = true;
SELECT COUNT(*) FROM "Product_Item" WHERE "IsActive" = true;
```
**Fix**: You may need to:
1. Archive old data
2. Add pagination to frontend
3. Upgrade Supabase plan

#### Issue 3: Function not working
```sql
-- Test if function exists:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_products_with_stock';
```
**Fix**: Re-run Step 3

---

## 📈 Expected Performance

After applying all fixes:

| Operation | Before | After | Status |
|-----------|--------|-------|--------|
| Load Products | 30-60s ❌ | <2s ✅ | 15-30x faster |
| Load Transactions | 30-60s ❌ | <1s ✅ | 30-60x faster |
| Dashboard Load | Timeout ❌ | 2-5s ✅ | Works! |

---

## 🆘 Still Not Working?

If you've completed all steps and it's still timing out:

### Option A: Temporary Workaround (Slow but Works)

Edit `backend/src/controllers/ProductsController.ts`:

```typescript
// At line 12, change:
.limit(1000);

// To:
.limit(100);  // Reduce to 100 products at a time
```

This will make it load only 100 products, which should work.

### Option B: Share Diagnostics

Run these queries and share the output:

1. Query #1 (Row counts)
2. Query #2 (Table sizes)  
3. Query #5 (Performance analysis)
4. Query #6 (Index check)

---

## ✅ Verification Checklist

Before asking for help, verify:

- [ ] Ran `performance_indexes.sql` in Supabase
- [ ] Ran `get_products_with_stock_function.sql` in Supabase
- [ ] Verified function exists: `SELECT * FROM get_products_with_stock() LIMIT 1;`
- [ ] Restarted backend server
- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Checked backend logs for errors
- [ ] Ran diagnostic queries to check data size

---

## 📝 Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `diagnostic_queries.sql` | Check database health | First step, troubleshooting |
| `performance_indexes.sql` | Speed up queries | Required - Step 2 |
| `get_products_with_stock_function.sql` | Fast product loading | Required - Step 3 |
| `QUICK_FIX_GUIDE.md` | Quick reference | Summary guide |
| `PERFORMANCE_FIXES.md` | Technical details | Understanding the fix |

---

## 🎯 Quick Success Check

Run this in Supabase SQL Editor:

```sql
-- Should return in <1 second:
SELECT COUNT(*) FROM get_products_with_stock();

-- Should return in <1 second:
SELECT * FROM get_products_with_stock() LIMIT 20;
```

If both run fast (< 1 second), your database is fixed! 🎉

The timeout is now a backend code issue, not a database issue.
