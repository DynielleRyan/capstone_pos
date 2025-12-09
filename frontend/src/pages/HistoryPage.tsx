import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ArrowLeft,
  CreditCard,
  Banknote,
  User,
  X,
  Calendar,
  Clock,
  Receipt as ReceiptIcon,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Receipt from '../components/Receipt';
import toast from 'react-hot-toast';

interface Transaction {
  TransactionID: string;
  ReferenceNo: string;
  PaymentMethod: 'cash' | 'gcash' | 'maya';
  Total: number;
  OrderDateTime: string;
  Status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  Items: TransactionItem[];
  ItemCount?: number; // Total number of items (for lazy loading)
}

interface TransactionItem {
  ProductName: string;
  Quantity: number;
  UnitPrice: number;
  Subtotal: number;
  VATAmount?: number;
  DiscountAmount?: number;
  Image?: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [itemsPerPage] = useState(50);
  
  // Lazy loading state for transaction items
  const [loadedTransactionItems, setLoadedTransactionItems] = useState<Record<string, TransactionItem[]>>({});
  
  // Expanded transactions state
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  
  // Reprint receipt states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedTransactionForReprint, setSelectedTransactionForReprint] = useState<Transaction | null>(null);
  const [verificationUsername, setVerificationUsername] = useState('');
  const [verificationPassword, setVerificationPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Filter transactions based on search and filters
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.ReferenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.Items.some(item => 
          item.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Order number filter
    if (orderNo) {
      filtered = filtered.filter(transaction =>
        transaction.ReferenceNo.toLowerCase().includes(orderNo.toLowerCase())
      );
    }

    // Payment method filter
    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.PaymentMethod.toLowerCase() === selectedPaymentMethod.toLowerCase()
      );
    }

    // Date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.OrderDateTime);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return transactionDate >= start && transactionDate <= end;
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, orderNo, selectedPaymentMethod, startDate, endDate]);

  // Fetch transactions from API with pagination
  const fetchTransactions = async (page: number = 1) => {
      try {
        setLoading(true);
      const response = await api.get(`/transactions?page=${page}&limit=${itemsPerPage}&t=${Date.now()}`);
      
      // Handle new paginated response structure
      const responseData = response.data.success ? response.data : { data: response.data, pagination: null };
      const transactionsData = responseData.data || [];
      const pagination = responseData.pagination;
        
        // Transform the API response to match our interface
      // Only include preview item (first item) - full items loaded lazily
      const transformedTransactions = transactionsData.map((transaction: any) => ({
          TransactionID: transaction.TransactionID,
          ReferenceNo: transaction.ReferenceNo,
          PaymentMethod: transaction.PaymentMethod,
          Total: transaction.Total,
          OrderDateTime: transaction.OrderDateTime,
        Status: 'completed',
        // Only include preview item (first item) for list view
        Items: transaction.Transaction_Item?.slice(0, 1).map((item: any) => ({
            ProductName: item.Product?.Name || 'Unknown Product',
            Quantity: item.Quantity,
            UnitPrice: item.UnitPrice,
            Subtotal: item.Subtotal,
            VATAmount: item.VATAmount || 0,
            DiscountAmount: item.DiscountAmount || 0,
          Image: item.Product?.Image || undefined
        })) || [],
        ItemCount: transaction.ItemCount || transaction.Transaction_Item?.length || 0
        }));
        
        setTransactions(transformedTransactions);
      
      // Update pagination state
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalTransactions(pagination.total || 0);
      }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

  // Fetch transactions on mount and when page changes
  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage]);

  // Lazy load full transaction items when viewing details
  const loadTransactionItems = async (transactionId: string) => {
    // Check if already loaded
    if (loadedTransactionItems[transactionId]) {
      return loadedTransactionItems[transactionId];
    }

    try {
      const response = await api.get(`/transactions/${transactionId}`);
      const transaction = response.data;
      
      const items = transaction.Transaction_Item?.map((item: any) => ({
        ProductName: item.Product?.Name || 'Unknown Product',
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
        Subtotal: item.Subtotal,
        VATAmount: item.VATAmount || 0,
        DiscountAmount: item.DiscountAmount || 0,
        Image: item.Product?.Image || undefined
      })) || [];

      // Cache loaded items
      setLoadedTransactionItems(prev => ({
        ...prev,
        [transactionId]: items
      }));

      return items;
    } catch (error) {
      console.error('Error loading transaction items:', error);
      return [];
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'gcash': return <CreditCard className="w-4 h-4" />;
      case 'maya': return <CreditCard className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'text-green-600 bg-green-100';
      case 'gcash': return 'text-blue-600 bg-blue-100';
      case 'maya': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleTransactionExpanded = async (transactionId: string) => {
    const isCurrentlyExpanded = expandedTransactions.has(transactionId);
    
    // If expanding, load full items if needed
    if (!isCurrentlyExpanded) {
      const transaction = transactions.find(t => t.TransactionID === transactionId);
      if (transaction && transaction.ItemCount && transaction.ItemCount > 1 && !loadedTransactionItems[transactionId]) {
        const items = await loadTransactionItems(transactionId);
        // Update transaction with full items
        setTransactions(prev => prev.map(t => 
          t.TransactionID === transactionId 
            ? { ...t, Items: items }
            : t
        ));
      }
    }
    
    setExpandedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const openTransactionModal = async (transaction: Transaction) => {
    // Load full transaction items if not already loaded
    let fullItems = transaction.Items;
    if (transaction.ItemCount && transaction.ItemCount > 1 && !loadedTransactionItems[transaction.TransactionID]) {
      const items = await loadTransactionItems(transaction.TransactionID);
      fullItems = items;
      
      // Update transaction with full items
      setTransactions(prev => prev.map(t => 
        t.TransactionID === transaction.TransactionID 
          ? { ...t, Items: items }
          : t
      ));
    } else if (loadedTransactionItems[transaction.TransactionID]) {
      fullItems = loadedTransactionItems[transaction.TransactionID];
    }

    setSelectedTransaction({
      ...transaction,
      Items: fullItems
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  // Check user role - be strict about role checking
  const userRole = profile?.role ? String(profile.role).trim().toLowerCase() : '';
  const isClerk = userRole === 'clerk';
  const isPharmacistOrAdmin = userRole === 'pharmacist' || userRole === 'admin';
  
  // If profile is not loaded yet, deny access (safety first)
  const isRoleUnknown = !profile || !profile.role;

  // Handle reprint receipt
  const handleReprintReceipt = (transaction: Transaction) => {
    // Safety check: if role is unknown, deny access
    if (isRoleUnknown) {
      toast.error('Unable to verify your permissions. Please refresh the page and try again.', {
        position: 'top-center',
        duration: 4000,
      });
      return;
    }

    setSelectedTransactionForReprint(transaction);
    
    if (isClerk) {
      // Clerk needs verification
      setShowVerificationModal(true);
    } else if (isPharmacistOrAdmin) {
      // Pharmacist/Admin can reprint directly
      fetchTransactionDetailsAndShowReceipt(transaction.TransactionID);
    } else {
      // Unknown role - deny access
      alert('You do not have permission to reprint receipts. Only pharmacist and admin accounts can reprint receipts.');
    }
  };

  // Verify and reprint for clerks
  const handleVerifyAndReprint = async () => {
    if (!verificationUsername.trim() || !verificationPassword.trim()) {
      toast.error('Please enter username and password', {
        position: 'top-center',
        duration: 3000,
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await api.post('/auth/verify-pharmacist-admin', {
        username: verificationUsername,
        password: verificationPassword
      });

      if (response.data.success) {
        // Success - close modal and show receipt
        setShowVerificationModal(false);
        setVerificationUsername('');
        setVerificationPassword('');
        
        // Fetch transaction details and show receipt
        if (selectedTransactionForReprint) {
          await fetchTransactionDetailsAndShowReceipt(selectedTransactionForReprint.TransactionID);
        }
      } else {
        // Show error message from server
        toast.error(response.data.message || 'Authorization failed. Please check your credentials.', {
          position: 'top-center',
          duration: 4000,
        });
      }
    } catch (error: any) {
      // Handle different error types
      console.error('Verification error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        error: error.message
      });
      
      if (error.response?.status === 401) {
        const serverMessage = error.response?.data?.message || 'Invalid credentials';
        toast.error(`${serverMessage}. Please check the username and password.`, {
          position: 'top-center',
          duration: 4000,
        });
      } else if (error.response?.status === 403) {
        toast.error('Only pharmacist or admin accounts can authorize this action.', {
          position: 'top-center',
          duration: 4000,
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message, {
          position: 'top-center',
          duration: 4000,
        });
      } else if (error.message) {
        toast.error(`Error: ${error.message}`, {
          position: 'top-center',
          duration: 4000,
        });
      } else {
        toast.error('Authorization failed. Please try again.', {
          position: 'top-center',
          duration: 4000,
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch transaction details and show receipt
  const fetchTransactionDetailsAndShowReceipt = async (transactionId: string) => {
    try {
      const response = await api.get(`/transactions/${transactionId}`);
      const transaction = response.data;
      
      // Transform to receipt format
      const receiptItems = transaction.Transaction_Item?.map((item: any) => ({
        productName: item.Product?.Name || 'Unknown Product',
        quantity: item.Quantity,
        unitPrice: item.UnitPrice,
        subtotal: item.Subtotal,
        discountAmount: item.DiscountAmount || 0,
        vatAmount: item.VATAmount || 0
      })) || [];

      // Calculate totals from transaction
      const subtotal = transaction.Transaction_Item?.reduce((sum: number, item: any) => {
        const itemSubtotal = item.UnitPrice * item.Quantity;
        return sum + itemSubtotal;
      }, 0) || 0;

      const discount = transaction.Transaction_Item?.reduce((sum: number, item: any) => {
        return sum + (item.DiscountAmount || 0);
      }, 0) || 0;

      const vat = transaction.VATAmount || transaction.Transaction_Item?.reduce((sum: number, item: any) => {
        return sum + (item.VATAmount || 0);
      }, 0) || 0;

      const total = transaction.Total || 0;

      // Check if Senior/PWD discount was applied (check if SeniorPWDID exists)
      const isSeniorPWDActive = !!transaction.SeniorPWDID;

      setReceiptData({
        transactionId: transaction.TransactionID,
        referenceNo: transaction.ReferenceNo,
        orderDateTime: transaction.OrderDateTime,
        paymentMethod: transaction.PaymentMethod.toLowerCase(),
        items: receiptItems,
        subtotal: subtotal,
        discount: discount,
        vat: vat,
        total: total,
        cashReceived: transaction.CashReceived || undefined,
        change: transaction.PaymentChange || undefined,
        isSeniorPWDActive: isSeniorPWDActive
      });

      setShowReceipt(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      alert('Failed to load transaction details');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar - Same as Dashboard */}
      <div className="bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
        {/* Pharmacy Logo */}
        <div>
          <h1 
            onClick={() => navigate('/dashboard')}
            className="text-2xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
          >
            Jambo's Pharmacy
          </h1>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <span className="text-gray-700 font-medium hidden sm:block">
            {(() => {
              // Use profile data if available (from backend API)
              if (profile?.firstName && profile?.lastName) {
                return `${profile.firstName} ${profile.lastName}`;
              }
              if (profile?.full_name) {
                return profile.full_name;
              }
              
              // Fallback to user metadata (from Supabase auth)
              if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
                return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
              }
              if (user?.user_metadata?.full_name) {
                return user.user_metadata.full_name;
              }
              if (user?.user_metadata?.display_name) {
                return user.user_metadata.display_name;
              }
              
              // Final fallback
              return 'User';
            })()}
          </span>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">History</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Order No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order No.</label>
              <input
                type="text"
                placeholder="23312"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="gcash">Gcash</option>
                <option value="maya">Maya</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="loading loading-spinner loading-lg text-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const isExpanded = expandedTransactions.has(transaction.TransactionID);
              // Use loaded items if available, otherwise use transaction items
              const displayItems = loadedTransactionItems[transaction.TransactionID] || transaction.Items;
              // Show first item when collapsed, all items when expanded
              const itemsToShow = isExpanded ? displayItems : (displayItems.slice(0, 1));
              
              return (
              <div key={transaction.TransactionID} className="bg-white rounded-lg shadow-sm p-6">
                {/* Order Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      ORDER #{transaction.ReferenceNo}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(transaction.PaymentMethod)}`}>
                        {getPaymentMethodIcon(transaction.PaymentMethod)}
                        <span className="capitalize">{transaction.PaymentMethod}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatDate(transaction.OrderDateTime)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(transaction.OrderDateTime)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  {itemsToShow.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.Image && !item.Image.includes('via.placeholder.com') ? (
                          <img 
                            src={item.Image} 
                            alt={item.ProductName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide image on error, show placeholder div
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.ProductName}</h4>
                        <p className="text-sm text-gray-500">Antihistamine</p>
                      </div>

                      {/* Quantity */}
                      <div className="text-center">
                        <div className="text-sm text-gray-500 mb-1">QUANTITY</div>
                        <div className="text-lg font-semibold">{item.Quantity}</div>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">TOTAL:</div>
                        <div className="text-lg font-bold text-gray-800">
                          ₱{transaction.Total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show indicator if there are more items (only when collapsed) */}
                  {!isExpanded && transaction.ItemCount && transaction.ItemCount > 1 && (
                    <div className="text-center py-2">
                      <div className="text-sm text-gray-500 italic mb-2">
                        + {transaction.ItemCount - 1} more item{transaction.ItemCount - 1 > 1 ? 's' : ''} (click to expand)
                      </div>
                      <button
                        onClick={() => toggleTransactionExpanded(transaction.TransactionID)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
                        aria-label="Expand transaction"
                      >
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  )}
                  
                  {/* Show collapse button when expanded */}
                  {isExpanded && (
                    <div className="text-center py-2">
                      <button
                        onClick={() => toggleTransactionExpanded(transaction.TransactionID)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
                        aria-label="Collapse transaction"
                      >
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Order Footer - Always visible */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => handleReprintReceipt(transaction)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Reprint Receipt
                  </button>
                  <button 
                    onClick={() => openTransactionModal(transaction)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next ›
            </button>
            
            <span className="text-sm text-gray-500 ml-4">
              Page {currentPage} of {totalPages} ({totalTransactions} total)
            </span>
        </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <ReceiptIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Transaction Details</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <ReceiptIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Order Number:</span>
                    <span className="font-medium">#{selectedTransaction.ReferenceNo}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(selectedTransaction.OrderDateTime)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="font-medium">{formatTime(selectedTransaction.OrderDateTime)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon(selectedTransaction.PaymentMethod)}
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(selectedTransaction.PaymentMethod)}`}>
                      {selectedTransaction.PaymentMethod}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Issued by:</span>
                    <span className="font-medium">
                      {(() => {
                        // Use profile data if available (from backend API)
                        if (profile?.firstName && profile?.lastName) {
                          return `${profile.firstName} ${profile.lastName}`;
                        }
                        if (profile?.full_name) {
                          return profile.full_name;
                        }
                        
                        // Fallback to user metadata (from Supabase auth)
                        if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
                          return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
                        }
                        if (user?.user_metadata?.full_name) {
                          return user.user_metadata.full_name;
                        }
                        if (user?.user_metadata?.display_name) {
                          return user.user_metadata.display_name;
                        }
                        
                        // Final fallback
                        return 'Current User';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items Purchased</h3>
                <div className="space-y-3">
                  {selectedTransaction.Items.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      {/* Product Header */}
                      <div className="flex items-center space-x-4">
                        {/* Product Image */}
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.Image && !item.Image.includes('via.placeholder.com') ? (
                            <img 
                              src={item.Image} 
                              alt={item.ProductName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Hide image on error, show placeholder div
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-400">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{item.ProductName}</h4>
                          <p className="text-sm text-gray-500">Unit Price: ₱{item.UnitPrice.toFixed(2)}</p>
                        </div>

                        {/* Quantity */}
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Qty</div>
                          <div className="font-semibold">{item.Quantity}</div>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {/* Base Amount */}
                        <div className="text-center">
                          <div className="text-gray-500">Base Amount</div>
                          <div className="font-medium">₱{(item.UnitPrice * item.Quantity).toFixed(2)}</div>
                        </div>

                        {/* Discount */}
                        <div className="text-center">
                          <div className="text-gray-500">Discount</div>
                          <div className={`font-medium ${(item.DiscountAmount ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {(item.DiscountAmount ?? 0) > 0 ? `-₱${(item.DiscountAmount ?? 0).toFixed(2)}` : '₱0.00'}
                          </div>
                        </div>

                        {/* VAT */}
                        <div className="text-center">
                          <div className="text-gray-500">VAT (12%)</div>
                          <div className={`font-medium ${(item.VATAmount ?? 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {(item.VATAmount ?? 0) > 0 ? `₱${(item.VATAmount ?? 0).toFixed(2)}` : '₱0.00'}
                          </div>
                        </div>

                        {/* Final Subtotal */}
                        <div className="text-center">
                          <div className="text-gray-500">Subtotal</div>
                          <div className="font-semibold text-gray-800">₱{item.Subtotal.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Note for older transactions */}
                      {(item.VATAmount ?? 0) === 0 && (item.DiscountAmount ?? 0) === 0 && (
                        <div className="text-center">
                          <p className="text-xs text-gray-500 italic">
                            * Detailed breakdown not available for this transaction
                          </p>
                        </div>
                      )}

                      {/* Discount/VAT Status */}
                      <div className="flex justify-center space-x-4">
                        {(item.DiscountAmount ?? 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Discounted
                          </span>
                        )}
                        {(item.VATAmount ?? 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            VAT Applied
                          </span>
                        )}
                        {(item.DiscountAmount ?? 0) === 0 && (item.VATAmount ?? 0) === 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            No Discount/VAT
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">₱{selectedTransaction.Total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for Clerks */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Authorization Required</h2>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationUsername('');
                  setVerificationPassword('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Clerk accounts require authorization from a pharmacist or admin to reprint receipts.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacist/Admin Username
                </label>
                <input
                  type="text"
                  value={verificationUsername}
                  onChange={(e) => setVerificationUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyAndReprint();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationUsername('');
                  setVerificationPassword('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAndReprint}
                disabled={isVerifying || !verificationUsername.trim() || !verificationPassword.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Authorize & Reprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <Receipt
          transactionId={receiptData.transactionId}
          referenceNo={receiptData.referenceNo}
          orderDateTime={receiptData.orderDateTime}
          paymentMethod={receiptData.paymentMethod}
          items={receiptData.items}
          subtotal={receiptData.subtotal}
          discount={receiptData.discount}
          vat={receiptData.vat}
          total={receiptData.total}
          cashReceived={receiptData.cashReceived}
          change={receiptData.change}
          isSeniorPWDActive={receiptData.isSeniorPWDActive}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default HistoryPage;