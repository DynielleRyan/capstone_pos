/**
 * ============================================================================
 * PRODUCT ROUTES
 * ============================================================================
 * 
 * Defines all product-related API endpoints. Products are the core inventory
 * items sold in the pharmacy. Routes handle CRUD operations and product search.
 * 
 * ROUTE MOUNTING:
 * These routes are mounted at /api/products in server.ts, so a route defined
 * here as '/search' becomes accessible at /api/products/search.
 * 
 * AUTHENTICATION:
 * Currently, product routes are public (no authentication required). In production,
 * you may want to add authentication middleware to protect write operations
 * (POST, PUT, DELETE) while keeping read operations (GET) public for the PoS system.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Pagination: Limits results to reduce payload size and improve load times
 * - Two-step queries: Fetches products first, then stock data only for those products
 * - Search indexing: Backend search uses database indexes for fast queries
 */

import express from 'express';
import {
    getAllProducts,
    searchProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
} from '../controllers/ProductsController';

const router = express.Router();

/**
 * ============================================================================
 * PRODUCT CRUD ROUTES
 * ============================================================================
 */

/**
 * Product Search
 * 
 * Searches products across Name, GenericName, and Brand fields using case-insensitive
 * pattern matching. This is a specialized endpoint that searches the entire database,
 * not just loaded products.
 * 
 * ROUTE ORDER IMPORTANCE:
 * This route must be defined BEFORE '/:id' because Express matches routes in order.
 * If '/:id' comes first, a request to '/search' would match ':id' with value 'search',
 * causing incorrect routing.
 * 
 * QUERY PARAMETERS:
 * - q: Search term (minimum 2 characters, required)
 * - limit: Maximum results (default: 50)
 * 
 * Returns products with calculated stock information, sorted by name.
 */
router.get('/search', searchProducts);

/**
 * Get All Products (Paginated)
 * 
 * Retrieves active products with pagination support. This is the main endpoint used
 * by the dashboard to display products. Uses a two-step query optimization:
 * 
 * STEP 1: Fetch products with pagination (e.g., 40 products per page)
 * STEP 2: Fetch stock data (Product_Item records) only for those 40 products
 * 
 * This optimization reduces database load from potentially 10,000+ Product_Item records
 * to just the items needed for the current page (~100-200 records).
 * 
 * QUERY PARAMETERS:
 * - page: Page number (default: 1)
 * - limit: Products per page (default: 40)
 * 
 * Returns: { data: Product[], pagination: { page, limit, total, totalPages, hasMore } }
 */
router.get('/', getAllProducts);

/**
 * Get Single Product
 * 
 * Retrieves a single product by its unique ProductID (UUID). Used when viewing
 * product details or editing a specific product.
 * 
 * Returns the complete product record including all fields. If the product doesn't
 * exist, returns 404 Not Found.
 */
router.get('/:id', getProductById);

/**
 * Create Product
 * 
 * Creates a new product in the database. The request body should contain all required
 * product fields (Name, SellingPrice, Category, etc.) as defined by the Product
 * table schema.
 * 
 * After creation, stock must be added separately via the inventory endpoints, as
 * products and stock items are stored in separate tables (Product and Product_Item).
 */
router.post('/', createProduct);

/**
 * Update Product
 * 
 * Updates an existing product. Supports partial updates - you only need to send the
 * fields you want to change. The ProductID in the URL identifies which product to update.
 * 
 * Common use cases: Updating price, changing category, modifying product details.
 * The UpdatedAt timestamp is automatically set by the database.
 */
router.put('/:id', updateProduct);

/**
 * Delete Product
 * 
 * Permanently deletes a product from the database. This is a hard delete - the product
 * record is completely removed and cannot be recovered.
 * 
 * WARNING: This does not delete associated Product_Item records (stock items). Those
 * should be handled separately. Also consider using soft delete (IsActive = false)
 * instead to preserve data for audit purposes.
 */
router.delete('/:id', deleteProduct);

export default router; 