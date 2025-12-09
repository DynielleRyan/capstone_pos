import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';

// Props interface for ProductCard component
interface ProductCardProps {
  name: string;           // Product name to display
  description: string;    // Product description/generic name
  image?: string;         // Optional product image URL
  stock?: number;         // Available stock
  sellingPrice: number;   // Base selling price
  isVATExempt: boolean;  // Whether product is VAT exempt
  onAdd?: () => void;     // Callback function when ADD button is clicked
}

// Product card component - displays product info with add to cart functionality
const ProductCard: React.FC<ProductCardProps> = ({ 
  name, 
  description, 
  image, 
  stock, 
  sellingPrice,
  isVATExempt,
  onAdd 
}) => {
  const availableStock = stock || 0;
  const isOutOfStock = availableStock <= 0;
  
  // Calculate customer price: sellingPrice + VAT (if not exempt)
  // VAT is 12% of selling price, added on top
  const vatAmount = isVATExempt ? 0 : sellingPrice * 0.12;
  const customerPrice = sellingPrice + vatAmount;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all flex flex-col h-full min-h-0">
      {/* Product image container - shorter */}
      <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg mb-1.5 overflow-hidden flex-shrink-0">
        {image && !image.includes('via.placeholder.com') ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-[10px] text-gray-400">No Image</span>
          </div>
        )}
      </div>
      
      {/* Product info section */}
      <div className="flex-1 flex flex-col min-h-0 justify-between">
        <div className="flex-shrink-0">
          {/* Product name */}
          <h3 className="font-semibold text-gray-900 mb-0.5 line-clamp-2 text-xs leading-tight h-[2rem] flex-shrink-0">
            {name}
          </h3>
          
          {/* Price and VAT Exempt Badge - combined with stock */}
          <div className="mb-1 flex-shrink-0">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-600">
                  ₱{customerPrice.toFixed(2)}
                </div>
              </div>
              {isVATExempt && (
                <div className="flex items-center space-x-0.5 bg-green-100 text-green-700 px-1 py-0.5 rounded-full flex-shrink-0">
                  <ShieldCheck className="w-2 h-2 flex-shrink-0" />
                  <span className="text-[9px] font-medium whitespace-nowrap">VAT Exempt</span>
                </div>
              )}
            </div>
            {/* Stock display - inline with price area */}
            <span className={`text-[9px] font-medium ${
              isOutOfStock 
                ? 'text-red-600' 
                : availableStock < 10 
                  ? 'text-orange-600' 
                  : 'text-green-600'
            }`}>
              {isOutOfStock ? 'Out of Stock' : `Stock: ${availableStock}`}
            </span>
          </div>
        </div>
        
        {/* Add to cart button */}
        <button 
          onClick={onAdd}
          disabled={isOutOfStock}
          className={`w-full py-1 rounded-lg flex items-center justify-center space-x-1 transition-colors flex-shrink-0 font-medium text-xs ${
            isOutOfStock
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>{isOutOfStock ? 'OUT OF STOCK' : 'ADD'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
