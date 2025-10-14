import React from 'react';

interface CategoryCardProps {
  icon: React.ReactNode;
  name: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ icon, name, onClick, isSelected = false }) => {
  return (
    <div 
      className={`flex-shrink-0 w-28 sm:w-32 rounded-lg shadow-sm p-3 sm:p-4 text-center cursor-pointer hover:shadow-md transition-shadow ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-500' 
          : 'bg-white border-2 border-transparent'
      }`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
        isSelected ? 'bg-blue-200' : 'bg-blue-100'
      }`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${
        isSelected ? 'text-blue-700' : 'text-gray-700'
      }`}>
        {name}
      </span>
    </div>
  );
};

export default CategoryCard;
