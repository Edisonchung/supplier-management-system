// src/components/procurement/StockAllocationModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Target, 
  Building, 
  FileText, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  X
} from 'lucide-react';
import { StockAllocationService } from '../../services/StockAllocationService';

const StockAllocationModal = ({ 
  isOpen, 
  onClose, 
  piId, 
  itemData, 
  onAllocationComplete 
}) => {
  // ✅ STEP 1: PROPS VALIDATION AND EARLY CALCULATIONS

  const effectivePiId = piId || itemData?.piId || itemData?.piNumber;
  
  // ✅ STEP 2: ALL STATE DECLARATIONS
  const [allocations, setAllocations] = useState([]);
  const [availableTargets, setAvailableTargets] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState('');
  const [pi, setPi] = useState(null);
  const [piLoading, setPiLoading] = useState(true);
  const [piError, setPiError] = useState(null);

  // ✅ STEP 3: DERIVED VALUES (CALCULATED FROM STATE)
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
  const availableQty = itemData?.unallocatedQty || itemData?.receivedQty || 0;
  const remainingQty = availableQty - totalAllocated;
  
  // ✅ STEP 4: COMPLEX CALCULATIONS (WRAPPED IN useMemo FOR SAFETY)
  const isValid = React.useMemo(() => {
    const result = remainingQty >= 0 && 
                   totalAllocated > 0 && 
                   allocations.every(alloc => alloc.allocationTarget && alloc.quantity > 0);
    
    console.log('🔍 isValid calculation:', {
      remainingQty,
      totalAllocated,
      allocationsLength: allocations.length,
      result
    });
    
    return result;
  }, [remainingQty, totalAllocated, allocations]);

  // ✅ STEP 5: FUNCTION DECLARATIONS
  const loadAllocationData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Loading allocation data with PI ID:', effectivePiId);

      // Load available targets
      const targets = await StockAllocationService.getAvailableTargets(
        itemData.productId || itemData.productCode
      );
      setAvailableTargets(targets);
      
      console.log('🧠 Generating suggestions for:', {
        piId: effectivePiId,
        itemId: itemData.id,
        availableQty: itemData.unallocatedQty || itemData.receivedQty || 0
      });
      
      // Get smart suggestions
      const suggestions = await StockAllocationService.suggestAllocations(
        effectivePiId, 
        itemData.id, 
        itemData.unallocatedQty || itemData.receivedQty || 0
      );
      setSuggestions(suggestions);
      
      // Initialize with suggestions or default allocation
      if (suggestions.length > 0 && showSuggestions) {
        setAllocations(suggestions.map(s => ({ ...s, id: Date.now() + Math.random() })));
      } else {
        setAllocations([{
          id: Date.now(),
          allocationType: 'warehouse',
          allocationTarget: 'wh-main',
          targetName: 'Main Warehouse',
          quantity: itemData.unallocatedQty || itemData.receivedQty || 0,
          notes: ''
        }]);
      }
    } catch (error) {
      console.error('Error loading allocation data:', error);
      setError('Failed to load allocation data');
    } finally {
      setLoading(false);
    }
  };

  const addAllocation = () => {
    setAllocations(prev => [...prev, {
      id: Date.now() + Math.random(),
      allocationType: 'warehouse',
      allocationTarget: '',
      targetName: '',
      quantity: 0,
      notes: ''
    }]);
  };

  const removeAllocation = (id) => {
    setAllocations(prev => prev.filter(alloc => alloc.id !== id));
  };

  const updateAllocation = (id, field, value) => {
    setAllocations(prev => prev.map(alloc => {
      if (alloc.id === id) {
        const updated = { ...alloc, [field]: value };
        
        // Auto-update targetName when target changes
        if (field === 'allocationTarget' || field === 'allocationType') {
          const targetType = field === 'allocationType' ? value : alloc.allocationType;
          const targetId = field === 'allocationTarget' ? value : alloc.allocationTarget;
          
          updated.targetName = getTargetName(targetType, targetId);
        }
        
        return updated;
      }
      return alloc;
    }));
  };

  const getTargetName = (allocationType, targetId) => {
    if (!allocationType || !targetId) return '';
    
    const targetList = availableTargets[
      allocationType === 'po' ? 'purchaseOrders' : 
      allocationType === 'project' ? 'projectCodes' : 
      'warehouses'
    ] || [];
    
    const target = targetList.find(t => t.id === targetId);
    return target ? `${target.name}${target.info ? ` - ${target.info}` : ''}` : '';
  };

  const applySuggestions = () => {
    setAllocations(suggestions.map(s => ({ ...s, id: Date.now() + Math.random() })));
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    console.log('🎯 === BUTTON CLICKED - handleSubmit started ===');
    console.log('🔍 Current state when button clicked:', {
      isValid,
      loading,
      totalAllocated,
      remainingQty,
      allocationsCount: allocations.length,
      allocations: allocations.map(a => ({
        id: a.id,
        type: a.allocationType,
        target: a.allocationTarget,
        quantity: a.quantity,
        hasTarget: !!a.allocationTarget,
        hasQuantity: a.quantity > 0
      }))
    });

    // Check if button is actually disabled
    if (!isValid) {
      console.error('❌ Button should be disabled - validation failed:', {
        remainingQty,
        totalAllocated,
        validationChecks: {
          remainingQtyOK: remainingQty >= 0,
          totalAllocatedOK: totalAllocated > 0,
          allHaveTargets: allocations.every(alloc => alloc.allocationTarget),
          allHaveQuantity: allocations.every(alloc => alloc.quantity > 0)
        }
      });
      setError('Validation failed - please check all fields are filled correctly');
      return;
    }

    if (loading) {
      console.warn('⚠️ Already loading, ignoring click');
      return;
    }

    console.log('🎯 Starting allocation submission...');
    setLoading(true);
    setError('');
    
    try {

      // 🔧 FIX: Add itemId to each allocation before processing
    const allocationsWithItemId = allocations.map(alloc => ({
      ...alloc,
      itemId: itemData.id,  // ← ADD THIS LINE
      piId: effectivePiId   // ← ADD THIS LINE TOO FOR SAFETY
    }));
    
    console.log('🔍 Allocations with itemId added:', allocationsWithItemId);
      
      // Enhanced validation logging
      const invalidAllocations = allocations.filter(alloc => 
        !alloc.allocationTarget || alloc.quantity <= 0
      );
      
      console.log('🔍 Allocation validation:', {
        totalAllocations: allocations.length,
        invalidAllocations: invalidAllocations.length,
        allocations: allocations,
        piId: effectivePiId,
        itemId: itemData.id
      });
      
      if (invalidAllocations.length > 0) {
        const errorMsg = 'Please fill in all allocation targets and quantities';
        console.error('❌ Validation failed:', errorMsg, invalidAllocations);
        throw new Error(errorMsg);
      }

      console.log('💾 Calling StockAllocationService.allocateStock...');
      const result = await StockAllocationService.allocateStock(
      effectivePiId, 
      itemData.id, 
      allocationsWithItemId  // ← USE THE FIXED ALLOCATIONS
    );
      console.log('✅ Allocation successful:', result);
      
      console.log('🎯 Calling onAllocationComplete...');
      onAllocationComplete(allocationsWithItemId); 
      
      // Success - close modal
      console.log('✅ ALLOCATION COMPLETE - Closing modal');
      onClose();
      
    } catch (error) {
      console.error('❌ Allocation failed with error:', error);
      setError(`Allocation failed: ${error.message}`);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleButtonClick = (e) => {
    // Prevent default and see if that helps
    e.preventDefault();
    
    // Call the actual submit
    handleSubmit();
  };
  
  // ✅ STEP 6: useEffect HOOKS (AFTER ALL FUNCTIONS ARE DECLARED)
  useEffect(() => {
  if (isOpen && piId) {
    setPiLoading(true);
    setPiError(null);
    
    // Load PI data using existing service
    import('../../hooks/useProformaInvoices').then(({ default: useProformaInvoices }) => {
      // This is a bit tricky since we need to call the hook properly
      // For now, let's use localStorage as fallback
      const pis = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
      const foundPI = pis.find(p => p.id === piId || p.piNumber === piId);
      
      if (foundPI) {
        setPi(foundPI);
        setPiLoading(false);
      } else {
        setPiError('PI not found');
        setPiLoading(false);
      }
    }).catch(err => {
      setPiError(err.message);
      setPiLoading(false);
    });
  }
}, [isOpen, piId]);
  
  useEffect(() => {
    if (isOpen && itemData && effectivePiId) {
      loadAllocationData();
    }
  }, [isOpen, itemData, effectivePiId]);

  // ✅ STEP 7: EARLY RETURNS
  if (!isOpen) return null;
  
  if (piLoading) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Allocation Data</h3>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

if (piError) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{piError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setPiLoading(true);
                setPiError(null);
                // Retry logic here
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

if (!pi || !pi.items) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">PI data or items not found for allocation.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
  if (!effectivePiId) {
    console.error('⚠️ No PI ID available for StockAllocationModal');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Missing PI Information</h3>
            <p className="text-gray-600 mb-4">Cannot allocate stock without PI reference.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ STEP 8: MAIN JSX RENDER
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="mr-2 h-5 w-5 text-blue-500" />
              Allocate Stock: {itemData.productName}
            </h2>
            <div className="mt-2 text-sm text-gray-600">
              Received: {itemData.receivedQty || 0} | 
              Available: {availableQty} | 
              Code: {itemData.productCode || 'N/A'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertCircle className="mr-2 h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {suggestions.length > 0 && showSuggestions && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900 flex items-center">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Smart Allocation Suggestions
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={applySuggestions}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Apply Suggestions
                  </button>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="text-sm text-blue-800 flex items-center">
                    <ArrowRight className="mr-2 h-3 w-3" />
                    {suggestion.quantity} units → {suggestion.targetName}
                    {suggestion.priority === 'high' && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        High Priority
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allocation Rows */}
          <div className="space-y-4">
            {allocations.map((allocation, index) => (
              <AllocationRow
                key={allocation.id}
                allocation={allocation}
                availableTargets={availableTargets}
                onUpdate={(field, value) => updateAllocation(allocation.id, field, value)}
                onRemove={() => removeAllocation(allocation.id)}
                canRemove={allocations.length > 1}
              />
            ))}
          </div>

          {/* Add Allocation Button */}
          <button
            type="button"
            onClick={addAllocation}
            className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Another Allocation
          </button>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Allocating:</span>
                <span className="font-semibold text-blue-600">{totalAllocated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Remaining:</span>
                <span className={`font-semibold ${
                  remainingQty < 0 ? 'text-red-600' : 
                  remainingQty === 0 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {remainingQty}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {!isValid && totalAllocated > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertCircle className="mr-2 h-4 w-4" />
                {remainingQty < 0 && "Cannot allocate more than available quantity"}
                {!allocations.every(alloc => alloc.allocationTarget) && "Please select targets for all allocations"}
                {!allocations.every(alloc => alloc.quantity > 0) && "All allocation quantities must be greater than 0"}
              </div>
            </div>
          )}
        </div>

        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleButtonClick}
            disabled={!isValid || loading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
              !isValid ? 'bg-gray-400' : 'bg-blue-600'
            }`}
            style={{ 
              pointerEvents: (!isValid || loading) ? 'none' : 'auto'
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Allocating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Allocate Stock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Individual Allocation Row Component
const AllocationRow = ({ allocation, availableTargets, onUpdate, onRemove, canRemove }) => {
  const getTargetOptions = () => {
    switch (allocation.allocationType) {
      case 'po':
        return availableTargets.purchaseOrders || [];
      case 'project':
        return availableTargets.projectCodes || [];
      case 'warehouse':
        return availableTargets.warehouses || [];
      default:
        return [];
    }
  };

  const getTargetIcon = () => {
    switch (allocation.allocationType) {
      case 'po': return <FileText className="h-4 w-4 text-green-500" />;
      case 'project': return <Target className="h-4 w-4 text-blue-500" />;
      case 'warehouse': return <Building className="h-4 w-4 text-gray-500" />;
      default: return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Allocation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={allocation.allocationType}
            onChange={(e) => onUpdate('allocationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="warehouse">Warehouse Stock</option>
            <option value="po">Purchase Order</option>
            <option value="project">Project Code</option>
          </select>
        </div>

        {/* Target Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center">
              {getTargetIcon()}
              <span className="ml-1">Target</span>
            </span>
          </label>
          <select
            value={allocation.allocationTarget}
            onChange={(e) => onUpdate('allocationTarget', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select target...</option>
            {getTargetOptions().map(target => (
              <option key={target.id} value={target.id}>
                {target.name} {target.info && `(${target.info})`}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="0"
            value={allocation.quantity}
            onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-end">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <input
          type="text"
          value={allocation.notes}
          onChange={(e) => onUpdate('notes', e.target.value)}
          placeholder="Optional notes for this allocation..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

export default StockAllocationModal;
