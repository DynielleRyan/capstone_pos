-- DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to understand what's causing the timeout

-- ============================================================================
-- 1. CHECK ROW COUNTS - How much data do you have?
-- ============================================================================
SELECT 
    'Product' as table_name, 
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE "IsActive" = true) as active_rows
FROM "Product"
UNION ALL
SELECT 
    'Product_Item' as table_name, 
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE "IsActive" = true) as active_rows
FROM "Product_Item"
UNION ALL
SELECT 
    'Transaction' as table_name, 
    COUNT(*) as total_rows,
    NULL as active_rows
FROM "Transaction"
UNION ALL
SELECT 
    'Transaction_Item' as table_name, 
    COUNT(*) as total_rows,
    NULL as active_rows
FROM "Transaction_Item"
ORDER BY total_rows DESC;

-- ============================================================================
-- 2. CHECK TABLE SIZES - How much disk space is used?
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY bytes DESC;

-- ============================================================================
-- 3. CHECK INDEXES - Are performance indexes created?
-- ============================================================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND (
        indexname LIKE 'idx_%' 
        OR indexname LIKE '%pkey'
        OR indexname LIKE '%key'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. CHECK PRODUCT_ITEM DISTRIBUTION - Is stock data concentrated?
-- ============================================================================
SELECT 
    p."Name",
    p."ProductID",
    COUNT(pi."ProductItemID") as item_count,
    SUM(pi."Stock") as total_stock,
    COUNT(*) FILTER (WHERE pi."IsActive" = true) as active_items
FROM "Product" p
LEFT JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID"
WHERE p."IsActive" = true
GROUP BY p."ProductID", p."Name"
ORDER BY item_count DESC
LIMIT 20;

-- ============================================================================
-- 5. TEST QUERY PERFORMANCE - How long does each query take?
-- ============================================================================

-- Test 1: Simple Product query (should be instant)
EXPLAIN ANALYZE
SELECT * FROM "Product" WHERE "IsActive" = true LIMIT 100;

-- Test 2: Product with LEFT JOIN (this is what's timing out)
EXPLAIN ANALYZE
SELECT 
    p.*,
    COALESCE(SUM(pi."Stock"), 0) as stock
FROM "Product" p
LEFT JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID" AND pi."IsActive" = true
WHERE p."IsActive" = true
GROUP BY p."ProductID"
LIMIT 100;

-- Test 3: Using the function (if created)
-- EXPLAIN ANALYZE
-- SELECT * FROM get_products_with_stock() LIMIT 100;

-- ============================================================================
-- 6. CHECK FOR MISSING INDEXES
-- ============================================================================
-- This shows which indexes we're looking for
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_is_active') 
        THEN '✅ idx_product_is_active EXISTS'
        ELSE '❌ idx_product_is_active MISSING'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_item_product_id') 
        THEN '✅ idx_product_item_product_id EXISTS'
        ELSE '❌ idx_product_item_product_id MISSING'
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_item_is_active') 
        THEN '✅ idx_product_item_is_active EXISTS'
        ELSE '❌ idx_product_item_is_active MISSING'
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_item_stock') 
        THEN '✅ idx_product_item_stock EXISTS'
        ELSE '❌ idx_product_item_stock MISSING'
    END;

-- ============================================================================
-- 7. CHECK FOR DATA ISSUES - Any problematic records?
-- ============================================================================

-- Check for products with excessive Product_Item records
SELECT 
    'Products with >100 items' as issue,
    COUNT(*) as count
FROM (
    SELECT p."ProductID"
    FROM "Product" p
    LEFT JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID"
    WHERE p."IsActive" = true
    GROUP BY p."ProductID"
    HAVING COUNT(pi."ProductItemID") > 100
) subquery

UNION ALL

-- Check for orphaned Product_Items
SELECT 
    'Orphaned Product_Items' as issue,
    COUNT(*) as count
FROM "Product_Item" pi
LEFT JOIN "Product" p ON pi."ProductID" = p."ProductID"
WHERE p."ProductID" IS NULL;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- Row Counts:
--   - <1,000 products: Should be instant
--   - 1,000-10,000 products: Needs indexes
--   - >10,000 products: Needs indexes + function
--   - >100,000 product items: May need pagination
--
-- Table Sizes:
--   - <10 MB: No problem
--   - 10-100 MB: Indexes required
--   - >100 MB: Indexes + optimization required
--
-- Missing Indexes:
--   - If you see ❌ symbols, run performance_indexes.sql
--
-- Query Performance (EXPLAIN ANALYZE):
--   - <100ms: Good
--   - 100-1000ms: Acceptable with indexes
--   - >1000ms (1 second): Problem - needs optimization
--   - >30 seconds: Critical - will timeout
--
