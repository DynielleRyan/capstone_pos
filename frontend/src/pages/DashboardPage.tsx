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

const DashboardPage = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // The AuthContext will automatically redirect to login via the ProtectedRoute
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <div className="w-full lg:w-80 bg-white shadow-lg flex flex-col lg:flex-col">
        {/* Logo */}
        <div className="p-6 border-b text-center">
          <h1 className="text-2xl font-bold text-blue-600">Jambo's Pharmacy</h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="flex lg:flex-col space-x-4 lg:space-x-0 lg:space-y-2">
            {/* Dashboard - Active */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg flex-1 lg:flex-none justify-center lg:justify-start">
              <Grid3X3 className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">Dashboard</span>
            </div>
            
            {/* History */}
            <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex-1 lg:flex-none justify-center lg:justify-start">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">History</span>
            </div>
          </div>
        </div>

        {/* Logout */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
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

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6">
          {/* Categories Section */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Category</h2>
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-2">
              {/* Category Cards */}
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

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              {/* Product Cards */}
              {[
                { name: "Biogesic", desc: "Paracetamol" },
                { name: "Benadryl", desc: "Antihistamine" },
                { name: "Piattos", desc: "Snack" },
                { name: "Eskinol", desc: "Face Care" },
                { name: "Voltaren", desc: "Pain Relief" },
                { name: "Thomapyrin", desc: "Pain Relief" },
                { name: "Betahistine", desc: "Vertigo" },
                { name: "Saridon", desc: "Headache" },
                { name: "KoolFever", desc: "Fever Patch" },
                { name: "Salonpas", desc: "Pain Relief" }
              ].map((product, index) => (
                <ProductCard
                  key={index}
                  name={product.name}
                  description={product.desc}
                  onAdd={() => console.log(`Added ${product.name} to cart`)}
                />
              ))}
            </div>

            {/* Pagination */}
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
              <button className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded flex-1 sm:flex-none text-center">Clear</button>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Order Items */}
            {[
              {
                product: {
                  id: "1",
                  name: "Biogesic 25Mg Capsule",
                  discounts: ["Senior/PWD Discount", "VAT Exemption"]
                },
                quantity: 10,
                price: "₱77.50",
                discount: "- ₱15.50"
              },
              {
                product: {
                  id: "2",
                  name: "Benadryl Syrup",
                  discounts: ["Senior/PWD Discount", "VAT Exemption"]
                },
                quantity: 5,
                price: "₱125.00",
                discount: "- ₱25.00"
              }
            ].map((item) => (
              <OrderItem
                key={item.product.id}
                product={item.product}
                quantity={item.quantity}
                price={item.price}
                discount={item.discount}
                onQuantityChange={(newQuantity) => console.log(`Updated quantity to ${newQuantity}`)}
              />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₱1,868.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-red-500">₱253.50</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT</span>
              <span className="font-medium">₱27.96</span>
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
              <span className="text-lg font-bold">₱1,642.46</span>
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
            Charge ₱1,642.46
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;