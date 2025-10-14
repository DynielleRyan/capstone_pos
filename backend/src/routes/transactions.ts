import express from 'express';
import { createTransaction, getAllTransactions, getTransactionById, deleteTransaction } from '../controllers/TransactionsController';

const router = express.Router();

// Create a new transaction
router.post('/', createTransaction);

// Get all transactions
router.get('/', getAllTransactions);

// Get transaction by ID
router.get('/:id', getTransactionById);

// Delete transaction by ID
router.delete('/:id', deleteTransaction);

export default router;
