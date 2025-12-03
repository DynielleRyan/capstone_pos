"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const database_1 = require("../utils/database");
const getAllProducts = async (req, res) => {
    try {
        const { data, error } = await database_1.supabase.from('Product').select('*');
        if (error) {
            console.error('Supabase error fetching products:', error);
            throw error;
        }
        console.log('Product GET - Success:', data?.length || 0, 'products');
        res.json(data || []);
    }
    catch (error) {
        console.error('Error in getAllProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
};
exports.getAllProducts = getAllProducts;
const getProductById = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await database_1.supabase
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
        res.json(data[0]);
    }
    catch (error) {
        console.error('Error in getProductById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { data, error } = await database_1.supabase.from('Product').insert(req.body);
        if (error)
            throw error;
        console.log('Product created:', data);
        res.json(data);
    }
    catch (error) {
        console.log('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await database_1.supabase.from('Product').update(req.body).eq('ProductID', id);
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await database_1.supabase.from('Product').delete().eq('ProductID', id);
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteProduct = deleteProduct;
//# sourceMappingURL=ProductsController.js.map