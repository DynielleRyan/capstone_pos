import React from 'react';
import { Plus } from 'lucide-react';

// Props interface for ProductCard component
interface ProductCardProps {
  name: string;           // Product name to display
  description: string;    // Product description/generic name
  image?: string;         // Optional product image URL
  stock?: number;         // Available stock
  onAdd?: () => void;     // Callback function when ADD button is clicked
}

// Product card component - displays product info with add to cart functionality
const ProductCard: React.FC<ProductCardProps> = ({ name, description, image, stock, onAdd }) => {
  const availableStock = stock || 0;
  const isOutOfStock = availableStock <= 0;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow h-64 flex flex-col">
      {/* Product image container */}
      <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-3 flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg"></div>
        )}
      </div>
      
      {/* Product info section - grows to fill available space */}
      <div className="flex-1 flex flex-col justify-between min-h-0">
        <div className="flex-shrink-0">
          {/* Product name - fixed height with line clamp */}
          <h3 className="font-medium text-gray-800 mb-1 line-clamp-2 h-10 leading-5">{name}</h3>
          
          {/* Product description - fixed height with line clamp */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10 leading-5">{description}</p>
          
          {/* Stock display - fixed height */}
          <div className="h-5 flex items-center justify-center mb-2">
            <span className={`text-xs font-medium ${
              isOutOfStock 
                ? 'text-red-600' 
                : availableStock < 10 
                  ? 'text-orange-600' 
                  : 'text-green-600'
            }`}>
              Stock: {availableStock}
            </span>
          </div>
        </div>
        
        {/* Add to cart button - always at bottom */}
        <button 
          onClick={onAdd}
          disabled={isOutOfStock}
          className={`w-full py-2 rounded-lg flex items-center justify-center space-x-1 transition-colors flex-shrink-0 ${
            isOutOfStock
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isOutOfStock ? 'OUT OF STOCK' : 'ADD'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
