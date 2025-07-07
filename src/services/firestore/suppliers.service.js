import { BaseFirestoreService } from './baseService';
import { where, orderBy } from 'firebase/firestore';

class SuppliersService extends BaseFirestoreService {
  constructor() {
    super('suppliers');
  }

  async getActiveSuppliers() {
    return this.getAll([
      where('status', '==', 'active'),
      orderBy('name')
    ]);
  }
}

export const suppliersService = new SuppliersService();
