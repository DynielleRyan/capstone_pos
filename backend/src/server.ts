import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config'; //global import for all files 
import  { supabase } from './utils/database';
import productRoutes from './routes/products';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
// dotenv.config(); //loads the env file globally 
import inventoryRoutes from './routes/inventory';

const app = express(); 
const PORT = process.env.PORT || 5002;

//Middlewares
// CORS configuration - supports both local development and production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        "http://localhost:5173",
        "http://localhost:5179",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178"
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Required for httpOnly cookies
}));

app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

//Routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.get('/api/health', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing Supabase connection...');
        
        // Test 1: Basic connection test
        const {data, error} = await supabase.from('Product').select('*').limit(1);
        if (error) {
            throw error;
        }
        
        // Test 2: Check if we can query auth users (tests service role key)
        const {data: authTest, error: authError} = await supabase.auth.admin.listUsers();
        
        const response: any = {
            success: true,
            message: 'Supabase connection successful!',
            timestamp: new Date().toISOString(),
            tests: {
                database: {
                    status: 'connected',
                    message: 'Successfully queried Product table',
                    sampleData: data?.length || 0
                }
            }
        };
        
        if (!authError) {
            response.tests.auth = {
                status: 'connected',
                message: 'Service role key is valid',
                userCount: authTest?.users?.length || 0
            };
        } else {
            response.tests.auth = {
                status: 'warning',
                message: 'Could not test auth (this is normal if using anon key)',
                error: authError.message
            };
        }
        
        res.json(response);
    } catch (error: any) {
        console.error('Supabase connection test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Supabase connection failed',
            error: error.message || 'Unknown error',
            details: error.details || null,
            hint: error.message?.includes('Invalid API key') 
                ? 'Check your SUPABASE_SERVICE_ROLE_KEY in .env file'
                : 'Verify your Supabase credentials and network connection'
        });
    }
})


app.listen(PORT, () => {
    console.log(`Server running http:${PORT}`);
});