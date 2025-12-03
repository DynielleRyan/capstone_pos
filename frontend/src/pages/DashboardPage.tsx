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
  User,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import OrderItem from '../components/OrderItem';
import Receipt from '../components/Receipt';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Main dashboard component for the pharmacy PoS system



// Product interface - matches database schema
interface Product {
  ProductID: string;           // Unique product identifier
  Name: string;               // Product display name
  GenericName: string;        // Generic/brand name
  Category: string;           // Product category
  Brand: string;              // Product brand
  SellingPrice: number;       // Price per unit
  IsVATExemptYN: boolean;     // VAT exemption status
  PrescriptionYN: boolean;    // Prescription requirement
  Image?: string;             // Product image URL
  stock?: number;             // Available stock (optional)
}

// Shopping cart item interface
interface CartItem {
  id: string;                 // Product ID
  name: string;               // Product name
  description: string;        // Product description
  price: number;              // Unit price
  quantity: number;           // Quantity in cart
  stock?: number;             // Available stock
  discounts?: string[];       // Applied discounts
}

const DashboardPage = () => {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  
  // Product and cart state management
  const [products, setProducts] = useState<Product[]>([]);           // All products from API
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]); // Filtered products for display
  const [cartItems, setCartItems] = useState<CartItem[]>([]);        // Shopping cart items
  const [loading, setLoading] = useState(true);                     // Loading state
  const [error, setError] = useState('');                           // Error messages
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');         // Search input
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Selected category
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // Filter type
  const [currentPage, setCurrentPage] = useState<number>(1);        // Current page for pagination
  const [itemsPerPage] = useState<number>(10);                     // Items per page
  
  // Payment processing state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(''); // Payment method
  const [referenceNumber, setReferenceNumber] = useState<string>(''); // Payment reference
  const [cashReceived, setCashReceived] = useState<string>('');     // Cash amount received
  const [isProcessing, setIsProcessing] = useState(false);          // Transaction processing state
  const [currentTime, setCurrentTime] = useState('');               // Current time display
  const [isSeniorPWDActive, setIsSeniorPWDActive] = useState(false); // Senior/PWD discount state
  const [showConfirmModal, setShowConfirmModal] = useState(false);  // Confirmation modal state
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    referenceNo: string;
    orderDateTime: string;
    paymentMethod: string;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      discountAmount?: number;
      vatAmount?: number;
    }>;
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    cashReceived?: number;
    change?: number;
  } | null>(null);

  // Note: Profile API is currently returning 404, so we'll use user metadata instead

  // Real-time clock display - updates every second with Philippine timezone
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

    // Update immediately on mount
    updateTime();
    
    // Set up interval to update every second
    const interval = setInterval(updateTime, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Fetch products from backend API on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        console.log('Products fetched:', response.data); // Debug log
        
        // Fetch stock for each product
        const productsWithStock = await Promise.all(
          response.data.map(async (product: Product) => {
            try {
              const stockResponse = await api.get(`/inventory/stock/${product.ProductID}`);
              return {
                ...product,
                stock: stockResponse.data.totalStock || 0
              };
            } catch (err) {
              console.error(`Error fetching stock for product ${product.ProductID}:`, err);
              return {
                ...product,
                stock: 0
              };
            }
          })
        );
        
        setProducts(productsWithStock);
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

  // Filter and sort products based on search, category, and filter criteria
  useEffect(() => {
    let filtered = [...products];

    // Text search filter - searches name, generic name, and brand
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.GenericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.Brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter - exact match with selected category
    if (selectedCategory) {
      filtered = filtered.filter(product =>
        product.Category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Additional filters and sorting options
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

  // Pagination calculations for product display
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Pagination navigation handlers
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

  // Add product to shopping cart - increments quantity if already exists
  const addToCart = (product: Product) => {
    const availableStock = product.stock || 0;
    
    // Check if product has stock
    if (availableStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    
    const existingItem = cartItems.find(item => item.name === product.Name);
    
    if (existingItem) {
      // Check if we can increment quantity
      if (existingItem.quantity >= availableStock) {
        toast.error(`Cannot add more. Only ${availableStock} available in stock.`);
        return;
      }
      // Increment quantity if item already in cart
      setCartItems(prev => 
        prev.map(item => 
          item.name === product.Name 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: product.ProductID,
        name: product.Name,
        description: product.GenericName || product.Name,
        price: product.SellingPrice,
        quantity: 1,
        stock: availableStock
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  // Update item quantity in cart - removes item if quantity is 0
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item from cart if quantity is 0 or negative
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      // Find the cart item and validate against stock
      const cartItem = cartItems.find(item => item.id === id);
      if (cartItem) {
        const availableStock = cartItem.stock || 0;
        if (newQuantity > availableStock) {
          toast.error(`Cannot add more. Only ${availableStock} available in stock.`);
          return;
        }
        // Update quantity for existing item
        setCartItems(prev => 
          prev.map(item => 
            item.id === id ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    }
  };

  // Clear entire cart with user confirmation
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

  // Handle payment method selection - clears reference number when changed
  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    // Clear reference number when payment method changes
    setReferenceNumber('');
  };

  // Handle reference number input changes
  const handleReferenceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferenceNumber(e.target.value);
  };

  // Handle cash received amount input changes
  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCashReceived(e.target.value);
  };

  // Calculate change for cash payments
  const calculateChange = () => {
    if (selectedPaymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      const total = calculateTotal();
      return Math.max(0, received - total);
    }
    return 0;
  };

  // Financial calculation functions
  const calculateSubtotal = () => {
    // Sum of all item prices × quantities
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    // Only apply discount if Senior/PWD button is active
    if (!isSeniorPWDActive) {
      return 0; // No discount unless button is clicked
    }
    
    // Apply 20% discount to entire transaction when button is active
    const subtotal = calculateSubtotal();
    return subtotal * 0.2;
  };

  const calculateTotal = () => {
    // Total = Subtotal - Discount + VAT (12% on discounted amount)
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const vat = (subtotal - discount) * 0.12;
    return subtotal - discount + vat;
  };

  // Show confirmation modal before processing transaction
  const handleChargeClick = () => {
    // Validate required fields before showing modal
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
    
    setShowConfirmModal(true);
  };

  // Process transaction after confirmation
  const handleConfirmTransaction = () => {
    setShowConfirmModal(false);
    handleCharge();
  };

  // Process transaction and send to backend API
  const handleCharge = async () => {
    // Validate required fields before processing
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
      // Create full reference number with payment method prefix
      const prefix = selectedPaymentMethod === 'cash' ? 'CASH' : 
                    selectedPaymentMethod === 'gcash' ? 'GCASH' : 'MAYA';
      const fullReferenceNumber = `${prefix}-${referenceNumber}`;
      
      // Prepare transaction data for API
      const transactionData = {
        referenceNo: fullReferenceNumber,
        paymentMethod: selectedPaymentMethod,
        subtotal: calculateSubtotal(),
        isSeniorPWDActive: isSeniorPWDActive, // Send discount flag instead of calculated amount
        cashReceived: selectedPaymentMethod === 'cash' ? parseFloat(cashReceived) || 0 : null,
        change: calculateChange(),
        userId: user?.id || user?.user_metadata?.id, // Send the authenticated user's ID
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      };

      console.log('User object:', user); // Debug log
      console.log('Sending transaction data:', transactionData); // Debug log

      // Send transaction to backend
      const response = await api.post('/transactions', transactionData);
      
      console.log('Transaction response:', response.data); // Debug log
      
      if (response.data.success) {
        toast.dismiss(loadingToast);
        toast.success(`Transaction completed successfully!\nReference: ${response.data.referenceNo}`, {
          duration: 4000,
        });
        
        // Prepare receipt data
        const receiptItems = cartItems.map(item => {
          const itemSubtotal = item.price * item.quantity;
          const itemDiscount = isSeniorPWDActive ? itemSubtotal * 0.2 : 0;
          const itemVAT = (itemSubtotal - itemDiscount) * 0.12;
          const finalSubtotal = itemSubtotal - itemDiscount + itemVAT;
          
          return {
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: finalSubtotal,
            discountAmount: itemDiscount,
            vatAmount: itemVAT
          };
        });
        
        setReceiptData({
          transactionId: response.data.transactionId,
          referenceNo: response.data.referenceNo,
          orderDateTime: new Date().toISOString(),
          paymentMethod: selectedPaymentMethod,
          items: receiptItems,
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          vat: (calculateSubtotal() - calculateDiscount()) * 0.12,
          total: calculateTotal(),
          cashReceived: selectedPaymentMethod === 'cash' ? parseFloat(cashReceived) || undefined : undefined,
          change: selectedPaymentMethod === 'cash' ? calculateChange() : undefined
        });
        
        clearCart();
        setShowReceipt(true);
        // Optionally navigate to history page
        // navigate('/history');
      } else {
        toast.dismiss(loadingToast);
        toast.error('Transaction failed: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      console.error('Error details:', error.response?.data); // Debug log
      toast.dismiss(loadingToast);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user logout
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
          <h1 
            onClick={() => navigate('/dashboard')}
            className="text-2xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
          >
            Jambo's Pharmacy
          </h1>
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
                      stock={product.stock}
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
              <button 
                onClick={() => setIsSeniorPWDActive(!isSeniorPWDActive)}
                className={`px-3 py-1 text-sm rounded flex-1 sm:flex-none text-center transition-colors ${
                  isSeniorPWDActive
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSeniorPWDActive ? '✓ Senior/PWD' : 'Senior/PWD'}
              </button>
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
                    name: item.name
                  }}
                  quantity={item.quantity}
                  price={`₱${item.price.toFixed(2)}`}
                  stock={item.stock}
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
            
            {/* Only show discount line if button is active */}
            {isSeniorPWDActive && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Senior/PWD Discount (20%)</span>
                <span className="font-medium text-red-500">-₱{calculateDiscount().toFixed(2)}</span>
              </div>
            )}
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
            onClick={handleChargeClick}
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
      
      {/* Transaction Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Confirm Transaction</h2>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-gray-600">Are you sure you want to process this transaction?</p>
                
                {/* Transaction Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">{selectedPaymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference No:</span>
                    <span className="font-medium">{referenceNumber}</span>
                  </div>
                  {selectedPaymentMethod === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cash Received:</span>
                        <span className="font-medium">₱{parseFloat(cashReceived || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change:</span>
                        <span className="font-medium">₱{calculateChange().toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">Total Amount:</span>
                      <span className="font-bold text-lg text-blue-600">₱{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransaction}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm Transaction
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
          isSeniorPWDActive={isSeniorPWDActive}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;