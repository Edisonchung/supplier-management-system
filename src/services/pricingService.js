// src/services/pricingService.js
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit, writeBatch, doc } from 'firebase/firestore';

export class PricingService {
  /**
   * Main pricing resolution method - determines the best price for a client
   * Priority: Client-specific > Tier-based > Public > Base product price
   */
  static async resolvePriceForClient(productId, clientId) {
    try {
      // 1. Check for client-specific pricing (highest priority)
      if (clientId) {
        const clientPricing = await this.getClientSpecificPricing(productId, clientId);
        if (clientPricing) {
          return {
            price: clientPricing.finalPrice,
            type: 'client-specific',
            source: 'client_specific_pricing',
            details: clientPricing,
            priority: 1
          };
        }

        // 2. Check for tier-based pricing
        const client = await this.getClient(clientId);
        if (client) {
          const tierPricing = await this.getTierPricing(productId, client.defaultTierId);
          if (tierPricing) {
            return {
              price: tierPricing.finalPrice,
              type: 'tier-based',
              source: 'product_pricing',
              tier: client.defaultTierId,
              details: tierPricing,
              priority: 2
            };
          }
        }
      }

      // 3. Fallback to public pricing (tier_0)
      const publicPricing = await this.getTierPricing(productId, 'tier_0');
      if (publicPricing) {
        return {
          price: publicPricing.finalPrice,
          type: 'public',
          source: 'product_pricing',
          tier: 'tier_0',
          details: publicPricing,
          priority: 3
        };
      }

      // 4. Last resort: base product price
      const product = await this.getProduct(productId);
      return {
        price: product?.price || 0,
        type: 'base',
        source: 'products',
        details: product,
        priority: 4
      };

    } catch (error) {
      console.error('Error resolving price:', error);
      return {
        price: 0,
        type: 'error',
        source: null,
        details: { error: error.message },
        priority: 999
      };
    }
  }

  /**
   * Get client-specific pricing with validity checks
   */
  static async getClientSpecificPricing(productId, clientId) {
    try {
      const q = query(
        collection(db, 'client_specific_pricing'),
        where('productId', '==', productId),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('priority', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const pricing = snapshot.docs[0].data();
        
        // Check validity period
        const now = new Date();
        const validFrom = pricing.validFrom ? new Date(pricing.validFrom) : null;
        const validUntil = pricing.validUntil ? new Date(pricing.validUntil) : null;
        
        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          return { id: snapshot.docs[0].id, ...pricing };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting client-specific pricing:', error);
      return null;
    }
  }

  /**
   * Get tier-based pricing for a product
   */
  static async getTierPricing(productId, tierId) {
    try {
      const q = query(
        collection(db, 'product_pricing'),
        where('productId', '==', productId),
        where('tierId', '==', tierId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting tier pricing:', error);
      return null;
    }
  }

  /**
   * Get client information
   */
  static async getClient(clientId) {
    try {
      const q = query(
        collection(db, 'clients'),
        where('id', '==', clientId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  /**
   * Get product information
   */
  static async getProduct(productId) {
    try {
      const q = query(
        collection(db, 'products'),
        where('id', '==', productId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }

  /**
   * Get client's price history for a product
   */
  static async getClientPriceHistory(productId, clientId, limitCount = 5) {
    try {
      const q = query(
        collection(db, 'price_history'),
        where('productId', '==', productId),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('soldDate', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Import historical prices and create pricing rules
   */
  static async importHistoricalPrices(clientId, priceData) {
    const batch = writeBatch(db);
    const importedPrices = [];
    
    try {
      for (const priceRecord of priceData) {
        // Validate required fields
        if (!priceRecord.productId || !priceRecord.price || priceRecord.price <= 0) {
          continue;
        }

        // Add to price history
        const historyRef = doc(collection(db, 'price_history'));
        batch.set(historyRef, {
          ...priceRecord,
          clientId,
          createdAt: new Date(),
          source: 'import',
          isActive: true
        });

        // Check if client-specific pricing already exists
        const existingPricing = await this.getClientSpecificPricing(priceRecord.productId, clientId);
        
        if (!existingPricing) {
          // Create client-specific pricing based on historical price
          const pricingRef = doc(collection(db, 'client_specific_pricing'));
          batch.set(pricingRef, {
            clientId,
            productId: priceRecord.productId,
            pricingType: 'fixed',
            fixedPrice: priceRecord.price,
            finalPrice: priceRecord.price,
            basedOnHistoryId: historyRef.id,
            lastSoldPrice: priceRecord.price,
            lastSoldDate: priceRecord.soldDate || new Date(),
            priceSource: 'historical',
            autoApproved: true,
            agreementRef: priceRecord.contractRef || 'HISTORICAL',
            validFrom: new Date().toISOString().split('T')[0],
            notes: `Auto-imported from historical sale`,
            isActive: true,
            priority: 2,
            createdAt: new Date(),
            createdBy: 'system_import'
          });

          importedPrices.push({
            productId: priceRecord.productId,
            price: priceRecord.price,
            historyId: historyRef.id
          });
        }
      }

      await batch.commit();
      return { 
        success: true, 
        importedCount: importedPrices.length, 
        importedPrices 
      };
    } catch (error) {
      console.error('Error importing historical prices:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Calculate pricing for multiple products (bulk operation)
   */
  static async resolvePricesForProducts(productIds, clientId) {
    try {
      const results = {};
      
      // Process in batches to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const batchPromises = batch.map(productId => 
          this.resolvePriceForClient(productId, clientId)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        batch.forEach((productId, index) => {
          results[productId] = batchResults[index];
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error resolving bulk prices:', error);
      return {};
    }
  }

  /**
   * Get pricing statistics for analytics
   */
  static async getPricingStats() {
    try {
      const stats = {
        totalClients: 0,
        clientsWithSpecialPricing: 0,
        totalPriceHistory: 0,
        averageDiscount: 0
      };

      // Get total clients
      const clientsQuery = query(collection(db, 'clients'), where('isActive', '==', true));
      const clientsSnap = await getDocs(clientsQuery);
      stats.totalClients = clientsSnap.size;

      // Get clients with special pricing
      const specialPricingQuery = query(collection(db, 'client_specific_pricing'), where('isActive', '==', true));
      const specialPricingSnap = await getDocs(specialPricingQuery);
      stats.clientsWithSpecialPricing = new Set(specialPricingSnap.docs.map(doc => doc.data().clientId)).size;

      // Get total price history records
      const historyQuery = query(collection(db, 'price_history'), where('isActive', '==', true));
      const historySnap = await getDocs(historyQuery);
      stats.totalPriceHistory = historySnap.size;

      return stats;
    } catch (error) {
      console.error('Error getting pricing stats:', error);
      return {
        totalClients: 0,
        clientsWithSpecialPricing: 0,
        totalPriceHistory: 0,
        averageDiscount: 0
      };
    }
  }

  /**
   * Create or update client-specific pricing
   */
  static async setClientSpecificPricing(clientId, productId, pricingData) {
    try {
      // Check if pricing already exists
      const existingPricing = await this.getClientSpecificPricing(productId, clientId);
      
      if (existingPricing) {
        // Update existing pricing
        const docRef = doc(db, 'client_specific_pricing', existingPricing.id);
        await updateDoc(docRef, {
          ...pricingData,
          lastModified: new Date(),
          modifiedBy: 'admin_user' // Replace with actual user ID
        });
        return { success: true, action: 'updated', id: existingPricing.id };
      } else {
        // Create new pricing
        const docRef = await addDoc(collection(db, 'client_specific_pricing'), {
          clientId,
          productId,
          ...pricingData,
          isActive: true,
          priority: 1,
          createdAt: new Date(),
          createdBy: 'admin_user' // Replace with actual user ID
        });
        return { success: true, action: 'created', id: docRef.id };
      }
    } catch (error) {
      console.error('Error setting client-specific pricing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all pricing for a client (for client dashboard)
   */
  static async getClientAllPricing(clientId) {
    try {
      const results = {
        clientSpecific: [],
        tierBased: [],
        client: null
      };

      // Get client info
      results.client = await this.getClient(clientId);

      // Get client-specific pricing
      const clientPricingQuery = query(
        collection(db, 'client_specific_pricing'),
        where('clientId', '==', clientId),
        where('isActive', '==', true)
      );
      const clientPricingSnap = await getDocs(clientPricingQuery);
      results.clientSpecific = clientPricingSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get tier-based pricing for client's tier
      if (results.client?.defaultTierId) {
        const tierPricingQuery = query(
          collection(db, 'product_pricing'),
          where('tierId', '==', results.client.defaultTierId),
          where('isActive', '==', true)
        );
        const tierPricingSnap = await getDocs(tierPricingQuery);
        results.tierBased = tierPricingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      return results;
    } catch (error) {
      console.error('Error getting client pricing:', error);
      return {
        clientSpecific: [],
        tierBased: [],
        client: null
      };
    }
  }
}
