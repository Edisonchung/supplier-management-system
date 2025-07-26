// src/components/supplier-matching/ManualMatchingInterface.jsx
// 🔧 React 19 Compatible - Using HTML5 Drag & Drop API with Lucide Icons
import React, { useState } from 'react';
import { 
  X,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const ManualMatchingInterface = ({ 
  unmatchedItems, 
  suppliers, 
  products, 
  onSaveManualMatch,
  onClose 
}) => {
  const [manualMatches, setManualMatches] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverProduct, setDragOverProduct] = useState(null);

  // Filter products based on search and supplier
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = selectedSupplier === 'all' || product.supplierId === selectedSupplier;
    return matchesSearch && matchesSupplier;
  });

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverProduct(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, productId) => {
    e.preventDefault();
    setDragOverProduct(productId);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverProduct(null);
    }
  };

  const handleDrop = (e, productId) => {
    e.preventDefault();
    setDragOverProduct(null);
    
    try {
      const itemData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const product = products.find(p => p.id === productId);
      
      if (product && itemData) {
        setManualMatches(prev => ({
          ...prev,
          [itemData.id || itemData.itemNumber]: {
            poItem: itemData,
            product,
            matchType: 'manual',
            confidence: 100,
            matchedAt: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  };

  const removeMatch = (poItemId) => {
    setManualMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[poItemId];
      return newMatches;
    });
  };

  const saveAllMatches = () => {
    Object.values(manualMatches).forEach(match => {
      onSaveManualMatch(match);
    });
    onClose();
  };

  const getUnmatchedItems = () => {
    return unmatchedItems.filter(item => !manualMatches[item.id || item.itemNumber]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ✋ Manual Product Matching
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Drag PO items to matching products. {Object.keys(manualMatches).length} matches created.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-8rem)]">
          {/* Left Panel - Unmatched PO Items */}
          <div className="w-1/3 border-r border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                🔍 Unmatched PO Items ({getUnmatchedItems().length})
              </h3>
              <p className="text-xs text-gray-600">
                Drag these items to matching products →
              </p>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto h-full">
              {getUnmatchedItems().map((item, index) => (
                <div
                  key={item.id || item.itemNumber}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 bg-white rounded-lg border-2 cursor-move transition-all hover:border-blue-300 ${
                    draggedItem?.id === item.id || draggedItem?.itemNumber === item.itemNumber
                      ? 'border-blue-400 shadow-lg transform rotate-1' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {item.productCode || 'No Code'}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-3">
                    {item.productName}
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-500">Qty: {item.quantity}</span>
                    <span className="font-medium text-gray-700">
                      ${item.unitPrice}
                    </span>
                  </div>
                  
                  {/* Drag Handle Indicator */}
                  <div className="flex justify-center mt-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel - Available Products */}
          <div className="w-1/2 flex flex-col">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex space-x-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-600">
                {filteredProducts.length} products available • Drop PO items here to match
              </p>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map(product => {
                  const supplier = suppliers.find(s => s.id === product.supplierId);
                  const isDropTarget = dragOverProduct === product.id;
                  
                  return (
                    <div
                      key={product.id}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, product.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, product.id)}
                      className={`p-4 bg-white border-2 rounded-lg transition-all ${
                        isDropTarget
                          ? 'border-green-400 bg-green-50 scale-105 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {product.code || product.name}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            {product.name}
                          </div>
                          <div className="text-xs text-blue-600">
                            {supplier?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm text-gray-900">
                            ${product.price}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.leadTime || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {isDropTarget && draggedItem && (
                        <div className="text-center py-2 text-sm text-green-600 font-medium border-2 border-dashed border-green-300 rounded bg-green-100">
                          Drop "{draggedItem.productCode || 'Item'}" here to match
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Created Matches */}
          <div className="w-1/3 border-l border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                ✅ Created Matches ({Object.keys(manualMatches).length})
              </h3>
              <p className="text-xs text-gray-600">
                Review and confirm your matches
              </p>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto h-full">
              {Object.values(manualMatches).map(match => (
                <div
                  key={match.poItem.id || match.poItem.itemNumber}
                  className="p-3 bg-white rounded-lg border border-green-200 bg-green-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <button
                      onClick={() => removeMatch(match.poItem.id || match.poItem.itemNumber)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* PO Item */}
                  <div className="mb-3 p-2 bg-blue-50 rounded">
                    <div className="text-xs font-medium text-blue-800 mb-1">PO Item:</div>
                    <div className="text-xs text-blue-700">
                      {match.poItem.productCode || 'No Code'}
                    </div>
                    <div className="text-xs text-blue-600 line-clamp-2">
                      {match.poItem.productName}
                    </div>
                  </div>
                  
                  {/* Matched Product */}
                  <div className="p-2 bg-white rounded">
                    <div className="text-xs font-medium text-gray-700 mb-1">Matched to:</div>
                    <div className="text-xs font-medium text-gray-900">
                      {match.product.code}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {match.product.name}
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs">
                      <span className="text-gray-500">
                        {suppliers.find(s => s.id === match.product.supplierId)?.name}
                      </span>
                      <span className="font-medium">${match.product.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {Object.keys(manualMatches).length} matches created • 
              These will be saved and used to improve AI matching
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAllMatches}
                disabled={Object.keys(manualMatches).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save {Object.keys(manualMatches).length} Matches
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualMatchingInterface;
