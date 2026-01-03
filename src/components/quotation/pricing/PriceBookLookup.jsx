import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Book, ChevronDown, ChevronUp, Check,
  Loader2, AlertCircle, ExternalLink, RefreshCw,
  DollarSign, Tag, Calendar, Info, X
} from 'lucide-react';
import QuotationPricingService from '../../../services/QuotationPricingService';

/**
 * PriceBookLookup - Search and select prices from list price books
 * 
 * Features:
 * - Multi-brand price book support (Grundfos, Graco, etc.)
 * - Real-time search with debouncing
 * - Model number matching
 * - Currency conversion display
 * - Price history and validity dates
 * - Discount levels display
 */
const PriceBookLookup = ({
  productId,
  productName,
  modelNumber,
  brand,
  onPriceSelect,
  selectedCurrency = 'MYR',
  className = ''
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState(modelNumber || '');
  const [selectedBook, setSelectedBook] = useState(brand?.toLowerCase() || 'all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [priceBooks, setPriceBooks] = useState([]);
  const [expandedResult, setExpandedResult] = useState(null);

  // Available price books
  const defaultPriceBooks = [
    { id: 'all', name: 'All Price Books', color: 'gray' },
    { id: 'grundfos', name: 'Grundfos', color: 'blue' },
    { id: 'graco', name: 'Graco', color: 'red' },
    { id: 'abb', name: 'ABB', color: 'orange' },
    { id: 'siemens', name: 'Siemens', color: 'teal' },
    { id: 'schneider', name: 'Schneider', color: 'green' },
    { id: 'danfoss', name: 'Danfoss', color: 'pink' }
  ];

  // Fetch available price books
  useEffect(() => {
    const fetchPriceBooks = async () => {
      try {
        const books = await QuotationPricingService.getAvailablePriceBooks();
        if (books && books.length > 0) {
          setPriceBooks([{ id: 'all', name: 'All Price Books', color: 'gray' }, ...books]);
        } else {
          setPriceBooks(defaultPriceBooks);
        }
      } catch (err) {
        console.error('Error fetching price books:', err);
        setPriceBooks(defaultPriceBooks);
      }
    };
    fetchPriceBooks();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedBook]);

  // Perform search
  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await QuotationPricingService.searchPriceBook({
        query: searchTerm,
        priceBook: selectedBook === 'all' ? null : selectedBook,
        limit: 10
      });

      if (searchResults.success) {
        setResults(searchResults.items || []);
      } else {
        // Fallback to mock results
        setResults(generateMockResults(searchTerm));
      }
    } catch (err) {
      console.error('Price book search error:', err);
      setError('Search failed');
      setResults(generateMockResults(searchTerm));
    } finally {
      setLoading(false);
    }
  };

  // Generate mock results for demo
  const generateMockResults = (query) => {
    const mockItems = [
      {
        id: 'pb-1',
        modelNumber: 'CR 10-6',
        name: 'Grundfos CR 10-6 Multistage Centrifugal Pump',
        brand: 'Grundfos',
        listPrice: 2850.00,
        currency: 'USD',
        discountLevels: { A: 0.35, B: 0.30, C: 0.25 },
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        priceBookVersion: '2024-Q1'
      },
      {
        id: 'pb-2',
        modelNumber: 'CR 15-3',
        name: 'Grundfos CR 15-3 Multistage Centrifugal Pump',
        brand: 'Grundfos',
        listPrice: 3200.00,
        currency: 'USD',
        discountLevels: { A: 0.35, B: 0.30, C: 0.25 },
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        priceBookVersion: '2024-Q1'
      },
      {
        id: 'pb-3',
        modelNumber: 'Husky 1050',
        name: 'Graco Husky 1050 Diaphragm Pump',
        brand: 'Graco',
        listPrice: 1450.00,
        currency: 'USD',
        discountLevels: { D1: 0.40, D2: 0.35, D3: 0.30 },
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-06-30'),
        priceBookVersion: '2024-H1'
      }
    ];

    return mockItems.filter(item => 
      item.modelNumber.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Convert currency
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    // Simple conversion rates (in production, use real-time rates)
    const rates = {
      'USD-MYR': 4.45,
      'USD-EUR': 0.92,
      'USD-RMB': 7.25,
      'EUR-MYR': 4.85,
      'EUR-USD': 1.09,
      'RMB-MYR': 0.61,
      'MYR-USD': 0.225,
      'MYR-EUR': 0.206,
      'MYR-RMB': 1.64
    };

    if (fromCurrency === toCurrency) return amount;
    
    const key = `${fromCurrency}-${toCurrency}`;
    const reverseKey = `${toCurrency}-${fromCurrency}`;
    
    if (rates[key]) {
      return amount * rates[key];
    } else if (rates[reverseKey]) {
      return amount / rates[reverseKey];
    }
    
    return amount;
  };

  // Handle price selection
  const handleSelect = (item) => {
    setSelectedPrice(item);
    onPriceSelect?.({
      listPrice: item.listPrice,
      currency: item.currency,
      priceBookId: item.id,
      priceBookVersion: item.priceBookVersion,
      discountLevels: item.discountLevels,
      brand: item.brand,
      modelNumber: item.modelNumber,
      validUntil: item.validUntil
    });
    setShowDropdown(false);
  };

  // Get brand color
  const getBrandColor = (brandName) => {
    const colors = {
      grundfos: 'bg-blue-100 text-blue-700 border-blue-200',
      graco: 'bg-red-100 text-red-700 border-red-200',
      abb: 'bg-orange-100 text-orange-700 border-orange-200',
      siemens: 'bg-teal-100 text-teal-700 border-teal-200',
      schneider: 'bg-green-100 text-green-700 border-green-200',
      danfoss: 'bg-pink-100 text-pink-700 border-pink-200'
    };
    return colors[brandName?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Check if price is expiring soon (within 30 days)
  const isExpiringSoon = (validUntil) => {
    if (!validUntil) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return validUntil <= thirtyDaysFromNow;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="flex gap-2">
        {/* Price Book Selector */}
        <select
          value={selectedBook}
          onChange={(e) => setSelectedBook(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {(priceBooks.length > 0 ? priceBooks : defaultPriceBooks).map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search model number or name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Selected Price Display */}
      {selectedPrice && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">
                  {selectedPrice.modelNumber}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded border ${getBrandColor(selectedPrice.brand)}`}>
                  {selectedPrice.brand}
                </span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                List Price: {formatCurrency(selectedPrice.listPrice, selectedPrice.currency)}
                {selectedPrice.currency !== selectedCurrency && (
                  <span className="text-green-600 ml-2">
                    ≈ {formatCurrency(
                      convertCurrency(selectedPrice.listPrice, selectedPrice.currency, selectedCurrency),
                      selectedCurrency
                    )}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedPrice(null);
                onPriceSelect?.(null);
              }}
              className="p-1 text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Results */}
      {showDropdown && (searchTerm.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-[400px] overflow-hidden">
          {/* Results Header */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </span>
            <button
              onClick={() => setShowDropdown(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="px-4 py-3 bg-red-50 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Results List */}
          <div className="max-h-[320px] overflow-y-auto">
            {results.length === 0 && !loading && searchTerm.length >= 2 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Book className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No matching prices found</p>
                <p className="text-xs mt-1">Try a different search term or price book</p>
              </div>
            )}

            {results.map((item) => {
              const isExpiring = isExpiringSoon(item.validUntil);
              const isExpanded = expandedResult === item.id;

              return (
                <div
                  key={item.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  {/* Main Row */}
                  <div
                    onClick={() => handleSelect(item)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Model & Brand */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {item.modelNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded border ${getBrandColor(item.brand)}`}>
                            {item.brand}
                          </span>
                          {isExpiring && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                              Expiring Soon
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {item.name}
                        </p>

                        {/* Price */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(item.listPrice, item.currency)}
                          </span>
                          {item.currency !== selectedCurrency && (
                            <span className="text-sm text-gray-500">
                              ≈ {formatCurrency(
                                convertCurrency(item.listPrice, item.currency, selectedCurrency),
                                selectedCurrency
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedResult(isExpanded ? null : item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      {/* Discount Levels */}
                      {item.discountLevels && Object.keys(item.discountLevels).length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                            Discount Levels
                          </div>
                          <div className="flex gap-2">
                            {Object.entries(item.discountLevels).map(([level, discount]) => (
                              <span
                                key={level}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {level}: {(discount * 100).toFixed(0)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Validity */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Valid: {item.validFrom?.toLocaleDateString()} - {item.validUntil?.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          Version: {item.priceBookVersion}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default PriceBookLookup;
