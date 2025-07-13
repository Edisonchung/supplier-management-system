// src/components/mobile/MobileEnhancements.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical, Phone, Mail, MapPin, Camera, Mic, Search } from 'lucide-react';

// Mobile-First PO Card Component
export const MobilePOCard = ({ po, onEdit, onDelete, onCall, onViewLocation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Swipe gesture handlers
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50;

    if (swipeDistance > swipeThreshold) {
      // Swipe left - show actions
      setShowActions(true);
    } else if (swipeDistance < -swipeThreshold) {
      // Swipe right - hide actions
      setShowActions(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Main Card Content */}
      <div
        ref={cardRef}
        className={`p-4 transition-transform duration-200 ${showActions ? '-translate-x-16' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{po.poNumber}</h3>
            <p className="text-sm text-gray-600">{po.clientName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
              {po.status}
            </span>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-500">Items:</span>
            <span className="ml-1 font-medium">{po.items?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Total:</span>
            <span className="ml-1 font-medium">RM {(po.total || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Order Date:</span>
            <span className="ml-1 font-medium">
              {new Date(po.orderDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Due Date:</span>
            <span className="ml-1 font-medium">
              {po.requiredDate ? new Date(po.requiredDate).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="border-t pt-3 space-y-2 text-sm">
            {po.projectCode && (
              <div>
                <span className="text-gray-500">Project:</span>
                <span className="ml-1 font-medium">{po.projectCode}</span>
              </div>
            )}
            {po.paymentTerms && (
              <div>
                <span className="text-gray-500">Payment Terms:</span>
                <span className="ml-1 font-medium">{po.paymentTerms}</span>
              </div>
            )}
            {po.notes && (
              <div>
                <span className="text-gray-500">Notes:</span>
                <p className="mt-1 text-gray-700">{po.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-blue-600 text-sm font-medium"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 ml-1" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-1" />
            )}
          </button>

          <div className="flex space-x-2">
            {po.clientPhone && (
              <button
                onClick={() => onCall && onCall(po.clientPhone)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Call client"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
            {po.clientEmail && (
              <button
                onClick={() => window.open(`mailto:${po.clientEmail}`)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Send email"
              >
                <Mail className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEdit && onEdit(po)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Swipe Actions */}
      {showActions && (
        <div className="absolute right-0 top-0 h-full w-16 bg-red-500 flex items-center justify-center">
          <button
            onClick={() => onDelete && onDelete(po.id)}
            className="text-white hover:bg-red-600 p-2 rounded"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

// Mobile Search and Filter Component
export const MobileSearchFilter = ({ onSearch, onFilter, filters = {} }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-3">
      {/* Search Bar */}
      <div className={`relative transition-all duration-200 ${isSearchFocused ? 'scale-105' : ''}`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search purchase orders..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch && onSearch(e.target.value);
          }}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
      </div>

      {/* Quick Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {['All', 'Draft', 'Pending', 'Approved'].map(status => (
          <button
            key={status}
            onClick={() => onFilter && onFilter({ status: status === 'All' ? null : status.toLowerCase() })}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.status === (status === 'All' ? null : status.toLowerCase())
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
};

// Voice Input Component
export const VoiceInput = ({ onVoiceInput, placeholder = "Tap to speak..." }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const newTranscript = event.results[0][0].transcript;
        setTranscript(newTranscript);
        onVoiceInput && onVoiceInput(newTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onVoiceInput]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  if (!('webkitSpeechRecognition' in window)) {
    return null; // Hide if speech recognition not supported
  }

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
          isListening
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">
            {isListening ? 'Listening...' : placeholder}
          </span>
        </div>
      </button>
      
      {transcript && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          Captured: "{transcript}"
        </div>
      )}
    </div>
  );
};

// Camera Capture Component for Receipts/Documents
export const CameraCapture = ({ onCapture, accept = "image/*" }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      onCapture && onCapture(file);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
      >
        <div className="flex flex-col items-center space-y-2">
          <Camera className="w-8 h-8 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            Take Photo or Upload Image
          </span>
          <span className="text-xs text-gray-500">
            Receipt, delivery proof, or document
          </span>
        </div>
      </button>

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg border border-gray-200"
          />
          <button
            onClick={() => {
              setPreview(null);
              fileInputRef.current.value = '';
            }}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture="environment" // Use rear camera on mobile
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// Pull-to-Refresh Component
export const PullToRefresh = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 transition-all duration-200"
        style={{ 
          height: pullDistance,
          transform: `translateY(-${Math.max(0, 60 - pullDistance)}px)`
        }}
      >
        {pullDistance > 0 && (
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader2 className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
};

// Mobile-Optimized Modal Component
export const MobileModal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-end justify-center min-h-full">
        <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
