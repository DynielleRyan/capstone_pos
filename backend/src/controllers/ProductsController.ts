/**
 * ============================================================================
 * PRODUCTS CONTROLLER
 * ============================================================================
 * 
 * Handles all product-related business logic and database operations. Controllers
 * are the bridge between routes (HTTP layer) and the database (data layer).
 * 
 * RESPONSIBILITIES:
 * - Validate and process product data
 * - Query database using Supabase
 * - Calculate stock information from Product_Item records
 * - Transform data for API responses
 * - Handle errors and return appropriate HTTP status codes
 * 
 * STOCK CALCULATION:
 * Products don't store stock directly. Stock is calculated by aggregating
 * Product_Item records (batches) that belong to each product. This allows for
 * batch-level tracking with expiry dates and FIFO inventory management.
 */

import { supabase } from '../utils/database';
import { Request, Response } from 'express';

/**
 * GET ALL PRODUCTS (WITH PAGINATION)
 * 
 * Endpoint: GET /api/products?page=1&limit=40
 * 
 * PURPOSE: Fetch active products with pagination and stock information
 * 
 * QUERY PARAMETERS:
 * - page: Page number (default: 1)
 * - limit: Products per page (default: 40, reduced from 70 for faster loading)
 * 
 * FLOW:
 * 1. Get pagination parameters from query string
 * 2. Query Product table with pagination (limit 40)
 * 3. Get total count for pagination metadata
 * 4. Extract ProductIDs from fetched products
 * 5. Query Product_Item table ONLY for those specific products (optimized)
 * 6. Calculate total stock per product (sum of all Product_Items)
 * 7. Combine product data with stock information
 * 8. Return products array with pagination metadata
 * 
 * PERFORMANCE OPTIMIZATION:
 * - Reduced initial load from 70 to 40 products (faster initial load)
 * - Only fetches Product_Items for the products being returned
 * - Reduces query from potentially 10,000+ rows to ~100-200 rows
 * - Supports pagination for loading more products on demand
 * 
 * RETURNS: Object with products array and pagination metadata
 * {
 *   data: [
 *     {
 *       ProductID: "...",
 *       Name: "Paracetamol",
 *       SellingPrice: 50.00,
 *       stock: 150
 *     },
 *     ...
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 40,
 *     total: 150,
 *     totalPages: 4,
 *     hasMore: true
 *   }
 * }
 */
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        /**
         * Parse Pagination Parameters
         * 
         * Extracts page and limit from query string. Defaults ensure the endpoint
         * works even if parameters are not provided. The limit of 40 was chosen
         * to balance initial load time with the number of products displayed.
         */
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 40;
        const offset = (page - 1) * limit;
        
        console.log(`🚀 Fetching products - page ${page}, limit ${limit}`);
        const startTime = Date.now();
        
        /**
         * PERFORMANCE OPTIMIZATION: Two-Step Query Approach
         * 
         * PROBLEM: If we fetch all Product_Items for all products, we could be
         * querying 10,000+ records even though we only need stock for 40 products.
         * 
         * SOLUTION: Two-step approach
         * 1. Fetch only the products we need (40 per page)
         * 2. Extract their ProductIDs
         * 3. Fetch Product_Items ONLY for those specific products
         * 
         * RESULT: Reduces query from 10,000+ rows to ~100-200 rows per page,
         * dramatically improving query performance and page load time.
         */
        
        /**
         * Step 1: Get Total Count for Pagination
         * 
         * Uses Supabase's count feature with 'head: true' to get only the count
         * without fetching actual data. This is much faster than fetching all
         * records just to count them.
         * 
         * If this fails, we continue without total count (pagination still works,
         * but "total" will be 0). This prevents a count query failure from breaking
         * the entire endpoint.
         */
        let total = 0;
        try {
            const { count, error: countError } = await supabase
                .from('Product')
                .select('*', { count: 'exact', head: true })
                .eq('IsActive', true);
            
            if (countError) {
                console.warn('⚠️ Could not get total count:', countError);
            } else {
                total = count || 0;
            }
        } catch (error) {
            console.warn('⚠️ Error getting total count, continuing without it');
        }
        
        /**
         * Step 2: Fetch Products with Pagination and Timeout Protection
         * 
         * Uses Promise.race() to implement a timeout. If the database query takes
         * longer than 7 seconds, we reject with a timeout error rather than
         * hanging indefinitely. This prevents the server from becoming unresponsive
         * during database connectivity issues.
         * 
         * The timeout is cleared if the query completes successfully to prevent
         * memory leaks.
         */
        let products: any[] = [];
        const productsQueryStart = Date.now();
        
        try {
            let timeoutId: NodeJS.Timeout | undefined;
            const productsTimeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('Product query timeout after 7s - database connection may be slow'));
                }, 7000);
            });
            
            /**
             * Product Query with Pagination
             * 
             * Uses .range(offset, offset + limit - 1) for pagination. This is more
             * efficient than using .limit() and .offset() separately. The query
             * selects only the fields needed for display to reduce payload size.
             */
            const queryPromise = supabase
                .from('Product')
                .select('ProductID, Name, GenericName, Category, Brand, SellingPrice, IsVATExemptYN, PrescriptionYN, SeniorPWDYN, Image')
                .eq('IsActive', true)
                .order('Name', { ascending: true })
                .range(offset, offset + limit - 1);
            
            const productsResult = await Promise.race([
                queryPromise,
                productsTimeoutPromise
            ]);
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            /**
             * Process Query Result
             * 
             * Supabase returns an object with { data, error } structure. We check
             * for errors and extract the data array. TypeScript type checking ensures
             * we handle the response correctly.
             */
            if (productsResult && typeof productsResult === 'object' && 'error' in productsResult) {
                if (productsResult.error) {
                    console.error('❌ Error fetching products:', productsResult.error);
                    throw productsResult.error;
                } else {
                    products = (productsResult as any).data || [];
                }
            } else {
                products = [];
            }
            
            const productsQueryTime = Date.now() - productsQueryStart;
            console.log(`✅ Product query completed in ${productsQueryTime}ms`);
        } catch (timeoutError: any) {
            /**
             * Query Timeout or Failure Handling
             * 
             * If the query times out or fails, we log detailed error information
             * to help diagnose the issue. Common causes:
             * - Slow database connection
             * - Missing database indexes
             * - Network issues
             * - Invalid credentials
             * 
             * We throw an error to return a 500 status, but include helpful
             * troubleshooting information in the error message.
             */
            const productsQueryTime = Date.now() - productsQueryStart;
            console.error(`❌ Product query failed after ${productsQueryTime}ms:`, timeoutError.message);
            console.error('💡 Troubleshooting tips:');
            console.error('   1. Check Supabase database connection');
            console.error('   2. Verify database indexes are created (run performance_indexes.sql)');
            console.error('   3. Check network connectivity between backend and Supabase');
            console.error('   4. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
            throw new Error(`Failed to fetch products: ${timeoutError.message}. Check backend logs for details.`);
        }
        
        /**
         * Early Return for Empty Results
         * 
         * If no products are found, return immediately with empty data and
         * pagination metadata. This avoids unnecessary stock queries when there
         * are no products to display.
         */
        if (products.length === 0) {
            console.log('✅ No products found');
            res.json({
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            });
            return;
        }
        
        /**
         * Step 3: Extract Product IDs for Stock Query
         * 
         * Creates an array of ProductIDs from the products we fetched. This array
         * is used in the next step to query only the relevant Product_Item records.
         */
        const productIDs = products.map(p => p.ProductID);
        
        /**
         * Step 4: Fetch Stock Data (Product_Items) with Timeout Protection
         * 
         * Queries Product_Item table for only the products we're returning. This
         * is the key optimization - instead of fetching all Product_Items, we use
         * .in('ProductID', productIDs) to fetch only what we need.
         * 
         * If this query fails or times out, we continue with products that have
         * 0 stock rather than failing the entire request. This graceful degradation
         * ensures the PoS system remains usable even if stock queries are slow.
         */
        let productItems: any[] = [];
        const itemsQueryStart = Date.now();
        
        try {
            let timeoutId: NodeJS.Timeout | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('Product_Items query timeout after 5s'));
                }, 5000);
            });
            
            const queryPromise = supabase
                .from('Product_Item')
                .select('ProductID, Stock')
                .eq('IsActive', true)
                .in('ProductID', productIDs);
            
            const itemsResult = await Promise.race([
                queryPromise,
                timeoutPromise
            ]);
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            if (itemsResult && typeof itemsResult === 'object' && 'error' in itemsResult) {
                if (itemsResult.error) {
                    console.error('❌ Error fetching product items:', itemsResult.error);
                } else {
                    productItems = (itemsResult as any).data || [];
                }
            } else {
                productItems = [];
            }
            
            const itemsQueryTime = Date.now() - itemsQueryStart;
            console.log(`✅ Product_Items query completed in ${itemsQueryTime}ms`);
        } catch (timeoutError: any) {
            /**
             * Graceful Degradation
             * 
             * If stock query fails, we continue with products showing 0 stock
             * rather than failing the entire request. This ensures the PoS system
             * remains functional even during database performance issues.
             */
            const itemsQueryTime = Date.now() - itemsQueryStart;
            console.warn(`⚠️ Product_Items query timed out after ${itemsQueryTime}ms, returning products with 0 stock:`, timeoutError.message);
            productItems = [];
        }
        
        console.log(`✅ Got ${products.length} products and ${productItems.length} items (optimized query)`);

        /**
         * Calculate Stock Per Product
         * 
         * Uses a Map to efficiently aggregate stock quantities. For each Product_Item,
         * we add its Stock value to the running total for that ProductID. This is
         * more efficient than using array methods like reduce() for each product.
         * 
         * EXAMPLE:
         * Product_Items: [
         *   { ProductID: "abc", Stock: 50 },
         *   { ProductID: "abc", Stock: 30 },
         *   { ProductID: "xyz", Stock: 100 }
         * ]
         * Result: Map { "abc" => 80, "xyz" => 100 }
         */
        const stockMap = new Map<string, number>();
        productItems.forEach(item => {
            const current = stockMap.get(item.ProductID) || 0;
            stockMap.set(item.ProductID, current + (item.Stock || 0));
        });

        /**
         * Combine Product Data with Stock Information
         * 
         * Merges product data with calculated stock. Products without any Product_Items
         * will have stock: 0. The spread operator (...) copies all product properties
         * and adds the stock field.
         */
        const result = products.map(p => ({
            ...p,
            stock: stockMap.get(p.ProductID) || 0
        }));

        /**
         * Calculate Pagination Metadata
         * 
         * Computes pagination information needed by the frontend to display page
         * numbers and "load more" buttons. hasMore indicates if there are additional
         * pages beyond the current one.
         */
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        const totalTime = Date.now() - startTime;
        console.log(`✅ Total time: ${totalTime}ms, returning ${result.length} products (page ${page}/${totalPages})`);
        
        res.json({
            data: result,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore
            }
        });
        
    } catch (error: any) {
        // Handle any errors that occurred
        console.error('❌ Error in getAllProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
}

/**
 * Search Products
 * 
 * Searches products across Name, GenericName, and Brand fields using case-insensitive
 * pattern matching. This endpoint searches the entire database, not just loaded products,
 * making it useful for finding products that aren't currently displayed.
 * 
 * SEARCH BEHAVIOR:
 * - Searches in multiple fields simultaneously (Name, GenericName, Brand)
 * - Case-insensitive matching (finds "paracetamol" even if stored as "Paracetamol")
 * - Partial matching (finds "para" in "Paracetamol")
 * - Minimum 2 characters required (prevents overly broad searches)
 * 
 * PERFORMANCE:
 * Uses database indexes for fast searching. The search is performed server-side,
 * reducing the amount of data transferred and allowing for efficient database queries.
 * 
 * Returns products with calculated stock information, sorted alphabetically by name.
 */
export const searchProducts = async (req: Request, res: Response) => {
    try {
        /**
         * Parse and Validate Search Parameters
         * 
         * Extracts search term and limit from query string. The minimum 2-character
         * requirement prevents searches that would return too many results (like
         * searching for "a" which might match hundreds of products).
         * 
         * If search term is too short, returns empty results immediately without
         * making a database query.
         */
        const searchTerm = (req.query.q as string) || '';
        const limit = parseInt(req.query.limit as string) || 50;
        
        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.json({
                data: [],
                pagination: {
                    total: 0,
                    limit
                }
            });
        }
        
        console.log(`🔍 Searching products: "${searchTerm}"`);
        const startTime = Date.now();
        
        // Step 1: Search products in Name, GenericName, and Brand
        let products: any[] = [];
        try {
            let timeoutId: NodeJS.Timeout | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('Search query timeout after 5s'));
                }, 5000);
            });
            
            // Search in multiple fields using OR condition
            // Supabase uses ilike for case-insensitive pattern matching
            const searchPattern = searchTerm.trim();
            const queryPromise = supabase
                .from('Product')
                .select('ProductID, Name, GenericName, Category, Brand, SellingPrice, IsVATExemptYN, PrescriptionYN, SeniorPWDYN, Image')
                .eq('IsActive', true)
                .or(`Name.ilike.%${searchPattern}%,GenericName.ilike.%${searchPattern}%,Brand.ilike.%${searchPattern}%`)
                .order('Name', { ascending: true })
                .limit(limit);
            
            const productsResult = await Promise.race([
                queryPromise,
                timeoutPromise
            ]);
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            if (productsResult && typeof productsResult === 'object' && 'error' in productsResult) {
                if (productsResult.error) {
                    console.error('❌ Error searching products:', productsResult.error);
                    throw productsResult.error;
                } else {
                    products = (productsResult as any).data || [];
                }
            }
        } catch (timeoutError: any) {
            console.error(`❌ Search query failed:`, timeoutError.message);
            throw new Error(`Search failed: ${timeoutError.message}`);
        }
        
        if (products.length === 0) {
            return res.json({
                data: [],
                pagination: {
                    total: 0,
                    limit
                }
            });
        }
        
        // Step 2: Get stock for searched products
        const productIDs = products.map(p => p.ProductID);
        let productItems: any[] = [];
        
        try {
            const { data, error } = await supabase
                .from('Product_Item')
                .select('ProductID, Stock')
                .eq('IsActive', true)
                .in('ProductID', productIDs);
            
            if (error) {
                console.warn('⚠️ Failed to fetch stock for search results:', error);
            } else if (data) {
                productItems = data;
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch stock for search results');
        }
        
        // Step 3: Calculate stock per product
        const stockMap = new Map<string, number>();
        productItems.forEach(item => {
            const current = stockMap.get(item.ProductID) || 0;
            stockMap.set(item.ProductID, current + (item.Stock || 0));
        });
        
        // Step 4: Combine product data with stock
        const result = products.map(p => ({
            ...p,
            stock: stockMap.get(p.ProductID) || 0
        }));
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ Search completed in ${totalTime}ms, found ${result.length} products`);
        
        res.json({
            data: result,
            pagination: {
                total: result.length,
                limit
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error in searchProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error?.message || 'Unknown error'
        });
    }
}

/**
 * Get Product by ID
 * 
 * Retrieves a single product by its unique ProductID (UUID). Used when viewing
 * product details or editing a specific product.
 * 
 * ERROR HANDLING:
 * - If product not found: Returns 404 Not Found
 * - If database error: Returns 500 Internal Server Error
 * 
 * Returns the complete product record with all fields. Stock information is not
 * included - use the inventory endpoints if stock is needed.
 */
export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        
        /**
         * Query Product by ID
         * 
         * Uses .eq() to find the product with matching ProductID. Supabase returns
         * an array even for single results, so we check if the array is empty to
         * determine if the product was found.
         */
        const { data, error } = await supabase
            .from('Product')
            .select('*')
            .eq('ProductID', id);
        
        if (error) {
            console.error('Supabase error fetching product:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        /**
         * Return Single Product
         * 
         * Returns data[0] because Supabase always returns an array, even for
         * single-record queries. Since we're querying by unique ID, there should
         * only be one result (or zero if not found).
         */
        res.json(data[0]);
    } catch (error: any) {
        // Handle any errors
        console.error('Error in getProductById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
}


/**
 * Create Product
 * 
 * Creates a new product record in the Product table. The request body should contain
 * all required product fields as defined by the database schema.
 * 
 * NOTE: This creates the product master record only. Stock must be added separately
 * via the inventory endpoints, as products and stock items are stored in separate
 * tables (Product and Product_Item).
 * 
 * VALIDATION:
 * Database constraints will enforce required fields and data types. If validation
 * fails, Supabase returns an error that is passed through to the client.
 */
export const createProduct = async (req: Request, res: Response) => {
    try {
        /**
         * Insert Product Record
         * 
         * Inserts the product data directly into the Product table. Supabase
         * automatically handles UUID generation for ProductID and timestamps for
         * CreatedAt/UpdatedAt fields.
         */
        const {data, error} = await supabase.from('Product').insert(req.body);
        
        if (error) throw error;
        
        console.log('Product created:',data);
        res.json(data);
    } catch (error) {
        console.log('Error:',error);
        res.status(500).json({message: 'Internal Server Error'});
    }
}

/**
 * Update Product
 * 
 * Updates an existing product record. Supports partial updates - you only need to
 * send the fields you want to change. The ProductID in the URL identifies which
 * product to update.
 * 
 * PARTIAL UPDATE SUPPORT:
 * Only the fields included in req.body will be updated. Other fields remain unchanged.
 * This allows for efficient updates when only changing specific properties (e.g.,
 * just the price, or just the category).
 * 
 * The database automatically updates the UpdatedAt timestamp when a record is modified.
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    /**
     * Update Product Record
     * 
     * Uses .update() with .eq() to update only the product with matching ProductID.
     * Supabase returns the updated record(s), which we send back to the client.
     */
    const {data, error} = await supabase
        .from('Product')
        .update(req.body)
        .eq('ProductID', id);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({message: "Internal Server Error"});
  }
} 

/**
 * Delete Product
 * 
 * Permanently removes a product from the database. This is a hard delete - the
 * product record is completely removed and cannot be recovered.
 * 
 * WARNING: This does not delete associated Product_Item records (stock items).
 * Those should be handled separately. Also, this does not check if the product
 * has been used in transactions - consider adding validation to prevent deleting
 * products with transaction history.
 * 
 * RECOMMENDATION: Consider implementing soft delete (setting IsActive = false)
 * instead of hard delete. This preserves data for audit purposes and allows
 * recovery if a product is accidentally deleted.
 */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        
        /**
         * Delete Product Record
         * 
         * Permanently removes the product from the database. Supabase returns
         * the deleted record(s) in the response, which we pass through to the client.
         */
        const {data, error} = await supabase
            .from('Product')
            .delete()
            .eq('ProductID', id);
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
}

