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

router.get('/items', getAllProductItems);
router.get('/items/product/:productId', getProductItemsByProductId);
router.get('/stock/:productId', getProductStock);
router.get('/products-with-stock', getAllProductsWithStock); // New endpoint to see all products with stock
router.post('/add', addStock);
router.put('/:id', updateStock);
router.delete('/:id', deleteProductItem);

export default router;