/**
 * ============================================================================
 * CATEGORY CARD COMPONENT - CategoryCard.tsx
 * ============================================================================
 * 
 * A reusable component that displays a product category with an icon.
 * Used in the dashboard to filter products by category.
 * 
 * FEATURES:
 * - Displays category name and icon
 * - Visual feedback when selected (blue highlight)
 * - Clickable to filter products by category
 * - Responsive design (smaller on mobile, larger on desktop)
 * 
 * USAGE:
 * <CategoryCard
 *   name="Prescription"
 *   icon={<Pill />}
 *   onClick={() => setSelectedCategory("Prescription")}
 *   isSelected={selectedCategory === "Prescription"}
 * />
 * 
 * STYLING:
 * - Selected state: Blue background with blue border
 * - Unselected state: White background with transparent border
 * - Hover effect: Shadow increases on hover
 */

// Import React for component definition
import React from 'react';

/**
 * ============================================================================
 * PROPS INTERFACE
 * ============================================================================
 * 
 * CategoryCardProps: Defines the props this component accepts
 * 
 * icon: React.ReactNode
 *   - The icon to display (from lucide-react or custom)
 *   - Example: <Pill />, <ShoppingBag />, etc.
 * 
 * name: string
 *   - The category name to display
 *   - Example: "Prescription", "Vitamins", etc.
 * 
 * onClick?: () => void
 *   - Optional callback function when card is clicked
 *   - Used to update the selected category filter
 * 
 * isSelected?: boolean
 *   - Whether this category is currently selected
 *   - Default: false
 *   - When true, card shows blue highlight
 */
interface CategoryCardProps {
  icon: React.ReactNode;      // Icon component to display
  name: string;               // Category name
  onClick?: () => void;       // Click handler (optional)
  isSelected?: boolean;       // Selection state (optional, default: false)
}

/**
 * ============================================================================
 * CATEGORY CARD COMPONENT
 * ============================================================================
 * 
 * Renders a clickable category card with icon and name.
 * 
 * LAYOUT:
 * - Card container (clickable, with hover effect)
 *   - Icon container (centered, colored background)
 *   - Category name (centered text, 2-line clamp)
 * 
 * RESPONSIVE DESIGN:
 * - Mobile (default): w-24 (96px width), smaller padding
 * - Desktop (sm:): w-28 (112px width), larger padding
 * - Icon size: w-8 h-8 (mobile) → w-10 h-10 (desktop)
 * - Text size: text-xs (mobile) → text-sm (desktop)
 */
const CategoryCard: React.FC<CategoryCardProps> = ({ 
  icon,        // Icon component
  name,        // Category name
  onClick,     // Click handler
  isSelected = false  // Selection state (default: false)
}) => {
  return (
    <div 
      /**
       * CARD CONTAINER
       * 
       * Styling:
       * - flex-shrink-0: Prevents card from shrinking in flex container
       * - w-24 sm:w-28: Responsive width (96px mobile, 112px desktop)
       * - rounded-lg: Rounded corners
       * - shadow-sm: Subtle shadow
       * - cursor-pointer: Shows pointer cursor on hover
       * - hover:shadow-md: Increases shadow on hover
       * 
       * Conditional styling based on selection:
       * - Selected: Blue background (bg-blue-50) with blue border
       * - Unselected: White background with transparent border
       */
      className={`flex-shrink-0 w-24 sm:w-28 rounded-lg shadow-sm p-2 sm:p-2.5 text-center cursor-pointer hover:shadow-md transition-shadow ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-500'  // Selected: blue highlight
          : 'bg-white border-2 border-transparent'   // Unselected: white background
      }`}
      onClick={onClick}  // Call onClick handler when clicked
    >
      {/* Icon container - displays the category icon */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${
        isSelected ? 'bg-blue-200' : 'bg-blue-100'  // Icon background color
      }`}>
        {icon}  {/* Render the icon component */}
      </div>
      
      {/* Category name - displays the category text */}
      <span className={`text-xs sm:text-sm font-medium line-clamp-2 break-words ${
        isSelected ? 'text-blue-700' : 'text-gray-700'  // Text color based on selection
      }`}>
        {name}  {/* Render the category name */}
      </span>
    </div>
  );
};

// Export component for use in other files
export default CategoryCard;
