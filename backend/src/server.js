import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import  { supabase } from './utils/database'

dotenv.config(); //loads the env file globally 

const app = express(); 
const PORT = process.env.PORT || 5002;

//Middlewares
app.use(cors({
    origin: "http://localhost:5173",
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const {data, error} = await supabase.from('products').select('*').limit(1);
        if (error) {
            throw error
        };
        res.json({message: 'Database Connected',data});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.listen(PORT, () => {
    console.log(`Server running http:${PORT}`);
});