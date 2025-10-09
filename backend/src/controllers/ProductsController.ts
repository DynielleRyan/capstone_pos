import { supabase } from '../utils/database';
import { Request, Response } from 'express';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('Product').select('*');
        if (error) throw error;
        console.log('Product GET',data);
        res.json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }

}

export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const {data, error} = await supabase.from('Product').select('*').eq('ProductID',id);
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({message: 'Internal Server Error'});
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

