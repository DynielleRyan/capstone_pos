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
      className={`flex-shrink-0 w-24 sm:w-28 rounded-lg shadow-sm p-2 sm:p-2.5 text-center cursor-pointer hover:shadow-md transition-shadow ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-500' 
          : 'bg-white border-2 border-transparent'
      }`}
      onClick={onClick}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${
        isSelected ? 'bg-blue-200' : 'bg-blue-100'
      }`}>
        {icon}
      </div>
      <span className={`text-xs sm:text-sm font-medium line-clamp-2 break-words ${
        isSelected ? 'text-blue-700' : 'text-gray-700'
      }`}>
        {name}
      </span>
    </div>
  );
};

export default CategoryCard;
