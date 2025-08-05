// src/components/suppliers/SupplierCard.jsx
// Enhanced SupplierCard with Dark Mode Support - All existing features preserved
import React from 'react';
import { Mail, Phone, MapPin, User, Calendar, Edit, Trash2 } from 'lucide-react';

// Import the enhanced dark mode system
import { useDarkMode } from '../../hooks/useDarkMode';
import { themeClasses, useThemeClasses, getThemeClasses } from '../../utils/theme';

const SupplierCard = ({ supplier, onEdit, onDelete, canEdit }) => {
  // Enhanced dark mode integration
  const { isDarkMode, themeVariant, highContrast } = useDarkMode();
  
  // Memoized theme classes for performance
  const cardClasses = useThemeClasses('card', 'hover');
  const textPrimaryClasses = useThemeClasses('text', 'primary');
  const textSecondaryClasses = useThemeClasses('text', 'secondary');
  const buttonSecondaryClasses = useThemeClasses('button', 'secondary');

  // Enhanced theme-aware status color function
  const getStatusColor = (status) => {
    const baseClasses = 'inline-block px-2 py-1 text-xs font-medium rounded-full border';
    
    if (isDarkMode) {
      switch (status) {
        case 'active':
          return `${baseClasses} bg-green-900/30 text-green-400 border-green-700/50`;
        case 'pending':
          return `${baseClasses} bg-yellow-900/30 text-yellow-400 border-yellow-700/50`;
        case 'inactive':
          return `${baseClasses} bg-gray-800/30 text-gray-400 border-gray-600/50`;
        default:
          return `${baseClasses} bg-gray-800/30 text-gray-400 border-gray-600/50`;
      }
    }
    
    // Light mode colors (preserved exactly as before)
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
    }
  };

  // Enhanced theme-aware button classes
  const getEditButtonClasses = () => {
    if (isDarkMode) {
      return 'flex-1 bg-gray-800/50 text-gray-300 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-1 border border-gray-700/50';
    }
    return 'flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1';
  };

  const getDeleteButtonClasses = () => {
    if (isDarkMode) {
      return 'bg-red-900/30 text-red-400 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-900/50 transition-colors flex items-center justify-center border border-red-700/50';
    }
    return 'bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center';
  };

  // Enhanced theme-aware icon color
  const getIconColor = () => {
    return isDarkMode ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400';
  };

  return (
    <div className={`${cardClasses} p-6 transition-all duration-200`}>
      {/* Enhanced Header with Dark Mode */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-semibold text-lg ${textPrimaryClasses}`}>
            {supplier.name}
          </h3>
          <span className={`mt-2 ${getStatusColor(supplier.status)}`}>
            {supplier.status}
          </span>
        </div>
      </div>

      {/* Enhanced Contact Details with Dark Mode */}
      <div className={`space-y-2 text-sm ${textSecondaryClasses} mb-4`}>
        <div className="flex items-center gap-2">
          <Mail size={14} className={getIconColor()} />
          <span className="truncate">{supplier.email}</span>
        </div>
        
        {supplier.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className={getIconColor()} />
            <span>{supplier.phone}</span>
          </div>
        )}
        
        {supplier.contactPerson && (
          <div className="flex items-center gap-2">
            <User size={14} className={getIconColor()} />
            <span>{supplier.contactPerson}</span>
          </div>
        )}
        
        {supplier.address && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className={getIconColor()} />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Calendar size={14} className={getIconColor()} />
          <span>Added: {new Date(supplier.dateAdded).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Enhanced Actions with Dark Mode */}
      {canEdit && (
        <div className={`flex gap-2 pt-4 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <button
            onClick={onEdit}
            className={getEditButtonClasses()}
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className={getDeleteButtonClasses()}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierCard;
