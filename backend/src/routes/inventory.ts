/**
 * ============================================================================
 * INVENTORY ROUTES
 * ============================================================================
 * 
 * Defines all inventory management API endpoints. Inventory in this system is
 * managed at the batch level, allowing for proper stock tracking with expiry dates.
 * 
 * INVENTORY ARCHITECTURE:
 * 
 * Product (Master Record):
 *   - Contains product information (name, price, category, VAT status)
 *   - One product can have multiple batches (Product_Item records)
 * 
 * Product_Item (Batch Records):
 *   - Represents a specific batch of stock with expiry date
 *   - Contains: Stock quantity, ExpiryDate, BatchNumber, Location
 *   - Multiple Product_Items can belong to one Product
 * 
 * Stock Calculation:
 *   Total stock for a product = Sum of all Product_Item.Stock where ProductID matches
 * 
 * WHY BATCH-LEVEL TRACKING?
 * - Enables FIFO (First In, First Out) stock management
 * - Tracks expiry dates for pharmaceutical products
 * - Allows batch recalls if needed
 * - Supports accurate inventory auditing
 * 
 * AUTHENTICATION:
 * Currently public, but should be protected in production as inventory management
 * is a sensitive operation that affects business operations.
 */

import express from 'express';
import {
    getAllProductItems,
    getProductItemsByProductId,
    getProductStock,
    getAllProductsWithStock,
    addStock,
    updateStock,
    deleteProductItem
} from '../controllers/InventoryController';

const router = express.Router();

/**
 * ============================================================================
 * INVENTORY QUERY ROUTES
 * ============================================================================
 */

/**
 * Get All Product Items
 * 
 * Retrieves all Product_Item records (all batches of all products) from the database.
 * This provides a complete view of inventory at the batch level, including expiry
 * dates and batch numbers.
 * 
 * USE CASES:
 * - Complete inventory audit
 * - Expiry date tracking and alerts
 * - Batch-level inventory reports
 * - Stock reconciliation
 * 
 * NOTE: This can return a large dataset if there are many products with multiple
 * batches. Consider adding pagination or filtering if performance becomes an issue.
 */
router.get('/items', getAllProductItems);

/**
 * Get Product Items by Product ID
 * 
 * Retrieves all batches (Product_Item records) for a specific product. This is useful
 * when you need to see all the different batches, expiry dates, and stock quantities
 * for a single product.
 * 
 * USE CASES:
 * - Viewing all batches when receiving new stock
 * - Checking expiry dates for a specific product
 * - Understanding stock distribution across batches
 * - Planning stock rotation (FIFO)
 */
router.get('/items/product/:productId', getProductItemsByProductId);

/**
 * Get Total Stock for Product
 * 
 * Calculates and returns the total stock quantity for a specific product by summing
 * all Product_Item.Stock values where ProductID matches. This is a quick way to get
 * the total available quantity without fetching all batch records.
 * 
 * USE CASES:
 * - Quick stock check before adding to cart
 * - Low stock alerts
 * - Product availability display
 * 
 * Returns: { productId: string, totalStock: number }
 */
router.get('/stock/:productId', getProductStock);

/**
 * Get All Products with Stock Summary
 * 
 * Retrieves all products along with their calculated total stock. This combines Product
 * records with aggregated stock data, providing a complete inventory overview in a
 * single query.
 * 
 * USE CASES:
 * - Inventory dashboard
 * - Low stock reports
 * - Product availability overview
 * - Stock level monitoring
 * 
 * The stock is calculated server-side by aggregating Product_Item records, ensuring
 * accuracy and reducing frontend computation.
 */
router.get('/products-with-stock', getAllProductsWithStock);

/**
 * ============================================================================
 * INVENTORY MANAGEMENT ROUTES
 * ============================================================================
 */

/**
 * Add Stock (New Batch)
 * 
 * Creates a new Product_Item record, representing a new batch of stock received.
 * This is used when:
 * - Receiving new inventory from suppliers
 * - Adding a new batch with different expiry date
 * - Restocking products
 * 
 * REQUEST BODY:
 * {
 *   ProductID: string (UUID of the product),
 *   Stock: number (quantity received),
 *   ExpiryDate: date (optional, but recommended for pharmaceuticals),
 *   BatchNumber: string (optional, supplier batch number),
 *   Location: string (optional, default: 'main_store')
 * }
 * 
 * When stock is added, it becomes available for sale immediately. The system uses
 * FIFO (First In, First Out) when selling, so older batches are sold first.
 */
router.post('/add', addStock);

/**
 * Update Stock Item
 * 
 * Updates an existing Product_Item record. Commonly used for:
 * - Adjusting stock quantities (corrections, damaged goods)
 * - Updating expiry dates (if supplier provides correction)
 * - Changing batch numbers or locations
 * 
 * Supports partial updates - only send the fields you want to change. The ProductItemID
 * in the URL identifies which batch to update.
 * 
 * WARNING: Updating stock quantities directly can affect inventory accuracy. Consider
 * using transactions or adjustment records to maintain an audit trail.
 */
router.put('/:id', updateStock);

/**
 * Delete Stock Item
 * 
 * Permanently removes a Product_Item record from the database. This is a hard delete
 * and cannot be undone.
 * 
 * USE CASES:
 * - Removing expired stock (after disposal)
 * - Deleting damaged inventory records
 * - Cleaning up test data
 * - Correcting data entry errors
 * 
 * WARNING: This permanently deletes the stock record. Consider using soft delete
 * (IsActive = false) instead to maintain an audit trail of all inventory changes.
 * 
 * NOTE: Deleting a stock item reduces the total stock for that product, which may
 * affect product availability in the PoS system.
 */
router.delete('/:id', deleteProductItem);

export default router;