-- Fixed function without GROUP BY issues
DROP FUNCTION IF EXISTS get_products_simple();

CREATE OR REPLACE FUNCTION get_products_simple()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN (
        SELECT json_agg(product_with_stock)
        FROM (
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
                COALESCE(
                    (SELECT SUM(pi."Stock")::bigint
                     FROM "Product_Item" pi
                     WHERE pi."ProductID" = p."ProductID"
                     AND pi."IsActive" = true),
                    0
                ) as stock
            FROM "Product" p
            WHERE p."IsActive" = true
            ORDER BY p."Name"
        ) product_with_stock
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_products_simple() TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_simple() TO anon;
GRANT EXECUTE ON FUNCTION get_products_simple() TO service_role;
