import React from 'react';
import QuantityControls from './QuantityControls';

// Props interface for OrderItem component
interface OrderItemProps {
  product: {
    id: string;              // Product ID
    name: string;            // Product name
    image?: string;          // Optional product image
    discounts?: string[];    // Applied discounts
  };
  quantity: number;          // Current quantity in cart
  price: string;            // Formatted price string
  discount?: string;        // Formatted discount amount
  stock?: number;           // Available stock
  onQuantityChange: (newQuantity: number) => void; // Quantity change callback
  onRemove?: () => void;    // Optional remove callback
}

// Order item component - displays cart item with quantity controls and pricing
const OrderItem: React.FC<OrderItemProps> = ({ 
  product, 
  quantity, 
  price, 
  discount,
  stock,
  onQuantityChange
}) => {
  const availableStock = stock || 0;
  
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      {/* Product image */}
      <div className="w-12 h-12 bg-gray-200 rounded">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded"></div>
        )}
      </div>
      
      {/* Product details */}
      <div className="flex-1">
        {/* Product name */}
        <h4 className="font-medium text-sm text-gray-800">{product.name}</h4>
        
        {/* Applied discounts */}
        {product.discounts && product.discounts.length > 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            {product.discounts.map((discount, index) => (
              <div key={index}>{discount}</div>
            ))}
          </div>
        )}
        
        {/* Quantity controls and pricing */}
        <div className="flex items-center justify-between mt-2">
          <QuantityControls 
            quantity={quantity} 
            onChange={onQuantityChange}
            min={0}
            max={availableStock}
          />
          <div className="text-right">
            <div className="text-sm font-medium">{price}</div>
            {discount && <div className="text-xs text-red-500">{discount}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderItem;
