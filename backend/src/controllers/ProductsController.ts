/**
 * ============================================================================
 * PRODUCTS CONTROLLER
 * ============================================================================
 * 
 * This controller handles all product-related operations:
 * - Fetching products (with stock information)
 * - Getting single product details
 * - Creating, updating, and deleting products
 * 
 * CONTROLLER PATTERN:
 * - Receives HTTP request (req) and response (res) objects
 * - Extracts data from request (req.body, req.params)
 * - Queries database using Supabase
 * - Processes/transforms data
 * - Returns JSON response
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
        // Get pagination parameters from query string
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 40; // Reduced from 70 for faster loading
        const offset = (page - 1) * limit;
        
        console.log(`🚀 Fetching products - page ${page}, limit ${limit}`);
        const startTime = Date.now();
        
        /**
         * OPTIMIZED TWO-STEP APPROACH WITH PAGINATION
         * 
         * Why this approach?
         * - Product table: Contains product information (name, price, etc.)
         * - Product_Item table: Contains individual stock items (each with quantity)
         * 
         * OPTIMIZATION: Instead of fetching ALL Product_Items, we:
         * 1. Fetch products first with pagination (limited to 40 per page)
         * 2. Extract their ProductIDs
         * 3. Only fetch Product_Items for those specific products
         * 
         * This reduces the query from potentially 10,000+ rows to ~100-200 rows per page
         * Result: Much faster query execution and faster initial page load
         */
        
        // Step 1: Get total count for pagination (fast query)
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
        
        // Step 2: Get products with pagination
        let products: any[] = [];
        const productsQueryStart = Date.now();
        
        try {
            // Create a timeout promise that rejects after 7 seconds
            let timeoutId: NodeJS.Timeout | undefined;
            const productsTimeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('Product query timeout after 7s - database connection may be slow'));
                }, 7000);
            });
            
            // Race between the query and timeout
            const queryPromise = supabase
                .from('Product')
                .select('ProductID, Name, GenericName, Category, Brand, SellingPrice, IsVATExemptYN, PrescriptionYN, SeniorPWDYN, Image')
                .eq('IsActive', true)
                .order('Name', { ascending: true })
                .range(offset, offset + limit - 1); // Use range for pagination
            
            const productsResult = await Promise.race([
                queryPromise,
                productsTimeoutPromise
            ]);
            
            // Clear timeout if query completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Check if result has error property (Supabase response)
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
            // Query timed out or failed
            const productsQueryTime = Date.now() - productsQueryStart;
            console.error(`❌ Product query failed after ${productsQueryTime}ms:`, timeoutError.message);
            console.error('💡 Troubleshooting tips:');
            console.error('   1. Check Supabase database connection');
            console.error('   2. Verify database indexes are created (run performance_indexes.sql)');
            console.error('   3. Check network connectivity between backend and Supabase');
            console.error('   4. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
            throw new Error(`Failed to fetch products: ${timeoutError.message}. Check backend logs for details.`);
        }
        
        // Early return if no products found
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
        
        // Step 3: Extract ProductIDs from the products we fetched
        const productIDs = products.map(p => p.ProductID);
        
        // Step 4: Only fetch Product_Items for the products we're returning
        let productItems: any[] = [];
        const itemsQueryStart = Date.now();
        
        try {
            // Create a timeout promise that rejects after 5 seconds
            let timeoutId: NodeJS.Timeout | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('Product_Items query timeout after 5s'));
                }, 5000);
            });
            
            // Race between the query and timeout
            const queryPromise = supabase
                .from('Product_Item')
                .select('ProductID, Stock')
                .eq('IsActive', true)
                .in('ProductID', productIDs);
            
            const itemsResult = await Promise.race([
                queryPromise,
                timeoutPromise
            ]);
            
            // Clear timeout if query completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Check if result has error property (Supabase response)
            if (itemsResult && typeof itemsResult === 'object' && 'error' in itemsResult) {
                if (itemsResult.error) {
                    console.error('❌ Error fetching product items:', itemsResult.error);
                    // Don't throw - we can still return products (they'll just have 0 stock)
                } else {
                    productItems = (itemsResult as any).data || [];
                }
            } else {
                productItems = [];
            }
            
            const itemsQueryTime = Date.now() - itemsQueryStart;
            console.log(`✅ Product_Items query completed in ${itemsQueryTime}ms`);
        } catch (timeoutError: any) {
            // Query timed out or failed - return products without stock (better than failing completely)
            const itemsQueryTime = Date.now() - itemsQueryStart;
            console.warn(`⚠️ Product_Items query timed out after ${itemsQueryTime}ms, returning products with 0 stock:`, timeoutError.message);
            productItems = [];
        }
        
        console.log(`✅ Got ${products.length} products and ${productItems.length} items (optimized query)`);

        /**
         * CALCULATE STOCK PER PRODUCT
         */
        const stockMap = new Map<string, number>();
        productItems.forEach(item => {
            const current = stockMap.get(item.ProductID) || 0;
            stockMap.set(item.ProductID, current + (item.Stock || 0));
        });

        /**
         * COMBINE PRODUCT DATA WITH STOCK
         */
        const result = products.map(p => ({
            ...p,
            stock: stockMap.get(p.ProductID) || 0
        }));

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        // Log performance metrics
        const totalTime = Date.now() - startTime;
        console.log(`✅ Total time: ${totalTime}ms, returning ${result.length} products (page ${page}/${totalPages})`);
        
        // Return success response with products array and pagination metadata
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
 * SEARCH PRODUCTS
 * 
 * Endpoint: GET /api/products/search?q=searchterm&limit=50
 * 
 * PURPOSE: Search all products in the database (not just loaded ones)
 * 
 * QUERY PARAMETERS:
 * - q: Search term (required, minimum 2 characters)
 * - limit: Maximum results (default: 50)
 * 
 * FLOW:
 * 1. Validate search term (minimum 2 characters)
 * 2. Search Product table in Name, GenericName, and Brand fields
 * 3. Extract ProductIDs from search results
 * 4. Query Product_Item table for stock information
 * 5. Calculate total stock per product
 * 6. Return search results with stock
 * 
 * RETURNS: Object with search results
 * {
 *   data: [
 *     {
 *       ProductID: "...",
 *       Name: "Paracetamol",
 *       stock: 150
 *     },
 *     ...
 *   ],
 *   pagination: {
 *     total: 25,
 *     limit: 50
 *   }
 * }
 */
export const searchProducts = async (req: Request, res: Response) => {
    try {
        const searchTerm = (req.query.q as string) || '';
        const limit = parseInt(req.query.limit as string) || 50;
        
        // Validate search term
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
 * GET PRODUCT BY ID
 * 
 * Endpoint: GET /api/products/:id
 * 
 * PURPOSE: Fetch a single product by its unique ID
 * 
 * FLOW:
 * 1. Extract product ID from URL parameter (req.params.id)
 * 2. Query Product table for product with matching ID
 * 3. Check if product exists
 * 4. Return product data or 404 error
 * 
 * RETURNS: Single product object or 404 error
 */
export const getProductById = async (req: Request, res: Response) => {
    try {
        // Extract product ID from URL parameter
        // Example: GET /api/products/123 → id = "123"
        const id = req.params.id;
        
        // Query database for product with matching ID
        const { data, error } = await supabase
            .from('Product')
            .select('*')  // Get all columns
            .eq('ProductID', id);  // Where ProductID equals the provided id
        
        // Check for database errors
        if (error) {
            console.error('Supabase error fetching product:', error);
            throw error;
        }
        
        // Check if product was found
        // data is an array, so check if it's empty
        if (!data || data.length === 0) {
            // Return 404 Not Found error
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Return the first (and only) product from results
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
 * CREATE PRODUCT
 * 
 * Endpoint: POST /api/products
 * 
 * PURPOSE: Add a new product to the database
 * 
 * FLOW:
 * 1. Extract product data from request body (req.body)
 * 2. Insert new product into Product table
 * 3. Return created product data
 * 
 * REQUEST BODY: Product object with fields like Name, SellingPrice, Category, etc.
 */
export const createProduct = async (req: Request, res: Response) => {
    try {
        // Insert product data from request body into Product table
        // req.body contains the JSON data sent from frontend
        const {data, error} = await supabase.from('Product').insert(req.body);
        
        if (error) throw error;  // If insert fails, throw error
        
        console.log('Product created:',data);
        res.json(data);  // Return created product
    } catch (error) {
        console.log('Error:',error);
        res.status(500).json({message: 'Internal Server Error'});
    }
}

/**
 * UPDATE PRODUCT
 * 
 * Endpoint: PUT /api/products/:id
 * 
 * PURPOSE: Update an existing product's information
 * 
 * FLOW:
 * 1. Extract product ID from URL parameter
 * 2. Extract update data from request body
 * 3. Update product in database where ProductID matches
 * 4. Return updated product data
 * 
 * REQUEST BODY: Object with fields to update (only send fields that changed)
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    // Get product ID from URL
    const id = req.params.id;
    
    // Update product where ProductID matches
    // req.body contains only the fields to update
    const {data, error} = await supabase
        .from('Product')
        .update(req.body)  // Update with new values
        .eq('ProductID', id);  // Where ProductID equals id
    
    if (error) throw error;
    res.json(data);  // Return updated product
  } catch (error) {
    res.status(500).json({message: "Internal Server Error"});
  }
} 

/**
 * DELETE PRODUCT
 * 
 * Endpoint: DELETE /api/products/:id
 * 
 * PURPOSE: Remove a product from the database
 * 
 * FLOW:
 * 1. Extract product ID from URL parameter
 * 2. Delete product from database where ProductID matches
 * 3. Return confirmation
 * 
 * NOTE: This permanently deletes the product. Consider soft delete (IsActive=false) instead.
 */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        // Get product ID from URL
        const id = req.params.id;
        
        // Delete product from database
        const {data, error} = await supabase
            .from('Product')
            .delete()  // Delete operation
            .eq('ProductID', id);  // Where ProductID equals id
        
        if (error) throw error;
        res.json(data);  // Return deleted product data
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
}

