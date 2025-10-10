import React from 'react';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  name: string;
  description: string;
  image?: string;
  onAdd?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, description, image, onAdd }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow">
      <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-3">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg"></div>
        )}
      </div>
      <h3 className="font-medium text-gray-800 mb-1">{name}</h3>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <button 
        onClick={onAdd}
        className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-1 hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>ADD</span>
      </button>
    </div>
  );
};

export default ProductCard;
