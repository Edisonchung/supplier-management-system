// src/components/products/Products.jsx
import React from 'react';
import { Package } from 'lucide-react';

const Products = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Products Module</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Products;
