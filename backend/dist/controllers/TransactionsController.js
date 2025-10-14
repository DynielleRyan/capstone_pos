"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.getTransactionById = exports.getAllTransactions = exports.createTransaction = void 0;
const database_1 = require("../utils/database");
const createTransaction = async (req, res) => {
    try {
        const { referenceNo, paymentMethod, total, subtotal, discount, vat, cashReceived, change, items } = req.body;
        // Get current user ID from auth (you might need to implement this)
        // For now, we'll use a placeholder UUID or get it from the request
        const userId = req.user?.id || 'dfa9ad02-6755-42ab-981b-3acbb87e3ff5'; // Use existing user ID from database
        // Map frontend payment methods to database enum values
        const dbPaymentMethod = paymentMethod === 'cash' ? 'Cash' :
            paymentMethod === 'gcash' ? 'Gcash' :
                paymentMethod === 'maya' ? 'Maya' : 'Cash';
        // Create transaction record
        const transactionData = {
            ReferenceNo: referenceNo,
            PaymentMethod: dbPaymentMethod,
            Total: total,
            CashReceived: cashReceived,
            PaymentChange: change,
            VATAmount: vat,
            UserID: userId,
            OrderDateTime: new Date().toISOString()
        };
        const { data: transaction, error: transactionError } = await database_1.supabase
            .from('Transaction')
            .insert(transactionData)
            .select()
            .single();
        if (transactionError)
            throw transactionError;
        // Create transaction items
        const transactionItems = items.map((item) => ({
            TransactionID: transaction.TransactionID,
            ProductID: item.productId,
            Quantity: item.quantity,
            UnitPrice: item.unitPrice,
            Subtotal: item.subtotal
        }));
        const { error: itemsError } = await database_1.supabase
            .from('Transaction_Item')
            .insert(transactionItems);
        if (itemsError)
            throw itemsError;
        res.json({
            success: true,
            message: 'Transaction created successfully',
            transactionId: transaction.TransactionID,
            referenceNo: transaction.ReferenceNo
        });
    }
    catch (error) {
        console.error('Transaction creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create transaction',
            error: error
        });
    }
};
exports.createTransaction = createTransaction;
const getAllTransactions = async (req, res) => {
    try {
        const { data, error } = await database_1.supabase
            .from('Transaction')
            .select(`
                *,
                Transaction_Item (
                    *,
                    Product (
                        Name,
                        Image
                    )
                )
            `)
            .order('OrderDateTime', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error
        });
    }
};
exports.getAllTransactions = getAllTransactions;
const getTransactionById = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await database_1.supabase
            .from('Transaction')
            .select(`
                *,
                Transaction_Item (
                    *,
                    Product (
                        Name,
                        Image
                    )
                )
            `)
            .eq('TransactionID', id)
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error
        });
    }
};
exports.getTransactionById = getTransactionById;
const deleteTransaction = async (req, res) => {
    try {
        const id = req.params.id;
        // First delete transaction items
        const { error: itemsError } = await database_1.supabase
            .from('Transaction_Item')
            .delete()
            .eq('TransactionID', id);
        if (itemsError)
            throw itemsError;
        // Then delete the transaction
        const { error: transactionError } = await database_1.supabase
            .from('Transaction')
            .delete()
            .eq('TransactionID', id);
        if (transactionError)
            throw transactionError;
        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete transaction',
            error: error
        });
    }
};
exports.deleteTransaction = deleteTransaction;
//# sourceMappingURL=TransactionsController.js.map