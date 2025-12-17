/**
 * ============================================================================
 * INVENTORY CONTROLLER
 * ============================================================================
 * 
 * Handles all inventory management operations at the batch level (Product_Item records).
 * Inventory is managed separately from products because one product can have multiple
 * batches with different expiry dates, requiring batch-level tracking.
 * 
 * INVENTORY CONCEPTS:
 * - Product: Master record (name, price, category)
 * - Product_Item: Individual batch (quantity, expiry date, batch number)
 * - Stock: Sum of all Product_Item.Stock for a product
 * - FIFO: First In, First Out - sell oldest stock first
 * 
 * This separation allows for:
 * - Expiry date tracking
 * - Batch recalls
 * - Accurate inventory auditing
 * - FIFO stock management
 */

import { supabase } from '../utils/database';
import { Request, Response } from 'express';

/**
 * Get All Product Items
 * 
 * Retrieves all Product_Item records (all batches of all products) with their
 * associated Product information. This provides a complete inventory view at
 * the batch level.
 * 
 * The query uses Supabase's relational query feature to join Product_Item with
 * Product table, returning product details (name, price, etc.) along with batch
 * information (stock, expiry date, etc.) in a single query.
 * 
 * Sorted by CreatedAt (newest first) to show recently added stock first.
 */
export const getAllProductItems = async (req: Request, res: Response) => {
    try {
        /**
         * Relational Query with Product Information
         * 
         * Uses Supabase's nested select syntax to join Product_Item with Product table.
         * This is more efficient than making separate queries and joining in code.
         * The syntax `Product (Name, GenericName, ...)` tells Supabase to include
         * those fields from the related Product record.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .select(`
                *,
                Product (
                    Name,
                    GenericName,
                    Category,
                    Brand,
                    SellingPrice,
                    Image
                )
            `)
            .order('CreatedAt', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching product items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product items',
            error: error
        });
    }
};

/**
 * Get Product Items by Product ID
 * 
 * Retrieves all batches (Product_Item records) for a specific product. This is
 * useful when you need to see all the different batches, expiry dates, and stock
 * quantities for a single product.
 * 
 * Sorted by ExpiryDate (oldest first) to support FIFO inventory management - you
 * can see which batches should be sold first to prevent expiry.
 * 
 * nullsFirst: false means items without expiry dates appear after items with dates.
 */
export const getProductItemsByProductId = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;
        
        /**
         * Query Product Items for Specific Product
         * 
         * Filters Product_Item records by ProductID and only includes active items.
         * The ExpiryDate sorting ensures oldest items (earliest expiry) appear first,
         * which is important for FIFO stock management.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .select('*')
            .eq('ProductID', productId)
            .eq('IsActive', true)
            .order('ExpiryDate', { ascending: true, nullsFirst: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching product items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product items',
            error: error
        });
    }
};

/**
 * Get Total Stock for Product
 * 
 * Calculates the total stock quantity for a specific product by summing all
 * active Product_Item.Stock values. This is a quick way to get total availability
 * without fetching all batch records.
 * 
 * Returns both the total stock and the individual batch details, allowing the
 * frontend to display both summary and detailed information.
 */
export const getProductStock = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;
        
        /**
         * Fetch All Active Product Items
         * 
         * Retrieves all active batches for the product. We then sum the Stock
         * values in JavaScript rather than using SQL aggregation, which gives
         * us more flexibility and allows us to return both the total and the
         * individual batch details.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .select('Stock, ProductItemID, ExpiryDate, BatchNumber')
            .eq('ProductID', productId)
            .eq('IsActive', true);

        if (error) throw error;

        /**
         * Calculate Total Stock
         * 
         * Uses reduce() to sum all Stock values. The || 0 handles cases where
         * Stock might be null or undefined, defaulting to 0.
         */
        const totalStock = data.reduce((sum, item) => sum + (item.Stock || 0), 0);
        
        res.json({
            productId,
            totalStock,
            items: data
        });
    } catch (error) {
        console.error('Error fetching product stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product stock',
            error: error
        });
    }
};

/**
 * Get All Products with Stock Summary
 * 
 * Retrieves all products along with their calculated total stock. This combines
 * Product records with aggregated stock data, providing a complete inventory
 * overview in a single response.
 * 
 * This endpoint is useful for:
 * - Inventory dashboards
 * - Low stock alerts
 * - Product availability overview
 * - Stock level monitoring
 * 
 * The stock calculation is performed server-side by aggregating Product_Item
 * records, ensuring accuracy and reducing frontend computation.
 */
export const getAllProductsWithStock = async (req: Request, res: Response) => {
    try {
        /**
         * Fetch All Active Products
         * 
         * Gets all active products with essential fields. We don't need all product
         * fields for an inventory overview, so we select only what's needed to
         * reduce payload size.
         */
        const { data: products, error: productsError } = await supabase
            .from('Product')
            .select('ProductID, Name, GenericName, Category, Brand, SellingPrice')
            .eq('IsActive', true);

        if (productsError) throw productsError;

        /**
         * Fetch All Active Product Items
         * 
         * Gets all active stock items. We'll aggregate these by ProductID to
         * calculate total stock for each product.
         */
        const { data: productItems, error: itemsError } = await supabase
            .from('Product_Item')
            .select('ProductID, Stock, ProductItemID, ExpiryDate, BatchNumber, IsActive')
            .eq('IsActive', true);

        if (itemsError) throw itemsError;

        /**
         * Aggregate Stock by Product
         * 
         * For each product, filters Product_Items that belong to it and calculates
         * the total stock. Also includes individual batch details (expiry dates,
         * batch numbers) for comprehensive inventory information.
         * 
         * This approach allows the frontend to display both summary (total stock)
         * and detailed (per-batch) information without making additional API calls.
         */
        const productsWithStock = products.map(product => {
            const items = productItems.filter(item => item.ProductID === product.ProductID);
            const totalStock = items.reduce((sum, item) => sum + (item.Stock || 0), 0);
            
            return {
                ...product,
                totalStock,
                stockItems: items.map(item => ({
                    productItemId: item.ProductItemID,
                    stock: item.Stock,
                    expiryDate: item.ExpiryDate,
                    batchNumber: item.BatchNumber
                }))
            };
        });

        res.json({
            success: true,
            products: productsWithStock
        });
    } catch (error) {
        console.error('Error fetching products with stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products with stock',
            error: error
        });
    }
};

/**
 * Add Stock (Create New Batch)
 * 
 * Creates a new Product_Item record, representing a new batch of stock received.
 * This is used when:
 * - Receiving new inventory from suppliers
 * - Adding a new batch with different expiry date
 * - Restocking products
 * 
 * VALIDATION:
 * - ProductID: Required (must exist in Product table)
 * - Stock: Required (quantity received)
 * - UserID: Required (who added the stock)
 * - ExpiryDate: Optional (but recommended for pharmaceuticals)
 * - BatchNumber: Optional (supplier batch number)
 * - Location: Optional (defaults to 'main_store')
 * 
 * When stock is added, it becomes available for sale immediately. The system uses
 * FIFO (First In, First Out) when selling, so older batches are sold first.
 */
export const addStock = async (req: Request, res: Response) => {
    try {
        const {
            ProductID,
            Stock,
            ExpiryDate,
            BatchNumber,
            Location,
            UserID
        } = req.body;

        /**
         * Validate Required Fields
         * 
         * Ensures all required fields are present before attempting to create
         * the Product_Item record. Returns 400 Bad Request if validation fails.
         */
        if (!ProductID || Stock === undefined || !UserID) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ProductID, Stock, UserID'
            });
        }

        /**
         * Prepare Product Item Data
         * 
         * Constructs the Product_Item record with provided values and defaults.
         * The IsActive flag is set to true so the stock is immediately available
         * for sale.
         */
        const productItemData = {
            ProductID,
            UserID,
            Stock: Stock || 0,
            ExpiryDate: ExpiryDate || null,
            BatchNumber: BatchNumber || null,
            Location: Location || 'main_store',
            IsActive: true
        };

        /**
         * Insert Product Item Record
         * 
         * Creates the new Product_Item record in the database. The .select()
         * and .single() ensure we get the created record back in the response,
         * including any auto-generated fields like ProductItemID and CreatedAt.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .insert(productItemData)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Stock added successfully',
            productItem: data
        });
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add stock',
            error: error
        });
    }
};

/**
 * Update Stock Item
 * 
 * Updates an existing Product_Item record. Commonly used for:
 * - Adjusting stock quantities (corrections, damaged goods)
 * - Updating expiry dates (if supplier provides correction)
 * - Changing batch numbers or locations
 * - Deactivating stock items (soft delete)
 * 
 * PARTIAL UPDATE SUPPORT:
 * Only the fields included in req.body will be updated. Other fields remain
 * unchanged. This allows for efficient updates when only changing specific
 * properties.
 * 
 * The DateTimeLastUpdate timestamp is automatically set to track when the
 * stock item was last modified.
 */
export const updateStock = async (req: Request, res: Response) => {
    try {
        const productItemId = req.params.id;
        const { Stock, ExpiryDate, BatchNumber, Location, IsActive } = req.body;

        /**
         * Build Update Object
         * 
         * Only includes fields that were provided in the request body. This
         * allows for partial updates - you can update just the stock quantity,
         * or just the expiry date, without affecting other fields.
         */
        const updateData: any = {
            DateTimeLastUpdate: new Date().toISOString()
        };

        if (Stock !== undefined) updateData.Stock = Stock;
        if (ExpiryDate !== undefined) updateData.ExpiryDate = ExpiryDate;
        if (BatchNumber !== undefined) updateData.BatchNumber = BatchNumber;
        if (Location !== undefined) updateData.Location = Location;
        if (IsActive !== undefined) updateData.IsActive = IsActive;

        /**
         * Update Product Item Record
         * 
         * Updates only the Product_Item with matching ProductItemID. The .select()
         * and .single() ensure we get the updated record back in the response.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .update(updateData)
            .eq('ProductItemID', productItemId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Stock updated successfully',
            productItem: data
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock',
            error: error
        });
    }
};

/**
 * Delete Product Item (Soft Delete)
 * 
 * Deactivates a Product_Item record by setting IsActive = false. This is a
 * soft delete because the record remains in the database but is marked as
 * inactive and excluded from active stock queries.
 * 
 * USE CASES:
 * - Removing expired stock (after disposal)
 * - Deactivating damaged inventory records
 * - Cleaning up test data
 * - Correcting data entry errors
 * 
 * BENEFITS OF SOFT DELETE:
 * - Preserves data for audit purposes
 * - Allows recovery if item is accidentally deactivated
 * - Maintains referential integrity (Transaction_Item records can still reference it)
 * - Provides historical record of all inventory changes
 * 
 * NOTE: Deactivating a stock item reduces the total stock for that product,
 * which may affect product availability in the PoS system.
 */
export const deleteProductItem = async (req: Request, res: Response) => {
    try {
        const productItemId = req.params.id;

        /**
         * Soft Delete by Setting IsActive = false
         * 
         * Instead of permanently deleting the record, we set IsActive = false.
         * This preserves the data for audit purposes while effectively removing
         * it from active inventory calculations.
         */
        const { data, error } = await supabase
            .from('Product_Item')
            .update({ IsActive: false })
            .eq('ProductItemID', productItemId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Product item deactivated successfully',
            productItem: data
        });
    } catch (error) {
        console.error('Error deleting product item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product item',
            error: error
        });
    }
};