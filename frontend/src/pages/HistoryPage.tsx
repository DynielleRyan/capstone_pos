import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown,
  ArrowLeft,
  CreditCard,
  Banknote
} from 'lucide-react';
import api from '../services/api';

interface Transaction {
  TransactionID: string;
  ReferenceNo: string;
  PaymentMethod: 'cash' | 'gcash' | 'maya';
  Total: number;
  OrderDateTime: string;
  Status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  Items: TransactionItem[];
}

interface TransactionItem {
  ProductName: string;
  Quantity: number;
  UnitPrice: number;
  Subtotal: number;
  Image?: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

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
        transaction.PaymentMethod === selectedPaymentMethod
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

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/transactions?t=${Date.now()}`);
        
        // Transform the API response to match our interface
        const transformedTransactions = response.data.map((transaction: any) => ({
          TransactionID: transaction.TransactionID,
          ReferenceNo: transaction.ReferenceNo,
          PaymentMethod: transaction.PaymentMethod,
          Total: transaction.Total,
          OrderDateTime: transaction.OrderDateTime,
          Status: 'completed', // Default status since our DB doesn't have this field yet
          Items: transaction.Transaction_Item?.map((item: any) => ({
            ProductName: item.Product?.Name || 'Unknown Product',
            Quantity: item.Quantity,
            UnitPrice: item.UnitPrice,
            Subtotal: item.Subtotal,
            Image: item.Product?.Image || 'https://via.placeholder.com/150x150/E5E7EB/6B7280?text=No+Image'
          })) || []
        }));
        
        setTransactions(transformedTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        // Fallback to empty array if API fails
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar - Same as Dashboard */}
      <div className="bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
        {/* Search Bar */}
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search"
            className="w-full sm:w-80 pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <span className="text-gray-700 font-medium hidden sm:block">Jemsey Amonsot</span>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
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
            filteredTransactions.map((transaction) => (
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
                  {transaction.Items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                        {item.Image ? (
                          <img 
                            src={item.Image} 
                            alt={item.ProductName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-lg"></div>
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
                </div>

                {/* Order Footer */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">See More</span>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center space-x-2 mt-8">
          <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">‹</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">2</button>
          <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">3</button>
          <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">›</button>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;