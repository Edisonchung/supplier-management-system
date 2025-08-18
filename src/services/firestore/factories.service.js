// Create new file: src/services/firestore/factories.service.js

import { BaseFirestoreService } from './baseService';
import { where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

class FactoriesService extends BaseFirestoreService {
  constructor() {
    super('factory_registrations');
  }

  // Register new factory
  async registerFactory(factoryData) {
    const enhancedFactory = {
      ...factoryData,
      registeredAt: serverTimestamp(),
      status: 'pending_verification',
      verificationStatus: 'pending',
      creditStatus: 'under_review',
      riskScore: 'medium',
      analytics: {
        totalViews: 0,
        totalQuotes: 0,
        registrationSource: 'smart_catalog'
      }
    };

    return this.create(enhancedFactory);
  }

  // Find factory by email
  async getFactoryByEmail(email) {
    const results = await this.getAll([
      where('email', '==', email),
      limit(1)
    ]);

    return results.length > 0 ? results[0] : null;
  }

  // Get factories by status
  async getFactoriesByStatus(status) {
    return this.getAll([
      where('status', '==', status),
      orderBy('registeredAt', 'desc')
    ]);
  }

  // Update factory analytics
  async updateAnalytics(factoryId, analyticsUpdate) {
    const factory = await this.getById(factoryId);
    if (factory) {
      const updatedAnalytics = {
        ...factory.analytics,
        ...analyticsUpdate
      };

      return this.update(factoryId, { analytics: updatedAnalytics });
    }
  }
}

export const factoriesService = new FactoriesService();
