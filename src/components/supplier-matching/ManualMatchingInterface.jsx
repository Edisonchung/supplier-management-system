// src/components/supplier-matching/ManualMatchingInterface.jsx
import React, { useState, useRef } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable 
} from 'react-beautiful-dnd';
import { 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

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

  // Filter products based on search and supplier
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = selectedSupplier === 'all' || product.supplierId === selectedSupplier;
    return matchesSearch && matchesSupplier;
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;

    // If dropped on a product
    if (destination.droppableId.startsWith('product-')) {
      const productId = destination.droppableId.replace('product-', '');
      const product = products.find(p => p.id === productId);
      const poItem = unmatchedItems.find(item => item.id === draggableId);
      
      if (product && poItem) {
        setManualMatches(prev => ({
          ...prev,
          [poItem.id]: {
            poItem,
            product,
            matchType: 'manual',
            confidence: 100,
            matchedAt: new Date().toISOString()
          }
        }));
      }
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
    return unmatchedItems.filter(item => !manualMatches[item.id]);
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
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-8rem)]">
          <DragDropContext onDragEnd={handleDragEnd}>
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
              
              <Droppable droppableId="unmatched-items" type="PO_ITEM">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-4 space-y-3 overflow-y-auto h-full"
                  >
                    {getUnmatchedItems().map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 bg-white rounded-lg border-2 cursor-move transition-all ${
                              snapshot.isDragging 
                                ? 'border-blue-400 shadow-lg rotate-2' 
                                : 'border-gray-200 hover:border-gray-300'
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
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Center Panel - Available Products */}
            <div className="w-1/2 flex flex-col">
              {/* Search and Filter */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex space-x-3 mb-3">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                    return (
                      <Droppable
                        key={product.id}
                        droppableId={`product-${product.id}`}
                        type="PO_ITEM"
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-4 bg-white border-2 rounded-lg transition-all ${
                              snapshot.isDraggingOver
                                ? 'border-green-400 bg-green-50'
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
                            
                            {snapshot.isDraggingOver && (
                              <div className="text-center py-2 text-sm text-green-600 font-medium">
                                Drop here to match
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
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
                    key={match.poItem.id}
                    className="p-3 bg-white rounded-lg border border-green-200 bg-green-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <button
                        onClick={() => removeMatch(match.poItem.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
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
          </DragDropContext>
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
