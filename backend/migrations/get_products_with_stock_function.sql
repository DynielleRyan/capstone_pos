-- Create a PostgreSQL function to efficiently get products with aggregated stock
-- This runs on the database server, which is MUCH faster than client-side aggregation

-- Drop function if it exists (for re-running this migration)
DROP FUNCTION IF EXISTS get_products_with_stock();

-- Create the function matching your exact schema
CREATE OR REPLACE FUNCTION get_products_with_stock()
RETURNS TABLE (
    "ProductID" uuid,
    "UserID" uuid,
    "SupplierID" uuid,
    "Name" text,
    "GenericName" text,
    "Category" text,
    "Brand" text,
    "Image" text,
    "SellingPrice" numeric,
    "IsVATExemptYN" boolean,
    "VATAmount" numeric,
    "PrescriptionYN" boolean,
    "DateTimeLastUpdate" timestamp,
    "IsActive" boolean,
    "CreatedAt" timestamp,
    "SeniorPWDYN" boolean,
    "stock" bigint
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        p."ProductID",
        p."UserID",
        p."SupplierID",
        p."Name",
        p."GenericName",
        p."Category",
        p."Brand",
        p."Image",
        p."SellingPrice",
        p."IsVATExemptYN",
        p."VATAmount",
        p."PrescriptionYN",
        p."DateTimeLastUpdate",
        p."IsActive",
        p."CreatedAt",
        p."SeniorPWDYN",
        COALESCE(SUM(pi."Stock"), 0)::bigint as stock
    FROM 
        "Product" p
    LEFT JOIN 
        "Product_Item" pi ON p."ProductID" = pi."ProductID" AND pi."IsActive" = true
    WHERE 
        p."IsActive" = true
    GROUP BY 
        p."ProductID",
        p."UserID",
        p."SupplierID",
        p."Name",
        p."GenericName",
        p."Category",
        p."Brand",
        p."Image",
        p."SellingPrice",
        p."IsVATExemptYN",
        p."VATAmount",
        p."PrescriptionYN",
        p."DateTimeLastUpdate",
        p."IsActive",
        p."CreatedAt",
        p."SeniorPWDYN"
    ORDER BY 
        p."Name" ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_products_with_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_with_stock() TO anon;
GRANT EXECUTE ON FUNCTION get_products_with_stock() TO service_role;

-- Test the function (optional - you can run this to verify it works)
-- SELECT * FROM get_products_with_stock() LIMIT 10;

-- Performance note:
-- This function uses LEFT JOIN with aggregation which is highly optimized in PostgreSQL
-- With proper indexes (from performance_indexes.sql), this should run in <1 second
-- even with thousands of products and product items
