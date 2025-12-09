import { useState, useEffect, useCallback } from 'react';
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
  SeniorPWDYN?: boolean;      // Senior/PWD VAT exemption
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
  seniorPWDYN?: boolean;      // Senior/PWD VAT exemption
  isVATExemptYN?: boolean;    // VAT exemption status
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
  const [seniorPWDID, setSeniorPWDID] = useState<string>(''); // Senior/PWD ID
  const [seniorPWDType, setSeniorPWDType] = useState<'pwd' | 'senior' | null>(null); // PWD or Senior Citizen type
  const [showSeniorPWDModal, setShowSeniorPWDModal] = useState(false); // Senior/PWD ID modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);  // Confirmation modal state
  const [showClearCartModal, setShowClearCartModal] = useState(false);  // Clear cart modal state
  
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
    vatExempt?: number;
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

  // Fetch products from backend API - can be called on mount or after transactions
  const fetchProducts = useCallback(async (showLoading = true) => {
      try {
      if (showLoading) {
        setLoading(true);
      }
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
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch on mount, refresh after transactions is handled separately

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
        stock: availableStock,
        seniorPWDYN: product.SeniorPWDYN,
        isVATExemptYN: product.IsVATExemptYN
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

  // Add a removeItem function (you can add this near the updateQuantity function)
  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    toast.success('Item removed from cart');
  };

  // Clear cart without confirmation (used after successful transaction)
  const clearCartSilently = () => {
    setCartItems([]);
    setSelectedPaymentMethod('');
    setReferenceNumber('');
    setCashReceived('');
    setIsSeniorPWDActive(false);
    setSeniorPWDID(''); // Reset Senior/PWD ID
    setSeniorPWDType(null); // Reset Senior/PWD type
  };

  // Clear entire cart with modal confirmation (used when user clicks clear button)
  const clearCart = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is already empty');
      return;
    }
    setShowClearCartModal(true);
  };

  // Handle confirmed cart clearing
  const handleConfirmClearCart = () => {
    clearCartSilently();
    setShowClearCartModal(false);
      toast.success('Cart cleared successfully');
  };

  // Handle confirmed Senior/PWD ID input
  const handleConfirmSeniorPWD = () => {
    if (!seniorPWDType) {
      toast.error('Please select PWD or Senior Citizen');
      return;
    }
    if (seniorPWDID.trim()) {
      setIsSeniorPWDActive(true);
      setShowSeniorPWDModal(false);
      const typeLabel = seniorPWDType === 'pwd' ? 'PWD' : 'Senior Citizen';
      toast.success(`${typeLabel} discount applied`);
    } else {
      toast.error('Please enter a valid ID');
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

  const calculateVAT = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    
    // Calculate VAT per item based on SeniorPWDYN and IsVATExemptYN
    return cartItems.reduce((totalVAT, item) => {
      const itemSubtotal = item.price * item.quantity;
      const itemDiscount = isSeniorPWDActive ? itemSubtotal * (discount / subtotal) : 0;
      
      // Calculate VAT:
      // 1. If Senior/PWD is active AND product has SeniorPWDYN = true, VAT = 0
      // 2. If product has IsVATExemptYN = true, VAT = 0
      // 3. Otherwise, VAT = 12% of (itemSubtotal - itemDiscount)
      // Handle boolean, string, or null values
      const seniorPWDYN = item.seniorPWDYN === true || item.seniorPWDYN === 'true';
      const isVATExemptYN = item.isVATExemptYN === true || item.isVATExemptYN === 'true';
      
      let itemVAT = 0;
      if (!isVATExemptYN && !(isSeniorPWDActive && seniorPWDYN)) {
        itemVAT = (itemSubtotal - itemDiscount) * 0.12;
      }
      
      return totalVAT + itemVAT;
    }, 0);
  };

  const calculateVATExempt = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    
    // Calculate VAT exempt amount (items with 0 VAT)
    return cartItems.reduce((totalExempt, item) => {
      const itemSubtotal = item.price * item.quantity;
      const itemDiscount = isSeniorPWDActive ? itemSubtotal * (discount / subtotal) : 0;
      
      // If item has no VAT (either IsVATExemptYN or SeniorPWDYN when active)
      // Handle boolean, string, or null values
      const seniorPWDYN = item.seniorPWDYN === true || item.seniorPWDYN === 'true';
      const isVATExemptYN = item.isVATExemptYN === true || item.isVATExemptYN === 'true';
      const hasNoVAT = isVATExemptYN || (isSeniorPWDActive && seniorPWDYN);
      if (hasNoVAT) {
        return totalExempt + (itemSubtotal - itemDiscount);
      }
      return totalExempt;
    }, 0);
  };

  const calculateTotal = () => {
    // Total = Subtotal - Discount + VAT
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const vat = calculateVAT();
    return subtotal - discount + vat;
  };

  // Show confirmation modal before processing transaction
  const handleChargeClick = () => {
    // Validate required fields before showing modal
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    // Only require reference number for non-cash transactions
    if (selectedPaymentMethod !== 'cash' && !referenceNumber.trim()) {
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
    // Only require reference number for non-cash transactions
    if (selectedPaymentMethod !== 'cash' && !referenceNumber.trim()) {
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
      // For cash, generate automatic reference number using timestamp
      let fullReferenceNumber: string;
      if (selectedPaymentMethod === 'cash') {
        // Generate automatic reference for cash: CASH-YYYYMMDD-HHMMSS
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        fullReferenceNumber = `CASH-${dateStr}-${timeStr}`;
      } else {
        const prefix = selectedPaymentMethod === 'gcash' ? 'GCASH' : 'MAYA';
        fullReferenceNumber = `${prefix}-${referenceNumber}`;
      }
      
      // Prepare transaction data for API
      const transactionData = {
        referenceNo: fullReferenceNumber,
        paymentMethod: selectedPaymentMethod,
        subtotal: calculateSubtotal(),
        isSeniorPWDActive: isSeniorPWDActive, // Send discount flag instead of calculated amount
        seniorPWDID: isSeniorPWDActive && seniorPWDID && seniorPWDType 
          ? `${seniorPWDType.toUpperCase()}-${seniorPWDID}` 
          : null, // Send PWD/Senior ID with prefix if active
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
        const subtotal = calculateSubtotal();
        const discount = calculateDiscount();
        const receiptItems = cartItems.map(item => {
          const itemSubtotal = item.price * item.quantity;
          const itemDiscount = isSeniorPWDActive ? itemSubtotal * (discount / subtotal) : 0;
          
          // Calculate VAT per item based on SeniorPWDYN and IsVATExemptYN
          // Handle boolean, string, or null values
          const seniorPWDYN = item.seniorPWDYN === true || item.seniorPWDYN === 'true';
          const isVATExemptYN = item.isVATExemptYN === true || item.isVATExemptYN === 'true';
          
          let itemVAT = 0;
          if (!isVATExemptYN && !(isSeniorPWDActive && seniorPWDYN)) {
            itemVAT = (itemSubtotal - itemDiscount) * 0.12;
          }
          
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
          subtotal: subtotal,
          discount: discount,
          vat: calculateVAT(),
          vatExempt: calculateVATExempt(),
          total: calculateTotal(),
          cashReceived: selectedPaymentMethod === 'cash' ? parseFloat(cashReceived) || undefined : undefined,
          change: selectedPaymentMethod === 'cash' ? calculateChange() : undefined
        });
        
        clearCartSilently(); // Clear cart without confirmation after successful transaction
        // Refresh products to update stock numbers in real-time
        fetchProducts(false); // Don't show loading spinner when refreshing after transaction
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
                onClick={() => {
                  if (!isSeniorPWDActive) {
                    // When activating, show modal to input ID
                    setShowSeniorPWDModal(true);
                  } else {
                    // When deactivating, clear the ID and type
                    setIsSeniorPWDActive(false);
                    setSeniorPWDID('');
                    setSeniorPWDType(null);
                  }
                }}
                className={`px-3 py-1 text-sm rounded flex-1 sm:flex-none text-center transition-colors ${
                  isSeniorPWDActive
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSeniorPWDActive 
                  ? `✓ ${seniorPWDType === 'pwd' ? 'PWD' : seniorPWDType === 'senior' ? 'Senior' : 'Senior/PWD'}`
                  : 'Senior/PWD'}
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
              cartItems.map((item) => {
                // Calculate item-level VAT info
                const subtotal = calculateSubtotal();
                const discount = calculateDiscount();
                const itemSubtotal = item.price * item.quantity;
                const itemDiscount = isSeniorPWDActive ? itemSubtotal * (discount / subtotal) : 0;
                
                // Check if item has VAT
                const seniorPWDYN = item.seniorPWDYN === true || item.seniorPWDYN === 'true';
                const isVATExemptYN = item.isVATExemptYN === true || item.isVATExemptYN === 'true';
                const hasVAT = !isVATExemptYN && !(isSeniorPWDActive && seniorPWDYN);
                const itemVAT = hasVAT ? (itemSubtotal - itemDiscount) * 0.12 : 0;
                const itemTotal = itemSubtotal - itemDiscount + itemVAT;
                
                return (
                  <div key={item.id} className="space-y-1">
                    <OrderItem
                      product={{
                        id: item.id,
                        name: item.name
                      }}
                      quantity={item.quantity}
                      price={`₱${itemTotal.toFixed(2)}`}
                      stock={item.stock}
                      onQuantityChange={(newQuantity) => updateQuantity(item.id, newQuantity)}
                      onRemove={() => removeItem(item.id)}
                    />
                    {/* VAT Status Indicator */}
                    <div className="px-3 pb-2 text-xs">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Subtotal: ₱{itemSubtotal.toFixed(2)}</span>
                        {itemDiscount > 0 && (
                          <span className="text-red-500">Disc: -₱{itemDiscount.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        {hasVAT ? (
                          <span className="text-blue-600 font-medium">VAT (12%): ₱{itemVAT.toFixed(2)}</span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            {isSeniorPWDActive && seniorPWDYN ? 'VAT Exempt (Senior/PWD)' : 'VAT Exempt'}
                          </span>
                        )}
                        <span className="font-medium">Total: ₱{itemTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
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
            
            {/* VAT Breakdown Section */}
            <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">VAT Breakdown</div>
              
              {/* VAT Exempt Amount */}
              {calculateVATExempt() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT Exempt Amount</span>
                  <span className="font-medium text-green-600">₱{calculateVATExempt().toFixed(2)}</span>
                </div>
              )}
              
              {/* VAT Amount */}
              {calculateVAT() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (12%)</span>
                  <span className="font-medium text-blue-600">₱{calculateVAT().toFixed(2)}</span>
                </div>
              )}
              
              {/* Show message if no VAT */}
              {calculateVAT() === 0 && calculateVATExempt() === 0 && (
                <div className="text-xs text-gray-500 italic">No VAT applicable</div>
              )}
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
            {selectedPaymentMethod !== 'cash' && (
              <>
            <div className="flex">
              {selectedPaymentMethod && (
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                      {selectedPaymentMethod === 'gcash' ? 'GCASH-' : 'MAYA-'}
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
                      Example: {selectedPaymentMethod === 'gcash' ? 'GCASH-67890' : 'MAYA-54321'}
                </span>
                  </p>
                )}
              </>
            )}
            {selectedPaymentMethod === 'cash' && (
              <p className="text-xs text-gray-500 mt-1">
                Reference number will be generated automatically for cash transactions
              </p>
            )}
          </div>

          {/* Charge Button */}
          <button 
            onClick={handleChargeClick}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={
              !selectedPaymentMethod || 
              (selectedPaymentMethod !== 'cash' && !referenceNumber.trim()) || 
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

      {/* Senior/PWD ID Input Modal */}
      {showSeniorPWDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Senior/PWD Discount</h2>
              <button
                onClick={() => {
                  setShowSeniorPWDModal(false);
                  setSeniorPWDID('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600 font-medium">
                Select discount type:
              </p>
              
              {/* PWD/Senior Selection Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSeniorPWDType('pwd')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    seniorPWDType === 'pwd'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  PWD
                </button>
                <button
                  type="button"
                  onClick={() => setSeniorPWDType('senior')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    seniorPWDType === 'senior'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Senior Citizen
                </button>
              </div>

              {seniorPWDType && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter {seniorPWDType === 'pwd' ? 'PWD' : 'Senior Citizen'} ID:
                    </label>
                    <input
                      type="text"
                      value={seniorPWDID}
                      onChange={(e) => setSeniorPWDID(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfirmSeniorPWD();
                        }
                      }}
                      placeholder={`Enter ${seniorPWDType === 'pwd' ? 'PWD' : 'Senior Citizen'} ID`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This ID will be recorded as <strong>{seniorPWDType.toUpperCase()}-{seniorPWDID || 'XXXXX'}</strong> with the transaction for compliance purposes.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowSeniorPWDModal(false);
                  setSeniorPWDID('');
                  setSeniorPWDType(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSeniorPWD}
                disabled={!seniorPWDType || !seniorPWDID.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Clear Cart</h2>
              <button
                onClick={() => setShowClearCartModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Are you sure you want to clear the cart? This action cannot be undone.
              </p>
              {cartItems.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    This will remove <strong>{cartItems.length}</strong> item{cartItems.length !== 1 ? 's' : ''} from your cart.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowClearCartModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearCart}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear Cart
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
          vatExempt={receiptData.vatExempt}
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