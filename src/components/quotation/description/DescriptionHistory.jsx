import React, { useState, useEffect } from 'react';
import { 
  History, X, Clock, FileText, Sparkles, Edit3,
  ChevronRight, Loader2, AlertCircle, RotateCcw,
  User, Calendar
} from 'lucide-react';
import { 
  collection, query, where, orderBy, limit, 
  getDocs, Timestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase';

/**
 * DescriptionHistory - View and restore previous description versions
 * 
 * Features:
 * - Chronological list of description changes
 * - Type indicators (Standard, AI, Custom)
 * - User attribution
 * - One-click restore
 * - Preview on hover
 * - Pagination for long histories
 */
const DescriptionHistory = ({
  productId,
  quotationLineId,
  onSelect,
  onClose,
  maxItems = 20
}) => {
  // State
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Fetch description history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Query description history collection
        const historyRef = collection(db, 'descriptionHistory');
        
        // Build query based on available IDs
        let q;
        if (quotationLineId) {
          q = query(
            historyRef,
            where('quotationLineId', '==', quotationLineId),
            orderBy('createdAt', 'desc'),
            limit(maxItems)
          );
        } else if (productId) {
          q = query(
            historyRef,
            where('productId', '==', productId),
            orderBy('createdAt', 'desc'),
            limit(maxItems)
          );
        } else {
          setHistory([]);
          setLoading(false);
          return;
        }

        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        
        setHistory(items);
      } catch (err) {
        console.error('Error fetching description history:', err);
        setError('Failed to load history');
        
        // Fallback: Generate mock history for demo
        setHistory(generateMockHistory());
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [productId, quotationLineId, maxItems]);

  // Generate mock history for demo/fallback
  const generateMockHistory = () => {
    const now = new Date();
    return [
      {
        id: 'hist-1',
        type: 'ai',
        description: 'High-performance centrifugal pump designed for industrial applications. Features corrosion-resistant stainless steel construction, optimized impeller design for maximum efficiency, and low-noise operation. Suitable for water transfer, circulation, and pressure boosting systems.',
        createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
        createdBy: 'AI Generator',
        config: { tone: 'commercial', length: 'medium' }
      },
      {
        id: 'hist-2',
        type: 'custom',
        description: 'Centrifugal pump with 316SS construction. Flow rate: 50-200 m³/h. Head: 20-80m. Motor: 7.5kW, 3-phase.',
        createdAt: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
        createdBy: 'John Doe',
        userId: 'user-123'
      },
      {
        id: 'hist-3',
        type: 'standard',
        description: 'Standard catalog description for industrial pump model XYZ-100.',
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdBy: 'System',
        isOriginal: true
      }
    ];
  };

  // Get type icon and color
  const getTypeInfo = (type) => {
    switch (type) {
      case 'ai':
        return {
          icon: Sparkles,
          color: 'text-purple-500',
          bgColor: 'bg-purple-100',
          label: 'AI Generated'
        };
      case 'custom':
        return {
          icon: Edit3,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          label: 'Custom'
        };
      case 'standard':
      default:
        return {
          icon: FileText,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          label: 'Standard'
        };
    }
  };

  // Format date
  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} min ago`;
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Full date
    return date.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Truncate description for list view
  const truncateDescription = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Handle item selection
  const handleSelect = (item) => {
    setSelectedItem(item);
  };

  // Handle restore
  const handleRestore = () => {
    if (selectedItem) {
      onSelect(selectedItem);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <History className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Description History
              </h2>
              <p className="text-sm text-gray-500">
                {history.length} version{history.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
              <p className="text-gray-500">Loading history...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-gray-500 text-sm mt-1">
                Showing demo data instead
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <History className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No history found</p>
              <p className="text-gray-400 text-sm mt-1">
                Description changes will appear here
              </p>
            </div>
          )}

          {/* History List */}
          {!loading && history.length > 0 && (
            <div className="divide-y divide-gray-100">
              {history.map((item) => {
                const typeInfo = getTypeInfo(item.type);
                const TypeIcon = typeInfo.icon;
                const isSelected = selectedItem?.id === item.id;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setPreviewItem(item)}
                    onMouseLeave={() => setPreviewItem(null)}
                    className={`px-6 py-4 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={`p-2 rounded-lg ${typeInfo.bgColor} flex-shrink-0`}>
                        <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {item.isOriginal && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              Original
                            </span>
                          )}
                          {item.config?.tone && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-600 rounded capitalize">
                              {item.config.tone}
                            </span>
                          )}
                        </div>
                        
                        {/* Description Preview */}
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {truncateDescription(item.description, 120)}
                        </p>
                        
                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(item.createdAt)}
                          </div>
                          {item.createdBy && (
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {item.createdBy}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Selection indicator */}
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-colors ${
                        isSelected ? 'text-blue-500' : 'text-gray-300'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Panel (when hovering) */}
        {previewItem && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 max-h-[200px] overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Preview
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {previewItem.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-500">
            {selectedItem ? (
              <span>
                Selected: <span className="font-medium">{getTypeInfo(selectedItem.type).label}</span>
                {' - '}
                {formatDate(selectedItem.createdAt)}
              </span>
            ) : (
              'Click an item to select'
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              disabled={!selectedItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restore Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionHistory;
