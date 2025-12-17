/**
 * ============================================================================
 * TRANSACTIONS CONTROLLER
 * ============================================================================
 * 
 * Handles all transaction-related business logic, including sale processing,
 * financial calculations, and inventory updates. Transactions are the core
 * business records that track sales and update inventory.
 * 
 * TRANSACTION PROCESSING:
 * When a sale is processed, multiple operations must happen atomically:
 * 1. Calculate financial totals (subtotal, discount, VAT, total)
 * 2. Create Transaction record (main sale record)
 * 3. Create Transaction_Item records (one per product)
 * 4. Update Product_Item stock using FIFO (oldest items first)
 * 
 * If any step fails, the entire transaction should be rolled back to maintain
 * data consistency (currently implemented with error handling, but could be
 * enhanced with database transactions for true atomicity).
 */

import { supabase } from '../utils/database';
import { Request, Response } from 'express';

/**
 * Create Transaction (Process Sale)
 * 
 * This is the core function that processes a sale. It performs multiple critical
 * operations to complete a transaction:
 * 
 * 1. USER MAPPING: Maps Supabase Auth user ID to database User ID
 * 2. DISCOUNT CALCULATION: Determines discount percentage (20% for Senior/PWD)
 * 3. PRODUCT FETCHING: Gets product details needed for calculations
 * 4. FINANCIAL CALCULATIONS: Calculates subtotal, discount, VAT, and total per item
 * 5. STOCK UPDATES: Reduces inventory using FIFO method
 * 6. RECORD CREATION: Creates Transaction and Transaction_Item records
 * 
 * FINANCIAL RULES (Philippine Law):
 * - Senior/PWD discount: 20% of base selling price (NOT on VAT)
 * - VAT: 12% of base selling price (if not VAT exempt)
 * - Discount is applied BEFORE VAT calculation
 * - VAT exemption is determined by IsVATExemptYN column only
 */
export const createTransaction = async (req: Request, res: Response) => {
    try {
        /**
         * Extract Transaction Data from Request
         * 
         * The frontend sends complete transaction data including items, payment
         * method, and discount information. We extract all necessary fields
         * for processing.
         */
        const {
            referenceNo,
            paymentMethod,
            subtotal,
            isSeniorPWDActive,
            seniorPWDID,
            cashReceived,
            change,
            userId,
            items
        } = req.body;

        /**
         * Map Supabase Auth User ID to Database User ID
         * 
         * The frontend sends the Supabase Auth user ID (from JWT token), but the
         * Transaction table uses the User table's UserID (internal database ID).
         * We need to look up the mapping between AuthUserID and UserID.
         * 
         * FALLBACK: If mapping fails, uses the first available user. This is a
         * temporary solution - in production, the mapping should always succeed
         * if the user is properly registered.
         */
        let finalUserId = null;
        
        if (userId) {
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

        /**
         * Map Payment Method to Database Format
         * 
         * Frontend uses lowercase values ('cash', 'gcash', 'maya'), but the database
         * enum likely uses capitalized values ('Cash', 'Gcash', 'Maya'). We normalize
         * the value to match the database schema.
         */
        const dbPaymentMethod = paymentMethod === 'cash' ? 'Cash' : 
                               paymentMethod === 'gcash' ? 'Gcash' : 
                               paymentMethod === 'maya' ? 'Maya' : 'Cash';

        /**
         * Determine Discount Percentage
         * 
         * If Senior/PWD discount is active, fetches the discount configuration from
         * the database. If not found, uses the default 20% as per Philippine law.
         * The discount percentage is stored in the database to allow for future
         * configuration changes without code updates.
         */
        let discountPercent = 0.2;
        let discountId = null;

        if (isSeniorPWDActive) {
            const { data: seniorDiscount, error: discountError } = await supabase
                .from('Discount')
                .select('DiscountID, Name, DiscountPercent, IsVATExemptYN')
                .eq('Name', 'Senior Citizen Discount')
                .single();

            if (discountError) {
                discountPercent = 0.2;
                discountId = null;
            } else {
                discountPercent = seniorDiscount.DiscountPercent / 100;
                discountId = seniorDiscount.DiscountID;
            }
        }

        /**
         * Fetch Product Details for Calculations
         * 
         * Retrieves SeniorPWDYN and IsVATExemptYN flags for all products in the
         * transaction. These flags determine:
         * - Whether the product is eligible for Senior/PWD discount
         * - Whether the product is VAT exempt
         * 
         * This information is needed to calculate discounts and VAT correctly
         * for each item in the transaction.
         */
        const productIds = items.map((item: any) => item.productId);
        const { data: products, error: productsError } = await supabase
            .from('Product')
            .select('ProductID, SeniorPWDYN, IsVATExemptYN')
            .in('ProductID', productIds);

        if (productsError) {
            console.error('Error fetching products:', productsError);
            throw new Error('Failed to fetch product details');
        }

        // Create a map of productId to product details for quick lookup
        const productMap = new Map();
        products?.forEach((product: any) => {
            productMap.set(product.ProductID, {
                SeniorPWDYN: product.SeniorPWDYN,
                IsVATExemptYN: product.IsVATExemptYN
            });
        });

        // Calculate per-item amounts with VAT based on SeniorPWDYN and IsVATExemptYN
        let totalDiscountAmount = 0;
        let totalVATAmount = 0;
        let totalVATExemptAmount = 0;
        const transactionItems = items.map((item: any) => {
            const itemSubtotal = item.quantity * item.unitPrice;
            
            // Get product details FIRST (needed for discount and VAT calculation)
            const productDetails = productMap.get(item.productId);
            // Handle boolean, string, or null values for SeniorPWDYN
            const seniorPWDYN = productDetails?.SeniorPWDYN === true || productDetails?.SeniorPWDYN === 'true';
            // Handle boolean, string, or null values for IsVATExemptYN
            const isVATExemptYN = productDetails?.IsVATExemptYN === true || productDetails?.IsVATExemptYN === 'true';
            
            // Debug logging
            console.log(`Product ${item.productId}: SeniorPWDYN=${productDetails?.SeniorPWDYN}, isSeniorPWDActive=${isSeniorPWDActive}, isVATExemptYN=${isVATExemptYN}`);
            
            // Senior/PWD discount: Only apply if transaction is active AND product has SeniorPWDYN = true
            // Discount is applied to base selling price, not to (selling price + VAT)
            const itemDiscount = (isSeniorPWDActive && seniorPWDYN) ? itemSubtotal * discountPercent : 0;
            
            // Calculate VAT:
            // VAT exemption is determined ONLY by IsVATExemptYN column
            // 1. If product has IsVATExemptYN = true, VAT = 0
            // 2. Otherwise, VAT = 12% of itemSubtotal (base selling price, before discount)
            // Note: Senior/PWD discount does NOT affect VAT - VAT still applies if product is not VAT exempt
            // VAT is added ON TOP of the selling price, not calculated on discounted amount
            let itemVAT = 0;
            if (!isVATExemptYN) {
                itemVAT = itemSubtotal * 0.12; // VAT is 12% of base selling price (applies regardless of Senior/PWD)
            }
            
            // Final amount = base price - discount + VAT
            const finalSubtotal = itemSubtotal - itemDiscount + itemVAT;
            
            totalDiscountAmount += itemDiscount;
            totalVATAmount += itemVAT;
            // VAT exempt amount: Only items with IsVATExemptYN = true (Senior/PWD doesn't make items VAT exempt)
            if (itemVAT === 0 && isVATExemptYN) {
                totalVATExemptAmount += (itemSubtotal - itemDiscount);
            }

            return {
                TransactionID: null, // Will be set after transaction is created
                ProductID: item.productId,
                Quantity: item.quantity,
                UnitPrice: item.unitPrice,
                Subtotal: finalSubtotal,  // Final amount including VAT
                DiscountID: discountId,   // Reference to the discount if applied
                DiscountAmount: itemDiscount,  // Discount amount for this item
                VATAmount: itemVAT       // VAT amount for this item
            };
        });

        // Backend total calculation based on item-level calculations
        const totalAmount = subtotal - totalDiscountAmount + totalVATAmount;

        // Prepare transaction data for database insertion
        const transactionData = {
            ReferenceNo: referenceNo,
            PaymentMethod: dbPaymentMethod,
            Total: totalAmount,        // Backend calculated
            CashReceived: cashReceived,
            PaymentChange: change,
            VATAmount: totalVATAmount,      // Backend calculated from items
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

        // Update transaction items with TransactionID
        transactionItems.forEach((item: any) => {
            item.TransactionID = transaction.TransactionID;
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
                discount: totalDiscountAmount,
                vat: totalVATAmount,
                vatExempt: totalVATExemptAmount,
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

        // Use Supabase's built-in count for better performance
        // This uses PostgreSQL's COUNT which is much faster than fetching all rows
        const { count: totalCount, error: countError } = await supabase
            .from('Transaction')
            .select('TransactionID', { count: 'exact', head: true });

        if (countError) {
            console.error('Error counting transactions:', countError);
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
                total: totalCount ?? 0,
                totalPages: Math.ceil((totalCount ?? 0) / limit),
                hasMore: offset + limit < (totalCount ?? 0)
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
// This function also calculates missing VATAmount and DiscountAmount for old transactions
export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        // Fetch single transaction with related data
        // Include Product details needed for VAT/Discount calculation
        const { data, error } = await supabase
            .from('Transaction')
            .select(`
                *,
                Transaction_Item (
                    *,
                    Product (
                        Name,
                        Image,
                        IsVATExemptYN,
                        SeniorPWDYN
                    )
                )
            `)
            .eq('TransactionID', id)
            .single();

        if (error) throw error;

        // Check if this is an old transaction with missing VAT/Discount data
        // If SeniorPWDID exists, we can calculate the breakdown retroactively
        const isSeniorPWDActive = !!data.SeniorPWDID;
        const discountPercent = 0.20; // 20% Senior/PWD discount

        // Calculate missing VATAmount and DiscountAmount for old transactions
        if (data.Transaction_Item && Array.isArray(data.Transaction_Item)) {
            data.Transaction_Item = data.Transaction_Item.map((item: any) => {
                // If VATAmount or DiscountAmount is null/undefined, calculate it
                const needsCalculation = 
                    (item.VATAmount === null || item.VATAmount === undefined) ||
                    (item.DiscountAmount === null || item.DiscountAmount === undefined);

                if (needsCalculation && item.Product) {
                    const itemSubtotal = Number(item.UnitPrice) * Number(item.Quantity);
                    
                    // Get product VAT exemption status (handle boolean, string, or null values)
                    const seniorPWDYN = item.Product.SeniorPWDYN === true || item.Product.SeniorPWDYN === 'true';
                    const isVATExemptYN = item.Product.IsVATExemptYN === true || item.Product.IsVATExemptYN === 'true';
                    
                    // Calculate discount (Senior/PWD: 20% of base price)
                    // Only apply if transaction is active AND product has SeniorPWDYN = true
                    const itemDiscount = (isSeniorPWDActive && seniorPWDYN) ? itemSubtotal * discountPercent : 0;
                    
                    // Calculate VAT: VAT exemption is determined ONLY by IsVATExemptYN
                    // 1. If product has IsVATExemptYN = true, VAT = 0
                    // 2. Otherwise, VAT = 12% of base price (applies regardless of Senior/PWD status)
                    // VAT is calculated on base price (before discount), then added on top
                    let itemVAT = 0;
                    if (!isVATExemptYN) {
                        itemVAT = itemSubtotal * 0.12;
                    }

                    // Fill in missing values (use calculated values if original is null/undefined)
                    // Convert to number to ensure proper type (Supabase may return strings)
                    // Round to 2 decimal places to match database precision
                    return {
                        ...item,
                        VATAmount: item.VATAmount != null ? Number(item.VATAmount) : Math.round(itemVAT * 100) / 100,
                        DiscountAmount: item.DiscountAmount != null ? Number(item.DiscountAmount) : Math.round(itemDiscount * 100) / 100
                    };
                } else if (needsCalculation && !item.Product) {
                    // If Product is missing, we can't calculate - log warning but return item as-is
                    console.warn(`⚠️ Cannot calculate VAT/Discount for Transaction_Item ${item.TransactionItemID}: Product data missing`);
                }
                
                // Ensure existing values are numbers (not strings from database)
                return {
                    ...item,
                    VATAmount: item.VATAmount != null ? Number(item.VATAmount) : null,
                    DiscountAmount: item.DiscountAmount != null ? Number(item.DiscountAmount) : null
                };
            });
        }

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
