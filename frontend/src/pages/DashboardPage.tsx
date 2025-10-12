import { useState, useEffect } from 'react'; // Add useEffect
import { 
  Grid3X3, 
  Clock, 
  LogOut, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  ShoppingCart
} from 'lucide-react';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import OrderItem from '../components/OrderItem';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api'; // Add this import

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
  const { signOut } = useAuth();
  
  // Add state for products and cart
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Add function to clear cart
  const clearCart = () => {
    setCartItems([]);
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
            
            <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex-1 lg:flex-none justify-center lg:justify-start">
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
          <div className="text-sm text-gray-500 mt-2 text-center">10:53 AM</div>
        </div>
      </div>

      {/* Main Content Area - same as before */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - same as before */}
        <div className="bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search"
              className="w-full sm:w-80 pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-gray-700 font-medium hidden sm:block">Jemsey Amonsot</span>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6">
          {/* Categories Section - same as before */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Category</h2>
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-2">
              {[
                { name: "Vitamins", icon: <div className="w-6 h-6 bg-blue-600 rounded"></div> },
                { name: "Food", icon: <div className="w-6 h-6 bg-blue-600 rounded"></div> },
                { name: "Milk", icon: <div className="w-6 h-6 bg-blue-600 rounded"></div> },
                { name: "Baby Care", icon: <div className="w-6 h-6 bg-blue-600 rounded"></div> },
                { name: "Personal Care", icon: <div className="w-6 h-6 bg-blue-600 rounded"></div> }
              ].map((category, index) => (
                <CategoryCard
                  key={index}
                  name={category.name}
                  icon={category.icon}
                  onClick={() => console.log(`Selected category: ${category.name}`)}
                />
              ))}
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Products</h2>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 sm:flex-none justify-center">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">Filter</span>
                </button>
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
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <p>No products found</p>
                    <p className="text-sm">Add products to your database to see them here</p>
                  </div>
                ) : (
                  products.map((product) => (
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

            {/* Pagination - same as before */}
            <div className="flex justify-center space-x-2">
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">‹</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">2</button>
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">3</button>
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">›</button>
            </div>
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cash Received</span>
              <input type="text" placeholder="₱0" className="w-20 text-right border-none bg-transparent" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Change</span>
              <input type="text" placeholder="₱0" className="w-20 text-right border-none bg-transparent" />
            </div>
          </div>

          <div className="border-t pt-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button className="py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm">Cash</button>
            <button className="py-2 bg-blue-600 text-white rounded text-sm">Gcash</button>
            <button className="py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm">Maya</button>
          </div>

          {/* Reference Number */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="REF NO."
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* Charge Button */}
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">
            Charge ₱{calculateTotal().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;