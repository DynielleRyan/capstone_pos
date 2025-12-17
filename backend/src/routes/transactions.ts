/**
 * ============================================================================
 * TRANSACTION ROUTES
 * ============================================================================
 * 
 * Defines all transaction-related API endpoints. Transactions represent completed
 * sales in the PoS system and are the core business records that track revenue,
 * inventory changes, and customer purchases.
 * 
 * TRANSACTION PROCESSING FLOW:
 * 1. Frontend sends transaction data (items, payment method, discounts)
 * 2. Backend validates data and calculates financial totals
 * 3. Backend creates Transaction record (main sale record)
 * 4. Backend creates Transaction_Item records (one per product in sale)
 * 5. Backend updates Product_Item stock using FIFO (First In, First Out)
 * 6. Backend returns transaction ID and reference number for receipt
 * 
 * FINANCIAL CALCULATIONS:
 * - Subtotal: Sum of (price × quantity) for all items
 * - Discount: 20% of base price for Senior/PWD eligible items (if active)
 * - VAT: 12% of base price for non-VAT-exempt items
 * - Total: Subtotal - Discount + VAT
 * 
 * AUTHENTICATION:
 * Currently public, but should be protected in production to prevent unauthorized
 * transaction creation or viewing of transaction history.
 */

import express from 'express';
import { 
  createTransaction,
  getAllTransactions,
  getTransactionById,
  deleteTransaction
} from '../controllers/TransactionsController';

const router = express.Router();

/**
 * ============================================================================
 * TRANSACTION CRUD ROUTES
 * ============================================================================
 */

/**
 * Create Transaction (Process Sale)
 * 
 * This is the core endpoint that processes a sale. It performs multiple operations
 * atomically to ensure data consistency:
 * 
 * 1. VALIDATION: Verifies all items exist and have sufficient stock
 * 2. CALCULATION: Computes subtotal, discount, VAT, and total
 * 3. STOCK UPDATE: Reduces inventory using FIFO (oldest items first)
 * 4. RECORD CREATION: Creates Transaction and Transaction_Item records
 * 
 * REQUEST BODY STRUCTURE:
 * {
 *   referenceNo: string (e.g., "CASH-20250101-120000" or "GCASH-12345"),
 *   paymentMethod: 'cash' | 'gcash' | 'maya',
 *   subtotal: number (sum of item prices × quantities),
 *   isSeniorPWDActive: boolean (whether Senior/PWD discount is applied),
 *   seniorPWDID: string | null (PWD/Senior ID if discount active),
 *   cashReceived: number | null (for cash payments),
 *   change: number | null (for cash payments),
 *   userId: string (Supabase Auth user ID),
 *   items: Array<{ productId, quantity, unitPrice }>
 * }
 * 
 * STOCK MANAGEMENT:
 * Uses FIFO (First In, First Out) method - sells oldest stock first. This is
 * important for products with expiry dates to prevent selling expired items.
 * 
 * Returns transaction ID and reference number for receipt generation.
 */
router.post('/', createTransaction);

/**
 * Get All Transactions (Paginated)
 * 
 * Retrieves transaction history with pagination. This endpoint is optimized for
 * the history page which displays many transactions. To reduce payload size,
 * only the first item of each transaction is included in the initial response.
 * 
 * Full transaction details (all items) are loaded lazily when the user expands
 * a transaction or views details, using the getTransactionById endpoint.
 * 
 * QUERY PARAMETERS:
 * - page: Page number (default: 1)
 * - limit: Transactions per page (default: 50)
 * 
 * Returns transactions sorted by OrderDateTime (newest first) with pagination metadata.
 */
router.get('/', getAllTransactions);

/**
 * Get Single Transaction Details
 * 
 * Retrieves a complete transaction record with all items and product details.
 * This endpoint is used when:
 * - Viewing transaction details in the history page
 * - Reprinting receipts
 * - Generating transaction reports
 * 
 * The response includes calculated VAT and Discount amounts for each item,
 * ensuring backward compatibility with older transactions that might not have
 * these values stored.
 * 
 * Returns the full transaction object with Transaction_Item array containing
 * product names, quantities, prices, and calculated amounts.
 */
router.get('/:id', getTransactionById);

/**
 * Delete Transaction
 * 
 * Permanently deletes a transaction and all its associated Transaction_Item records.
 * This is a hard delete - the transaction cannot be recovered.
 * 
 * WARNING: This does NOT restore stock. If a transaction is deleted, the inventory
 * that was sold remains reduced. Consider implementing a stock restoration feature
 * if transaction deletion is needed for error correction.
 * 
 * Typically used for:
 * - Removing test transactions
 * - Correcting data entry errors (with manual stock adjustment)
 * - Administrative cleanup
 */
router.delete('/:id', deleteTransaction);

export default router;
