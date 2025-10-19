import React from 'react';
import { Plus, Minus } from 'lucide-react';

// Props interface for QuantityControls component
interface QuantityControlsProps {
  quantity: number;                              // Current quantity value
  onChange: (newQuantity: number) => void;      // Callback when quantity changes
  min?: number;                                 // Minimum allowed quantity
  max?: number;                                 // Maximum allowed quantity
}

// Quantity controls component - provides +/- buttons for quantity adjustment
const QuantityControls: React.FC<QuantityControlsProps> = ({ 
  quantity, 
  onChange, 
  min = 0, 
  max = 999 
}) => {
  // Handle decrease button click
  const handleDecrease = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  // Handle increase button click
  const handleIncrease = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Decrease button */}
      <button 
        onClick={handleDecrease}
        disabled={quantity <= min}
        className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      {/* Current quantity display */}
      <span className="text-sm font-medium min-w-[2rem] text-center">{quantity}</span>
      
      {/* Increase button */}
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
