import React from 'react';
import QuantityControls from './QuantityControls';

interface OrderItemProps {
  product: {
    id: string;
    name: string;
    image?: string;
    discounts?: string[];
  };
  quantity: number;
  price: string;
  discount?: string;
  onQuantityChange: (newQuantity: number) => void;
  onRemove?: () => void;
}

const OrderItem: React.FC<OrderItemProps> = ({ 
  product, 
  quantity, 
  price, 
  discount, 
  onQuantityChange,
  onRemove 
}) => {
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-12 h-12 bg-gray-200 rounded">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded"></div>
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-sm text-gray-800">{product.name}</h4>
        {product.discounts && product.discounts.length > 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            {product.discounts.map((discount, index) => (
              <div key={index}>{discount}</div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <QuantityControls 
            quantity={quantity} 
            onChange={onQuantityChange}
            min={0}
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
