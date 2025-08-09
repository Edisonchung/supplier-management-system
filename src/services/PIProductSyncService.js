// src/services/PIProductSyncService.js
import { ProductEnrichmentService } from './ProductEnrichmentService';
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export class PIProductSyncService {
  
  /**
   * Enhanced PI product sync with AI enrichment
   */
  static async syncPIProductsWithEnhancement(piData, savedPI, existingProducts, addProduct, showNotification) {
    console.log('🔄 Enhanced PI Product Sync Starting...');
    
    const syncStats = { 
      synced: 0, 
      created: 0, 
      updated: 0, 
      enhanced: 0, 
      skipped: 0, 
      errors: [] 
    };

    if (!piData.items || !Array.isArray(piData.items)) {
      console.log('❌ No items found in PI data');
      return syncStats;
    }

    console.log(`📊 Processing ${piData.items.length} PI items...`);

    for (const [index, item] of piData.items.entries()) {
      try {
        console.log(`🔄 Processing item ${index + 1}/${piData.items.length}:`, item.productCode || item.productName);

        // Validate part number
        const partNumberValidation = ProductEnrichmentService.validateAndNormalizePartNumber(
          item.productCode || item.partNumber || ''
        );
        
        if (!partNumberValidation.isValid) {
          console.log('⚠️ Invalid part number, skipping:', item.productCode);
          syncStats.skipped++;
          continue;
        }

        const normalizedPartNumber = partNumberValidation.normalized;

        // Check for existing product
        const existingProduct = this.findExistingProduct({
          partNumber: normalizedPartNumber,
          clientItemCode: item.clientItemCode,
          name: item.productName
        }, existingProducts);

        if (existingProduct) {
          console.log('📝 Found existing product, checking for updates...');
          
          // Update existing product
          const updates = this.generateProductUpdates(existingProduct, item, piData);
          if (Object.keys(updates).length > 0) {
            try {
              await updateDoc(doc(db, 'products', existingProduct.id), updates);
              console.log('✅ Updated existing product:', existingProduct.name);
              syncStats.updated++;
            } catch (updateError) {
              console.error('❌ Failed to update product:', updateError);
              syncStats.errors.push({ 
                item: item.productName || item.productCode, 
                error: `Update failed: ${updateError.message}` 
              });
            }
          }
          syncStats.synced++;
          continue;
        }

        // Create new enhanced product
        console.log('🆕 Creating new product with AI enhancement...');
        
        const newProductData = {
          name: item.productName || normalizedPartNumber,
          partNumber: normalizedPartNumber,
          clientItemCode: item.clientItemCode || '',
          description: item.productName || item.description || '',
          supplierId: piData.supplierId,
          price: this.parsePrice(item.unitPrice),
          stock: 0,
          minStock: 1,
          status: 'pending',
          source: 'pi_extraction',
          createdFromPI: piData.piNumber || piData.id || savedPI?.id,
          notes: item.notes || '',
          category: 'components', // Will be enhanced by AI
          // AI enhancement will be applied in addProduct
        };

        // Use the enhanced addProduct function (which includes AI enrichment)
        const result = await addProduct(newProductData, false); // false = don't skip AI enrichment
        
        if (result && result.success) {
          console.log('✅ Created product:', newProductData.name);
          syncStats.created++;
          
          // Check if AI enhancement was applied
          if (result.product && result.product.aiEnriched) {
            syncStats.enhanced++;
            console.log('🤖 AI enhancement applied with confidence:', result.product.confidence);
          }
        } else {
          const errorMsg = result?.error || 'Unknown error during product creation';
          console.error('❌ Failed to create product:', errorMsg);
          syncStats.errors.push({ 
            item: item.productName || item.productCode, 
            error: errorMsg 
          });
        }
        
        syncStats.synced++;
        
      } catch (error) {
        console.error('❌ Error processing PI item:', error);
        syncStats.errors.push({ 
          item: item.productName || item.productCode || 'Unknown item', 
          error: error.message 
        });
      }
    }

    // Show comprehensive notification
    this.showEnhancedSyncNotification(syncStats, showNotification);
    
    console.log('🎉 PI Product Sync Complete:', syncStats);
    return syncStats;
  }

  /**
   * Find existing product with multiple matching criteria
   */
  static findExistingProduct(criteria, existingProducts) {
    const { partNumber, clientItemCode, name } = criteria;
    
    return existingProducts.find(product => {
      // Primary match: part number
      if (partNumber && (
        product.partNumber === partNumber || 
        product.sku === partNumber ||
        product.manufacturerCode === partNumber
      )) {
        return true;
      }
      
      // Secondary match: client item code
      if (clientItemCode && product.clientItemCode === clientItemCode) {
        return true;
      }
      
      // Tertiary match: exact name match (case insensitive)
      if (name && product.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Generate updates for existing products
   */
  static generateProductUpdates(existingProduct, piItem, piData) {
    const updates = {};
    
    // Update part number if missing
    if (!existingProduct.partNumber && piItem.productCode) {
      const validation = ProductEnrichmentService.validateAndNormalizePartNumber(piItem.productCode);
      if (validation.isValid) {
        updates.partNumber = validation.normalized;
      }
    }
    
    // Update client item code if missing
    if (!existingProduct.clientItemCode && piItem.clientItemCode) {
      updates.clientItemCode = piItem.clientItemCode;
    }
    
    // Update description if missing or significantly different
    if (!existingProduct.description && piItem.productName) {
      updates.description = piItem.productName;
    }
    
    // Update price if provided and different
    if (piItem.unitPrice && piItem.unitPrice > 0) {
      const newPrice = this.parsePrice(piItem.unitPrice);
      if (!existingProduct.price || Math.abs(existingProduct.price - newPrice) > 0.01) {
        updates.price = newPrice;
        updates.lastPriceUpdate = new Date().toISOString();
        updates.priceUpdatedFrom = 'pi_upload';
      }
    }
    
    // Update supplier if missing
    if (!existingProduct.supplierId && piData.supplierId) {
      updates.supplierId = piData.supplierId;
    }
    
    // Add PI reference if missing
    if (!existingProduct.createdFromPI && (piData.piNumber || piData.id)) {
      updates.createdFromPI = piData.piNumber || piData.id;
    }
    
    // Add notes if provided and missing
    if (!existingProduct.notes && piItem.notes) {
      updates.notes = piItem.notes;
    }
    
    // Add timestamp if any updates were made
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      updates.lastUpdatedFrom = 'pi_upload';
      updates.lastUpdatedPI = piData.piNumber || piData.id;
    }
    
    return updates;
  }

  /**
   * Parse price from various formats
   */
  static parsePrice(priceValue) {
    if (!priceValue) return 0;
    
    // Handle string prices with currency symbols or commas
    if (typeof priceValue === 'string') {
      // Remove currency symbols and commas
      const cleaned = priceValue.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Handle numeric prices
    const parsed = parseFloat(priceValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Show enhanced sync notification with detailed stats
   */
  static showEnhancedSyncNotification(syncStats, showNotification) {
    if (!showNotification) return;
    
    const { created, updated, enhanced, errors, synced } = syncStats;
    
    if (errors.length > 0) {
      const errorSummary = errors.slice(0, 3).map(e => e.item).join(', ');
      const moreErrors = errors.length > 3 ? ` and ${errors.length - 3} more` : '';
      
      showNotification(
        `Sync completed with ${errors.length} errors. Failed items: ${errorSummary}${moreErrors}`,
        'warning',
        8000 // Show longer for errors
      );
    } else if (created > 0 || updated > 0) {
      let message = `Products synced successfully! `;
      
      if (created > 0) {
        message += `${created} created`;
        if (enhanced > 0) {
          message += ` (${enhanced} AI-enhanced)`;
        }
      }
      
      if (updated > 0) {
        if (created > 0) message += ', ';
        message += `${updated} updated`;
      }
      
      showNotification(message, 'success', 5000);
    } else if (synced > 0) {
      showNotification('All products were already up to date', 'info');
    } else {
      showNotification('No products found to sync', 'info');
    }
  }

  /**
   * Batch product creation with progress tracking
   */
  static async batchCreateProducts(piItems, piData, addProduct, onProgress) {
    const results = {
      total: piItems.length,
      created: [],
      updated: [],
      errors: [],
      enhanced: 0
    };

    for (let i = 0; i < piItems.length; i++) {
      const item = piItems[i];
      
      try {
        // Validate part number
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(
          item.productCode || item.partNumber || ''
        );

        if (!validation.isValid) {
          results.errors.push({
            item: item.productName || item.productCode,
            error: 'Invalid part number format'
          });
          continue;
        }

        // Prepare product data
        const productData = {
          name: item.productName || validation.normalized,
          partNumber: validation.normalized,
          clientItemCode: item.clientItemCode || '',
          description: item.productName || item.description || '',
          supplierId: piData.supplierId,
          price: this.parsePrice(item.unitPrice),
          stock: 0,
          minStock: 1,
          status: 'pending',
          source: 'pi_batch_extraction',
          createdFromPI: piData.piNumber || piData.id,
          notes: item.notes || ''
        };

        // Create product with AI enhancement
        const result = await addProduct(productData, false);

        if (result && result.success) {
          results.created.push(result.product);
          
          if (result.product.aiEnriched) {
            results.enhanced++;
          }
        } else {
          results.errors.push({
            item: item.productName || item.productCode,
            error: result?.error || 'Creation failed'
          });
        }

      } catch (error) {
        results.errors.push({
          item: item.productName || item.productCode || 'Unknown',
          error: error.message
        });
      }

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: piItems.length,
          created: results.created.length,
          enhanced: results.enhanced,
          errors: results.errors.length
        });
      }
    }

    return results;
  }

  /**
   * Validate PI data structure before processing
   */
  static validatePIData(piData) {
    const errors = [];

    if (!piData) {
      errors.push('PI data is required');
      return { isValid: false, errors };
    }

    if (!piData.items || !Array.isArray(piData.items)) {
      errors.push('PI must contain an items array');
    } else if (piData.items.length === 0) {
      errors.push('PI items array is empty');
    }

    if (!piData.supplierId) {
      errors.push('Supplier ID is required for product creation');
    }

    // Validate individual items
    const invalidItems = piData.items?.filter((item, index) => {
      const hasProductCode = item.productCode || item.partNumber;
      const hasProductName = item.productName;
      
      if (!hasProductCode && !hasProductName) {
        errors.push(`Item ${index + 1}: Missing both product code and product name`);
        return true;
      }
      
      return false;
    });

    return {
      isValid: errors.length === 0,
      errors,
      validItems: piData.items?.length - (invalidItems?.length || 0),
      invalidItems: invalidItems?.length || 0
    };
  }

  /**
   * Get sync statistics for a PI
   */
  static async getSyncStatistics(piId, products) {
    const relatedProducts = products.filter(product => 
      product.createdFromPI === piId || 
      product.lastUpdatedPI === piId
    );

    const stats = {
      totalProducts: relatedProducts.length,
      aiEnhanced: relatedProducts.filter(p => p.aiEnriched).length,
      averageConfidence: 0,
      categories: {},
      brands: {},
      priceRange: { min: 0, max: 0 },
      lastSync: null
    };

    if (relatedProducts.length > 0) {
      // Calculate average confidence
      const confidenceSum = relatedProducts
        .filter(p => p.confidence)
        .reduce((sum, p) => sum + p.confidence, 0);
      const confidenceCount = relatedProducts.filter(p => p.confidence).length;
      stats.averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

      // Category distribution
      relatedProducts.forEach(product => {
        const category = product.category || 'unknown';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
      });

      // Brand distribution
      relatedProducts.forEach(product => {
        const brand = product.brand || 'unknown';
        stats.brands[brand] = (stats.brands[brand] || 0) + 1;
      });

      // Price range
      const prices = relatedProducts.map(p => p.price || 0).filter(p => p > 0);
      if (prices.length > 0) {
        stats.priceRange.min = Math.min(...prices);
        stats.priceRange.max = Math.max(...prices);
      }

      // Last sync time
      const syncTimes = relatedProducts
        .map(p => p.updatedAt)
        .filter(time => time)
        .sort((a, b) => new Date(b) - new Date(a));
      
      if (syncTimes.length > 0) {
        stats.lastSync = syncTimes[0];
      }
    }

    return stats;
  }
}

export default PIProductSyncService;
