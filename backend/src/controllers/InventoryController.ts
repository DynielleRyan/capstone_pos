import { supabase } from '../utils/database';
import { Request, Response } from 'express';

// Get all product items with stock information
export const getAllProductItems = async (req: Request, res: Response) => {
    try {
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

// Get product items for a specific product
export const getProductItemsByProductId = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;
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

// Get total stock for a product (sum of all active product items)
export const getProductStock = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;
        const { data, error } = await supabase
            .from('Product_Item')
            .select('Stock, ProductItemID, ExpiryDate, BatchNumber')
            .eq('ProductID', productId)
            .eq('IsActive', true);

        if (error) throw error;

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

// Get all products with their total stock (useful for viewing inventory)
export const getAllProductsWithStock = async (req: Request, res: Response) => {
    try {
        // Get all products
        const { data: products, error: productsError } = await supabase
            .from('Product')
            .select('ProductID, Name, GenericName, Category, Brand, SellingPrice')
            .eq('IsActive', true);

        if (productsError) throw productsError;

        // Get all product items with stock
        const { data: productItems, error: itemsError } = await supabase
            .from('Product_Item')
            .select('ProductID, Stock, ProductItemID, ExpiryDate, BatchNumber, IsActive')
            .eq('IsActive', true);

        if (itemsError) throw itemsError;

        // Calculate total stock for each product
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

// Add stock to a product item (or create new product item)
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

        if (!ProductID || Stock === undefined || !UserID) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ProductID, Stock, UserID'
            });
        }

        const productItemData = {
            ProductID,
            UserID,
            Stock: Stock || 0,
            ExpiryDate: ExpiryDate || null,
            BatchNumber: BatchNumber || null,
            Location: Location || 'main_store',
            IsActive: true
        };

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

// Update stock for a specific product item
export const updateStock = async (req: Request, res: Response) => {
    try {
        const productItemId = req.params.id;
        const { Stock, ExpiryDate, BatchNumber, Location, IsActive } = req.body;

        const updateData: any = {
            DateTimeLastUpdate: new Date().toISOString()
        };

        if (Stock !== undefined) updateData.Stock = Stock;
        if (ExpiryDate !== undefined) updateData.ExpiryDate = ExpiryDate;
        if (BatchNumber !== undefined) updateData.BatchNumber = BatchNumber;
        if (Location !== undefined) updateData.Location = Location;
        if (IsActive !== undefined) updateData.IsActive = IsActive;

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

// Delete/deactivate a product item
export const deleteProductItem = async (req: Request, res: Response) => {
    try {
        const productItemId = req.params.id;

        // Soft delete by setting IsActive to false
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