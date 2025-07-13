// src/services/notifications/SmartNotificationsService.js
// Uses your existing LoadingFeedbackSystem for notifications

export class SmartNotificationsService {
  static evaluateBusinessRules(data) {
    const notifications = [];
    const { deliveryTracking, paymentTracking, purchaseOrders } = data;

    // Rule 1: Overdue Delivery Alerts
    Object.entries(deliveryTracking).forEach(([poId, delivery]) => {
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
    Object.entries(paymentTracking).forEach(([supplierId, payment]) => {
      const dueDate = new Date(payment.dueDate);
      const today = new Date();
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0 && payment.status === 'pending') {
        notifications.push({
          id: `payment-due-${supplierId}`,
          type: 'info',
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          title: 'Payment Due Soon',
          message: `Payment of $${payment.totalAmount.toLocaleString()} due in ${daysUntilDue} days`,
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
  }

  static handleNotificationAction(notification, action, updateDeliveryStatus, updatePaymentStatus, addNotification) {
    switch (action.action) {
      case 'contact_supplier':
        addNotification({
          type: 'success',
          title: 'Supplier Contact',
          message: `Contacting supplier for ${notification.data.poNumber}`
        });
        break;
      case 'process_payment':
        updatePaymentStatus(action.data, { status: 'processing' });
        addNotification({
          type: 'success',
          title: 'Payment Processing',
          message: 'Payment processing initiated'
        });
        break;
      case 'reschedule':
        const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        updateDeliveryStatus(action.data, { 
          estimatedDelivery: newDate.toISOString(),
          rescheduled: true 
        });
        addNotification({
          type: 'success',
          title: 'Timeline Updated',
          message: 'Delivery timeline updated'
        });
        break;
      default:
        addNotification({
          type: 'info',
          title: 'Action Executed',
          message: `Action: ${action.label}`
        });
    }
  }
  }
}
