/**
 * ClientMetricsService - Phase 5
 * 
 * Handles updating client metrics when POs are saved.
 * Tracks totalPOs, totalValue, lastOrderDate for each client.
 */

import { db } from '../config/firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

class ClientMetricsService {
  
  /**
   * Update client metrics after a new PO is created
   * 
   * @param {string} clientId - The client's Firestore document ID
   * @param {number} poValue - Total value of the PO
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of the update
   */
  static async incrementClientMetrics(clientId, poValue, options = {}) {
    if (!clientId) {
      console.warn('[ClientMetricsService] No clientId provided, skipping metrics update');
      return { success: false, reason: 'no_client_id' };
    }

    try {
      const clientRef = doc(db, 'clients', clientId);
      
      // Verify client exists
      const clientDoc = await getDoc(clientRef);
      if (!clientDoc.exists()) {
        console.warn('[ClientMetricsService] Client not found:', clientId);
        return { success: false, reason: 'client_not_found' };
      }

      const updateData = {
        totalPOs: increment(1),
        totalValue: increment(poValue || 0),
        lastOrderDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add optional metadata
      if (options.poNumber) {
        updateData.lastPONumber = options.poNumber;
      }

      await updateDoc(clientRef, updateData);

      console.log('[ClientMetricsService] ✅ Updated metrics for client:', clientId, {
        addedPOs: 1,
        addedValue: poValue
      });

      return { success: true, clientId, addedValue: poValue };
    } catch (error) {
      console.error('[ClientMetricsService] Error updating client metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update client metrics when a PO is edited
   * Handles the difference between old and new values
   * 
   * @param {string} clientId - The client's Firestore document ID
   * @param {number} newValue - New total value of the PO
   * @param {number} oldValue - Previous total value of the PO
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of the update
   */
  static async updateClientMetricsOnEdit(clientId, newValue, oldValue, options = {}) {
    if (!clientId) {
      console.warn('[ClientMetricsService] No clientId provided, skipping metrics update');
      return { success: false, reason: 'no_client_id' };
    }

    try {
      const valueDifference = (newValue || 0) - (oldValue || 0);
      
      // Only update if there's a difference
      if (Math.abs(valueDifference) < 0.01) {
        console.log('[ClientMetricsService] No value change, skipping update');
        return { success: true, reason: 'no_change', difference: 0 };
      }

      const clientRef = doc(db, 'clients', clientId);
      
      await updateDoc(clientRef, {
        totalValue: increment(valueDifference),
        updatedAt: serverTimestamp()
      });

      console.log('[ClientMetricsService] ✅ Updated metrics on PO edit:', {
        clientId,
        oldValue,
        newValue,
        difference: valueDifference
      });

      return { success: true, clientId, difference: valueDifference };
    } catch (error) {
      console.error('[ClientMetricsService] Error updating metrics on edit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decrement client metrics when a PO is deleted
   * 
   * @param {string} clientId - The client's Firestore document ID
   * @param {number} poValue - Total value of the deleted PO
   * @returns {Promise<Object>} - Result of the update
   */
  static async decrementClientMetrics(clientId, poValue) {
    if (!clientId) {
      console.warn('[ClientMetricsService] No clientId provided, skipping metrics update');
      return { success: false, reason: 'no_client_id' };
    }

    try {
      const clientRef = doc(db, 'clients', clientId);
      
      await updateDoc(clientRef, {
        totalPOs: increment(-1),
        totalValue: increment(-(poValue || 0)),
        updatedAt: serverTimestamp()
      });

      console.log('[ClientMetricsService] ✅ Decremented metrics for client:', clientId, {
        removedPOs: 1,
        removedValue: poValue
      });

      return { success: true, clientId, removedValue: poValue };
    } catch (error) {
      console.error('[ClientMetricsService] Error decrementing client metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle client change on PO edit
   * Decrements old client, increments new client
   * 
   * @param {string} oldClientId - Previous client ID
   * @param {string} newClientId - New client ID
   * @param {number} poValue - Total value of the PO
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of the updates
   */
  static async handleClientChange(oldClientId, newClientId, poValue, options = {}) {
    const results = {
      oldClient: null,
      newClient: null
    };

    // Decrement old client if exists
    if (oldClientId && oldClientId !== newClientId) {
      results.oldClient = await this.decrementClientMetrics(oldClientId, poValue);
    }

    // Increment new client
    if (newClientId) {
      results.newClient = await this.incrementClientMetrics(newClientId, poValue, options);
    }

    console.log('[ClientMetricsService] Client change handled:', results);
    return results;
  }

  /**
   * Recalculate all metrics for a client from scratch
   * Useful for data repair or migration
   * 
   * @param {string} clientId - The client's Firestore document ID
   * @param {Array} purchaseOrders - Array of POs for this client
   * @returns {Promise<Object>} - Result of the recalculation
   */
  static async recalculateClientMetrics(clientId, purchaseOrders = []) {
    if (!clientId) {
      return { success: false, reason: 'no_client_id' };
    }

    try {
      const totalPOs = purchaseOrders.length;
      const totalValue = purchaseOrders.reduce((sum, po) => {
        return sum + (parseFloat(po.totalAmount) || 0);
      }, 0);

      // Find most recent order
      const sortedPOs = [...purchaseOrders].sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || 0);
        const dateB = new Date(b.orderDate || b.createdAt || 0);
        return dateB - dateA;
      });
      const lastOrder = sortedPOs[0];

      const clientRef = doc(db, 'clients', clientId);
      
      const updateData = {
        totalPOs,
        totalValue,
        updatedAt: serverTimestamp(),
        metricsRecalculatedAt: serverTimestamp()
      };

      if (lastOrder) {
        updateData.lastOrderDate = lastOrder.orderDate || lastOrder.createdAt;
        updateData.lastPONumber = lastOrder.poNumber || lastOrder.clientPoNumber;
      }

      await updateDoc(clientRef, updateData);

      console.log('[ClientMetricsService] ✅ Recalculated metrics for client:', clientId, {
        totalPOs,
        totalValue
      });

      return { 
        success: true, 
        clientId, 
        metrics: { totalPOs, totalValue } 
      };
    } catch (error) {
      console.error('[ClientMetricsService] Error recalculating metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current metrics for a client
   * 
   * @param {string} clientId - The client's Firestore document ID
   * @returns {Promise<Object>} - Current metrics
   */
  static async getClientMetrics(clientId) {
    if (!clientId) {
      return { success: false, reason: 'no_client_id' };
    }

    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);

      if (!clientDoc.exists()) {
        return { success: false, reason: 'client_not_found' };
      }

      const data = clientDoc.data();
      return {
        success: true,
        metrics: {
          totalPOs: data.totalPOs || 0,
          totalValue: data.totalValue || 0,
          lastOrderDate: data.lastOrderDate,
          lastPONumber: data.lastPONumber
        }
      };
    } catch (error) {
      console.error('[ClientMetricsService] Error getting metrics:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ClientMetricsService;
