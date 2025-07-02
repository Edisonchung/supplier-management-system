// src/components/suppliers/SupplierCard.jsx
import React from 'react';
import { Mail, Phone, MapPin, User, Calendar, Edit, Trash2 } from 'lucide-react';

const SupplierCard = ({ supplier, onEdit, onDelete, canEdit }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{supplier.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border mt-2 ${getStatusColor(supplier.status)}`}>
            {supplier.status}
          </span>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-gray-400" />
          <span className="truncate">{supplier.email}</span>
        </div>
        
        {supplier.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-gray-400" />
            <span>{supplier.phone}</span>
          </div>
        )}
        
        {supplier.contactPerson && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span>{supplier.contactPerson}</span>
          </div>
        )}
        
        {supplier.address && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span>Added: {new Date(supplier.dateAdded).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={onEdit}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierCard;
