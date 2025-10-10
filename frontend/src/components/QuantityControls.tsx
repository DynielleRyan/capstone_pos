import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface QuantityControlsProps {
  quantity: number;
  onChange: (newQuantity: number) => void;
  min?: number;
  max?: number;
}

const QuantityControls: React.FC<QuantityControlsProps> = ({ 
  quantity, 
  onChange, 
  min = 0, 
  max = 999 
}) => {
  const handleDecrease = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={handleDecrease}
        disabled={quantity <= min}
        className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="text-sm font-medium min-w-[2rem] text-center">{quantity}</span>
      <button 
        onClick={handleIncrease}
        disabled={quantity >= max}
        className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};

export default QuantityControls;
