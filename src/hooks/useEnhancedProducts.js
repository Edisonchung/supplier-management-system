// src/hooks/useEnhancedProducts.js
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductEnrichmentService } from '../services/ProductEnrichmentService';

export const useEnhancedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load products from Firestore
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'products'), orderBy('dateAdded', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add product with AI enhancement
  const addProduct = async (productData, skipAIEnrichment = false) => {
    try {
      setLoading(true);
      
      let enrichedData = { ...productData };
      
      // AI Enhancement if part number is provided and not skipped
      if (!skipAIEnrichment && productData.partNumber) {
        try {
          const aiEnrichment = await ProductEnrichmentService.enrichProductFromPartNumber(
            productData.partNumber,
            productData.description || productData.name
          );
          
          // Merge AI suggestions with provided data (user data takes precedence)
          enrichedData = {
            ...enrichedData,
            name: productData.name || aiEnrichment.productName,
            brand: productData.brand || aiEnrichment.brand,
            category: productData.category || aiEnrichment.category,
            description: productData.description || aiEnrichment.description,
            detectedSpecs: aiEnrichment.specifications || {},
            aiEnriched: true,
            confidence: aiEnrichment.confidence || 0.5,
            lastEnhanced: new Date().toISOString()
          };
        } catch (aiError) {
          console.warn('AI enrichment failed, proceeding without:', aiError);
        }
      }

      // Generate SKU if not provided
      if (!enrichedData.sku) {
        enrichedData.sku = ProductEnrichmentService.generateInternalSKU({
          category: enrichedData.category,
          brand: enrichedData.brand,
          partNumber: enrichedData.partNumber
        });
      }

      // Set defaults
      enrichedData = {
        ...enrichedData,
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: enrichedData.status || PRODUCT_STATUS.PENDING,
        stock: enrichedData.stock || 0,
        minStock: enrichedData.minStock || 1,
        price: enrichedData.price || 0,
        source: enrichedData.source || 'manual'
      };

      // Clean undefined values
      Object.keys(enrichedData).forEach(key => {
        if (enrichedData[key] === undefined || enrichedData[key] === null) {
          delete enrichedData[key];
        }
      });

      const docRef = await addDoc(collection(db, 'products'), enrichedData);
      const newProduct = { id: docRef.id, ...enrichedData };
      
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
      
    } catch (err) {
      setError('Failed to add product');
      console.error('Error adding product:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (id, updates) => {
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'products', id), updatedData);
      
      setProducts(prev => prev.map(product => 
        product.id === id ? { ...product, ...updatedData } : product
      ));
      
      return true;
    } catch (err) {
      setError('Failed to update product');
      console.error('Error updating product:', err);
      throw err;
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(product => product.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete product');
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  // Enhanced search with multiple fields
  const searchProducts = (searchTerm, filters = {}) => {
    if (!searchTerm && Object.keys(filters).length === 0) {
      return products;
    }

    return products.filter(product => {
      // Text search across multiple fields
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchFields = [
          product.name,
          product.sku,
          product.partNumber,
          product.manufacturerCode,
          product.clientItemCode,
          product.brand,
          product.description,
          ...(product.alternativePartNumbers || [])
        ];
        
        const matchesSearch = searchFields.some(field => 
          field && field.toLowerCase().includes(term)
        );
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'all' && product.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && product.status !== filters.status) {
        return false;
      }

      // Supplier filter
      if (filters.supplierId && product.supplierId !== filters.supplierId) {
        return false;
      }

      // Stock filter
      if (filters.stockStatus) {
        if (filters.stockStatus === 'low' && product.stock > product.minStock) {
          return false;
        }
        if (filters.stockStatus === 'out' && product.stock > 0) {
          return false;
        }
        if (filters.stockStatus === 'available' && product.stock <= 0) {
          return false;
        }
      }

      // AI enrichment filter
      if (filters.aiEnriched === 'enriched' && !product.aiEnriched) {
        return false;
      }
      if (filters.aiEnriched === 'manual' && product.aiEnriched) {
        return false;
      }

      // Price range filter
      if (filters.priceMin && product.price < filters.priceMin) {
        return false;
      }
      if (filters.priceMax && product.price > filters.priceMax) {
        return false;
      }

      return true;
    });
  };

  // Find existing product by multiple criteria
  const findExistingProduct = async (criteria) => {
    const { partNumber, clientItemCode, sku, name } = criteria;
    
    // Search in current products first
    let existing = products.find(product => {
      if (partNumber && product.partNumber === partNumber) return true;
      if (clientItemCode && product.clientItemCode === clientItemCode) return true;
      if (sku && product.sku === sku) return true;
      if (name && product.name.toLowerCase() === name.toLowerCase()) return true;
      return false;
    });

    if (existing) return existing;

    // If not found in memory, query Firestore
    try {
      const queries = [];
      
      if (partNumber) {
        queries.push(query(collection(db, 'products'), where('partNumber', '==', partNumber)));
      }
      if (clientItemCode) {
        queries.push(query(collection(db, 'products'), where('clientItemCode', '==', clientItemCode)));
      }
      if (sku) {
        queries.push(query(collection(db, 'products'), where('sku', '==', sku)));
      }

      for (const q of queries) {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      }
    } catch (err) {
      console.error('Error searching for existing product:', err);
    }

    return null;
  };

  // Get low stock products
  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= product.minStock);
  };

  // Get products by supplier
  const getProductsBySupplier = (supplierId) => {
    return products.filter(product => product.supplierId === supplierId);
  };

  // Bulk product creation from PI items
  const createProductsFromPIItems = async (piItems, supplierId, aiService) => {
    const results = {
      created: [],
      skipped: [],
      updated: [],
      errors: []
    };

    for (const item of piItems) {
      try {
        // Validate part number
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(item.productCode);
        
        if (!validation.isValid) {
          results.skipped.push({
            item,
            reason: validation.error
          });
          continue;
        }

        // Check for existing product
        const existing = await findExistingProduct({
          partNumber: validation.normalized,
          clientItemCode: item.clientItemCode
        });

        if (existing) {
          // Update existing product with new information
          const updates = {};
          if (!existing.clientItemCode && item.clientItemCode) {
            updates.clientItemCode = item.clientItemCode;
          }
          if (!existing.description && item.productName) {
            updates.description = item.productName;
          }
          if (item.unitPrice && item.unitPrice > 0) {
            updates.price = item.unitPrice;
          }

          if (Object.keys(updates).length > 0) {
            await updateProduct(existing.id, updates);
            results.updated.push({
              product: { ...existing, ...updates },
              changes: Object.keys(updates)
            });
          }
          continue;
        }

        // Create new product with AI enhancement
        const newProduct = await addProduct({
          partNumber: validation.normalized,
          name: item.productName || validation.normalized,
          description: item.productName,
          clientItemCode: item.clientItemCode || '',
          supplierId: supplierId,
          price: item.unitPrice || 0,
          category: ProductEnrichmentService.categorizeProduct(validation.normalized, item.productName),
          source: 'pi_extraction'
        });

        results.created.push(newProduct);

      } catch (error) {
        results.errors.push({
          item,
          error: error.message
        });
      }
    }

    return results;
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    findExistingProduct,
    getLowStockProducts,
    getProductsBySupplier,
    createProductsFromPIItems,
    reloadProducts: loadProducts
  };
};
