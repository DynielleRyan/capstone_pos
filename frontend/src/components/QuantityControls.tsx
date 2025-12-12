import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

// Props interface for QuantityControls component
interface QuantityControlsProps {
  quantity: number;                              // Current quantity value
  onChange: (newQuantity: number) => void;      // Callback when quantity changes
  min?: number;                                 // Minimum allowed quantity
  max?: number;                                 // Maximum allowed quantity
}

// Quantity controls component - provides +/- buttons and direct input for quantity adjustment
const QuantityControls: React.FC<QuantityControlsProps> = ({ 
  quantity, 
  onChange, 
  min = 0, 
  max = 999 
}) => {
  // Local state for input value (allows typing while editing)
  const [inputValue, setInputValue] = useState<string>(quantity.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update input value when quantity prop changes (from external updates)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(quantity.toString());
    }
  }, [quantity, isEditing]);

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

  // Handle input change (while typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input while typing
    if (value === '') {
      setInputValue('');
      return;
    }
    // Only allow numbers
    if (/^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  // Handle input blur or Enter key - validate and apply
  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseInt(inputValue, 10);
    
    if (isNaN(numValue) || inputValue === '') {
      // Reset to current quantity if invalid
      setInputValue(quantity.toString());
      return;
    }

    // Clamp value to min/max range
    const clampedValue = Math.max(min, Math.min(max, numValue));
    setInputValue(clampedValue.toString());
    
    // Only update if value changed
    if (clampedValue !== quantity) {
      onChange(clampedValue);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Triggers handleInputBlur
    }
  };

  // Handle input focus
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    // Select all text for easy replacement
    e.currentTarget.select();
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
      
      {/* Quantity input field - allows direct typing */}
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className="w-12 h-6 text-sm font-medium text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        min={min}
        max={max}
      />
      
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
