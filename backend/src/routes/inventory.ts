/**
 * ============================================================================
 * INVENTORY ROUTES - routes/inventory.ts
 * ============================================================================
 * 
 * This file defines all inventory-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * All routes are prefixed with /api/inventory (defined in server.ts)
 * 
 * ENDPOINTS:
 * - GET    /api/inventory/items                    → Get all product items
 * - GET    /api/inventory/items/product/:productId → Get items for specific product
 * - GET    /api/inventory/stock/:productId         → Get total stock for product
 * - GET    /api/inventory/products-with-stock      → Get all products with stock summary
 * - POST   /api/inventory/add                      → Add new stock item
 * - PUT    /api/inventory/:id                      → Update stock item
 * - DELETE /api/inventory/:id                      → Delete stock item
 * 
 * INVENTORY CONCEPT:
 * - Product: Master product record (name, price, category)
 * - Product_Item: Individual stock items (batches with expiry dates)
 * - One Product can have multiple Product_Items (different batches, expiry dates)
 * - Stock is calculated by summing all Product_Item.Stock values for a Product
 * 
 * AUTHENTICATION:
 * Currently, inventory routes don't require authentication (public access)
 * In production, you should add authentication middleware
 */

// Import Express Router to create route handlers
import express from 'express';

// Import inventory controller functions
import {
    getAllProductItems,              // Get all product items
    getProductItemsByProductId,      // Get items for specific product
    getProductStock,                 // Get total stock for product
    getAllProductsWithStock,         // Get all products with stock summary
    addStock,                        // Add new stock item
    updateStock,                     // Update stock item
    deleteProductItem                // Delete stock item
} from '../controllers/InventoryController';

// Create Express router instance
const router = express.Router();

/**
 * ============================================================================
 * INVENTORY QUERY ROUTES
 * ============================================================================
 */

// GET /api/inventory/items
// Get all product items (all batches of all products)
// Returns: Array of Product_Item records
// Use case: Inventory management, stock auditing
router.get('/items', getAllProductItems);

// GET /api/inventory/items/product/:productId
// Get all product items for a specific product
// URL parameter: :productId (ProductID UUID)
// Returns: Array of Product_Item records for the specified product
// Use case: View all batches/expiry dates for a product
router.get('/items/product/:productId', getProductItemsByProductId);

// GET /api/inventory/stock/:productId
// Get total stock quantity for a specific product
// URL parameter: :productId (ProductID UUID)
// Returns: { productId, totalStock: number }
// Calculation: Sum of all Product_Item.Stock where ProductID matches
router.get('/stock/:productId', getProductStock);

// GET /api/inventory/products-with-stock
// Get all products with their total stock summary
// Returns: Array of products with calculated stock field
// Use case: Inventory overview, low stock alerts
router.get('/products-with-stock', getAllProductsWithStock);

/**
 * ============================================================================
 * INVENTORY MANAGEMENT ROUTES
 * ============================================================================
 */

// POST /api/inventory/add
// Add a new stock item (new batch)
// Request body: {
//   ProductID: string,
//   Stock: number,
//   ExpiryDate: date (optional),
//   BatchNumber: string (optional),
//   Location: string (optional, default: 'main_store')
// }
// Returns: Created Product_Item record
// Use case: Receiving new stock, adding new batch
router.post('/add', addStock);

// PUT /api/inventory/:id
// Update an existing stock item
// URL parameter: :id (ProductItemID UUID)
// Request body: Object with fields to update (Stock, ExpiryDate, etc.)
// Returns: Updated Product_Item record
// Use case: Adjust stock quantity, update expiry date
router.put('/:id', updateStock);

// DELETE /api/inventory/:id
// Delete a stock item
// URL parameter: :id (ProductItemID UUID)
// WARNING: This permanently deletes the stock item
// Consider: Soft delete (IsActive = false) instead
// Use case: Remove damaged/expired stock
router.delete('/:id', deleteProductItem);

// Export router to be used in server.ts
export default router;