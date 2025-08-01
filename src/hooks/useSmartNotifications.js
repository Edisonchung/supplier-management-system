// src/hooks/useSmartNotifications.js
import { useState, useEffect, useCallback } from 'react';

export const useSmartNotifications = (deliveryTracking, paymentTracking, purchaseOrders, updateDeliveryStatus, updatePaymentStatus, showNotification) => {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    deliveryAlerts: true,
    paymentReminders: true,
    performanceAlerts: true,
    costOptimization: true
  });

  // Smart notifications service logic (embedded to avoid import issues)
  const evaluateBusinessRules = useCallback((data) => {
    const notifications = [];
    const { deliveryTracking, paymentTracking, purchaseOrders } = data;

    // Rule 1: Overdue Delivery Alerts
    Object.entries(deliveryTracking || {}).forEach(([poId, delivery]) => {
      const expectedDate = new Date(delivery.estimatedDelivery);
      const today = new Date();
      const daysOverdue = Math.floor((today - expectedDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0 && delivery.status !== 'delivered' && delivery.status !== 'completed') {
        notifications.push({
          id: `overdue-${poId}`,
          type: 'warning',
          priority: daysOverdue > 7 ? 'high' : 'medium',
          title: 'Delivery Overdue',
          message: `PO ${delivery.poNumber} is ${daysOverdue} days overdue`,
          category: 'delivery',
          actions: [
            { label: 'Contact Supplier', action: 'contact_supplier', data: delivery.supplierId },
            { label: 'Update Timeline', action: 'reschedule', data: poId }
          ],
          data: delivery,
          timestamp: Date.now()
        });
      }
    });

    // Rule 2: Payment Due Reminders
    Object.entries(paymentTracking || {}).forEach(([supplierId, payment]) => {
      const dueDate = new Date(payment.dueDate);
      const today = new Date();
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 1000));
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0 && payment.status === 'pending') {
        notifications.push({
          id: `payment-due-${supplierId}`,
          type: 'info',
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          title: 'Payment Due Soon',
          message: `Payment of $${payment.totalAmount?.toLocaleString() || '0'} due in ${daysUntilDue} days`,
          category: 'payment',
          actions: [
            { label: 'Process Payment', action: 'process_payment', data: supplierId },
            { label: 'Schedule Payment', action: 'schedule_payment', data: supplierId }
          ],
          data: payment,
          timestamp: Date.now()
        });
      }
    });

    return notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, []);

  const evaluateRules = useCallback(() => {
    if (!deliveryTracking || !paymentTracking) return;

    const newNotifications = evaluateBusinessRules({
      deliveryTracking,
      paymentTracking,
      purchaseOrders
    });

    setNotifications(newNotifications);
  }, [deliveryTracking, paymentTracking, purchaseOrders, evaluateBusinessRules]);

  // Re-evaluate rules when data changes
  useEffect(() => {
    evaluateRules();
  }, [evaluateRules]);

  // Set up periodic evaluation (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(evaluateRules, 30000);
    return () => clearInterval(interval);
  }, [evaluateRules]);

  const handleAction = useCallback((notification, action) => {
    // Handle the action using your existing functions
    switch (action.action) {
      case 'contact_supplier':
        showNotification('Contacting supplier for ' + notification.data.poNumber, 'success');
        break;
      case 'process_payment':
        updatePaymentStatus(action.data, { status: 'processing' });
        showNotification('Payment processing initiated', 'success');
        break;
      case 'reschedule':
        const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        updateDeliveryStatus(action.data, { 
          estimatedDelivery: newDate.toISOString(),
          rescheduled: true 
        });
        showNotification('Delivery timeline updated', 'success');
        break;
      default:
        showNotification('Action: ' + action.label, 'info');
    }
    
    // Mark notification as acted upon
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, acted: true } : n)
    );
  }, [updateDeliveryStatus, updatePaymentStatus, showNotification]);

  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  return {
    notifications,
    settings,
    setSettings,
    handleAction,
    dismissNotification,
    refreshNotifications: evaluateRules
  };
};
