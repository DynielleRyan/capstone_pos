/**
 * ============================================================================
 * BACKEND SERVER - MAIN ENTRY POINT
 * ============================================================================
 * 
 * This is the main server file that initializes the Express.js backend application.
 * It sets up middleware, configures CORS, registers routes, and starts the HTTP server.
 * 
 * FLOW:
 * 1. Import dependencies (Express, CORS, routes, database)
 * 2. Create Express app instance
 * 3. Configure CORS (Cross-Origin Resource Sharing) for security
 * 4. Add middleware (JSON parser, cookie parser)
 * 5. Register API route handlers
 * 6. Add utility endpoints (health check, database test)
 * 7. Start HTTP server on specified port
 */

// Import Express framework - handles HTTP requests and routing
import express from 'express';

// Import CORS middleware - allows frontend to make requests from different origin
import cors from 'cors';

// Import cookie parser - enables reading/writing cookies (for JWT tokens)
import cookieParser from 'cookie-parser';

// Import dotenv - loads environment variables from .env file
// This makes process.env variables available (like SUPABASE_URL, PORT, etc.)
import 'dotenv/config';

// Import Supabase database client - used for database connection testing
import { supabase } from './utils/database';

// Import route handlers - these define the API endpoints
import productRoutes from './routes/products';        // Product management endpoints
import authRoutes from './routes/auth';                // Authentication endpoints
import transactionRoutes from './routes/transactions';  // Transaction endpoints
import inventoryRoutes from './routes/inventory';     // Inventory management endpoints

// Create Express application instance - this is our web server
const app = express(); 

// Set server port - uses environment variable PORT or defaults to 5002
// Railway deployment platform sets PORT automatically
const PORT = process.env.PORT || 5002;

/**
 * ============================================================================
 * MIDDLEWARE CONFIGURATION
 * ============================================================================
 * Middleware functions execute in order and can modify requests/responses
 */

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * PURPOSE: Allows frontend (running on different port/domain) to make API requests
 * SECURITY: Only allows requests from whitelisted origins
 * 
 * How it works:
 * - Checks if request origin is in allowedOrigins list
 * - If yes: allows request (callback(null, true))
 * - If no: blocks request (callback(error))
 * 
 * Production: Uses ALLOWED_ORIGINS env variable (comma-separated URLs)
 * Development: Uses localhost ports (Vite dev server uses random ports)
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')  // Split comma-separated URLs from env
    : [
        // Default localhost ports for development
        "http://localhost:5173",
        "http://localhost:5179",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178"
    ];

// Apply CORS middleware to all routes
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        // This is needed for some API testing tools
        if (!origin) return callback(null, true);
        
        // Check if origin is in whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);  // Allow request
        } else {
            callback(new Error('Not allowed by CORS'));  // Block request
        }
    },
    credentials: true  // Allows cookies to be sent with requests (needed for JWT tokens)
}));

/**
 * Express JSON Middleware
 * 
 * PURPOSE: Parses incoming JSON request bodies
 * 
 * How it works:
 * - Automatically parses JSON data from request body
 * - Makes data available in req.body
 * 
 * Example: POST /api/products with JSON body
 *          → req.body contains the parsed JSON object
 */
app.use(express.json());

/**
 * Cookie Parser Middleware
 * 
 * PURPOSE: Parses cookies from incoming requests
 * 
 * How it works:
 * - Reads cookies from request headers
 * - Makes cookies available in req.cookies
 * 
 * Used for: JWT token storage in httpOnly cookies (secure authentication)
 */
app.use(cookieParser());

/**
 * ============================================================================
 * API ROUTE REGISTRATION
 * ============================================================================
 * 
 * Routes map URL paths to controller functions
 * All routes are prefixed with /api for consistency
 * 
 * ROUTE STRUCTURE:
 * /api/{resource}/{action}
 * 
 * Examples:
 * - GET /api/products → getAllProducts controller
 * - POST /api/transactions → createTransaction controller
 */

/**
 * Product Routes
 * Handles all product-related operations
 * 
 * Endpoints:
 * - GET    /api/products          → Get all products
 * - GET    /api/products/:id      → Get single product
 * - POST   /api/products          → Create new product
 * - PUT    /api/products/:id      → Update product
 * - DELETE /api/products/:id      → Delete product
 */
app.use('/api/products', productRoutes);

/**
 * Authentication Routes
 * Handles user authentication and profile management
 * 
 * Endpoints:
 * - POST   /api/auth/login              → User login
 * - GET    /api/auth/profile            → Get user profile
 * - PUT    /api/auth/profile            → Update profile
 * - POST   /api/auth/verify-pharmacist-admin → Verify role for sensitive operations
 */
app.use('/api/auth', authRoutes);

/**
 * Transaction Routes
 * Handles sales transactions and history
 * 
 * Endpoints:
 * - POST   /api/transactions            → Create new transaction (sale)
 * - GET    /api/transactions            → Get transaction history (paginated)
 * - GET    /api/transactions/:id        → Get single transaction details
 */
app.use('/api/transactions', transactionRoutes);

/**
 * Inventory Routes
 * Handles inventory management and stock operations
 * 
 * Endpoints:
 * - GET    /api/inventory/items         → Get all product items
 * - GET    /api/inventory/items/:id      → Get items for specific product
 */
app.use('/api/inventory', inventoryRoutes);

/**
 * Health Check Endpoint
 * 
 * PURPOSE: Verify server is running and responding
 * 
 * Used for:
 * - Deployment monitoring
 * - Load balancer health checks
 * - Debugging connection issues
 * 
 * Returns: Simple JSON with status and timestamp
 */
app.get('/api/health', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),  // Current server time
    });
});

/**
 * Database Connection Test Endpoint
 * 
 * PURPOSE: Test Supabase database connection and credentials
 * 
 * USAGE: GET /api/test-db
 * 
 * Tests performed:
 * 1. Database connection - Queries Product table
 * 2. Authentication service - Tests service role key (admin access)
 * 
 * Returns diagnostic information about database connectivity
 * Useful for troubleshooting deployment issues
 */
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing Supabase connection...');
        
        /**
         * Test 1: Basic Database Connection
         * 
         * Queries the Product table to verify:
         * - Database is accessible
         * - Connection credentials are valid
         * - Tables exist and are queryable
         */
        const {data, error} = await supabase.from('Product').select('*').limit(1);
        if (error) {
            throw error;  // If query fails, database connection is broken
        }
        
        /**
         * Test 2: Authentication Service Access
         * 
         * Tests Supabase Auth admin API to verify:
         * - Service role key is valid (allows admin operations)
         * - Can access user management features
         * 
         * Note: This requires SUPABASE_SERVICE_ROLE_KEY (not anon key)
         */
        const {data: authTest, error: authError} = await supabase.auth.admin.listUsers();
        
        // Build success response with test results
        const response: any = {
            success: true,
            message: 'Supabase connection successful!',
            timestamp: new Date().toISOString(),
            tests: {
                database: {
                    status: 'connected',
                    message: 'Successfully queried Product table',
                    sampleData: data?.length || 0  // Number of products found
                }
            }
        };
        
        // Add auth test results if available
        if (!authError) {
            response.tests.auth = {
                status: 'connected',
                message: 'Service role key is valid',
                userCount: authTest?.users?.length || 0  // Number of users in system
            };
        } else {
            // Auth test failed (normal if using anon key instead of service role key)
            response.tests.auth = {
                status: 'warning',
                message: 'Could not test auth (this is normal if using anon key)',
                error: authError.message
            };
        }
        
        res.json(response);
    } catch (error: any) {
        // Handle any errors during testing
        console.error('Supabase connection test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Supabase connection failed',
            error: error.message || 'Unknown error',
            details: error.details || null,
            // Provide helpful hint based on error type
            hint: error.message?.includes('Invalid API key') 
                ? 'Check your SUPABASE_SERVICE_ROLE_KEY in .env file'
                : 'Verify your Supabase credentials and network connection'
        });
    }
})


/**
 * ============================================================================
 * SERVER STARTUP
 * ============================================================================
 * 
 * Starts the HTTP server and begins listening for incoming requests
 * 
 * PORT: Uses environment variable or defaults to 5002
 * 
 * Once this runs, the server is live and can accept HTTP requests
 */
app.listen(PORT, () => {
    console.log(`Server running http:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});