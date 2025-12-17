/**
 * ============================================================================
 * TRANSACTION ROUTES - routes/transactions.ts
 * ============================================================================
 * 
 * This file defines all transaction-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * All routes are prefixed with /api/transactions (defined in server.ts)
 * 
 * ENDPOINTS:
 * - POST   /api/transactions       → Create new transaction (process sale)
 * - GET    /api/transactions       → Get all transactions (paginated)
 * - GET    /api/transactions/:id   → Get single transaction with items
 * - DELETE /api/transactions/:id   → Delete transaction and its items
 * 
 * AUTHENTICATION:
 * Currently, transaction routes don't require authentication (public access)
 * In production, you should add authentication middleware to protect these routes
 * 
 * TRANSACTION FLOW:
 * 1. Frontend sends transaction data (items, payment method, etc.)
 * 2. Backend calculates totals (subtotal, discount, VAT)
 * 3. Backend creates Transaction record
 * 4. Backend creates Transaction_Item records
 * 5. Backend updates Product_Item stock (FIFO method)
 * 6. Backend returns transaction ID and reference number
 */

// Import Express Router to create route handlers
import express from 'express';

// Import transaction controller functions
import { 
  createTransaction,    // Process new sale transaction
  getAllTransactions,   // Get transaction history (paginated)
  getTransactionById,  // Get single transaction details
  deleteTransaction     // Delete transaction
} from '../controllers/TransactionsController';

// Create Express router instance
const router = express.Router();

/**
 * ============================================================================
 * TRANSACTION CRUD ROUTES
 * ============================================================================
 */

// POST /api/transactions
// Create a new transaction (process a sale)
// Request body: {
//   referenceNo: string,
//   paymentMethod: 'cash' | 'gcash' | 'maya',
//   subtotal: number,
//   isSeniorPWDActive: boolean,
//   seniorPWDID: string | null,
//   cashReceived: number | null,
//   change: number | null,
//   userId: string (Supabase AuthUserID),
//   items: Array<{ productId, quantity, unitPrice }>
// }
// Returns: { success: true, transactionId, referenceNo, calculatedAmounts }
// Side effects: Updates Product_Item stock (FIFO), creates Transaction and Transaction_Item records
router.post('/', createTransaction);

// GET /api/transactions
// Get all transactions with pagination
// Query parameters:
//   - page: number (default: 1)
//   - limit: number (default: 50)
// Returns: {
//   success: true,
//   data: Array<Transaction>,
//   pagination: { page, limit, total, totalPages, hasMore }
// }
// Optimized: Only includes first item for preview (reduces payload size)
router.get('/', getAllTransactions);

// GET /api/transactions/:id
// Get a single transaction by TransactionID with all items and product details
// URL parameter: :id (TransactionID UUID)
// Returns: Transaction object with Transaction_Item array and Product details
// Includes: Calculated VAT and Discount amounts for old transactions (backward compatibility)
router.get('/:id', getTransactionById);

// DELETE /api/transactions/:id
// Delete a transaction and all its associated items
// URL parameter: :id (TransactionID UUID)
// WARNING: This permanently deletes the transaction
// Note: Does NOT restore stock (consider adding stock restoration logic)
router.delete('/:id', deleteTransaction);

// Export router to be used in server.ts
export default router;
