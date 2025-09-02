// src/components/mcp/ManualImageUpload.jsx
// Manual image upload component for products that need custom images

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Image,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  FileImage,
  Trash2,
  Eye,
  Save
} from 'lucide-react';

// Import child components
import ImageUploadZone from './components/ImageUploadZone';
import UploadQueue from './components/UploadQueue';
import ImagePreview from './components/ImagePreview';

let productSyncService = null;

const initializeProductSyncService = async () => {
  try {
    if (typeof window !== 'undefined') {
      if (window.ProductSyncService) {
        productSyncService = window.ProductSyncService;
        return true;
      }
      
      if (window.productSyncService) {
        productSyncService = window.productSyncService;
        return true;
      }
      
      try {
        const syncModule = await import('../../services/sync/ProductSyncService.js');
        
        if (syncModule.ProductSyncService) {
          productSyncService = new syncModule.ProductSyncService();
        } else if (syncModule.default) {
          productSyncService = new syncModule.default();
        }
        
        if (productSyncService && typeof productSyncService.initialize === 'function') {
          await productSyncService.initialize();
        }
        
        return true;
      } catch (importError) {
        console.warn('ProductSyncService import failed:', importError.message);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('ProductSyncService not available:', error.message);
    productSyncService = null;
    return false;
  }
};

const ManualImageUpload = () => {
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previewImages, setPreviewImages] = useState({});

  useEffect(() => {
    const initialize = async () => {
      const initialized = await initializeProductSyncService();
      setServiceInitialized(initialized);
      await loadProducts();
    };
    
    initialize();
  }, []);

  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  const isProductSyncServiceAvailable = () => {
    return productSyncService && 
           typeof productSyncService.getProductsNeedingImages === 'function' &&
           typeof productSyncService.uploadProductImage === 'function';
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      
      if (!isProductSyncServiceAvailable()) {
        setProducts(getDemoProducts());
        return;
      }
      
      const result = await productSyncService.getProductsNeedingImages(100);
      
      let productList = [];
      if (Array.isArray(result)) {
        productList = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        productList = result.data;
      } else if (result && result.success && Array.isArray(result.results)) {
        productList = result.results;
      }
      
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts(getDemoProducts());
      showNotification('Failed to load products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoProducts = () => [
    {
      id: 'demo-1',
      name: 'Industrial Hydraulic Pump',
      category: 'hydraulics',
      sku: 'IHP-001',
      brand: 'HydroTech',
      description: 'High-pressure hydraulic pump for industrial applications',
      imageUrl: null,
      hasRealImage: false
    },
    {
      id: 'demo-2',
      name: 'Pneumatic Control Valve',
      category: 'pneumatics', 
      sku: 'PCV-002',
      brand: 'AirPro',
      description: 'Precision pneumatic control valve with manual override',
      imageUrl: null,
      hasRealImage: false
    }
  ];

  const handleFilesSelected = (files, productId) => {
    const newUploads = Array.from(files).map(file => ({
      id: `${productId}-${Date.now()}-${Math.random()}`,
      productId,
      file,
      status: 'pending',
      progress: 0,
      error: null,
      preview: URL.createObjectURL(file)
    }));
    
    setUploadQueue(prev => [...prev, ...newUploads]);
  };

  const handleUploadStart = async () => {
    if (uploadQueue.length === 0) {
      showNotification('No files to upload', 'error');
      return;
    }

    if (!isProductSyncServiceAvailable()) {
      showNotification('Upload service not available', 'error');
      return;
    }

    setIsUploading(true);
    
    try {
      const pendingUploads = uploadQueue.filter(upload => upload.status === 'pending');
      
      for (const upload of pendingUploads) {
        try {
          // Update status to uploading
          setUploadQueue(prev => prev.map(u => 
            u.id === upload.id ? { ...u, status: 'uploading', progress: 0 } : u
          ));

          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setUploadQueue(prev => prev.map(u => 
              u.id === upload.id ? { 
                ...u, 
                progress: Math.min(u.progress + Math.random() * 30, 90) 
              } : u
            ));
          }, 500);

          // Perform actual upload
          const result = await productSyncService.uploadProductImage(upload.productId, upload.file);
          
          clearInterval(progressInterval);
          
          if (result && result.success) {
            setUploadQueue(prev => prev.map(u => 
              u.id === upload.id ? { 
                ...u, 
                status: 'completed', 
                progress: 100,
                imageUrl: result.imageUrl 
              } : u
            ));
            
            // Update product in the main list
            setProducts(prev => prev.map(p => 
              p.id === upload.productId ? { 
                ...p, 
                imageUrl: result.imageUrl,
                hasRealImage: true 
              } : p
            ));
            
          } else {
            throw new Error(result?.message || 'Upload failed');
          }
          
        } catch (error) {
          console.error(`Upload failed for ${upload.file.name}:`, error);
          setUploadQueue(prev => prev.map(u => 
            u.id === upload.id ? { 
              ...u, 
              status: 'failed', 
              progress: 0,
              error: error.message 
            } : u
          ));
        }
      }
      
      const successful = uploadQueue.filter(u => u.status === 'completed').length;
      const failed = uploadQueue.filter(u => u.status === 'failed').length;
      
      showNotification(
        `Upload complete: ${successful} successful, ${failed} failed`, 
        failed > 0 ? 'error' : 'success'
      );
      
    } catch (error) {
      console.error('Upload process failed:', error);
      showNotification('Upload process failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFromQueue = (uploadId) => {
    setUploadQueue(prev => {
      const upload = prev.find(u => u.id === uploadId);
      if (upload && upload.preview) {
        URL.revokeObjectURL(upload.preview);
      }
      return prev.filter(u => u.id !== uploadId);
    });
  };

  const handleClearQueue = () => {
    uploadQueue.forEach(upload => {
      if (upload.preview) {
        URL.revokeObjectURL(upload.preview);
      }
    });
    setUploadQueue([]);
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filter === 'all' || 
        (filter === 'no_image' && !product.hasRealImage) ||
        (filter === 'has_image' && product.hasRealImage);
      
      return matchesSearch && matchesFilter;
    });
  }, [products, searchTerm, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          notification.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
          'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-green-600" />
            Manual Image Upload
          </h1>
          <p className="text-gray-600 mt-1">
            Upload custom images for products manually
            {!serviceInitialized && <span className="text-orange-600"> (Demo Mode)</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleUploadStart}
            disabled={isUploading || uploadQueue.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload ({uploadQueue.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <UploadQueue
          uploads={uploadQueue}
          onRemove={handleRemoveFromQueue}
          onClear={handleClearQueue}
          isUploading={isUploading}
        />
      )}

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Products</option>
            <option value="no_image">No Images</option>
            <option value="has_image">Has Images</option>
          </select>
          
          <div className="text-sm text-gray-600">
            {filteredProducts.length} products
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Products ({filteredProducts.length})
            {selectedProducts.length > 0 && (
              <span className="text-sm text-blue-600 ml-2">
                {selectedProducts.length} selected
              </span>
            )}
          </h3>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>SKU: {product.sku}</div>
                        <div>Category: {product.category}</div>
                        {product.brand && <div>Brand: {product.brand}</div>}
                      </div>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleProductSelect(product.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>

                  {/* Image Preview */}
                  <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedProduct(product)}
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <FileImage className="w-8 h-8 mx-auto mb-2" />
                        <div className="text-sm">No Image</div>
                      </div>
                    )}
                  </div>

                  {/* Upload Zone */}
                  <ImageUploadZone
                    productId={product.id}
                    onFilesSelected={handleFilesSelected}
                    disabled={isUploading}
                  />
                  
                  {product.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No products available for image upload.'}
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedProduct && (
        <ImagePreview
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ManualImageUpload;
