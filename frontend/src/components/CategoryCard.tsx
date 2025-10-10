import React from 'react';

interface CategoryCardProps {
  icon: React.ReactNode;
  name: string;
  onClick?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ icon, name, onClick }) => {
  return (
    <div 
      className="flex-shrink-0 w-28 sm:w-32 bg-white rounded-lg shadow-sm p-3 sm:p-4 text-center cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
  );
};

export default CategoryCard;
