// src/components/purchase-orders/utils/mockFirebase.js

// Mock Firebase implementation using localStorage
export class MockFirebase {
  constructor(collection) {
    this.collection = collection;
    this.data = JSON.parse(localStorage.getItem(collection) || '[]');
  }

  async getAll() {
    return this.data;
  }

  async add(item) {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.push(newItem);
    localStorage.setItem(this.collection, JSON.stringify(this.data));
    return newItem;
  }

  async update(id, updates) {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.collection, JSON.stringify(this.data));
      return this.data[index];
    }
    return null;
  }

  async delete(id) {
    this.data = this.data.filter(item => item.id !== id);
    localStorage.setItem(this.collection, JSON.stringify(this.data));
    return true;
  }

  async getById(id) {
    return this.data.find(item => item.id === id) || null;
  }

  async query(filterFn) {
    return this.data.filter(filterFn);
  }
}
