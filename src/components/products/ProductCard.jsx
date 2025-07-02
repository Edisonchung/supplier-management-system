// src/components/products/ProductCard.jsx
import React from 'react';
import { 
  Package, DollarSign, Layers, Tag, Building2, 
  Edit, Trash2, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

const ProductCard = ({ product, supplier, onEdit, onDelete, onFurnish, canEdit }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'furnished': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    // You can customize icons for different categories
    return <Tag size={14} />;
  };

  const isLowStock = product.stock <= product.minStock;
  const isOutOfStock = product.stock === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{product.name}</h3>
          {product.brand && (
            <p className="text-sm text-gray-600 mt-1">{product.brand}</p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(product.status)}`}>
          {product.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        {product.sku && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">SKU</span>
            <span className="font-medium">{product.sku}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Category</span>
          <span className="flex items-center gap-1 capitalize">
            {getCategoryIcon(product.category)}
            {product.category}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Price</span>
          <span className="font-bold text-gray-900">${product.price}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Stock</span>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${
              isOutOfStock ? 'text-red-600' :
              isLowStock ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {product.stock}
            </span>
            <span className="text-gray-400">/ {product.minStock}</span>
            {isLowStock && !isOutOfStock && (
              <AlertCircle size={16} className="text-orange-500" />
            )}
          </div>
        </div>

        {supplier && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Supplier</span>
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <Building2 size={14} className="text-gray-400" />
              {supplier.name}
            </span>
          </div>
        )}
      </div>

      {/* Stock Alert */}
      {isOutOfStock && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-800 font-medium">Out of Stock</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={onEdit}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
        >
          <Edit size={16} />
          Edit
        </button>
        
        {canEdit && product.status === 'complete' && (
          <button
            onClick={onFurnish}
            className="bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center justify-center"
            title="Mark as Furnished"
          >
            <CheckCircle size={16} />
          </button>
        )}
        
        {canEdit && (
          <button
            onClick={onDelete}
            className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
