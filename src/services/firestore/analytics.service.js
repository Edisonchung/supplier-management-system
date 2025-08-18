// Create new file: src/services/firestore/analytics.service.js

import { BaseFirestoreService } from './baseService';
import { where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

class AnalyticsService extends BaseFirestoreService {
  constructor() {
    super('analytics_interactions');
  }

  // Track user interaction
  async trackInteraction(interactionData) {
    const enhancedInteraction = {
      ...interactionData,
      timestamp: serverTimestamp(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      source: 'higgsflow_smart_catalog',
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || 'direct'
    };

    return this.create(enhancedInteraction);
  }

  // Get analytics for time range
  async getAnalytics(timeRange = '24h') {
    const timeFilter = this.getTimeFilter(timeRange);
    
    return this.getAll([
      where('timestamp', '>=', timeFilter),
      orderBy('timestamp', 'desc'),
      limit(1000)
    ]);
  }

  // Subscribe to real-time metrics
  subscribeToRealTimeMetrics(callback, timeRange = '5m') {
    const timeFilter = this.getTimeFilter(timeRange);
    
    return this.subscribe(
      (snapshot) => {
        const interactions = snapshot.docs.map(doc => doc.data());
        const metrics = this.calculateRealTimeMetrics(interactions);
        callback(metrics);
      },
      [
        where('timestamp', '>=', timeFilter),
        orderBy('timestamp', 'desc')
      ]
    );
  }

  // Helper methods
  getSessionId() {
    let sessionId = sessionStorage.getItem('higgsflow_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('higgsflow_session_id', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    let userId = localStorage.getItem('higgsflow_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('higgsflow_user_id', userId);
    }
    return userId;
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    const timeMs = this.getTimeMs(timeRange);
    return new Date(now.getTime() - timeMs);
  }

  getTimeMs(timeRange) {
    switch (timeRange) {
      case '5m': return 5 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  calculateRealTimeMetrics(interactions) {
    const uniqueSessions = new Set(interactions.map(i => i.sessionId)).size;
    const uniqueUsers = new Set(interactions.map(i => i.userId)).size;
    const recentInteractions = interactions.length;

    return {
      activeSessions: uniqueSessions,
      currentUsers: uniqueUsers,
      recentInteractions,
      engagementRate: interactions.length > 0 ? (uniqueUsers / uniqueSessions * 100).toFixed(1) : 0
    };
  }
}

export const analyticsService = new AnalyticsService();
