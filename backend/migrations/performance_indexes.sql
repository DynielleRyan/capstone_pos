-- Performance Optimization Indexes for Capstone PoS Database
-- Run this SQL in your Supabase SQL Editor to improve query performance

-- =============================================================================
-- PRODUCT TABLE INDEXES
-- =============================================================================

-- Index on IsActive for filtering active products
CREATE INDEX IF NOT EXISTS idx_product_is_active 
ON "Product" ("IsActive");

-- Index on Category for category filtering
CREATE INDEX IF NOT EXISTS idx_product_category 
ON "Product" ("Category");

-- Composite index for common product queries (IsActive + Category)
CREATE INDEX IF NOT EXISTS idx_product_active_category 
ON "Product" ("IsActive", "Category");

-- Index on Product Name for search queries
CREATE INDEX IF NOT EXISTS idx_product_name 
ON "Product" ("Name");

-- Index on Generic Name for search queries
CREATE INDEX IF NOT EXISTS idx_product_generic_name 
ON "Product" ("GenericName");


-- =============================================================================
-- PRODUCT_ITEM TABLE INDEXES
-- =============================================================================

-- Index on ProductID for joins with Product table
CREATE INDEX IF NOT EXISTS idx_product_item_product_id 
ON "Product_Item" ("ProductID");

-- Index on IsActive for filtering active items
CREATE INDEX IF NOT EXISTS idx_product_item_is_active 
ON "Product_Item" ("IsActive");

-- Composite index for stock queries (ProductID + IsActive + Stock)
CREATE INDEX IF NOT EXISTS idx_product_item_stock 
ON "Product_Item" ("ProductID", "IsActive", "Stock");

-- Index on ExpiryDate for FIFO stock management
CREATE INDEX IF NOT EXISTS idx_product_item_expiry 
ON "Product_Item" ("ProductID", "ExpiryDate", "IsActive") 
WHERE "Stock" > 0;


-- =============================================================================
-- TRANSACTION TABLE INDEXES
-- =============================================================================

-- Index on OrderDateTime for sorting and filtering transactions
CREATE INDEX IF NOT EXISTS idx_transaction_order_date 
ON "Transaction" ("OrderDateTime" DESC);

-- Index on ReferenceNo for lookup by reference number
CREATE INDEX IF NOT EXISTS idx_transaction_reference_no 
ON "Transaction" ("ReferenceNo");

-- Index on UserID for user transaction history
CREATE INDEX IF NOT EXISTS idx_transaction_user_id 
ON "Transaction" ("UserID");

-- Index on PaymentMethod for filtering by payment type
CREATE INDEX IF NOT EXISTS idx_transaction_payment_method 
ON "Transaction" ("PaymentMethod");


-- =============================================================================
-- TRANSACTION_ITEM TABLE INDEXES
-- =============================================================================

-- Index on TransactionID for joins with Transaction table
CREATE INDEX IF NOT EXISTS idx_transaction_item_transaction_id 
ON "Transaction_Item" ("TransactionID");

-- Index on ProductID for product sales analytics
CREATE INDEX IF NOT EXISTS idx_transaction_item_product_id 
ON "Transaction_Item" ("ProductID");

-- Composite index for transaction item queries
CREATE INDEX IF NOT EXISTS idx_transaction_item_composite 
ON "Transaction_Item" ("TransactionID", "ProductID");


-- =============================================================================
-- USER TABLE INDEXES
-- =============================================================================

-- Index on AuthUserID for quick user lookup from Supabase auth
CREATE INDEX IF NOT EXISTS idx_user_auth_user_id 
ON "User" ("AuthUserID");

-- Index on Email for user lookup
CREATE INDEX IF NOT EXISTS idx_user_email 
ON "User" ("Email");


-- =============================================================================
-- VERIFY INDEXES
-- =============================================================================

-- Query to verify all indexes were created successfully
-- Run this to check your indexes:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM 
--     pg_indexes 
-- WHERE 
--     schemaname = 'public' 
--     AND tablename IN ('Product', 'Product_Item', 'Transaction', 'Transaction_Item', 'User')
-- ORDER BY 
--     tablename, indexname;


-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Check table sizes and row counts
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
--     pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
-- FROM 
--     pg_tables 
-- WHERE 
--     schemaname = 'public'
-- ORDER BY 
--     pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (if pg_stat_statements is enabled)
-- SELECT 
--     query,
--     calls,
--     mean_exec_time,
--     max_exec_time,
--     total_exec_time
-- FROM 
--     pg_stat_statements
-- WHERE 
--     query LIKE '%Product%' OR query LIKE '%Transaction%'
-- ORDER BY 
--     mean_exec_time DESC
-- LIMIT 10;
