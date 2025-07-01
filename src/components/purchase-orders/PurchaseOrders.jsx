import { useState, useEffect } from 'react';
import { FileText, Search, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { mockFirebase } from '../../services/firebase';
import { STATUS_OPTIONS } from '../../utils/constants';

const PurchaseOrders = ({ showNotification }) => {
  const permissions = usePermissions();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPOs, setFilteredPOs] = useState([]);

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useEffect(() => {
    filterPOs();
  }, [purchaseOrders, searchTerm]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const snapshot = await mockFirebase.firestore.collection('purchaseOrders').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchaseOrders(data);
    } catch (error) {
      showNotification('Error loading purchase orders', 'error');
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPOs = () => {
    let filtered = purchaseOrders;
    if (searchTerm) {
      filtered = filtered.filter(po =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredPOs(filtered);
  };

  if (!permissions.canViewPOs) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view purchase orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        {permissions.canEditPOs && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus size={20} />
            New Purchase Order
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search purchase orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Purchase Orders Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPOs.map((po) => (
            <div key={po.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{po.poNumber}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  po.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                  po.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  po.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {STATUS_OPTIONS.PURCHASE_ORDER.find(s => s.value === po.status)?.label || po.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div><span className="font-medium">Client:</span> {po.client}</div>
                <div><span className="font-medium">Supplier:</span> {po.supplier}</div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span>${po.totalAmount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Delivery: {new Date(po.deliveryDate).toLocaleDateString()}</span>
                </div>
                <div><span className="font-medium">Items:</span> {po.items?.length || 0}</div>
              </div>

              {permissions.canEditPOs && (
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                    <Edit size={16} />
                    Edit
                  </button>
                  <button className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPOs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No purchase orders found' : 'No purchase orders yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Create your first purchase order to get started.'}
          </p>
          {permissions.canEditPOs && !searchTerm && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              New Purchase Order
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
