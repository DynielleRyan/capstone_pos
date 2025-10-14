import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid3X3, 
  Clock, 
  LogOut, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ShoppingCart,
  Pill,
  Shield,
  ShoppingBag,
  Heart,
  Baby,
  User 
} from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import OrderItem from '../components/OrderItem';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';



// Add interface for Product from database
interface Product {
  ProductID: string;
  Name: string;
  GenericName: string;
  Category: string;
  Brand: string;
  SellingPrice: number;
  IsVATExemptYN: boolean;
  PrescriptionYN: boolean;
  Image?: string;
}

// Add interface for CartItem
interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  discounts?: string[];
}

const DashboardPage = () => {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  
  // Add state for products and cart
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Note: Profile API is currently returning 404, so we'll use user metadata instead

  // Update time every second (Philippine time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const philippineTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now);
      setCurrentTime(philippineTime);
    };

    // Update immediately
    updateTime();
    
    // Update every second
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        console.log('Products fetched:', response.data); // Debug log
        setProducts(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        // Keep products array empty if API fails
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search, category, and filter criteria
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.GenericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.Brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product =>
        product.Category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Additional filters
    switch (selectedFilter) {
      case 'prescription':
        filtered = filtered.filter(product => product.PrescriptionYN);
        break;
      case 'non-prescription':
        filtered = filtered.filter(product => !product.PrescriptionYN);
        break;
      case 'vat-exempt':
        filtered = filtered.filter(product => product.IsVATExemptYN);
        break;
      case 'vat-included':
        filtered = filtered.filter(product => !product.IsVATExemptYN);
        break;
      case 'price-low':
        filtered = filtered.sort((a, b) => a.SellingPrice - b.SellingPrice);
        break;
      case 'price-high':
        filtered = filtered.sort((a, b) => b.SellingPrice - a.SellingPrice);
        break;
      case 'name-asc':
        filtered = filtered.sort((a, b) => a.Name.localeCompare(b.Name));
        break;
      case 'name-desc':
        filtered = filtered.sort((a, b) => b.Name.localeCompare(a.Name));
        break;
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [products, searchTerm, selectedCategory, selectedFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Add function to add item to cart
  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.name === product.Name);
    
    if (existingItem) {
      setCartItems(prev => 
        prev.map(item => 
          item.name === product.Name 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem: CartItem = {
        id: product.ProductID,
        name: product.Name,
        description: product.GenericName || product.Name,
        price: product.SellingPrice,
        quantity: 1,
        discounts: ["Senior/PWD Discount", "VAT Exemption"]
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  // Add function to update quantity
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  // Add function to clear cart with confirmation
  const clearCart = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is already empty');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to clear the cart? This action cannot be undone.'
    );
    
    if (confirmed) {
      setCartItems([]);
      setSelectedPaymentMethod('');
      setReferenceNumber('');
      setCashReceived('');
      toast.success('Cart cleared successfully');
    }
  };

  // Add function to handle payment method selection
  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    // Clear reference number when payment method changes
    setReferenceNumber('');
  };

  // Add function to handle reference number change
  const handleReferenceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferenceNumber(e.target.value);
  };

  // Add function to handle cash received change
  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCashReceived(e.target.value);
  };

  // Add function to calculate change
  const calculateChange = () => {
    if (selectedPaymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      const total = calculateTotal();
      return Math.max(0, received - total);
    }
    return 0;
  };

  // Add calculation functions
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity * 0.2), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const vat = (subtotal - discount) * 0.12;
    return subtotal - discount + vat;
  };

  // Add function to process charge/transaction
  const handleCharge = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error('Please enter a reference number from the payment device');
      return;
    }
    if (selectedPaymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) <= 0)) {
      toast.error('Please enter the cash amount received');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Processing transaction...');

    try {
      // Combine payment method prefix with manually entered reference number
      const prefix = selectedPaymentMethod === 'cash' ? 'CASH' : 
                    selectedPaymentMethod === 'gcash' ? 'GCASH' : 'MAYA';
      const fullReferenceNumber = `${prefix}-${referenceNumber}`;
      
      const transactionData = {
        referenceNo: fullReferenceNumber,
        paymentMethod: selectedPaymentMethod,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        vat: (calculateSubtotal() - calculateDiscount()) * 0.12,
        cashReceived: selectedPaymentMethod === 'cash' ? parseFloat(cashReceived) || 0 : null,
        change: calculateChange(),
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity
        }))
      };

      const response = await api.post('/transactions', transactionData);
      
      if (response.data.success) {
        toast.dismiss(loadingToast);
        toast.success(`Transaction completed successfully!\nReference: ${response.data.referenceNo}`, {
          duration: 4000,
        });
        clearCart();
        // Optionally navigate to history page
        // navigate('/history');
      } else {
        toast.dismiss(loadingToast);
        toast.error('Transaction failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast.dismiss(loadingToast);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Sidebar - same as before */}
      <div className="w-full lg:w-80 bg-white shadow-lg flex flex-col lg:flex-col">
        {/* Logo */}
        <div className="p-6 border-b text-center">
          <h1 className="text-2xl font-bold text-blue-600">Jambo's Pharmacy</h1>
        </div>

        {/* Navigation - same as before */}
        <div className="flex-1 p-4">
          <div className="flex lg:flex-col space-x-4 lg:space-x-0 lg:space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg flex-1 lg:flex-none justify-center lg:justify-start">
              <Grid3X3 className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">Dashboard</span>
            </div>
            
            <div 
              className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex-1 lg:flex-none justify-center lg:justify-start"
              onClick={() => navigate('/history')}
            >
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">History</span>
            </div>
          </div>
        </div>

        {/* Logout - same as before */}
        <div className="p-4 border-t">
          <div 
            className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Logout</span>
          </div>
          <div className="text-sm text-gray-500 mt-2 text-center">{currentTime}</div>
        </div>
      </div>

      {/* Main Content Area - same as before */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - same as before */}
        <div className="bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

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
                return user?.email || 'User';
              })()}
            </span>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6">
          {/* Categories Section - Functional */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Category</h2>
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-2">
              {/* Predefined categories */}
              {[
                { name: "All", icon: <Grid3X3 className="w-6 h-6 text-gray-600" />, value: "" },
                { name: "Pain Relief", icon: <Pill className="w-6 h-6 text-blue-600" />, value: "Pain Relief" },
                { name: "Antibiotic", icon: <Shield className="w-6 h-6 text-green-600" />, value: "Antibiotic" },
                { name: "OTC", icon: <ShoppingBag className="w-6 h-6 text-purple-600" />, value: "OTC" },
                { name: "Essentials", icon: <Heart className="w-6 h-6 text-orange-600" />, value: "Essentials" },
                { name: "Baby Needs", icon: <Baby className="w-6 h-6 text-pink-600" />, value: "Baby Needs" }
              ].map((category, index) => (
                <CategoryCard
                  key={index}
                  name={category.name}
                  icon={category.icon}
                  onClick={() => setSelectedCategory(category.value)}
                  isSelected={selectedCategory === category.value}
                />
              ))}
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Products ({filteredProducts.length})
              </h2>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative">
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-4 py-2 pr-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="all">All Products</option>
                    <option value="prescription">Prescription Only</option>
                    <option value="non-prescription">Non-Prescription</option>
                    <option value="vat-exempt">VAT Exempt</option>
                    <option value="vat-included">VAT Included</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="loading loading-spinner loading-lg text-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading products...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="alert alert-warning mb-4">
                <span>{error}</span>
              </div>
            )}

            {/* Product Grid - DYNAMIC DATA */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                {currentProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <p>No products found</p>
                    <p className="text-sm">
                      {filteredProducts.length === 0 
                        ? "Try adjusting your search or filters" 
                        : "No products on this page"}
                    </p>
                  </div>
                ) : (
                  currentProducts.map((product) => (
                    <ProductCard
                      key={product.ProductID}
                      name={product.Name}
                      description={product.GenericName || product.Name}
                      image={product.Image}
                      onAdd={() => addToCart(product)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Pagination - Functional */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <button 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                
                {/* Show page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Order Summary */}
      <div className="w-full lg:w-[28rem] bg-white shadow-lg flex flex-col order-first lg:order-last">
        {/* Order Header */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800">Order</span>
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded flex-1 sm:flex-none text-center">Senior/PWD</button>
              <button 
                onClick={clearCart}
                className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded flex-1 sm:flex-none text-center hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No items in cart</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <OrderItem
                  key={item.id}
                  product={{
                    id: item.id,
                    name: item.name,
                    discounts: item.discounts
                  }}
                  quantity={item.quantity}
                  price={`₱${item.price.toFixed(2)}`}
                  discount={`- ₱${(item.price * 0.2).toFixed(2)}`}
                  onQuantityChange={(newQuantity) => updateQuantity(item.id, newQuantity)}
                />
              ))
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₱{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-red-500">-₱{calculateDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT</span>
              <span className="font-medium">₱{((calculateSubtotal() - calculateDiscount()) * 0.12).toFixed(2)}</span>
            </div>
            {selectedPaymentMethod === 'cash' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cash Received <span className="text-red-500">*</span></span>
                <input 
                  type="number" 
                  placeholder="₱0" 
                  value={cashReceived}
                  onChange={handleCashReceivedChange}
                  className={`w-20 text-right border rounded px-1 py-0.5 ${
                    !cashReceived || parseFloat(cashReceived) <= 0 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
            )}
            {selectedPaymentMethod === 'cash' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Change</span>
                <span className="font-medium">₱{calculateChange().toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button 
              onClick={() => handlePaymentMethodSelect('cash')}
              className={`py-2 border rounded text-sm transition-colors ${
                selectedPaymentMethod === 'cash' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cash
            </button>
            <button 
              onClick={() => handlePaymentMethodSelect('gcash')}
              className={`py-2 border rounded text-sm transition-colors ${
                selectedPaymentMethod === 'gcash' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Gcash
            </button>
            <button 
              onClick={() => handlePaymentMethodSelect('maya')}
              className={`py-2 border rounded text-sm transition-colors ${
                selectedPaymentMethod === 'maya' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Maya
            </button>
          </div>

          {/* Reference Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              {selectedPaymentMethod && (
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                  {selectedPaymentMethod === 'cash' ? 'CASH-' : 
                   selectedPaymentMethod === 'gcash' ? 'GCASH-' : 
                   'MAYA-'}
                </span>
              )}
              <input
                type="text"
                placeholder={selectedPaymentMethod ? "Enter reference number" : "Select payment method first"}
                value={referenceNumber}
                onChange={handleReferenceNumberChange}
                disabled={!selectedPaymentMethod}
                className={`flex-1 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedPaymentMethod ? 'rounded-l-none' : 'rounded-l-md'
                } ${
                  !selectedPaymentMethod 
                    ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                    : !referenceNumber.trim() 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                }`}
                required
              />
            </div>
            {selectedPaymentMethod && (
              <p className="text-xs text-gray-500 mt-1">
                Enter the reference number from the {selectedPaymentMethod} payment device
                <br />
                <span className="text-gray-400">
                  Example: {selectedPaymentMethod === 'cash' ? 'CASH-12345' : 
                           selectedPaymentMethod === 'gcash' ? 'GCASH-67890' : 
                           'MAYA-54321'}
                </span>
              </p>
            )}
          </div>

          {/* Charge Button */}
          <button 
            onClick={handleCharge}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={
              !selectedPaymentMethod || 
              !referenceNumber.trim() || 
              cartItems.length === 0 || 
              isProcessing ||
              (selectedPaymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) <= 0))
            }
          >
            {isProcessing ? 'Processing...' : `Charge ₱${calculateTotal().toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;