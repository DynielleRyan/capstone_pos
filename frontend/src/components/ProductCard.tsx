import React from 'react';
import { Plus, ShieldCheck, UserCheck } from 'lucide-react';

// Props interface for ProductCard component
interface ProductCardProps {
  name: string;           // Product name to display
  description: string;    // Product description/generic name
  image?: string;         // Optional product image URL
  stock?: number;         // Available stock
  sellingPrice: number;   // Base selling price
  isVATExempt: boolean;  // Whether product is VAT exempt
  isSeniorPWDEligible?: boolean;  // Whether product qualifies for Senior/PWD discount
  onAdd?: () => void;     // Callback function when ADD button is clicked
}

// Product card component - displays product info with add to cart functionality
const ProductCard: React.FC<ProductCardProps> = ({ 
  name, 
  image, 
  stock, 
  sellingPrice,
  isVATExempt,
  isSeniorPWDEligible = false,
  onAdd 
}) => {
  const availableStock = stock || 0;
  const isOutOfStock = availableStock <= 0;
  
  // Calculate customer price: sellingPrice + VAT (if not exempt)
  // VAT is 12% of selling price, added on top
  const vatAmount = isVATExempt ? 0 : sellingPrice * 0.12;
  const customerPrice = sellingPrice + vatAmount;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col h-full min-h-0" style={{ padding: 'calc(0.625rem * 1.12)' }}>
      {/* Product image container - shorter */}
      <div className="w-full bg-gray-100 rounded-lg mb-1.5 overflow-hidden flex-shrink-0" style={{ aspectRatio: '4 / 3.36' }}>
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
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-xs leading-tight flex-shrink-0" style={{ height: 'calc(2rem * 1.12)', marginBottom: 'calc(0.125rem * 1.12)' }}>
            {name}
          </h3>
          
          {/* Price and Badges - combined with stock */}
          <div className="flex-shrink-0" style={{ marginBottom: 'calc(0.25rem * 1.12)' }}>
            <div className="flex items-start justify-between gap-1 mb-0.5 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-sm font-bold text-blue-600 truncate">
                  ₱{customerPrice.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isSeniorPWDEligible && (
                  <div className="flex items-center justify-center bg-orange-100 text-orange-700 rounded-full" style={{ width: '20px', height: '20px' }} title="Eligible for Senior / PWD Discount (20%)">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                )}
                {isVATExempt && (
                  <div className="flex items-center justify-center bg-green-100 text-green-700 rounded-full" style={{ width: '20px', height: '20px' }} title="VAT Exempt">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
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
          className={`w-full rounded-lg flex items-center justify-center space-x-1 transition-colors flex-shrink-0 font-medium text-xs ${
            isOutOfStock
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
          style={{ paddingTop: 'calc(0.25rem * 1.12)', paddingBottom: 'calc(0.25rem * 1.12)' }}
        >
          <Plus className="w-3 h-3" />
          <span>{isOutOfStock ? 'OUT OF STOCK' : 'ADD'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
