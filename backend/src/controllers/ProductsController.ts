import { supabase } from '../utils/database';
import { Request, Response } from 'express';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('Product').select('*');
        if (error) {
            console.error('Supabase error fetching products:', error);
            throw error;
        }
        console.log('Product GET - Success:', data?.length || 0, 'products');
        res.json(data || []);
    } catch (error: any) {
        console.error('Error in getAllProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
}

export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
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
        
        res.json(data[0]);
    } catch (error: any) {
        console.error('Error in getProductById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error?.message || 'Unknown error',
            details: error
        });
    }
}


export const createProduct = async (req: Request, res: Response) => {
    try {
        const {data, error} = await supabase.from('Product').insert(req.body);
        if (error) throw error;
        console.log('Product created:',data);
        res.json(data);
    } catch (error) {
        console.log('Error:',error);
        res.status(500).json({message: 'Internal Server Error'});
    }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const {data, error} = await supabase.from('Product').update(req.body).eq('ProductID',id);
    if (error) throw error
    res.json(data);
  } catch (error) {
    res.status(500).json({message: "Internal Server Error"});
  }
} 

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const {data,error} = await supabase.from('Product').delete().eq('ProductID', id);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
}

