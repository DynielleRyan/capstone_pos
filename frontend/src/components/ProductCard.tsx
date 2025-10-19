import React from 'react';
import { Plus } from 'lucide-react';

// Props interface for ProductCard component
interface ProductCardProps {
  name: string;           // Product name to display
  description: string;    // Product description/generic name
  image?: string;         // Optional product image URL
  onAdd?: () => void;     // Callback function when ADD button is clicked
}

// Product card component - displays product info with add to cart functionality
const ProductCard: React.FC<ProductCardProps> = ({ name, description, image, onAdd }) => {
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
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Product name */}
          <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">{name}</h3>
          
          {/* Product description */}
          <p className="text-sm text-gray-500 line-clamp-3">{description}</p>
        </div>
        
        {/* Add to cart button - always at bottom */}
        <button 
          onClick={onAdd}
          className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-1 hover:bg-blue-700 transition-colors mt-3"
        >
          <Plus className="w-4 h-4" />
          <span>ADD</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
