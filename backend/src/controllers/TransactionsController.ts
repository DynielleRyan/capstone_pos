import { supabase } from '../utils/database';
import { Request, Response } from 'express';

// Create a new transaction with items in the database
export const createTransaction = async (req: Request, res: Response) => {
    try {
        // Extract transaction data from request body
        const {
            referenceNo,        // Payment reference number (e.g., CASH-12345)
            paymentMethod,      // Payment method (cash, gcash, maya)
            subtotal,          // Subtotal before discounts
            isSeniorPWDActive, // Senior/PWD discount flag
            seniorPWDID,       // PWD ID or Senior Citizen ID
            cashReceived,      // Cash amount received (for cash payments)
            change,            // Change amount (for cash payments)
            userId,            // User ID from frontend
            items              // Array of transaction items
        } = req.body;

        // Map Supabase auth user ID to database User ID
        let finalUserId = null;
        
        if (userId) {
            // userId from frontend is the Supabase auth user ID
            // We need to find the corresponding UserID in the User table
            const { data: userRecord, error: userError } = await supabase
                .from('User')
                .select('UserID')
                .eq('AuthUserID', userId)
                .single();
                
            if (userError) {
                console.error('Error finding user by AuthUserID:', userError);
                console.log('AuthUserID not found, using fallback');
            } else {
                finalUserId = userRecord.UserID;
                console.log('Found user mapping:', { authUserId: userId, databaseUserId: finalUserId });
            }
        }
        
        // Fallback: get first available user if mapping failed
        if (!finalUserId) {
            const { data: availableUsers, error: userError } = await supabase
                .from('User')
                .select('UserID')
                .limit(1);
                
            if (userError) {
                console.error('Error fetching users:', userError);
                throw new Error('Failed to fetch users');
            }
            
            finalUserId = availableUsers && availableUsers.length > 0 
                ? availableUsers[0].UserID 
                : null;
                
            console.log('Using fallback user:', finalUserId);
        }
        
        if (!finalUserId) {
            throw new Error('No users found in database. Please create a user first.');
        }

        // Map frontend payment methods to database enum values
        // Based on the schema, the enum likely accepts: 'Cash', 'Gcash', 'Maya' (with capital letters)
        const dbPaymentMethod = paymentMethod === 'cash' ? 'Cash' : 
                               paymentMethod === 'gcash' ? 'Gcash' : 
                               paymentMethod === 'maya' ? 'Maya' : 'Cash';

        // Backend discount calculation - only apply if Senior/PWD is active
        let discountAmount = 0;
        let discountId = null;

        if (isSeniorPWDActive) {
            // Fetch Senior Citizen Discount from database
            const { data: seniorDiscount, error: discountError } = await supabase
                .from('Discount')
                .select('DiscountID, Name, DiscountPercent, IsVATExemptYN')
                .eq('Name', 'Senior Citizen Discount')
                .single();

            if (discountError) {
                console.error('Discount lookup error:', discountError);
                // If discount not found, use default 20% discount
                console.log('Using default 20% discount');
                discountAmount = subtotal * 0.2;
                discountId = null; // No discount ID since it's not in database
            } else {
                // Apply discount using the percentage from database
                discountAmount = subtotal * (seniorDiscount.DiscountPercent / 100);
                discountId = seniorDiscount.DiscountID;
            }
        }

        // Backend VAT calculation (on discounted amount)
        const vatAmount = (subtotal - discountAmount) * 0.12;
        
        // Backend total calculation
        const totalAmount = subtotal - discountAmount + vatAmount;

        // Prepare transaction data for database insertion
        const transactionData = {
            ReferenceNo: referenceNo,
            PaymentMethod: dbPaymentMethod,
            Total: totalAmount,        // Backend calculated
            CashReceived: cashReceived,
            PaymentChange: change,
            VATAmount: vatAmount,      // Backend calculated
            UserID: finalUserId,
            SeniorPWDID: isSeniorPWDActive && seniorPWDID ? seniorPWDID : null, // Store PWD/Senior ID if provided
            OrderDateTime: new Date().toLocaleString('sv-SE', { 
                timeZone: 'Asia/Manila'
            }).replace(' ', 'T') + '+08:00'
        };

        console.log('Transaction data to insert:', transactionData);
        
        // Insert transaction record into database
        const { data: transaction, error: transactionError } = await supabase
            .from('Transaction')
            .insert(transactionData)
            .select()
            .single();

        if (transactionError) {
            console.error('Transaction insert error:', transactionError);
            throw transactionError;
        }
        
        console.log('Transaction created successfully:', transaction);

        // Create transaction items array for database insertion
        const transactionItems = items.map((item: any) => {
            // Calculate per-item amounts
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = isSeniorPWDActive ? itemSubtotal * (discountAmount / subtotal) : 0;
            const itemVAT = (itemSubtotal - itemDiscount) * 0.12;
            const finalSubtotal = itemSubtotal - itemDiscount + itemVAT;

            return {
                TransactionID: transaction.TransactionID,
                ProductID: item.productId,
                Quantity: item.quantity,
                UnitPrice: item.unitPrice,
                Subtotal: finalSubtotal,  // Final amount including VAT
                DiscountID: discountId,   // Reference to the discount if applied
                DiscountAmount: itemDiscount,  // Discount amount for this item
                VATAmount: itemVAT       // VAT amount for this item
            };
        });

        // Insert all transaction items into database
        const { error: itemsError } = await supabase
            .from('Transaction_Item')
            .insert(transactionItems);

        if (itemsError) throw itemsError;
// After line 155, before the return statement:

// Update stock for each product item
for (const item of items) {
    // Find available Product_Item with stock (FIFO - First In First Out)
    // Get items with stock > 0, ordered by expiry date (oldest first)
    const { data: productItems, error: stockError } = await supabase
        .from('Product_Item')
        .select('ProductItemID, Stock, ProductID')
        .eq('ProductID', item.productId)
        .gt('Stock', 0)
        .eq('IsActive', true)
        .order('ExpiryDate', { ascending: true, nullsFirst: false });

    if (stockError) {
        console.error(`Error fetching stock for product ${item.productId}:`, stockError);
        throw new Error(`Failed to check stock for product ${item.productId}`);
    }

    if (!productItems || productItems.length === 0) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
    }

    // Calculate total available stock
    const totalStock = productItems.reduce((sum, pi) => sum + pi.Stock, 0);
    if (totalStock < item.quantity) {
        throw new Error(`Insufficient stock. Available: ${totalStock}, Requested: ${item.quantity}`);
    }

    // Decrement stock using FIFO (oldest expiry first)
    let remainingQuantity = item.quantity;
    for (const productItem of productItems) {
        if (remainingQuantity <= 0) break;

        const quantityToDeduct = Math.min(remainingQuantity, productItem.Stock);
        const newStock = productItem.Stock - quantityToDeduct;

        const { error: updateError } = await supabase
            .from('Product_Item')
            .update({ 
                Stock: newStock,
                DateTimeLastUpdate: new Date().toISOString()
            })
            .eq('ProductItemID', productItem.ProductItemID);

        if (updateError) {
            console.error(`Error updating stock for ProductItem ${productItem.ProductItemID}:`, updateError);
            throw new Error(`Failed to update stock for product item`);
        }

        remainingQuantity -= quantityToDeduct;
        console.log(`Updated stock for ProductItem ${productItem.ProductItemID}: ${productItem.Stock} -> ${newStock}`);
    }
}
        // Return success response with transaction details
        res.json({
            success: true,
            message: 'Transaction created successfully',
            transactionId: transaction.TransactionID,
            referenceNo: transaction.ReferenceNo,
            calculatedAmounts: {
                subtotal: subtotal,
                discount: discountAmount,
                vat: vatAmount,
                total: totalAmount,
                isSeniorPWDActive: isSeniorPWDActive
            }
        });

    } catch (error) {
        console.error('Transaction creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create transaction',
            error: error
        });
    }
};

// Get all transactions with pagination and optimized queries
export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Get accurate count: count distinct transactions that have items
        // This matches the filter used in the data query (Transaction_Item!inner)
        // We query Transaction_Item to get all TransactionIDs, then count distinct ones
        const { data: transactionItems, error: countError } = await supabase
            .from('Transaction_Item')
            .select('TransactionID');

        let totalCount = 0;
        if (countError) {
            console.error('Error counting transactions with items:', countError);
        } else if (transactionItems) {
            // Count distinct TransactionIDs
            const distinctTransactionIds = new Set(transactionItems.map(item => item.TransactionID));
            totalCount = distinctTransactionIds.size;
        }

        // Fetch transactions with minimal item data (only first item for preview, no images)
        // This significantly reduces payload size
        // Note: Using Transaction_Item!inner filters to only transactions with items
        const { data, error } = await supabase
            .from('Transaction')
            .select(`
                TransactionID,
                ReferenceNo,
                PaymentMethod,
                Total,
                OrderDateTime,
                CashReceived,
                PaymentChange,
                SeniorPWDID,
                VATAmount,
                Transaction_Item!inner (
                    Quantity,
                    UnitPrice,
                    Subtotal,
                    Product (
                        Name
                    )
                )
            `)
            .order('OrderDateTime', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Transform to include only first item for preview (reduces payload)
        const transformedData = data.map((transaction: any) => {
            const items = transaction.Transaction_Item || [];
            return {
                TransactionID: transaction.TransactionID,
                ReferenceNo: transaction.ReferenceNo,
                PaymentMethod: transaction.PaymentMethod,
                Total: transaction.Total,
                OrderDateTime: transaction.OrderDateTime,
                CashReceived: transaction.CashReceived,
                PaymentChange: transaction.PaymentChange,
                SeniorPWDID: transaction.SeniorPWDID,
                VATAmount: transaction.VATAmount,
                // Only include first item for preview
                Transaction_Item: items.slice(0, 1),
                // Include item count for UI
                ItemCount: items.length
            };
        });

        // Return paginated response with metadata
        res.json({
            success: true,
            data: transformedData,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
                hasMore: offset + limit < (totalCount || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error
        });
    }
};

// Get a specific transaction by ID with its items and product details
export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        // Fetch single transaction with related data
        const { data, error } = await supabase
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

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error
        });
    }
};

// Delete a transaction and all its associated items
export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        
        // First delete all transaction items (foreign key constraint)
        const { error: itemsError } = await supabase
            .from('Transaction_Item')
            .delete()
            .eq('TransactionID', id);

        if (itemsError) throw itemsError;

        // Then delete the main transaction record
        const { error: transactionError } = await supabase
            .from('Transaction')
            .delete()
            .eq('TransactionID', id);

        if (transactionError) throw transactionError;

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete transaction',
            error: error
        });
    }
};
