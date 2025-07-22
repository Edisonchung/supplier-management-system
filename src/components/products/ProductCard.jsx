// src/components/products/ProductCard.jsx
import React from 'react';
import { 
  Package, DollarSign, Layers, Tag, Building2, 
  Edit, Trash2, CheckCircle, AlertCircle, Clock, FileText
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

  // NEW: Documentation status functions
  const getDocumentationStatus = () => {
    // Check if product has documents structure
    if (!product.documents || !product.documents.metadata) {
      return {
        completeness: 'incomplete',
        totalDocuments: 0,
        publicDocuments: 0
      };
    }
    
    return {
      completeness: product.documents.metadata.completeness || 'incomplete',
      totalDocuments: product.documents.metadata.totalDocuments || 0,
      publicDocuments: product.documents.metadata.publicDocuments || 0
    };
  };

  const getDocStatusColor = (completeness) => {
    switch (completeness) {
      case 'complete': return 'text-green-600 bg-green-100 border-green-200';
      case 'basic': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-red-600 bg-red-100 border-red-200';
    }
  };

  const getDocStatusIcon = (completeness) => {
    switch (completeness) {
      case 'complete': return <CheckCircle size={12} className="text-green-600" />;
      case 'basic': return <Clock size={12} className="text-yellow-600" />;
      default: return <AlertCircle size={12} className="text-red-600" />;
    }
  };

  const isLowStock = product.stock <= product.minStock;
  const isOutOfStock = product.stock === 0;
  const docStatus = getDocumentationStatus();

  // NEW: Handle edit with tab parameter
  const handleEdit = (tab = 'basic') => {
    onEdit(product, tab);
  };

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

      {/* NEW: Documentation Status Section */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {getDocStatusIcon(docStatus.completeness)}
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getDocStatusColor(docStatus.completeness)}`}>
                {docStatus.completeness}
              </span>
            </div>
          </div>
        </div>
        
        {/* Document counts */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{docStatus.totalDocuments} total docs</span>
          <span>{docStatus.publicDocuments} customer-ready</span>
        </div>
        
        {/* Documentation completion hint */}
        {docStatus.completeness === 'incomplete' && (
          <div className="mt-2 text-xs text-gray-600">
            <span className="text-orange-600">⚠</span> Missing product documentation
          </div>
        )}
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
            {product.category?.replace('_', ' ')}
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
          onClick={() => handleEdit('basic')}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
        >
          <Edit size={16} />
          Edit
        </button>
        
        {/* NEW: Documents button */}
        <button
          onClick={() => handleEdit('documents')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
            docStatus.completeness === 'complete' 
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : docStatus.completeness === 'basic'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          title={`Manage Documents (${docStatus.completeness})`}
        >
          <FileText size={16} />
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

      {/* NEW: Quick Actions Hint */}
      {docStatus.completeness !== 'complete' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => handleEdit('documents')}
            className="w-full text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            + Add product documentation to improve customer experience
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
