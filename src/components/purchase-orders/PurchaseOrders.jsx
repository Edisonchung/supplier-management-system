// src/components/purchase-orders/PurchaseOrders.jsx
import React from 'react';
import { FileText, Plus } from 'lucide-react';

const PurchaseOrders = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage client purchase orders</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
          <Plus size={20} />
          Create PO
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Purchase Orders Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage purchase orders from your clients
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;

// src/components/invoices/ClientInvoices.jsx
import React from 'react';
import { DollarSign, Plus } from 'lucide-react';

const ClientInvoices = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Invoices</h1>
          <p className="text-gray-600 mt-1">Track invoices and payments</p>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2">
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Client Invoices Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate and track invoices for your clients
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientInvoices;

// src/components/tracking/DeliveryTracking.jsx
import React from 'react';
import { Truck, MapPin } from 'lucide-react';

const DeliveryTracking = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
          <p className="text-gray-600 mt-1">Track your shipments in real-time</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Delivery Tracking Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Monitor delivery status and track shipments
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTracking;

// src/components/import/QuickImport.jsx
import React from 'react';
import { Upload, FileText } from 'lucide-react';

const QuickImport = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
          <p className="text-gray-600 mt-1">Import data from CSV or Excel files</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Quick Import Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bulk import suppliers, products, and orders
          </p>
          <div className="mt-6">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
              <Upload size={20} />
              Upload File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickImport;

// src/components/users/UserManagement.jsx
import React from 'react';
import { Users, UserPlus } from 'lucide-react';

const UserManagement = ({ showNotification }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and permissions</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">User Management Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add team members and manage their permissions
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
