import { BaseFirestoreService } from './baseService';
import { where, orderBy, limit as firestoreLimit } from 'firebase/firestore';

class PurchaseOrdersService extends BaseFirestoreService {
  constructor() {
    super('purchaseOrders');
  }

  async getRecentOrders(limit = 10) {
    return this.getAll([
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    ]);
  }

  async generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const todaysOrders = await this.getAll([
      where('createdAt', '>=', new Date(date.setHours(0, 0, 0, 0))),
      where('createdAt', '<=', new Date(date.setHours(23, 59, 59, 999)))
    ]);
    
    const sequence = String(todaysOrders.length + 1).padStart(3, '0');
    return `PO-${year}${month}${day}-${sequence}`;
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();
