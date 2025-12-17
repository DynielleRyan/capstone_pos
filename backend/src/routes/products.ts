/**
 * ============================================================================
 * PRODUCT ROUTES - routes/products.ts
 * ============================================================================
 * 
 * This file defines all product-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * All routes are prefixed with /api/products (defined in server.ts)
 * 
 * ENDPOINTS:
 * - GET    /api/products          → Get all products with stock information
 * - GET    /api/products/:id      → Get single product by ID
 * - POST   /api/products          → Create new product
 * - PUT    /api/products/:id      → Update existing product
 * - DELETE /api/products/:id      → Delete product
 * 
 * AUTHENTICATION:
 * Currently, product routes don't require authentication (public access)
 * In production, you may want to add authentication middleware
 * 
 * PERFORMANCE:
 * - getAllProducts: Optimized to fetch only 70 products at a time
 * - Stock calculation: Uses efficient two-step query (products first, then items)
 */

// Import Express Router to create route handlers
import express from 'express';

// Import product controller functions
import {
    getAllProducts,    // Get all products with stock (paginated)
    searchProducts,   // Search products across all products
    getProductById,   // Get single product
    createProduct,    // Create new product
    updateProduct,    // Update product
    deleteProduct,    // Delete product
} from '../controllers/ProductsController';

// Create Express router instance
const router = express.Router();

/**
 * ============================================================================
 * PRODUCT CRUD ROUTES
 * ============================================================================
 */

// GET /api/products/search?q=searchterm
// Search all products in the database
// Returns: Search results with stock information
// Note: This route must be before /:id to avoid route conflicts
router.get('/search', searchProducts);

// GET /api/products?page=1&limit=40
// Get all active products with pagination and stock information
// Returns: Object with products array and pagination metadata
// Optimized: Only fetches Product_Items for the products being returned
router.get('/', getAllProducts);

// GET /api/products/:id
// Get a single product by its ProductID
// URL parameter: :id (ProductID UUID)
// Returns: Single product object or 404 if not found
router.get('/:id', getProductById);

// POST /api/products
// Create a new product
// Request body: Product object (Name, SellingPrice, Category, etc.)
// Returns: Created product data
router.post('/', createProduct);

// PUT /api/products/:id
// Update an existing product
// URL parameter: :id (ProductID UUID)
// Request body: Object with fields to update (partial update supported)
// Returns: Updated product data
router.put('/:id', updateProduct);

// DELETE /api/products/:id
// Delete a product from the database
// URL parameter: :id (ProductID UUID)
// WARNING: This permanently deletes the product
// Consider: Soft delete (IsActive = false) instead
router.delete('/:id', deleteProduct);

// Export router to be used in server.ts
export default router; 