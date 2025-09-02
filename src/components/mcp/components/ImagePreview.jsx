// src/components/mcp/components/ImagePreview.jsx
// Image preview modal component

import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Info,
  Calendar,
  Tag,
  Package,
  Building,
  Maximize2,
  Copy,
  Check
} from 'lucide-react';

const ImagePreview = ({ product, onClose }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!product) return null;

  const handleCopyUrl = async () => {
    if (product.imageUrl) {
      try {
        await navigator.clipboard.writeText(product.imageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const handleDownload = () => {
    if (product.imageUrl) {
      const link = document.createElement('a');
      link.href = product.imageUrl;
      link.download = `${product.name || 'product'}_${product.sku || product.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className={`bg-white rounded-lg ${fullscreen ? 'w-full h-full' : 'max-w-4xl w-full max-h-[90vh]'} overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {product.sku && `SKU: ${product.sku} • `}
                  Category: {product.category || 'General'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {product.imageUrl && (
                <>
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy image URL"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download image"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => window.open(product.imageUrl, '_blank')}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </>
              )}
              
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-auto ${fullscreen ? 'p-0' : 'p-6'}`}>
            <div className={`${fullscreen ? 'h-full' : ''} ${product.imageUrl ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''}`}>
              {/* Image Section */}
              <div className={`${product.imageUrl ? 'lg:col-span-2' : 'w-full'} ${fullscreen ? 'h-full' : ''}`}>
                {product.imageUrl ? (
                  <div className={`relative ${fullscreen ? 'h-full' : 'aspect-square'} bg-gray-100 rounded-lg overflow-hidden`}>
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    
                    {!imageError ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className={`${fullscreen ? 'w-full h-full' : 'w-full h-full'} object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <Package className="w-16 h-16 mx-auto mb-4" />
                          <p className="text-lg font-medium">Image not available</p>
                          <p className="text-sm">Failed to load product image</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`${fullscreen ? 'h-full' : 'aspect-square'} bg-gray-100 rounded-lg flex items-center justify-center`}>
                    <div className="text-center text-gray-400">
                      <Package className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium">No Image Available</p>
                      <p className="text-sm">This product doesn't have an uploaded image</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details */}
              {!fullscreen && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Product Details
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Product Name</div>
                          <div className="text-sm text-gray-600">{product.name}</div>
                        </div>
                      </div>

                      {product.sku && (
                        <div className="flex items-start gap-3">
                          <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">SKU</div>
                            <div className="text-sm text-gray-600 font-mono">{product.sku}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Category</div>
                          <div className="text-sm text-gray-600 capitalize">
                            {(product.category || 'general').replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      {product.brand && (
                        <div className="flex items-start gap-3">
                          <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Brand</div>
                            <div className="text-sm text-gray-600">{product.brand}</div>
                          </div>
                        </div>
                      )}

                      {product.description && (
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Description</div>
                            <div className="text-sm text-gray-600 leading-relaxed">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Details */}
                  {product.imageUrl && (
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Image Details
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Image Status</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Available
                          </span>
                        </div>
                        
                        {product.imageGeneratedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Generated</span>
                            <span className="text-gray-900">
                              {formatDate(product.imageGeneratedAt)}
                            </span>
                          </div>
                        )}
                        
                        {product.imageProvider && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Provider</span>
                            <span className="text-gray-900">{product.imageProvider}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t pt-6">
                    <div className="space-y-3">
                      {product.imageUrl ? (
                        <button
                          onClick={handleDownload}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Image
                        </button>
                      ) : (
                        <div className="text-center text-gray-500 text-sm">
                          No image available to download
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay close area */}
      {fullscreen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={onClose}
        />
      )}
    </>
  );
};

export default ImagePreview;
