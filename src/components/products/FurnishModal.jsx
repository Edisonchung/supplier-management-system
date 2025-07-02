// src/components/products/FurnishModal.jsx
import React, { useState } from 'react';
import { X, Package, Calendar, User, FileText, MapPin } from 'lucide-react';

const FurnishModal = ({ product, onFurnish, onClose }) => {
  const [formData, setFormData] = useState({
    furnishDate: new Date().toISOString().split('T')[0],
    client: '',
    project: '',
    location: '',
    installedBy: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.client.trim()) {
      newErrors.client = 'Client name is required';
    }
    
    if (!formData.project.trim()) {
      newErrors.project = 'Project name is required';
    }
    
    if (!formData.furnishDate) {
      newErrors.furnishDate = 'Furnish date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    onFurnish(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Furnish Product</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {product.brand} • SKU: {product.sku || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => handleChange('client', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.client ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Client name"
              />
              {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => handleChange('project', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.project ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Project name"
              />
              {errors.project && <p className="text-red-500 text-xs mt-1">{errors.project}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Installation location"
                />
              </div>
            </div>

            {/* Furnish Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Furnish Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={formData.furnishDate}
                  onChange={(e) => handleChange('furnishDate', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.furnishDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.furnishDate && <p className="text-red-500 text-xs mt-1">{errors.furnishDate}</p>}
            </div>

            {/* Installed By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installed By
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.installedBy}
                  onChange={(e) => handleChange('installedBy', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Technician name"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows="3"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Furnished
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FurnishModal;
