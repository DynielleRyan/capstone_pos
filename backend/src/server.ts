/**
 * ============================================================================
 * BACKEND SERVER - MAIN ENTRY POINT
 * ============================================================================
 * 
 * This is the main server file that initializes the Express.js backend application.
 * It orchestrates the entire backend by setting up middleware, configuring security,
 * registering API routes, and starting the HTTP server.
 * 
 * ARCHITECTURE:
 * - Express.js handles HTTP request/response cycle
 * - Middleware stack processes requests in order (CORS → JSON → Cookies → Routes)
 * - Route handlers delegate to controllers for business logic
 * - Supabase provides database and authentication services
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { supabase } from './utils/database';
import productRoutes from './routes/products';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import inventoryRoutes from './routes/inventory';

/**
 * Express Application Instance
 * 
 * This is the core of our backend server. It handles all incoming HTTP requests,
 * routes them to appropriate handlers, and sends responses back to clients.
 * Middleware functions are applied in the order they're registered, so CORS
 * must come before route handlers to allow cross-origin requests.
 */
const app = express(); 

/**
 * Server Port Configuration
 * 
 * Uses PORT environment variable if available (set by deployment platforms like Railway),
 * otherwise defaults to 5002 for local development. This allows the same codebase to
 * work in both development and production environments without modification.
 */
const PORT = process.env.PORT || 5002;

/**
 * ============================================================================
 * MIDDLEWARE CONFIGURATION
 * ============================================================================
 * 
 * Middleware functions are executed in the order they're registered. Each middleware
 * can inspect, modify, or terminate the request/response cycle. They run before
 * route handlers, allowing us to add cross-cutting concerns like security, parsing,
 * and logging without cluttering route handlers.
 */

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * SECURITY MECHANISM: Prevents unauthorized websites from making requests to our API.
 * 
 * HOW IT WORKS:
 * - Browser sends "Origin" header with every cross-origin request
 * - Our server checks if the origin is in the whitelist
 * - If whitelisted: Server responds with CORS headers allowing the request
 * - If not whitelisted: Browser blocks the response (even if server processes it)
 * 
 * ORIGIN WHITELIST:
 * - Production: Reads from ALLOWED_ORIGINS env variable (comma-separated URLs)
 * - Development: Uses multiple localhost ports because Vite dev server can use
 *   any available port (5173-5178 covers most scenarios)
 * 
 * CREDENTIALS: Enabled to allow httpOnly cookies (device tokens) to be sent
 * cross-origin. Without this, cookies are stripped by the browser.
 */
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
        /**
         * Requests with no origin (null) come from:
         * - Mobile apps
         * - Postman/API testing tools
         * - Server-to-server requests
         * 
         * We allow these because they're not subject to CORS restrictions
         * (CORS is a browser security feature, not applicable to non-browser clients)
         */
        if (!origin) return callback(null, true);
        
        /**
         * Origin validation: Check if the requesting origin is in our whitelist.
         * The callback pattern is required by CORS middleware:
         * - callback(null, true) = Allow request, no error
         * - callback(error) = Block request, return error
         */
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

/**
 * JSON Body Parser Middleware
 * 
 * Automatically parses JSON request bodies and makes them available as JavaScript
 * objects in req.body. Without this, req.body would be undefined or a raw string.
 * 
 * EXAMPLE:
 * Client sends: POST /api/products with body {"name": "Paracetamol", "price": 50}
 * After middleware: req.body = { name: "Paracetamol", price: 50 }
 * 
 * This is essential for REST APIs that accept JSON payloads for creating/updating resources.
 */
app.use(express.json());

/**
 * Cookie Parser Middleware
 * 
 * Extracts cookies from the Cookie header and parses them into req.cookies object.
 * Required for reading httpOnly cookies that store device tokens for first-time login
 * verification. These cookies cannot be accessed via JavaScript (security feature),
 * so they must be read server-side.
 * 
 * EXAMPLE:
 * Cookie header: "device_token_123=abc123; session=xyz789"
 * After middleware: req.cookies = { device_token_123: "abc123", session: "xyz789" }
 */
app.use(cookieParser());

/**
 * ============================================================================
 * API ROUTE REGISTRATION
 * ============================================================================
 * 
 * Routes map HTTP requests (method + path) to controller functions that handle
 * business logic. All routes are prefixed with /api to distinguish API endpoints
 * from static files or other routes.
 * 
 * ROUTING PATTERN:
 * - app.use('/api/resource', router) mounts the router at that path
 * - Router defines sub-routes like GET /, POST /, GET /:id
 * - Combined: GET /api/resource/:id → router handles GET /:id
 * 
 * This separation allows each resource to have its own route file, keeping code
 * organized and maintainable as the API grows.
 */

/**
 * Product Management Routes
 * 
 * Handles CRUD operations for products and product search. Products are the core
 * inventory items sold in the pharmacy. Routes include:
 * - Listing products with pagination and stock information
 * - Searching products by name, brand, or generic name
 * - Creating, updating, and deleting products
 * 
 * Stock information is calculated by aggregating Product_Item records, which
 * represent individual batches with expiry dates.
 */
app.use('/api/products', productRoutes);

/**
 * Authentication Routes
 * 
 * Manages user authentication, profile management, and security features:
 * - User registration and login
 * - Profile retrieval and updates
 * - First-time login OTP verification (email-based)
 * - Device trust management (httpOnly cookies)
 * - Role verification for sensitive operations (pharmacist/admin authorization)
 * 
 * Uses JWT tokens for authentication and Supabase Auth for user management.
 */
app.use('/api/auth', authRoutes);

/**
 * Transaction Routes
 * 
 * Handles sales transactions (point-of-sale operations):
 * - Creating new transactions (processing sales)
 * - Calculating totals with VAT and Senior/PWD discounts
 * - Updating inventory stock using FIFO method
 * - Retrieving transaction history with pagination
 * - Viewing individual transaction details
 * 
 * Transactions are the core business records, linking products, quantities,
 * prices, discounts, and payment methods into a complete sale record.
 */
app.use('/api/transactions', transactionRoutes);

/**
 * Inventory Management Routes
 * 
 * Manages product stock at the batch level (Product_Item records):
 * - Viewing all stock items with expiry dates
 * - Getting stock for specific products
 * - Adding new stock batches
 * - Updating stock quantities
 * - Deleting stock items
 * 
 * Inventory is separate from products because one product can have multiple
 * batches with different expiry dates, requiring FIFO (First In, First Out)
 * stock management for proper inventory control.
 */
app.use('/api/inventory', inventoryRoutes);

/**
 * Health Check Endpoint
 * 
 * A simple endpoint that confirms the server is running and responding to requests.
 * Used by deployment platforms (Railway, Heroku, etc.) and load balancers to
 * determine if the server is healthy and should receive traffic.
 * 
 * Returns a minimal JSON response with status and timestamp. The timestamp helps
 * verify the server is processing requests in real-time, not just returning cached
 * responses.
 * 
 * This endpoint should be lightweight and fast, as it may be called frequently
 * by monitoring systems.
 */
app.get('/api/health', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Database Connection Test Endpoint
 * 
 * Diagnostic endpoint for troubleshooting database connectivity issues during
 * deployment or development. Performs two critical tests:
 * 
 * TEST 1: Database Query Test
 * - Attempts to query the Product table
 * - Verifies: Database is accessible, credentials are valid, tables exist
 * - If this fails, the database connection is completely broken
 * 
 * TEST 2: Authentication Service Test
 * - Attempts to use Supabase Auth admin API (requires service role key)
 * - Verifies: Service role key is valid, can perform admin operations
 * - If this fails but Test 1 passes, it means you're using anon key instead
 *   of service role key (which is fine for basic operations but limits functionality)
 * 
 * Returns detailed diagnostic information including which tests passed/failed
 * and helpful error messages to guide troubleshooting. This is especially useful
 * when deploying to new environments where credentials might be misconfigured.
 */
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing Supabase connection...');
        
        /**
         * Test 1: Basic Database Connection
         * 
         * Queries a single product to verify the database connection works.
         * This is the most fundamental test - if this fails, nothing else will work.
         * We limit to 1 row to minimize data transfer and response time.
         */
        const {data, error} = await supabase.from('Product').select('*').limit(1);
        if (error) {
            throw error;
        }
        
        /**
         * Test 2: Authentication Service Access
         * 
         * Tests the Supabase Auth admin API, which requires the service role key.
         * This key has elevated permissions and is needed for operations like:
         * - Creating users programmatically
         * - Updating user metadata
         * - Managing user sessions
         * 
         * If this fails, it's usually because:
         * - Using anon key instead of service role key (common mistake)
         * - Service role key is invalid or expired
         * - Network issues preventing API access
         */
        const {data: authTest, error: authError} = await supabase.auth.admin.listUsers();
        
        /**
         * Build Response with Test Results
         * 
         * We structure the response to clearly show which tests passed and provide
         * actionable information. The response includes:
         * - Overall success status
         * - Individual test results with status and messages
         * - Sample data counts to verify queries returned results
         * - Error details if any test failed
         */
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
        
        /**
         * Add Authentication Test Results
         * 
         * If auth test succeeds, we include user count to verify admin access works.
         * If it fails, we mark it as a warning (not an error) because some deployments
         * might intentionally use anon key for security reasons, though this limits
         * functionality for user management operations.
         */
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
        /**
         * Error Handling
         * 
         * If any test fails, we return a detailed error response with:
         * - Error message from Supabase
         * - Helpful hints based on error type (e.g., "Invalid API key" suggests
         *   checking environment variables)
         * - Full error details for debugging
         * 
         * This helps developers quickly identify and fix configuration issues.
         */
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


/**
 * ============================================================================
 * SERVER STARTUP
 * ============================================================================
 * 
 * Starts the HTTP server and begins listening for incoming requests on the
 * specified port. Once this function executes, the server is live and ready
 * to handle API requests from clients.
 * 
 * The callback function runs after the server successfully starts, confirming
 * the port is available and the server is bound to it. We log the server URL
 * and health check endpoint for easy reference during development.
 * 
 * In production, deployment platforms (Railway, Heroku, etc.) automatically
 * set the PORT environment variable, so the server adapts to the assigned port.
 */
app.listen(PORT, () => {
    console.log(`Server running http:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});