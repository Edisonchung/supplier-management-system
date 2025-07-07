import { BaseFirestoreService } from './baseService';
import { where, orderBy } from 'firebase/firestore';

class ProductsService extends BaseFirestoreService {
  constructor() {
    super('products');
  }

  async getProductsBySupplier(supplierId) {
    return this.getAll([
      where('supplierId', '==', supplierId),
      orderBy('name')
    ]);
  }

  async getLowStockProducts() {
    const allProducts = await this.getAll();
    return allProducts.filter(product => product.stock <= product.minStock);
  }

  async updateStock(productId, newStock) {
    return this.update(productId, { stock: newStock });
  }
}

export const productsService = new ProductsService();
